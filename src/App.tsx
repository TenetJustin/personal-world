import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
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
import { localEditorEnabled } from "./library/viewer";
import { readEntries, removeEntry, writeEntries } from "./library/storage";
import { loadPublishedContent } from "./library/publishing";
import { Library } from "./ui/Library";
import {
  anyDraftDirty,
  otherDraftDirty,
  updateDraftState,
  createDirtyCallbacks,
  type DraftState,
} from "./library/draftState";
import { AmbienceControl } from "./ui/AmbienceControl";
import { WorldControls } from "./ui/WorldControls";
import { worldToCabin } from "./scene/architecture";
import { ambience } from "./audio/ambience";
import { ScreenBridge } from "./ui/ScreenBridge";
import DesktopV3, { type DesktopApp } from "./ui/DesktopV3";
import { ProfileCenter } from "./ui/ProfileCenter";
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
const editorEnabled = localEditorEnabled(import.meta.env.DEV, location.search);

export default function App() {
  const initial = useRef(parseRoute(location.pathname));
  const initialProfile = useRef(
    editorEnabled &&
      new URLSearchParams(location.search).get("app") === "profile",
  );
  const [workspace, setWorkspace] = useState(() => {
    try {
      return (
        editorEnabled &&
        (initialProfile.current ||
          new URLSearchParams(location.search).get("workspace") === "local" ||
          sessionStorage.getItem("personal-world-workspace") === "local")
      );
    } catch {
      return initialProfile.current;
    }
  });
  const workspaceRef = useRef(workspace);
  const [selectedByKind, setSelectedByKind] = useState<
    Partial<Record<Kind, string | null>>
  >(() =>
    initial.current.kind ? { [initial.current.kind]: initial.current.id } : {},
  );
  const [dirtyMap, setDirtyMap] = useState<DraftState>({});
  const dirty = anyDraftDirty(dirtyMap);
  const dirtyCallbacks = useMemo(
    () =>
      createDirtyCallbacks((app, value) =>
        setDirtyMap((previous) => updateDraftState(previous, app, value)),
      ),
    [],
  );
  const changeWorkspace = useCallback((requested: boolean) => {
    const value = editorEnabled && requested;
    workspaceRef.current = value;
    setWorkspace(value);
    try {
      if (value) sessionStorage.setItem("personal-world-workspace", "local");
      else sessionStorage.removeItem("personal-world-workspace");
    } catch {}
  }, []);
  const [route, setRoute] = useState(initial.current),
    [profileOpen, setProfileOpen] = useState(initialProfile.current),
    [desktop, setDesktop] = useState(
      !!initial.current.kind || initialProfile.current,
    ),
    [worldStarted, setWorldStarted] = useState(
      !initial.current.kind &&
        !initialProfile.current &&
        !new URLSearchParams(location.search).has("study"),
    );
  const state = useSyncExternalStore(journey.subscribe, journey.getSnapshot);
  const [entries, setEntries] = useState<Entry[]>([]),
    [published, setPublished] = useState<Entry[]>([]),
    [publishedLoading, setPublishedLoading] = useState(true),
    [publishedError, setPublishedError] = useState(""),
    [loading, setLoading] = useState(true),
    [storageError, setStorageError] = useState("");
  const [ready, setReady] = useState(false),
    [worldError, setWorldError] = useState(""),
    [transition, setTransition] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
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
    if (editorEnabled) void boot();
    else setLoading(false);
    void loadPublic();
  }, [boot, loadPublic]);
  const sync = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (!editorEnabled || !("BroadcastChannel" in window)) return;
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
    const path = entryPath(kind, id);
    history.pushState(
      {},
      "",
      path +
        (editorEnabled
          ? (path.includes("?") ? "&" : "?") +
            "editor=local" +
            (workspaceRef.current ? "&workspace=local" : "")
          : ""),
    );
    setSelectedByKind((previous) => ({ ...previous, [kind]: id }));
    setRoute({ kind, id });
    setProfileOpen(false);
    setDesktop(true);
  }, []);
  const activate = useCallback(
    (app: DesktopApp) => {
      if (app === "profile") {
        if (!editorEnabled) return;
        journey.interact();
        changeWorkspace(true);
        history.pushState(
          {},
          "",
          location.pathname + "?editor=local&app=profile",
        );
        setProfileOpen(true);
        setDesktop(true);
        return;
      }
      navigate(app);
    },
    [navigate, changeWorkspace],
  );
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("debug")) return;
    (window as unknown as { __pw?: unknown }).__pw = {
      journey,
      runtime,
      screenProjection,
      ambience,
    };
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
      const next = parseRoute(location.pathname),
        profile =
          editorEnabled &&
          new URLSearchParams(location.search).get("app") === "profile";
      setRoute(next);
      if (next.kind)
        setSelectedByKind((previous) => ({
          ...previous,
          [next.kind!]: next.id,
        }));
      if (profile) changeWorkspace(true);
      setProfileOpen(profile);
      if (next.kind || profile) {
        journey.interact();
        setDesktop(true);
      } else {
        setDesktop(false);
        if (journey.phase === "DESKTOP") journey.exitDesktop();
      }
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
  }, [changeWorkspace]);
  useEffect(() => {
    const update = () =>
      ambience.update(worldToCabin(journey.position.toArray()), desktop);
    update();
    const timer = setInterval(update, 200);
    const visibility = () => {
      void ambience.visibility(document.hidden);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [desktop]);
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
      desktop && profileOpen
        ? "个人资料填写中心 · Personal World"
        : desktop && route.kind
          ? LABELS[route.kind] + " · Personal World"
          : "Personal World · 湖畔木屋";
  }, [desktop, route.kind, profileOpen]);
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
      if (!document.pointerLockElement && drag && e.pointerId === drag.id) {
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
    const up = (event: PointerEvent) => {
      if (event.pointerId === drag?.id) drag = null;
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
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
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
  // First-person WASD + pointer-lock look. The same Walker/collision data drives
  // automatic guidance, so handing control back never changes the world model.
  useEffect(() => {
    if (!worldStarted || desktop || help || worldError) return;
    const held = new Set<string>();
    const blockedPhase = () =>
      ["ENTERING_DESKTOP", "EXITING_DESKTOP", "DESKTOP"].includes(
        journey.phase,
      );
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);
    const apply = () => {
      const forward = (held.has("KeyW") ? 1 : 0) - (held.has("KeyS") ? 1 : 0),
        strafe = (held.has("KeyD") ? 1 : 0) - (held.has("KeyA") ? 1 : 0);
      journey.setMoveInput(
        forward,
        strafe,
        held.has("ShiftLeft") || held.has("ShiftRight"),
      );
    };
    const clear = () => {
      held.clear();
      journey.clearMovement();
    };
    const down = (event: KeyboardEvent) => {
      if (
        typing(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (blockedPhase()) return;
      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(
          event.code,
        )
      ) {
        if (
          event.code === "KeyW" ||
          event.code === "KeyA" ||
          event.code === "KeyS" ||
          event.code === "KeyD"
        )
          event.preventDefault();
        held.add(event.code);
        apply();
      } else if (event.code === "KeyE") {
        event.preventDefault();
        journey.toggleDoor();
      } else if (event.code === "Escape") {
        clear();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (!held.delete(event.code)) return;
      apply();
    };
    const blur = () => clear();
    const visibility = () => {
      if (document.hidden) clear();
    };
    const lockChange = () => {
      if (!document.pointerLockElement) clear();
    };
    const move = (event: PointerEvent) => {
      if (document.pointerLockElement && event.isTrusted && !blockedPhase())
        journey.look(event.movementX, event.movementY);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("focusin", blur);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerlockchange", lockChange);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focusin", blur);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerlockchange", lockChange);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [worldStarted, desktop, help, worldError]);
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
              ambience: ambience.snapshot(),
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
    setProfileOpen(false);
    setDesktop(false);
  };
  const activeKind = route.kind ?? "notes",
    activeApp: DesktopApp = profileOpen ? "profile" : activeKind,
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
            <span>WASD 移动 · 鼠标观察 · 沿湖岸前往木屋</span>
            <div>
              <AmbienceControl />
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
                浏览与操作说明
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
          <WorldControls disabled={!ready || help || !!worldError} />
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
        <DesktopV3
          activeApp={activeApp}
          editable={editorEnabled}
          onActivate={activate}
          renderApp={(kind) => (
            <Library
              kind={kind}
              readOnly={!editorEnabled}
              selected={selectedByKind[kind] ?? null}
              entries={entries}
              published={published}
              loading={loading}
              publishedLoading={publishedLoading}
              error={storageError}
              onSelect={(id) => navigate(kind, id)}
              onSave={save}
              onDelete={remove}
              onRestore={save}
              onDirty={dirtyCallbacks[kind]}
              otherDirty={otherDraftDirty(dirtyMap, kind)}
              workspace={workspace}
              onOpenWorkspace={() => changeWorkspace(true)}
              onOpenProfile={() => activate("profile")}
            />
          )}
          renderProfile={() =>
            !editorEnabled ? null : loading ? (
              <p role="status">正在读取本地资料…</p>
            ) : (
              <ProfileCenter
                entries={entries}
                published={published}
                onSave={save}
                onDirty={dirtyCallbacks.profile}
                otherDirty={otherDraftDirty(dirtyMap, "profile")}
                onRestore={save}
                onOpenLibrary={(kind, id) => {
                  setProfileOpen(false);
                  navigate(kind, id ?? null);
                }}
                onClose={() => setProfileOpen(false)}
              />
            )
          }
          onReturnWorld={returnWorld}
          onHelp={() => setHelp(true)}
          onOpenWorkspace={() => {
            changeWorkspace(true);
            history.pushState(
              {},
              "",
              location.pathname + "?editor=local&app=profile",
            );
            setProfileOpen(true);
          }}
          workspace={workspace}
          onLeaveWorkspace={() => {
            changeWorkspace(false);
            navigate(activeKind);
          }}
          soundControl={<AmbienceControl desktop />}
          dirty={dirty}
          counts={{
            notes: published.filter((e) => e.kind === "notes").length,
            photos: published.filter((e) => e.kind === "photos").length,
            projects: published.filter((e) => e.kind === "projects").length,
            resume: published.filter((e) => e.kind === "resume").length,
          }}
          notice={
            publishedError ? (
              <p role="alert">
                {publishedError}
                <button onClick={() => void loadPublic()}>重试公开内容</button>
              </p>
            ) : null
          }
        />
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
            {editorEnabled ? (
              <>
                <h1 id="help-title">把真实生活放进来。</h1>
                <ol>
                  <li>
                    <strong>Notes</strong>：新建笔记，或批量导入 Markdown /
                    TXT。
                  </li>
                  <li>
                    <strong>Photos</strong>：导入
                    JPEG、PNG、WebP、GIF，编辑标题和说明。
                  </li>
                  <li>
                    <strong>Projects</strong>：填写项目介绍、标签与网址。
                  </li>
                  <li>
                    <strong>Resume</strong>：编写履历，或导入 Markdown / TXT /
                    PDF。
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
              </>
            ) : (
              <>
                <h1 id="help-title">欢迎来到我的湖畔木屋。</h1>
                <p>
                  在湖岸漫步，沿着小路进入木屋，点击书桌上的
                  Mac，打开我的备忘录、相册与作品。
                </p>
                <ol>
                  <li>
                    <strong>备忘录</strong>
                    ：从自我介绍开始，认识我的背景、兴趣和正在探索的方向。
                  </li>
                  <li>
                    <strong>照片</strong>：浏览生活影像与相册。
                  </li>
                  <li>
                    <strong>作品与履历</strong>：阅读已公开的项目与经历。
                  </li>
                </ol>
                <p>
                  可以搜索、筛选并切换应用。点击右上角返回按钮，继续探索木屋。
                </p>
              </>
            )}
            <p className="quiet">
              环境音默认关闭，点击开启后按当前位置混合湖水、林风、鸟鸣或室内壁炉声；可调节音量，切到后台会暂停。声音为本项目原创合成，不读取麦克风。
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
