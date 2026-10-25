import { test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { createCameraPath, NEAR_TREE_BASES } from "../src/scene/cameraPath.ts";
import { groundHeight } from "../src/scene/landscape.ts";
test("the complete A–B path clears terrain, cabin exterior, and near tree trunks", () => {
  const path = createCameraPath(),
    p = new Vector3();
  for (let i = 0; i <= 1000; i++) {
    path.getPointAt(i / 1000, p);
    assert.ok(p.y - groundHeight(p.x, p.z) > 1.45, `terrain clearance at ${i}`);
    assert.ok(p.x > 5.2 || p.z > 6.5, "cabin/porch clearance");
    for (const tree of NEAR_TREE_BASES)
      assert.ok(Math.hypot(p.x - tree.x, p.z - tree.z) > 2, "trunk clearance");
  }
});
