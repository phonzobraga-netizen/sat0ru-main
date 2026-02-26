import { TECHNIQUE_META } from "../config.js";

function getRed(i, count) {
  if (i < count * 0.1) {
    const r = Math.random() * 9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      r: 3,
      g: 0.1,
      b: 0.1
    };
  }
  const armCount = 3;
  const t = i / count;
  const angle = t * 15 + (i % armCount) * ((Math.PI * 2) / armCount);
  const radius = 2 + t * 40;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: (Math.random() - 0.5) * (10 * t),
    r: 0.8,
    g: 0,
    b: 0
  };
}

function getVoid(i, count) {
  if (i < count * 0.15) {
    const angle = Math.random() * Math.PI * 2;
    return { x: 26 * Math.cos(angle), y: 26 * Math.sin(angle), z: Math.random() - 0.5, r: 1, g: 1, b: 1 };
  }
  const radius = 30 + Math.random() * 90;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
    r: 0.1,
    g: 0.6,
    b: 1.0
  };
}

function getPurple() {
  if (Math.random() > 0.8) {
    return {
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 100,
      r: 0.5,
      g: 0.5,
      b: 0.7
    };
  }
  const radius = 20;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
    r: 0.6,
    g: 0.5,
    b: 1.0
  };
}

function getShrine(i, count) {
  if (i < count * 0.3) return { x: (Math.random() - 0.5) * 80, y: -15, z: (Math.random() - 0.5) * 80, r: 0.4, g: 0, b: 0 };
  if (i < count * 0.4) {
    const px = (i % 4 < 2 ? 1 : -1) * 12;
    const pz = (i % 4 % 2 === 0 ? 1 : -1) * 8;
    return {
      x: px + (Math.random() - 0.5) * 2,
      y: -15 + Math.random() * 30,
      z: pz + (Math.random() - 0.5) * 2,
      r: 0.2,
      g: 0.2,
      b: 0.2
    };
  }
  if (i < count * 0.6) {
    const t = Math.random() * Math.PI * 2;
    const rad = Math.random() * 30;
    const curve = Math.pow(rad / 30, 2) * 10;
    return { x: rad * Math.cos(t), y: 15 - curve + Math.random() * 2, z: rad * Math.sin(t) * 0.6, r: 0.6, g: 0, b: 0 };
  }
  return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0 };
}

function getBlue(i, count) {
  if (i < count * 0.25) {
    const t = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 8;
    return { x: radius * Math.cos(t), y: radius * Math.sin(t), z: (Math.random() - 0.5) * 6, r: 0.2, g: 0.8, b: 1.0 };
  }
  const spiral = i / count;
  const a = spiral * 40;
  const radius = 45 - spiral * 42;
  return { x: radius * Math.cos(a), y: radius * Math.sin(a), z: (Math.random() - 0.5) * 18, r: 0.05, g: 0.5, b: 1.0 };
}

function getBlackFlash(i, count) {
  if (i < count * 0.2) {
    const radius = Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
      r: 1,
      g: 1,
      b: 1
    };
  }
  if (i < count * 0.75) {
    const spike = Math.random() * 65;
    const t = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 20;
    return { x: spike * Math.cos(t), y, z: spike * Math.sin(t), r: 0.02, g: 0.02, b: 0.02 };
  }
  return {
    x: (Math.random() - 0.5) * 22,
    y: (Math.random() - 0.5) * 22,
    z: (Math.random() - 0.5) * 22,
    r: 0.9,
    g: 0,
    b: 0
  };
}

function getMeteor(i, count) {
  if (i < count * 0.35) {
    const y = 50 + Math.random() * 50;
    return { x: (Math.random() - 0.5) * 80, y, z: (Math.random() - 0.5) * 80, r: 1.0, g: 0.45, b: 0.1 };
  }
  if (i < count * 0.65) {
    const t = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 18;
    return { x: radius * Math.cos(t), y: -18 + Math.random() * 8, z: radius * Math.sin(t), r: 0.8, g: 0.1, b: 0.05 };
  }
  return { x: (Math.random() - 0.5) * 35, y: -12 + Math.random() * 5, z: (Math.random() - 0.5) * 35, r: 0.3, g: 0.02, b: 0.02 };
}

function getCleaveStorm(i, count) {
  if (i < count * 0.35) {
    const arm = i % 6;
    const t = i / count;
    const baseAngle = arm * ((Math.PI * 2) / 6);
    const sweep = baseAngle + t * 26;
    const radius = 6 + t * 55;
    return {
      x: Math.cos(sweep) * radius,
      y: Math.sin(sweep * 0.7) * 18,
      z: Math.sin(sweep) * radius,
      r: 1,
      g: 0.5,
      b: 0.35
    };
  }
  const ringAngle = Math.random() * Math.PI * 2;
  const ringRadius = 22 + Math.random() * 16;
  return {
    x: Math.cos(ringAngle) * ringRadius,
    y: (Math.random() - 0.5) * 14,
    z: Math.sin(ringAngle) * ringRadius,
    r: 1,
    g: 0.74,
    b: 0.6
  };
}

function getDismantleSpiral(i, count) {
  const t = i / count;
  const angle = t * 42;
  const radius = 3 + t * 46;
  if (i < count * 0.6) {
    return {
      x: Math.cos(angle) * radius,
      y: (Math.sin(angle * 2.4) + (Math.random() - 0.5)) * 13,
      z: Math.sin(angle) * radius,
      r: 1,
      g: 0.25,
      b: 0.25
    };
  }
  return {
    x: (Math.random() - 0.5) * 95,
    y: (Math.random() - 0.5) * 25,
    z: (Math.random() - 0.5) * 95,
    r: 1,
    g: 0.62,
    b: 0.48
  };
}

function getRatioStrike(i, count) {
  const lane = i % 7;
  const step = Math.floor(i / 7);
  const x = -42 + step * 0.55;
  const y = (lane - 3) * 3.2 + (Math.random() - 0.5) * 1.4;
  const z = Math.sin(step * 0.18 + lane) * 12 + (Math.random() - 0.5) * 2;

  if (i < count * 0.25) {
    return { x, y, z, r: 1.0, g: 0.88, b: 0.38 };
  }
  return {
    x: x * 0.72,
    y: y * 0.85,
    z: z * 0.72,
    r: 0.95,
    g: 0.72,
    b: 0.22
  };
}

function getBoogieRipple(i, count) {
  const layer = i % 5;
  const t = i / count;
  const angle = t * Math.PI * 2 * (4 + layer * 0.3);
  const radius = 8 + layer * 5 + Math.sin(t * 18 + layer) * 3;
  return {
    x: Math.cos(angle) * radius,
    y: (Math.sin(t * 16 + layer) + (Math.random() - 0.5) * 0.35) * 10,
    z: Math.sin(angle) * radius,
    r: 0.45,
    g: 1,
    b: 0.82
  };
}

function getDoubleMiddleMonkey(i, count) {
  const bodyEnd = count * 0.45;
  const headEnd = bodyEnd + count * 0.22;
  const earEnd = headEnd + count * 0.08;
  const palmEnd = earEnd + count * 0.14;
  const fingerEnd = palmEnd + count * 0.08;
  const faceEnd = fingerEnd + count * 0.03;

  if (i < bodyEnd) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random());
    return {
      x: Math.cos(t) * r * 19,
      y: -10 + Math.sin(t) * r * 17 + (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 7,
      r: 0.62,
      g: 0.47,
      b: 0.3
    };
  }

  if (i < headEnd) {
    const t = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const radius = 9 + Math.random() * 3;
    return {
      x: Math.sin(ph) * Math.cos(t) * radius,
      y: 16 + Math.sin(ph) * Math.sin(t) * radius,
      z: Math.cos(ph) * radius * 0.9,
      r: 0.74,
      g: 0.62,
      b: 0.44
    };
  }

  if (i < earEnd) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 2.8;
    return {
      x: side * 11 + Math.cos(t) * radius,
      y: 18 + Math.sin(t) * radius,
      z: (Math.random() - 0.5) * 3,
      r: 0.64,
      g: 0.5,
      b: 0.32
    };
  }

  if (i < palmEnd) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 3.5;
    return {
      x: side * 23 + Math.cos(t) * radius,
      y: 5 + Math.sin(t) * radius,
      z: (Math.random() - 0.5) * 4,
      r: 0.77,
      g: 0.64,
      b: 0.46
    };
  }

  if (i < fingerEnd) {
    const side = i % 2 === 0 ? -1 : 1;
    return {
      x: side * 27 + (Math.random() - 0.5) * 1.6,
      y: 14 + Math.random() * 15,
      z: (Math.random() - 0.5) * 2.6,
      r: 0.89,
      g: 0.76,
      b: 0.58
    };
  }

  if (i < faceEnd) {
    const mode = i % 3;
    if (mode === 0) {
      return { x: -3 + (Math.random() - 0.5), y: 19 + (Math.random() - 0.5), z: 8, r: 0.05, g: 0.04, b: 0.04 };
    }
    if (mode === 1) {
      return { x: 3 + (Math.random() - 0.5), y: 19 + (Math.random() - 0.5), z: 8, r: 0.05, g: 0.04, b: 0.04 };
    }
    return { x: (Math.random() - 0.5) * 2, y: 14 + (Math.random() - 0.5), z: 8.3, r: 0.12, g: 0.08, b: 0.08 };
  }

  return {
    x: (Math.random() - 0.5) * 70,
    y: (Math.random() - 0.5) * 48,
    z: (Math.random() - 0.5) * 20,
    r: 0.15,
    g: 0.11,
    b: 0.08
  };
}

function getNeutral(i, count) {
  if (i < count * 0.05) {
    const r = 15 + Math.random() * 20;
    const t = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI;
    return {
      x: r * Math.sin(ph) * Math.cos(t),
      y: r * Math.sin(ph) * Math.sin(t),
      z: r * Math.cos(ph),
      r: 0.1,
      g: 0.1,
      b: 0.2
    };
  }
  return { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0 };
}

export function fillTargets(tech, count, targetPositions, targetColors) {
  for (let i = 0; i < count; i += 1) {
    let p;
    if (tech === "red") p = getRed(i, count);
    else if (tech === "void") p = getVoid(i, count);
    else if (tech === "purple") p = getPurple(i, count);
    else if (tech === "shrine") p = getShrine(i, count);
    else if (tech === "blue") p = getBlue(i, count);
    else if (tech === "blackflash") p = getBlackFlash(i, count);
    else if (tech === "meteor") p = getMeteor(i, count);
    else if (tech === "cleaveStorm") p = getCleaveStorm(i, count);
    else if (tech === "dismantleSpiral") p = getDismantleSpiral(i, count);
    else if (tech === "ratioStrike") p = getRatioStrike(i, count);
    else if (tech === "boogieRipple") p = getBoogieRipple(i, count);
    else if (tech === "doubleMiddleMonkey") p = getDoubleMiddleMonkey(i, count);
    else p = getNeutral(i, count);

    targetPositions[i * 3] = p.x;
    targetPositions[i * 3 + 1] = p.y;
    targetPositions[i * 3 + 2] = p.z;

    targetColors[i * 3] = p.r;
    targetColors[i * 3 + 1] = p.g;
    targetColors[i * 3 + 2] = p.b;
  }
}

export function getTechniqueMeta(tech) {
  return TECHNIQUE_META[tech] || TECHNIQUE_META.neutral;
}
