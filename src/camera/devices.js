import { CAMERA_CONFIG } from "../config.js";

function scoreCameraDevice(label = "") {
  const name = label.toLowerCase();
  const blockedKeywords = ["virtual", "obs", "snap camera", "manycam", "droidcam", "ndi"];
  const preferredKeywords = ["integrated", "webcam", "hd camera", "usb", "logitech"];

  if (blockedKeywords.some((k) => name.includes(k))) return -100;
  if (preferredKeywords.some((k) => name.includes(k))) return 50;
  return 0;
}

export async function requestCameraBootstrap() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getTracks().forEach((track) => track.stop());
}

export async function listCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
}

export function pickPreferredCamera(cameras) {
  if (!cameras.length) return null;

  let selected = cameras[0];
  let bestScore = -Infinity;
  for (const camera of cameras) {
    const score = scoreCameraDevice(camera.label);
    if (score > bestScore) {
      selected = camera;
      bestScore = score;
    }
  }
  return selected;
}

export async function startCamera(videoElement, deviceId) {
  const baseVideo = {
    width: { ideal: CAMERA_CONFIG.width },
    height: { ideal: CAMERA_CONFIG.height },
    frameRate: {
      ideal: CAMERA_CONFIG.frameRateIdeal,
      max: CAMERA_CONFIG.frameRateMax
    }
  };

  if (deviceId) baseVideo.deviceId = { exact: deviceId };

  const constraints = {
    video: {
      ...baseVideo
    },
    audio: false
  };

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    // Fallback for cameras that cannot satisfy high fps constraints.
    const fallbackVideo = { ...baseVideo };
    delete fallbackVideo.frameRate;
    stream = await navigator.mediaDevices.getUserMedia({
      video: fallbackVideo,
      audio: false
    });
  }

  videoElement.srcObject = stream;
  videoElement.setAttribute("playsinline", "");
  videoElement.muted = true;
  await videoElement.play();
  return stream;
}

export function stopCamera(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
