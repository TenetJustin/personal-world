import test from "node:test";
import assert from "node:assert/strict";
import { ambienceMix, noiseSamples } from "../src/audio/ambience.ts";
test("indoor sound fades across the real doorway, keeps softened outdoors, and fireplace attenuates upstairs", () => {
  const outside = ambienceMix([1.11, 3.02, 7]),
    threshold = ambienceMix([1.11, 3.02, 4.4]),
    room = ambienceMix([1.11, 3.02, 2]),
    near = ambienceMix([3.8, 3.02, 0]),
    upper = ambienceMix([3.8, 5.9, 0]);
  assert.equal(outside.indoor, 0);
  assert.ok(threshold.indoor > 0 && threshold.indoor < 1);
  assert.equal(room.indoor, 1);
  assert.ok(room.outdoor > 0 && room.outdoor < 0.2);
  assert.ok(near.fire > upper.fire);
  assert.equal(ambienceMix([50, 3, 30], true).indoor, 1);
});
test("original noise beds have finite conservative amplitude and repeatable source provenance", () => {
  for (const brown of [false, true]) {
    const a = noiseSamples(48000, 124, brown);
    assert.deepEqual(a, noiseSamples(48000, 124, brown));
    assert.ok(a.every((x) => Number.isFinite(x) && Math.abs(x) < 1));
    const rms = Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
    assert.ok(rms > 0.02 && rms < 0.4);
  }
});
