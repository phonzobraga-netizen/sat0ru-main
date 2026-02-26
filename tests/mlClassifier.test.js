import test from "node:test";
import assert from "node:assert/strict";
import { createMlClassifier } from "../src/vision/mlClassifier.js";

function createTfMock(probabilities) {
  return {
    loadLayersModel: async () => ({
      predict: () => ({
        dataSync: () => Float32Array.from(probabilities)
      })
    }),
    tidy(fn) {
      return fn();
    },
    tensor() {
      return { dispose() {} };
    }
  };
}

test("mlClassifier loads and maps highest probability label", async () => {
  const labels = ["neutral", "red", "blue"];
  const classifier = createMlClassifier({
    classLabels: labels,
    sequenceLength: 2,
    minPredictConfidence: 0.1,
    tfApi: createTfMock([0.2, 0.7, 0.1])
  });

  const loaded = await classifier.load();
  assert.equal(loaded, true);

  const prediction = classifier.predict([
    Float32Array.from([0, 1]),
    Float32Array.from([0, 1])
  ]);

  assert.equal(prediction.ok, true);
  assert.equal(prediction.label, "red");
});

test("mlClassifier handles model load failure", async () => {
  const classifier = createMlClassifier({
    classLabels: ["neutral", "red"],
    sequenceLength: 2,
    tfApi: {
      loadLayersModel: async () => {
        throw new Error("missing model");
      }
    }
  });

  const loaded = await classifier.load();
  assert.equal(loaded, false);
  assert.equal(classifier.isReady(), false);
});
