import * as THREE from "three";
import { CABIN } from "./architecture";

const BAT_PROFILE = [
  [0.031, 0],
  [0.037, 0.018],
  [0.025, 0.045],
  [0.019, 0.1],
  [0.022, 0.55],
  [0.034, 0.67],
  [0.051, 0.78],
  [0.055, 0.86],
  [0.047, 0.89],
].map(([radius, height]) => new THREE.Vector2(radius, height));

function Bat({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) {
  return (
    <mesh
      name="ENTRY_BASEBALL_BAT"
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <latheGeometry args={[BAT_PROFILE, 32]} />
      <meshStandardMaterial color={color} roughness={0.58} metalness={0.02} />
    </mesh>
  );
}

function Glove() {
  return (
    <group
      name="ENTRY_BASEBALL_GLOVE"
      position={[-0.12, 1.2, 0.23]}
      rotation={[Math.PI / 2, -0.18, 0.08]}
    >
      <mesh scale={[0.2, 0.055, 0.19]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color="#7b3f24" roughness={0.86} />
      </mesh>
      {[-0.15, -0.05, 0.055, 0.15].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.015, -0.16 - Math.abs(index - 1.5) * 0.012]}
          rotation={[0.18, 0, x * -0.65]}
          scale={[0.048, 0.045, 0.15 + (index % 2) * 0.025]}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#8a4828" roughness={0.88} />
        </mesh>
      ))}
      <mesh
        position={[-0.19, 0.002, -0.04]}
        rotation={[0, -0.65, -0.14]}
        scale={[0.065, 0.045, 0.15]}
        castShadow
      >
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#824326" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.17]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.075, 0.13]} />
        <meshStandardMaterial color="#60301e" roughness={0.92} />
      </mesh>
      <mesh
        position={[0, -0.056, 0.015]}
        rotation={[Math.PI / 2, 0, -0.35]}
        scale={[1, 1.2, 1]}
      >
        <torusGeometry args={[0.125, 0.007, 6, 24, Math.PI * 1.35]} />
        <meshStandardMaterial color="#d39b60" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.058, -0.115]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.15, 4, 4]} />
        <meshStandardMaterial
          color="#4d2518"
          roughness={0.9}
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Baseball() {
  return (
    <group name="ENTRY_BASEBALL" position={[0.2, 0.64, 0]}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.055, 28, 20]} />
        <meshStandardMaterial color="#eee9dd" roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.22, 0]}>
        <torusGeometry args={[0.043, 0.0017, 6, 36]} />
        <meshStandardMaterial color="#a7382e" roughness={0.72} />
      </mesh>
      <mesh rotation={[0.12, Math.PI / 2, 0.3]}>
        <torusGeometry args={[0.043, 0.0017, 6, 36]} />
        <meshStandardMaterial color="#a7382e" roughness={0.72} />
      </mesh>
    </group>
  );
}

/** Small lived-in entry detail, kept clear of the actual door and walking line. */
export function BaseballGear() {
  return (
    <group
      name="ENTRY_BASEBALL_GEAR"
      position={[3.15, CABIN.floorY, 4.02]}
      rotation={[0, 0.03, 0]}
    >
      <group name="ENTRY_BAT_RACK" position={[0, 0, 0]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.13, 0.34]} />
          <meshStandardMaterial color="#4a2d1f" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0.13]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.08, 0.08]} />
          <meshStandardMaterial color="#5c3927" roughness={0.86} />
        </mesh>
        {[-0.21, 0.21].map((x) => (
          <mesh key={x} position={[x, 0.25, 0.13]} castShadow receiveShadow>
            <boxGeometry args={[0.055, 0.42, 0.055]} />
            <meshStandardMaterial color="#5c3927" roughness={0.86} />
          </mesh>
        ))}
        <Bat
          position={[-0.13, 0.1, -0.02]}
          rotation={[0.06, 0, -0.13]}
          color="#c39358"
        />
        <Bat
          position={[0.01, 0.1, 0.01]}
          rotation={[-0.05, 0.1, 0.035]}
          color="#9f7044"
        />
        <Bat
          position={[0.14, 0.1, -0.01]}
          rotation={[0.08, -0.12, 0.15]}
          color="#d2a46a"
        />
      </group>
      <group name="ENTRY_GEAR_BENCH" position={[-0.74, 0, 0]}>
        <mesh position={[-0.1, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.09, 0.43]} />
          <meshStandardMaterial color="#63402b" roughness={0.82} />
        </mesh>
        {[-0.47, 0.27].map((x) => (
          <mesh key={x} position={[x, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.07, 0.54, 0.34]} />
            <meshStandardMaterial color="#513220" roughness={0.88} />
          </mesh>
        ))}
        <Glove />
        <Baseball />
      </group>
    </group>
  );
}
