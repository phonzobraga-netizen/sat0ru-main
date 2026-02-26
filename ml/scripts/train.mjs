import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as tf from "@tensorflow/tfjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const seedPath = path.resolve(repoRoot, "ml", "seed-data", "gesture-seed-v1.json");
const capturePathArg = process.argv[2];
const capturePath = capturePathArg ? path.resolve(process.cwd(), capturePathArg) : null;

export function resolveModelOutputDir() {
  return path.resolve(repoRoot, "assets", "models", "gesture-v1");
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function mergeDatasetPayloads(...payloads) {
  const merged = {
    schemaVersion: 1,
    sequenceLength: 12,
    featureSize: 128,
    classLabels: [],
    samples: []
  };

  for (const payload of payloads) {
    if (!payload || !Array.isArray(payload.samples)) continue;

    if (Array.isArray(payload.classLabels)) {
      for (const label of payload.classLabels) {
        if (!merged.classLabels.includes(label)) merged.classLabels.push(label);
      }
    }

    for (const sample of payload.samples) {
      if (!sample?.label || !Array.isArray(sample.frames)) continue;
      merged.samples.push(sample);
    }

    if (Number.isFinite(payload.sequenceLength)) merged.sequenceLength = payload.sequenceLength;
    if (Number.isFinite(payload.featureSize)) merged.featureSize = payload.featureSize;
  }

  return merged;
}

function tensorize(dataset) {
  const n = dataset.samples.length;
  const seq = dataset.sequenceLength;
  const feat = dataset.featureSize;
  const classes = dataset.classLabels;

  const x = new Float32Array(n * seq * feat);
  const y = new Float32Array(n * classes.length);

  for (let i = 0; i < n; i += 1) {
    const sample = dataset.samples[i];
    const classIdx = classes.indexOf(sample.label);
    if (classIdx < 0) continue;

    y[i * classes.length + classIdx] = 1;

    for (let t = 0; t < seq; t += 1) {
      const frame = sample.frames[t] || new Array(feat).fill(0);
      for (let k = 0; k < feat; k += 1) {
        x[i * seq * feat + t * feat + k] = Number(frame[k] || 0);
      }
    }
  }

  return {
    xs: tf.tensor3d(x, [n, seq, feat], "float32"),
    ys: tf.tensor2d(y, [n, classes.length], "float32")
  };
}

async function saveModelArtifacts(model, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      const modelJson = {
        format: artifacts.format,
        generatedBy: artifacts.generatedBy,
        convertedBy: artifacts.convertedBy || null,
        modelTopology: artifacts.modelTopology,
        weightsManifest: [
          {
            paths: ["group1-shard1of1.bin"],
            weights: artifacts.weightSpecs
          }
        ]
      };

      fs.writeFileSync(path.resolve(outDir, "model.json"), JSON.stringify(modelJson, null, 2));
      fs.writeFileSync(path.resolve(outDir, "group1-shard1of1.bin"), Buffer.from(artifacts.weightData));

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: "JSON",
          modelTopologyBytes: JSON.stringify(artifacts.modelTopology).length,
          weightSpecsBytes: JSON.stringify(artifacts.weightSpecs).length,
          weightDataBytes: artifacts.weightData.byteLength
        }
      };
    })
  );
}

async function train() {
  const seed = readJson(seedPath);
  const capture = readJson(capturePath);
  const dataset = mergeDatasetPayloads(seed, capture);

  if (!dataset.samples.length) {
    throw new Error("No training samples found. Run prepare-seed or capture data first.");
  }

  const { xs, ys } = tensorize(dataset);

  const model = tf.sequential();
  model.add(
    tf.layers.conv1d({
      inputShape: [dataset.sequenceLength, dataset.featureSize],
      filters: 24,
      kernelSize: 3,
      activation: "relu"
    })
  );
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: dataset.classLabels.length, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"]
  });

  const history = await model.fit(xs, ys, {
    epochs: 12,
    batchSize: Math.min(16, dataset.samples.length),
    validationSplit: Math.min(0.2, 1 / dataset.samples.length),
    shuffle: true,
    verbose: 1
  });

  const outDir = resolveModelOutputDir();
  await saveModelArtifacts(model, outDir);

  const summary = {
    trainedAt: new Date().toISOString(),
    sampleCount: dataset.samples.length,
    classLabels: dataset.classLabels,
    finalLoss: history.history.loss?.at(-1) ?? null,
    finalAccuracy: history.history.acc?.at(-1) ?? history.history.accuracy?.at(-1) ?? null,
    modelDir: outDir
  };

  fs.writeFileSync(path.resolve(repoRoot, "ml", "training-summary.json"), JSON.stringify(summary, null, 2));

  tf.dispose([xs, ys]);
  model.dispose();
  console.log(`Model artifacts written to ${outDir}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  train().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

