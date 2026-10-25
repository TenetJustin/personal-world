/**
 * Measures the V3 build in a real headed Chromium (Apple GPU) and writes a
 * JSON report. Usage:
 *   node scripts/v3-measure.mjs --scene desk --width 1440 --height 900 --out docs/v3/performance-1440x900.json
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((value, index, list) =>
      value.startsWith("--") ? [value.slice(2), list[index + 1]] : null,
    )
    .filter(Boolean),
);
const url = args.url ?? "http://127.0.0.1:5177/?debug=1";
const scene = args.scene ?? "lake";
const width = Number(args.width ?? 1440);
const height = Number(args.height ?? 900);
const seconds = Number(args.seconds ?? 15);
const out = resolve(args.out ?? "docs/v3/performance.json");
const executablePath =
  args.browser ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const browser = await chromium.launch({
  headless: false,
  executablePath,
  args: ["--hide-crash-restore-bubble"],
});
const page = await browser.newPage({
  viewport: { width, height },
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
if (scene === "desk") {
  await page.evaluate(() => window.__pw.journey.spawnAtDesk());
}
let autoGuideSeconds = null;
if (scene === "tour") {
  await page.evaluate(() => {
    const journey = window.__pw.journey;
    journey.interacted = false;
    journey.autoUsed = false;
    journey.phase = "LAKESHORE_IDLE";
    journey.autoIdle = 0;
    journey.emit();
  });
}
await page.waitForTimeout(2500);
const gpu = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2");
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unavailable";
});
await page.evaluate(() => {
  const runtime = window.__pw.runtime;
  runtime.frames = [];
  runtime.warmupAt = performance.now() + 2000;
  runtime.recording = true;
});
if (scene === "tour") {
  const started = Date.now();
  try {
    await page.waitForFunction(
      () => window.__pw.journey.phase === "DESK_READY",
      null,
      { timeout: 90000 },
    );
    autoGuideSeconds = (Date.now() - started) / 1000;
  } catch {
    autoGuideSeconds = null;
  }
  await page.waitForTimeout(1500);
} else {
  await page.waitForTimeout((seconds + 2) * 1000);
}
const snapshot = await page.evaluate(() => {
  const runtime = window.__pw.runtime;
  runtime.recording = false;
  const report = runtime.snapshot();
  const resources = report.resources;
  return {
    ...report,
    resources,
    resourceEncodedBytes: resources.reduce(
      (sum, item) => sum + (item.encodedBytes ?? 0),
      0,
    ),
    resourceTransferBytes: resources.reduce(
      (sum, item) => sum + (item.transferBytes ?? 0),
      0,
    ),
  };
});
const report = {
  date: new Date().toISOString(),
  scope: `Local production build, ${scene} view, ${width}×${height} CSS, DPR 1, standard quality, 2s warm-up + ${seconds}s collection, no recording tool running during the sample.`,
  environment: {
    hardware: "MacBook Air Mac17,3 — Apple M5, 10 CPU / 10 GPU cores, 24 GB RAM",
    os: await page.evaluate(() => navigator.userAgentData?.platform ?? navigator.platform),
    userAgent: await page.evaluate(() => navigator.userAgent),
    viewport: { width, height },
    gpu,
  },
  scene,
  autoGuideSeconds,
  samples: snapshot.samples,
  durationSeconds: snapshot.durationSeconds,
  averageFPS: snapshot.averageFPS,
  p50ms: snapshot.p50ms,
  p95ms: snapshot.p95ms,
  p99ms: snapshot.p99ms,
  maxDrawCalls: snapshot.maxCalls,
  maxTriangles: snapshot.maxTriangles,
  resourceEncodedBytes: snapshot.resourceEncodedBytes,
  resourceTransferBytes: snapshot.resourceTransferBytes,
  geometryCount: snapshot.geometryCount,
  textureCount: snapshot.textureCount,
  entryToFirstFrameMs: snapshot.entryToFirstFrameMs,
  assetPreparationMs: snapshot.assetPreparationMs,
  renderBuffer: snapshot.renderBuffer,
  assetStages: snapshot.assetStages,
  screenProjection: await page.evaluate(() => window.__pw.screenProjection),
  errors: [...errors, ...(snapshot.errors ?? [])],
  limitations: [
    "Loopback loading is not public internet latency; caches were not purged.",
    "Resource timing bytes include application resources, not GPU memory.",
    "The page was headed with a real Metal GPU; other machines will differ.",
  ],
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      out,
      averageFPS: report.averageFPS,
      p95ms: report.p95ms,
      maxDrawCalls: report.maxDrawCalls,
      triangles: report.maxTriangles,
      mb: (report.resourceEncodedBytes / 1024 / 1024).toFixed(1),
      samples: report.samples,
    },
    null,
    2,
  ),
);
await browser.close();
