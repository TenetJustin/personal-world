import { useEffect, useRef, useState } from "react";
import { journey } from "../scene/journey";
import { cabinToWorld, worldToCabin } from "../scene/architecture";
import { runtime } from "../scene/runtime";
import { diagnosticSnapshot } from "../library/diagnostics";
import { screenProjection } from "../scene/screenProjection";
import { ambience } from "../audio/ambience";
const SHOTS = {
  lake: { from: [6, 2.42, 43], to: [-30, 6, -10], world: true },
  room: { from: [-0.5, 3.02, 1.9], to: [3.2, 2.7, -2.2] },
  upper: { from: [-4.875, 5.9, 0.95], to: [-1.2, 4.75, -2.6] },
  stairs: { from: [-4.875, 3.02, -3.95], to: [-4.875, 3.02, -1.5] },
  mac45: { from: [-4.02, 2.42, 2.53], to: [-3.6, 2.2, 3.02] },
  keyboard: { from: [-3.62, 2.34, 2.72], to: [-3.6, 2.15, 3.0] },
  screen: { from: [-3.6, 2.245, 2.52], to: [-3.6, 2.234, 3.1] },
  record: { from: [-3.75, 2.55, 1.2], to: [-5, 2.3, 1.73] },
} as const;
export function SceneQA() {
  const [open, setOpen] = useState(false),
    [state, setState] = useState(""),
    [result, setResult] = useState(""),
    [busy, setBusy] = useState(false),
    [video, setVideo] = useState(""),
    [modelURL, setModelURL] = useState(""),
    [audioURL, setAudioURL] = useState(""),
    [audioBusy, setAudioBusy] = useState(false);
  const record = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(
      () =>
        setState(
          JSON.stringify({
            phase: journey.phase,
            label: journey.label,
            local: worldToCabin(journey.position.toArray()),
            moving: journey.getSnapshot().moving,
            collision: journey.walker.lastCollision,
            sound: ambience.snapshot(),
            screenCornerError: screenProjection.maxCornerErrorPixels,
          }),
        ),
      250,
    );
    return () => clearInterval(t);
  }, [open]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      runtime.recording = false;
      if (record.current?.state === "recording") record.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const inspect = (key: keyof typeof SHOTS) => {
    journey.interact();
    journey.clearMovement();
    const s = SHOTS[key];
    const world = "world" in s;
    const from = world ? [...s.from] : cabinToWorld(s.from),
      to = world ? [...s.to] : cabinToWorld(s.to);
    journey.setPose(from, to);
    journey.fov = 52;
  };
  const sample = () => {
    runtime.frames = [];
    runtime.recording = true;
    runtime.warmupAt = performance.now() + 2000;
    setBusy(true);
    timer.current = setTimeout(() => {
      runtime.recording = false;
      const data = diagnosticSnapshot();
      setResult(
        JSON.stringify({
          ...data,
          journey: journey.exportState(),
          audio: ambience.snapshot(),
        }),
      );
      setBusy(false);
    }, 17000);
  };
  const exportModel = async () => {
    const object = runtime.scene?.getObjectByName("INTERACTION_LAPTOP");
    if (!object) return;
    const { GLTFExporter } = await import(
      "three/addons/exporters/GLTFExporter.js"
    );
    const model = await new GLTFExporter().parseAsync(object, { binary: true });
    if (model instanceof ArrayBuffer)
      setModelURL((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(
          new Blob([model], { type: "model/gltf-binary" }),
        );
      });
  };
  const startRecord = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    try {
      const capture = canvas.captureStream(30);
      stream.current = capture;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const r = new MediaRecorder(capture, {
          mimeType: mime,
          videoBitsPerSecond: 6000000,
        }),
        chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        setVideo((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(new Blob(chunks, { type: r.mimeType }));
        });
        setRecording(false);
        capture.getTracks().forEach((t) => t.stop());
      };
      r.start(1000);
      record.current = r;
      setRecording(true);
    } catch (e) {
      setState(String(e));
    }
  };
  return (
    <aside className="scene-qa">
      <button
        className="glass-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        场景验收工具
      </button>
      {open && (
        <div className="scene-qa-panel">
          <strong>固定检查镜头（仅验收时定位）</strong>
          <div>
            {(Object.keys(SHOTS) as (keyof typeof SHOTS)[]).map((k) => (
              <button key={k} onClick={() => inspect(k)}>
                {k}
              </button>
            ))}
            <button
              onClick={() => {
                journey.interact();
                journey.spawnAtDesk();
              }}
            >
              desk
            </button>
            <button onClick={() => journey.navigate("desk")}>
              实际导航到书桌
            </button>
            <button onClick={() => journey.navigate("lake")}>
              实际导航到湖岸
            </button>
            <button onClick={() => journey.startGuide()}>启动完整引导</button>
          </div>
          <button disabled={busy || !runtime.ready} onClick={sample}>
            {busy ? "采样中（2s预热+15s）" : "采样当前视角 17s"}
          </button>
          <button
            onClick={() => (recording ? record.current?.stop() : startRecord())}
          >
            {recording ? "停止场景录屏" : "录制实际 WebGL 画面"}
          </button>
          {video && (
            <a href={video} download="personal-world-scene.webm">
              下载场景实录
            </a>
          )}
          <button
            onClick={() =>
              void exportModel().catch((error) => setState(String(error)))
            }
          >
            导出原创 MacBook GLB
          </button>
          {modelURL && (
            <a href={modelURL} download="macbook-air-m5-v3.glb">
              下载模型源文件
            </a>
          )}
          <button
            disabled={audioBusy}
            onClick={() => {
              setAudioBusy(true);
              void ambience
                .recordSample()
                .then((blob) =>
                  setAudioURL((previous) => {
                    if (previous) URL.revokeObjectURL(previous);
                    return URL.createObjectURL(blob);
                  }),
                )
                .catch((error) => setState(String(error)))
                .finally(() => setAudioBusy(false));
            }}
          >
            {audioBusy ? "录制声音中（6s）" : "记录当前环境音 6s"}
          </button>
          {audioURL && (
            <a href={audioURL} download="personal-world-ambience.webm">
              下载环境音样本
            </a>
          )}
          <pre data-qa-state>{state}</pre>
          {result && (
            <>
              <a
                data-qa-report
                href={
                  "data:application/json;charset=utf-8," +
                  encodeURIComponent(result)
                }
                download="personal-world-verification.json"
              >
                下载性能与场景报告
              </a>
              <p data-qa-summary>
                {(() => {
                  const d = JSON.parse(result).world;
                  return JSON.stringify({
                    fps: d.averageFPS,
                    p95: d.p95ms,
                    calls: d.maxCalls,
                    triangles: d.maxTriangles,
                    samples: d.samples,
                  });
                })()}
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
