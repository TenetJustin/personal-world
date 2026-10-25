import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
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
import { Library } from "./ui/Library";
import { diagnosticSnapshot } from "./library/diagnostics";
import { runtime } from "./scene/runtime";
import "./style.css";
const World = lazy(() =>
  import("./scene/Exterior").then((m) => ({ default: m.Exterior })),
);
const Study = lazy(() => import("./ExteriorStudy"));
type Place = "exterior" | "interior" | "desk";
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
    [worldStarted, setWorldStarted] = useState(false),
    [place, setPlace] = useState<Place>("exterior");
  const [entries, setEntries] = useState<Entry[]>([]),
    [loading, setLoading] = useState(true),
    [storageError, setStorageError] = useState(""),
    [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false),
    [worldError, setWorldError] = useState(""),
    [transition, setTransition] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [minimized, setMinimized] = useState(false),
    [help, setHelp] = useState(false);
  const [diagnosticURL, setDiagnosticURL] = useState("");
  const [sampling, setSampling] = useState(false);
  const sampleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => setEntries(await readEntries()), []);
  const boot = useCallback(async () => {
    setLoading(true);
    setStorageError("");
    try {
      await refresh();
    } catch (e) {
      setStorageError(
        `无法打开本地资料库：${e instanceof Error ? e.message : String(e)}。请允许浏览器存储并重试；已有资料不会被覆盖。`,
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);
  useEffect(() => {
    void boot();
  }, [boot]);
  const sync = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("personal-world-library");
    sync.current = channel;
    channel.onmessage = () => {
      void refresh().catch(() =>
        setStorageError("其他标签页修改后重新读取失败，请重试"),
      );
    };
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
    history.pushState({}, "", entryPath(kind, id));
    setRoute({ kind, id });
    setDesktop(true);
    setMinimized(false);
  }, []);
  useEffect(() => {
    const pop = () => {
      const next = parseRoute(location.pathname);
      setRoute(next);
      setDesktop(!!next.kind);
      setMinimized(false);
    };
    const visibility = () => setHidden(document.hidden);
    const failed = (event: Event) =>
      setWorldError(String((event as CustomEvent).detail || "3D 暂不可用"));
    window.addEventListener("popstate", pop);
    window.addEventListener("world-error", failed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("world-error", failed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const loaded = () => setReady(true);
    window.addEventListener("world-ready", loaded);
    return () => window.removeEventListener("world-ready", loaded);
  }, []);
  useEffect(() => {
    document.title =
      desktop && route.kind
        ? `${LABELS[route.kind]} · Personal World`
        : "Personal World · 私人湖畔";
  }, [route.kind, desktop]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
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
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".help-dialog");
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,textarea",
        ),
      ).filter((el) => el.offsetParent !== null);
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
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
        encodeURIComponent(JSON.stringify(diagnosticSnapshot(), null, 2)),
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
  const goPlace = (next: Place) => {
    if (timer.current) clearTimeout(timer.current);
    if (runtime.reducedMotion) {
      setPlace(next);
      return;
    }
    setTransition(true);
    timer.current = setTimeout(() => {
      setPlace(next);
      timer.current = setTimeout(() => setTransition(false), 220);
    }, 180);
  };
  const returnWorld = () => {
    if (!worldStarted) {
      runtime.started = performance.now();
      setWorldStarted(true);
      setPlace("interior");
    }
    history.pushState({}, "", "/");
    setDesktop(false);
    setMinimized(false);
  };
  const beginWorld = () => {
    runtime.started = performance.now();
    setWorldStarted(true);
    setPlace("exterior");
  };
  const activeKind = route.kind ?? "notes";
  if (new URLSearchParams(location.search).has("study"))
    return (
      <Suspense fallback={<p>正在打开外景研究工具…</p>}>
        <Study />
      </Suspense>
    );
  return (
    <main className={`experience ${desktop ? "desktop-mode" : "world-mode"}`}>
      <a
        className="skip-link"
        href="/notes/"
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
          hidden={desktop || !!worldError}
          aria-hidden={desktop || !!worldError}
        >
          <WorldBoundary
            onError={() =>
              setWorldError("浏览器无法启动 3D，仍可直接使用资料库。")
            }
          >
            <Suspense fallback={null}>
              <World place={place} paused={desktop || hidden || !!worldError} />
            </Suspense>
          </WorldBoundary>
        </div>
      )}
      <div
        className={`scene-curtain ${transition ? "cover" : ""}`}
        aria-hidden="true"
      />
      {!desktop && (
        <>
          <header className="world-header">
            <a
              href="/"
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                setPlace("exterior");
              }}
            >
              PERSONAL WORLD<small>A PRIVATE PLACE TO RETURN TO</small>
            </a>
            <button
              className="glass-button"
              onClick={() => navigate(activeKind, route.id)}
            >
              打开资料库 ↗
            </button>
          </header>
          {!worldStarted ? (
            <section className="welcome">
              <p className="eyebrow">YOUR LAKESIDE, YOUR STORIES</p>
              <h1>
                A quieter place.
                <br />
                <em>A world of your own.</em>
              </h1>
              <p className="intro">
                从湖岸走进木屋，或直接打开你的私人资料库。
                <br />
                想法、照片、作品与经历，在这里慢慢积累。
              </p>
              <div className="welcome-actions">
                <button
                  className="light-button"
                  onClick={() => navigate("notes")}
                >
                  打开我的资料库 <span>↗</span>
                </button>
                <button className="glass-button" onClick={beginWorld}>
                  从湖岸进入
                </button>
              </div>
              <p className="welcome-note">仅本地保存 · 无需账户 · 随时备份</p>
            </section>
          ) : (
            <>
              {!ready && !worldError && (
                <div className="scene-loading" role="status">
                  正在准备湖岸场景…
                  <br />
                  <small>首次需加载真实 3D 资产。可随时直接打开资料库。</small>
                </div>
              )}
              {worldError && (
                <div className="world-failure" role="alert">
                  <h2>3D 场景暂不可用</h2>
                  <p>{worldError}</p>
                  <button onClick={() => navigate("notes")}>
                    继续使用资料库
                  </button>
                  <button onClick={() => location.reload()}>重新加载</button>
                </div>
              )}
              <section className="world-caption">
                <p className="eyebrow">
                  {place === "exterior"
                    ? "01 / THE LAKESHORE"
                    : place === "interior"
                      ? "02 / INSIDE THE CABIN"
                      : "03 / YOUR DESK"}
                </p>
                <h1>
                  {place === "exterior"
                    ? "Welcome to the lakeside."
                    : place === "interior"
                      ? "Make yourself at home."
                      : "Your stories start here."}
                </h1>
                <p>
                  {place === "exterior"
                    ? "湖岸与木屋 · Phase 01B 视觉精修待续"
                    : place === "interior"
                      ? "简化室内 · 书桌是个人资料的入口"
                      : "打开电脑，即可浏览和整理真实资料"}
                </p>
              </section>
              <nav className="world-navigation" aria-label="空间导航">
                {place === "exterior" ? (
                  <>
                    <button
                      className="glass-button"
                      disabled={!ready}
                      onClick={() => {
                        runtime.inspectionShot = null;
                        runtime.requestedShot = "A";
                      }}
                    >
                      湖岸镜头
                    </button>
                    <button
                      className="glass-button"
                      disabled={!ready}
                      onClick={() => {
                        runtime.inspectionShot = null;
                        runtime.motion = !runtime.reducedMotion;
                        runtime.moveTarget = 1;
                      }}
                    >
                      走近木屋
                    </button>
                    <button
                      className="light-button"
                      disabled={!ready}
                      onClick={() => goPlace("interior")}
                    >
                      进入木屋 →
                    </button>
                  </>
                ) : place === "interior" ? (
                  <>
                    <button
                      className="glass-button"
                      onClick={() => goPlace("exterior")}
                    >
                      返回湖岸
                    </button>
                    <button
                      className="light-button"
                      onClick={() => goPlace("desk")}
                    >
                      走到书桌 →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="glass-button"
                      onClick={() => goPlace("interior")}
                    >
                      离开书桌
                    </button>
                    <button
                      className="light-button"
                      onClick={() => navigate(activeKind, route.id)}
                    >
                      打开电脑 ↗
                    </button>
                  </>
                )}
              </nav>
            </>
          )}
          {sampling && (
            <div className="sampling-status" role="status">
              正在记录 3D 真实帧时间（预热 2 秒＋采样 15 秒）…
            </div>
          )}
          <div className="world-bottom">
            <span>PRIVATE · LOCAL FIRST</span>
            <button className="quiet-button" onClick={() => setHelp(true)}>
              使用与备份说明
            </button>
          </div>
        </>
      )}
      <div className="desktop" hidden={!desktop}>
        <header className="desktop-menubar">
          <div className="desktop-wordmark">
            ◈ <strong>Personal World</strong>
            <span>私人资料库</span>
          </div>
          <span className="local-indicator">● 本地保存</span>
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
                {entries.filter((e) => e.kind === kind && !e.deletedAt).length}
              </small>
            </a>
          ))}
          <div className="sidebar-bottom">
            <span className="eyebrow">YOUR OWN LITTLE ARCHIVE</span>
            <p>
              {entries.length} 项个人资料
              <br />
              只属于此浏览器
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
            loading={loading}
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
              <strong>http://127.0.0.1:5177</strong>
              。清除网站数据、换浏览器或换端口不会自动迁移资料。应用不上传资料，也未配置账户和云端同步。
            </p>
            <p className="quiet">
              MVP：室内为简化模型，门口与屏幕采用短淡入，精细美术和复杂窗口交互留待后续。
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
