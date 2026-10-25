import type { PerspectiveCamera, WebGLRenderer } from "three";
export type Shot = "A" | "B";
export const runtime = {
  ready: false,
  progress: 0,
  moving: false,
  motion: false,
  quality: "standard" as "standard" | "high",
  requestedShot: null as Shot | null,
  moveTarget: null as number | null,
  camera: null as PerspectiveCamera | null,
  renderer: null as WebGLRenderer | null,
  frames: [] as { ms: number; calls: number; triangles: number; t: number }[],
  recording: false,
  captureRequested: false,
  captureURL: "",
  captureName: "",
  videoURL: "",
  videoMime: "",
  firstFrameMs: 0,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  loadingMs: 0,
  started: performance.now(),
  warmupAt: 0,
  errors: [] as string[],
  visibilityExclusions: 0,
  snapshot() {
    const a = this.frames;
    const times = a.map((f) => f.ms).sort((a, b) => a - b);
    const p = (q: number) =>
      times[Math.min(times.length - 1, Math.ceil(times.length * q) - 1)] ??
      null;
    const sum = a.reduce((s, f) => s + f.ms, 0);
    const gl = this.renderer;
    return {
      recordedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screen: { width: screen.width, height: screen.height, devicePixelRatio },
      viewport: { width: innerWidth, height: innerHeight },
      renderBuffer: gl
        ? {
            width: gl.domElement.width,
            height: gl.domElement.height,
            cssWidth: gl.domElement.clientWidth,
            cssHeight: gl.domElement.clientHeight,
          }
        : null,
      quality: this.quality,
      samples: a.length,
      durationSeconds: sum / 1000,
      averageFPS: sum ? (a.length * 1000) / sum : null,
      p50ms: p(0.5),
      p95ms: p(0.95),
      p99ms: p(0.99),
      maxCalls: a.length ? Math.max(...a.map((f) => f.calls)) : null,
      maxTriangles: a.length ? Math.max(...a.map((f) => f.triangles)) : null,
      assetPreparationMs: this.loadingMs,
      navigationToFirstFrameMs: this.firstFrameMs,
      firstSceneReadyMs: this.loadingMs,
      geometryCount: gl?.info.memory.geometries,
      textureCount: gl?.info.memory.textures,
      reducedMotion: this.reducedMotion,
      textureMemoryNote:
        "Counts are not bytes. See asset manifest for size estimates.",
      visibilityExclusions: this.visibilityExclusions,
      errors: [...this.errors],
      camera: this.camera
        ? {
            position: this.camera.position.toArray(),
            quaternion: this.camera.quaternion.toArray(),
            fov: this.camera.fov,
            near: this.camera.near,
            far: this.camera.far,
          }
        : null,
      resources: performance.getEntriesByType("resource").map((e) => {
        const r = e as PerformanceResourceTiming;
        return {
          url: r.name.replace(location.origin, ""),
          durationMs: r.duration,
          transferBytes: r.transferSize,
          encodedBytes: r.encodedBodySize,
          decodedBytes: r.decodedBodySize,
        };
      }),
      frames: a,
    };
  },
};
