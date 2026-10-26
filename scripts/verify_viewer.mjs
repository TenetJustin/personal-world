import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = (
  process.argv[2] ?? "http://127.0.0.1:5202/personal-world/"
).replace(/\/?$/, "/");
const out = resolve(process.argv[3] ?? "work/personal-content/browser");
await mkdir(out, { recursive: true });
const manifest = JSON.parse(
  await readFile("public/content/manifest.json", "utf8"),
);
const intro = manifest.records.find((entry) => entry.kind === "notes");
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [],
  failedRequests = [],
  checks = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("requestfailed", (request) =>
  failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText,
  }),
);
await context.addInitScript(() =>
  sessionStorage.setItem("personal-world-workspace", "local"),
);
const clean = async (scope) => {
  assert.equal(
    await page.locator('input[type="file"]').count(),
    0,
    `${scope}: file inputs`,
  );
  assert.equal(
    await page
      .locator(".source-switch,.dv3-edit-entry,.profile-center,form.editor")
      .count(),
    0,
    `${scope}: editor surface`,
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: /上传|填写中心|编辑工作区|备份|审核公开|新建笔记|导入照片/,
      })
      .count(),
    0,
    `${scope}: author actions`,
  );
  checks.push(scope);
};
try {
  await page.goto(base + "notes/?editor=local&workspace=local&app=profile", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: intro.title, exact: true })
    .last()
    .waitFor();
  await clean("旧编辑 URL 与本地工作区偏好仍为只读");
  await page.screenshot({ path: out + "/desktop-introduction.png" });
  await page
    .getByRole("searchbox", { name: "搜索资料" })
    .fill("不存在的检索词");
  await page.getByText("没有匹配的资料", { exact: true }).waitFor();
  await page.getByRole("searchbox", { name: "搜索资料" }).fill("");
  await page
    .getByRole("heading", { name: intro.title, exact: true })
    .last()
    .waitFor();
  checks.push("备忘录正文、搜索、清除搜索恢复正文");
  await page.getByRole("button", { name: "文件", exact: true }).click();
  assert.equal(await page.getByRole("menuitem").count(), 5);
  await clean("文件菜单仅含四个展示应用和阅读说明");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "桌面控制与演示状态说明", exact: true })
    .click();
  await clean("控制面板无编辑入口");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "帮助", exact: true }).click();
  await page.getByRole("heading", { name: "欢迎来到我的湖畔木屋。" }).waitFor();
  await clean("帮助只介绍浏览操作");
  await page.getByRole("button", { name: "关闭使用说明", exact: true }).click();
  for (const app of ["照片", "作品", "履历", "备忘录"]) {
    await page
      .getByRole("button", { name: `打开 ${app}`, exact: true })
      .click();
    await clean(`Dock ${app}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("heading", { name: intro.title, exact: true })
    .last()
    .waitFor();
  await page.screenshot({ path: out + "/mobile-introduction.png" });
  const notesWindow = page.getByRole("dialog", {
    name: "备忘录 窗口",
    exact: true,
  });
  await notesWindow
    .getByRole("button", { name: "← 列表", exact: true })
    .click();
  await notesWindow
    .getByRole("searchbox", { name: "搜索资料" })
    .waitFor({ state: "visible" });
  await notesWindow.locator(".record-row").first().click();
  await page
    .getByRole("heading", { name: intro.title, exact: true })
    .last()
    .waitFor();
  await clean("390×844 备忘录返回列表与重新阅读");
  await page.screenshot({ path: out + "/mobile-introduction.png" });
  await page.goto(base + "photos/?editor=local&app=profile", {
    waitUntil: "networkidle",
  });
  await page
    .getByText("这里的内容正在整理，稍后再来看看。", { exact: true })
    .waitFor();
  await clean("照片独立路由与旧填写链接均只展示");
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  const report = {
    date: new Date().toISOString(),
    base,
    browser: browser.version(),
    device:
      "Desktop Chrome, 1440×900 and emulated 390×844; no physical phone claim",
    checks,
    errors,
    failedRequests,
  };
  await writeFile(
    out + "/verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
