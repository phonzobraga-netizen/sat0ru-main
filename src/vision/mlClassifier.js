import { ML_CONFIG, ML_CLASS_LABELS } from "../config.js";

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

export function createMlClassifier({
  modelUrl = ML_CONFIG.modelUrl,
  classLabels = ML_CLASS_LABELS,
  sequenceLength = ML_CONFIG.sequenceLength,
  minPredictConfidence = ML_CONFIG.minPredictConfidence,
  tfApi = globalThis.tf,
  onStatus
} = {}) {
  let model = null;
  let status = {
    state: "loading",
    message: "Loading ML model..."
  };

  function emit(next) {
    status = { ...status, ...next };
    onStatus?.(status);
  }

  async function load() {
    if (!tfApi || typeof tfApi.loadLayersModel !== "function") {
      emit({ state: "error", message: "TensorFlow.js runtime missing." });
      return false;
    }

    try {
      model = await tfApi.loadLayersModel(modelUrl);
      emit({ state: "ready", message: "ML model ready." });
      return true;
    } catch (error) {
      emit({ state: "error", message: "Failed to load model. Falling back to legacy detection.", error: String(error) });
      model = null;
      return false;
    }
  }

  function isReady() {
    return Boolean(model);
  }

  function getStatus() {
    return status;
  }

  function predict(sequenceFrames) {
    if (!model || !Array.isArray(sequenceFrames) || sequenceFrames.length !== sequenceLength) {
      return { ok: false, reason: "unavailable" };
    }

    try {
      const featureSize = sequenceFrames[0].length;
      const merged = new Float32Array(sequenceLength * featureSize);
      for (let i = 0; i < sequenceLength; i += 1) {
        merged.set(sequenceFrames[i], i * featureSize);
      }

      const probabilities = tfApi.tidy(() => {
        const input = tfApi.tensor(merged, [1, sequenceLength, featureSize], "float32");
        const output = model.predict(input);
        const tensor = Array.isArray(output) ? output[0] : output;
        return Array.from(tensor.dataSync());
      });

      const bestIdx = argmax(probabilities);
      const confidence = probabilities[bestIdx] ?? 0;
      const label = classLabels[bestIdx] || "noGesture";
      const isConfident = confidence >= minPredictConfidence;

      return {
        ok: true,
        label,
        confidence,
        isConfident,
        probabilities
      };
    } catch (error) {
      emit({ state: "error", message: "Inference failed. Falling back to legacy detection.", error: String(error) });
      model = null;
      return { ok: false, reason: "inference_failed", error };
    }
  }

  function dispose() {
    if (model && typeof model.dispose === "function") {
      model.dispose();
    }
    model = null;
  }

  emit(status);

  return {
    load,
    predict,
    isReady,
    getStatus,
    dispose
  };
}
