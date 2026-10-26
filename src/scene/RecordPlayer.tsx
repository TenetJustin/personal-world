import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ambience } from "../audio/ambience";
import { assetURL } from "../site";
import { CABIN } from "./architecture";
import { runtime } from "./runtime";

const PLAYER_POSITION: readonly [number, number, number] = [-5, 2.16, 1.73];

export function RecordPlayer() {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let alive = true;
    let resource: THREE.Group | null = null;
    const url = assetURL("assets/record-player.glb");
    runtime.assetStages[url] = "fetching / decoding record player";
    new GLTFLoader()
      .loadAsync(url)
      .then((gltf) => {
        resource = gltf.scene;
        resource.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = object.receiveShadow = true;
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = 0.72;
              material.envMapIntensity = 0.75;
              material.dithering = true;
              material.color.set("#d8c8ac");
            }
          }
        });
        if (!alive) {
          disposeRecordPlayer(resource);
          return;
        }
        runtime.assetStages[url] = "decoded record player";
        setModel(resource);
      })
      .catch((error) => {
        runtime.assetStages[url] = "failed";
        runtime.errors.push("Record player: " + String(error));
      });
    return () => {
      alive = false;
      document.body.style.cursor = "";
      if (resource) disposeRecordPlayer(resource);
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <group name="INTERACTIVE_RECORD_PLAYER">
      <mesh position={[-5, CABIN.floorY + 0.39, 1.73]} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.78, 0.92]} />
        <meshStandardMaterial color="#5a3928" roughness={0.82} />
      </mesh>
      <mesh position={[-5, CABIN.floorY + 0.79, 1.73]} castShadow receiveShadow>
        <boxGeometry args={[1.13, 0.05, 0.97]} />
        <meshStandardMaterial color="#7a5037" roughness={0.76} />
      </mesh>
      <group
        position={[...PLAYER_POSITION]}
        rotation={[0, Math.PI * 0.51, 0]}
        scale={0.0105}
        onClick={(event) => {
          event.stopPropagation();
          void ambience.toggleRecordPlayer();
        }}
        onPointerEnter={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
      >
        {model && <primitive object={model} dispose={null} />}
      </group>
    </group>
  );
}

function disposeRecordPlayer(model: THREE.Group) {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
