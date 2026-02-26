import test from "node:test";
import assert from "node:assert/strict";
import { TECHNIQUE_META } from "../src/config.js";
import { fillTargets } from "../src/three/techniques.js";

const expected = [
  "neutral",
  "red",
  "blue",
  "void",
  "purple",
  "shrine",
  "blackflash",
  "meteor",
  "cleaveStorm",
  "dismantleSpiral",
  "ratioStrike",
  "boogieRipple",
  "doubleMiddleMonkey"
];

test("technique registry contains expanded technique set", () => {
  for (const id of expected) {
    assert.ok(TECHNIQUE_META[id], `Missing TECHNIQUE_META for ${id}`);
  }
});

test("fillTargets produces data for all expanded techniques", () => {
  for (const id of expected) {
    const count = 256;
    const targetPositions = new Float32Array(count * 3);
    const targetColors = new Float32Array(count * 3);
    fillTargets(id, count, targetPositions, targetColors);

    const magnitude = targetPositions.reduce((sum, value) => sum + Math.abs(value), 0);
    assert.ok(Number.isFinite(magnitude));
    if (id !== "neutral") {
      assert.ok(magnitude > 0, `Technique ${id} produced empty positions`);
    }
  }
});
