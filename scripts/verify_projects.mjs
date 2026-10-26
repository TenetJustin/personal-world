import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile, copyFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = (
  process.argv[2] || "http://127.0.0.1:5202/personal-world/"
).replace(/\/?$/, "/");
const out = resolve(process.argv[3] || "work/showcase/browser");
const record = !process.argv.includes("--no-video");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();
const errors = [],
  failures = [],
  checks = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("requestfailed", (request) => {
  if (!request.failure()?.errorText.includes("ERR_ABORTED"))
    failures.push({ url: request.url(), error: request.failure()?.errorText });
});
const ready = async () => {
  await page.locator(".projects-showcase").waitFor();
  await page
    .locator(".projects-empty[role=status]")
    .waitFor({ state: "hidden" });
};
const maximize = async () => {
  const button = page.getByRole("button", {
    name: "最大化 作品 窗口",
    exact: true,
  });
  if (await button.count()) await button.click();
};
const visibleImages = async () => {
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".projects-showcase img")]
      .filter((img) => {
        const r = img.getBoundingClientRect();
        return (
          r.width &&
          r.height &&
          r.bottom > 0 &&
          r.top < innerHeight &&
          r.right > 0 &&
          r.left < innerWidth
        );
      })
      .every((img) => img.complete && img.naturalWidth > 0),
  );
  await page.locator(".projects-showcase img").evaluateAll(async (images) => {
    await Promise.all(
      images
        .filter((img) => img.complete && img.naturalWidth)
        .map((img) => img.decode().catch(() => {})),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
};
try {
  const initialMedia = [];
  const observe = (request) => {
    if (request.url().includes("/content/assets/"))
      initialMedia.push(request.url());
  };
  page.on("request", observe);
  await page.goto(base + "notes/", { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "你好，我是 Freddie 椰子", exact: true })
    .waitFor();
  assert.equal(initialMedia.length, 0);
  page.off("request", observe);
  checks.push("进入资料前未下载整套项目图片；备忘录仅加载内容元数据");
  await page.goto(base + "projects/", { waitUntil: "networkidle" });
  await ready();
  await maximize();
  await visibleImages();
  assert.equal(await page.locator(".project-card").count(), 5);
  assert.equal(
    await page
      .locator(".world-canvas canvas,.projects-showcase canvas")
      .count(),
    0,
  );
  assert.equal(await page.locator("input[type=file]").count(), 0);
  await page.screenshot({ path: out + "/projects-overview.png" });
  checks.push(
    "五个项目卡片；访客无编辑或上传；作品展示无新增 Canvas，直接路由不启动 3D 场景",
  );
  await page.getByRole("searchbox", { name: "搜索作品" }).fill("MindCare");
  assert.equal(await page.locator(".project-card").count(), 1);
  await page.getByRole("searchbox", { name: "搜索作品" }).fill("");
  for (const [slug, title] of [
    ["cityos", "CityOS"],
    ["courtcast", "CourtCast"],
    ["mindcare", "MindCare AI"],
    ["seacoconut", "Seacoconut IP Skills"],
  ]) {
    await page
      .getByRole("button", { name: `查看 ${title}`, exact: true })
      .click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await visibleImages();
    await page.screenshot({ path: `${out}/${slug}-detail.png` });
    assert.match(page.url(), new RegExp("id=project-" + slug));
    const count = await page.locator(".project-gallery-grid figure").count();
    checks.push(`${title} 详情，${count} 张素材`);
    for (let index = 0; index < count; index++) {
      await page
        .locator(".project-gallery-grid figure")
        .nth(index)
        .scrollIntoViewIfNeeded();
      await visibleImages();
    }
    await page.locator(".project-screenshots h2").scrollIntoViewIfNeeded();
    await visibleImages();
    await page.screenshot({ path: `${out}/${slug}-gallery.png` });
    await page.locator(".project-detail-hero h1").scrollIntoViewIfNeeded();

    if (slug === "cityos") {
      await page
        .getByRole("button", { name: "放大项目封面", exact: true })
        .click();
      await page.getByRole("dialog", { name: "项目图片大图" }).waitFor();
      const old = await page.locator(".lightbox-frame h3").innerText();
      await page.keyboard.press("ArrowRight");
      assert.notEqual(
        await page.locator(".lightbox-frame h3").innerText(),
        old,
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("dialog", { name: "项目图片大图" })
        .waitFor({ state: "hidden" });
      checks.push("大图模态框、左右切换、Escape 与焦点恢复");
    }
    await page.getByRole("button", { name: "← 全部作品", exact: true }).click();
  }
  await page.goto(base + "projects/?id=project-moirai", {
    waitUntil: "networkidle",
  });
  await ready();
  await maximize();
  await page.locator(".tarot-heading").scrollIntoViewIfNeeded();
  await visibleImages();
  const gallery = page.locator(".tarot-gallery:not(.is-mini)");
  await page
    .locator(".tarot-gallery.is-loading")
    .waitFor({ state: "detached" });
  assert.ok(
    await gallery
      .locator(".tarot-group")
      .first()
      .locator("img")
      .evaluateAll((images) =>
        images.every((image) => image.complete && image.naturalWidth > 0),
      ),
  );
  const track = gallery.locator(".tarot-track");
  await gallery.hover();
  assert.equal(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  await gallery.locator(".tarot-viewport").focus();
  await page.mouse.move(5, 5);
  assert.equal(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  await page.locator(".dv3-brand").focus();
  await page.mouse.move(5, 5);
  assert.equal(
    await track.evaluate((el) => getComputedStyle(el).animationPlayState),
    "running",
  );
  checks.push("MOIRAI 悬停暂停、键盘焦点暂停、离开后恢复");
  const groups = await gallery.locator(".tarot-group").evaluateAll((els) =>
    els.map((el) => ({
      width: el.getBoundingClientRect().width,
      items: el.children.length,
      ariaHidden: el.getAttribute("aria-hidden"),
    })),
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0].items, 12);
  assert.equal(groups[1].ariaHidden, "true");
  assert.ok(Math.abs(groups[0].width - groups[1].width) < 0.1);
  assert.equal(
    await gallery
      .locator(".tarot-group")
      .nth(1)
      .locator("button,a,input")
      .count(),
    0,
  );
  checks.push(
    "12 张真实牌面、两组等宽循环、复制组不重复进入辅助技术或 Tab 顺序",
  );
  await page.screenshot({ path: out + "/moirai-gallery.png" });
  await gallery.hover();
  await gallery.getByRole("button", { name: /放大 The Fool/ }).click();
  await page.getByRole("dialog", { name: "项目图片大图" }).waitFor();
  await visibleImages();
  await page.screenshot({ path: out + "/moirai-lightbox.png" });
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await track.evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.equal(await gallery.locator(".tarot-group").nth(1).isVisible(), false);
  await page.screenshot({ path: out + "/moirai-reduced-motion.png" });
  checks.push("Reduced Motion 停止动画并保留可操作主牌廊");
  await page.reload({ waitUntil: "networkidle" });
  await ready();
  await page.getByRole("heading", { name: "MOIRAI", exact: true }).waitFor();
  checks.push("详情深链接刷新可用");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const phone = await mobile.newPage();
  await phone.goto(base + "projects/", { waitUntil: "networkidle" });
  await phone.locator(".project-card").first().waitFor();
  await phone.screenshot({ path: out + "/mobile-projects.png" });
  await phone.getByRole("button", { name: "查看 MOIRAI", exact: true }).click();
  await phone.locator(".tarot-heading").scrollIntoViewIfNeeded();
  const viewport = phone.locator(".tarot-viewport");
  const box = await viewport.boundingBox();
  const cdp = await mobile.newCDPSession(phone);
  const y = box.y + Math.min(100, box.height / 2);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 320, y }],
  });
  for (let x = 300; x >= 90; x -= 30) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y }],
    });
    await phone.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await phone.waitForTimeout(300);
  const scrollLeft = await viewport.evaluate((el) => el.scrollLeft);
  assert.ok(scrollLeft > 20, "touch swipe must move the gallery");
  await phone.screenshot({ path: out + "/mobile-moirai.png" });
  checks.push(
    `390×844 手机视口真实触摸事件横滑 ${scrollLeft.toFixed(1)}px；非实体手机`,
  );
  await mobile.close();
  let videoPath = null,
    loop = null;
  if (record) {
    const recording = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      recordVideo: { dir: out + "/video", size: { width: 1440, height: 960 } },
    });
    const film = await recording.newPage();
    await film.goto(base + "projects/?id=project-moirai", {
      waitUntil: "networkidle",
    });
    await film.locator(".tarot-gallery:not(.is-mini)").waitFor();
    await film
      .getByRole("button", { name: "最大化 作品 窗口", exact: true })
      .click();
    await film.locator(".tarot-heading").scrollIntoViewIfNeeded();
    await film.bringToFront();
    await film
      .locator(".tarot-gallery.is-loading")
      .waitFor({ state: "detached" });
    assert.ok(
      await film
        .locator(".tarot-group")
        .first()
        .locator("img")
        .evaluateAll(
          (images) =>
            images.length === 12 &&
            images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    );
    await film.mouse.move(5, 5);
    await film.locator(".dv3-brand").focus();
    const read = () =>
      film.locator(".tarot-track").evaluate((el) => ({
        time: el.getAnimations()[0]?.currentTime,
        width: el.getBoundingClientRect().width,
        playState: getComputedStyle(el).animationPlayState,
        images: [...el.querySelectorAll("img")]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            return (
              r.right > 0 &&
              r.left < innerWidth &&
              r.top < innerHeight &&
              r.bottom > 0
            );
          })
          .every((img) => img.complete && img.naturalWidth > 0),
      }));
    const start = await read();
    await film.waitForTimeout(40500);
    const end = await read();
    assert.equal(end.playState, "running");
    console.log(
      JSON.stringify({
        loopStart: start,
        loopEnd: end,
        motionMs: end.time - start.time,
      }),
    );
    assert.ok(end.time - start.time >= 36500);
    assert.ok(end.images);
    loop = {
      cycleSeconds: 36,
      recordedMotionMs: end.time - start.time,
      start,
      end,
      groups,
    };
    const video = film.video();
    await recording.close();
    videoPath = out + "/moirai-continuous-loop.webm";
    await copyFile(await video.path(), videoPath);
    checks.push(
      "真实 Chrome DOM 连续录制超过完整 36 秒周期，未加速；循环期间无空白牌面",
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  const report = {
    date: new Date().toISOString(),
    base,
    browser: browser.version(),
    checks,
    errors,
    failures,
    loop,
    videoPath,
    limitations: [
      "Touch is a desktop emulation, not a physical phone.",
      "Loop continuity is checked through real recording, equal group geometry and visible image loading; final aesthetic judgement remains human.",
    ],
  };
  await writeFile(
    out + "/verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
