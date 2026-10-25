import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createCameraPath } from "./cameraPath";
import { buildWorld } from "./World";
import { SHOTS, INSPECTION_SHOTS, clamp } from "./landscape";
import { runtime } from "./runtime";

function Stage() {
  const { scene, gl, camera } = useThree();
  const [ready, setReady] = useState(false);
  const world = useRef<Awaited<ReturnType<typeof buildWorld>> | null>(null);
  const path = useRef(createCameraPath());
  const motion = useRef({ start: 0, end: 0, elapsed: 0, duration: 12 });
  const elapsed = useRef(0);
  const lastFrame = useRef(0);
  const point = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const lookA = useRef(new THREE.Vector3(...SHOTS.A.target)),
    lookB = useRef(new THREE.Vector3(...SHOTS.B.target));
  useEffect(() => {
    let alive = true;
    let resource: typeof world.current = null;
    runtime.renderer = gl;
    runtime.camera = camera as THREE.PerspectiveCamera;
    camera.layers.enable(1);
    camera.layers.enable(2);
    gl.info.autoReset = false;
    gl.toneMapping = THREE.AgXToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    buildWorld(scene, gl, runtime.quality)
      .then((w) => {
        resource = w;
        if (!alive) {
          w.dispose();
          return;
        }
        world.current = w;
        runtime.loadingMs = performance.now() - runtime.started;
        runtime.ready = true;
        const s = new URLSearchParams(location.search).get("shot");
        runtime.requestedShot = s === "B" ? "B" : "A";
        if (s === "C" || s === "D" || s === "E") runtime.inspectionShot = s;
        setReady(true);
      })
      .catch((e) => {
        runtime.errors.push(String(e));
        window.dispatchEvent(
          new CustomEvent("world-error", { detail: String(e) }),
        );
      });
    const visibility = () => {
      lastFrame.current = 0;
      runtime.visibilityExclusions++;
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive = false;
      runtime.ready = false;
      resource?.dispose();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [scene, gl, camera]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        runtime.moving = false;
        runtime.moveTarget = null;
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useFrame((_, dt) => {
    if (!ready) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (runtime.requestedShot) {
      runtime.progress = runtime.requestedShot === "A" ? 0 : 1;
      runtime.moving = false;
      runtime.requestedShot = null;
    }
    if (runtime.moveTarget !== null) {
      motion.current = {
        start: runtime.progress,
        end: runtime.moveTarget,
        elapsed: 0,
        duration: runtime.reducedMotion
          ? 0
          : Math.max(2.5, 12 * Math.abs(runtime.moveTarget - runtime.progress)),
      };
      runtime.moveTarget = null;
      runtime.moving = true;
    }
    if (runtime.moving) {
      const m = motion.current;
      m.elapsed += Math.min(dt, 0.1);
      const t = m.duration === 0 ? 1 : clamp(m.elapsed / m.duration);
      const ease = t * t * (3 - 2 * t);
      runtime.progress = THREE.MathUtils.lerp(m.start, m.end, ease);
      if (t === 1) runtime.moving = false;
    }
    const t = runtime.progress;
    const inspection = runtime.inspectionShot
      ? INSPECTION_SHOTS[runtime.inspectionShot]
      : null;
    path.current.getPointAt(t, point.current);
    look.current.lerpVectors(lookA.current, lookB.current, t);
    if (inspection) {
      point.current.fromArray(inspection.position);
      look.current.fromArray(inspection.target);
    }
    cam.position.copy(point.current);
    cam.lookAt(look.current);
    cam.fov =
      inspection?.fov ?? THREE.MathUtils.lerp(SHOTS.A.fov, SHOTS.B.fov, t);
    cam.near = 0.1;
    cam.far = 3000;
    cam.updateProjectionMatrix();
    if (runtime.motion) elapsed.current += Math.min(dt, 0.05);
    (world.current!.lake.material as THREE.ShaderMaterial).uniforms.time.value =
      elapsed.current;
    world.current!.windTime.value = elapsed.current;
    const now = performance.now();
    gl.info.reset();
    gl.render(scene, cam);
    if (!runtime.firstFrameMs) runtime.firstFrameMs = performance.now();
    if (
      runtime.recording &&
      lastFrame.current &&
      now >= runtime.warmupAt &&
      !document.hidden
    ) {
      runtime.frames.push({
        ms: now - lastFrame.current,
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        t: runtime.progress,
      });
    }
    lastFrame.current = now;
    if (runtime.captureRequested) {
      runtime.captureRequested = false;
      runtime.captureName = runtime.inspectionShot
        ? `cabin-angle-${runtime.inspectionShot}.png`
        : t < 0.5
          ? "S01-lakeshore.png"
          : "S02-cabin-approach.png";
      runtime.captureURL = gl.domElement.toDataURL("image/png");
      window.dispatchEvent(new Event("capture-ready"));
    }
  }, 1);
  return null;
}
export function Exterior() {
  const high = new URLSearchParams(location.search).get("quality") === "high";
  runtime.quality = high ? "high" : "standard";
  return (
    <Canvas
      shadows
      dpr={
        new URLSearchParams(location.search).has("benchmark")
          ? 1
          : high
            ? 1.5
            : 1
      }
      camera={{
        position: [...SHOTS.A.position],
        fov: 42,
        near: 0.1,
        far: 3000,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
    >
      <Stage />
    </Canvas>
  );
}
