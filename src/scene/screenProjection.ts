export type Quad = readonly (readonly [number, number])[];
export const screenProjection = {
  quad: null as Quad | null,
  width: 0,
  height: 0,
  valid: false,
  maxCornerErrorPixels: 0,
};
/** Solve a projective mapping from a DOM rectangle to the physical display quadrilateral. */
export function homography(width: number, height: number, quad: Quad) {
  const source = [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ],
    a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = source[i],
      [u, v] = quad[i];
    a.push(
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    );
  }
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++)
      if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    [a[c], a[pivot]] = [a[pivot], a[c]];
    const d = a[c][c];
    if (Math.abs(d) < 1e-10) return null;
    for (let j = c; j < 9; j++) a[c][j] /= d;
    for (let r = 0; r < 8; r++)
      if (r !== c) {
        const k = a[r][c];
        for (let j = c; j < 9; j++) a[r][j] -= k * a[c][j];
      }
  }
  return a.map((row) => row[8]);
}
export function cssMatrix(h: number[]) {
  return `matrix3d(${[h[0], h[3], 0, h[6], h[1], h[4], 0, h[7], 0, 0, 1, 0, h[2], h[5], 0, 1].join(",")})`;
}
