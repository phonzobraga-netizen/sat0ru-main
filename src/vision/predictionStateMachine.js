import { ML_CONFIG } from "../config.js";

function majorityVote(labels) {
  const counts = new Map();
  for (const label of labels) {
    if (label === "noGesture") continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  let winner = null;
  let count = 0;
  for (const [label, value] of counts.entries()) {
    if (value > count) {
      winner = label;
      count = value;
    }
  }

  return { winner, count };
}

export function createPredictionStateMachine({
  voteWindow = ML_CONFIG.voteWindow,
  voteMin = ML_CONFIG.voteMin,
  holdMs = ML_CONFIG.holdMs,
  neutralMs = ML_CONFIG.neutralMs
} = {}) {
  let stableTechnique = "neutral";
  let lastStableTs = 0;
  const votes = [];

  function reset() {
    stableTechnique = "neutral";
    lastStableTs = 0;
    votes.length = 0;
  }

  function update({ timestamp, label, confidence, hasHands }) {
    const now = Number.isFinite(timestamp) ? timestamp : performance.now();

    votes.push(label || "noGesture");
    while (votes.length > voteWindow) {
      votes.shift();
    }

    const { winner, count } = majorityVote(votes);

    if (hasHands && winner && count >= voteMin && label !== "noGesture") {
      stableTechnique = winner;
      lastStableTs = now;
      return {
        technique: stableTechnique,
        mode: "ml",
        confidence: confidence || 0,
        phase: "stable"
      };
    }

    if (stableTechnique !== "neutral") {
      const age = now - lastStableTs;
      if (age <= holdMs) {
        return {
          technique: stableTechnique,
          mode: "ml",
          confidence: confidence || 0,
          phase: "hold"
        };
      }
      if (age <= neutralMs) {
        return {
          technique: stableTechnique,
          mode: "ml",
          confidence: confidence || 0,
          phase: "cooldown"
        };
      }
    }

    stableTechnique = "neutral";
    return {
      technique: "neutral",
      mode: "ml",
      confidence: confidence || 0,
      phase: "neutral"
    };
  }

  return {
    reset,
    update,
    getStableTechnique: () => stableTechnique
  };
}
