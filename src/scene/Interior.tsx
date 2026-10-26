import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { CABIN } from "./architecture";
import { assetURL } from "../site";
import { runtime } from "./runtime";
import { MacBook } from "./MacBook";
import { RecordPlayer } from "./RecordPlayer";
import { BaseballGear } from "./BaseballGear";

/** The authored interior is one optimized GLB; navigation stays in architecture.ts. */
export function Interior({ onComputerClick, onReady }: {
  onComputerClick?: () => void;
  onReady?: () => void;
}) {
  const { gl, scene } = useThree();
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    let resource: THREE.Group | null = null;
    const url = assetURL("assets/cabin-interior-v3.glb");
    runtime.assetStages[url] = "fetching / decoding interior V3";
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)
      .then((gltf) => {
        resource = gltf.scene;
        resource.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = object.receiveShadow = true;
            for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.envMapIntensity = .8;
                m.dithering = true;
                if (/linen|wool|bedding/.test(m.name)) m.roughness = Math.max(m.roughness, .9);
              }
            }
          }
        });
        if (!alive) { disposeInterior(resource); return; }
        runtime.assetStages[url] = "decoded interior V3";
        setModel(resource);
      })
      .catch((error) => {
        if (!alive) return;
        runtime.assetStages[url] = "failed";
        runtime.errors.push("Interior V3: " + String(error));
        window.dispatchEvent(new CustomEvent("world-error", { detail: "室内资源加载失败；可重试或直接进入资料库。" }));
      });
    return () => { alive = false; if (resource) disposeInterior(resource); };
  }, []);
  useEffect(() => {
    if (!model) return;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((object) => {
      if (object instanceof THREE.DirectionalLight) object.shadow.needsUpdate = true;
    });
    window.dispatchEvent(new Event("interior-ready"));
    onReady?.();
  }, [model, gl, scene, onReady]);
  return (
    <group name="CABIN_INTERIOR_V3" position={[...CABIN.origin]} rotation={[0, CABIN.rotationY, 0]}>
      {model && <primitive object={model} dispose={null} />}
      <MacBook onComputerClick={onComputerClick} />
      <RecordPlayer />
      <BaseballGear />
      {/* Fixture light, ember light and window bounce; no bloom or hidden giant fill light. */}
      <pointLight position={[.40, 3.32, -1.65]} color="#ffdfb0" intensity={19} distance={7} decay={2} />
      <pointLight position={[3.55, 4.42, 2.1]} color="#ffe3b9" intensity={28} distance={8} decay={2} />
      <pointLight position={[4.88, 1.90, 0]} color="#ff913c" intensity={5.5} distance={3.6} decay={2} />
      <pointLight position={[-.925, 5.09, -2.925]} color="#ffe0b4" intensity={3.2} distance={4} decay={2} />
      <pointLight position={[-3.8, 3.6, 4.05]} color="#e1e8e0" intensity={15} distance={6} decay={2} />
    </group>
  );
}
function disposeInterior(model: THREE.Group) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materials.add(m);
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
}
