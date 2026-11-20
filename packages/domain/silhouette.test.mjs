import test from "node:test";
import assert from "node:assert/strict";
import { fitBody, silhouette } from "./silhouette.mjs";
test("三视角分别按身高校准，不接受裁切、空照片或矛盾的轮廓", () => {
  const width = 80,
    height = 160,
    pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  assert.throws(() => silhouette(pixels, width, height));
  for (let row = 12; row < 148; row++)
    for (let column = 25; column < 55; column++)
      pixels.fill(45, (row * width + column) * 4, (row * width + column) * 4 + 3);
  const front = silhouette(pixels, width, height);
  const result = fitBody(
    front,
    front.map((value) => value * 0.7),
    front,
    170
  );
  assert.ok(result.values.waist > 80 && result.rings.length === 3);
  assert.throws(() =>
    fitBody(
      front,
      front,
      front.map((value) => value * 0.5),
      170
    )
  );
});
