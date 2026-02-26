import { ML_CONFIG, ML_CLASS_LABELS } from "../config.js";

function cloneVector(vector) {
  return Array.from(vector);
}

function buildSequences(frames, sequenceLength, label) {
  if (frames.length < sequenceLength) return [];
  const stride = Math.max(1, Math.floor(sequenceLength / 2));
  const out = [];

  for (let start = 0; start + sequenceLength <= frames.length; start += stride) {
    const windowFrames = frames.slice(start, start + sequenceLength).map((entry) => cloneVector(entry.vector));
    out.push({
      label,
      frames: windowFrames,
      capturedAt: new Date(frames[start].timestamp).toISOString()
    });
  }

  return out;
}

export function createCaptureRecorder({
  sequenceLength = ML_CONFIG.sequenceLength,
  classLabels = ML_CLASS_LABELS
} = {}) {
  let recording = false;
  let activeLabel = "neutral";
  let currentFrames = [];
  let samples = [];

  function start(label) {
    if (!classLabels.includes(label)) {
      throw new Error(`Unknown capture label: ${label}`);
    }
    recording = true;
    activeLabel = label;
    currentFrames = [];
  }

  function stop() {
    if (!recording) return;
    const newSequences = buildSequences(currentFrames, sequenceLength, activeLabel);
    samples = samples.concat(newSequences);
    recording = false;
    currentFrames = [];
  }

  function appendFrame(vector, meta = {}) {
    if (!recording) return;
    currentFrames.push({
      vector,
      timestamp: meta.timestamp || Date.now(),
      hasHands: Boolean(meta.hasHands)
    });
  }

  function exportData() {
    const pending = recording ? buildSequences(currentFrames, sequenceLength, activeLabel) : [];
    const all = samples.concat(pending);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      sequenceLength,
      classLabels,
      sampleCount: all.length,
      samples: all
    };
  }

  function getStats() {
    return {
      recording,
      label: activeLabel,
      frameCount: currentFrames.length,
      sampleCount: samples.length
    };
  }

  function clear() {
    samples = [];
    currentFrames = [];
    recording = false;
    activeLabel = "neutral";
  }

  return {
    start,
    stop,
    appendFrame,
    exportData,
    getStats,
    clear,
    isRecording: () => recording
  };
}
