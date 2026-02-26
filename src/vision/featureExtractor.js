import { distance } from "../utils/math.js";

const LANDMARK_COUNT = 21;
const HAND_FEATURE_SIZE = LANDMARK_COUNT * 3 + 1;
const FRAME_FEATURE_SIZE = HAND_FEATURE_SIZE * 2;

function normalizeHandLandmarks(landmarks) {
  if (!landmarks?.length) return null;
  const wrist = landmarks[0];
  const palmScale = Math.max(1e-5, distance(landmarks[0], landmarks[9]));

  const out = new Float32Array(HAND_FEATURE_SIZE);
  for (let i = 0; i < LANDMARK_COUNT; i += 1) {
    const lm = landmarks[i];
    const base = i * 3;
    out[base] = (lm.x - wrist.x) / palmScale;
    out[base + 1] = (lm.y - wrist.y) / palmScale;
    out[base + 2] = ((lm.z ?? 0) - (wrist.z ?? 0)) / palmScale;
  }

  out[HAND_FEATURE_SIZE - 1] = 1;
  return out;
}

function assignHandsBySide(results) {
  const assignments = {
    left: null,
    right: null
  };

  const landmarks = results.multiHandLandmarks || [];
  const handedness = results.multiHandedness || [];

  for (let i = 0; i < landmarks.length; i += 1) {
    const label = handedness[i]?.label?.toLowerCase() || "unknown";
    const side = label.includes("left") ? "left" : "right";
    if (!assignments[side]) {
      assignments[side] = landmarks[i];
    }
  }

  return assignments;
}

export function extractFrameFeatures(results) {
  const slots = assignHandsBySide(results);
  const left = normalizeHandLandmarks(slots.left);
  const right = normalizeHandLandmarks(slots.right);

  const vector = new Float32Array(FRAME_FEATURE_SIZE);

  if (left) vector.set(left, 0);
  if (right) vector.set(right, HAND_FEATURE_SIZE);

  const handCount = Number(Boolean(left)) + Number(Boolean(right));

  return {
    vector,
    featureSize: FRAME_FEATURE_SIZE,
    handCount,
    hasHands: handCount > 0
  };
}

export function getFeatureDimensions() {
  return {
    landmarkCount: LANDMARK_COUNT,
    handFeatureSize: HAND_FEATURE_SIZE,
    frameFeatureSize: FRAME_FEATURE_SIZE
  };
}
