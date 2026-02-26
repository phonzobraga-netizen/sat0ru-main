import test from "node:test";
import assert from "node:assert/strict";
import { createPredictionStateMachine } from "../src/vision/predictionStateMachine.js";

test("prediction state machine commits with 4-of-6 vote", () => {
  const machine = createPredictionStateMachine({
    voteWindow: 6,
    voteMin: 4,
    holdMs: 600,
    neutralMs: 900
  });

  let ts = 0;
  const labels = ["red", "red", "blue", "red", "red", "red"];
  let result;
  for (const label of labels) {
    ts += 33;
    result = machine.update({ timestamp: ts, label, confidence: 0.8, hasHands: true });
  }

  assert.equal(result.technique, "red");
  assert.equal(result.phase, "stable");
});

test("prediction state machine holds then neutralizes", () => {
  const machine = createPredictionStateMachine({
    voteWindow: 6,
    voteMin: 4,
    holdMs: 600,
    neutralMs: 900
  });

  let ts = 0;
  for (let i = 0; i < 6; i += 1) {
    ts += 33;
    machine.update({ timestamp: ts, label: "purple", confidence: 0.9, hasHands: true });
  }

  const hold = machine.update({ timestamp: ts + 500, label: "noGesture", confidence: 0.1, hasHands: false });
  assert.equal(hold.technique, "purple");

  const neutral = machine.update({ timestamp: ts + 1000, label: "noGesture", confidence: 0.1, hasHands: false });
  assert.equal(neutral.technique, "neutral");
  assert.equal(neutral.phase, "neutral");
});
