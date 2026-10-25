/**
 * Captures the V3 evidence screenshot set in a real headed browser.
 * Usage: node scripts/v3-capture.mjs [--out docs/v3/evidence] [--url http://127.0.0.1:5177/?debug=1]
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((value, index, list) =>
      value.startsWith("--") ? [value.slice(2), list[index + 1]] : null,
    )
    .filter(Boolean),
);
const out = resolve(args.out ?? "docs/v3/evidence");
const url = args.url ?? "http://127.0.0.1:5177/?debug=1";
const executablePath =
  args.browser ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const C = Math.cos((-35 * Math.PI) / 180),
  S = Math.sin((-35 * Math.PI) / 180);
/** Cabin-local authored metres → world metres (same transform as architecture.ts). */
const world = ([x, y, z]) => [8 + C * x + S * z, y, -3 - S * x + C * z];

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__pw?.runtime.ready === true, null, {
  timeout: 120000,
});
const startPose = await page.evaluate(() => ({
  position: window.__pw.journey.position.toArray(),
  quaternion: window.__pw.journey.quaternion.toArray(),
}));
const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}.png`, timeout: 120000 });
  console.log("captured", name);
};
const poseLocal = async (from, to) => {
  await page.evaluate(
    ([position, target]) => window.__pw.journey.setPose(position, target),
    [world(from), world(to)],
  );
};
await page.evaluate(() =>
  window.__pw.journey.setPose([6, 2.42, 43], [-30, 6, -10]),
);
await shot("v3-lake");
await poseLocal([-0.5, 3.05, 1.9], [3.2, 2.7, -2.2]);
await shot("v3-room");
await poseLocal([-3.6, 3.02, 1.15], [-3.6, 2.24, 3.1]);
await shot("v3-deskview");
await poseLocal([-4.02, 2.42, 2.53], [-3.6, 2.2, 3.02]);
await shot("v3-mac45");
await poseLocal([-3.62, 2.34, 2.72], [-3.6, 2.15, 3.0]);
await shot("v3-keyboard");
await poseLocal([-3.6, 2.245, 2.52], [-3.6, 2.234, 3.1]);
await shot("v3-screen");
await poseLocal([-4.875, 5.9, 0.95], [-1.2, 4.75, -2.6]);
await shot("v3-upper");
// Approach and porch are captured from the real auto guide, not a teleport.
await page.evaluate((start) => {
  const journey = window.__pw.journey;
  journey.position.fromArray(start.position);
  journey.quaternion.fromArray(start.quaternion);
  journey.baseRotation.fromArray(start.quaternion);
  journey.distance = 0;
  journey.tourTime = 0;
  journey.door = 0;
  journey.interacted = false;
  journey.autoUsed = false;
  journey.phase = "LAKESHORE_IDLE";
  journey.autoIdle = 0;
  journey.emit();
}, startPose);
await page.waitForFunction(
  () => window.__pw.journey.phase === "CABIN_APPROACH",
  null,
  { timeout: 90000 },
);
await page.waitForTimeout(2200);
await shot("v3-approach");
await page.waitForFunction(
  () => window.__pw.journey.phase === "CABIN_DOOR",
  null,
  { timeout: 90000 },
);
await shot("v3-porch");
await page.evaluate(() => window.__pw.journey.spawnAtDesk());
await page.waitForTimeout(500);
await page.evaluate(() => window.__pw.journey.requestDesktop());
await page.waitForFunction(
  () => window.__pw.journey.phase === "DESKTOP",
  null,
  { timeout: 30000 },
);
await page.waitForTimeout(1400);
await shot("v3-desktop");
await page.locator(".dv3-edit-entry").click();
await page.waitForTimeout(1000);
await shot("v3-profile");
console.log(
  JSON.stringify({
    out,
    errors,
    projection: await page.evaluate(() => window.__pw.screenProjection),
  }),
);
await browser.close();
