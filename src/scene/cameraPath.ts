import { CatmullRomCurve3, Vector3 } from "three";
import { SHOTS } from "./landscape.ts";
export function createCameraPath() {
  return new CatmullRomCurve3(
    [
      new Vector3(...SHOTS.A.position),
      new Vector3(7.8, 2.5, 27),
      new Vector3(9.5, 2.3, 20),
      new Vector3(...SHOTS.B.position),
    ],
    false,
    "centripetal",
  );
}
export const NEAR_TREE_BASES = [
  { x: 10, z: -12 },
  { x: -8, z: -14 },
  { x: 17, z: 9 },
  { x: 16, z: 33 },
  { x: 4, z: -21 },
  { x: 20, z: -8 },
  { x: 13, z: 25 },
  { x: 25, z: 15 },
];
