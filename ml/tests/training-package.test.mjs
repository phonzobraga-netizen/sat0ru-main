import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mergeDatasetPayloads, resolveModelOutputDir } from "../scripts/train.mjs";

test("mergeDatasetPayloads merges classes and samples", () => {
  const a = {
    classLabels: ["neutral", "red"],
    sequenceLength: 12,
    featureSize: 128,
    samples: [{ label: "neutral", frames: [new Array(128).fill(0)] }]
  };
  const b = {
    classLabels: ["blue"],
    samples: [{ label: "blue", frames: [new Array(128).fill(0)] }]
  };

  const merged = mergeDatasetPayloads(a, b);
  assert.equal(merged.classLabels.length, 3);
  assert.equal(merged.samples.length, 2);
});

test("resolveModelOutputDir points to gesture-v1 model path", () => {
  const out = resolveModelOutputDir();
  assert.equal(path.basename(out), "gesture-v1");
});
