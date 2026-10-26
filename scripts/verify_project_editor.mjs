import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.argv[2] || "http://127.0.0.1:5205/personal-world/";
const out = resolve(process.argv[3] || "work/showcase/editor");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
let file;
try {
  await page.goto(base + "projects/?editor=local&workspace=local", {
    waitUntil: "networkidle",
  });
  const copy = page.getByRole("button", {
    name: "复制公开项目为本地草稿",
    exact: true,
  });
  await copy.waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await copy.click();
  await page
    .locator(".record-row")
    .filter({ hasText: "MOIRAI" })
    .waitFor({ timeout: 60000 });
  assert.equal(await page.locator(".record-row").count(), 5);
  await page.locator(".record-row").filter({ hasText: "MOIRAI" }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("副标题", { exact: true }).fill("本地元数据往返验证");
  await page.getByLabel("循环秒数（25–60）", { exact: true }).fill("40");
  await page
    .locator(".showcase-editor details")
    .first()
    .locator("summary")
    .click();
  await page
    .locator(".showcase-editor details")
    .first()
    .getByLabel("图片说明", { exact: true })
    .fill("本地测试说明，不发布");
  await page
    .getByRole("button", { name: "保存修改", exact: true })
    .first()
    .click();
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.some(
      (button) => button.textContent === "导出全部备份" && !button.disabled,
    );
  });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出全部备份", exact: true }).click(),
  ]);
  file = out + "/project-backup-test.json";
  await download.saveAs(file);
  const data = JSON.parse(await readFile(file, "utf8"));
  const moirai = data.records.find((record) => record.id === "project-moirai");
  assert.equal(moirai.images.length, 14);
  assert.equal(moirai.projectShowcase.cycleSeconds, 40);
  assert.equal(moirai.projectShowcase.subtitle, "本地元数据往返验证");
  assert.equal(
    moirai.projectShowcase.imageNotes.find((note) => note.imageId === "m00")
      .caption,
    "本地测试说明，不发布",
  );
  assert.ok(
    moirai.images.every((image) => image.attachment.startsWith("data:image/")),
  );
  assert.ok(
    moirai.images.every((image) =>
      image.thumbnailData?.startsWith("data:image/"),
    ),
    "backup must preserve thumbnails as bytes too",
  );
  assert.ok(!JSON.stringify(data).includes("publicURL"));
  await page.getByRole("button", { name: "预览作品展示", exact: true }).click();
  await page.getByRole("heading", { name: "MOIRAI", exact: true }).waitFor();
  assert.match(
    await page.locator(".project-subtitle").innerText(),
    /本地元数据/,
  );
  await page.screenshot({ path: out + "/author-preview.png" });
  const fresh = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  const restored = await fresh.newPage();
  await restored.goto(base + "projects/?editor=local&workspace=local", {
    waitUntil: "networkidle",
  });
  await restored
    .locator('input[aria-label="选择备份文件"]')
    .setInputFiles(file);
  await restored
    .getByRole("button", { name: "确认合并恢复", exact: true })
    .click();
  await restored.locator(".record-row").filter({ hasText: "MOIRAI" }).waitFor();
  assert.equal(await restored.locator(".record-row").count(), 5);
  await restored.locator(".record-row").filter({ hasText: "MOIRAI" }).click();
  await restored.getByRole("button", { name: "编辑", exact: true }).click();
  assert.equal(
    await restored
      .getByLabel("循环秒数（25–60）", { exact: true })
      .inputValue(),
    "40",
  );
  assert.equal(
    await restored.getByLabel("副标题", { exact: true }).inputValue(),
    "本地元数据往返验证",
  );
  await fresh.close();
  assert.deepEqual(errors, []);
  const report = {
    date: new Date().toISOString(),
    browser: browser.version(),
    checks: [
      "从公开项目显式复制5条到空白IndexedDB",
      "编辑MOIRAI副标题、循环秒数、图片说明并保存",
      "14张图片与12张精选牌面随v2备份保存为真实字节",
      "独立浏览器上下文恢复备份，元数据与图片保持",
      "旧v1/v2兼容与公开审核门禁由单元测试补充验证",
    ],
    errors,
    scope:
      "Only clean temporary browser contexts; no user browser profile accessed. Test edits were not published.",
  };
  await writeFile(
    out + "/editor-verification.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
