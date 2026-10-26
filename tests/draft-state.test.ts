import test from "node:test";
import assert from "node:assert/strict";
import {
  createDirtyCallbacks,
  acknowledgeSavedDraft,
  updateDraftState,
  anyDraftDirty,
  otherDraftDirty,
  moveProfileRow,
  type DraftState,
} from "../src/library/draftState.ts";
import { emptyProfile } from "../src/library/profile.ts";
import { newEntry } from "../src/library/model.ts";
import { encodeBackup, decodeBackup } from "../src/library/storage.ts";

test("mounting, closing or saving a clean window cannot clear another editor's unsaved state", () => {
  let state: DraftState = {};
  const callbacks = createDirtyCallbacks((window, dirty) => {
    state = updateDraftState(state, window, dirty);
  });
  callbacks.profile(true);
  callbacks.photos(false);
  callbacks.projects(false);
  callbacks.notes(true);
  callbacks.notes(false);
  assert.equal(anyDraftDirty(state), true);
  assert.equal(otherDraftDirty(state, "photos"), true);
  assert.equal(otherDraftDirty(state, "profile"), false);
  assert.equal(state.profile, true);
  callbacks.profile(false);
  assert.equal(anyDraftDirty(state), false);
});

test("unchanged dirty reports retain state identity and callbacks remain separate per application", () => {
  const empty: DraftState = {};
  assert.equal(updateDraftState(empty, "notes", false), empty);
  const dirty = updateDraftState(empty, "notes", true);
  assert.equal(updateDraftState(dirty, "notes", true), dirty);
  const calls: string[] = [];
  const callbacks = createDirtyCallbacks((window) => calls.push(window));
  assert.notEqual(callbacks.notes, callbacks.profile);
  callbacks.notes(true);
  callbacks.profile(false);
  assert.deepEqual(calls, ["notes", "profile"]);
});

test("skill movement updates persisted ordering so preview and exported backups match the form", async () => {
  const p = emptyProfile();
  p.skills = [
    {
      id: "first",
      name: "First",
      category: "tools",
      context: "original",
      relatedProjects: "",
      sortOrder: 10,
    },
    {
      id: "second",
      name: "Second",
      category: "tools",
      context: "second",
      relatedProjects: "",
      sortOrder: 20,
    },
    {
      id: "third",
      name: "Third",
      category: "tools",
      context: "third",
      relatedProjects: "",
      sortOrder: 30,
    },
  ];
  const source = structuredClone(p.skills);
  p.skills = moveProfileRow(p.skills, 1, 0);
  assert.deepEqual(
    source.map((x) => x.sortOrder),
    [10, 20, 30],
  );
  assert.deepEqual(
    p.skills.map((x) => x.id),
    ["second", "first", "third"],
  );
  assert.deepEqual(
    [...p.skills].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.id),
    ["second", "first", "third"],
  );
  const entry = {
    ...newEntry("resume", "Ordering fixture"),
    structuredProfile: p,
  };
  const [restored] = await decodeBackup(
    new Blob([await encodeBackup([entry])], { type: "application/json" }),
  );
  assert.deepEqual(
    restored.structuredProfile?.skills.map((x) => [x.id, x.sortOrder]),
    [
      ["second", 0],
      ["first", 1],
      ["third", 2],
    ],
  );
});

test("moving other profile rows preserves their fields and invalid moves do not mutate input", () => {
  const rows = [
    { id: "a", school: "One" },
    { id: "b", school: "Two" },
  ];
  const next = moveProfileRow(
    rows as Array<{ id: string; school: string; sortOrder?: number }>,
    1,
    0,
  );
  assert.deepEqual(next, [
    { id: "b", school: "Two" },
    { id: "a", school: "One" },
  ]);
  assert.deepEqual(moveProfileRow(next, -1, 0), next);
  assert.deepEqual(
    rows.map((x) => x.id),
    ["a", "b"],
  );
});

test("acknowledging an async save only clears its submitted snapshot, preserving later typing and other editors", () => {
  const submitted = { title: "Original text" };
  const later = { title: "Typed while storage was saving" };
  const other = { title: "Other unsaved entry" };
  const newer = { record: later, other };
  assert.equal(acknowledgeSavedDraft(newer, "record", submitted), newer);
  const saved = acknowledgeSavedDraft(
    { record: submitted, other },
    "record",
    submitted,
  );
  assert.deepEqual(saved, { other });
  assert.equal(saved.other, other);
});
