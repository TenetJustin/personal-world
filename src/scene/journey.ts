import { CatmullRomCurve3 } from "three/src/extras/curves/CatmullRomCurve3.js";
import { Matrix4 } from "three/src/math/Matrix4.js";
import { Quaternion } from "three/src/math/Quaternion.js";
import { Vector3 } from "three/src/math/Vector3.js";
import {
  CABIN,
  cabinToWorld,
  worldToCabin,
  architecturalFloor,
  INTERIOR_ANCHORS,
  LAPTOP_SCREEN_CENTER_WORLD,
} from "./architecture.ts";
import { groundHeight } from "./landscape.ts";
export type JourneyPhase =
  | "BOOT"
  | "LAKESHORE_IDLE"
  | "AUTO_WALKING_TO_CABIN"
  | "MANUAL_EXPLORATION"
  | "CABIN_APPROACH"
  | "CABIN_DOOR"
  | "CABIN_INTERIOR"
  | "WALKING_TO_DESK"
  | "DESK_READY"
  | "ENTERING_DESKTOP"
  | "DESKTOP"
  | "EXITING_DESKTOP";
export type Point = readonly [number, number, number];
const UP = new Vector3(0, 1, 0),
  mat = new Matrix4();
const ease = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cp = (x: number, z: number) => cabinToWorld([x, 0, z]);
const points: Point[] = [
  [6, 0, 43],
  [8, 0, 35],
  [10.3, 0, 28],
  [11, 0, 22],
  cp(1.16, 15),
  cp(1.16, 11),
  cp(1.16, 8.6),
  cp(1.16, 7.8),
  cp(1.16, 6.4),
  cp(1.11, 5.35),
  cp(1.11, 4.7),
  cp(1.11, 3.5),
  cp(1.11, 2.3),
  cp(0.25, 1),
  cp(-1.2, 0.9),
  cp(-2.9, 0.9),
  cp(-3.6, 1.1),
];
export const WALK_ROUTE = new CatmullRomCurve3(
  points.map((p) => new Vector3(...p)),
  false,
  "centripetal",
);
WALK_ROUTE.arcLengthDivisions = 4000;
const lengths = WALK_ROUTE.getLengths(),
  total = WALK_ROUTE.getLength();
function atControl(index: number) {
  const f = (index / (points.length - 1)) * (lengths.length - 1),
    i = Math.floor(f);
  return lerp(lengths[i], lengths[Math.min(i + 1, lengths.length - 1)], f - i);
}
export const ROUTE_ANCHORS = {
  lake: 0,
  porch: atControl(8),
  door: atControl(9),
  room: atControl(13),
  desk: total,
};
export const EYE_HEIGHT = 1.65;
export function walkFloor(p: Point) {
  const [x, , z] = worldToCabin(p);
  // The eye follows the body's smooth rise over the five real treads, not a flying spline.
  if (
    x >= CABIN.stairs.minX &&
    x <= CABIN.stairs.maxX &&
    z >= 6.93 &&
    z <= 8.43
  ) {
    const base = cabinToWorld([x, 0, 8.43]);
    return lerp(
      groundHeight(base[0], base[2]),
      CABIN.porch.floorY,
      Math.max(0, Math.min(1, (8.43 - z) / 1.5)),
    );
  }
  if (Math.abs(x - CABIN.door.centerX) < 0.55 && z < 4.65 && z > 4.1)
    return lerp(CABIN.porch.floorY, CABIN.floorY, ease((4.65 - z) / 0.55));
  return architecturalFloor(x, z) ?? groundHeight(p[0], p[2]);
}
export function routePosition(distance: number) {
  const p = WALK_ROUTE.getPointAt(Math.max(0, Math.min(1, distance / total)));
  p.y = walkFloor(p.toArray()) + EYE_HEIGHT;
  return p;
}
function lookRotation(position: Vector3, target: Point) {
  return new Quaternion().setFromRotationMatrix(
    mat.lookAt(position, new Vector3(...target), UP),
  );
}
function desiredSpeed(distance: number) {
  const p = worldToCabin(routePosition(distance).toArray());
  if (p[2] < 8.7 && p[2] > 6.8 && Math.abs(p[0] - 1.16) < 1) return 0.46;
  if (distance > ROUTE_ANCHORS.porch && distance < ROUTE_ANCHORS.room)
    return 0.65;
  if (distance > ROUTE_ANCHORS.room) return 0.76;
  return 1.28;
}
function travel(t: number): number {
  const a = 0.13,
    v = 1 / (1 - a);
  if (t < a)
    return v * (t / 2 - (a * Math.sin((Math.PI * t) / a)) / (2 * Math.PI));
  if (t > 1 - a) return 1 - travel(1 - t);
  return v * (t - a / 2);
}
function createSpan(from: number, to: number) {
  const count = Math.max(30, Math.ceil(Math.abs(to - from) / 0.035)),
    table = [{ d: from, t: 0 }];
  let time = 0;
  for (let i = 1; i <= count; i++) {
    const d = lerp(from, to, i / count);
    time += Math.abs(d - table[i - 1].d) / desiredSpeed(d);
    table.push({ d, t: time });
  }
  return {
    duration: time / 0.87,
    at(f: number) {
      const wanted = travel(Math.max(0, Math.min(1, f))) * time;
      let lo = 0,
        hi = table.length - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (table[m].t < wanted) lo = m;
        else hi = m;
      }
      const a = table[lo],
        b = table[hi];
      return lerp(a.d, b.d, (wanted - a.t) / (b.t - a.t || 1));
    },
  };
}
const LAKE: Point = [-70, 8, -35],
  LAKE_DETAIL: Point = [-90, 6, -18],
  CABIN_REVEAL = cabinToWorld([-0.3, 4.9, 4.6]),
  DOOR_LOOK = cabinToWorld([1.11, 2.55, 4.4]),
  ROOM_LOOK = cabinToWorld([-2.4, 2.7, -2.5]),
  WINDOW_LOOK = cabinToWorld([-3.8, 3.0, 5.6]),
  SCREEN = LAPTOP_SCREEN_CENTER_WORLD;
type Beat = {
  label: string;
  phase: JourneyPhase;
  from: number;
  to: number;
  lookA: Point;
  lookB: Point;
  duration: number;
  span?: ReturnType<typeof createSpan>;
  openA: number;
  openB: number;
};
function beat(
  label: string,
  phase: JourneyPhase,
  from: number,
  to: number,
  lookA: Point,
  lookB: Point,
  duration: number,
  openA = 0,
  openB = openA,
): Beat {
  const span = from === to ? undefined : createSpan(from, to);
  return {
    label,
    phase,
    from,
    to,
    lookA,
    lookB,
    duration: span?.duration ?? duration,
    span,
    openA,
    openB,
  };
}
export const TOUR_BEATS: Beat[] = [
  beat(
    "湖岸 · 留意水面与远山",
    "AUTO_WALKING_TO_CABIN",
    0,
    0,
    LAKE,
    LAKE_DETAIL,
    3.4,
  ),
  beat(
    "发现木屋 · 先转动视线",
    "AUTO_WALKING_TO_CABIN",
    0,
    0,
    LAKE_DETAIL,
    CABIN_REVEAL,
    4.8,
  ),
  beat(
    "沿湖岸小径步行",
    "CABIN_APPROACH",
    0,
    ROUTE_ANCHORS.porch,
    CABIN_REVEAL,
    DOOR_LOOK,
    0,
  ),
  beat(
    "门廊 · 稍停，观察木门",
    "CABIN_DOOR",
    ROUTE_ANCHORS.porch,
    ROUTE_ANCHORS.door,
    DOOR_LOOK,
    DOOR_LOOK,
    0,
  ),
  beat(
    "门槛 · 等待房门打开",
    "CABIN_DOOR",
    ROUTE_ANCHORS.door,
    ROUTE_ANCHORS.door,
    DOOR_LOOK,
    ROOM_LOOK,
    3.2,
    0,
    1,
  ),
  beat(
    "经过真实门洞，进入暖光",
    "CABIN_INTERIOR",
    ROUTE_ANCHORS.door,
    ROUTE_ANCHORS.room,
    ROOM_LOOK,
    ROOM_LOOK,
    0,
    1,
  ),
  beat(
    "室内 · 再看一眼窗外的湖",
    "CABIN_INTERIOR",
    ROUTE_ANCHORS.room,
    ROUTE_ANCHORS.room,
    ROOM_LOOK,
    WINDOW_LOOK,
    6.2,
    1,
  ),
  beat(
    "发现书桌 · 自然转向 Mac",
    "CABIN_INTERIOR",
    ROUTE_ANCHORS.room,
    ROUTE_ANCHORS.room,
    WINDOW_LOOK,
    SCREEN,
    3.2,
    1,
  ),
  beat(
    "来到书桌前 · 慢慢停下",
    "WALKING_TO_DESK",
    ROUTE_ANCHORS.room,
    ROUTE_ANCHORS.desk,
    SCREEN,
    SCREEN,
    0,
    1,
  ),
];
export const TOUR_DURATION = TOUR_BEATS.reduce((sum, b) => sum + b.duration, 0);
export function sampleTour(time: number) {
  let t = Math.max(0, Math.min(time, TOUR_DURATION)),
    b = TOUR_BEATS.at(-1)!;
  let offset = 0;
  for (const candidate of TOUR_BEATS) {
    b = candidate;
    if (t <= candidate.duration) break;
    t -= candidate.duration;
    offset += candidate.duration;
  }
  const f = Math.max(0, Math.min(1, t / b.duration)),
    distance = b.span?.at(f) ?? b.from,
    position = routePosition(distance),
    quaternion = lookRotation(position, b.lookA).slerp(
      lookRotation(position, b.lookB),
      ease(f),
    );
  return {
    position,
    quaternion,
    distance,
    door: lerp(b.openA, b.openB, ease(f)),
    beat: b,
    beatIndex: TOUR_BEATS.indexOf(b),
    time: offset + t,
  };
}
export type JourneySnapshot = {
  phase: JourneyPhase;
  label: string;
  moving: boolean;
  autoUsed: boolean;
  interacted: boolean;
  idleSeconds: number;
  reducedMotion: boolean;
  ready: boolean;
  version: number;
};
export class Journey {
  private listeners = new Set<() => void>();
  private version = 0;
  private snap: JourneySnapshot;
  ready = false;
  phase: JourneyPhase = "BOOT";
  label = "正在准备湖岸";
  reducedMotion = false;
  autoUsed = false;
  interacted = false;
  blocked = false;
  tourTime = 0;
  distance = 0;
  door = 0;
  dockProgress = 0;
  position = routePosition(0);
  quaternion = lookRotation(this.position, LAKE);
  fov = 52;
  private autoIdle = 0;
  private running = false;
  private isAuto = false;
  private rate = 0;
  private yaw = 0;
  private pitch = 0;
  private baseRotation = this.quaternion.clone();
  private resumeRotation: Quaternion | null = null;
  private resumeBlend = 0;
  private navigation: {
    span: ReturnType<typeof createSpan>;
    elapsed: number;
    destination: "lake" | "room" | "desk";
    turn: number;
    fromRotation: Quaternion;
  } | null = null;
  private dockTime = 0;
  private exitProgress = 1;
  private exitPosition = new Vector3();
  private exitRotation = new Quaternion();
  private dockFromPosition = this.position.clone();
  private dockFromRotation = this.quaternion.clone();
  private savedDesk: {
    position: Vector3;
    quaternion: Quaternion;
    distance: number;
  } | null = null;
  constructor() {
    this.snap = this.makeSnapshot();
  }
  private makeSnapshot(): JourneySnapshot {
    return {
      phase: this.phase,
      label: this.label,
      moving:
        this.running ||
        !!this.navigation ||
        this.phase === "ENTERING_DESKTOP" ||
        this.phase === "EXITING_DESKTOP",
      autoUsed: this.autoUsed,
      interacted: this.interacted,
      idleSeconds:
        this.phase === "LAKESHORE_IDLE" &&
        !this.interacted &&
        !this.autoUsed &&
        !this.reducedMotion
          ? Math.max(0, 5 - Math.floor(this.autoIdle))
          : 0,
      reducedMotion: this.reducedMotion,
      ready: this.ready,
      version: this.version,
    };
  }
  getSnapshot = () => this.snap;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    const s = this.makeSnapshot();
    if (
      Object.keys(s)
        .filter((k) => k !== "version")
        .every(
          (k) =>
            s[k as keyof JourneySnapshot] ===
            this.snap[k as keyof JourneySnapshot],
        )
    )
      return;
    this.version++;
    this.snap = { ...s, version: this.version };
    for (const listener of this.listeners) listener();
  }
  setReady() {
    this.ready = true;
    if (this.phase === "BOOT") {
      this.phase =
        this.distance === 0
          ? this.interacted || this.reducedMotion
            ? "MANUAL_EXPLORATION"
            : "LAKESHORE_IDLE"
          : "DESK_READY";
      this.label =
        this.distance === 0
          ? this.interacted || this.reducedMotion
            ? "自由环视 · 可前往木屋"
            : "湖岸 · 五秒后随我走向木屋"
          : "书桌已就绪，请点击 Mac";
    }
    this.emit();
  }
  setReducedMotion(value: boolean) {
    if (value === this.reducedMotion) return;
    this.reducedMotion = value;
    if (value) {
      this.interrupt();
      this.autoUsed = true;
    }
    this.emit();
  }
  setBlocked(value: boolean) {
    this.blocked = value;
    if (value) this.autoIdle = 0;
  }
  startGuide(automatic = false) {
    if (
      !this.ready ||
      ["DESKTOP", "ENTERING_DESKTOP", "EXITING_DESKTOP"].includes(this.phase)
    )
      return;
    if (this.reducedMotion) {
      this.navigate("desk");
      return;
    }
    this.navigation = null;
    this.autoUsed = true;
    this.isAuto = automatic;
    this.running = true;
    this.rate = 0;
    this.resumeRotation = this.quaternion.clone();
    this.resumeBlend = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.emit();
  }
  interact() {
    this.interacted = true;
    if (this.running || this.navigation) this.interrupt();
    else {
      if (this.phase === "LAKESHORE_IDLE") {
        this.phase = "MANUAL_EXPLORATION";
        this.label = "自由环视 · 可前往木屋";
      }
      this.emit();
    }
  }
  interrupt() {
    if (this.navigation) {
      let offset = 0;
      for (const b of TOUR_BEATS) {
        if (
          b.span &&
          this.distance >= b.from - 0.001 &&
          this.distance <= b.to + 0.001
        ) {
          let lo = 0,
            hi = 1;
          for (let i = 0; i < 36; i++) {
            const m = (lo + hi) / 2;
            if (b.span.at(m) < this.distance) lo = m;
            else hi = m;
          }
          this.tourTime = offset + ((lo + hi) / 2) * b.duration;
          break;
        }
        offset += b.duration;
      }
    }
    this.running = false;
    this.navigation = null;
    this.rate = 0;
    this.baseRotation.copy(this.quaternion);
    this.yaw = 0;
    this.pitch = 0;
    if (
      ![
        "DESKTOP",
        "ENTERING_DESKTOP",
        "EXITING_DESKTOP",
        "BOOT",
        "DESK_READY",
      ].includes(this.phase)
    ) {
      this.phase = "MANUAL_EXPLORATION";
      this.label = "自由环视 · 可继续前往木屋";
    }
    this.emit();
  }
  look(dx: number, dy: number) {
    this.interact();
    this.yaw -= dx * 0.0032;
    this.pitch = Math.max(-0.58, Math.min(0.58, this.pitch - dy * 0.0028));
    this.quaternion.copy(this.baseRotation);
    this.quaternion.premultiply(
      new Quaternion().setFromAxisAngle(UP, this.yaw),
    );
    this.quaternion.multiply(
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), this.pitch),
    );
  }
  navigate(destination: "lake" | "room" | "desk") {
    if (
      !this.ready ||
      this.phase === "DESKTOP" ||
      this.phase === "ENTERING_DESKTOP" ||
      this.phase === "EXITING_DESKTOP"
    )
      return;
    this.interacted = true;
    this.autoUsed = true;
    this.running = false;
    if (this.reducedMotion) {
      this.navigation = null;
      this.distance = ROUTE_ANCHORS[destination];
      this.position.copy(routePosition(this.distance));
      this.quaternion.copy(
        lookRotation(
          this.position,
          destination === "desk"
            ? SCREEN
            : destination === "lake"
              ? LAKE
              : WINDOW_LOOK,
        ),
      );
      this.baseRotation.copy(this.quaternion);
      this.door = destination === "lake" ? 0 : 1;
      this.phase =
        destination === "desk"
          ? "DESK_READY"
          : destination === "lake"
            ? "MANUAL_EXPLORATION"
            : "CABIN_INTERIOR";
      this.label = "减少动态 · 已到达安全位置";
      this.emit();
      return;
    }
    if (destination === "desk" && this.distance < ROUTE_ANCHORS.room - 0.05) {
      this.startGuide(false);
      return;
    }
    const target = ROUTE_ANCHORS[destination];
    if (Math.abs(target - this.distance) < 0.01) {
      this.phase =
        destination === "desk"
          ? "DESK_READY"
          : destination === "lake"
            ? "MANUAL_EXPLORATION"
            : "CABIN_INTERIOR";
      this.emit();
      return;
    }
    this.navigation = {
      span: createSpan(this.distance, target),
      elapsed: 0,
      destination,
      turn: 0,
      fromRotation: this.quaternion.clone(),
    };
    this.phase =
      destination === "desk"
        ? "WALKING_TO_DESK"
        : destination === "lake"
          ? "MANUAL_EXPLORATION"
          : "CABIN_INTERIOR";
    this.label =
      destination === "lake" ? "转身，沿原路返回湖岸" : "沿安全路线步行";
    this.emit();
  }
  spawnAtDesk() {
    this.distance = ROUTE_ANCHORS.desk;
    this.position.copy(routePosition(this.distance));
    this.quaternion.copy(lookRotation(this.position, SCREEN));
    this.baseRotation.copy(this.quaternion);
    this.tourTime = TOUR_DURATION;
    this.autoUsed = true;
    this.interacted = true;
    this.door = 1;
    if (this.ready) this.phase = "DESK_READY";
    this.emit();
  }
  requestDesktop() {
    if (this.phase !== "DESK_READY") return false;
    this.interacted = true;
    this.savedDesk = {
      position: this.position.clone(),
      quaternion: this.quaternion.clone(),
      distance: this.distance,
    };
    this.dockFromPosition.copy(this.position);
    this.dockFromRotation.copy(this.quaternion);
    this.dockTime = 0;
    this.phase = "ENTERING_DESKTOP";
    this.label = "靠近屏幕";
    this.emit();
    return true;
  }
  exitDesktop() {
    if (this.phase !== "DESKTOP") return;
    this.exitPosition.copy(this.position);
    this.exitRotation.copy(this.quaternion);
    this.exitProgress = this.dockProgress;
    this.phase = "EXITING_DESKTOP";
    this.label = "回到书桌前";
    this.dockTime = 0;
    this.emit();
  }
  cancelDock() {
    if (this.phase !== "ENTERING_DESKTOP") return;
    this.exitPosition.copy(this.position);
    this.exitRotation.copy(this.quaternion);
    this.exitProgress = this.dockProgress;
    this.phase = "EXITING_DESKTOP";
    this.dockTime = 0;
    this.label = "取消进入，回到桌前";
    this.emit();
  }
  private restoreDesk() {
    if (this.savedDesk) {
      this.position.copy(this.savedDesk.position);
      this.quaternion.copy(this.savedDesk.quaternion);
      this.distance = this.savedDesk.distance;
    }
    this.dockProgress = 0;
    this.phase = "DESK_READY";
    this.baseRotation.copy(this.quaternion);
    this.emit();
  }
  update(dt: number, visible = true) {
    if (!this.ready || !visible || this.blocked) return;
    const step = Math.max(0, Math.min(dt, 0.075));
    if (
      this.phase === "LAKESHORE_IDLE" &&
      !this.interacted &&
      !this.autoUsed &&
      !this.reducedMotion
    ) {
      this.autoIdle += Math.max(0, dt);
      if (this.autoIdle >= 5) this.startGuide(true);
      this.emit();
    }
    if (this.running) {
      this.rate = Math.min(1, this.rate + step / 1.0);
      this.tourTime = Math.min(TOUR_DURATION, this.tourTime + step * this.rate);
      const sample = sampleTour(this.tourTime);
      this.position.copy(sample.position);
      this.quaternion.copy(sample.quaternion);
      this.resumeBlend = Math.min(1, this.resumeBlend + step / 1.4);
      if (this.resumeRotation && this.resumeBlend < 1)
        this.quaternion
          .copy(this.resumeRotation)
          .slerp(sample.quaternion, ease(this.resumeBlend));
      this.distance = sample.distance;
      this.door = sample.door;
      this.phase =
        this.isAuto && sample.beatIndex < 2
          ? "AUTO_WALKING_TO_CABIN"
          : sample.beat.phase;
      this.label = sample.beat.label;
      if (this.tourTime === TOUR_DURATION) {
        this.running = false;
        this.phase = "DESK_READY";
        this.label = "已到书桌前 · 请主动点击 Mac";
        this.baseRotation.copy(this.quaternion);
      }
      this.emit();
    }
    if (this.navigation) {
      const n = this.navigation;
      n.turn += step;
      const direction = n.span.at(1) > n.span.at(0) ? 1 : -1;
      const lookDistance = Math.max(
        0,
        Math.min(total, this.distance + direction * 1.5),
      );
      const tangentTarget = routePosition(lookDistance);
      if (tangentTarget.distanceTo(this.position) < 0.1)
        tangentTarget
          .copy(this.position)
          .add(
            WALK_ROUTE.getTangentAt(
              Math.max(0.001, Math.min(0.999, this.distance / total)),
            ).multiplyScalar(direction),
          );
      const targetRotation = lookRotation(
        this.position,
        tangentTarget.toArray(),
      );
      if (n.turn < 2.2) {
        this.quaternion
          .copy(n.fromRotation)
          .slerp(targetRotation, ease(n.turn / 2.2));
      } else {
        n.elapsed += step;
        this.distance = n.span.at(Math.min(1, n.elapsed / n.span.duration));
        this.position.copy(routePosition(this.distance));
        this.quaternion.slerp(targetRotation, 1 - Math.exp(-step * 3.2));
      }
      this.door = Math.min(1, this.door + step / 0.85);
      if (n.elapsed >= n.span.duration) {
        this.navigation = null;
        this.tourTime =
          n.destination === "lake"
            ? 0
            : n.destination === "desk"
              ? TOUR_DURATION
              : TOUR_BEATS.slice(0, 6).reduce((sum, b) => sum + b.duration, 0);
        this.phase =
          n.destination === "desk"
            ? "DESK_READY"
            : n.destination === "room"
              ? "CABIN_INTERIOR"
              : "MANUAL_EXPLORATION";
        if (n.destination === "desk")
          this.quaternion.copy(lookRotation(this.position, SCREEN));
        this.baseRotation.copy(this.quaternion);
        this.label =
          n.destination === "desk" ? "请点击 Mac" : "可以继续环视或前往书桌";
      }
      this.emit();
    }
    if (this.phase === "ENTERING_DESKTOP") {
      this.dockTime += step;
      const lean = ease(this.dockTime / (this.reducedMotion ? 0.25 : 1.7)),
        end = new Vector3(...cabinToWorld(INTERIOR_ANCHORS.screenLean));
      this.position.lerpVectors(this.dockFromPosition, end, lean);
      this.quaternion
        .copy(this.dockFromRotation)
        .slerp(lookRotation(end, SCREEN), lean);
      this.dockProgress = ease(
        (this.dockTime - (this.reducedMotion ? 0.25 : 1.7)) /
          (this.reducedMotion ? 0.2 : 1.25),
      );
      if (this.dockProgress === 1) {
        this.phase = "DESKTOP";
        this.label = "资料桌面";
        this.emit();
      }
    } else if (this.phase === "EXITING_DESKTOP") {
      this.dockTime += step;
      this.dockProgress =
        this.exitProgress *
        (1 - ease(this.dockTime / (this.reducedMotion ? 0.2 : 1.25)));
      if (this.dockProgress === 0) {
        const f = ease(
          (this.dockTime - (this.reducedMotion ? 0.2 : 1.25)) /
            (this.reducedMotion ? 0.25 : 1.7),
        );
        if (this.savedDesk) {
          this.position.lerpVectors(
            this.exitPosition,
            this.savedDesk.position,
            f,
          );
          this.quaternion
            .copy(this.exitRotation)
            .slerp(this.savedDesk.quaternion, f);
        }
        if (f === 1) this.restoreDesk();
      }
    }
  }
  exportState() {
    return {
      ...this.snap,
      tourSeconds: this.tourTime,
      tourDuration: TOUR_DURATION,
      distance: this.distance,
      doorOpenness: this.door,
      dockProgress: this.dockProgress,
      position: this.position.toArray(),
      quaternion: this.quaternion.toArray(),
      eyeHeight: EYE_HEIGHT,
      beats: TOUR_BEATS.map((b) => ({
        label: b.label,
        phase: b.phase,
        seconds: b.duration,
      })),
    };
  }
}
export const journey = new Journey();
