export const QUALITY_PRESETS = {
  high: { particleCount: 20000, bloomMultiplier: 1.1 },
  balanced: { particleCount: 14000, bloomMultiplier: 1.0 },
  low: { particleCount: 9000, bloomMultiplier: 0.8 }
};

export const DEFAULT_QUALITY = "balanced";

export const HANDS_CONFIG = {
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6
};

export const TRACKING_CONFIG = {
  maxProcessFps: 30,
  minConfidence: 0.42,
  pointerSmoothing: 0.24,
  outlierJumpThreshold: 0.18,
  trackingLostMs: 450
};

export const GESTURE_CONFIG = {
  requiredStableFrames: 4,
  releaseFrames: 2,
  pinchThreshold: 0.45,
  peaceGapThreshold: 0.45,
  thumbExtendedThreshold: 0.95,
  curledThreshold: 0.9
};

export const CAMERA_CONFIG = {
  width: 640,
  height: 480,
  frameRateIdeal: 60,
  frameRateMax: 60
};

export const PARTICLE_MOTION_CONFIG = {
  responsiveness: 11,
  minLerp: 0.08,
  maxLerp: 0.24,
  settleEpsilon: 0.003
};

export const AIR_FLOW_CONFIG = {
  driftXAmplitude: 0.9,
  driftYAmplitude: 0.6,
  driftZAmplitude: 0.4,
  driftSpeed: 0.65
};

export const ML_CLASS_LABELS = [
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

export const ML_CONFIG = {
  modelUrl: "./assets/models/gesture-v1/model.json",
  sequenceLength: 12,
  voteWindow: 6,
  voteMin: 4,
  holdMs: 600,
  neutralMs: 900,
  maxProcessFps: 30,
  minPredictConfidence: 0.34,
  fallbackEnabled: true
};

export const TECHNIQUE_META = {
  neutral: { label: "Neutral State", glow: "#00ffff", bloom: 1.0, shake: 0 },
  red: { label: "Reverse Cursed Technique: Red", glow: "#ff3333", bloom: 2.5, shake: 0.4 },
  void: { label: "Domain Expansion: Infinite Void", glow: "#00ffff", bloom: 2.0, shake: 0.4 },
  purple: { label: "Secret Technique: Hollow Purple", glow: "#bb00ff", bloom: 4.0, shake: 0.4 },
  shrine: { label: "Domain Expansion: Malevolent Shrine", glow: "#ff0000", bloom: 2.5, shake: 0.4 },
  blue: { label: "Cursed Technique Lapse: Blue", glow: "#33bbff", bloom: 3.2, shake: 0.4 },
  blackflash: { label: "Black Flash", glow: "#ffffff", bloom: 4.3, shake: 0.5 },
  meteor: { label: "Maximum: Meteor Swarm", glow: "#ff8a1f", bloom: 3.0, shake: 0.4 },
  cleaveStorm: { label: "Cleave Storm", glow: "#ff8b6c", bloom: 3.6, shake: 0.5 },
  dismantleSpiral: { label: "Dismantle Spiral", glow: "#ff4f4f", bloom: 3.9, shake: 0.55 },
  ratioStrike: { label: "Ratio Strike", glow: "#ffd36e", bloom: 2.6, shake: 0.3 },
  boogieRipple: { label: "Boogie Ripple", glow: "#6ef5ce", bloom: 3.1, shake: 0.35 },
  doubleMiddleMonkey: { label: "Monkey Mockery", glow: "#d7b27a", bloom: 2.2, shake: 0.2 }
};
