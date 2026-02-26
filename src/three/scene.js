import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { fillTargets, getTechniqueMeta } from "./techniques.js";
import { AIR_FLOW_CONFIG, PARTICLE_MOTION_CONFIG } from "../config.js";

export function createScene({ initialCount, bloomMultiplier: initialBloomMultiplier }) {
  const maxCount = 20000;
  let activeCount = Math.min(initialCount, maxCount);
  let bloomMultiplier = initialBloomMultiplier;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 55;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
  );
  composer.addPass(bloomPass);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxCount * 3);
  const colors = new Float32Array(maxCount * 3);
  const targetPositions = new Float32Array(maxCount * 3);
  const targetColors = new Float32Array(maxCount * 3);

  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttr);
  geometry.setAttribute("color", colorAttr);

  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );

  scene.add(particles);

  let currentTech = "neutral";
  let shakeIntensity = 0;
  let glowColor = "#00ffff";
  let transitioning = true;
  let flowTime = 0;

  function zeroTail(fromCount) {
    for (let i = fromCount; i < maxCount; i += 1) {
      const idx = i * 3;
      positions[idx] = 0;
      positions[idx + 1] = 0;
      positions[idx + 2] = 0;
      targetPositions[idx] = 0;
      targetPositions[idx + 1] = 0;
      targetPositions[idx + 2] = 0;
      colors[idx] = 0;
      colors[idx + 1] = 0;
      colors[idx + 2] = 0;
      targetColors[idx] = 0;
      targetColors[idx + 1] = 0;
      targetColors[idx + 2] = 0;
    }
  }

  function applyTechniqueMeta(meta) {
    shakeIntensity = meta.shake;
    glowColor = meta.glow;
    bloomPass.strength = meta.bloom * bloomMultiplier;
  }

  function setTechnique(tech) {
    if (currentTech === tech) return;

    currentTech = tech;
    const meta = getTechniqueMeta(tech);
    applyTechniqueMeta(meta);

    fillTargets(tech, activeCount, targetPositions, targetColors);
    zeroTail(activeCount);
    transitioning = true;
  }

  function setParticleCount(nextCount) {
    activeCount = Math.max(2000, Math.min(nextCount, maxCount));
    fillTargets(currentTech, activeCount, targetPositions, targetColors);
    zeroTail(activeCount);
    transitioning = true;
  }

  function setBloomMultiplier(nextMultiplier) {
    bloomMultiplier = nextMultiplier;
    applyTechniqueMeta(getTechniqueMeta(currentTech));
  }

  function updateRotation(deltaSeconds) {
    if (currentTech === "red") {
      particles.rotation.z -= 6.0 * deltaSeconds;
    } else if (currentTech === "blue") {
      particles.rotation.z += 3.6 * deltaSeconds;
      particles.rotation.x -= 0.6 * deltaSeconds;
    } else if (currentTech === "blackflash") {
      particles.rotation.x += 8.4 * deltaSeconds;
      particles.rotation.z -= 10.8 * deltaSeconds;
    } else if (currentTech === "meteor") {
      particles.rotation.y += 0.6 * deltaSeconds;
      particles.rotation.z += 1.2 * deltaSeconds;
    } else if (currentTech === "purple") {
      particles.rotation.z += 12.0 * deltaSeconds;
      particles.rotation.y += 3.0 * deltaSeconds;
    } else if (currentTech === "shrine") {
      particles.rotation.set(0, 0, 0);
    } else if (currentTech === "cleaveStorm") {
      particles.rotation.y += 1.8 * deltaSeconds;
      particles.rotation.z -= 5.4 * deltaSeconds;
      particles.rotation.x += 0.35 * deltaSeconds;
    } else if (currentTech === "dismantleSpiral") {
      particles.rotation.y -= 2.4 * deltaSeconds;
      particles.rotation.z += 4.8 * deltaSeconds;
    } else if (currentTech === "ratioStrike") {
      particles.rotation.x = Math.sin(flowTime * 1.8) * 0.05;
      particles.rotation.y += 0.25 * deltaSeconds;
    } else if (currentTech === "boogieRipple") {
      particles.rotation.y += 1.1 * deltaSeconds;
      particles.rotation.z += 1.5 * deltaSeconds;
    } else if (currentTech === "doubleMiddleMonkey") {
      particles.rotation.y += 0.45 * deltaSeconds;
      particles.rotation.x = Math.sin(flowTime * 1.2) * 0.06;
    } else {
      particles.rotation.y += 0.3 * deltaSeconds;
    }
  }

  function renderFrame(deltaMs = 16.67) {
    if (shakeIntensity > 0) {
      renderer.domElement.style.transform = `translate(${(Math.random() - 0.5) * shakeIntensity * 40}px, ${(Math.random() - 0.5) * shakeIntensity * 40}px)`;
    } else {
      renderer.domElement.style.transform = "translate(0,0)";
    }

    const deltaSeconds = Math.max(1 / 240, Math.min(deltaMs / 1000, 1 / 20));
    flowTime += deltaSeconds * AIR_FLOW_CONFIG.driftSpeed;
    const baseLerp = 1 - Math.exp(-PARTICLE_MOTION_CONFIG.responsiveness * deltaSeconds);
    const lerp = Math.min(
      PARTICLE_MOTION_CONFIG.maxLerp,
      Math.max(PARTICLE_MOTION_CONFIG.minLerp, baseLerp)
    );

    if (transitioning) {
      let maxDelta = 0;
      for (let i = 0; i < activeCount * 3; i += 1) {
        const dp = targetPositions[i] - positions[i];
        const dc = targetColors[i] - colors[i];
        positions[i] += dp * lerp;
        colors[i] += dc * lerp;

        const absDp = Math.abs(dp);
        if (absDp > maxDelta) maxDelta = absDp;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      if (maxDelta < PARTICLE_MOTION_CONFIG.settleEpsilon) {
        transitioning = false;
      }
    }

    particles.position.x = Math.sin(flowTime * 0.83) * AIR_FLOW_CONFIG.driftXAmplitude;
    particles.position.y = Math.cos(flowTime * 1.07) * AIR_FLOW_CONFIG.driftYAmplitude;
    particles.position.z = Math.sin(flowTime * 0.53) * AIR_FLOW_CONFIG.driftZAmplitude;

    updateRotation(deltaSeconds);
    composer.render();
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  function dispose() {
    renderer.dispose();
    geometry.dispose();
    particles.material.dispose();
    renderer.domElement.remove();
  }

  fillTargets("neutral", activeCount, targetPositions, targetColors);

  return {
    renderFrame,
    resize,
    dispose,
    setTechnique,
    setParticleCount,
    setBloomMultiplier,
    getCurrentMeta: () => getTechniqueMeta(currentTech),
    getGlowColor: () => glowColor
  };
}
