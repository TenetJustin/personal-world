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
import { Euler } from "three/src/math/Euler.js";
import { Walker, canStep, planSafePath, canMoveDoor } from "./locomotion.ts";
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
  if (p[2] < 8.7 && p[2] > 6.8 && Math.abs(p[0] - 1.16) < 1) return 0.72;
  if (distance > ROUTE_ANCHORS.porch && distance < ROUTE_ANCHORS.room)
    return 1.35;
  if (distance > ROUTE_ANCHORS.room) return 1.6;
  return 2.6;
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
    1.2,
  ),
  beat(
    "发现木屋 · 先转动视线",
    "AUTO_WALKING_TO_CABIN",
    0,
    0,
    LAKE_DETAIL,
    CABIN_REVEAL,
    1.7,
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
    1.1,
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
    1.6,
    1,
  ),
  beat(
    "发现书桌 · 自然转向 Mac",
    "CABIN_INTERIOR",
    ROUTE_ANCHORS.room,
    ROUTE_ANCHORS.room,
    WINDOW_LOOK,
    SCREEN,
    1.1,
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
/** Convert a physical route distance to its corresponding moving cinematic beat. */
function timeAtDistance(distance: number) {
  let offset = 0;
  for (const b of TOUR_BEATS) {
    if (b.span && distance >= b.from - 0.001 && distance <= b.to + 0.001) {
      let lo = 0,
        hi = 1;
      for (let i = 0; i < 32; i++) {
        const m = (lo + hi) / 2;
        if (b.span.at(m) < distance) lo = m;
        else hi = m;
      }
      return offset + ((lo + hi) / 2) * b.duration;
    }
    offset += b.duration;
  }
  return distance >= ROUTE_ANCHORS.desk ? TOUR_DURATION : 0;
}
function nearestRoute(position: Vector3) {
  let best = 0,
    error = Infinity;
  for (let i = 0; i <= 600; i++) {
    const d = (total * i) / 600,
      p = routePosition(d),
      e = p.distanceToSquared(position);
    if (e < error) {
      error = e;
      best = d;
    }
  }
  return best;
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
  readonly walker = new Walker();
  private connector: {
    points: Vector3[];
    index: number;
    distance: number;
    after: () => void;
  } | null = null;
  private doorTarget = 0;
  private wasNearDoor = false;
  private manualDoorOverride = false;
  private resumeOffset = new Vector3();
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
        !!this.connector ||
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
    if (value) {
      this.autoIdle = 0;
      this.clearMovement();
    }
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
    if (this.connectToRoute(() => this.startGuide(automatic))) return;
    this.clearMovement();
    this.resumeOffset
      .copy(this.position)
      .sub(routePosition(nearestRoute(this.position)));
    this.resumeBlend = 0;
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
    if (this.running || this.navigation || this.connector) this.interrupt();
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
    this.connector = null;
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
    if (["ENTERING_DESKTOP", "EXITING_DESKTOP", "DESKTOP"].includes(this.phase))
      return;
    this.interact();
    const e = new Euler().setFromQuaternion(this.quaternion, "YXZ");
    e.y -= dx * 0.0032;
    e.x = Math.max(-1.4, Math.min(1.4, e.x - dy * 0.0028));
    e.z = 0;
    this.quaternion.setFromEuler(e);
    this.baseRotation.copy(this.quaternion);
  }
  setMoveInput(forward: number, strafe: number, sprint = false) {
    if (
      !this.ready ||
      this.blocked ||
      ["ENTERING_DESKTOP", "EXITING_DESKTOP", "DESKTOP"].includes(this.phase)
    )
      return;
    if (forward || strafe) {
      this.interact();
      this.phase = "MANUAL_EXPLORATION";
      this.label = "WASD 自由探索 · 鼠标观察";
    }
    this.walker.input(forward, strafe, sprint);
    this.emit();
  }
  clearMovement() {
    this.walker.clear();
  }
  toggleDoor() {
    this.interact();
    this.manualDoorOverride = true;
    this.doorTarget = this.door > 0.5 ? 0 : 1;
  }
  /** Verification-only pose override; never used by the product journey. */
  setPose(position: number[], target: number[]) {
    this.interrupt();
    this.clearMovement();
    this.phase = "MANUAL_EXPLORATION";
    this.interacted = true;
    const eye = new Vector3(...position);
    this.position.copy(eye);
    this.distance = nearestRoute(eye);
    this.tourTime = timeAtDistance(this.distance);
    this.quaternion.copy(lookRotation(eye, target as unknown as Point));
    this.baseRotation.copy(this.quaternion);
    this.emit();
  }
  get canUseComputer() {
    const p = worldToCabin(this.position.toArray());
    return (
      Math.hypot(p[0] + 3.6, p[2] - 1.1) < 1.45 && Math.abs(p[1] - 3.02) < 0.35
    );
  }
  private connectToRoute(after: () => void) {
    const d = nearestRoute(this.position),
      target = routePosition(d);
    if (this.position.distanceTo(target) < 0.055) {
      this.distance = d;
      if (this.phase === "MANUAL_EXPLORATION")
        this.tourTime = timeAtDistance(d);
      return false;
    }
    const path = planSafePath(this.position, target);
    this.running = false;
    this.navigation = null;
    this.clearMovement();
    this.interacted = true;
    this.autoUsed = true;
    if (!path) {
      this.phase = "MANUAL_EXPLORATION";
      this.label = "当前位置没有安全接入路径，请先走到开阔通道";
      this.emit();
      return true;
    }
    this.connector = { points: path, index: 0, distance: d, after };
    this.doorTarget = 1;
    this.phase = "MANUAL_EXPLORATION";
    this.label = "沿可通行地面接回引导路线";
    this.emit();
    return true;
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
    if (this.connectToRoute(() => this.navigate(destination))) return;
    this.clearMovement();
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
      this.label =
        destination === "desk"
          ? "请点击 Mac"
          : destination === "lake"
            ? "已返回湖岸 · 可以自由探索"
            : "已到达木屋客厅";
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
    if (
      !this.canUseComputer ||
      ["DESKTOP", "ENTERING_DESKTOP", "EXITING_DESKTOP"].includes(this.phase)
    )
      return false;
    this.interrupt();
    this.clearMovement();
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
    const local = worldToCabin(this.position.toArray());
    const nearDoor =
      Math.abs(local[0] - 1.11) < 1.8 && Math.abs(local[2] - 4.5) < 2.4;
    if (!nearDoor) this.manualDoorOverride = false;
    if (nearDoor && !this.wasNearDoor && !this.manualDoorOverride)
      this.doorTarget = 1;
    this.wasNearDoor = nearDoor;
    if (!this.running && !this.navigation) {
      const next =
        this.door +
        Math.sign(this.doorTarget - this.door) *
          Math.min(Math.abs(this.doorTarget - this.door), step / 0.65);
      if (next >= this.door || canMoveDoor(this.position, this.door, next))
        this.door = next;
    }
    if (this.connector) {
      const c = this.connector,
        target = c.points[c.index],
        delta = target.clone().sub(this.position),
        horizontal = Math.hypot(delta.x, delta.z);
      if (horizontal < 0.035 && Math.abs(delta.y) < 0.28) {
        this.walker.clear();
        this.position.copy(target);
        c.index++;
        if (c.index >= c.points.length) {
          this.connector = null;
          this.distance = c.distance;
          this.tourTime = timeAtDistance(c.distance);
          c.after();
        }
      } else {
        const rotation = lookRotation(this.position, [
          target.x,
          this.position.y,
          target.z,
        ]);
        this.quaternion.rotateTowards(rotation, step * 1.65);
        // A* has proved this straight segment clear. Follow that exact swept
        // vector and brake before its endpoint; do not carry sideways inertia
        // through a stair-guard corner or re-project into world-axis steps.
        const onStair =
          Math.abs(local[0] + 4.875) < 0.8 &&
          local[2] > -3.6 &&
          local[2] < 0.55;
        const speed = onStair ? 1.05 : 2.2;
        const amount = Math.min(horizontal, speed * step);
        if (!this.walker.follow(this.position, target, amount, this.door)) {
          // The only dynamic obstacle is the opening door: wait for it instead
          // of discarding a valid route during its opening animation.
          if (this.walker.lastCollision === "door" && this.doorTarget === 1)
            return;
          this.connector = null;
          this.clearMovement();
          this.label = "接入路径受阻，请手动离开障碍后继续";
          this.emit();
        }
      }
      return;
    }
    if (
      !this.running &&
      !this.navigation &&
      !["ENTERING_DESKTOP", "EXITING_DESKTOP", "DESKTOP"].includes(this.phase)
    ) {
      if (
        this.walker.forward ||
        this.walker.strafe ||
        this.walker.velocity.lengthSq() > 0
      ) {
        this.walker.update(this.position, this.quaternion, step, this.door);
        this.distance = nearestRoute(this.position);
        if (this.canUseComputer) {
          this.phase = "DESK_READY";
          this.label = "书桌在眼前 · 点击 Mac 打开资料";
        }
        this.emit();
      }
    }
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
      if (!canStep(this.position, sample.position, sample.door)) {
        this.interrupt();
        this.label = "引导通道受阻，请手动探索后重新接入";
        this.emit();
        return;
      }
      this.resumeBlend = Math.min(1, this.resumeBlend + step / 1.4);
      // Adopt the authored route from the retained pose instead of snapping onto it.
      this.position
        .copy(sample.position)
        .addScaledVector(this.resumeOffset, 1 - ease(this.resumeBlend));
      this.quaternion.copy(sample.quaternion);
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
        const nextPosition = routePosition(this.distance);
        if (!canStep(this.position, nextPosition, this.door)) {
          this.interrupt();
          this.label = "安全路线被阻挡，请手动调整位置";
          return;
        }
        this.position.copy(nextPosition);
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
      freeMovement: {
        forward: this.walker.forward,
        strafe: this.walker.strafe,
        velocity: this.walker.velocity.toArray(),
        collision: this.walker.lastCollision,
      },
      safeConnector: this.connector
        ? { remaining: this.connector.points.length - this.connector.index }
        : null,
      canUseComputer: this.canUseComputer,
      fov: this.fov,
      beats: TOUR_BEATS.map((b) => ({
        label: b.label,
        phase: b.phase,
        seconds: b.duration,
      })),
    };
  }
}
export const journey = new Journey();
