(function attachSearchSession(global) {
  const MERCADO_MARKETPLACES = [
    { rootDomain: 'mercadolivre.com.br', searchHost: 'lista.mercadolivre.com.br', targetLanguage: 'pt-BR' },
    { rootDomain: 'mercadolibre.com.ar', searchHost: 'listado.mercadolibre.com.ar', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.bo', searchHost: 'listado.mercadolibre.com.bo', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.cl', searchHost: 'listado.mercadolibre.cl', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.co', searchHost: 'listado.mercadolibre.com.co', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.co.cr', searchHost: 'listado.mercadolibre.co.cr', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.do', searchHost: 'listado.mercadolibre.com.do', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.ec', searchHost: 'listado.mercadolibre.com.ec', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.gt', searchHost: 'listado.mercadolibre.com.gt', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.hn', searchHost: 'listado.mercadolibre.com.hn', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.mx', searchHost: 'listado.mercadolibre.com.mx', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.ni', searchHost: 'listado.mercadolibre.com.ni', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.pa', searchHost: 'listado.mercadolibre.com.pa', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.py', searchHost: 'listado.mercadolibre.com.py', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.pe', searchHost: 'listado.mercadolibre.com.pe', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.sv', searchHost: 'listado.mercadolibre.com.sv', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.uy', searchHost: 'listado.mercadolibre.com.uy', targetLanguage: 'es' },
    { rootDomain: 'mercadolibre.com.ve', searchHost: 'listado.mercadolibre.com.ve', targetLanguage: 'es' }
  ];

  function hostMatchesRoot(hostname, rootDomain) {
    return hostname === rootDomain || hostname.endsWith(`.${rootDomain}`);
  }

  function parseUrlParts(rawUrl) {
    if (typeof URL !== 'undefined') {
      const url = new URL(rawUrl);
      return {
        protocol: url.protocol,
        hostname: url.hostname
      };
    }

    const match = String(rawUrl || '').match(/^(https?):\/\/([^/?#]+)/iu);
    if (!match) throw new Error('Invalid URL');
    return {
      protocol: `${match[1].toLowerCase()}:`,
      hostname: match[2].toLowerCase()
    };
  }

  function getMercadoMarketplaceFromUrl(rawUrl) {
    try {
      const url = parseUrlParts(rawUrl);
      if (url.protocol !== 'https:') return null;
      return MERCADO_MARKETPLACES.find((marketplace) => hostMatchesRoot(url.hostname, marketplace.rootDomain)) ?? null;
    } catch {
      return null;
    }
  }

  function getCurrentMarketplace(marketplaceUrl = '') {
    return getMercadoMarketplaceFromUrl(marketplaceUrl) ||
      getMercadoMarketplaceFromUrl(global.location?.href || '') ||
      MERCADO_MARKETPLACES[0];
  }

  function normalizeLatin(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.join('-') ?? '';
  }

  function buildMercadoSearchUrl(query, marketplaceUrl = '') {
    const marketplace = getCurrentMarketplace(marketplaceUrl);
    const slug = normalizeLatin(query);
    return `https://${marketplace.searchHost}/${slug || 'search'}`;
  }

  function getFirstPageUrl(url) {
    const rawUrl = String(url || '');
    const stripPagination = (value) => value.replace(/_Desde_\d+(?:_[^/?#]*)?(?=([?#]|$))/u, '');
    try {
      if (typeof URL === 'undefined') return stripPagination(rawUrl);
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      parsed.pathname = stripPagination(parsed.pathname);
      return parsed.toString();
    } catch {
      return stripPagination(rawUrl);
    }
  }

  function parseMaxPages(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.floor(number);
  }

  function createSearchSession({
    sourceQuery = '',
    translatedQuery = '',
    maxPages = 10,
    currentPageUrl = '',
    startFromCurrentPage = false,
    useMercadoLivreFilters = false
  } = {}) {
    const normalizedMaxPages = parseMaxPages(maxPages);
    const canonicalSearchUrl = buildMercadoSearchUrl(translatedQuery || sourceQuery, currentPageUrl);
    const currentSearchUrl = currentPageUrl ? String(currentPageUrl) : '';
    const filteredFirstPageUrl = currentSearchUrl ? getFirstPageUrl(currentSearchUrl) : canonicalSearchUrl;
    const usesMercadoLivreFilters = Boolean(useMercadoLivreFilters && currentSearchUrl);
    const startsFromCurrentPage = Boolean(startFromCurrentPage && currentSearchUrl);
    const searchUrl = startsFromCurrentPage
      ? currentSearchUrl
      : usesMercadoLivreFilters
        ? filteredFirstPageUrl
        : canonicalSearchUrl;
    return {
      id: `ml-lens-session-${Date.now()}`,
      active: true,
      sourceQuery,
      translatedQuery,
      maxPages: normalizedMaxPages,
      searchUrl,
      firstPageUrl: usesMercadoLivreFilters ? filteredFirstPageUrl : canonicalSearchUrl,
      startFromCurrentPage: startsFromCurrentPage,
      useMercadoLivreFilters: usesMercadoLivreFilters,
      pagesScanned: 0,
      visitedPages: [],
      products: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function productKey(product) {
    return product?.url || product?.id || '';
  }

  function mergeSessionProducts(session, products) {
    const byKey = new Map();
    for (const product of session?.products || []) {
      const key = productKey(product);
      if (key) byKey.set(key, product);
    }
    for (const product of products || []) {
      const key = productKey(product);
      if (!key) continue;
      byKey.set(key, {
        ...(byKey.get(key) || {}),
        ...product
      });
    }
    return {
      ...session,
      products: [...byKey.values()],
      updatedAt: new Date().toISOString()
    };
  }

  function markPageScanned(session, pageUrl) {
    const normalizedPageUrl = String(pageUrl || '');
    const visited = new Set(session?.visitedPages || []);
    const nextVisitedPages = normalizedPageUrl ? [...visited.add(normalizedPageUrl)] : [...visited];
    return {
      ...session,
      pagesScanned: nextVisitedPages.length,
      visitedPages: nextVisitedPages,
      updatedAt: new Date().toISOString()
    };
  }

  function shouldContinueToNextPage(session, nextPageUrl) {
    if (!session?.active || !nextPageUrl) return false;
    if ((session.visitedPages || []).includes(nextPageUrl)) return false;
    if (session.maxPages > 0 && session.pagesScanned >= session.maxPages) return false;
    return true;
  }

  function stopSearchSession(session) {
    return {
      ...session,
      active: false,
      updatedAt: new Date().toISOString()
    };
  }

  global.MlLensSearchSession = {
    buildMercadoSearchUrl,
    getMercadoMarketplaceFromUrl,
    getFirstPageUrl,
    createSearchSession,
    mergeSessionProducts,
    markPageScanned,
    shouldContinueToNextPage,
    stopSearchSession
  };
})(globalThis);
