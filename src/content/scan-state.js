(function initMlLensScanState(global) {
  function resetForFreshScan(state) {
    if (!state || typeof state !== 'object') return state;

    state.products = [];
    state.ranked = [];
    state.scannedCount = 0;
    state.matchedCount = 0;
    state.searchSession = null;

    if (state.cardMap && typeof state.cardMap.clear === 'function') {
      state.cardMap.clear();
    }

    return state;
  }

  global.MlLensScanState = {
    resetForFreshScan
  };
})(globalThis);
