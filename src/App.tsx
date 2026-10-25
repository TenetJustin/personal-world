import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  type Entry,
  type Kind,
  KINDS,
  LABELS,
  entryPath,
  parseRoute,
} from "./library/model";
import { readEntries, removeEntry, writeEntries } from "./library/storage";
import { loadPublishedContent } from "./library/publishing";
import { Library } from "./ui/Library";
import { ScreenBridge } from "./ui/ScreenBridge";
import { diagnosticSnapshot } from "./library/diagnostics";
import { runtime } from "./scene/runtime";
import { journey, ROUTE_ANCHORS } from "./scene/journey";
import { screenProjection } from "./scene/screenProjection";
import { appURL, assetURL } from "./site";
import "./style.css";
const World = lazy(() =>
  import("./scene/Exterior").then((m) => ({ default: m.Exterior })),
);
const Study = lazy(() => import("./ExteriorStudy"));
class WorldBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function App() {
  const initial = useRef(parseRoute(location.pathname));
  const [route, setRoute] = useState(initial.current),
    [desktop, setDesktop] = useState(!!initial.current.kind),
    [worldStarted, setWorldStarted] = useState(
      !initial.current.kind &&
        !new URLSearchParams(location.search).has("study"),
    );
  const state = useSyncExternalStore(journey.subscribe, journey.getSnapshot);
  const [entries, setEntries] = useState<Entry[]>([]),
    [published, setPublished] = useState<Entry[]>([]),
    [publishedLoading, setPublishedLoading] = useState(true),
    [publishedError, setPublishedError] = useState(""),
    [loading, setLoading] = useState(true),
    [storageError, setStorageError] = useState(""),
    [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false),
    [worldError, setWorldError] = useState(""),
    [transition, setTransition] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [minimized, setMinimized] = useState(false),
    [help, setHelp] = useState(false),
    [diagnosticURL, setDiagnosticURL] = useState(""),
    [sampling, setSampling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    sampleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => setEntries(await readEntries()), []);
  const boot = useCallback(async () => {
    setLoading(true);
    setStorageError("");
    try {
      await refresh();
    } catch (e) {
      setStorageError(
        "无法打开本地资料库：" +
          (e instanceof Error ? e.message : String(e)) +
          "。请允许浏览器存储并重试。公开内容仍可阅读。",
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  const loadPublic = useCallback(async () => {
    setPublishedLoading(true);
    setPublishedError("");
    try {
      setPublished(await loadPublishedContent());
    } catch (e) {
      setPublishedError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishedLoading(false);
    }
  }, []);
  useEffect(() => {
    void boot();
    void loadPublic();
  }, [boot, loadPublic]);
  const sync = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("personal-world-library");
    sync.current = channel;
    channel.onmessage = () =>
      void refresh().catch(() =>
        setStorageError("读取其他标签页更新失败，请重试"),
      );
    return () => {
      sync.current = null;
      channel.close();
    };
  }, [refresh]);
  const save = async (incoming: Entry[]) => {
    await writeEntries(incoming);
    await refresh();
    sync.current?.postMessage("changed");
  };
  const remove = async (id: string) => {
    await removeEntry(id);
    await refresh();
    sync.current?.postMessage("changed");
  };
  const navigate = useCallback((kind: Kind, id: string | null = null) => {
    journey.interact();
    history.pushState({}, "", entryPath(kind, id));
    setRoute({ kind, id });
    setDesktop(true);
    setMinimized(false);
  }, []);
  useEffect(() => {
    if (state.phase === "DESKTOP") {
      setDesktop(true);
      if (!parseRoute(location.pathname).kind) {
        history.pushState({}, "", entryPath("notes"));
        setRoute({ kind: "notes", id: null });
      }
    }
  }, [state.phase]);
  useEffect(() => {
    const pop = () => {
      const next = parseRoute(location.pathname);
      setRoute(next);
      if (next.kind) {
        journey.interact();
        setDesktop(true);
      } else {
        setDesktop(false);
        if (journey.phase === "DESKTOP") journey.exitDesktop();
      }
      setMinimized(false);
    };
    const visibility = () => setHidden(document.hidden);
    const failed = (e: Event) =>
      setWorldError(String((e as CustomEvent).detail || "3D 暂不可用"));
    const loaded = () => setReady(true);
    window.addEventListener("popstate", pop);
    window.addEventListener("world-error", failed);
    window.addEventListener("world-ready", loaded);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("world-error", failed);
      window.removeEventListener("world-ready", loaded);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    journey.setBlocked(
      help || hidden || !!worldError || (!ready && worldStarted) || desktop,
    );
  }, [help, hidden, worldError, ready, worldStarted, desktop]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      journey.setReducedMotion(media.matches);
      runtime.reducedMotion = media.matches;
      runtime.motion = !media.matches;
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    document.title =
      desktop && route.kind
        ? LABELS[route.kind] + " · Personal World"
        : "Personal World · 湖畔木屋";
  }, [desktop, route.kind]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (sampleTimer.current) clearTimeout(sampleTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!worldStarted || desktop || help) return;
    let drag: { id: number; x: number; y: number } | null = null,
      last: { x: number; y: number } | null = null;
    const locked = () =>
      ["ENTERING_DESKTOP", "EXITING_DESKTOP", "DESKTOP"].includes(
        journey.phase,
      );
    const down = (e: PointerEvent) => {
      if (!e.isTrusted || locked()) return;
      journey.interact();
      if (e.target instanceof HTMLCanvasElement) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        e.target.setPointerCapture(e.pointerId);
      }
    };
    const move = (e: PointerEvent) => {
      if (!e.isTrusted || locked()) return;
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x,
          dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.6) journey.look(dx, dy);
        drag.x = e.clientX;
        drag.y = e.clientY;
      } else if (e.target instanceof Element) {
        if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) >= 6) {
          journey.interact();
          last = { x: e.clientX, y: e.clientY };
        } else if (!last) last = { x: e.clientX, y: e.clientY };
      }
    };
    const up = () => {
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (
        e.isTrusted &&
        !locked() &&
        Math.abs(e.deltaY) + Math.abs(e.deltaX) > 2
      )
        journey.interact();
    };
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Escape") {
        if (journey.phase === "ENTERING_DESKTOP") journey.cancelDock();
        else journey.interact();
        return;
      }
      if (locked()) return;
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        journey.look(
          e.key === "ArrowLeft" ? -13 : e.key === "ArrowRight" ? 13 : 0,
          e.key === "ArrowUp" ? -13 : e.key === "ArrowDown" ? 13 : 0,
        );
      } else if (e.key === "Enter" && journey.phase === "DESK_READY")
        journey.requestDesktop();
      else if (e.key === " ") {
        e.preventDefault();
        if (journey.getSnapshot().moving) journey.interact();
        else journey.startGuide();
      } else if (e.isTrusted) journey.interact();
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", key);
    };
  }, [worldStarted, desktop, help]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null,
      dialog = document.querySelector<HTMLElement>(".help-dialog");
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const all = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,textarea",
        ),
      ).filter((el) => el.offsetParent !== null);
      if (e.shiftKey && document.activeElement === all[0]) {
        e.preventDefault();
        all.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
        e.preventDefault();
        all[0]?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [help]);
  const makeDiagnostic = () =>
    setDiagnosticURL(
      "data:application/json;charset=utf-8," +
        encodeURIComponent(
          JSON.stringify(
            {
              ...diagnosticSnapshot(),
              journey: journey.exportState(),
              screenProjection,
            },
            null,
            2,
          ),
        ),
    );
  const sampleWorld = () => {
    runtime.frames = [];
    runtime.recording = true;
    runtime.warmupAt = performance.now() + 2000;
    setSampling(true);
    setHelp(false);
    sampleTimer.current = setTimeout(() => {
      runtime.recording = false;
      setSampling(false);
      makeDiagnostic();
      setHelp(true);
    }, 17000);
  };
  const go = (destination: "lake" | "room" | "desk") => {
    if (state.reducedMotion) {
      setTransition(true);
      timer.current = setTimeout(() => {
        journey.navigate(destination);
        timer.current = setTimeout(() => setTransition(false), 200);
      }, 160);
    } else journey.navigate(destination);
  };
  const returnWorld = () => {
    if (!worldStarted) {
      runtime.started = performance.now();
      journey.spawnAtDesk();
      setWorldStarted(true);
    } else if (journey.phase === "DESKTOP") journey.exitDesktop();
    history.pushState({}, "", appURL());
    setDesktop(false);
    setMinimized(false);
  };
  const activeKind = route.kind ?? "notes",
    bridging = ["ENTERING_DESKTOP", "EXITING_DESKTOP"].includes(state.phase);
  if (new URLSearchParams(location.search).has("study"))
    return (
      <Suspense fallback={<p>正在打开外景研究工具…</p>}>
        <Study />
      </Suspense>
    );
  return (
    <main
      className={"experience " + (desktop ? "desktop-mode" : "world-mode")}
      data-journey-phase={state.phase}
    >
      <a
        className="skip-link"
        href={entryPath("notes")}
        onClick={(e) => {
          e.preventDefault();
          navigate("notes");
        }}
      >
        跳过 3D，直接浏览资料
      </a>
      {worldStarted && (
        <div
          className="world-canvas"
          style={{ visibility: desktop ? "hidden" : "visible" }}
          aria-hidden={desktop || !!worldError}
        >
          <WorldBoundary
            onError={() =>
              setWorldError("浏览器无法启动 3D，仍可直接使用资料库。")
            }
          >
            <Suspense fallback={null}>
              <World cinematic paused={desktop || hidden || !!worldError} />
            </Suspense>
          </WorldBoundary>
        </div>
      )}
      <div
        className={"scene-curtain " + (transition ? "cover" : "")}
        aria-hidden="true"
      />
      {!desktop && !bridging && (
        <>
          <header className="world-header">
            <a
              href={appURL()}
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                go("lake");
              }}
            >
              PERSONAL WORLD<small>A LAKESIDE PLACE FOR YOUR STORIES</small>
            </a>
            <button
              className="glass-button"
              onClick={() => navigate(activeKind, route.id)}
            >
              资料入口 · 跳过体验 ↗
            </button>
          </header>
          {!ready && !worldError && (
            <div className="scene-loading" role="status">
              正在准备湖岸与木屋…
              <br />
              <small>内容入口始终可用。场景就绪后才开始五秒等待。</small>
            </div>
          )}
          {worldError && (
            <div className="world-failure" role="alert">
              <h2>3D 暂不可用</h2>
              <p>
                三维场景未能加载。可以继续浏览资料，或检查网络和浏览器图形支持后重试。
              </p>
              <button onClick={() => navigate("notes")}>继续浏览资料</button>
              <button onClick={() => location.reload()}>重试场景</button>
            </div>
          )}
          <section className="journey-caption" aria-live="polite">
            <p className="eyebrow">
              FIRST PERSON /{" "}
              {state.phase === "DESK_READY"
                ? "ARRIVAL"
                : journey.distance >= ROUTE_ANCHORS.porch
                  ? "THRESHOLD"
                  : "THE LAKESHORE"}
            </p>
            <h1>
              {state.phase === "DESK_READY"
                ? "A place for your stories."
                : journey.distance >= ROUTE_ANCHORS.room
                  ? "Make yourself at home."
                  : "Take your time."}
            </h1>
            <p>
              {state.idleSeconds
                ? state.idleSeconds + " 秒无操作后，为你引路。"
                : state.label}
            </p>
          </section>
          <nav className="journey-controls" aria-label="第一人称导航">
            {state.moving ? (
              <button
                className="glass-button"
                onClick={() => journey.interact()}
              >
                暂停引导 · Esc
              </button>
            ) : (
              state.phase !== "DESK_READY" && (
                <button
                  className="light-button"
                  disabled={!ready}
                  onClick={() => {
                    if (
                      state.reducedMotion ||
                      journey.distance >= ROUTE_ANCHORS.room - 0.05
                    )
                      go("desk");
                    else journey.startGuide();
                  }}
                >
                  {journey.distance >= ROUTE_ANCHORS.room - 0.05
                    ? "前往书桌"
                    : "继续前往木屋"}{" "}
                  →
                </button>
              )
            )}
            {state.phase === "DESK_READY" && (
              <button
                className="light-button"
                onClick={() => journey.requestDesktop()}
              >
                点击 Mac，打开电脑 ↗
              </button>
            )}
            <button
              className="glass-button"
              disabled={!ready}
              onClick={() => go("lake")}
            >
              返回湖岸
            </button>
            {journey.distance >= ROUTE_ANCHORS.room &&
              state.phase !== "DESK_READY" && (
                <button className="glass-button" onClick={() => go("desk")}>
                  返回书桌
                </button>
              )}
            <button className="glass-button" onClick={() => navigate("notes")}>
              跳过引导
            </button>
          </nav>
          <div className="world-bottom">
            <span>拖动环视 · 方向键环视 · 点击目标步行</span>
            <div>
              <button
                className="quiet-button"
                aria-pressed={state.reducedMotion}
                onClick={() => {
                  journey.setReducedMotion(!state.reducedMotion);
                  runtime.reducedMotion = journey.reducedMotion;
                  runtime.motion = !journey.reducedMotion;
                }}
              >
                减少动态：{state.reducedMotion ? "开启" : "关闭"}
              </button>
              <button className="quiet-button" onClick={() => setHelp(true)}>
                使用与发布说明
              </button>
              <a
                className="quiet-button"
                href={assetURL("licenses/dependencies.json")}
                target="_blank"
                rel="noreferrer"
              >
                资产与许可
              </a>
            </div>
          </div>
          {sampling && (
            <div className="sampling-status" role="status">
              正在采样真实 3D 帧时间…
            </div>
          )}
        </>
      )}
      {publishedError && desktop && (
        <p className="published-error" role="alert">
          {publishedError}
          <button onClick={() => void loadPublic()}>重试公开内容</button>
        </p>
      )}
      <ScreenBridge active={desktop || bridging} full={desktop}>
        <div className="desktop">
          <header className="desktop-menubar">
            <div className="desktop-wordmark">
              ◈ <strong>Personal World</strong>
              <span>发布与本地草稿</span>
            </div>
            <span className="local-indicator">● 本地草稿 / 已发布只读</span>
            <button onClick={() => setHelp(true)}>使用说明</button>
            <button onClick={returnWorld}>返回木屋 ↗</button>
          </header>
          <nav className="desktop-sidebar" aria-label="资料应用">
            <p className="eyebrow">MY LIBRARY</p>
            {KINDS.map((kind, index) => (
              <a
                href={entryPath(kind)}
                key={kind}
                className={activeKind === kind ? "active" : ""}
                aria-current={activeKind === kind ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(kind);
                }}
              >
                <span className={`app-icon icon-${kind}`}>
                  {["≡", "▧", "↗", "◎"][index]}
                </span>
                <span>{LABELS[kind]}</span>
                <small>
                  {published.filter((e) => e.kind === kind).length} /{" "}
                  {
                    entries.filter((e) => e.kind === kind && !e.deletedAt)
                      .length
                  }
                </small>
              </a>
            ))}
            <div className="sidebar-bottom">
              <span className="eyebrow">YOUR OWN LITTLE ARCHIVE</span>
              <p>
                {published.length} 项已发布 /{" "}
                {entries.filter((e) => !e.deletedAt).length} 项草稿
                <br />
                本地草稿不会自动公开
              </p>
              <button onClick={() => setHelp(true)}>如何添加与备份 ↗</button>
            </div>
          </nav>
          <div className="desktop-window" hidden={minimized}>
            <div className="window-titlebar">
              <div className="window-controls">
                <button
                  aria-label="关闭资料窗口"
                  title="关闭窗口，内容保留"
                  onClick={() => setMinimized(true)}
                >
                  ×
                </button>
                <button
                  aria-label="最小化资料窗口"
                  title="最小化"
                  onClick={() => setMinimized(true)}
                >
                  −
                </button>
              </div>
              <span>
                {LABELS[activeKind]} <small>— Personal World</small>
              </span>
              <span className="window-meta">
                {dirty ? "● 未保存" : "LOCAL LIBRARY"}
              </span>
            </div>
            {storageError && (
              <div className="storage-error" role="alert">
                {storageError}
                <button onClick={() => void boot()}>重试打开资料库</button>
              </div>
            )}
            <Library
              kind={activeKind}
              selected={route.id}
              entries={entries}
              published={published}
              loading={loading}
              publishedLoading={publishedLoading}
              error={storageError}
              onSelect={(id) => navigate(activeKind, id)}
              onSave={save}
              onDelete={remove}
              onRestore={save}
              onDirty={setDirty}
            />
          </div>
          {minimized && (
            <section className="desktop-rest">
              <p className="eyebrow">A LITTLE ROOM FOR YOUR LIFE</p>
              <h1>
                All your stories,
                <br />
                <em>in one quiet place.</em>
              </h1>
              <button className="accent" onClick={() => setMinimized(false)}>
                恢复 {LABELS[activeKind]} 窗口
              </button>
            </section>
          )}
          <nav className="dock" aria-label="桌面 Dock">
            {KINDS.map((kind, i) => (
              <button
                key={kind}
                aria-label={`打开 ${LABELS[kind]}`}
                className={activeKind === kind && !minimized ? "running" : ""}
                onClick={() => navigate(kind)}
              >
                <span className={`app-icon icon-${kind}`}>
                  {["≡", "▧", "↗", "◎"][i]}
                </span>
                <small>{LABELS[kind]}</small>
              </button>
            ))}
          </nav>
        </div>
      </ScreenBridge>
      {help && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="help-dialog"
          >
            <button
              className="dialog-close"
              aria-label="关闭使用说明"
              onClick={() => setHelp(false)}
            >
              ×
            </button>
            <p className="eyebrow">GETTING STARTED</p>
            <h1 id="help-title">把真实生活放进来。</h1>
            <ol>
              <li>
                <strong>Notes</strong>：新建笔记，或批量导入 Markdown / TXT。
              </li>
              <li>
                <strong>Photos</strong>：导入
                JPEG、PNG、WebP、GIF，编辑标题和说明。
              </li>
              <li>
                <strong>Projects</strong>：填写项目介绍、标签与网址。
              </li>
              <li>
                <strong>Resume</strong>：编写履历，或导入 Markdown / TXT / PDF。
              </li>
            </ol>
            <p>
              编辑后点击「保存修改」。切换应用与返回木屋会保留草稿；刷新前会提示未保存修改。
            </p>
            <p>
              「导出全部备份」包含四个应用与附件原文件；在新浏览器用「恢复备份」合并恢复。请定期把备份保存在浏览器之外。
            </p>
            <p>
              本地资料与当前浏览器、网站地址和端口绑定。请固定使用{" "}
              <strong>{location.origin}</strong>
              。本地编辑默认是草稿，不会自动公开。明确选择并审核后导出公开内容包，提交构建才能更新网站；完整备份不要用于公开发布。
            </p>
            <p className="quiet">
              第一人称引导可随时拖动、按键或滚动接管；方向键环视，Esc
              暂停。减少动态模式不会自动播放完整步行路线。精细美术仍待后续。
            </p>
            <div className="diagnostic-actions">
              <button onClick={makeDiagnostic}>生成本地诊断</button>
              {!desktop && ready && !sampling && (
                <button onClick={sampleWorld}>采样 3D 性能（17s）</button>
              )}
              {diagnosticURL && (
                <a
                  href={diagnosticURL}
                  download="personal-world-diagnostics.json"
                >
                  下载本地诊断 JSON
                </a>
              )}
            </div>
            <button className="accent" onClick={() => setHelp(false)}>
              开始使用
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
