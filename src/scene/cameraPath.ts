import { CatmullRomCurve3, Vector3 } from "three";
import { SHOTS } from "./landscape.ts";
export function createCameraPath() {
  return new CatmullRomCurve3(
    [
      new Vector3(...SHOTS.A.position),
      new Vector3(9.0, 2.7, 33),
      new Vector3(13.0, 2.8, 27),
      new Vector3(...SHOTS.B.position),
    ],
    false,
    "centripetal",
  );
}
export const NEAR_TREE_BASES = [
  { x: 23, z: 29 },
  { x: 31, z: 18 },
  { x: 28, z: -13 },
  { x: 5, z: -23 },
  { x: -1, z: -19 },
  { x: 19, z: -22 },
  { x: 40, z: -8 },
  { x: 35, z: 36 },
  { x: 2, z: 58 },
];
