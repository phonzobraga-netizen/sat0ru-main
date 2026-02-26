import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const seedPath = path.resolve(repoRoot, "ml", "seed-data", "gesture-seed-v1.json");

const CLASS_LABELS = [
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
  "noGesture"
];

const sequenceLength = 12;
const featureSize = 128;

function buildSample(label, variant) {
  const labelIdx = CLASS_LABELS.indexOf(label);
  const frames = [];
  for (let t = 0; t < sequenceLength; t += 1) {
    const frame = new Array(featureSize).fill(0);
    for (let k = 0; k < featureSize; k += 1) {
      const base = Math.sin((k + 1) * (labelIdx + 1) * 0.013 + t * 0.17 + variant * 0.08);
      const mod = Math.cos((labelIdx + 1) * 0.11 + t * 0.09 + k * 0.005);
      frame[k] = base * 0.35 + mod * 0.25;
    }
    frame[63] = label === "noGesture" ? 0 : 1;
    frame[127] = labelIdx % 2 === 0 ? 1 : 0;
    frames.push(frame);
  }
  return {
    label,
    frames,
    capturedAt: new Date().toISOString(),
    source: "synthetic-seed"
  };
}

export function generateSeedPayload() {
  const samples = [];
  for (const label of CLASS_LABELS) {
    samples.push(buildSample(label, 0));
    samples.push(buildSample(label, 1));
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sequenceLength,
    featureSize,
    classLabels: CLASS_LABELS,
    sampleCount: samples.length,
    samples
  };
}

export function writeSeedFile(outputPath = seedPath) {
  const payload = generateSeedPayload();
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return payload;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const payload = writeSeedFile();
  console.log(`Wrote ${payload.sampleCount} samples to ${seedPath}`);
}
