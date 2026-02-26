import { HANDS_CONFIG, ML_CLASS_LABELS, ML_CONFIG, TRACKING_CONFIG } from "../config.js";
import { analyzeHand, createStabilizer, detectTechnique } from "./gestures.js";
import { createCaptureRecorder } from "./captureRecorder.js";
import { extractFrameFeatures } from "./featureExtractor.js";
import { createMlClassifier } from "./mlClassifier.js";
import { createPredictionStateMachine } from "./predictionStateMachine.js";

export function createHandsController({
  videoElement,
  canvasElement,
  getGlowColor,
  onTechnique,
  onTrackingMetrics,
  onModelStatus,
  onError
}) {
  const canvasCtx = canvasElement.getContext("2d");
  const fallbackStabilizer = createStabilizer();
  const predictionState = createPredictionStateMachine();
  const captureRecorder = createCaptureRecorder();

  let mlEnabled = true;
  let lastTechnique = "neutral";
  let lastInferenceSource = "ml";
  const featureQueue = [];

  const classifier = createMlClassifier({
    modelUrl: ML_CONFIG.modelUrl,
    classLabels: ML_CLASS_LABELS,
    sequenceLength: ML_CONFIG.sequenceLength,
    minPredictConfidence: ML_CONFIG.minPredictConfidence,
    onStatus: (status) => {
      onModelStatus?.({
        ...status,
        mlEnabled
      });
    }
  });

  classifier.load().catch((error) => {
    onModelStatus?.({
      state: "error",
      message: "Failed to initialize classifier. Using fallback.",
      error: String(error),
      mlEnabled
    });
  });

  const hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions(HANDS_CONFIG);

  function emitTechnique(nextTechnique) {
    if (nextTechnique === lastTechnique) return;
    lastTechnique = nextTechnique;
    onTechnique(nextTechnique);
  }

  function runFallback(states) {
    const detected = detectTechnique(states);
    const stable = fallbackStabilizer.update(detected, states.length > 0);
    lastInferenceSource = "fallback";
    return {
      technique: stable,
      confidence: 0,
      predictionLabel: detected,
      phase: "fallback"
    };
  }

  function isDoubleMiddleMonkey(states) {
    return states.length >= 2 && states[0].isMiddleFinger && states[1].isMiddleFinger;
  }

  hands.onResults((results) => {
    const now = performance.now();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const states = [];

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
          color: getGlowColor(),
          lineWidth: 5
        });
        window.drawLandmarks(canvasCtx, landmarks, {
          color: "#fff",
          lineWidth: 1,
          radius: 2
        });
        states.push(analyzeHand(landmarks));
      }
    }

    const frameFeatures = extractFrameFeatures(results);

    featureQueue.push(frameFeatures.vector);
    while (featureQueue.length > ML_CONFIG.sequenceLength) {
      featureQueue.shift();
    }

    if (captureRecorder.isRecording()) {
      captureRecorder.appendFrame(frameFeatures.vector, {
        timestamp: now,
        hasHands: frameFeatures.hasHands
      });
    }

    let resolved;

    if (isDoubleMiddleMonkey(states)) {
      predictionState.reset();
      lastInferenceSource = "heuristic";
      resolved = {
        technique: "doubleMiddleMonkey",
        confidence: 1,
        predictionLabel: "doubleMiddleMonkey",
        phase: "override"
      };
    } else if (mlEnabled && classifier.isReady() && featureQueue.length === ML_CONFIG.sequenceLength) {
      const prediction = classifier.predict(featureQueue);
      if (prediction.ok) {
        const labelForState = prediction.isConfident ? prediction.label : "noGesture";
        const stable = predictionState.update({
          timestamp: now,
          label: labelForState,
          confidence: prediction.confidence,
          hasHands: frameFeatures.hasHands
        });

        lastInferenceSource = stable.mode;
        resolved = {
          technique: stable.technique,
          confidence: prediction.confidence,
          predictionLabel: prediction.label,
          phase: stable.phase
        };
      } else if (ML_CONFIG.fallbackEnabled) {
        resolved = runFallback(states);
      } else {
        resolved = {
          technique: "neutral",
          confidence: 0,
          predictionLabel: "noGesture",
          phase: "unavailable"
        };
      }
    } else if (ML_CONFIG.fallbackEnabled) {
      resolved = runFallback(states);
    } else {
      resolved = {
        technique: "neutral",
        confidence: 0,
        predictionLabel: "noGesture",
        phase: "waiting"
      };
    }

    emitTechnique(resolved.technique);

    onTrackingMetrics?.({
      source: lastInferenceSource,
      confidence: resolved.confidence,
      predictedLabel: resolved.predictionLabel,
      technique: resolved.technique,
      handCount: frameFeatures.handCount,
      phase: resolved.phase,
      capture: captureRecorder.getStats()
    });
  });

  let running = false;
  let rafId = null;
  let processing = false;
  let lastProcessedAt = 0;
  const minFrameIntervalMs = 1000 / Math.max(1, ML_CONFIG.maxProcessFps || TRACKING_CONFIG.maxProcessFps);

  const processFrame = async () => {
    if (!running) return;
    rafId = requestAnimationFrame(processFrame);

    const now = performance.now();
    if (
      processing ||
      now - lastProcessedAt < minFrameIntervalMs ||
      videoElement.readyState < 2 ||
      !videoElement.videoWidth ||
      !videoElement.videoHeight
    ) {
      return;
    }

    if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
    }

    processing = true;
    lastProcessedAt = now;
    try {
      await hands.send({ image: videoElement });
    } catch (error) {
      onError(error);
    } finally {
      processing = false;
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      predictionState.reset();
      processFrame();
    },
    stop() {
      running = false;
      processing = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      emitTechnique("neutral");
    },
    setMlEnabled(enabled) {
      mlEnabled = Boolean(enabled);
      onModelStatus?.({
        ...classifier.getStatus(),
        mlEnabled
      });
    },
    startCapture(label) {
      captureRecorder.start(label);
    },
    stopCapture() {
      captureRecorder.stop();
      return captureRecorder.getStats();
    },
    exportCapture() {
      return captureRecorder.exportData();
    }
  };
}
