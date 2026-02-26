export function createControlPanel({
  cameraSelect,
  qualitySelect,
  startButton,
  stopButton,
  fpsEl,
  onStart,
  onStop,
  onQualityChange
}) {
  startButton.addEventListener("click", () => {
    onStart(cameraSelect.value || undefined);
  });

  stopButton.addEventListener("click", () => {
    onStop();
  });

  qualitySelect.addEventListener("change", () => {
    onQualityChange(qualitySelect.value);
  });

  return {
    setCameraOptions(cameras, selectedId) {
      cameraSelect.innerHTML = "";
      if (!cameras.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No camera found";
        cameraSelect.appendChild(option);
        return;
      }

      for (const camera of cameras) {
        const option = document.createElement("option");
        option.value = camera.deviceId;
        option.textContent = camera.label || `Camera ${cameraSelect.length + 1}`;
        cameraSelect.appendChild(option);
      }

      if (selectedId) cameraSelect.value = selectedId;
    },
    setRunning(running) {
      startButton.disabled = running;
      stopButton.disabled = !running;
      cameraSelect.disabled = running;
    },
    setFps(fps) {
      fpsEl.textContent = `FPS: ${fps}`;
    }
  };
}