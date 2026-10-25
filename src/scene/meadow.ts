import * as THREE from "three";
/** Full scanned grass-clump regions from Poly Haven grass_medium_01's original
 * atlas. Four bent, intersecting strips give volume; detailed source meshes are
 * retained separately in the closest camera foreground. */
export function meadowClump(variant: number, material: THREE.Material) {
  const patches = [
    [0.17, 0.09, 0.5, 0.26],
    [0.56, 0.125, 0.81, 0.27],
    [0.2, 0.0, 0.49, 0.115],
    [0.565, 0.0, 0.8, 0.13],
    [0.0, 0.0, 0.19, 0.145],
  ];
  const [u0, v0, u1, v1] = patches[variant % patches.length];
  const positions: number[] = [],
    normals: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let strip = 0; strip < 4; strip++) {
    const angle = (strip * Math.PI) / 4 + variant * 0.47,
      c = Math.cos(angle),
      s = Math.sin(angle),
      start = positions.length / 3;
    const width = 0.43 + variant * 0.018,
      height = 0.24 + variant * 0.012;
    for (let row = 0; row <= 2; row++) {
      const t = row / 2,
        bend = t * t * 0.075;
      for (const side of [-1, 1]) {
        const x = side * width * 0.5;
        positions.push(x * c + bend * s, height * t, -x * s + bend * c);
        normals.push(0.12 * c, 0.98, -0.12 * s);
        uv.push(side < 0 ? u0 : u1, 1 - (v0 + (v1 - v0) * t));
      }
    }
    for (let row = 0; row < 2; row++) {
      const i = start + row * 2;
      indices.push(i, i + 1, i + 3, i, i + 3, i + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  return new THREE.Mesh(g, material);
}
