/** Original ANSI 78-key layout. Metres; +X is visitor-left, +Z is the hinge. */
export const KEYBOARD = {
  pitchX: 0.0182,
  pitchZ: 0.0168,
  gap: 0.0024,
  backZ: 0.0935,
  width: 14.5 * 0.0182,
  depth: 6 * 0.0168,
  keyHeight: 0.0009,
  centerZ: 0.0935 - 2.5 * 0.0168,
} as const;
export type MacBookKey = {
  label: string;
  units: number;
  row: number;
  x: number;
  z: number;
  heightScale: number;
};
type KeySpec = { label: string; units: number };
const unit = (label: string, units = 1): KeySpec => ({ label, units });
const ROWS: KeySpec[][] = [
  [
    unit("esc"),
    ...Array.from({ length: 12 }, (_, i) => unit(`F${i + 1}`)),
    unit("Touch ID"),
  ],
  [
    unit("`"),
    ..."1234567890".split("").map((l) => unit(l)),
    unit("-"),
    unit("="),
    unit("delete", 1.5),
  ],
  [
    unit("tab", 1.5),
    ..."QWERTYUIOP".split("").map((l) => unit(l)),
    unit("["),
    unit("]"),
    unit("\\"),
  ],
  [
    unit("caps", 1.75),
    ..."ASDFGHJKL".split("").map((l) => unit(l)),
    unit(";"),
    unit("'"),
    unit("return", 1.75),
  ],
  [
    unit("shift", 2.25),
    ..."ZXCVBNM".split("").map((l) => unit(l)),
    unit(","),
    unit("."),
    unit("/"),
    unit("shift", 2.25),
  ],
  [
    unit("fn"),
    unit("control"),
    unit("option"),
    unit("command", 1.25),
    unit("", 5),
    unit("command", 1.25),
    unit("option"),
  ],
];
export function buildMacBookKeys(): MacBookKey[] {
  const keys: MacBookKey[] = [];
  for (let row = 0; row < ROWS.length; row++) {
    // The last row reserves three full-width columns for four half-height arrows.
    let cursor = -14.5 / 2;
    if (row === 0) cursor = -14 / 2;
    for (const key of ROWS[row]) {
      keys.push({
        ...key,
        row,
        x: -(cursor + key.units / 2) * KEYBOARD.pitchX,
        z: KEYBOARD.backZ - row * KEYBOARD.pitchZ,
        heightScale: 1,
      });
      cursor += key.units;
    }
    if (row === 5) {
      const x = (column: number) => -(cursor + column + 0.5) * KEYBOARD.pitchX,
        z = KEYBOARD.backZ - row * KEYBOARD.pitchZ;
      keys.push({
        label: "←",
        units: 1,
        row,
        x: x(0),
        z: z - KEYBOARD.pitchZ / 4,
        heightScale: 0.5,
      });
      keys.push({
        label: "↑",
        units: 1,
        row,
        x: x(1),
        z: z + KEYBOARD.pitchZ / 4,
        heightScale: 0.5,
      });
      keys.push({
        label: "↓",
        units: 1,
        row,
        x: x(1),
        z: z - KEYBOARD.pitchZ / 4,
        heightScale: 0.5,
      });
      keys.push({
        label: "→",
        units: 1,
        row,
        x: x(2),
        z: z - KEYBOARD.pitchZ / 4,
        heightScale: 0.5,
      });
    }
  }
  return keys;
}
/** Canvas (top-left origin) → the physical label plane shares these same bounds. */
export function keyLegendUV(key: Pick<MacBookKey, "x" | "z">) {
  return [
    (KEYBOARD.width / 2 - key.x) / KEYBOARD.width,
    (KEYBOARD.centerZ + KEYBOARD.depth / 2 - key.z) / KEYBOARD.depth,
  ] as const;
}
