import { useMemo, useEffect } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
// Original MVP furniture proxies in the existing cabin's shared metre coordinate system.
export function Interior() {
  const screen = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 432;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c2d0be";
    ctx.fillRect(0, 0, 768, 432);
    ctx.fillStyle = "#f7faef";
    ctx.fillRect(30, 35, 708, 335);
    ctx.fillStyle = "#345b47";
    ctx.font = "18px sans-serif";
    ctx.fillText("PERSONAL WORLD", 58, 76);
    ctx.fillStyle = "#74836c";
    ctx.font = "12px sans-serif";
    ctx.fillText("YOUR PRIVATE LIBRARY", 58, 100);
    ["Notes", "Photos", "Projects", "Resume"].forEach((label, i) => {
      ctx.fillStyle = ["#e8d991", "#adc6ad", "#426451", "#dedfd0"][i];
      ctx.fillRect(100 + i * 150, 170, 65, 65);
      ctx.fillStyle = "#536c4c";
      ctx.font = "15px sans-serif";
      ctx.fillText(label, 100 + i * 150, 262);
    });
    ctx.fillStyle = "#597452";
    ctx.font = "12px sans-serif";
    ctx.fillText("A place for your stories.", 58, 335);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => screen.dispose(), [screen]);
  return (
    <group position={[8, 0, -3]} rotation={[0, (-35 * Math.PI) / 180, 0]}>
      <mesh position={[0, 1.37, 0]} receiveShadow>
        <boxGeometry args={[11.35, 0.08, 8.35]} />
        <meshStandardMaterial color="#73563d" roughness={0.88} />
      </mesh>
      <mesh position={[0, 4.22, 0]} receiveShadow>
        <boxGeometry args={[11.35, 0.09, 8.35]} />
        <meshStandardMaterial color="#a08361" roughness={0.95} />
      </mesh>
      <group position={[-2, 1.42, -2]}>
        <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.09, 0.8]} />
          <meshStandardMaterial color="#754d2c" roughness={0.76} />
        </mesh>
        {[-0.82, 0.82].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.35, z]} castShadow>
              <boxGeometry args={[0.065, 0.7, 0.065]} />
              <meshStandardMaterial color="#303334" roughness={0.5} />
            </mesh>
          )),
        )}
        <mesh position={[0, 0.94, -0.23]}>
          <boxGeometry args={[0.12, 0.4, 0.1]} />
          <meshStandardMaterial
            color="#424a4b"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.8, -0.1]}>
          <boxGeometry args={[0.42, 0.025, 0.26]} />
          <meshStandardMaterial
            color="#424a4b"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 1.17, -0.16]} castShadow>
          <boxGeometry args={[1.13, 0.68, 0.055]} />
          <meshStandardMaterial color="#252d2e" roughness={0.45} />
        </mesh>
        <mesh position={[0, 1.17, -0.126]}>
          <planeGeometry args={[1.06, 0.6]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.805, 0.16]}>
          <boxGeometry args={[0.58, 0.025, 0.19]} />
          <meshStandardMaterial color="#b5bcb5" roughness={0.65} />
        </mesh>
        <mesh position={[0.72, 0.855, 0.1]}>
          <cylinderGeometry args={[0.045, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#e8d9c1" roughness={0.85} />
        </mesh>
      </group>
      <mesh position={[-2, 1.88, -0.95]} castShadow>
        <boxGeometry args={[0.48, 0.09, 0.48]} />
        <meshStandardMaterial color="#3e554c" roughness={0.95} />
      </mesh>
      <mesh position={[-2, 2.12, -0.71]} castShadow>
        <boxGeometry args={[0.48, 0.52, 0.06]} />
        <meshStandardMaterial color="#3e554c" roughness={0.95} />
      </mesh>
      <mesh position={[-2, 1.65, -0.95]}>
        <cylinderGeometry args={[0.035, 0.035, 0.45, 10]} />
        <meshStandardMaterial color="#333d3b" />
      </mesh>
      <pointLight
        position={[-1, 3.55, 0.1]}
        color="#ffdfb4"
        intensity={35}
        distance={8}
        decay={2}
      />
    </group>
  );
}
