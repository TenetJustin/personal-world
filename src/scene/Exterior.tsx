import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createCameraPath } from "./cameraPath";
import { buildWorld } from "./World";
import { SHOTS, INSPECTION_SHOTS, clamp } from "./landscape";
import { runtime } from "./runtime";
import { Interior } from "./Interior";
import { journey } from "./journey";
import { LAPTOP_SCREEN_WORLD, worldToCabin } from "./architecture";
import { screenProjection } from "./screenProjection";
export type Place = "exterior" | "interior" | "desk";
const indoorPose = (v: [number, number, number]) =>
  new THREE.Vector3(...v)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), (-35 * Math.PI) / 180)
    .add(new THREE.Vector3(8, 0, -3));
const ROOM = {
  position: indoorPose([1.9, 2.95, 2.4]),
  target: indoorPose([-1.8, 2.5, -1.7]),
};
const DESK = {
  position: indoorPose([-2, 2.65, -0.2]),
  target: indoorPose([-2, 2.58, -2.13]),
};

function Stage({
  place = "exterior",
  cinematic = false,
}: {
  place?: Place;
  cinematic?: boolean;
}) {
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
        if (cinematic) journey.setReady();
        window.dispatchEvent(new Event("world-ready"));
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
  }, [scene, gl, camera, cinematic]);
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
  useEffect(() => {
    if (!cinematic) return;
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    let down: [number, number] | null = null;
    const cabinInverse = new THREE.Matrix4()
      .compose(
        new THREE.Vector3(8, 0, -3),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (-35 * Math.PI) / 180,
        ),
        new THREE.Vector3(1, 1, 1),
      )
      .invert();
    const cabinBox = new THREE.Box3(
      new THREE.Vector3(-6, 1.3, -4.5),
      new THREE.Vector3(6, 8.5, 4.5),
    );
    const press = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const release = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6)
        return;
      down = null;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      );
      ray.setFromCamera(pointer, camera);
      const laptop = scene.getObjectByName("INTERACTION_LAPTOP");
      if (laptop && ray.intersectObject(laptop, true).length) {
        if (journey.phase === "DESK_READY") journey.requestDesktop();
        else journey.navigate("desk");
        return;
      }
      if (
        world.current?.door &&
        ray.intersectObject(world.current.door, true).length
      ) {
        journey.navigate("room");
        return;
      }
      if (
        ray.ray
          .clone()
          .applyMatrix4(cabinInverse)
          .intersectBox(cabinBox, new THREE.Vector3()) &&
        worldToCabin(journey.position.toArray())[2] > 4.7
      )
        journey.navigate("room");
    };
    gl.domElement.addEventListener("pointerdown", press);
    gl.domElement.addEventListener("pointerup", release);
    return () => {
      gl.domElement.removeEventListener("pointerdown", press);
      gl.domElement.removeEventListener("pointerup", release);
    };
  }, [cinematic, gl, camera, scene]);
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
    if (cinematic) {
      journey.update(dt, !document.hidden);
      world.current!.updateDoor(journey.door);
    }
    const inspection = runtime.inspectionShot
      ? INSPECTION_SHOTS[runtime.inspectionShot]
      : null;
    path.current.getPointAt(t, point.current);
    look.current.lerpVectors(lookA.current, lookB.current, t);
    if (inspection) {
      point.current.fromArray(inspection.position);
      look.current.fromArray(inspection.target);
    }
    if (cinematic) {
      cam.position.copy(journey.position);
      cam.quaternion.copy(journey.quaternion);
      cam.fov = journey.fov;
      const local = worldToCabin(journey.position.toArray());
      const indoor = Math.max(0, Math.min(1, (4.8 - local[2]) / 1.5));
      gl.toneMappingExposure = THREE.MathUtils.lerp(
        gl.toneMappingExposure,
        1 + indoor * 0.07,
        1 - Math.exp(-dt * 1.5),
      );
    } else {
      cam.position.copy(point.current);
      cam.lookAt(look.current);
      if (place !== "exterior") {
        const pose = place === "desk" ? DESK : ROOM;
        cam.position.copy(pose.position);
        cam.lookAt(pose.target);
      }
      cam.fov =
        inspection?.fov ?? THREE.MathUtils.lerp(SHOTS.A.fov, SHOTS.B.fov, t);
      if (place !== "exterior") cam.fov = place === "desk" ? 48 : 58;
    }
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
    if (cinematic) {
      const width = gl.domElement.clientWidth,
        height = gl.domElement.clientHeight;
      const corners = LAPTOP_SCREEN_WORLD.map((p) =>
        new THREE.Vector3(...p).project(cam),
      );
      screenProjection.quad = corners.map(
        (p) => [((p.x + 1) * width) / 2, ((1 - p.y) * height) / 2] as const,
      );
      screenProjection.width = width;
      screenProjection.height = height;
      screenProjection.valid = corners.every(
        (p) =>
          p.z > -1 && p.z < 1 && Number.isFinite(p.x) && Number.isFinite(p.y),
      );
    }
    runtime.renderedFrames++;
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
  return (
    <Interior
      onComputerClick={
        cinematic
          ? () => {
              if (journey.phase === "DESK_READY") journey.requestDesktop();
              else journey.navigate("desk");
            }
          : undefined
      }
    />
  );
}
const CAMERA_OPTIONS = {
  position: [...SHOTS.A.position] as [number, number, number],
  fov: 42,
  near: 0.1,
  far: 3000,
};
export function Exterior({
  place = "exterior",
  paused = false,
  cinematic = false,
}: {
  place?: Place;
  paused?: boolean;
  cinematic?: boolean;
}) {
  const high = new URLSearchParams(location.search).get("quality") === "high";
  runtime.quality = high ? "high" : "standard";
  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          window.dispatchEvent(
            new CustomEvent("world-error", {
              detail:
                "3D 显示连接已中断，资料仍保存在本地。可继续浏览资料或刷新恢复场景。",
            }),
          );
        });
      }}
      shadows
      dpr={
        new URLSearchParams(location.search).has("benchmark")
          ? 1
          : high
            ? 1.5
            : 1
      }
      camera={CAMERA_OPTIONS}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      }}
    >
      <Stage place={place} cinematic={cinematic} />
    </Canvas>
  );
}
