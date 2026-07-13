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

export function getMercadoMarketplaceFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') return null;
    return MERCADO_MARKETPLACES.find((marketplace) => hostMatchesRoot(url.hostname, marketplace.rootDomain)) ?? null;
  } catch {
    return null;
  }
}

export function isAllowedMercadoLivreUrl(rawUrl) {
  return Boolean(getMercadoMarketplaceFromUrl(rawUrl));
}
