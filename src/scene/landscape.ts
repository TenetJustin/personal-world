export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function shoreX(z: number) {
  return -8 + 7.5 * Math.sin(z * 0.029) + 1.4 * Math.sin(z * 0.081);
}
export function landDistance(x: number, z: number) {
  return Math.max(
    x - shoreX(z),
    -245 + 26 * Math.sin(z * 0.013) - x,
    Math.abs(z + 10) - 130 + 0.0006 * (x + 100) ** 2,
  );
}
export function groundHeight(x: number, z: number) {
  const d = landDistance(x, z);
  const n =
    Math.sin(x * 0.21 + Math.sin(z * 0.11)) * Math.cos(z * 0.17) * 0.12 +
    Math.sin(x * 0.91 + z * 0.71) * 0.016;
  let h = -4.1 + 4.72 * smooth(-10, 7, d) + n * smooth(-3, 4, d);
  const pad = 1 - smooth(5, 8, Math.max(Math.abs(x), Math.abs(z) * 1.1));
  h = h * (1 - pad) + 0.65 * pad;
  if (z < -25)
    h += smooth(-25, -140, z) * (4.5 + 3 * Math.sin(x * 0.025 + z * 0.01)); // terrain stays local; distant relief is a separate layer.
  return h;
}
export function pathX(z: number) {
  return 0.34 * z + 2;
}
export function random(seed = 713) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const SHOTS = {
  A: {
    id: "S01",
    name: "湖岸远望",
    position: [6, 2.6, 34] as const,
    target: [-8, 4.0, 0] as const,
    fov: 48,
  },
  B: {
    id: "S02",
    name: "接近木屋",
    position: [7.8, 2.3, 11.8] as const,
    target: [0, 2.7, 0.2] as const,
    fov: 47,
  },
};
