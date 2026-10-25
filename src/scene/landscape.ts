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
export function cabinLocal(x: number, z: number) {
  const a = (-35 * Math.PI) / 180,
    dx = x - 8,
    dz = z + 3;
  return {
    x: Math.cos(a) * dx - Math.sin(a) * dz,
    z: Math.sin(a) * dx + Math.cos(a) * dz,
  };
}
export function groundHeight(x: number, z: number) {
  const d = landDistance(x, z);
  const relief =
    0.22 * Math.sin(x * 0.16 + Math.sin(z * 0.09)) * Math.cos(z * 0.12) +
    0.13 * Math.sin(z * 0.31 + x * 0.12) +
    0.035 * Math.sin(x * 1.7 + z * 0.95);
  let h = -4.1 + 4.72 * smooth(-10, 7, d) + relief * smooth(3, 10, d);
  h +=
    0.6 * Math.exp(-((x - 19) ** 2 + (z - 22) ** 2) / 180) * smooth(6, 14, d);
  const local = cabinLocal(x, z);
  const pad =
    1 - smooth(5.5, 9.0, Math.max(Math.abs(local.x) * 0.72, Math.abs(local.z)));
  h = h * (1 - pad) + (0.64 + 0.008 * (x - 8) - 0.008 * (z + 3)) * pad;
  if (z < -25)
    h +=
      smooth(-25, -180, z) *
      (9 +
        7 * Math.sin(x * 0.022 + z * 0.013) +
        4 * Math.sin(x * 0.041 - z * 0.018)) *
      smooth(6, 30, d);
  return h;
}
export function pathX(z: number) {
  return 8.5 + 3.6 * Math.sin((z - 15) * 0.065);
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
    position: [6, 2.8, 43] as const,
    target: [-3, 4.0, -3] as const,
    fov: 48,
  },
  B: {
    id: "S02",
    name: "侧前方接近",
    position: [15, 3.2, 20] as const,
    target: [7, 4.1, -3] as const,
    fov: 48,
  },
};
export const INSPECTION_SHOTS = {
  C: {
    position: [-12, 4.0, 16] as const,
    target: [8, 4.2, -3] as const,
    fov: 48,
  },
  D: {
    position: [31, 4.8, -1] as const,
    target: [8, 4.0, -3] as const,
    fov: 48,
  },
  E: {
    position: [3, 5.0, -29] as const,
    target: [8, 4.1, -3] as const,
    fov: 48,
  },
};
