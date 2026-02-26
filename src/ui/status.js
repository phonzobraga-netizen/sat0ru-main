export function createStatus(statusPillEl, statusMessageEl) {
  return {
    set(state, message) {
      statusPillEl.dataset.state = state;
      statusPillEl.textContent = state.charAt(0).toUpperCase() + state.slice(1);
      statusMessageEl.textContent = message;
    }
  };
}