import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three/src/math/Vector3.js";
import {
  Journey,
  ROUTE_ANCHORS,
  EYE_HEIGHT,
  routePosition,
} from "../src/scene/journey.ts";
import {
  CABIN,
  INTERIOR_STAIR,
  cabinToWorld,
  worldToCabin,
} from "../src/scene/architecture.ts";
import {
  clearance,
  canMoveDoor,
  doorIntersectsCapsule,
  resetEnvironmentColliders,
} from "../src/scene/locomotion.ts";
import { groundHeight } from "../src/scene/landscape.ts";

function simulate(j: Journey, seconds: number) {
  const heights: number[] = [];
  for (let frame = 0; frame < seconds * 60; frame++) {
    const before = j.position.clone();
    j.update(1 / 60);
    const local = worldToCabin(j.position.toArray());
    assert.ok(
      j.position.distanceTo(before) < 0.24,
      `navigation jumped at ${local}`,
    );
    assert.equal(
      clearance(j.position.x, j.position.z, j.position.y - EYE_HEIGHT, j.door),
      null,
      `navigation intersects a real collider at ${local}: ${j.walker.lastCollision}`,
    );
    assert.ok(!j.label.includes("受阻"), `route stopped: ${j.label}`);
    heights.push(j.position.y - EYE_HEIGHT);
  }
  return heights;
}
function upperJourney() {
  resetEnvironmentColliders();
  const j = new Journey();
  j.setReady();
  j.interact();
  j.position.fromArray(cabinToWorld([-4.875, 5.9, 0.95]));
  return j;
}

test("complete upstairs-to-desk navigation follows every stair and survives the lower guard turn", () => {
  const j = upperJourney();
  const original = j.position.clone();
  j.navigate("desk");
  assert.deepEqual(
    j.position.toArray(),
    original.toArray(),
    "request must retain pose",
  );
  const heights = simulate(j, 55);
  assert.equal(j.phase, "DESK_READY");
  assert.ok(j.position.distanceTo(routePosition(ROUTE_ANCHORS.desk)) < 0.01);
  assert.equal(j.exportState().safeConnector, null);
  for (let tread = 1; tread <= INTERIOR_STAIR.treadCount; tread++) {
    const expected = CABIN.floorY + tread * INTERIOR_STAIR.rise;
    assert.ok(
      heights.some((h) => Math.abs(h - expected) < 1e-7),
      `missing stair ${tread}`,
    );
  }
  assert.equal(
    j.dockProgress,
    0,
    "arrival must wait for explicit computer activation",
  );
});

test("complete upstairs-to-lake navigation descends the stairwell and leaves through the actual doorway", () => {
  const j = upperJourney();
  j.navigate("lake");
  simulate(j, 75);
  assert.ok(j.position.distanceTo(routePosition(0)) < 0.01);
  assert.equal(j.distance, 0);
  assert.equal(j.phase, "MANUAL_EXPLORATION");
});

test("free outdoor pose safely rejoins the cinematic guide and reaches the desk without a pose snap", () => {
  resetEnvironmentColliders();
  const j = new Journey();
  j.setReady();
  j.interact();
  j.position.set(13, groundHeight(13, 19) + EYE_HEIGHT, 19);
  const original = j.position.clone();
  j.startGuide();
  assert.ok(j.position.distanceTo(original) < 1e-12);
  simulate(j, 70);
  assert.equal(j.phase, "DESK_READY");
  assert.ok(j.position.distanceTo(routePosition(ROUTE_ANCHORS.desk)) < 0.01);
});

test("manual input interrupts a connecting route at its current physical position and never resumes itself", () => {
  const j = upperJourney();
  j.navigate("desk");
  for (let frame = 0; frame < 70; frame++) j.update(1 / 60);
  const position = j.position.clone();
  j.setMoveInput(1, 0);
  assert.ok(j.position.distanceTo(position) < 1e-12);
  assert.equal(j.exportState().safeConnector, null);
  j.update(1 / 60);
  assert.ok(j.position.distanceTo(position) < 0.24);
  j.clearMovement();
  const stopped = j.position.clone();
  for (let frame = 0; frame < 120; frame++) j.update(1 / 60);
  assert.ok(j.position.distanceTo(stopped) < 1e-12);
  assert.equal(j.getSnapshot().moving, false);
});

test("manual door closing wins over proximity until the visitor leaves and approaches again", () => {
  resetEnvironmentColliders();
  const j = new Journey();
  j.setReady();
  j.interact();
  j.position.fromArray(cabinToWorld([1.11, 3.02, 5.1]));
  for (let i = 0; i < 120; i++) j.update(1 / 60);
  assert.equal(j.door, 1);
  j.toggleDoor();
  for (let i = 0; i < 120; i++) j.update(1 / 60);
  assert.equal(
    j.door,
    0,
    "proximity must not immediately undo an explicit close",
  );
  j.position.fromArray(cabinToWorld([1.11, 3.02, 8.0]));
  j.update(1 / 60);
  j.position.fromArray(cabinToWorld([1.11, 3.02, 5.1]));
  for (let i = 0; i < 120; i++) j.update(1 / 60);
  assert.equal(j.door, 1, "a new approach may auto-open again");
});

test("closing door sweeps cannot pass through a visitor or close into the occupied threshold", () => {
  const crossing = new Vector3(...cabinToWorld([1.1, 3.02, 3.95]));
  assert.equal(
    doorIntersectsCapsule(crossing.x, crossing.z, crossing.y - EYE_HEIGHT, 1),
    false,
  );
  assert.equal(
    doorIntersectsCapsule(crossing.x, crossing.z, crossing.y - EYE_HEIGHT, 0),
    false,
  );
  assert.equal(
    canMoveDoor(crossing, 1, 0),
    false,
    "intermediate swing must also be tested",
  );
  const j = new Journey();
  j.setReady();
  j.interact();
  j.position.fromArray(cabinToWorld([1.11, 3.02, 4.5]));
  j.door = 1;
  j.update(1 / 60);
  j.toggleDoor();
  for (let i = 0; i < 120; i++) {
    j.update(1 / 60);
    assert.equal(
      doorIntersectsCapsule(
        j.position.x,
        j.position.z,
        j.position.y - EYE_HEIGHT,
        j.door,
      ),
      false,
    );
  }
  assert.ok(
    j.door > 0 && j.door < 1,
    "door waits before the person rather than pushing through",
  );
  j.position.fromArray(cabinToWorld([1.11, 3.02, 5.1]));
  for (let i = 0; i < 120; i++) j.update(1 / 60);
  assert.equal(j.door, 0, "closing resumes when the visitor clears the sweep");
});
