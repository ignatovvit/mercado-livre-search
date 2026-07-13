(function initMlLensScanStrategy(global) {
  const DEFAULT_BATCH_SIZE = 6;
  const DEFAULT_BATCH_DELAY_MS = 0;

  function normalizeText(value) {
    return String(value ?? '')
      .replace(/\p{Script=Latin}+/gu, (segment) => segment.normalize('NFKD').replace(/\p{Diacritic}/gu, ''))
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.join(' ') ?? '';
  }

  function hasTerms(terms) {
    return Array.isArray(terms) && terms.length > 0;
  }

  function allTermsInText(terms, text) {
    if (!hasTerms(terms)) return true;
    const normalized = normalizeText(text);
    return terms.every((term) => normalized.includes(normalizeText(term)));
  }

  function productText(product) {
    return [
      product?.title,
      product?.description,
      product?.reviewText,
      ...(Array.isArray(product?.materials) ? product.materials : [])
    ].filter(Boolean).join(' ');
  }

  function hasNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  }

  function needsProductDetail(product, filters = {}) {
    if (!product?.url) return false;

    if (filters.minRating && !hasNumber(product.rating)) return true;
    if (filters.minReviews && !hasNumber(product.reviewCount)) return true;

    if (hasTerms(filters.descriptionTerms) && !allTermsInText(filters.descriptionTerms, productText(product))) {
      return true;
    }

    if (hasTerms(filters.reviewTerms) && !allTermsInText(filters.reviewTerms, product.reviewText)) {
      return true;
    }

    if (hasTerms(filters.materialTerms) && !allTermsInText(filters.materialTerms, productText(product))) {
      return true;
    }

    return false;
  }

  function normalizePositiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : fallback;
  }

  function normalizeNonNegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
  }

  function createDetailScanPlan(products, filters = {}, options = {}) {
    const plannedProducts = (Array.isArray(products) ? products : [])
      .filter((product) => needsProductDetail(product, filters));
    return {
      products: plannedProducts,
      shouldFetchDetails: plannedProducts.length > 0,
      batchSize: normalizePositiveInteger(options.batchSize, DEFAULT_BATCH_SIZE),
      batchDelayMs: normalizeNonNegativeInteger(options.batchDelayMs, DEFAULT_BATCH_DELAY_MS)
    };
  }

  function shouldTranslateBeforeScan({ translatedState, query, translatedQuery } = {}) {
    return Boolean(
      !translatedState &&
      String(query || '').trim() &&
      !String(translatedQuery || '').trim()
    );
  }

  global.MlLensScanStrategy = {
    createDetailScanPlan,
    needsProductDetail,
    shouldTranslateBeforeScan
  };
})(globalThis);
