(function initMlLensScanPreferences(global) {
  const SCAN_PREFERENCES_VERSION = 2;
  const EMPTY_FILTERS = {
    minRating: '',
    minReviews: '',
    titleTerms: '',
    descriptionTerms: '',
    reviewTerms: '',
    materialTerms: '',
    officialOnly: false
  };

  function normalizeScanPreferences(value) {
    const filters = value?.filters && typeof value.filters === 'object' ? value.filters : {};
    const hasMercadoLivreFilterPreference = Object.prototype.hasOwnProperty.call(value ?? {}, 'useMercadoLivreFilters');
    const preferencesVersion = Number(value?.preferencesVersion || 0);
    return {
      filters: {
        minRating: String(filters.minRating ?? EMPTY_FILTERS.minRating),
        minReviews: String(filters.minReviews ?? EMPTY_FILTERS.minReviews),
        titleTerms: String(filters.titleTerms ?? EMPTY_FILTERS.titleTerms),
        descriptionTerms: String(filters.descriptionTerms ?? EMPTY_FILTERS.descriptionTerms),
        reviewTerms: String(filters.reviewTerms ?? EMPTY_FILTERS.reviewTerms),
        materialTerms: String(filters.materialTerms ?? EMPTY_FILTERS.materialTerms),
        officialOnly: Boolean(filters.officialOnly)
      },
      startFromCurrentPage: Boolean(value?.startFromCurrentPage),
      useMercadoLivreFilters: hasMercadoLivreFilterPreference && preferencesVersion >= SCAN_PREFERENCES_VERSION
        ? Boolean(value.useMercadoLivreFilters)
        : true
    };
  }

  global.MlLensScanPreferences = {
    SCAN_PREFERENCES_VERSION,
    normalizeScanPreferences
  };
})(globalThis);
