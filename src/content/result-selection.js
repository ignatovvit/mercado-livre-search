(function attachResultSelection(global) {
  function selectDisplayResults(ranked, options = {}) {
    const strictMatches = (ranked || [])
      .filter((item) => item?.match?.matches)
      .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
    if (!Object.prototype.hasOwnProperty.call(options, 'limit')) return strictMatches;
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : strictMatches.length;
    return strictMatches.slice(0, Math.max(0, limit));
  }

  function canonicalUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`.replace(/\/$/, '').toLowerCase();
    } catch {
      return String(value).split(/[?#]/)[0].replace(/\/$/, '').toLowerCase();
    }
  }

  function isSamePageUrl(left, right) {
    const normalizedLeft = canonicalUrl(left);
    const normalizedRight = canonicalUrl(right);
    return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
  }

  function resolveResultNavigation(product, currentPageUrl) {
    if (!product) return { type: 'none', url: '' };
    if (isSamePageUrl(product.sourcePageUrl, currentPageUrl)) {
      return { type: 'current-page', url: '' };
    }
    if (product.sourcePageUrl) {
      return { type: 'source-page', url: product.sourcePageUrl };
    }
    if (product.url) {
      return { type: 'product-page', url: product.url };
    }
    return { type: 'none', url: '' };
  }

  function resolveResultAction(product, action, currentPageUrl) {
    if (action === 'open-product') {
      return product?.url
        ? { type: 'product-page', url: product.url }
        : { type: 'none', url: '' };
    }
    return resolveResultNavigation(product, currentPageUrl);
  }

  global.MlLensResultSelection = {
    canonicalUrl,
    isSamePageUrl,
    selectDisplayResults,
    resolveResultAction,
    resolveResultNavigation
  };
})(globalThis);
