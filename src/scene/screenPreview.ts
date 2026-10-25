/**
 * Original artwork for the physical MacBook panel and the DOM screen bridge.
 * Both surfaces call the same painter so the dock-in transition never swaps art.
 * No Apple wallpaper, icon file or font is embedded.
 */
export const PREVIEW_WIDTH = 2048;
export const PREVIEW_HEIGHT = 1331;
export const PREVIEW_APPS = ["Notes", "Photos", "Projects", "Resume"] as const;

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Same original scene preview is drawn on the physical display and the aligned DOM. */
export function drawScreenPreview(canvas: HTMLCanvasElement) {
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width,
    h = canvas.height;
  const sky = ctx.createLinearGradient(0, 0, w * 0.3, h);
  sky.addColorStop(0, "#122e56");
  sky.addColorStop(0.34, "#427a94");
  sky.addColorStop(0.62, "#90bfc3");
  sky.addColorStop(1, "#abc6b8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const silk = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h);
  silk.addColorStop(0, "#a3d1ce");
  silk.addColorStop(0.24, "#d6e6d8");
  silk.addColorStop(0.48, "#9bc2bf");
  silk.addColorStop(0.72, "#477d96");
  silk.addColorStop(1, "#1a3656");
  ctx.fillStyle = silk;
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.06);
  ctx.bezierCurveTo(w * 0.18, h * 0.28, w * 0.42, h * 0.46, w * 0.72, h * 0.3);
  ctx.bezierCurveTo(w * 0.9, h * 0.2, w * 1.02, h * 0.05, w * 1.08, -h * 0.05);
  ctx.closePath();
  ctx.fill();
  const warm = ctx.createLinearGradient(0, h * 0.66, w, h);
  warm.addColorStop(0, "#c9ae77");
  warm.addColorStop(0.42, "#e0dcc0");
  warm.addColorStop(0.74, "#a6c5b9");
  warm.addColorStop(1, "#538b9a");
  ctx.fillStyle = warm;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h * 0.82);
  ctx.bezierCurveTo(w * 0.32, h * 1.02, w * 0.62, h * 0.68, w * 0.92, h * 0.6);
  ctx.bezierCurveTo(w * 1.02, h * 0.57, w * 1.06, h * 0.56, w * 1.08, h * 0.55);
  ctx.lineTo(w * 1.08, h * 1.05);
  ctx.lineTo(-w * 0.1, h * 1.05);
  ctx.closePath();
  ctx.fill();
  const glow = ctx.createRadialGradient(
    w * 0.72,
    h * 0.22,
    0,
    w * 0.72,
    h * 0.22,
    w * 0.6,
  );
  glow.addColorStop(0, "rgba(230,242,222,.34)");
  glow.addColorStop(1, "rgba(129,191,201,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // Menu bar, using the visitor's real local time only.
  ctx.fillStyle = "rgba(10,18,28,.52)";
  ctx.fillRect(0, 0, w, h * 0.036);
  ctx.fillStyle = "rgba(238,244,246,.94)";
  ctx.font = `600 ${Math.round(h * 0.017)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("Personal World", w * 0.032, h * 0.0185);
  ctx.font = `500 ${Math.round(h * 0.015)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(238,244,246,.72)";
  ctx.fillText("文件", w * 0.145, h * 0.0185);
  ctx.fillText("窗口", w * 0.19, h * 0.0185);
  const now = new Date();
  const clock = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(238,244,246,.92)";
  ctx.font = `600 ${Math.round(h * 0.016)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillText(clock, w * 0.968, h * 0.0185);
  ctx.font = `500 ${Math.round(h * 0.014)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(238,244,246,.75)";
  ctx.fillText(
    `${now.getMonth() + 1}月${now.getDate()}日`,
    w * 0.905,
    h * 0.0185,
  );
  const widget = (
    x: number,
    y: number,
    ww: number,
    wh: number,
    title: string,
  ) => {
    ctx.fillStyle = "rgba(18,28,38,.34)";
    rounded(ctx, x, y, ww, wh, h * 0.022);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,248,250,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(240,248,250,.62)";
    ctx.textAlign = "left";
    ctx.font = `500 ${Math.round(h * 0.014)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillText(title, x + ww * 0.08, y + wh * 0.16);
  };
  widget(w * 0.7, h * 0.09, w * 0.13, h * 0.15, "天气");
  widget(w * 0.7, h * 0.26, w * 0.13, h * 0.18, "日历");
  ctx.fillStyle = "rgba(240,248,250,.9)";
  ctx.textAlign = "left";
  ctx.font = `300 ${Math.round(h * 0.05)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillText("—°", w * 0.735, h * 0.19);
  ctx.font = `500 ${Math.round(h * 0.013)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(240,248,250,.55)";
  ctx.fillText("未连接天气服务", w * 0.735, h * 0.225);
  ctx.fillStyle = "rgba(240,248,250,.92)";
  ctx.font = `300 ${Math.round(h * 0.04)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillText(String(now.getDate()), w * 0.735, h * 0.35);
  ctx.font = `500 ${Math.round(h * 0.013)}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(240,248,250,.55)";
  ctx.fillText(
    now.toLocaleDateString("zh-CN", { weekday: "long" }),
    w * 0.735,
    h * 0.4,
  );
  // Dock.
  const dockW = w * 0.46,
    dockH = h * 0.088,
    dockX = (w - dockW) / 2,
    dockY = h * 0.885;
  ctx.fillStyle = "rgba(232,242,244,.22)";
  rounded(ctx, dockX, dockY, dockW, dockH, dockH * 0.26);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const icons = [
    "#e8d991",
    "#adc6ad",
    "#426451",
    "#dedfd0",
    "#c2d0be",
    "#c9b48a",
  ];
  const iconSize = dockH * 0.6;
  icons.forEach((color, i) => {
    const x = dockX + dockW * 0.09 + i * dockW * 0.148;
    ctx.fillStyle = color;
    rounded(ctx, x, dockY + dockH * 0.2, iconSize, iconSize, iconSize * 0.24);
    ctx.fill();
  });
}
