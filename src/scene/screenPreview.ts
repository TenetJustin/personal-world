export const PREVIEW_WIDTH = 768;
export const PREVIEW_HEIGHT = 504;
export const SCREEN_THEME = {
  background: "#c2d0be",
  paper: "#f7faef",
  ink: "#345b47",
  muted: "#74836c",
};
export const PREVIEW_APPS = [
  { name: "Notes", color: "#e8d991" },
  { name: "Photos", color: "#adc6ad" },
  { name: "Projects", color: "#426451" },
  { name: "Resume", color: "#dedfd0" },
];
/** Same original scene preview is drawn on the physical display and the aligned DOM. */
export function drawScreenPreview(canvas: HTMLCanvasElement) {
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = SCREEN_THEME.background;
  ctx.fillRect(0, 0, 768, 504);
  ctx.fillStyle = SCREEN_THEME.paper;
  ctx.fillRect(30, 35, 708, 405);
  ctx.fillStyle = SCREEN_THEME.ink;
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("PERSONAL WORLD", 58, 76);
  ctx.fillStyle = SCREEN_THEME.muted;
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText("YOUR PRIVATE LIBRARY", 58, 100);
  PREVIEW_APPS.forEach((app, i) => {
    ctx.fillStyle = app.color;
    ctx.fillRect(100 + i * 150, 195, 65, 65);
    ctx.fillStyle = SCREEN_THEME.ink;
    ctx.font = "15px Arial, sans-serif";
    ctx.fillText(app.name, 100 + i * 150, 287);
  });
  ctx.fillStyle = SCREEN_THEME.muted;
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText("A place for your stories.", 58, 405);
}
