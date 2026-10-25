import { useMemo, useEffect } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { CABIN, LAPTOP_SCREEN_LOCAL } from "./architecture";
import {
  drawScreenPreview,
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
} from "./screenPreview";

/** Original furniture in metres. The exterior GLB owns the real shell and window reveals. */
export function Interior({
  onComputerClick,
}: {
  onComputerClick?: () => void;
}) {
  const resources = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_WIDTH;
    canvas.height = PREVIEW_HEIGHT;
    drawScreenPreview(canvas);
    const screen = new CanvasTexture(canvas);
    screen.colorSpace = SRGBColorSpace;
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 256;
    grainCanvas.height = 512;
    const ctx = grainCanvas.getContext("2d")!;
    ctx.fillStyle = "#997349";
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 125; i++) {
      ctx.strokeStyle = `rgba(47,29,14,${0.03 + (i % 5) * 0.012})`;
      ctx.lineWidth = 0.5 + (i % 3) * 0.3;
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 8) {
        const x = i * 2.1 + Math.sin(y * 0.014 + i * 0.21) * (1.3 + (i % 4));
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const grain = new CanvasTexture(grainCanvas);
    grain.colorSpace = SRGBColorSpace;
    grain.wrapS = grain.wrapT = RepeatWrapping;
    grain.repeat.set(1, 4);
    grain.anisotropy = 4;
    const keysCanvas = document.createElement("canvas");
    keysCanvas.width = 512;
    keysCanvas.height = 180;
    const keysCtx = keysCanvas.getContext("2d")!;
    keysCtx.fillStyle = "#272c2e";
    keysCtx.fillRect(0, 0, 512, 180);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 13; c++) {
        keysCtx.fillStyle = "#444a4d";
        keysCtx.fillRect(3 + c * 39, 3 + r * 35, 33, 29);
        keysCtx.fillStyle = "#c5c9c6";
        keysCtx.font = "9px sans-serif";
        keysCtx.fillText("·", 17 + c * 39, 18 + r * 35);
      }
    const keys = new CanvasTexture(keysCanvas);
    keys.colorSpace = SRGBColorSpace;
    const display = new BufferGeometry();
    display.setAttribute(
      "position",
      new Float32BufferAttribute(LAPTOP_SCREEN_LOCAL.flat(), 3),
    );
    display.setAttribute(
      "uv",
      new Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2),
    );
    display.setIndex([0, 2, 1, 0, 3, 2]);
    display.computeVertexNormals();
    return { screen, grain, display, keys };
  }, []);
  useEffect(
    () => () => {
      resources.screen.dispose();
      resources.grain.dispose();
      resources.display.dispose();
      resources.keys.dispose();
    },
    [resources],
  );
  return (
    <group
      name="CABIN_INTERIOR"
      position={[...CABIN.origin]}
      rotation={[0, CABIN.rotationY, 0]}
    >
      {/* Finish floor reaches y1.37; no second room shell or fake duplicate window glass. */}
      <mesh position={[1.11, 1.343, 4.39]} receiveShadow>
        <boxGeometry args={[1.1, 0.026, 0.2]} />
        <meshStandardMaterial color="#896b45" roughness={0.85} />
      </mesh>
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={`floor-${i}`}
          position={[0, 1.351, -4.224 + i * 0.2725]}
          receiveShadow
        >
          <boxGeometry args={[11.68, 0.038, 0.269]} />
          <meshStandardMaterial
            map={resources.grain}
            color={["#bfaf91", "#bbaa8f", "#c6b89f", "#bfae8d"][i % 4]}
            roughness={0.87}
          />
        </mesh>
      ))}
      {[-3.55, -0.95, 1.65].map((z) => (
        <mesh key={z} position={[0, 4.02, z]} castShadow receiveShadow>
          <boxGeometry args={[11.7, 0.18, 0.19]} />
          <meshStandardMaterial color="#563d29" roughness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[0, 1.374, -0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[3.3, 2.5]} />
        <meshStandardMaterial color="#9b9983" roughness={1} />
      </mesh>
      <group name="writing-desk">
        <mesh position={[-3.6, 2.085, 2.95]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.09, 0.85]} />
          <meshStandardMaterial
            map={resources.grain}
            color="#d1b891"
            roughness={0.72}
          />
        </mesh>
        {[-4.4, -2.8].flatMap((x) =>
          [2.64, 3.26].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 1.705, z]} castShadow>
              <boxGeometry args={[0.075, 0.67, 0.075]} />
              <meshStandardMaterial color="#4c4536" roughness={0.68} />
            </mesh>
          )),
        )}
        <mesh
          position={[-2.94, 2.139, 3.06]}
          rotation={[0, 0.1, 0]}
          receiveShadow
        >
          <boxGeometry args={[0.24, 0.018, 0.18]} />
          <meshStandardMaterial color="#e4ddc6" roughness={0.92} />
        </mesh>
        <mesh position={[-4.19, 2.197, 2.94]} castShadow>
          <cylinderGeometry args={[0.046, 0.038, 0.13, 24]} />
          <meshStandardMaterial color="#b6b097" roughness={0.47} />
        </mesh>
        <mesh position={[-4.19, 2.263, 2.94]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.039, 24]} />
          <meshStandardMaterial color="#312416" roughness={0.7} />
        </mesh>
      </group>
      <group
        name="INTERACTION_LAPTOP"
        onClick={(e) => {
          if (onComputerClick) {
            e.stopPropagation();
            onComputerClick();
          }
        }}
      >
        {/* A 14-inch notebook, without a trademark or logo. */}
        <mesh position={[-3.6, 2.145, 2.988]} castShadow>
          <boxGeometry args={[0.38, 0.022, 0.255]} />
          <meshStandardMaterial
            color="#aaaead"
            metalness={0.82}
            roughness={0.33}
          />
        </mesh>
        <mesh
          position={[-3.6, 2.157, 3.025]}
          rotation={[-Math.PI / 2, 0, Math.PI]}
        >
          <planeGeometry args={[0.323, 0.108]} />
          <meshStandardMaterial map={resources.keys} roughness={0.6} />
        </mesh>
        <mesh position={[-3.6, 2.158, 2.911]}>
          <boxGeometry args={[0.13, 0.0015, 0.063]} />
          <meshStandardMaterial
            color="#979e9f"
            metalness={0.6}
            roughness={0.39}
          />
        </mesh>
        <mesh
          position={[-3.6, 2.293, 3.14]}
          rotation={[0.2196, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.38, 0.256, 0.012]} />
          <meshStandardMaterial
            color="#313b3e"
            metalness={0.72}
            roughness={0.32}
          />
        </mesh>
        <mesh name="LAPTOP_SCREEN" geometry={resources.display}>
          <meshBasicMaterial map={resources.screen} toneMapped={false} />
        </mesh>
      </group>
      {/* The chair is parked to the side so the route to the laptop stays clear. */}
      <group position={[-4.6, CABIN.floorY, 1.85]} rotation={[0, -0.3, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.49, 0.075, 0.49]} />
          <meshStandardMaterial color="#4c5e50" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.75, -0.23]} castShadow>
          <boxGeometry args={[0.48, 0.54, 0.055]} />
          <meshStandardMaterial color="#58694f" roughness={0.95} />
        </mesh>
        {[-0.2, 0.2].flatMap((x) =>
          [-0.2, 0.2].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.215, z]} castShadow>
              <boxGeometry args={[0.04, 0.43, 0.04]} />
              <meshStandardMaterial color="#55402c" roughness={0.85} />
            </mesh>
          )),
        )}
      </group>
      <group position={[3.95, CABIN.floorY, -3.55]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.25, 0.5, 0.8]} />
          <meshStandardMaterial color="#526554" roughness={0.96} />
        </mesh>
        <mesh position={[0, 0.7, -0.3]} castShadow>
          <boxGeometry args={[2.25, 0.65, 0.2]} />
          <meshStandardMaterial color="#68765e" roughness={0.97} />
        </mesh>
        {[-0.73, 0.73].map((x) => (
          <mesh
            key={x}
            position={[x, 0.62, 0.06]}
            rotation={[0.1, 0.1, 0.15]}
            castShadow
          >
            <boxGeometry args={[0.46, 0.24, 0.46]} />
            <meshStandardMaterial color="#c0b18d" roughness={1} />
          </mesh>
        ))}
      </group>
      <group position={[-5.42, CABIN.floorY, -2.52]}>
        {[0, 0.49, 0.99, 1.5].map((y) => (
          <mesh key={y} position={[0, y + 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.075, 1.9]} />
            <meshStandardMaterial color="#6d5032" roughness={0.85} />
          </mesh>
        ))}
        {[-0.92, 0.92].map((z) => (
          <mesh key={z} position={[0, 0.79, z]} castShadow>
            <boxGeometry args={[0.42, 1.65, 0.065]} />
            <meshStandardMaterial color="#6d5032" roughness={0.85} />
          </mesh>
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <mesh
            key={i}
            position={[
              0.04,
              0.69 + (i % 2) * 0.5,
              -0.72 + Math.floor(i / 2) * 0.19,
            ]}
            castShadow
          >
            <boxGeometry args={[0.28, 0.3 + (i % 3) * 0.025, 0.1]} />
            <meshStandardMaterial
              color={["#77745a", "#9c8662", "#4e6558", "#6a5949"][i % 4]}
              roughness={1}
            />
          </mesh>
        ))}
      </group>
      <group position={[1.9, 3.55, -0.9]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.29, 0.2, 24]} />
          <meshStandardMaterial color="#a89d80" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.35, 10]} />
          <meshStandardMaterial color="#423b31" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.11, 0]}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshStandardMaterial
            color="#fff0c5"
            emissive="#ffe7b0"
            emissiveIntensity={1.5}
            roughness={0.4}
          />
        </mesh>
        <pointLight
          position={[0, -0.16, 0]}
          color="#ffdeb1"
          intensity={24}
          distance={9}
          decay={2}
        />
      </group>
      <pointLight
        position={[-3.6, 3.1, 3.95]}
        color="#e5eddf"
        intensity={14}
        distance={6}
        decay={2}
      />
    </group>
  );
}
