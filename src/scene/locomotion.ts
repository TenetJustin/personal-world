/** Shared first-person capsule clearance and 2.5D safe route planning. Metres. */
import { Vector3 } from "three/src/math/Vector3.js";
import { Quaternion } from "three/src/math/Quaternion.js";
import {
  CABIN,
  WALK_COLLIDERS,
  architecturalFloor,
  cabinToWorld,
  worldToCabin,
  interiorCeilingHeight,
  interiorStairHeight,
  hasUpperFloor,
} from "./architecture.ts";
import { groundHeight } from "./landscape.ts";
export const BODY_RADIUS = 0.22,
  BODY_HEIGHT = 1.76,
  MAX_STEP = 0.235,
  EYE = 1.65;
export type Obstacle = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
};
const obstacles: Obstacle[] = [];
export function resetEnvironmentColliders() {
  obstacles.length = 0;
}
export function addEnvironmentCollider(c: Obstacle) {
  obstacles.push(c);
}
export function environmentColliderCount() {
  return obstacles.length;
}
const box = (
  x: number,
  z: number,
  r: number,
  b: { minX: number; maxX: number; minZ: number; maxZ: number },
) =>
  Math.hypot(
    x - Math.max(b.minX, Math.min(b.maxX, x)),
    z - Math.max(b.minZ, Math.min(b.maxZ, z)),
  ) < r;
const wall = (
  id: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Obstacle => ({ id, minX, maxX, minZ, maxZ, minY: 0.4, maxY: 9 });
const shell = [
  wall("west-wall", -6.15, -5.82, -4.7, 4.7),
  wall("east-wall", 5.82, 6.15, -4.7, 4.7),
  wall("rear-wall", -6.15, 6.15, -4.72, -4.32),
  wall("front-left", -6.15, 0.555, 4.32, 4.7),
  wall("front-right", 1.665, 6.15, 4.32, 4.7),
  wall("porch-west-rail", -8.22, -8.08, 4.45, 7.12),
  wall("porch-east-rail", 8.08, 8.22, 4.45, 7.12),
  wall("porch-front-left", -8.17, 0.12, 6.96, 7.1),
  wall("porch-front-right", 2.2, 8.17, 6.96, 7.1),
];
/** The authored porch treads are walked as the same smooth 5-tread ramp used by the
 * cinematic route, so collision and camera agree to the millimetre. */
export function exteriorStairFloor(x: number, z: number) {
  const b = CABIN.stairs;
  if (x < b.minX || x > b.maxX || z < 6.93 || z > 8.43) return null;
  const base = cabinToWorld([x, 0, 8.43]);
  return (
    groundHeight(base[0], base[2]) +
    (CABIN.porch.floorY - groundHeight(base[0], base[2])) *
      Math.max(0, Math.min(1, (8.43 - z) / 1.5))
  );
}
export function floorAt(x: number, z: number, foot: number) {
  const p = worldToCabin([x, 0, z]);
  return (
    exteriorStairFloor(p[0], p[2]) ??
    architecturalFloor(p[0], p[2], foot) ??
    groundHeight(x, z)
  );
}
export function clearance(
  x: number,
  z: number,
  foot: number,
  door = 1,
): string | null {
  if (x < -16 || x > 64 || z < -44 || z > 70) return "world-boundary";
  const p = worldToCabin([x, foot, z]),
    lx = p[0],
    lz = p[2];
  for (const b of shell) if (box(lx, lz, BODY_RADIUS, b)) return b.id;
  if (Math.abs(lx) < 5.82 && Math.abs(lz) < 4.32) {
    if (foot < CABIN.floorY - 0.24) return "foundation";
    if (interiorCeilingHeight(lx, lz, foot) < foot + BODY_HEIGHT)
      return "headroom";
  }
  for (const b of WALK_COLLIDERS)
    if (
      foot < b.maxY - 0.035 &&
      foot + BODY_HEIGHT > b.minY + 0.035 &&
      box(lx, lz, BODY_RADIUS, b)
    )
      return b.id;
  if (doorIntersectsCapsule(x, z, foot, door)) return "door";
  for (const b of obstacles)
    if (
      foot < b.maxY - 0.03 &&
      foot + BODY_HEIGHT > b.minY + 0.03 &&
      box(x, z, BODY_RADIUS, b)
    )
      return b.id;
  if (architecturalFloor(lx, lz, foot) === null) {
    if (groundHeight(x, z) < 0.075) return "shore-water";
    const dx = (groundHeight(x + 0.15, z) - groundHeight(x - 0.15, z)) / 0.3,
      dz = (groundHeight(x, z + 0.15) - groundHeight(x, z - 0.15)) / 0.3;
    if (Math.hypot(dx, dz) > Math.tan((38 * Math.PI) / 180)) return "slope";
  }
  return null;
}
/** Exact rotating leaf test, shared by body movement and door closing. */
export function doorIntersectsCapsule(
  x: number,
  z: number,
  foot: number,
  openness: number,
) {
  if (foot >= CABIN.door.topY || foot + BODY_HEIGHT <= CABIN.door.bottomY)
    return false;
  const [lx, , lz] = worldToCabin([x, foot, z]);
  const a = openness * CABIN.door.swingRadians,
    dx = lx - 0.55,
    dz = lz - 4.5;
  const ux = Math.cos(a) * dx - Math.sin(a) * dz,
    uz = Math.sin(a) * dx + Math.cos(a) * dz;
  return box(ux, uz, BODY_RADIUS, {
    minX: 0,
    maxX: 1.12,
    minZ: -0.045,
    maxZ: 0.045,
  });
}
/** Sample the angular sweep as well as the destination: a closing leaf cannot
 * pass through a stationary person and end clear on their other side. */
export function canMoveDoor(position: Vector3, from: number, to: number) {
  const count = Math.max(1, Math.ceil(Math.abs(to - from) / 0.008));
  for (let i = 1; i <= count; i++)
    if (
      doorIntersectsCapsule(
        position.x,
        position.z,
        position.y - EYE,
        from + ((to - from) * i) / count,
      )
    )
      return false;
  return true;
}
/** Capsule sweep over the same floor samples used during route planning.
 * Advance along the complete XZ vector, so a diagonal safe path cannot acquire
 * a different corner clearance from separate world-axis motion. */
function sweepGround(from: Vector3, to: Vector3, door: number) {
  const result = from.clone();
  const n = Math.max(
    1,
    Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.025),
  );
  let foot = from.y - EYE;
  for (let i = 1; i <= n; i++) {
    const f = i / n,
      x = from.x + (to.x - from.x) * f,
      z = from.z + (to.z - from.z) * f,
      next = floorAt(x, z, foot);
    const collision =
      next - foot > MAX_STEP
        ? "step-height"
        : foot - next > 0.28
          ? "unsafe-drop"
          : clearance(x, z, next, door);
    if (collision) return { position: result, collision };
    result.set(x, next + EYE, z);
    foot = next;
  }
  return { position: result, collision: null };
}
export function canStep(from: Vector3, to: Vector3, door = 1) {
  const result = sweepGround(from, to, door);
  return result.collision === null && Math.abs(result.position.y - to.y) < 0.26;
}
export class Walker {
  velocity = new Vector3();
  vertical = 0;
  lastCollision = "";
  forward = 0;
  strafe = 0;
  sprint = false;
  clear() {
    this.forward = this.strafe = 0;
    this.sprint = false;
    this.velocity.set(0, 0, 0);
    this.vertical = 0;
  }
  input(forward: number, strafe: number, sprint = false) {
    const l = Math.max(1, Math.hypot(forward, strafe));
    this.forward = forward / l;
    this.strafe = strafe / l;
    this.sprint = sprint;
  }
  /** Follow one already planned segment without residual sideways velocity.
   * Planning and execution both call sweepGround; each step is bounded by speed.
   * The caller controls camera easing independently of the body's safe direction. */
  follow(position: Vector3, target: Vector3, distance: number, door: number) {
    this.forward = this.strafe = 0;
    this.velocity.set(0, 0, 0);
    this.vertical = 0;
    const length = Math.hypot(target.x - position.x, target.z - position.z);
    const f = length > 0 ? Math.min(1, Math.max(0, distance) / length) : 1;
    const end = position.clone().lerp(target, f),
      result = sweepGround(position, end, door);
    position.copy(result.position);
    this.lastCollision = result.collision ?? "";
    return result.collision === null;
  }
  update(position: Vector3, rotation: Quaternion, dt: number, door: number) {
    const forward = new Vector3(0, 0, -1).applyQuaternion(rotation);
    forward.y = 0;
    forward.normalize();
    const right = new Vector3(-forward.z, 0, forward.x),
      speed = this.sprint ? 3.2 : 1.65;
    const desired = forward
      .multiplyScalar(this.forward)
      .addScaledVector(right, this.strafe)
      .multiplyScalar(speed);
    this.velocity.lerp(
      desired,
      1 - Math.exp(-dt * (desired.lengthSq() > 0 ? 9 : 12)),
    );
    if (this.velocity.lengthSq() < 1e-7) this.velocity.set(0, 0, 0);
    const count = Math.max(1, Math.ceil((this.velocity.length() * dt) / 0.035)),
      s = dt / count;
    this.lastCollision = "";
    for (let i = 0; i < count; i++) {
      for (const axis of ["x", "z"] as const) {
        const next = position[axis] + this.velocity[axis] * s,
          x = axis === "x" ? next : position.x,
          z = axis === "z" ? next : position.z;
        const foot = position.y - EYE,
          h = floorAt(x, z, foot),
          reason =
            h - foot > MAX_STEP
              ? "step-height"
              : clearance(x, z, Math.max(foot, h), door);
        if (!reason) {
          position[axis] = next;
          if (h > foot - 0.25) {
            position.y = h + EYE;
            this.vertical = 0;
          }
        } else this.lastCollision = reason;
      }
      const foot = position.y - EYE,
        h = floorAt(position.x, position.z, foot);
      if (foot > h + 0.005) {
        this.vertical -= 9.81 * s;
        position.y = Math.max(h + EYE, position.y + this.vertical * s);
        if (position.y <= h + EYE + 0.001) this.vertical = 0;
      }
    }
  }
}
type Node = {
  i: number;
  j: number;
  layer: number;
  x: number;
  z: number;
  y: number;
  key: string;
  g: number;
  f: number;
  parent?: Node;
};
class Heap {
  items: Node[] = [];
  push(n: Node) {
    let i = this.items.push(n) - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (this.items[p].f <= n.f) break;
      this.items[i] = this.items[p];
      i = p;
    }
    this.items[i] = n;
  }
  pop() {
    const top = this.items[0],
      last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (i * 2 + 1 < this.items.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.items.length && this.items[c + 1].f < this.items[c].f)
          c++;
        if (this.items[c].f >= last.f) break;
        this.items[i] = this.items[c];
        i = c;
      }
      this.items[i] = last;
    }
    return top;
  }
}
/** Both floors coexist in the graph. Only real stair treads connect the layers. */
export function planSafePath(
  start: Vector3,
  target: Vector3,
): Vector3[] | null {
  if (canStep(start, target)) return [target.clone()];
  const a = worldToCabin(start.toArray()),
    b = worldToCabin(target.toArray()),
    grid = 0.25;
  const surface = (i: number, j: number, layer: number) => {
    const x = i * grid,
      z = j * grid,
      stair = interiorStairHeight(x, z);
    let y: number;
    if (stair !== null) y = stair;
    else if (layer === 1) {
      if (!hasUpperFloor(x, z)) return null;
      y = 4.25;
    } else {
      const w = cabinToWorld([x, 0, z]);
      y = architecturalFloor(x, z, 1.37) ?? groundHeight(w[0], w[2]);
    }
    const w = cabinToWorld([x, y + EYE, z]);
    return clearance(w[0], w[2], y) ? null : { x: w[0], z: w[2], y: y + EYE };
  };
  const endpoint = (p: Vector3, local: number[]) => {
    const candidates: Node[] = [];
    for (let r = 0; r <= 3; r++)
      for (let di = -r; di <= r; di++)
        for (let dj = -r; dj <= r; dj++)
          for (let layer = 0; layer < 2; layer++) {
            const i = Math.round(local[0] / grid) + di,
              j = Math.round(local[2] / grid) + dj,
              s = surface(i, j, layer);
            if (!s || Math.abs(s.y - p.y) > 0.27) continue;
            const v = new Vector3(s.x, s.y, s.z);
            if (!canStep(p, v)) continue;
            candidates.push({
              i,
              j,
              layer,
              ...s,
              key: `${i},${j},${layer}`,
              g: 0,
              f: v.distanceTo(p),
            });
          }
    return candidates.sort((x, y) => x.f - y.f)[0];
  };
  const first = endpoint(start, a),
    end = endpoint(target, b);
  if (!first || !end) return null;
  const open = new Heap(),
    best = new Map<string, number>();
  first.f = Math.hypot(first.x - end.x, first.z - end.z, first.y - end.y);
  open.push(first);
  best.set(first.key, 0);
  let expanded = 0;
  while (open.items.length && expanded++ < 45000) {
    const cur = open.pop();
    if (cur.g > (best.get(cur.key) ?? Infinity) + 1e-6) continue;
    if (cur.key === end.key) {
      const result: Vector3[] = [target.clone()];
      let c: Node | undefined = cur;
      while (c) {
        result.push(new Vector3(c.x, c.y, c.z));
        c = c.parent;
      }
      result.reverse();
      // Remove only segments independently proven clear on the same collision surfaces.
      // Keep intermediate waypoints wherever the floor height changes: shortcutting a
      // stair descent would hide the real treads the walker must follow.
      const simple: Vector3[] = [];
      let prev = start,
        index = 0;
      while (index < result.length) {
        let far = index;
        for (let k = index + 1; k < Math.min(result.length, index + 35); k++) {
          if (Math.abs(result[k].y - prev.y) > 0.3) break;
          if (canStep(prev, result[k])) far = k;
          else break;
        }
        simple.push(result[far]);
        prev = result[far];
        index = far + 1;
      }
      return simple;
    }
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++)
        for (const layer of [cur.layer, 1 - cur.layer]) {
          if (!di && !dj && layer === cur.layer) continue;
          const i = cur.i + di,
            j = cur.j + dj,
            s = surface(i, j, layer);
          if (!s || Math.abs(s.y - cur.y) > MAX_STEP) continue;
          if (
            layer !== cur.layer &&
            Math.abs(cur.y - EYE - 4.25) > 0.24 &&
            Math.abs(cur.y - EYE - 1.37) > 0.24
          )
            continue;
          const g =
              cur.g +
              Math.hypot(s.x - cur.x, s.z - cur.z, s.y - cur.y) +
              (layer !== cur.layer ? 0.02 : 0),
            key = `${i},${j},${layer}`;
          if (
            g >= (best.get(key) ?? Infinity) ||
            !canStep(
              new Vector3(cur.x, cur.y, cur.z),
              new Vector3(s.x, s.y, s.z),
            )
          )
            continue;
          best.set(key, g);
          open.push({
            i,
            j,
            layer,
            ...s,
            key,
            g,
            f: g + Math.hypot(s.x - end.x, s.z - end.z, s.y - end.y),
            parent: cur,
          });
        }
  }
  return null;
}
