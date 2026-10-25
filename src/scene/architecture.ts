/** Metres, Y up. Local +Z is the lake-facing front of the authored cabin. */
export type CabinPoint = readonly [number, number, number];
export const CABIN = {
  origin: [8, 0, -3] as CabinPoint,
  rotationY: (-35 * Math.PI) / 180,
  floorY: 1.37,
  eyeHeight: 1.65,
  interior: { minX: -5.82, maxX: 5.82, minZ: -4.32, maxZ: 4.32 },
  door: {
    centerX: 1.11,
    planeZ: 4.5,
    minX: 0.555,
    maxX: 1.665,
    bottomY: 1.35,
    topY: 3.67,
    hinge: [0.55, 1.35, 4.5] as CabinPoint,
    swingRadians: (100 * Math.PI) / 180,
  },
  porch: { minX: -8.17, maxX: 8.17, minZ: 4.435, maxZ: 7.085, floorY: 1.3525 },
  stairs: {
    centerX: 1.16,
    minX: 0.2,
    maxX: 2.12,
    treadDepth: 0.315,
    centersZ: [7.03, 7.33, 7.63, 7.93, 8.23],
    topsY: [1.335, 1.165, 0.995, 0.825, 0.655],
  },
} as const;

export function cabinToWorld(p: CabinPoint): [number, number, number] {
  const c = Math.cos(CABIN.rotationY),
    s = Math.sin(CABIN.rotationY);
  return [8 + c * p[0] + s * p[2], p[1], -3 - s * p[0] + c * p[2]];
}
export function worldToCabin(p: CabinPoint): [number, number, number] {
  const c = Math.cos(CABIN.rotationY),
    s = Math.sin(CABIN.rotationY),
    x = p[0] - 8,
    z = p[2] + 3;
  return [c * x - s * z, p[1], s * x + c * z];
}
/** Returns a walking surface only where actual authored floor/deck/treads exist. */
export function architecturalFloor(x: number, z: number): number | null {
  const b = CABIN.interior;
  if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ)
    return CABIN.floorY;
  if (
    x >= CABIN.door.minX &&
    x <= CABIN.door.maxX &&
    z > b.maxZ &&
    z < CABIN.porch.minZ
  )
    return 1.3525;
  const p = CABIN.porch;
  if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) return p.floorY;
  if (x >= CABIN.stairs.minX && x <= CABIN.stairs.maxX)
    for (let i = 0; i < 5; i++)
      if (Math.abs(z - CABIN.stairs.centersZ[i]) <= CABIN.stairs.treadDepth / 2)
        return CABIN.stairs.topsY[i];
  return null;
}

/** Furniture bounds include their legs/backs. Camera controller expands by body radius. */
export const INTERIOR_COLLIDERS = [
  { id: "desk", minX: -4.55, maxX: -2.65, minZ: 2.525, maxZ: 3.375 },
  { id: "parked-chair", minX: -4.94, maxX: -4.26, minZ: 1.49, maxZ: 2.17 },
  { id: "reading-bench", minX: 2.85, maxX: 5.1, minZ: -3.95, maxZ: -3.15 },
  { id: "bookcase", minX: -5.63, maxX: -5.2, minZ: -3.5, maxZ: -1.55 },
] as const;

// Exact screen display corners, also used to author the render geometry below.
// Order: top-left, top-right, bottom-right, bottom-left as seen by the visitor.
export const LAPTOP_SCREEN_LOCAL = [
  [-3.426, 2.405, 3.155],
  [-3.774, 2.405, 3.155],
  [-3.774, 2.181, 3.105],
  [-3.426, 2.181, 3.105],
] as const;
export const LAPTOP_SCREEN_WORLD = LAPTOP_SCREEN_LOCAL.map(cabinToWorld);
export const LAPTOP_SCREEN_CENTER_LOCAL: CabinPoint = [-3.6, 2.293, 3.13];
export const LAPTOP_SCREEN_CENTER_WORLD = cabinToWorld(
  LAPTOP_SCREEN_CENTER_LOCAL,
);
export const INTERIOR_ANCHORS = {
  threshold: [1.11, 3.0025, 4.5] as CabinPoint,
  entry: [1.11, 3.02, 3.3] as CabinPoint,
  room: [0.25, 3.02, 0.7] as CabinPoint,
  lakeView: [-3.8, 2.95, 4.5] as CabinPoint,
  desk: [-3.6, 3.02, 1.1] as CabinPoint,
  screenLean: [-3.6, 2.57, 2.35] as CabinPoint,
  screen: LAPTOP_SCREEN_CENTER_LOCAL,
} as const;
