import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("visitor welcome copy replaces development labels and keeps an explicit silent entry", async () => {
  const app = await readFile("src/App.tsx", "utf8");
  assert.match(app, /欢迎来到我的世界/);
  assert.match(app, /这里承载着我对未来生活的一次想象/);
  assert.match(app, /目前网站和站主本人仍在持续完善中，欢迎随意探索/);
  assert.match(app, /静音进入/);
  assert.doesNotMatch(app, /FIRST PERSON \/|THRESHOLD/);
});

test("licensed audio and record-player media are local, attributed and wired to visitor controls", async () => {
  const [outdoor, jazz, player, notice, ambience, interior] = await Promise.all(
    [
      stat("public/audio/outdoor-birds.mp3"),
      stat("public/audio/indoor-jazz.mp3"),
      stat("public/assets/record-player.glb"),
      readFile("licenses/media-attribution.md", "utf8"),
      readFile("src/audio/ambience.ts", "utf8"),
      readFile("src/scene/Interior.tsx", "utf8"),
    ],
  );
  assert.ok(outdoor.size > 1_000_000);
  assert.ok(jazz.size > 1_000_000);
  assert.equal(player.size, 30_036);
  assert.match(notice, /Poly by Google/);
  assert.match(notice, /Thimras/);
  assert.match(notice, /Kevin MacLeod/);
  assert.match(ambience, /audio\/outdoor-birds\.mp3/);
  assert.match(ambience, /audio\/indoor-jazz\.mp3/);
  assert.match(ambience, /toggleRecordPlayer/);
  assert.match(interior, /<RecordPlayer \/>/);
});

test("entering the room starts opted-in jazz once and exposes a pause prompt", async () => {
  const [app, ambience, prompt] = await Promise.all([
    readFile("src/App.tsx", "utf8"),
    readFile("src/audio/ambience.ts", "utf8"),
    readFile("src/ui/RecordPlayerPrompt.tsx", "utf8"),
  ]);
  assert.match(app, /insideRoom/);
  assert.match(app, /ambience\.enabled/);
  assert.match(app, /ambience\.startRecordPlayer\(\)/);
  assert.match(app, /automaticNotice/);
  assert.match(ambience, /startRecordPlayer\(enableFromGesture = false\)/);
  assert.match(prompt, /已自动播放，可随时暂停/);
});

test("the entry contains three bats, a glove and a baseball clear of the door path", async () => {
  const [gear, interior, architecture] = await Promise.all([
    readFile("src/scene/BaseballGear.tsx", "utf8"),
    readFile("src/scene/Interior.tsx", "utf8"),
    readFile("src/scene/architecture.ts", "utf8"),
  ]);
  assert.equal((gear.match(/<Bat/g) ?? []).length, 3);
  assert.match(gear, /ENTRY_BASEBALL_GLOVE/);
  assert.match(gear, /ENTRY_BASEBALL/);
  assert.match(interior, /<BaseballGear \/>/);
  assert.match(architecture, /entry-baseball-gear/);
});

test("the published introduction uses the owner's updated wording", async () => {
  const manifest = JSON.parse(
    await readFile("public/content/manifest.json", "utf8"),
  );
  const intro = manifest.records.find(
    (entry: { kind: string }) => entry.kind === "notes",
  );
  assert.ok(intro);
  assert.match(
    intro.body,
    /^欢迎你！我目前在上海读物理海洋学，今年7月才开始真正接触AI，现在在上海一家企业做FDE方向的实习。/,
  );
  assert.doesNotMatch(intro.body, /我的兴趣连接着物理海洋学/);
});
