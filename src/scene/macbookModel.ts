/**
 * Pure dimensions for the MacBook Air 13.6" (M-series) model.
 * Apple publishes 30.41 × 21.50 × 1.13 cm, a 13.6-inch 2560 × 1664 display.
 * Kept free of React/Three imports so Node tests and the renderer share one truth.
 */
export const MACBOOK = {
  width: 0.3041,
  depth: 0.215,
  closedThickness: 0.0113,
  baseThickness: 0.0079,
  lidThickness: 0.0034,
  lidHeight: 0.2,
  displayWidth: 0.2896,
  displayHeight: 0.18824,
  displayColumns: 2560,
  displayRows: 1664,
  lidTilt: (10 * Math.PI) / 180,
  hingeZ: 0.104,
  hingeY: 0.005,
  screenBottomBezel: 0.006,
  screenPlaneZ: -(0.0034 / 2 + 0.00024),
  baseX: -3.6,
  baseY: 2.1305,
  baseZ: 2.98,
} as const;

/**
 * Display quad in authored cabin-local metres.
 * Order: top-left, top-right, bottom-right, bottom-left as seen by the visitor.
 */
export const MACBOOK_SCREEN = (() => {
  const {
    displayWidth,
    displayHeight,
    lidTilt,
    screenBottomBezel,
    baseX,
    baseY,
    baseZ,
    hingeY,
    hingeZ,
    screenPlaneZ,
  } = MACBOOK;
  const pivotY = baseY + hingeY;
  const pivotZ = baseZ + hingeZ;
  const centerAlongLid = screenBottomBezel + displayHeight / 2;
  const cos = Math.cos(lidTilt);
  const sin = Math.sin(lidTilt);
  const point = (halfWidth: number, alongLid: number) =>
    [
      baseX + halfWidth,
      pivotY + alongLid * cos - screenPlaneZ * sin,
      pivotZ + alongLid * sin + screenPlaneZ * cos,
    ] as const;
  const top = point(0, centerAlongLid + displayHeight / 2);
  const bottom = point(0, centerAlongLid - displayHeight / 2);
  return {
    normal: [0, sin, -cos] as const,
    center: [
      baseX,
      pivotY + centerAlongLid * cos - screenPlaneZ * sin,
      pivotZ + centerAlongLid * sin + screenPlaneZ * cos,
    ] as const,
    corners: [
      [top[0] + displayWidth / 2, top[1], top[2]],
      [top[0] - displayWidth / 2, top[1], top[2]],
      [bottom[0] - displayWidth / 2, bottom[1], bottom[2]],
      [bottom[0] + displayWidth / 2, bottom[1], bottom[2]],
    ] as const,
  };
})();

/** Diagonal in inches, derived rather than typed in. */
export const MACBOOK_DISPLAY_DIAGONAL_INCHES = (Math.hypot(
  MACBOOK.displayWidth,
  MACBOOK.displayHeight,
) / 0.0254) as number;

/** Original aluminium finish palette; callers may also supply a custom bodyColor. */
export const MACBOOK_FINISHES = {
  silver: "#b8bec4",
  skyBlue: "#a9bdc9",
  starlight: "#c7bdac",
  midnight: "#343c48",
} as const;
export type MacBookFinish = keyof typeof MACBOOK_FINISHES;
