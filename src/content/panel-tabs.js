(function attachPanelTabs(global) {
  const VALID_TABS = new Set(['filters', 'scan', 'dictionary']);

  function normalizeActiveTab(tabName) {
    return VALID_TABS.has(tabName) ? tabName : 'filters';
  }

  function chooseInitialActiveTab({ savedTab, searchSession } = {}) {
    if (searchSession?.active) return 'scan';
    return normalizeActiveTab(savedTab);
  }

  global.MlLensPanelTabs = {
    normalizeActiveTab,
    chooseInitialActiveTab
  };
})(globalThis);
