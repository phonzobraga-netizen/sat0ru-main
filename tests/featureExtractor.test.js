import test from "node:test";
import assert from "node:assert/strict";
import { extractFrameFeatures, getFeatureDimensions } from "../src/vision/featureExtractor.js";

function buildHand(offsetX, offsetY, offsetZ = 0) {
  const points = [];
  for (let i = 0; i < 21; i += 1) {
    points.push({
      x: offsetX + i * 0.01,
      y: offsetY + i * 0.008,
      z: offsetZ + i * 0.004
    });
  }
  return points;
}

test("feature extractor emits stable shape for one and two hands", () => {
  const dims = getFeatureDimensions();

  const one = extractFrameFeatures({
    multiHandLandmarks: [buildHand(0.1, 0.2)],
    multiHandedness: [{ label: "Left" }]
  });

  assert.equal(one.vector.length, dims.frameFeatureSize);
  assert.equal(one.handCount, 1);

  const two = extractFrameFeatures({
    multiHandLandmarks: [buildHand(0.1, 0.2), buildHand(0.4, 0.3)],
    multiHandedness: [{ label: "Left" }, { label: "Right" }]
  });

  assert.equal(two.vector.length, dims.frameFeatureSize);
  assert.equal(two.handCount, 2);
});

test("feature extractor is translation-invariant after wrist centering", () => {
  const a = extractFrameFeatures({
    multiHandLandmarks: [buildHand(0.1, 0.2)],
    multiHandedness: [{ label: "Left" }]
  });

  const b = extractFrameFeatures({
    multiHandLandmarks: [buildHand(1.1, -0.8)],
    multiHandedness: [{ label: "Left" }]
  });

  for (let i = 0; i < a.vector.length; i += 1) {
    assert.ok(Math.abs(a.vector[i] - b.vector[i]) < 1e-6);
  }
});
