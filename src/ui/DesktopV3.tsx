import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { KINDS, LABELS, type Kind } from "../library/model";
import { assetURL } from "../site";
import "./desktop-v3.css";

export type DesktopApp = Kind | "profile";
export type DesktopV3Props = {
  activeApp: DesktopApp;
  onActivate: (app: DesktopApp) => void;
  renderApp: (kind: Kind) => ReactNode;
  renderProfile: () => ReactNode;
  onReturnWorld: () => void;
  onHelp: () => void;
  onOpenWorkspace?: () => void;
  onLeaveWorkspace?: () => void;
  soundControl?: ReactNode;
  workspace?: boolean;
  editable?: boolean;
  dirty?: boolean;
  counts?: Partial<Record<Kind, number>>;
  notice?: ReactNode;
};
type WindowState = {
  app: DesktopApp;
  state: "open" | "minimized" | "closed";
  z: number;
  maximized: boolean;
};
const APP_NAMES: Record<DesktopApp, string> = {
  ...LABELS,
  profile: "个人资料填写中心",
};
const APPS: DesktopApp[] = [...KINDS, "profile"];
const ICONS = Object.fromEntries(
  APPS.map((app) => [app, assetURL(`desktop-v3/${app}.svg`)]),
) as Record<DesktopApp, string>;

function NorthMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2" fill="#a9cbd0" />
    </svg>
  );
}
function StatusGlyph({
  kind,
}: {
  kind: "wifi" | "battery" | "control" | "exit";
}) {
  const paths = {
    wifi: (
      <>
        <path d="M2 7a15 15 0 0 1 20 0M5 10a10 10 0 0 1 14 0M8 13a5 5 0 0 1 8 0" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </>
    ),
    battery: (
      <>
        <rect x="2" y="6" width="18" height="12" rx="3" />
        <path d="M23 10v4" />
        <rect
          x="5"
          y="9"
          width="11"
          height="6"
          rx="1"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
    control: (
      <>
        <rect x="2" y="4" width="20" height="6" rx="3" />
        <rect x="2" y="14" width="20" height="6" rx="3" />
        <circle cx="8" cy="7" r="1.2" fill="currentColor" />
        <circle cx="16" cy="17" r="1.2" fill="currentColor" />
      </>
    ),
    exit: (
      <>
        <path d="M9 4H4v16h5M13 7l5 5-5 5M8 12h11" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <time
      className="dv3-clock"
      dateTime={now.toISOString()}
      title={`访客本地时间 · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`}
    >
      {new Intl.DateTimeFormat("zh-CN", {
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now)}
    </time>
  );
}
export function WeatherWidget() {
  return (
    <section
      className="dv3-weather dv3-widget"
      aria-label="天气演示，非实时天气"
    >
      <header>
        <span>湖畔 · 场景演示</span>
        <span className="dv3-demo">DEMO</span>
      </header>
      <div className="dv3-weather-now">
        <strong>
          18<span>°</span>
        </strong>
        <svg viewBox="0 0 90 64" aria-hidden="true">
          <defs>
            <linearGradient id="dv3-sun" x2="0" y2="1">
              <stop stopColor="#fff6b4" />
              <stop offset="1" stopColor="#f3c267" />
            </linearGradient>
          </defs>
          <circle cx="56" cy="24" r="17" fill="url(#dv3-sun)" />
          <g stroke="#f7df9b" strokeWidth="2" strokeLinecap="round">
            <path d="M56 1v-1M80 24h3M72 7l2-2M73 41l2 2" />
          </g>
          <path
            d="M21 57a14 14 0 1 1 2-28 19 19 0 0 1 35 0 14 14 0 1 1 4 28Z"
            fill="#f2f7f9"
            fillOpacity=".95"
          />
        </svg>
      </div>
      <div className="dv3-weather-footer">
        <span>多云 · 最高 20° / 最低 12°</span>
        <span>固定场景数据</span>
      </div>
      <small>演示天气 · 非实时 · 不读取定位</small>
    </section>
  );
}
function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function CalendarWidget() {
  const [today, setToday] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const offset = (month.getDay() + 6) % 7;
  const days = Array.from(
    { length: 42 },
    (_, n) => new Date(month.getFullYear(), month.getMonth(), n - offset + 1),
  );
  return (
    <section
      className="dv3-calendar dv3-widget"
      aria-label="日历，使用访客本地日期"
    >
      <header>
        <div>
          <span>
            {new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(
              selected,
            )}
          </span>
          <strong>{selected.getDate()}</strong>
        </div>
        <div className="dv3-month-controls">
          <button
            aria-label="上个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <span>
            {month.getFullYear()}年{month.getMonth() + 1}月
          </span>
          <button
            aria-label="下个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
      </header>
      <div className="dv3-weekdays" aria-hidden="true">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="dv3-calendar-grid">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            className={`${day.getMonth() !== month.getMonth() ? "muted" : ""} ${sameDate(day, today) ? "today" : ""} ${sameDate(day, selected) ? "selected" : ""}`}
            aria-label={new Intl.DateTimeFormat("zh-CN", {
              dateStyle: "full",
            }).format(day)}
            aria-pressed={sameDate(day, selected)}
            onClick={() => {
              setSelected(day);
              if (day.getMonth() !== month.getMonth())
                setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
            }}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
      <footer>
        <button
          onClick={() => {
            const d = new Date();
            setSelected(d);
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
        >
          今天
        </button>
        <span>本地日期 · 未连接日程</span>
      </footer>
    </section>
  );
}
function raiseWindow(current: WindowState[], app: DesktopApp): WindowState[] {
  const next = current.some((w) => w.app === app)
    ? current
    : [...current, { app, state: "open" as const, z: 0, maximized: false }];
  const behind = next.filter((w) => w.app !== app).sort((a, b) => a.z - b.z);
  return next.map((w) =>
    w.app === app
      ? { ...w, state: "open", z: next.length }
      : { ...w, z: behind.findIndex((other) => other.app === w.app) + 1 },
  );
}
const ContentSlot = memo(function ContentSlot({
  app,
  renderApp,
  renderProfile,
}: {
  app: DesktopApp;
  renderApp: DesktopV3Props["renderApp"];
  renderProfile: DesktopV3Props["renderProfile"];
}) {
  return <>{app === "profile" ? renderProfile() : renderApp(app)}</>;
});

function DesktopWindow({
  window: item,
  active,
  children,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
}: {
  window: WindowState;
  active: boolean;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}) {
  const frame = useRef<HTMLElement>(null);
  const position = useRef({
    x: 285 + APPS.indexOf(item.app) * 22,
    y: 70 + APPS.indexOf(item.app) * 20,
    width: 1000,
    height: 660,
  });
  const gesture = useRef<null | {
    type: "move" | "size";
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>(null);
  useEffect(() => {
    const fit = () => {
      const node = frame.current,
        host = node?.parentElement;
      if (!node || !host) return;
      const w = host.clientWidth || innerWidth,
        h = host.clientHeight || innerHeight;
      const p = position.current;
      p.width = Math.max(320, Math.min(p.width, w - 36));
      p.height = Math.max(260, Math.min(p.height, h - p.y - 105));
      p.x = Math.max(12, Math.min(p.x, w - p.width - 12));
      p.y = Math.max(42, Math.min(p.y, h - Math.min(p.height, 160) - 105));
      node.style.setProperty("--dv3-x", `${p.x}px`);
      node.style.setProperty("--dv3-y", `${p.y}px`);
      node.style.setProperty("--dv3-w", `${p.width}px`);
      node.style.setProperty("--dv3-h", `${p.height}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (frame.current?.parentElement)
      observer.observe(frame.current.parentElement);
    return () => observer.disconnect();
  }, []);
  const start = (event: ReactPointerEvent, type: "move" | "size") => {
    if (
      event.button !== 0 ||
      item.maximized ||
      (type === "move" && (event.target as HTMLElement).closest("button"))
    )
      return;
    if (innerWidth < 720) return;
    event.preventDefault();
    onFocus();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      type,
      startX: event.clientX,
      startY: event.clientY,
      ...position.current,
    };
  };
  const move = (event: ReactPointerEvent) => {
    const g = gesture.current,
      node = frame.current,
      host = node?.parentElement;
    if (!g || !node || !host) return;
    const w = host.clientWidth,
      h = host.clientHeight,
      dx = event.clientX - g.startX,
      dy = event.clientY - g.startY,
      p = position.current;
    if (g.type === "move") {
      p.x = Math.max(8, Math.min(w - p.width - 8, g.x + dx));
      p.y = Math.max(38, Math.min(h - 140, g.y + dy));
    } else {
      p.width = Math.max(
        Math.min(640, w - 20),
        Math.min(w - p.x - 8, g.width + dx),
      );
      p.height = Math.max(280, Math.min(h - p.y - 92, g.height + dy));
    }
    node.style.setProperty("--dv3-x", `${p.x}px`);
    node.style.setProperty("--dv3-y", `${p.y}px`);
    node.style.setProperty("--dv3-w", `${p.width}px`);
    node.style.setProperty("--dv3-h", `${p.height}px`);
  };
  const stop = () => {
    gesture.current = null;
  };
  return (
    <section
      ref={frame}
      role="dialog"
      aria-label={`${APP_NAMES[item.app]} 窗口`}
      hidden={item.state !== "open"}
      className={`dv3-window ${active ? "is-front" : ""} ${item.maximized ? "is-maximized" : ""}`}
      style={{ zIndex: 20 + item.z }}
      onPointerDown={onFocus}
      onFocusCapture={onFocus}
    >
      <header
        className="dv3-titlebar"
        onPointerDown={(event) => start(event, "move")}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("button")) onMaximize();
        }}
      >
        <div
          className="dv3-traffic"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            className="close"
            aria-label={`关闭 ${APP_NAMES[item.app]} 窗口，保留草稿`}
            onClick={onClose}
          >
            <span>×</span>
          </button>
          <button
            className="minimize"
            aria-label={`最小化 ${APP_NAMES[item.app]} 窗口`}
            onClick={onMinimize}
          >
            <span>−</span>
          </button>
          <button
            className="maximize"
            aria-label={`${item.maximized ? "还原" : "最大化"} ${APP_NAMES[item.app]} 窗口`}
            onClick={onMaximize}
          >
            <span>↗</span>
          </button>
        </div>
        <span className="dv3-window-title">
          <img src={ICONS[item.app]} alt="" />
          {APP_NAMES[item.app]}
        </span>
        <span className="dv3-window-caption">Personal World</span>
      </header>
      <div className="dv3-window-content">{children}</div>
      <div
        className="dv3-resize"
        aria-hidden="true"
        onPointerDown={(event) => start(event, "size")}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
    </section>
  );
}

export default function DesktopV3({
  activeApp,
  onActivate,
  renderApp,
  renderProfile,
  onReturnWorld,
  onHelp,
  onOpenWorkspace,
  onLeaveWorkspace,
  soundControl,
  workspace = false,
  editable = false,
  dirty = false,
  counts,
  notice,
}: DesktopV3Props) {
  const availableApps: DesktopApp[] = editable ? APPS : [...KINDS];
  const [windows, setWindows] = useState<WindowState[]>(() => [
    { app: activeApp, state: "open", z: 1, maximized: false },
  ]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [menu, setMenu] = useState<"file" | "window" | null>(null);
  const highest = Math.max(
    0,
    ...windows.filter((w) => w.state === "open").map((w) => w.z),
  );
  const front =
    windows.find((w) => w.state === "open" && w.z === highest)?.app ?? null;
  const focus = (app: DesktopApp, notify = true) => {
    setWindows((current) => raiseWindow(current, app));
    if (notify) onActivate(app);
  };
  useEffect(() => {
    setWindows((current) => {
      const old = current.find((w) => w.app === activeApp);
      if (
        old?.state === "open" &&
        old.z === Math.max(...current.map((w) => w.z))
      )
        return current;
      return raiseWindow(current, activeApp);
    });
  }, [activeApp]);
  const state = (app: DesktopApp, value: WindowState["state"]) =>
    setWindows((current) =>
      current.map((w) => (w.app === app ? { ...w, state: value } : w)),
    );
  const maximize = (app: DesktopApp) =>
    setWindows((current) =>
      current.map((w) =>
        w.app === app ? { ...w, maximized: !w.maximized } : w,
      ),
    );
  const localWorkspace = () => {
    onOpenWorkspace?.();
    focus("profile");
  };
  const closeMenus = () => {
    setMenu(null);
    setStatusOpen(false);
  };
  return (
    <div
      className="desktop-v3"
      aria-label="Personal World 桌面"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeMenus();
      }}
    >
      <div
        className="dv3-wallpaper"
        aria-hidden="true"
        onPointerDown={closeMenus}
      />
      <header className="dv3-menubar">
        <button
          className="dv3-brand"
          aria-label="Personal World 使用说明"
          onClick={onHelp}
        >
          <NorthMark />
        </button>
        <strong className="dv3-active-name">
          {front ? APP_NAMES[front] : "Personal World"}
        </strong>
        <div className="dv3-menu-group">
          <button
            aria-expanded={menu === "file"}
            onClick={() => {
              setMenu(menu === "file" ? null : "file");
              setStatusOpen(false);
            }}
          >
            文件
          </button>
          <button
            aria-expanded={menu === "window"}
            onClick={() => {
              setMenu(menu === "window" ? null : "window");
              setStatusOpen(false);
            }}
          >
            窗口
          </button>
          <button onClick={onHelp}>帮助</button>
        </div>
        {editable && (
          <>
            <span
              className={`dv3-workspace-state ${workspace ? "is-local" : ""}`}
            >
              {workspace ? "本地工作区" : "公开浏览"}
              {dirty ? " · 未保存" : ""}
            </span>
            <button className="dv3-edit-entry" onClick={localWorkspace}>
              本地编辑工作区
            </button>
          </>
        )}
        <div className="dv3-status">
          {soundControl}
          <button
            className="dv3-simulated-status"
            aria-label="Wi-Fi 和电池为演示状态"
            aria-expanded={statusOpen}
            onClick={() => {
              setStatusOpen(!statusOpen);
              setMenu(null);
            }}
          >
            <StatusGlyph kind="wifi" />
            <StatusGlyph kind="battery" />
            <span>DEMO</span>
          </button>
          <button
            className="dv3-control-button"
            aria-label="桌面控制与演示状态说明"
            onClick={() => {
              setStatusOpen(!statusOpen);
              setMenu(null);
            }}
          >
            <StatusGlyph kind="control" />
          </button>
          <LocalClock />
          <button
            className="dv3-exit"
            aria-label="退出电脑返回木屋"
            title="返回木屋"
            onClick={onReturnWorld}
          >
            <StatusGlyph kind="exit" />
          </button>
        </div>
      </header>
      {menu && (
        <div
          className={`dv3-menu dv3-menu-${menu}`}
          role="menu"
          aria-label={menu === "file" ? "文件菜单" : "窗口菜单"}
        >
          {menu === "file" ? (
            <>
              {availableApps.map((app) => (
                <button
                  role="menuitem"
                  key={app}
                  onClick={() => {
                    app === "profile" ? localWorkspace() : focus(app);
                    closeMenus();
                  }}
                >
                  <img src={ICONS[app]} alt="" />
                  {APP_NAMES[app]}
                  <span>打开</span>
                </button>
              ))}
              <hr />
              {editable && workspace && (
                <button
                  role="menuitem"
                  onClick={() => {
                    onLeaveWorkspace?.();
                    closeMenus();
                  }}
                >
                  返回公开浏览<span>保留本地草稿</span>
                </button>
              )}
              <button
                role="menuitem"
                onClick={() => {
                  onHelp();
                  closeMenus();
                }}
              >
                浏览与操作说明
              </button>
            </>
          ) : (
            <>
              <button
                role="menuitem"
                onClick={() => {
                  setWindows((current) =>
                    current.map((w) =>
                      w.state === "open" ? { ...w, state: "minimized" } : w,
                    ),
                  );
                  closeMenus();
                }}
              >
                显示桌面<span>保留全部窗口</span>
              </button>
              {front ? (
                <>
                  <button
                    role="menuitem"
                    onClick={() => {
                      state(front, "minimized");
                      closeMenus();
                    }}
                  >
                    最小化当前窗口
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      maximize(front);
                      closeMenus();
                    }}
                  >
                    最大化 / 还原
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      state(front, "closed");
                      closeMenus();
                    }}
                  >
                    关闭窗口
                    <span>
                      {editable ? "保留资料与草稿" : "可从 Dock 重新打开"}
                    </span>
                  </button>
                </>
              ) : null}
              <hr />
              {windows.map((w) => (
                <button
                  role="menuitem"
                  key={w.app}
                  onClick={() => {
                    focus(w.app);
                    closeMenus();
                  }}
                >
                  {w.app === front ? "✓ " : ""}
                  {APP_NAMES[w.app]}
                  <span>
                    {w.state === "minimized"
                      ? "已最小化"
                      : w.state === "closed"
                        ? "已关闭"
                        : "已打开"}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      {statusOpen && (
        <aside
          className="dv3-status-panel"
          aria-label="演示状态与本地工作区说明"
        >
          <strong>桌面预览状态</strong>
          <p>
            <StatusGlyph kind="wifi" />
            Wi-Fi · 演示图标
          </p>
          <p>
            <StatusGlyph kind="battery" />
            电池 · 演示图标
          </p>
          <small>
            没有读取设备网络、电池或定位。日期与时间使用你的浏览器本地时区。
          </small>
          <hr />
          <button
            onClick={() => {
              setWindows((current) =>
                current.map((w) =>
                  w.state === "open" ? { ...w, state: "minimized" } : w,
                ),
              );
              setStatusOpen(false);
            }}
          >
            显示桌面与 Widgets
          </button>
          {editable && (
            <>
              <button
                onClick={() => {
                  localWorkspace();
                  setStatusOpen(false);
                }}
              >
                进入本地编辑工作区
              </button>
              <small>
                仅编辑当前浏览器草稿。这里不是账户登录，也不提供远端管理员权限。
              </small>
            </>
          )}
        </aside>
      )}
      <aside className="dv3-widgets" aria-label="桌面小组件">
        <WeatherWidget />
        <CalendarWidget />
      </aside>
      {notice ? <div className="dv3-notice">{notice}</div> : null}
      {windows.map((w) => (
        <DesktopWindow
          key={w.app}
          window={w}
          active={front === w.app}
          onFocus={() => {
            if (front !== w.app) focus(w.app);
          }}
          onClose={() => state(w.app, "closed")}
          onMinimize={() => state(w.app, "minimized")}
          onMaximize={() => maximize(w.app)}
        >
          <ContentSlot
            app={w.app}
            renderApp={renderApp}
            renderProfile={renderProfile}
          />
        </DesktopWindow>
      ))}
      <div className="dv3-desktop-caption" aria-hidden="true">
        <span>PERSONAL WORLD</span>
        <p>
          A quieter place
          <br />
          for your stories.
        </p>
      </div>
      <nav
        className="dv3-dock"
        aria-label="桌面 Dock"
        onPointerLeave={() => setHovered(null)}
      >
        {availableApps.map((app, index) => {
          const item = windows.find((w) => w.app === app);
          const distance = hovered === null ? 4 : Math.abs(index - hovered);
          const scale = distance === 0 ? 1.26 : distance === 1 ? 1.12 : 1;
          return (
            <button
              key={app}
              className={`dv3-dock-app ${app === "profile" ? "dv3-dock-profile" : ""} ${item?.state === "minimized" ? "is-minimized" : ""}`}
              style={{ "--dv3-scale": scale } as CSSProperties}
              aria-label={`打开 ${APP_NAMES[app]}`}
              title={APP_NAMES[app]}
              onPointerEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onClick={() => {
                app === "profile" ? localWorkspace() : focus(app);
                closeMenus();
              }}
            >
              <span className="dv3-dock-tooltip">
                {APP_NAMES[app]}
                {app !== "profile" && counts?.[app] !== undefined
                  ? ` · ${counts[app]} 项公开`
                  : ""}
              </span>
              <img src={ICONS[app]} alt="" draggable="false" />
              <i
                className={item && item.state !== "closed" ? "running" : ""}
                aria-label={
                  item?.state === "minimized"
                    ? "已最小化"
                    : item?.state === "open"
                      ? "正在运行"
                      : "未打开"
                }
              />
            </button>
          );
        })}
        <div className="dv3-dock-divider" />
        <button
          className="dv3-dock-return"
          aria-label="返回三维木屋"
          title="返回木屋"
          onClick={onReturnWorld}
        >
          <StatusGlyph kind="exit" />
          <span className="dv3-dock-tooltip">返回木屋</span>
        </button>
      </nav>
    </div>
  );
}
