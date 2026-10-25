import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { createCameraPath, NEAR_TREE_BASES } from "../src/scene/cameraPath.ts";
import { groundHeight, cabinLocal } from "../src/scene/landscape.ts";
test("the complete A–B path clears terrain, cabin exterior, and near tree trunks", () => {
  const path = createCameraPath(),
    p = new Vector3();
  for (let i = 0; i <= 1000; i++) {
    path.getPointAt(i / 1000, p);
    assert.ok(p.y - groundHeight(p.x, p.z) > 1.45, `terrain clearance at ${i}`);
    const local = cabinLocal(p.x,p.z);
    assert.ok(Math.abs(local.x)>8.6 || local.z>9 || local.z< -5.2,"rotated cabin / wrap porch / stairs clearance");
    for (const tree of NEAR_TREE_BASES)
      assert.ok(Math.hypot(p.x - tree.x, p.z - tree.z) > 2, "trunk clearance");
  }
});
