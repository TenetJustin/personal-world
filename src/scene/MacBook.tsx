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

import {
  KEYBOARD,
  buildMacBookKeys,
  keyLegendUV,
  type MacBookKey,
} from "./macbookKeyboard.ts";
import { MACBOOK_FINISHES, type MacBookFinish } from "./macbookModel.ts";
const KEY_TOP = MACBOOK.baseThickness + KEYBOARD.keyHeight;
function legendCanvas(keys: MacBookKey[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 784;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#e8ebee";
  for (const key of keys) {
    if (!key.label || key.label === "Touch ID") continue;
    const [u, v] = keyLegendUV(key);
    const size = key.label.length > 3 ? 15 : 20;
    context.font = `500 ${size}px Arial, Helvetica, sans-serif`;
    context.fillText(key.label, u * canvas.width, v * canvas.height);
  }
  return canvas;
}
function labelPlane() {
  const x = KEYBOARD.width / 2,
    near = KEYBOARD.centerZ - KEYBOARD.depth / 2,
    far = KEYBOARD.centerZ + KEYBOARD.depth / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [x, 0, far, -x, 0, far, -x, 0, near, x, 0, near],
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2),
  );
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
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
  finish = "silver",
  bodyColor,
}: {
  onComputerClick?: () => void;
  finish?: MacBookFinish;
  bodyColor?: string;
}) {
  const resources = useMemo(() => {
    const keys = buildMacBookKeys();
    const keyGeometry = new RoundedBoxGeometry(
      KEYBOARD.pitchX - KEYBOARD.gap,
      KEYBOARD.keyHeight,
      KEYBOARD.pitchZ - KEYBOARD.gap,
      2,
      0.00035,
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
        key.x,
        MACBOOK.baseThickness + KEYBOARD.keyHeight / 2,
        key.z,
      );
      dummy.scale.set(key.units, 1, key.heightScale);
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
    const trackpadGeometry = new RoundedBoxGeometry(
      0.132,
      0.0008,
      0.075,
      3,
      0.002,
    );
    const trackpadBorder = new RoundedBoxGeometry(
      0.137,
      0.0006,
      0.08,
      3,
      0.0025,
    );
    return {
      keys,
      labelGeometry: labelPlane(),
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
      resources.labelGeometry.dispose();
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
  const aluminium = bodyColor ?? MACBOOK_FINISHES[finish];
  const touchID = resources.keys.find((k) => k.label === "Touch ID")!;

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
          color={aluminium}
          metalness={0.88}
          roughness={0.34}
          clearcoat={0.35}
          clearcoatRoughness={0.32}
          envMapIntensity={1.1}
        />
      </mesh>
      {/* Shallow key well; Air speakers vent at the hinge, without side grilles. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, MACBOOK.baseThickness + 0.0001, KEYBOARD.centerZ]}
      >
        <planeGeometry
          args={[KEYBOARD.width + 0.003, KEYBOARD.depth + 0.001]}
        />
        <meshStandardMaterial color="#101114" roughness={0.8} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, MACBOOK.baseThickness + 0.00015, 0.103]}
      >
        <planeGeometry args={[0.242, 0.0012]} />
        <meshStandardMaterial color="#171a1d" roughness={0.85} />
      </mesh>
      <primitive object={resources.keyMesh} />
      <mesh
        geometry={resources.labelGeometry}
        position={[0, KEY_TOP + 0.00012, 0]}
      >
        <meshBasicMaterial
          map={resources.legends}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Touch ID has a recessed round sensor inside its square function key. */}
      <mesh position={[touchID.x, KEY_TOP + 0.00013, touchID.z]}>
        <cylinderGeometry args={[0.0054, 0.0054, 0.00016, 40]} />
        <meshStandardMaterial
          color="#565b63"
          roughness={0.36}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[touchID.x, KEY_TOP + 0.00023, touchID.z]}>
        <cylinderGeometry args={[0.00485, 0.00485, 0.00012, 40]} />
        <meshPhysicalMaterial
          color="#171a20"
          roughness={0.26}
          clearcoat={0.7}
        />
      </mesh>
      {/* Trackpad: recessed glass with a fine machined border. */}
      <mesh
        geometry={resources.trackpadBorder}
        position={[-0.001, MACBOOK.baseThickness + 0.0003, -0.055]}
      >
        <meshStandardMaterial
          color="#6f777d"
          metalness={0.85}
          roughness={0.32}
        />
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
      {/* Visitor-left is local +X: MagSafe and two separate USB-C sockets. */}
      {[
        { id: "MagSafe", z: 0.076, width: 0.0122, height: 0.0031 },
        { id: "USB-C-1", z: 0.049, width: 0.0085, height: 0.0028 },
        { id: "USB-C-2", z: 0.026, width: 0.0085, height: 0.0028 },
      ].map((port) => (
        <group
          key={port.id}
          name={port.id}
          position={[
            MACBOOK.width / 2 + 0.00004,
            MACBOOK.baseThickness * 0.5,
            port.z,
          ]}
        >
          <mesh>
            <boxGeometry
              args={[0.00022, port.height + 0.00065, port.width + 0.0007]}
            />
            <meshStandardMaterial
              color="#737c84"
              metalness={0.9}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0.00013, 0, 0]}>
            <boxGeometry args={[0.00015, port.height, port.width]} />
            <meshStandardMaterial color="#111820" roughness={0.75} />
          </mesh>
          {port.id === "MagSafe" ? (
            [-2, -1, 0, 1, 2].map((i) => (
              <mesh key={i} position={[0.00023, 0, i * 0.00155]}>
                <sphereGeometry args={[0.00032, 8, 6]} />
                <meshStandardMaterial
                  color="#b5a17b"
                  metalness={0.85}
                  roughness={0.35}
                />
              </mesh>
            ))
          ) : (
            <mesh position={[0.00023, 0, 0]}>
              <boxGeometry args={[0.00012, 0.00055, 0.0054]} />
              <meshStandardMaterial
                color="#687580"
                metalness={0.55}
                roughness={0.5}
              />
            </mesh>
          )}
        </group>
      ))}
      <group
        name="3.5mm-headphone-jack"
        position={[
          -MACBOOK.width / 2 - 0.00004,
          MACBOOK.baseThickness * 0.5,
          0.075,
        ]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <mesh>
          <ringGeometry args={[0.00172, 0.00212, 32]} />
          <meshStandardMaterial
            color="#7d858e"
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0, 0.00005]}>
          <circleGeometry args={[0.00172, 32]} />
          <meshStandardMaterial color="#080d14" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.00007]}>
          <ringGeometry args={[0.00115, 0.00135, 32]} />
          <meshStandardMaterial
            color="#8c805c"
            metalness={0.65}
            roughness={0.5}
          />
        </mesh>
      </group>
      <mesh
        position={[0, MACBOOK.hingeY, MACBOOK.hingeZ]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.0026, 0.0026, 0.292, 24]} />
        <meshStandardMaterial
          color="#4a5056"
          metalness={0.85}
          roughness={0.4}
        />
      </mesh>
      {/* Lid group: vertical at rest, tilted 10° back. */}
      <group
        position={[0, MACBOOK.hingeY, MACBOOK.hingeZ]}
        rotation={[MACBOOK.lidTilt, 0, 0]}
      >
        <mesh
          geometry={resources.lidGeometry}
          position={[0, lidHeight / 2, 0]}
          castShadow
        >
          <meshPhysicalMaterial
            color={aluminium}
            metalness={0.88}
            roughness={0.34}
            clearcoat={0.35}
            clearcoatRoughness={0.32}
            envMapIntensity={1.1}
          />
        </mesh>
        {/* Black glass surround, active panel, anti-reflective glass. */}
        <mesh
          position={[0, lidHeight / 2, -lidThickness / 2 - 0.00012]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[displayWidth + 0.012, displayHeight + 0.011]} />
          <meshStandardMaterial
            color="#050607"
            roughness={0.22}
            metalness={0.1}
          />
        </mesh>
        <mesh
          position={[0, displayCenterY, MACBOOK.screenPlaneZ]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[displayWidth, displayHeight]} />
          <meshBasicMaterial
            map={resources.screen}
            toneMapped={false}
            color="#e9ecee"
          />
        </mesh>
        <mesh
          position={[0, displayCenterY, -lidThickness / 2 - 0.00042]}
          rotation={[0, Math.PI, 0]}
        >
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
        <mesh
          position={[0, displayCenterY, -lidThickness / 2 - 0.00052]}
          rotation={[0, Math.PI, 0]}
        >
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
        <mesh
          position={[
            0,
            displayCenterY + displayHeight / 2 - 0.0028,
            -lidThickness / 2 - 0.0005,
          ]}
        >
          <boxGeometry args={[0.0238, 0.0062, 0.0006]} />
          <meshStandardMaterial color="#050607" roughness={0.4} />
        </mesh>
        <mesh
          position={[
            0,
            displayCenterY + displayHeight / 2 - 0.0035,
            -lidThickness / 2 - 0.0009,
          ]}
          rotation={[0, Math.PI, 0]}
        >
          <circleGeometry args={[0.0011, 16]} />
          <meshStandardMaterial
            color="#0a1a24"
            metalness={0.4}
            roughness={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}
