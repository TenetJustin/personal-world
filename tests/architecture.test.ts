import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CABIN,
  cabinToWorld,
  worldToCabin,
  architecturalFloor,
  INTERIOR_COLLIDERS,
  INTERIOR_ANCHORS,
  LAPTOP_SCREEN_LOCAL,
} from "../src/scene/architecture.ts";
test("shared architectural metre coordinates preserve root placement and physical door/stair surfaces", () => {
  for (const local of [
    [1.11, 1.35, 4.5],
    [-3.6, 3.02, 1.1],
    [1.16, 0.655, 8.23],
  ] as const) {
    const restored = worldToCabin(cabinToWorld(local));
    restored.forEach((value, i) =>
      assert.ok(Math.abs(value - local[i]) < 1e-9),
    );
  }
  assert.equal(architecturalFloor(1.11, 4.5), CABIN.porch.floorY);
  assert.equal(architecturalFloor(1.11, 4.37), 1.3525);
  CABIN.stairs.centersZ.forEach((z, i) =>
    assert.equal(
      architecturalFloor(1.16, z),
      i === 0 ? CABIN.porch.floorY : CABIN.stairs.topsY[i],
    ),
  );
  assert.equal(architecturalFloor(1.16, 8.5), null);
  assert.equal(architecturalFloor(-3.6, 1.1), CABIN.floorY);
});
test("desk arrival and optical screen geometry agree with physical furniture", () => {
  const p = INTERIOR_ANCHORS.desk;
  for (const b of INTERIOR_COLLIDERS)
    assert.ok(
      p[0] < b.minX || p[0] > b.maxX || p[2] < b.minZ || p[2] > b.maxZ,
      b.id,
    );
  assert.ok(
    LAPTOP_SCREEN_LOCAL[0][0] > LAPTOP_SCREEN_LOCAL[1][0],
    "visitor sees local +X as screen left",
  );
  assert.ok(LAPTOP_SCREEN_LOCAL[0][1] > LAPTOP_SCREEN_LOCAL[3][1]);
  assert.ok(
    LAPTOP_SCREEN_LOCAL[0][2] > LAPTOP_SCREEN_LOCAL[3][2],
    "lid leans away from visitor",
  );
  assert.equal(CABIN.floorY + CABIN.eyeHeight, INTERIOR_ANCHORS.desk[1]);
});
