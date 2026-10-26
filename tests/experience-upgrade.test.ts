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
  const [outdoor, jazz, player, notice, ambience, interior] = await Promise.all([
    stat("public/audio/outdoor-birds.mp3"),
    stat("public/audio/indoor-jazz.mp3"),
    stat("public/assets/record-player.glb"),
    readFile("licenses/media-attribution.md", "utf8"),
    readFile("src/audio/ambience.ts", "utf8"),
    readFile("src/scene/Interior.tsx", "utf8"),
  ]);
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
