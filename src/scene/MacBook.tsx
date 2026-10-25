/**
 * MacBook Air 13.6" (M-series) — authored in metres from Apple's published
 * enclosure dimensions: 30.41 × 21.50 × 1.13 cm, 2560 × 1664 display.
 *
 * The lid is built vertically and tilted back 10°, so the physical display
 * quad in architecture.ts is derived from the same numbers used here.
 * No Apple artwork, logo or font file is embedded; the screen is original.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { drawScreenPreview } from "./screenPreview";

import { MACBOOK } from "./macbookModel.ts";
export { MACBOOK };

const KEY_PITCH_X = 0.0182;
const KEY_PITCH_Z = 0.0168;
const KEY_GAP = 0.0024;
const KEY_TOP = MACBOOK.baseThickness + 0.0032;

type Key = { label: string; units: number; row: number; x: number };

const ROWS: { label: string; units: number }[][] = [
  [
    { label: "esc", units: 1 },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `F${i + 1}`,
      units: 1,
    })),
    { label: "⏻", units: 1 },
  ],
  [
    { label: "`", units: 1 },
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((l) => ({
      label: l,
      units: 1,
    })),
    { label: "-", units: 1 },
    { label: "=", units: 1 },
    { label: "⌫", units: 1.5 },
  ],
  [
    { label: "⇥", units: 1.5 },
    ...["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((l) => ({
      label: l,
      units: 1,
    })),
    { label: "[", units: 1 },
    { label: "]", units: 1 },
    { label: "\\", units: 1 },
  ],
  [
    { label: "⇪", units: 1.75 },
    ...["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((l) => ({
      label: l,
      units: 1,
    })),
    { label: ";", units: 1 },
    { label: "'", units: 1 },
    { label: "↩", units: 1.75 },
  ],
  [
    { label: "⇧", units: 2.25 },
    ...["Z", "X", "C", "V", "B", "N", "M"].map((l) => ({
      label: l,
      units: 1,
    })),
    { label: ",", units: 1 },
    { label: ".", units: 1 },
    { label: "/", units: 1 },
    { label: "⇧", units: 2.25 },
  ],
  [
    { label: "fn", units: 1 },
    { label: "⌃", units: 1 },
    { label: "⌥", units: 1.25 },
    { label: "⌘", units: 1.25 },
    { label: "space", units: 5 },
    { label: "⌘", units: 1.25 },
    { label: "⌥", units: 1.25 },
    { label: "←", units: 0.5 },
    { label: "↑", units: 0.5 },
    { label: "↓", units: 0.5 },
    { label: "→", units: 0.5 },
  ],
];

/** Row 0 is the back row (function row). */
const KEY_ROWS_BACK_Z = 0.0935;

function buildKeys(): Key[] {
  const keys: Key[] = [];
  ROWS.forEach((row, rowIndex) => {
    const total = row.reduce((sum, key) => sum + key.units, 0);
    let cursor = -total / 2;
    for (const key of row) {
      keys.push({
        label: key.label,
        units: key.units,
        row: rowIndex,
        x: cursor + key.units / 2,
      });
      cursor += key.units;
    }
  });
  return keys;
}

function legendCanvas(keys: Key[]) {
  const scale = 6000;
  const width = Math.round(14.5 * KEY_PITCH_X * scale);
  const height = Math.round(6 * KEY_PITCH_Z * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const key of keys) {
    const x = (key.x * KEY_PITCH_X + (14.5 * KEY_PITCH_X) / 2) * scale;
    const z =
      KEY_ROWS_BACK_Z - key.row * KEY_PITCH_Z + (6 * KEY_PITCH_Z) / 2;
    const y = (1 - z / (6 * KEY_PITCH_Z)) * height;
    const size = Math.min(width / 90, height / 7.2) * (key.units > 1 ? 0.9 : 1);
    context.fillStyle = key.units > 3 ? "#aeb5ba" : "#e7eaec";
    context.font = `${key.units > 3 ? 500 : 600} ${Math.round(size * 1.15)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    context.fillText(key.label, x, y);
  }
  return canvas;
}

function glareCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 330;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 512, 330);
  gradient.addColorStop(0, "rgba(255,255,255,.28)");
  gradient.addColorStop(0.28, "rgba(255,255,255,.05)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0)");
  gradient.addColorStop(0.82, "rgba(255,255,255,.04)");
  gradient.addColorStop(1, "rgba(255,255,255,.11)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 330);
  return canvas;
}

function shadowCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 96, 6, 128, 96, 124);
  gradient.addColorStop(0, "rgba(0,0,0,.55)");
  gradient.addColorStop(0.55, "rgba(0,0,0,.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 192);
  return canvas;
}

export function MacBook({
  onComputerClick,
}: {
  onComputerClick?: () => void;
}) {
  const resources = useMemo(() => {
    const keys = buildKeys();
    const keyGeometry = new RoundedBoxGeometry(
      KEY_PITCH_X - KEY_GAP,
      0.0032,
      KEY_PITCH_Z - KEY_GAP,
      2,
      0.0011,
    );
    const keyMaterial = new THREE.MeshPhysicalMaterial({
      color: "#14161a",
      roughness: 0.62,
      metalness: 0.06,
      clearcoat: 0.15,
      clearcoatRoughness: 0.6,
    });
    const keyMesh = new THREE.InstancedMesh(
      keyGeometry,
      keyMaterial,
      keys.length,
    );
    keyMesh.castShadow = true;
    keyMesh.receiveShadow = true;
    keyMesh.name = "MACBOOK_KEYCAPS";
    const dummy = new THREE.Object3D();
    keys.forEach((key, index) => {
      dummy.position.set(
        key.x * KEY_PITCH_X,
        MACBOOK.baseThickness + 0.0016,
        KEY_ROWS_BACK_Z - key.row * KEY_PITCH_Z,
      );
      dummy.scale.set(key.units, 1, 1);
      dummy.updateMatrix();
      keyMesh.setMatrixAt(index, dummy.matrix);
    });
    keyMesh.instanceMatrix.needsUpdate = true;

    const legends = new THREE.CanvasTexture(legendCanvas(keys));
    legends.colorSpace = THREE.SRGBColorSpace;
    legends.anisotropy = 8;
    const screenCanvasEl = document.createElement("canvas");
    drawScreenPreview(screenCanvasEl);
    const screen = new THREE.CanvasTexture(screenCanvasEl);
    screen.colorSpace = THREE.SRGBColorSpace;
    screen.anisotropy = 8;
    screen.needsUpdate = true;
    const shadow = new THREE.CanvasTexture(shadowCanvas());
    shadow.colorSpace = THREE.SRGBColorSpace;
    const glare = new THREE.CanvasTexture(glareCanvas());
    glare.colorSpace = THREE.SRGBColorSpace;
    const baseGeometry = new RoundedBoxGeometry(
      MACBOOK.width,
      MACBOOK.baseThickness,
      MACBOOK.depth,
      4,
      0.0045,
    );
    const lidGeometry = new RoundedBoxGeometry(
      MACBOOK.width,
      MACBOOK.lidHeight,
      MACBOOK.lidThickness,
      4,
      0.0016,
    );
    const trackpadGeometry = new RoundedBoxGeometry(0.132, 0.0008, 0.075, 3, 0.002);
    const trackpadBorder = new RoundedBoxGeometry(0.137, 0.0006, 0.080, 3, 0.0025);
    return {
      keys,
      keyMesh,
      trackpadGeometry,
      trackpadBorder,
      keyGeometry,
      keyMaterial,
      legends,
      screen,
      shadow,
      glare,
      baseGeometry,
      lidGeometry,
    };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).has("debug"))
      (window as unknown as { __macbook?: unknown }).__macbook = resources;
    const frame = requestAnimationFrame(() =>
      window.dispatchEvent(new Event("macbook-ready")),
    );
    return () => {
      cancelAnimationFrame(frame);
      resources.keyGeometry.dispose();
      resources.keyMaterial.dispose();
      resources.keyMesh.dispose();
      resources.legends.dispose();
      resources.screen.dispose();
      resources.shadow.dispose();
      resources.glare.dispose();
      resources.baseGeometry.dispose();
      resources.lidGeometry.dispose();
      resources.trackpadGeometry.dispose();
      resources.trackpadBorder.dispose();
    };
  }, [resources]);

  const { displayWidth, displayHeight, lidHeight, lidThickness } = MACBOOK;
  const displayCenterY = MACBOOK.screenBottomBezel + displayHeight / 2;

  return (
    <group
      name="INTERACTION_LAPTOP"
      position={[MACBOOK.baseX, MACBOOK.baseY, MACBOOK.baseZ]}
      onClick={(event) => {
        if (!onComputerClick) return;
        event.stopPropagation();
        onComputerClick();
      }}
    >
      {/* Contact shadow, then four feet, then the unibody. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0004, 0]}>
        <planeGeometry args={[0.56, 0.42]} />
        <meshBasicMaterial
          map={resources.shadow}
          transparent
          depthWrite={false}
          opacity={0.85}
        />
      </mesh>
      {[
        [-0.13, 0.092],
        [0.13, 0.092],
        [-0.13, -0.092],
        [0.13, -0.092],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, -0.0003, z]}>
          <cylinderGeometry args={[0.0042, 0.0042, 0.0012, 16]} />
          <meshStandardMaterial color="#1c1f22" roughness={0.85} />
        </mesh>
      ))}
      <mesh
        geometry={resources.baseGeometry}
        position={[0, MACBOOK.baseThickness / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#9fa7ad"
          metalness={0.88}
          roughness={0.34}
          clearcoat={0.35}
          clearcoatRoughness={0.32}
          envMapIntensity={1.1}
        />
      </mesh>
      {/* Recessed keyboard well and speaker slots. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, MACBOOK.baseThickness + 0.0001, 0.0505]}
      >
        <planeGeometry args={[0.2695, 0.1035]} />
        <meshStandardMaterial color="#050607" roughness={0.92} metalness={0.15} envMapIntensity={0.25} />
      </mesh>
      {[-0.1415, 0.1415].map((x) => (
        <mesh
          key={x}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, MACBOOK.baseThickness + 0.0001, 0.049]}
        >
          <planeGeometry args={[0.0075, 0.098]} />
          <meshStandardMaterial color="#0c0d0f" roughness={0.9} />
        </mesh>
      ))}
      <primitive object={resources.keyMesh} />
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, KEY_TOP + 0.0004, 0.0525]}
      >
        <planeGeometry args={[14.5 * KEY_PITCH_X, 6 * KEY_PITCH_Z]} />
        <meshBasicMaterial
          map={resources.legends}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Trackpad: recessed glass with a fine machined border. */}
      <mesh
        geometry={resources.trackpadBorder}
        position={[-0.001, MACBOOK.baseThickness + 0.0003, -0.055]}
      >
        <meshStandardMaterial color="#6f777d" metalness={0.85} roughness={0.32} />
      </mesh>
      <mesh
        geometry={resources.trackpadGeometry}
        position={[-0.001, MACBOOK.baseThickness + 0.00055, -0.055]}
      >
        <meshPhysicalMaterial
          color="#868f96"
          metalness={0.45}
          roughness={0.22}
          clearcoat={0.8}
          clearcoatRoughness={0.12}
          envMapIntensity={1.1}
        />
      </mesh>
      {/* Ports: two USB-C on the left, MagSafe + audio on the right. */}
      {[
        [-0.046, -MACBOOK.width / 2 + 0.0004],
        [0.004, -MACBOOK.width / 2 + 0.0004],
        [0.058, MACBOOK.width / 2 - 0.0004],
      ].map(([z, x]) => (
        <mesh key={`${z}-${x}`} position={[x, MACBOOK.baseThickness * 0.55, z]}>
          <boxGeometry args={[0.0012, 0.0026, 0.008]} />
          <meshStandardMaterial color="#14171a" roughness={0.55} />
        </mesh>
      ))}
      <mesh
        position={[0, MACBOOK.hingeY, MACBOOK.hingeZ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.0026, 0.0026, 0.292, 24]} />
        <meshStandardMaterial color="#4a5056" metalness={0.85} roughness={0.4} />
      </mesh>
      {/* Lid group: vertical at rest, tilted 10° back. */}
      <group position={[0, MACBOOK.hingeY, MACBOOK.hingeZ]} rotation={[MACBOOK.lidTilt, 0, 0]}>
        <mesh geometry={resources.lidGeometry} position={[0, lidHeight / 2, 0]} castShadow>
          <meshPhysicalMaterial
            color="#9fa7ad"
            metalness={0.88}
            roughness={0.34}
            clearcoat={0.35}
            clearcoatRoughness={0.32}
            envMapIntensity={1.1}
          />
        </mesh>
        {/* Black glass surround, active panel, anti-reflective glass. */}
        <mesh position={[0, lidHeight / 2, -lidThickness / 2 - 0.00012]}>
          <planeGeometry args={[displayWidth + 0.012, displayHeight + 0.011]} />
          <meshStandardMaterial color="#050607" roughness={0.22} metalness={0.1} />
        </mesh>
        <mesh position={[0, displayCenterY, -lidThickness / 2 - 0.00024]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshBasicMaterial
            map={resources.screen}
            toneMapped={false}
            color="#e9ecee"
          />
        </mesh>
        <mesh position={[0, displayCenterY, -lidThickness / 2 - 0.00042]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshPhysicalMaterial
            color="#ffffff"
            metalness={0}
            roughness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.03}
            transparent
            opacity={0.06}
            depthWrite={false}
            envMapIntensity={1.6}
          />
        </mesh>
        <mesh position={[0, displayCenterY, -lidThickness / 2 - 0.00052]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshBasicMaterial
            map={resources.glare}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {/* Camera notch. */}
        <mesh position={[0, displayCenterY + displayHeight / 2 - 0.0018, -lidThickness / 2 - 0.0005]}>
          <boxGeometry args={[0.0138, 0.0042, 0.0006]} />
          <meshStandardMaterial color="#050607" roughness={0.4} />
        </mesh>
        <mesh position={[0, displayCenterY + displayHeight / 2 - 0.0035, -lidThickness / 2 - 0.0009]}>
          <circleGeometry args={[0.0011, 16]} />
          <meshStandardMaterial color="#0a1a24" metalness={0.4} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}
