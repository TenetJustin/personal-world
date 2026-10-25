import * as THREE from "three";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import {
  landDistance,
  groundHeight,
  pathX,
  random,
  shoreX,
  cabinLocal,
} from "./landscape";
import { NEAR_TREE_BASES } from "./cameraPath";
import { bakeGeometry } from "./assetGeometry";
import { createLake } from "./water";
import { runtime } from "./runtime";
import { meadowClump } from "./meadow";
import { assetURL } from "../site";
import { addEnvironmentCollider, resetEnvironmentColliders } from "./locomotion";
import { CABIN, cabinToWorld } from "./architecture";

const texLoader = new THREE.TextureLoader();
async function texture(file: string, color = false) {
  const t = await texLoader.loadAsync(assetURL("assets/" + file));
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
  cell = 48,
  layer = 0,
  physical: "trunk" | "rock" | null = null,
) {
  source.updateWorldMatrix(true, true);
  const dummy = new THREE.Object3D();
  const batches = new Map<string, typeof positions>();
  const enabled =
    !new URLSearchParams(location.search).has("unbatched") &&
    positions.length > 20;
  for (const p of positions) {
    const key = enabled
      ? `${Math.floor(p.x / cell)},${Math.floor(p.z / cell)}`
      : "all";
    const batch = batches.get(key) ?? [];
    batch.push(p);
    batches.set(key, batch);
  }
  if(physical === "trunk")positions.forEach((p,i)=>{const y=groundHeight(p.x,p.z),r=.29*p.s;addEnvironmentCollider({id:`tree-${p.x}-${p.z}-${i}`,minX:p.x-r,maxX:p.x+r,minZ:p.z-r,maxZ:p.z+r,minY:y,maxY:y+7*p.s});});
  source.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geo = bakeGeometry(o);
    if(physical === "rock"){
      geo.computeBoundingBox();
      positions.forEach((p,i)=>{dummy.position.set(p.x,groundHeight(p.x,p.z),p.z);dummy.rotation.set(0,p.r,0);dummy.scale.setScalar(p.s);dummy.updateMatrix();const b=geo.boundingBox!.clone().applyMatrix4(dummy.matrix);addEnvironmentCollider({id:`rock-${o.name}-${i}`,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,minY:b.min.y,maxY:b.max.y});});
    }
    for (const batch of batches.values()) {
      const m = new THREE.InstancedMesh(geo, o.material, batch.length);
      m.layers.set(layer);
      m.castShadow = shadow;
      m.receiveShadow = true;
      batch.forEach((p, i) => {
        dummy.position.set(p.x, groundHeight(p.x, p.z), p.z);
        dummy.rotation.set(0, p.r, 0);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      scene.add(m);
    }
  });
}
export async function buildWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: "standard" | "high",
) {
  resetEnvironmentColliders();
  const rng = random();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const loadModel = (url: string) => {
    runtime.assetStages[url] = "fetching / decoding";
    return loader
      .loadAsync(assetURL(url), (e) => {
        runtime.assetStages[url] = `received ${e.loaded} bytes / decoding`;
      })
      .then((g) => {
        runtime.assetStages[url] = "decoded";
        return g;
      });
  };
  const [
    fullFir,
    rocks,
    grass,
    cabin,
    door,
    bg,
    lighting,
    env,
    dimensions,
    ...textures
  ] = await Promise.all([
    loadModel("assets/fir-full.glb"),
    loadModel("assets/rocks.glb"),
    loadModel("assets/grass-dense.glb"),
    loadModel("assets/cabin-v3-shell.glb"),
    loadModel("assets/cabin-door.glb"),
    new HDRLoader().loadAsync(
      assetURL(
        quality === "high"
          ? "assets/alps-background-4k.hdr"
          : "assets/alps-background.hdr",
      ),
    ),
    new HDRLoader().loadAsync(assetURL("assets/alps-lighting.hdr")),
    fetch(assetURL("assets/environment.json")).then((r) => r.json()),
    fetch(assetURL("assets/fir-full-dimensions.json")).then((r) => r.json()),
    texture("forest-color.webp", true),
    texture("meadow-normal.webp"),
    texture("meadow-rough.webp"),
    texture("meadow-color.webp", true),
    ...[0, 1, 2, 3].map((n) =>
      texture("fir-full-impostor-" + n + ".png", true),
    ),
  ]);
  for (const gltf of [fullFir, grass])
    gltf.scene.traverse((o) => {
      if (o instanceof THREE.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.alphaToCoverage = m.alphaTest > 0;
          m.dithering = true;
          if (
            m.name.includes("grass_medium") &&
            m instanceof THREE.MeshStandardMaterial
          ) {
            m.roughnessMap = null;
            m.roughness = 0.96;
            m.normalScale.set(0.25, 0.25);
            m.envMapIntensity = 0.55;
          }
          if (
            m.name.includes("source twig clusters") &&
            m instanceof THREE.MeshStandardMaterial
          ) {
            m.color.setRGB(0.62, 0.76, 0.5);
            m.roughness = 0.95;
          }
        }
    });
  bg.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = bg;
  scene.backgroundIntensity = 0.9;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const probe = pmrem.fromEquirectangular(lighting);
  scene.environment = probe.texture;
  scene.environmentIntensity = 0.95;
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
  const sun = new THREE.DirectionalLight(0xffe5c6, 3.2);
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
  scene.fog = new THREE.FogExp2(0xa6b4b3, 0.00045);
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
    const patch =
      0.94 + 0.06 * Math.sin(x * 0.39 + z * 0.17) * Math.cos(z * 0.35);
    c.setRGB(0.48 * patch, 0.79 * patch, 0.34 * patch);
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
    normalScale: new THREE.Vector2(0.72, 0.72),
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
      `vec4 a=texture2D(map,vMapUv);vec4 b=texture2D(grassMap,vMapUv*.72);float k=max(smoothstep(18.,50.,vLand.x)*.65,vLand.y*.82);diffuseColor*=mix(a,b,k);diffuseColor.rgb*=mix(vec3(.63,.66,.62),vec3(1.),smoothstep(-.15,1.3,vLand.x));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.86,.79,.62),vLand.y*.8);`,
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
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (
          m instanceof THREE.MeshPhysicalMaterial &&
          m.name.includes("glass")
        ) {
          m.transmission = 1;
          m.side = THREE.FrontSide;
          if (!new URLSearchParams(location.search).has("fullReflection"))
            o.layers.set(2);
          m.color.setRGB(0.92, 0.98, 0.96);
          m.roughness = 0.075;
          m.ior = 1.48;
          m.thickness = 0.016;
        }
    }
  });
  scene.add(cabin.scene);
  const doorPivot = new THREE.Group();
  doorPivot.name = "INTERACTION_CABIN_DOOR";
  doorPivot.position.fromArray(cabinToWorld(CABIN.door.hinge));
  doorPivot.rotation.y = CABIN.rotationY;
  door.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  doorPivot.add(door.scene);
  scene.add(doorPivot);
  let lastDoorAmount = -1;
  const updateDoor = (openness: number) => {
    const amount = THREE.MathUtils.clamp(openness, 0, 1);
    if (Math.abs(amount - lastDoorAmount) < 1e-5) return;
    doorPivot.rotation.y = CABIN.rotationY + amount * CABIN.door.swingRadians;
    lastDoorAmount = amount;
    // Exterior shadows are cached; opening the real leaf must invalidate them.
    renderer.shadowMap.needsUpdate = true;
    sun.shadow.needsUpdate = true;
  };
  updateDoor(0);
  // Mix full-crown A with the narrower C. Planted in unequal age/spacing clusters.
  const near = fullFir.scene.getObjectByName("fir_full_near")!;
  const mid = fullFir.scene.getObjectByName("fir_full_mid")!;
  instanced(
    scene,
    near,
    NEAR_TREE_BASES.map((p, i) => ({
      ...p,
      s: 0.8 + (i % 4) * 0.1,
      r: rng() * 6.28,
    })),
    true,48,0,"trunk",
  );
  const mids: { x: number; z: number; s: number; r: number }[] = [];
  const clusters = [
    [-6, -36, 19],
    [25, -45, 23],
    [53, -9, 19],
    [42, -84, 28],
    [-39, -95, 25],
    [82, -120, 34],
  ];
  for (const [cx, cz, radius] of clusters) {
    for (let i = 0; i < 19; i++) {
      const a = rng() * 6.28,
        r = Math.sqrt(rng()) * radius,
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (
        landDistance(x, z) < 4 ||
        Math.hypot(x - 8, z + 3) < 21 ||
        mids.some((p) => Math.hypot(p.x - x, p.z - z) < 2.8)
      )
        continue;
      mids.push({ x, z, s: 0.67 + rng() * 0.75, r: rng() * 6.28 });
    }
  }
  instanced(scene, mid, mids, false,48,0,"trunk");
  // Distant original full-tree atlas; only beyond the traversable zone.
  for (let n = 0; n < 4; n++) {
    const ps: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 630; i++) {
      const x = -270 + rng() * 550,
        z = -55 - rng() * 270;
      const cluster =
        0.52 +
        0.3 * Math.sin(x * 0.044 + z * 0.02) +
        0.18 * Math.cos(z * 0.061 - x * 0.017);
      if (
        landDistance(x, z) < 3 ||
        Math.hypot(x - 10, z - 20) < 65 ||
        rng() > cluster
      )
        continue;
      ps.push({ x, z, s: 0.7 + rng() * 0.8 });
    }
    const geo = new THREE.PlaneGeometry(
      dimensions.impostorHeight * 0.52,
      dimensions.impostorHeight,
    );
    geo.translate(0, dimensions.impostorHeight * 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: impostors[n],
      alphaTest: 0.34,
      side: THREE.DoubleSide,
      fog: true,
      color: 0xffffff,
      toneMapped: false,
    });
    mat.alphaToCoverage = true;
    const m = new THREE.InstancedMesh(geo, mat, ps.length),
      dummy = new THREE.Object3D();
    ps.forEach((p, i) => {
      dummy.position.set(p.x, groundHeight(p.x, p.z) - 0.08, p.z);
      dummy.rotation.y = Math.atan2(10 - p.x, 35 - p.z);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.computeBoundingSphere();
    scene.add(m);
  }
  // Real 3D foothills between local forest and the CC0 distant photographic skyline.
  for (const layer of [0, 1]) {
    const g = new THREE.PlaneGeometry(2000, 600, 160, 50);
    g.rotateX(-Math.PI / 2);
    const a = g.attributes.position,
      cols = [];
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i) - 100,
        z = a.getZ(i) - 620 - layer * 340;
      const ridge =
        90 +
        55 * Math.sin(x * 0.003 + layer * 0.8) +
        35 * Math.sin(x * 0.009 + 1.2);
      const cross = Math.exp(-Math.pow((z + 520 + layer * 340) / 160, 2));
      const y =
        8 + ridge * cross + 12 * Math.sin(x * 0.021 + z * 0.012) * cross;
      a.setXYZ(i, x, y, z);
      const shade = 0.82 + 0.18 * Math.sin(x * 0.017 + z * 0.015);
      cols.push(
        (layer ? 0.22 : 0.15) * shade,
        (layer ? 0.28 : 0.215) * shade,
        (layer ? 0.23 : 0.135) * shade,
      );
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({
      map: forestMap,
      vertexColors: true,
      roughness: 1,
    });
    const hill = new THREE.Mesh(g, m);
    scene.add(hill);
  }
  const rockMeshes: THREE.Mesh[] = [];
  rocks.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) rockMeshes.push(o);
  });
  rockMeshes.forEach((source, j) => {
    const ps = [];
    for (let i = 0; i < 24; i++) {
      const z = -37 + rng() * 103,
        x =
          -8 +
          7.5 * Math.sin(z * 0.029) +
          1.4 * Math.sin(z * 0.081) +
          (rng() - 0.42) * 5;
      ps.push({ x, z, s: 0.22 + rng() * 0.75, r: rng() * 6.28 });
    }
    // Isolate each normalized scan; object name and geometry survive export.
    instanced(scene, source, ps, true,48,0,"rock");
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
  // Dense 3D source clumps in the actual near foreground; keep their original blades.
  grassMeshes.forEach((source, j) => {
    const ps = [];
    let tries = 0;
    while (ps.length < 90 && tries++ < 5000) {
      const focus = tries % 2 === 0 ? [6, 40] : [15, 17];
      const x = focus[0] + (rng() - 0.5) * 10,
        z = focus[1] + (rng() - 0.5) * 10,
        d = landDistance(x, z),
        loc = cabinLocal(x, z);
      if (
        d < 2.6 ||
        (Math.abs(loc.x) < 8.35 && loc.z > -4.7 && loc.z < 7.2) ||
        (z > 9 && Math.abs(x - pathX(z)) < 0.55)
      )
        continue;
      ps.push({ x, z, s: 1.15 + rng() * 1.1, r: rng() * 6.28 });
    }
    instanced(
      scene,
      source,
      ps,
      false,
      24,
      new URLSearchParams(location.search).has("fullReflection") ? 0 : 1,
    );
  });
  const sourceGrass = grassMeshes[0].material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardMaterial({
    map: sourceGrass.map,
    roughness: 1,
    metalness: 0,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    color: new THREE.Color(0.73, 0.92, 0.55),
    envMapIntensity: 0.5,
  });
  material.alphaToCoverage = true;
  material.onBeforeCompile = (shader, gl) => {
    sourceGrass.onBeforeCompile(shader, gl);
    // The authored canopy normals point upward on both faces. Preserve that
    // convention on backfaces instead of turning half each grass clump black.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      "#include <normal_fragment_maps>\nif (!gl_FrontFacing) normal = -normal;",
    );
  };
  material.customProgramCacheKey = () => "scanned-clump-grass-v3";
  for (let j = 0; j < 5; j++) {
    const source = meadowClump(j, material),
      ps = [];
    let tries = 0;
    while (ps.length < 5200 && tries++ < 45000) {
      const x = -8 + rng() * 47,
        z = -21 + rng() * 81,
        d = landDistance(x, z),
        loc = cabinLocal(x, z);
      const under = Math.abs(loc.x) < 8.35 && loc.z > -4.7 && loc.z < 7.2;
      const trail = Math.abs(x - pathX(z)) < 0.62 && z > 9;
      const density =
        0.73 +
        0.2 * Math.sin(x * 0.47 + z * 0.23) +
        0.17 * Math.cos(z * 0.52 - x * 0.31);
      if (d < 2.6 || under || trail || rng() > density) continue;
      ps.push({ x, z, s: 0.73 + rng() * 0.75, r: rng() * 6.28 });
    }
    instanced(
      scene,
      source,
      ps,
      false,
      32,
      new URLSearchParams(location.search).has("fullReflection") ? 0 : 1,
    );
    source.geometry.dispose();
  }
  const lake = createLake(sunDirection, quality === "high" ? 1024 : 512);
  scene.add(lake);
  const warmCamera = new THREE.PerspectiveCamera();
  warmCamera.layers.enableAll();
  await renderer.compileAsync(scene, warmCamera);
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
    updateDoor,
    door: doorPivot,
    dispose,
    sunDirection: sunDirection.toArray(),
    source: "Poly Haven CC0 / original Blender exterior",
  };
}
