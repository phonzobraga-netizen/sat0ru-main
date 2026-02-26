import { GESTURE_CONFIG } from "../config.js";
import { distance, isFingerUp, normalizedDistance } from "../utils/math.js";

const fingerPairs = {
  index: [8, 6],
  middle: [12, 10],
  ring: [16, 14],
  pinky: [20, 18]
};

const fingerMcp = {
  index: 5,
  middle: 9,
  ring: 13,
  pinky: 17
};

export function analyzeHand(landmarks) {
  const palmScale = distance(landmarks[0], landmarks[9]);
  const yMargin = palmScale * 0.12;

  const indexUp = isFingerUp(landmarks, fingerPairs.index[0], fingerPairs.index[1], yMargin);
  const middleUp = isFingerUp(landmarks, fingerPairs.middle[0], fingerPairs.middle[1], yMargin);
  const ringUp = isFingerUp(landmarks, fingerPairs.ring[0], fingerPairs.ring[1], yMargin);
  const pinkyUp = isFingerUp(landmarks, fingerPairs.pinky[0], fingerPairs.pinky[1], yMargin);

  const fingersUpCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
  const thumbTipToIndexTip = normalizedDistance(landmarks, 4, 8, palmScale);
  const thumbTipToPalm = normalizedDistance(landmarks, 4, 0, palmScale);
  const peaceGap = normalizedDistance(landmarks, 8, 12, palmScale);

  const pinch = thumbTipToIndexTip < GESTURE_CONFIG.pinchThreshold;
  const fingersCurled = [
    normalizedDistance(landmarks, 8, fingerMcp.index, palmScale) < GESTURE_CONFIG.curledThreshold,
    normalizedDistance(landmarks, 12, fingerMcp.middle, palmScale) < GESTURE_CONFIG.curledThreshold,
    normalizedDistance(landmarks, 16, fingerMcp.ring, palmScale) < GESTURE_CONFIG.curledThreshold,
    normalizedDistance(landmarks, 20, fingerMcp.pinky, palmScale) < GESTURE_CONFIG.curledThreshold
  ];

  const fistClosed = fingersCurled.every(Boolean);
  const thumbExtended = thumbTipToPalm > GESTURE_CONFIG.thumbExtendedThreshold;
  const thumbsUp =
    thumbExtended &&
    landmarks[4].y < landmarks[3].y &&
    landmarks[4].y < landmarks[6].y &&
    !indexUp &&
    !middleUp &&
    !ringUp &&
    !pinkyUp;

  const openPalm = fingersUpCount === 4 && thumbExtended;
  const point = indexUp && !middleUp && !ringUp && !pinkyUp && !pinch;
  const peace = indexUp && middleUp && !ringUp && !pinkyUp && peaceGap > GESTURE_CONFIG.peaceGapThreshold;
  const rock = indexUp && !middleUp && !ringUp && pinkyUp && !pinch;
  const middleFinger = middleUp && !indexUp && !ringUp && !pinkyUp && !pinch;

  return {
    pinch,
    thumbsUp,
    isPoint: point,
    isPeace: peace,
    isOpenPalm: openPalm,
    isFist: fistClosed && !pinch,
    isRock: rock,
    isMiddleFinger: middleFinger
  };
}

export function detectTechnique(states) {
  if (!states.length) return "neutral";

  if (states.length >= 2) {
    const a = states[0];
    const b = states[1];

    if (a.isMiddleFinger && b.isMiddleFinger) return "doubleMiddleMonkey";
    if (a.isFist && b.isFist) return "blackflash";
    if (a.isOpenPalm && b.isOpenPalm) return "cleaveStorm";
    if ((a.pinch && b.isRock) || (b.pinch && a.isRock)) return "dismantleSpiral";
    if ((a.isPoint && b.isFist) || (b.isPoint && a.isFist)) return "ratioStrike";
    if ((a.thumbsUp && b.isPeace) || (b.thumbsUp && a.isPeace)) return "boogieRipple";
    if (states.some((s) => s.pinch) && states.some((s) => s.thumbsUp)) return "blue";
  }

  if (states.some((s) => s.pinch)) return "purple";
  if (states.some((s) => s.thumbsUp)) return "blue";
  if (states.some((s) => s.isRock)) return "meteor";
  if (states.some((s) => s.isOpenPalm)) return "shrine";
  if (states.some((s) => s.isPeace)) return "void";
  if (states.some((s) => s.isPoint)) return "red";
  if (states.some((s) => s.isFist)) return "blackflash";
  return "neutral";
}

export function createStabilizer() {
  let stableTech = "neutral";
  let candidateTech = "neutral";
  let candidateFrames = 0;
  let emptyFrames = 0;

  return {
    update(detected, hasHands) {
      if (detected === candidateTech) {
        candidateFrames += 1;
      } else {
        candidateTech = detected;
        candidateFrames = 1;
      }

      if (candidateFrames >= GESTURE_CONFIG.requiredStableFrames) {
        stableTech = candidateTech;
      }

      if (!hasHands) {
        emptyFrames += 1;
        if (emptyFrames >= GESTURE_CONFIG.releaseFrames) {
          stableTech = "neutral";
        }
      } else {
        emptyFrames = 0;
      }

      return stableTech;
    }
  };
}
