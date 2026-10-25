import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three/src/math/Vector3.js";
import { Quaternion } from "three/src/math/Quaternion.js";
import {
  CABIN,
  INTERIOR_STAIR,
  INTERIOR_ANCHORS,
  WALK_COLLIDERS,
  UPPER_FLOOR,
  cabinToWorld,
  worldToCabin,
  interiorStairHeight,
  hasUpperFloor,
} from "../src/scene/architecture.ts";
import { groundHeight } from "../src/scene/landscape.ts";
import {
  Walker,
  EYE,
  MAX_STEP,
  BODY_HEIGHT,
  BODY_RADIUS,
  clearance,
  floorAt,
  canStep,
  planSafePath,
  resetEnvironmentColliders,
  addEnvironmentCollider,
} from "../src/scene/locomotion.ts";
const eye = (x: number, z: number, foot = CABIN.floorY) =>
  new Vector3(...cabinToWorld([x, foot + EYE, z]));
const horizontal = (a: Vector3, b: Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
function aim(from: Vector3, to: Vector3) {
  const d = to.clone().sub(from);
  d.y = 0;
  return new Quaternion().setFromUnitVectors(
    new Vector3(0, 0, -1),
    d.normalize(),
  );
}
function follow(start: Vector3, target: Vector3, door = 1, maxSeconds = 15) {
  const walker = new Walker(),
    position = start.clone(),
    heights = [position.y - EYE],
    visited = [position.clone()];
  let previous = horizontal(position, target),
    stalled = 0;
  for (
    let i = 0;
    i < maxSeconds * 120 && horizontal(position, target) > 0.02;
    i++
  ) {
    walker.input(1, 0);
    const before = position.clone();
    walker.update(position, aim(position, target), 1 / 120, door);
    const foot = position.y - EYE;
    assert.ok(
      foot - (before.y - EYE) <= MAX_STEP + 1e-8,
      "cannot jump more than one real tread",
    );
    assert.equal(
      clearance(position.x, position.z, foot, door),
      null,
      `capsule overlapped ${walker.lastCollision}`,
    );
    heights.push(foot);
    visited.push(position.clone());
    const distance = horizontal(position, target);
    stalled = distance >= previous - 1e-8 ? stalled + 1 : 0;
    previous = distance;
    if (stalled > 120) break;
  }
  walker.clear();
  return { position, heights, visited, collision: walker.lastCollision };
}
function verifyPath(start: Vector3, target: Vector3) {
  const path = planSafePath(start, target);
  assert.ok(path, "planner must find a real safe connection");
  let prior = start;
  for (const point of path) {
    assert.ok(
      canStep(prior, point),
      `unsafe planner segment ${worldToCabin(prior.toArray())} → ${worldToCabin(point.toArray())}`,
    );
    assert.equal(clearance(point.x, point.z, point.y - EYE), null);
    prior = point;
  }
  assert.ok(
    prior.distanceTo(target) < 1e-8,
    "route must reach the requested point",
  );
  return path;
}
test("closed real door blocks the opening; fully open leaf allows first-person passage", () => {
  resetEnvironmentColliders();
  const outside = eye(CABIN.door.centerX, 5.15, CABIN.porch.floorY),
    inside = eye(CABIN.door.centerX, 3.65);
  assert.equal(clearance(outside.x, outside.z, outside.y - EYE, 0), null);
  assert.equal(canStep(outside, inside, 0), false);
  assert.equal(canStep(outside, inside, 1), true);
  const closed = follow(outside, inside, 0, 3);
  assert.ok(
    horizontal(closed.position, inside) > 0.45,
    "closed door must stop a walker",
  );
  const open = follow(outside, inside, 1, 4);
  assert.ok(
    horizontal(open.position, inside) < 0.025,
    "open door must be traversable",
  );
  assert.ok(Math.abs(open.position.y - (CABIN.floorY + EYE)) < 1e-8);
});
test("solid walls and height-aware furniture block walking while upper furniture does not block ground below it", () => {
  resetEnvironmentColliders();
  const wallStart = eye(5.3, 3.7),
    throughWall = eye(6.6, 3.7);
  assert.equal(canStep(wallStart, throughWall), false);
  const result = follow(wallStart, throughWall, 1, 3);
  assert.ok(
    worldToCabin(result.position.toArray())[0] <=
      CABIN.interior.maxX - BODY_RADIUS + 1e-7,
  );
  for (const collider of WALK_COLLIDERS.filter((x) =>
    ["desk", "sofa", "dining-table", "refrigerator", "bed"].includes(x.id),
  )) {
    const x = (collider.minX + collider.maxX) / 2,
      z = (collider.minZ + collider.maxZ) / 2;
    const p = eye(x, z, collider.minY);
    assert.ok(clearance(p.x, p.z, collider.minY), collider.id);
  }
  const lowerUnderBed = eye(-2.2, -2.7);
  assert.equal(
    clearance(lowerUnderBed.x, lowerUnderBed.z, CABIN.floorY),
    null,
    "bed on floor two cannot collide through the lower ceiling",
  );
});
test("WASD diagonal input is normalized, accelerates, decelerates and clear stops immediately", () => {
  resetEnvironmentColliders();
  const straight = new Walker(),
    diagonal = new Walker(),
    a = eye(-0.1, 0.5),
    b = a.clone(),
    initial = a.clone(),
    rotation = new Quaternion();
  straight.input(1, 0);
  diagonal.input(1, 1);
  for (let i = 0; i < 30; i++) {
    straight.update(a, rotation, 1 / 120, 1);
    diagonal.update(b, rotation, 1 / 120, 1);
  }
  assert.ok(
    Math.abs(straight.velocity.length() - diagonal.velocity.length()) < 1e-10,
  );
  assert.ok(Math.abs(horizontal(a, initial) - horizontal(b, initial)) < 1e-8);
  assert.ok(
    straight.velocity.length() > 0 && straight.velocity.length() < 1.65,
  );
  const fast = straight.velocity.length();
  straight.input(0, 0);
  straight.update(a, rotation, 1 / 60, 1);
  assert.ok(straight.velocity.length() < fast);
  straight.clear();
  const stopped = a.clone();
  straight.update(a, rotation, 1 / 60, 1);
  assert.ok(a.distanceTo(stopped) < 1e-10);
});
test("authored stair approaches and every real tread permit walking up then back down without teleport or slab collision", () => {
  resetEnvironmentColliders();
  const s = INTERIOR_STAIR,
    bottom = new Vector3(
      ...cabinToWorld([
        s.bottomApproach[0],
        s.bottomApproach[1] + EYE,
        s.bottomApproach[2],
      ]),
    ),
    top = new Vector3(
      ...cabinToWorld([
        s.topApproach[0],
        s.topApproach[1] + EYE,
        s.topApproach[2],
      ]),
    );
  assert.equal(
    clearance(bottom.x, bottom.z, bottom.y - EYE),
    null,
    "bottom approach headroom",
  );
  assert.equal(
    clearance(top.x, top.z, top.y - EYE),
    null,
    "upper landing headroom",
  );
  assert.equal(
    canStep(bottom, top),
    true,
    "every tread rise and actual stairwell must be traversable",
  );
  const ascent = follow(bottom, top, 1, 9);
  assert.ok(
    horizontal(ascent.position, top) < 0.025,
    `stalled on ascent at ${worldToCabin(ascent.position.toArray())}: ${ascent.collision}`,
  );
  assert.ok(Math.abs(ascent.position.y - (UPPER_FLOOR.floorY + EYE)) < 1e-8);
  for (let i = 1; i <= s.treadCount; i++) {
    const expected = s.lowerY + i * s.rise;
    assert.ok(
      ascent.heights.some((y) => Math.abs(y - expected) < 1e-8),
      `missed real tread ${i} at ${expected}`,
    );
  }
  const descent = follow(ascent.position, bottom, 1, 9);
  assert.ok(
    horizontal(descent.position, bottom) < 0.025,
    `stalled on descent ${worldToCabin(descent.position.toArray())}`,
  );
  assert.ok(Math.abs(descent.position.y - (CABIN.floorY + EYE)) < 1e-8);
  for (let i = 1; i < descent.heights.length; i++)
    assert.ok(
      descent.heights[i] <= descent.heights[i - 1] + 1e-8,
      "descent must not jump to upper slab",
    );
});
test("safe planner connects free outdoor ground to the main room through real steps and open door", () => {
  resetEnvironmentColliders();
  const start = new Vector3(13, groundHeight(13, 19) + EYE, 19),
    target = new Vector3(...cabinToWorld(INTERIOR_ANCHORS.room));
  assert.equal(clearance(start.x, start.z, start.y - EYE), null);
  const path = verifyPath(start, target);
  assert.ok(
    path.some((p) => {
      const local = worldToCabin(p.toArray());
      return local[2] > 4 && local[2] < 8.6;
    }),
    "route uses physical porch/entry connection",
  );
});
test("safe planner can return from the upper landing to main room using the actual stairwell", () => {
  resetEnvironmentColliders();
  const s = INTERIOR_STAIR,
    start = eye(s.topApproach[0], s.topApproach[2], s.upperY),
    target = new Vector3(...cabinToWorld(INTERIOR_ANCHORS.room));
  const path = verifyPath(start, target);
  assert.ok(
    path.some((p) => p.y - EYE > s.lowerY + 0.2 && p.y - EYE < s.upperY - 0.2),
    "route must descend the physical intermediate treads",
  );
});
test("environment obstacle registration blocks a swept move instead of allowing thin-object tunnelling", () => {
  resetEnvironmentColliders();
  const start = new Vector3(25, groundHeight(25, 35) + EYE, 35),
    target = start.clone().add(new Vector3(2, 0, 0));
  target.y = floorAt(target.x, target.z, start.y - EYE) + EYE;
  addEnvironmentCollider({
    id: "test-tree-trunk",
    minX: start.x + 0.8,
    maxX: start.x + 1.0,
    minZ: start.z - 0.5,
    maxZ: start.z + 0.5,
    minY: 0,
    maxY: 8,
  });
  assert.equal(canStep(start, target), false);
  const walker = new Walker(),
    p = start.clone();
  walker.input(1, 0, true);
  for (let i = 0; i < 30; i++) walker.update(p, aim(start, target), 1 / 30, 1);
  assert.ok(p.x < start.x + 0.8 - BODY_RADIUS + 0.001);
  resetEnvironmentColliders();
});
