import { DEFAULT_QUALITY, ML_CLASS_LABELS, QUALITY_PRESETS, TECHNIQUE_META } from "./config.js";
import { listCameras, pickPreferredCamera, requestCameraBootstrap, startCamera, stopCamera } from "./camera/devices.js";
import { createStore } from "./state/store.js";
import { createScene } from "./three/scene.js";
import { createControlPanel } from "./ui/panel.js";
import { createStatus } from "./ui/status.js";
import { createLogger } from "./utils/logger.js";
import { createHandsController } from "./vision/hands.js";

const logger = createLogger("SAT0RU");
const isDevBuild = window.__SAT0RU_DEV_BUILD__ === true;
const isDevMode = isDevBuild || new URLSearchParams(window.location.search).get("dev") === "1";

const videoElement = document.querySelector(".input_video");
const canvasElement = document.getElementById("output_canvas");
const techniqueName = document.getElementById("technique-name");
const cameraSelect = document.getElementById("camera-select");
const qualitySelect = document.getElementById("quality-select");
const startButton = document.getElementById("start-btn");
const stopButton = document.getElementById("stop-btn");
const statusPill = document.getElementById("status-pill");
const statusMessage = document.getElementById("status-message");
const fpsEl = document.getElementById("fps");
const modelStatusEl = document.getElementById("model-status");
const inferenceSourceEl = document.getElementById("inference-source");
const trackingMetricsEl = document.getElementById("tracking-metrics");

const devToolsEl = document.getElementById("dev-tools");
const devCaptureLabelEl = document.getElementById("dev-capture-label");
const devCaptureStartBtn = document.getElementById("dev-capture-start");
const devCaptureStopBtn = document.getElementById("dev-capture-stop");
const devCaptureExportBtn = document.getElementById("dev-capture-export");
const devCaptureStatsEl = document.getElementById("dev-capture-stats");
const devMlToggleEl = document.getElementById("dev-ml-toggle");
const devForceTechniqueEl = document.getElementById("dev-force-technique");
const devForceApplyBtn = document.getElementById("dev-force-apply");
const devForceClearBtn = document.getElementById("dev-force-clear");
const devForceStatusEl = document.getElementById("dev-force-status");
const techniqueTestListEl = document.getElementById("technique-test-list");
const techniqueTestLiveBtn = document.getElementById("technique-test-live");
const techniqueTestStatusEl = document.getElementById("technique-test-status");

const store = createStore({
  technique: "neutral",
  quality: DEFAULT_QUALITY,
  cameras: [],
  selectedCameraId: "",
  stream: null,
  running: false,
  captureStats: {
    recording: false,
    frameCount: 0,
    sampleCount: 0
  }
});

const scene = createScene({
  initialCount: QUALITY_PRESETS[DEFAULT_QUALITY].particleCount,
  bloomMultiplier: QUALITY_PRESETS[DEFAULT_QUALITY].bloomMultiplier
});

const status = createStatus(statusPill, statusMessage);
let forcedTechnique = null;
let latestTrackedTechnique = "neutral";

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setTechnique(techniqueId) {
  const meta = TECHNIQUE_META[techniqueId] || TECHNIQUE_META.neutral;
  techniqueName.textContent = meta.label;
  scene.setTechnique(techniqueId);
  store.setState({ technique: techniqueId });
}

function setForcedTechniqueStatus() {
  if (!devForceStatusEl) return;
  if (!forcedTechnique) {
    devForceStatusEl.textContent = "Forced technique: none";
    return;
  }
  const meta = TECHNIQUE_META[forcedTechnique] || TECHNIQUE_META.neutral;
  devForceStatusEl.textContent = `Forced technique: ${forcedTechnique} (${meta.label})`;
}

function setTechniqueTesterStatus() {
  if (techniqueTestStatusEl) {
    if (!forcedTechnique) {
      techniqueTestStatusEl.textContent = "Mode: live tracking";
    } else {
      const meta = TECHNIQUE_META[forcedTechnique] || TECHNIQUE_META.neutral;
      techniqueTestStatusEl.textContent = `Mode: forcing ${forcedTechnique} (${meta.label})`;
    }
  }

  if (techniqueTestListEl) {
    const buttons = techniqueTestListEl.querySelectorAll("button[data-technique]");
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.technique === forcedTechnique);
    });
  }

  if (techniqueTestLiveBtn) {
    techniqueTestLiveBtn.classList.toggle("is-active", !forcedTechnique);
  }
}

function applyTechniqueOverride(techniqueId, statusMessage) {
  forcedTechnique = techniqueId || null;

  if (forcedTechnique) {
    setTechnique(forcedTechnique);
  } else {
    setTechnique(latestTrackedTechnique || "neutral");
  }

  setForcedTechniqueStatus();
  setTechniqueTesterStatus();

  if (statusMessage) {
    status.set("running", statusMessage);
  }
}

function setModelStatus(payload) {
  if (!modelStatusEl) return;
  modelStatusEl.textContent = `Model: ${payload.state} - ${payload.message}`;
}

function setTrackingMetrics(payload) {
  if (inferenceSourceEl) {
    inferenceSourceEl.textContent = `Inference: ${payload.source || "--"} (${payload.predictedLabel || "--"})`;
  }
  if (trackingMetricsEl) {
    trackingMetricsEl.textContent = `Hands: ${payload.handCount} | Conf: ${(payload.confidence ?? 0).toFixed(2)} | Phase: ${payload.phase}`;
  }

  if (isDevMode && payload.capture && devCaptureStatsEl) {
    devCaptureStatsEl.textContent =
      `Capture label: ${payload.capture.label} | recording: ${payload.capture.recording} | frames: ${payload.capture.frameCount} | sequences: ${payload.capture.sampleCount}`;
  }
}

function initTechniqueTestPanel() {
  if (!techniqueTestListEl) return;

  techniqueTestListEl.innerHTML = "";
  for (const [id, meta] of Object.entries(TECHNIQUE_META)) {
    if (id === "neutral") continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "technique-test-btn";
    button.dataset.technique = id;
    button.textContent = meta.label;
    button.title = `Test ${meta.label}`;
    button.addEventListener("click", () => {
      if (devForceTechniqueEl) devForceTechniqueEl.value = id;
      applyTechniqueOverride(id, `Testing technique: ${meta.label}.`);
    });
    techniqueTestListEl.appendChild(button);
  }

  techniqueTestLiveBtn?.addEventListener("click", () => {
    if (devForceTechniqueEl) devForceTechniqueEl.value = "neutral";
    applyTechniqueOverride(null, "Technique test override cleared.");
  });

  setTechniqueTesterStatus();
}

const handsController = createHandsController({
  videoElement,
  canvasElement,
  getGlowColor: () => scene.getGlowColor(),
  onTechnique: (techniqueId) => {
    latestTrackedTechnique = techniqueId;
    if (forcedTechnique) return;
    setTechnique(techniqueId);
  },
  onTrackingMetrics: (payload) => {
    setTrackingMetrics(payload);
    store.setState({ captureStats: payload.capture || store.getState().captureStats });
  },
  onModelStatus: (payload) => {
    setModelStatus(payload);
    if (payload.state === "error") {
      status.set("starting", "ML unavailable. Running fallback detection.");
    }
  },
  onError: (error) => {
    logger.error("Tracking error", error);
    status.set("error", "Tracking paused. Check camera and press Start again.");
    setTechnique("neutral");
  }
});

const panel = createControlPanel({
  cameraSelect,
  qualitySelect,
  startButton,
  stopButton,
  fpsEl,
  onStart: async (deviceId) => {
    await start(deviceId);
  },
  onStop: () => stop(),
  onQualityChange: (quality) => {
    const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS[DEFAULT_QUALITY];
    store.setState({ quality });
    scene.setParticleCount(preset.particleCount);
    scene.setBloomMultiplier(preset.bloomMultiplier);
  }
});

function initDevTools() {
  if (!devToolsEl) return;
  if (!isDevMode) {
    devToolsEl.classList.add("hidden");
    return;
  }

  devToolsEl.classList.remove("hidden");

  if (devCaptureLabelEl) {
    devCaptureLabelEl.innerHTML = "";
    for (const label of ML_CLASS_LABELS) {
      const option = document.createElement("option");
      option.value = label;
      option.textContent = label;
      devCaptureLabelEl.appendChild(option);
    }
  }

  if (devForceTechniqueEl) {
    devForceTechniqueEl.innerHTML = "";
    for (const id of Object.keys(TECHNIQUE_META)) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      devForceTechniqueEl.appendChild(option);
    }
    devForceTechniqueEl.value = "neutral";
  }

  devCaptureStartBtn?.addEventListener("click", () => {
    const label = devCaptureLabelEl?.value || "neutral";
    handsController.startCapture(label);
    status.set("running", `Capture started for ${label}.`);
  });

  devCaptureStopBtn?.addEventListener("click", () => {
    const stats = handsController.stopCapture();
    status.set("running", `Capture stopped. Frames: ${stats.frameCount}, sequences: ${stats.sampleCount}`);
  });

  devCaptureExportBtn?.addEventListener("click", () => {
    const payload = handsController.exportCapture();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(`gesture-capture-${stamp}.json`, payload);
    status.set("running", `Exported ${payload.sampleCount} captured sequence(s).`);
  });

  devMlToggleEl?.addEventListener("change", () => {
    handsController.setMlEnabled(Boolean(devMlToggleEl.checked));
    status.set("running", `ML ${devMlToggleEl.checked ? "enabled" : "disabled"}.`);
  });

  devForceApplyBtn?.addEventListener("click", () => {
    const selected = devForceTechniqueEl?.value || "neutral";
    applyTechniqueOverride(selected, `Forced technique: ${selected}.`);
  });

  devForceClearBtn?.addEventListener("click", () => {
    if (devForceTechniqueEl) devForceTechniqueEl.value = "neutral";
    applyTechniqueOverride(null, "Technique override cleared.");
  });

  setForcedTechniqueStatus();
  setTechniqueTesterStatus();
}

async function refreshCameras() {
  try {
    await requestCameraBootstrap();
  } catch (error) {
    logger.warn("Camera bootstrap denied", error);
  }

  const cameras = await listCameras();
  const preferred = pickPreferredCamera(cameras);
  const selectedCameraId = store.getState().selectedCameraId || preferred?.deviceId || "";

  store.setState({ cameras, selectedCameraId });
  panel.setCameraOptions(cameras, selectedCameraId);
}

async function start(deviceId) {
  const current = store.getState();
  if (current.running) return;

  if (!current.cameras.length) {
    status.set("error", "No camera found. Connect a webcam and refresh.");
    return;
  }

  status.set("starting", "Starting camera and ML tracker...");

  try {
    const selected = deviceId || current.selectedCameraId || current.cameras[0].deviceId;
    const stream = await startCamera(videoElement, selected);

    store.setState({ stream, selectedCameraId: selected, running: true });
    panel.setRunning(true);
    handsController.start();
    status.set("running", "Tracking live. ML inference active with fallback safety.");
  } catch (error) {
    logger.error("Camera start failed", error);
    status.set("error", "Could not start camera. Check permissions or selected device.");
    setTechnique("neutral");
  }
}

function stop() {
  const { stream, running } = store.getState();
  if (!running) return;

  handsController.stop();
  stopCamera(stream);
  videoElement.srcObject = null;
  store.setState({ stream: null, running: false });
  panel.setRunning(false);
  status.set("idle", "Camera stopped. Press Start to resume.");
  setTechnique("neutral");
}

let animationHandle = null;
let lastTime = performance.now();
let fpsFrames = 0;
let fpsTick = performance.now();

function animate(now) {
  animationHandle = requestAnimationFrame(animate);
  scene.renderFrame(now - lastTime);
  lastTime = now;

  fpsFrames += 1;
  const elapsed = now - fpsTick;
  if (elapsed >= 1000) {
    const fps = Math.round((fpsFrames * 1000) / elapsed);
    panel.setFps(fps);
    fpsFrames = 0;
    fpsTick = now;
  }
}

function bindWindowEvents() {
  window.addEventListener("resize", scene.resize);
  window.addEventListener("beforeunload", () => {
    stop();
    if (animationHandle) cancelAnimationFrame(animationHandle);
    scene.dispose();
  });
}

async function init() {
  qualitySelect.value = DEFAULT_QUALITY;
  status.set("idle", "Allow camera access, then press Start.");
  panel.setRunning(false);
  setTechnique("neutral");
  initTechniqueTestPanel();
  initDevTools();

  if (modelStatusEl) modelStatusEl.textContent = "Model: loading - Initializing classifier";
  if (inferenceSourceEl) inferenceSourceEl.textContent = "Inference: --";
  if (trackingMetricsEl) trackingMetricsEl.textContent = "Hands: 0 | Conf: 0.00 | Phase: idle";

  await refreshCameras();

  animate(performance.now());
  bindWindowEvents();
}

init().catch((error) => {
  logger.error("Initialization failed", error);
  status.set("error", "App failed to initialize.");
});
