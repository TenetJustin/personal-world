import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { landDistance, groundHeight, pathX, random } from "./landscape";
import { NEAR_TREE_BASES } from "./cameraPath";
import { bakeGeometry } from "./assetGeometry";
import { createLake } from "./water";

const texLoader = new THREE.TextureLoader();
async function texture(file: string, color = false) {
  const t = await texLoader.loadAsync("/assets/" + file);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function instanced(
  scene: THREE.Scene,
  source: THREE.Object3D,
  positions: { x: number; z: number; s: number; r: number }[],
  shadow = true,
) {
  source.updateWorldMatrix(true, true);
  const dummy = new THREE.Object3D();
  source.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geo = bakeGeometry(o);
    const m = new THREE.InstancedMesh(geo, o.material, positions.length);
    m.castShadow = shadow;
    m.receiveShadow = true;
    positions.forEach((p, i) => {
      dummy.position.set(p.x, groundHeight(p.x, p.z), p.z);
      dummy.rotation.set(0, p.r, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    scene.add(m);
  });
}
export async function buildWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: "standard" | "high",
) {
  const rng = random();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [fir, rocks, grass, cabin, bg, lighting, env, dimensions, ...textures] =
    await Promise.all([
      loader.loadAsync("/assets/fir.glb"),
      loader.loadAsync("/assets/rocks.glb"),
      loader.loadAsync("/assets/grass.glb"),
      loader.loadAsync("/assets/cabin.glb"),
      new HDRLoader().loadAsync(
        quality === "high"
          ? "/assets/alps-background-4k.hdr"
          : "/assets/alps-background.hdr",
      ),
      new HDRLoader().loadAsync("/assets/alps-lighting.hdr"),
      fetch("/assets/environment.json").then((r) => r.json()),
      fetch("/assets/fir-dimensions.json").then((r) => r.json()),
      texture("forest-color.webp", true),
      texture("grass-normal.webp"),
      texture("grass-rough.webp"),
      texture("grass-color.webp", true),
      ...[0, 1, 2, 3].map((n) => texture("fir-impostor-" + n + ".png", true)),
    ]);
  for (const gltf of [fir, grass])
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.alphaToCoverage = m.alphaTest > 0;
          m.dithering = true;
        }
    });
  bg.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = bg;
  scene.backgroundIntensity = 0.9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const probe = pmrem.fromEquirectangular(lighting);
  scene.environment = probe.texture;
  scene.environmentIntensity = 1.15;
  lighting.dispose();
  pmrem.dispose();
  const rotation = 0.0;
  scene.backgroundRotation.y = rotation;
  scene.environmentRotation.y = rotation;
  const lon = (env.u - 0.5) * Math.PI * 2 - rotation,
    lat = (env.vBottom - 0.5) * Math.PI;
  const sunDirection = new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon),
  ).normalize();
  // The sun follows the real HDRI's brightest solar position; no second arbitrary sun.
  const sun = new THREE.DirectionalLight(0xffe2be, 2.6);
  sun.position.copy(sunDirection).multiplyScalar(90);
  sun.target.position.set(0, 0, 8);
  sun.position.add(sun.target.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(
    quality === "high" ? 4096 : 2048,
    quality === "high" ? 4096 : 2048,
  );
  Object.assign(sun.shadow.camera, {
    left: -36,
    right: 36,
    top: 48,
    bottom: -40,
    near: 1,
    far: 230,
  });
  // All shadow casters and the sun are static in this exterior proof.
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);
  scene.fog = new THREE.FogExp2(0xa6b4b3, 0.00065);
  const [forestMap, normalMap, roughMap, grassMap, ...impostors] =
    textures as THREE.Texture[];
  const ground = new THREE.PlaneGeometry(650, 650, 320, 320);
  ground.rotateX(-Math.PI / 2);

  const pos = ground.attributes.position;
  const colors = [];
  const blend = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const ox = pos.getX(i),
      oz = pos.getZ(i);
    const x = Math.sign(ox) * Math.pow(Math.abs(ox) / 325, 1.6) * 325 - 20,
      z = Math.sign(oz) * Math.pow(Math.abs(oz) / 325, 1.6) * 325,
      d = landDistance(x, z);
    pos.setXYZ(i, x, groundHeight(x, z), z);
    const path =
      Math.exp(-Math.pow((x - pathX(z)) / 1.1, 2)) * (z > 6 && z < 65 ? 1 : 0);
    c.setRGB(0.82, 0.88, 0.73);
    colors.push(c.r, c.g, c.b);
    blend.push(d, path, 0);
  }
  ground.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  ground.setAttribute("landData", new THREE.Float32BufferAttribute(blend, 3));
  const uv = ground.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, pos.getX(i) / 3.2, pos.getZ(i) / 3.2);
  ground.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassMap,
    normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: roughMap,
    roughness: 0.95,
    vertexColors: true,
  });
  groundMat.onBeforeCompile = (s) => {
    s.uniforms.grassMap = { value: forestMap };
    s.vertexShader =
      "attribute vec3 landData;varying vec3 vLand;\n" + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvLand=landData;",
    );
    s.fragmentShader =
      "uniform sampler2D grassMap;varying vec3 vLand;\n" + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      "#include <map_fragment>",
      `vec4 a=texture2D(map,vMapUv);vec4 b=texture2D(grassMap,vMapUv*.72);float k=smoothstep(8.,25.,vLand.x)*(1.-vLand.y)*.45;diffuseColor*=mix(a,b,k);diffuseColor.rgb*=mix(vec3(.63,.66,.62),vec3(1.),smoothstep(-.15,1.3,vLand.x));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.13,1.04,.88),vLand.y*.75);`,
    );
  };
  const land = new THREE.Mesh(ground, groundMat);
  land.receiveShadow = true;
  scene.add(land);
  cabin.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = o.receiveShadow = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m instanceof THREE.MeshStandardMaterial) m.aoMapIntensity = 0.35;
    }
  });
  scene.add(cabin.scene);
  // The two source LODs share the same real scanned / authored tree silhouette.
  const near = fir.scene.getObjectByName("fir_near")!,
    mid = fir.scene.getObjectByName("fir_mid")!;
  const nearPositions = NEAR_TREE_BASES.map((p, i) => ({
    ...p,
    s: 0.8 + (i % 3) * 0.12,
    r: rng() * Math.PI * 2,
  }));
  instanced(scene, near, nearPositions);
  const mids = [];
  let tries = 0;
  while (mids.length < 24 && tries++ < 2000) {
    const x = -30 + rng() * 125,
      z = -18 - rng() * 105;
    if (landDistance(x, z) < 4 || Math.hypot(x, z) < 16) continue;
    mids.push({ x, z, s: 0.65 + rng() * 0.7, r: rng() * 6.28 });
  }
  instanced(scene, mid, mids, false);
  // Far impostors only, explicitly excluded from the walkable near zone.
  for (let n = 0; n < 4; n++) {
    const ps = [];
    let t = 0;
    while (ps.length < 700 && t++ < 5000) {
      const x = -250 + rng() * 460,
        z = -24 - rng() * 240;
      if (landDistance(x, z) < 2 || Math.hypot(x - 10, z - 20) < 38) continue;
      ps.push({ x, z, s: 0.85 + rng() * 1.1 });
    }
    const geo = new THREE.PlaneGeometry(
      dimensions.impostorHeight * 0.5,
      dimensions.impostorHeight,
    );
    geo.translate(0, dimensions.impostorHeight * 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: impostors[n],
      transparent: false,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      fog: true,
    });
    mat.alphaToCoverage = true;
    const mesh = new THREE.InstancedMesh(geo, mat, ps.length);
    const dummy = new THREE.Object3D();
    ps.forEach((p, i) => {
      dummy.position.set(p.x, groundHeight(p.x, p.z) - 0.05, p.z);
      dummy.rotation.y = Math.atan2(18 - p.x, 44 - p.z);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  const rockMeshes: THREE.Mesh[] = [];
  rocks.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) rockMeshes.push(o);
  });
  rockMeshes.forEach((source, j) => {
    const ps = [];
    for (let i = 0; i < 12; i++) {
      const z = -30 + rng() * 94,
        x =
          -8 +
          7.5 * Math.sin(z * 0.029) +
          1.4 * Math.sin(z * 0.081) +
          (rng() - 0.42) * 5;
      ps.push({ x, z, s: 0.25 + rng() * 0.55, r: rng() * 6.28 });
    }
    // Isolate each normalized scan; object name and geometry survive export.
    instanced(scene, source, ps, true);
  });
  const windTime = { value: 0 };
  for (const material of new Set(
    grass.scene.children.flatMap((o) => {
      const a: THREE.Material[] = [];
      o.traverse((c) => {
        if (c instanceof THREE.Mesh)
          a.push(...(Array.isArray(c.material) ? c.material : [c.material]));
      });
      return a;
    }),
  )) {
    material.onBeforeCompile = (s) => {
      s.uniforms.windTime = windTime;
      s.vertexShader = "uniform float windTime;\n" + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x+=sin(windTime*.7+instanceMatrix[3].x*.5)*.025*pow(max(position.y,0.),1.7);",
      );
    };
    material.customProgramCacheKey = () => "subtle-grass-wind-v1";
  }
  const grassMeshes: THREE.Mesh[] = [];
  grass.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) grassMeshes.push(o);
  });
  grassMeshes.slice(0, 10).forEach((source, j) => {
    const ps = [];
    let tries = 0;
    while (ps.length < 650 && tries++ < 2000) {
      const x = -6 + rng() * 45,
        z = -10 + rng() * 66;
      if (
        landDistance(x, z) < 1.0 ||
        Math.hypot(x, z) < 7 ||
        Math.abs(x - pathX(z)) < 0.8
      )
        continue;
      ps.push({ x, z, s: 1.7 + rng() * 2.1, r: rng() * 6.28 });
    }
    instanced(scene, source, ps, false);
  });
  const lake = createLake(sunDirection, quality === "high" ? 1024 : 512);
  scene.add(lake);
  await renderer.compileAsync(scene, new THREE.PerspectiveCamera());
  const dispose = () => {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const v of Object.values(m))
            if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    lake.dispose();
    sun.shadow.dispose();
    probe.dispose();
    bg.dispose();
    scene.clear();
  };
  return {
    lake,
    windTime,
    dispose,
    sunDirection: sunDirection.toArray(),
    source: "Poly Haven CC0 / original Blender exterior",
  };
}
