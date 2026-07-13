(function attachPanelPosition(global) {
  const EXPANDED_SIZE = { width: 432, height: 560 };
  const COLLAPSED_SIZE = { width: 96, height: 48 };
  const EDGE_MARGIN = 8;
  const DEFAULT_MARGIN = 24;
  const DRAG_THRESHOLD = 8;

  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function sizeForMode(mode) {
    return mode === 'collapsed' ? COLLAPSED_SIZE : EXPANDED_SIZE;
  }

  function normalizeMode(mode) {
    return mode === 'collapsed' ? 'collapsed' : 'expanded';
  }

  function createDefaultPanelState(viewport) {
    const width = numberOr(viewport?.width, 1440);
    return {
      mode: 'expanded',
      left: Math.max(DEFAULT_MARGIN, width - EXPANDED_SIZE.width - DEFAULT_MARGIN),
      top: DEFAULT_MARGIN
    };
  }

  function normalizePanelState(state, viewport) {
    const mode = normalizeMode(state?.mode);
    const size = sizeForMode(mode);
    const width = numberOr(viewport?.width, 1440);
    const height = numberOr(viewport?.height, 900);
    const maxLeft = Math.max(EDGE_MARGIN, width - size.width - EDGE_MARGIN);
    const maxTop = Math.max(EDGE_MARGIN, height - size.height - EDGE_MARGIN);

    return {
      mode,
      left: Math.round(clamp(numberOr(state?.left, createDefaultPanelState(viewport).left), EDGE_MARGIN, maxLeft)),
      top: Math.round(clamp(numberOr(state?.top, DEFAULT_MARGIN), EDGE_MARGIN, maxTop))
    };
  }

  function positionFromPointer(pointer, offset, state, viewport) {
    return normalizePanelState(
      {
        mode: state?.mode,
        left: numberOr(pointer?.clientX, 0) - numberOr(offset?.x, 0),
        top: numberOr(pointer?.clientY, 0) - numberOr(offset?.y, 0)
      },
      viewport
    );
  }

  function isDragMovement(startPointer, currentPointer, threshold = DRAG_THRESHOLD) {
    const deltaX = numberOr(currentPointer?.clientX, 0) - numberOr(startPointer?.clientX, 0);
    const deltaY = numberOr(currentPointer?.clientY, 0) - numberOr(startPointer?.clientY, 0);
    return Math.hypot(deltaX, deltaY) >= threshold;
  }

  global.MlLensPanelPosition = {
    createDefaultPanelState,
    normalizePanelState,
    positionFromPointer,
    isDragMovement
  };
})(globalThis);
