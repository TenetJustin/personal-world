import test from "node:test";
import assert from "node:assert/strict";
import { localEditorEnabled } from "../src/library/viewer.ts";

test("published Mac stays read-only even with former editing query links", () => {
  for (const search of [
    "",
    "?app=profile",
    "?workspace=local",
    "?editor=local&app=profile",
    "?editor=local&workspace=local",
  ]) {
    assert.equal(localEditorEnabled(false, search), false);
  }
});

test("local development editor requires an explicit opt-in", () => {
  assert.equal(localEditorEnabled(true, ""), false);
  assert.equal(localEditorEnabled(true, "?app=profile"), false);
  assert.equal(localEditorEnabled(true, "?editor=local&app=profile"), true);
});
