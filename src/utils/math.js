export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizedDistance(landmarks, aIdx, bIdx, scale) {
  return distance(landmarks[aIdx], landmarks[bIdx]) / Math.max(scale, 0.0001);
}

export function isFingerUp(landmarks, tip, pip, margin = 0) {
  return landmarks[tip].y < landmarks[pip].y - margin;
}