import test from "node:test";
import assert from "node:assert/strict";
import {
  MACBOOK,
  MACBOOK_DISPLAY_DIAGONAL_INCHES,
  MACBOOK_SCREEN,
} from "../src/scene/macbookModel.ts";
import {
  LAPTOP_SCREEN_CENTER_LOCAL,
  LAPTOP_SCREEN_LOCAL,
} from "../src/scene/architecture.ts";
import { homography } from "../src/scene/screenProjection.ts";

test("MacBook enclosure and 13.6-inch panel match Apple's published dimensions", () => {
  assert.equal(MACBOOK.width, 0.3041);
  assert.equal(MACBOOK.depth, 0.215);
  assert.equal(MACBOOK.closedThickness, 0.0113);
  assert.ok(
    Math.abs(
      MACBOOK.baseThickness + MACBOOK.lidThickness - MACBOOK.closedThickness,
    ) < 1e-12,
    "closed lid plus base must equal the published closed thickness",
  );
  assert.equal(MACBOOK.displayColumns, 2560);
  assert.equal(MACBOOK.displayRows, 1664);
  assert.ok(
    Math.abs(
      MACBOOK.displayWidth / MACBOOK.displayHeight -
        MACBOOK.displayColumns / MACBOOK.displayRows,
    ) < 1e-6,
    "panel aspect must match the native 2560×1664 buffer",
  );
  assert.ok(
    Math.abs(MACBOOK_DISPLAY_DIAGONAL_INCHES - 13.6) < 0.02,
    `derived diagonal ${MACBOOK_DISPLAY_DIAGONAL_INCHES.toFixed(3)}in must be 13.6in`,
  );
});

test("clickable screen quad is derived from the model, not typed twice", () => {
  assert.deepEqual(LAPTOP_SCREEN_LOCAL, MACBOOK_SCREEN.corners);
  assert.deepEqual(LAPTOP_SCREEN_CENTER_LOCAL, MACBOOK_SCREEN.center);
  const [tl, tr, br, bl] = MACBOOK_SCREEN.corners;
  assert.ok(
    Math.abs(tl[0] - tr[0] - MACBOOK.displayWidth) < 1e-12,
    "top edge must equal the physical panel width",
  );
  const vertical = Math.hypot(tl[1] - bl[1], tl[2] - bl[2]);
  assert.ok(
    Math.abs(vertical - MACBOOK.displayHeight) < 1e-12,
    "side edge must equal the physical panel height",
  );
  const diagonal = Math.hypot(br[0] - tl[0], br[1] - tl[1], br[2] - tl[2]);
  assert.ok(
    Math.abs(diagonal - Math.hypot(MACBOOK.displayWidth, MACBOOK.displayHeight)) <
      1e-12,
  );
  assert.ok(tl[2] > bl[2], "the lid leans back, so the top edge sits deeper");
});

test("DOM bridge homography maps the real display corners without drift", () => {
  const width = 1440,
    height = 900;
  const quad = [
    [553, 345],
    [887, 345],
    [878, 550],
    [562, 550],
  ] as const;
  const matrix = homography(width, height, quad);
  assert.ok(matrix, "a real display quad must be invertible");
  const project = (x: number, y: number) => {
    const d = matrix[6] * x + matrix[7] * y + 1;
    return [
      (matrix[0] * x + matrix[1] * y + matrix[2]) / d,
      (matrix[3] * x + matrix[4] * y + matrix[5]) / d,
    ];
  };
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  corners.forEach(([x, y], index) => {
    const [u, v] = project(x, y);
    assert.ok(Math.hypot(u - quad[index][0], v - quad[index][1]) < 1e-6);
  });
});
