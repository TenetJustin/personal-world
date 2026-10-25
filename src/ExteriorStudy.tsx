import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Exterior } from "./scene/Exterior";
import { runtime } from "./scene/runtime";
import "./study.css";
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <div className="fallback">
        <h1>场景未能加载</h1>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>重新加载</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function ExteriorStudy() {
  const [tick, setTick] = useState(0),
    [tools, setTools] = useState(false),
    [error, setError] = useState(""),
    [capture, setCapture] = useState(""),
    [video, setVideo] = useState(""),
    [filming, setFilming] = useState(false),
    [report, setReport] = useState(""),
    [cameraReport, setCameraReport] = useState("");
  const [sampleEnd, setSampleEnd] = useState(0);
  const filmSession = useRef<{
    recorder: MediaRecorder;
    stream: MediaStream;
    timers: number[];
  } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 400);
    const failed = (e: Event) => setError((e as CustomEvent).detail);
    const captured = () => setCapture(runtime.captureURL);
    const onError = (e: ErrorEvent) => runtime.errors.push(e.message);
    window.addEventListener("world-error", failed);
    window.addEventListener("capture-ready", captured);
    window.addEventListener("error", onError);
    return () => {
      mounted.current = false;
      runtime.recording = false;
      const session = filmSession.current;
      session?.timers.forEach(clearTimeout);
      if (session?.recorder.state === "recording") session.recorder.stop();
      session?.stream.getTracks().forEach((track) => track.stop());
      if (runtime.videoURL) URL.revokeObjectURL(runtime.videoURL);
      clearInterval(t);
      window.removeEventListener("world-error", failed);
      window.removeEventListener("capture-ready", captured);
      window.removeEventListener("error", onError);
    };
  }, []);
  useEffect(() => {
    if (sampleEnd && performance.now() >= sampleEnd) {
      runtime.recording = false;
      setSampleEnd(0);
    }
  }, [tick, sampleEnd]);
  const sample = () => {
    runtime.frames = [];
    runtime.recording = true;
    runtime.warmupAt = performance.now() + 10000;
    setSampleEnd(runtime.warmupAt + 60000);
  };
  const film = () => {
    const canvas = runtime.renderer?.domElement;
    if (!canvas) return;
    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setError("此浏览器不支持画布录屏，请使用桌面 Chromium。");
      return;
    }
    runtime.inspectionShot = null;
    runtime.requestedShot = "A";
    runtime.motion = true;
    setFilming(true);
    const stream = canvas.captureStream(30);
    const mime = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(
      stream,
      mime ? { mimeType: mime, videoBitsPerSecond: 10000000 } : undefined,
    );
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      if (!mounted.current) return;
      if (runtime.videoURL) URL.revokeObjectURL(runtime.videoURL);
      const blob = new Blob(chunks, { type: rec.mimeType });
      const url = URL.createObjectURL(blob);
      runtime.videoURL = url;
      runtime.videoMime = rec.mimeType;
      const reader = new FileReader();
      reader.onload = () => {
        if (mounted.current) setVideo(String(reader.result));
      };
      reader.readAsDataURL(blob);
      setFilming(false);
    };
    const start = window.setTimeout(() => {
      rec.start(1000);
      runtime.moveTarget = 1;
    }, 500);
    const stop = window.setTimeout(() => {
      if (rec.state === "recording") rec.stop();
    }, 15000);
    filmSession.current = { recorder: rec, stream, timers: [start, stop] };
  };
  const ready = runtime.ready;
  const shot = runtime.progress < 0.5 ? "S01" : "S02";
  return (
    <main>
      <div className="stage">
        <Boundary>
          <Exterior />
        </Boundary>
      </div>
      <header>
        <a href="/" className="wordmark">
          NORDIC RETREAT<span>ARCHITECTURAL STUDY · 01B</span>
        </a>
        <div className="chapter">A PRIVATE WORLD, IN PROGRESS</div>
        <button
          className="tool-toggle"
          onClick={() => setTools((v) => !v)}
          aria-expanded={tools}
        >
          验收工具
        </button>
      </header>
      {ready && error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      {!ready ? (
        <div className="loader" role="status">
          <span className="loading-dot" />
          <p>
            {error ? "资源加载遇到问题" : "正在准备湖岸的光与细节"}
            {error ? (
              <small>{error}</small>
            ) : (
              <small>首次访问需加载真实三维资产</small>
            )}
          </p>
          {error ? (
            <button onClick={() => location.reload()}>重试</button>
          ) : null}
        </div>
      ) : null}
      <footer>
        <div className="caption">
          <span>
            {shot} / {runtime.progress < 0.5 ? "THE LAKESHORE" : "THE CABIN"}
          </span>
          <h1>
            {runtime.progress < 0.5
              ? "A quieter kind of place."
              : "A little closer to home."}
          </h1>
          <p>北欧湖岸 · 午后外立面研究</p>
        </div>
        <nav aria-label="场景镜头">
          <button
            disabled={!ready || filming}
            onClick={() => {
              runtime.inspectionShot = null;
              runtime.requestedShot = "A";
            }}
          >
            湖岸 A
          </button>
          <button
            disabled={!ready || filming}
            onClick={() => {
              runtime.inspectionShot = null;
              runtime.requestedShot = "B";
            }}
          >
            木屋 B
          </button>
          <button
            className="primary"
            disabled={!ready || filming}
            onClick={() => {
              runtime.inspectionShot = null;
              runtime.motion = !runtime.reducedMotion;
              runtime.moveTarget = runtime.progress > 0.9 ? 0 : 1;
            }}
          >
            {runtime.moving
              ? "镜头移动中"
              : runtime.progress > 0.9
                ? "返回湖岸"
                : "走近木屋"}
            <span>↗</span>
          </button>
        </nav>
      </footer>
      {tools ? (
        <aside className="tools">
          <h2>Phase 01B · 证据工具</h2>
          <p>
            视觉状态：等待人工验收。性能与画质分开判断。
            {runtime.reducedMotion
              ? "系统已启用减少动态，镜头立即切换。"
              : "移动约 12 秒；Esc 可随时停止。"}
          </p>
          <div className="grid">
            <button
              disabled={!ready || runtime.recording}
              onClick={() => {
                runtime.captureRequested = true;
              }}
            >
              保存当前浏览器画面
            </button>
            <button
              disabled={!ready}
              onClick={() => {
                runtime.motion = !runtime.motion;
              }}
            >
              微动态：{runtime.motion ? "开启" : "冻结"}
            </button>
            <button
              disabled={!ready || !!sampleEnd || filming}
              onClick={sample}
            >
              {sampleEnd
                ? `采样中 ${Math.max(0, Math.ceil((sampleEnd - performance.now()) / 1000))}s`
                : "预热 10s + 采样 60s"}
            </button>
            <button
              onClick={() => {
                runtime.recording = false;
                setSampleEnd(0);
              }}
            >
              停止采样
            </button>
            <button
              onClick={() =>
                setReport(
                  "data:application/json;charset=utf-8," +
                    encodeURIComponent(
                      JSON.stringify(runtime.snapshot(), null, 2),
                    ),
                )
              }
            >
              下载性能 JSON
            </button>
            <button disabled={!ready || filming || !!sampleEnd} onClick={film}>
              {filming ? "录制实际帧…" : "录制 A → B（15s）"}
            </button>
            <button
              onClick={() =>
                setCameraReport(
                  "data:application/json;charset=utf-8," +
                    encodeURIComponent(
                      JSON.stringify(runtime.snapshot().camera, null, 2),
                    ),
                )
              }
            >
              导出固定相机参数
            </button>
          </div>
          <div className="grid">
            {(["C", "D", "E"] as const).map((id) => (
              <button
                key={id}
                disabled={!ready || filming}
                onClick={() => {
                  runtime.moving = false;
                  runtime.inspectionShot = id;
                }}
              >
                建筑角度 {id}
              </button>
            ))}
          </div>
          <pre id="measurements">
            {JSON.stringify(
              {
                ...runtime.snapshot(),
                resources: undefined,
                frames: undefined,
              },
              null,
              2,
            )}
          </pre>
          {report ? (
            <a id="performance-link" href={report} download="performance.json">
              保存性能原始记录
            </a>
          ) : null}
          {cameraReport ? (
            <a id="camera-link" href={cameraReport} download="camera.json">
              保存固定镜头参数
            </a>
          ) : null}
          {capture ? (
            <a id="capture-link" href={capture} download={runtime.captureName}>
              下载 {runtime.captureName}
            </a>
          ) : null}
          {video ? (
            <a
              id="recording-link"
              href={video}
              download="S01-to-S02-actual.webm"
            >
              下载实际录屏
            </a>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}
