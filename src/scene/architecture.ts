/** Metres, Y up. Local +Z is the lake-facing front of the authored cabin. */
import { MACBOOK_SCREEN } from "./macbookModel.ts";
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
/** The mezzanine is a real slab with a stairwell, not a second opaque ceiling. */
export const INTERIOR_STAIR = {
  minX: -5.45, maxX: -4.30, centerX: -4.875,
  bottomZ: -3.45, topZ: .30, treadRun: .25, rise: .18,
  treadCount: 15, totalRisers: 16, lowerY: 1.37, upperY: 4.25,
  bottomApproach: [-4.875, 1.37, -3.95] as CabinPoint,
  topApproach: [-4.875, 4.25, .95] as CabinPoint,
} as const;
export const UPPER_FLOOR = {
  minX: -5.82, maxX: 5.82, minZ: -4.32, maxZ: 1.65,
  floorY: 4.25, undersideY: 4.03,
  opening: { minX: -5.55, maxX: -4.20, minZ: -3.47, maxZ: .30 },
} as const;
export function hasUpperFloor(x: number, z: number) {
  const f=UPPER_FLOOR, h=f.opening;
  return x>=f.minX && x<=f.maxX && z>=f.minZ && z<=f.maxZ &&
    !(x>h.minX && x<h.maxX && z>h.minZ && z<h.maxZ);
}
export function interiorStairHeight(x: number, z: number): number | null {
  const s=INTERIOR_STAIR;
  if (x<s.minX || x>s.maxX || z<s.bottomZ || z>=s.topZ) return null;
  const index=Math.min(s.treadCount-1,Math.floor((z-s.bottomZ)/s.treadRun));
  return s.lowerY+(index+1)*s.rise;
}
/** Old 2-argument callers retain the main level. Physics passes the current foot Y.
 * Select the highest real surface reachable by a .23m step, never the floor above a room.
 */
export function architecturalFloor(x: number, z: number, referenceFootY?: number): number | null {
  const b = CABIN.interior;
  if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
    if (referenceFootY === undefined) return CABIN.floorY;
    const candidates: number[]=[CABIN.floorY];
    const step=interiorStairHeight(x,z);
    if(step!==null && step<=referenceFootY+.23) candidates.push(step);
    if(hasUpperFloor(x,z) && UPPER_FLOOR.floorY<=referenceFootY+.23) candidates.push(UPPER_FLOOR.floorY);
    return Math.max(...candidates);
  }
  if(x>=CABIN.door.minX && x<=CABIN.door.maxX && z>b.maxZ && z<CABIN.porch.minZ) return 1.3525;
  const p=CABIN.porch;
  if(x>=p.minX && x<=p.maxX && z>=p.minZ && z<=p.maxZ) return p.floorY;
  if(x>=CABIN.stairs.minX && x<=CABIN.stairs.maxX)
    for(let i=0;i<5;i++) if(Math.abs(z-CABIN.stairs.centersZ[i])<=CABIN.stairs.treadDepth/2) return CABIN.stairs.topsY[i];
  return null;
}
/** Actual local underside: sloped roof liner, rafters, mezzanine and front carrying beam. */
export function interiorCeilingHeight(x: number, z: number, referenceFootY: number = CABIN.floorY): number {
  let ceiling=8.5-(3.4/4.9)*Math.abs(z)-.12;
  const rafters=[-5.4,-4.2,-3,-1.8,-.6,.6,1.8,3,4.2,5.4];
  if(rafters.some(r=>Math.abs(x-r)<.075)) ceiling-=.19;
  if(referenceFootY<3.7 && hasUpperFloor(x,z)) ceiling=Math.min(ceiling,UPPER_FLOOR.undersideY);
  if(referenceFootY<3.7 && Math.abs(z-1.55)<.115) ceiling=Math.min(ceiling,3.79);
  const step=interiorStairHeight(x,z);
  if(step!==null && referenceFootY+.30<step) ceiling=Math.min(ceiling,step-.085);
  return ceiling;
}
export type WalkCollider={id:string;minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number};
export const WALK_COLLIDERS: readonly WalkCollider[] = [
  { id:"desk", minX:-4.55,maxX:-2.65,minZ:2.525,maxZ:3.375,minY:1.37,maxY:2.13 },
  { id:"desk-chair", minX:-2.55,maxX:-1.95,minZ:2.62,maxZ:3.32,minY:1.37,maxY:2.31 },
  { id:"record-player-cabinet", minX:-5.56,maxX:-4.44,minZ:1.24,maxZ:2.22,minY:1.37,maxY:2.44 },
  { id:"sofa", minX:2.40,maxX:4.95,minZ:1.72,maxZ:3.05,minY:1.37,maxY:2.31 },
  { id:"coffee-table", minX:2.90,maxX:4.10,minZ:.45,maxZ:1.10,minY:1.37,maxY:1.80 },
  { id:"fireplace-hearth", minX:4.40,maxX:5.80,minZ:-1.05,maxZ:1.05,minY:1.37,maxY:4.03 },
  { id:"kitchen-base", minX:-1.85,maxX:4.62,minZ:-4.25,maxZ:-3.48,minY:1.37,maxY:2.29 },
  { id:"kitchen-shelving", minX:-2.60,maxX:-1.10,minZ:-4.30,maxZ:-3.92,minY:2.54,maxY:3.36 },
  { id:"refrigerator", minX:4.72,maxX:5.55,minZ:-4.24,maxZ:-3.45,minY:1.37,maxY:3.27 },
  { id:"dining-table", minX:-.50,maxX:1.30,minZ:-2.08,maxZ:-1.22,minY:1.37,maxY:2.13 },
  { id:"dining-chair-west", minX:-1.27,maxX:-.70,minZ:-1.95,maxZ:-1.35,minY:1.37,maxY:2.25 },
  { id:"dining-chair-east", minX:1.49,maxX:2.06,minZ:-1.95,maxZ:-1.35,minY:1.37,maxY:2.25 },
  { id:"dining-chair-back", minX:.08,maxX:.72,minZ:-2.80,maxZ:-2.25,minY:1.37,maxY:2.25 },
  { id:"dining-chair-front", minX:.08,maxX:.72,minZ:-1.05,maxZ:-.48,minY:1.37,maxY:2.25 },
  { id:"stair-guard-left", minX:-5.55,maxX:-5.45,minZ:-3.45,maxZ:.30,minY:1.37,maxY:5.30 },
  { id:"stair-guard-right", minX:-4.30,maxX:-4.20,minZ:-3.45,maxZ:.30,minY:1.37,maxY:5.30 },
  { id:"upper-opening-back", minX:-5.55,maxX:-4.20,minZ:-3.52,maxZ:-3.42,minY:4.25,maxY:5.30 },
  { id:"upper-balcony-rail", minX:-5.82,maxX:5.82,minZ:1.60,maxZ:1.70,minY:4.25,maxY:5.30 },
  ...[-5.55,-1.8,2.4,5.55].map(x=>({id:`mezzanine-post-${x}`,minX:x-.10,maxX:x+.10,minZ:1.45,maxZ:1.65,minY:1.37,maxY:4.03})),
  { id:"bed", minX:-3.45,maxX:-1.35,minZ:-3.85,maxZ:-1.62,minY:4.25,maxY:5.21 },
  { id:"bedside-table", minX:-1.20,maxX:-.65,minZ:-3.20,maxZ:-2.65,minY:4.25,maxY:4.84 },
  { id:"reading-chair", minX:2.65,maxX:3.58,minZ:-1.9,maxZ:-.93,minY:4.25,maxY:5.26 },
  { id:"reading-side-table", minX:3.73,maxX:4.33,minZ:-1.65,maxZ:-1.05,minY:4.25,maxY:4.86 },
  { id:"upper-bookcase", minX:4.65,maxX:5.30,minZ:-2.90,maxZ:-1.4,minY:4.25,maxY:5.42 },
];
/** Kept for legacy tour clearance callers; upper furniture needs height-aware WALK_COLLIDERS. */
export const INTERIOR_COLLIDERS=WALK_COLLIDERS.filter(c=>c.minY<2);

// Exact screen display corners, also used to author the render geometry below.
// Order: top-left, top-right, bottom-right, bottom-left as seen by the visitor.
/** Derived from the same dimensions that build the model (macbookModel.ts). */
export const LAPTOP_SCREEN_LOCAL = MACBOOK_SCREEN.corners;
export const LAPTOP_SCREEN_WORLD = LAPTOP_SCREEN_LOCAL.map(cabinToWorld);
export const LAPTOP_SCREEN_CENTER_LOCAL: CabinPoint = MACBOOK_SCREEN.center;
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
