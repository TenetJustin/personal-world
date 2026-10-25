import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bakeGeometry } from "../src/scene/assetGeometry.ts";
test("quantized glTF positions survive metre-scale instance baking without integer wrap", () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Int16BufferAttribute(
      [0, 32767, 0, 32767, 0, 0, 0, 0, 32767],
      3,
      true,
    ),
  );
  const mesh = new THREE.Mesh(g);
  mesh.scale.setScalar(14);
  mesh.position.y = 7;
  const parent = new THREE.Group();
  parent.rotation.y = 0.4;
  parent.add(mesh);
  const baked = bakeGeometry(mesh);
  assert.equal(baked.getAttribute("position").getY(0), 21);
  assert.ok(baked.boundingBox!.max.x > 12);
  baked.dispose();
  g.dispose();
});
