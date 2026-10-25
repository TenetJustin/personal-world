import test from "node:test";
import assert from "node:assert/strict";
import {
  Journey,
  TOUR_DURATION,
  sampleTour,
  EYE_HEIGHT,
  walkFloor,
  ROUTE_ANCHORS,
} from "../src/scene/journey.ts";
import {
  CABIN,
  worldToCabin,
  INTERIOR_COLLIDERS,
} from "../src/scene/architecture.ts";
import { homography } from "../src/scene/screenProjection.ts";
function advance(j: Journey, seconds: number, dt = 1 / 60) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) j.update(dt);
}
test("five seconds count real foreground idle time only after readiness, including low FPS", () => {
  const j = new Journey();
  advance(j, 20);
  assert.equal(j.phase, "BOOT");
  j.setReady();
  advance(j, 4.8, 0.2);
  assert.equal(j.phase, "LAKESHORE_IDLE");
  j.update(0.21);
  assert.ok(j.getSnapshot().moving);
  assert.equal(j.autoUsed, true);
  const hidden = new Journey();
  hidden.setReady();
  for (let i = 0; i < 100; i++) hidden.update(1, false);
  assert.equal(hidden.autoUsed, false);
  hidden.setBlocked(true);
  advance(hidden, 10);
  hidden.setBlocked(false);
  advance(hidden, 4);
  assert.equal(hidden.autoUsed, false);
});
test("active input cancels auto eligibility; an interrupted tour retains exact pose and never reclaims control", () => {
  const before = new Journey();
  before.setReady();
  before.interact();
  advance(before, 30);
  assert.equal(before.autoUsed, false);
  assert.equal(before.phase, "MANUAL_EXPLORATION");
  const j = new Journey();
  j.setReady();
  advance(j, 23);
  const p = j.position.clone(),
    q = j.quaternion.clone();
  j.interact();
  advance(j, 30);
  assert.deepEqual(j.position.toArray(), p.toArray());
  assert.deepEqual(j.quaternion.toArray(), q.toArray());
  assert.equal(j.getSnapshot().moving, false);
  j.startGuide();
  j.update(1 / 60);
  assert.ok(
    j.position.distanceTo(p) < 0.005,
    "resume must begin at the retained pose",
  );
});
test("reduced motion never starts the automatic walk and explicit navigation reaches safe anchors", () => {
  const j = new Journey();
  j.setReducedMotion(true);
  j.setReady();
  advance(j, 20);
  assert.equal(j.autoUsed, true);
  assert.equal(j.distance, 0);
  j.navigate("desk");
  assert.equal(j.phase, "DESK_READY");
  assert.equal(j.distance, ROUTE_ANCHORS.desk);
});
test("arrival waits for explicit Mac activation and returns to the exact desk pose", () => {
  const j = new Journey();
  j.setReady();
  advance(j, TOUR_DURATION + 8);
  assert.equal(j.phase, "DESK_READY");
  advance(j, 10);
  assert.equal(j.phase, "DESK_READY");
  const p = j.position.clone(),
    q = j.quaternion.clone();
  assert.equal(j.requestDesktop(), true);
  advance(j, 4);
  assert.equal(j.phase, "DESKTOP");
  j.startGuide();
  assert.equal(j.phase, "DESKTOP");
  j.exitDesktop();
  advance(j, 4);
  assert.equal(j.phase, "DESK_READY");
  assert.ok(j.position.distanceTo(p) < 1e-8);
  assert.ok(j.quaternion.angleTo(q) < 1e-7);
});
test("canceling screen approach preserves the instantaneous pose before smoothly returning", () => {
  const j = new Journey();
  j.spawnAtDesk();
  j.setReady();
  j.requestDesktop();
  advance(j, 0.8);
  const p = j.position.clone(),
    q = j.quaternion.clone();
  j.cancelDock();
  assert.ok(j.position.distanceTo(p) < 1e-9);
  assert.ok(j.quaternion.angleTo(q) < 1e-7);
  advance(j, 4);
  assert.equal(j.phase, "DESK_READY");
});
test("dense tour samples keep human eye height, clear actual door/jamb and furniture, and have no pose cuts", () => {
  let previous = sampleTour(0),
    crossings = 0;
  for (let t = 0; t <= TOUR_DURATION; t += 1 / 120) {
    const s = sampleTour(t),
      p = worldToCabin(s.position.toArray());
    assert.ok(
      Math.abs(s.position.y - walkFloor(s.position.toArray()) - EYE_HEIGHT) <
        1e-9,
    );
    assert.ok(
      s.position.distanceTo(previous.position) < 0.04,
      "no translation jump",
    );
    assert.ok(
      s.quaternion.angleTo(previous.quaternion) < 0.03,
      "no orientation cut",
    );
    if (Math.abs(p[2] - CABIN.door.planeZ) < 0.3) {
      crossings++;
      assert.ok(p[0] > 0.555 + 0.16 && p[0] < 1.665 - 0.16);
      assert.ok(s.door > 0.98);
      assert.ok(p[1] < CABIN.door.topY - 0.2);
    }
    if (p[2] < 4.2 && p[2] > -4.2)
      for (const b of INTERIOR_COLLIDERS)
        assert.ok(
          !(
            p[0] > b.minX - 0.16 &&
            p[0] < b.maxX + 0.16 &&
            p[2] > b.minZ - 0.16 &&
            p[2] < b.maxZ + 0.16
          ),
          b.id,
        );
    previous = s;
  }
  assert.ok(crossings > 20);
});
test("physical screen corners map exactly through the CSS homography at multiple viewport sizes", () => {
  for (const [w, h] of [
    [1280, 720],
    [390, 844],
  ])
    for (const quad of [
      [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ],
      [
        [410, 270],
        [655, 250],
        [670, 470],
        [400, 480],
      ],
    ]) {
      const m = homography(w, h, quad)!;
      assert.ok(m);
      for (const [i, [x, y]] of [
        [0, [0, 0]],
        [1, [w, 0]],
        [2, [w, h]],
        [3, [0, h]],
      ] as [number, [number, number]][]) {
        const d = m[6] * x + m[7] * y + 1;
        assert.ok(
          Math.hypot(
            (m[0] * x + m[1] * y + m[2]) / d - quad[i][0],
            (m[3] * x + m[4] * y + m[5]) / d - quad[i][1],
          ) < 1e-6,
        );
      }
    }
  assert.equal(
    homography(100, 100, [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]),
    null,
  );
});
