import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as tf from "@tensorflow/tfjs";
import { mergeDatasetPayloads, resolveModelOutputDir } from "./train.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function argmax(values) {
  let idx = 0;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] > max) {
      max = values[i];
      idx = i;
    }
  }
  return idx;
}

async function loadLocalLayersModel(modelDir) {
  const modelJsonPath = path.resolve(modelDir, "model.json");
  const modelJson = readJson(modelJsonPath);
  if (!modelJson) {
    throw new Error("Model artifact missing. Run npm run train first.");
  }

  const manifest = modelJson.weightsManifest?.[0];
  const weightPath = path.resolve(modelDir, manifest.paths[0]);
  const weightData = fs.readFileSync(weightPath);

  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: manifest.weights,
    weightData: weightData.buffer.slice(weightData.byteOffset, weightData.byteOffset + weightData.byteLength)
  });

  return tf.loadLayersModel(handler);
}

async function evaluate() {
  const modelDir = resolveModelOutputDir();
  const model = await loadLocalLayersModel(modelDir);

  const seed = readJson(path.resolve(repoRoot, "ml", "seed-data", "gesture-seed-v1.json"));
  const captureArg = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : null;
  const capture = captureArg ? readJson(captureArg) : null;
  const dataset = mergeDatasetPayloads(seed, capture);

  if (!dataset.samples.length) {
    throw new Error("No samples available for evaluation.");
  }

  const classes = dataset.classLabels;
  const confusion = Array.from({ length: classes.length }, () => new Array(classes.length).fill(0));

  for (const sample of dataset.samples) {
    const trueIdx = classes.indexOf(sample.label);
    if (trueIdx < 0) continue;

    const flat = new Float32Array(dataset.sequenceLength * dataset.featureSize);
    for (let t = 0; t < dataset.sequenceLength; t += 1) {
      const frame = sample.frames[t] || new Array(dataset.featureSize).fill(0);
      for (let k = 0; k < dataset.featureSize; k += 1) {
        flat[t * dataset.featureSize + k] = Number(frame[k] || 0);
      }
    }
    const x = tf.tensor3d(flat, [1, dataset.sequenceLength, dataset.featureSize], "float32");
    const prediction = model.predict(x);
    const probs = Array.from(prediction.dataSync());
    const predIdx = argmax(probs);
    confusion[trueIdx][predIdx] += 1;
    tf.dispose([x, prediction]);
  }

  const perClass = classes.map((label, i) => {
    const tp = confusion[i][i];
    const rowSum = confusion[i].reduce((a, b) => a + b, 0);
    const colSum = confusion.reduce((acc, row) => acc + row[i], 0);
    const precision = colSum ? tp / colSum : 0;
    const recall = rowSum ? tp / rowSum : 0;
    return { label, precision, recall, support: rowSum };
  });

  const reportDir = path.resolve(repoRoot, "ml", "reports");
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    classLabels: classes,
    confusionMatrix: confusion,
    perClass
  };

  fs.writeFileSync(path.resolve(reportDir, "evaluation.json"), JSON.stringify(jsonReport, null, 2));

  const lines = [
    "# Gesture Model Evaluation",
    "",
    `Generated: ${jsonReport.generatedAt}`,
    "",
    "## Per-class Metrics",
    "",
    "| Class | Precision | Recall | Support |",
    "|---|---:|---:|---:|"
  ];

  for (const metric of perClass) {
    lines.push(`| ${metric.label} | ${metric.precision.toFixed(3)} | ${metric.recall.toFixed(3)} | ${metric.support} |`);
  }

  lines.push("", "## Confusion Matrix", "", "```json", JSON.stringify(confusion), "```");
  fs.writeFileSync(path.resolve(reportDir, "evaluation.md"), lines.join("\n"));

  model.dispose();
  console.log(`Evaluation reports written to ${reportDir}`);
}

evaluate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

