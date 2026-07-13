import {
  createDictionaryIndexes,
  selectDictionaryIndex,
  translateQuery
} from '../shared/dictionary.js';
import {
  getMercadoMarketplaceFromUrl,
  isAllowedMercadoLivreUrl
} from '../shared/mercado-url.js';
import { rankProducts } from '../shared/search-engine.js';

const LOCAL_INDEX_PATH = 'data/dictionaries/dictionary-index.json';
let dictionaryIndexesPromise;

async function loadJson(path) {
  const response = await fetch(chrome.runtime.getURL(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadDictionaryIndexes() {
  if (!dictionaryIndexesPromise) {
    dictionaryIndexesPromise = (async () => {
      const index = await loadJson(LOCAL_INDEX_PATH);
      const packages = Array.isArray(index.packages) ? index.packages : [];
      if (!packages.length) {
        throw new Error('Dictionary index has no packages');
      }
      const packageData = await Promise.all(packages.map((dictionaryPackage) => {
        if (!dictionaryPackage?.path) {
          throw new Error('Dictionary index package has no path');
        }
        return loadJson(`data/dictionaries/${dictionaryPackage.path}`);
      }));
      return createDictionaryIndexes(packageData, index.defaultTargetLanguage ?? 'pt-BR');
    })();
  }
  return dictionaryIndexesPromise;
}

function resolveTargetLanguage(message, sender) {
  const explicitTargetLanguage = String(message?.targetLanguage || '').trim();
  if (explicitTargetLanguage) return explicitTargetLanguage;

  const marketplace = getMercadoMarketplaceFromUrl(message?.pageUrl || sender?.tab?.url || '');
  return marketplace?.targetLanguage || 'pt-BR';
}

async function fetchProductHtml(url) {
  if (!isAllowedMercadoLivreUrl(url)) {
    throw new Error('Blocked non-Mercado Livre URL');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Mercado Livre request failed: ${response.status}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Unexpected content type: ${contentType || 'unknown'}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleMessage(message, sender) {
  switch (message?.type) {
    case 'ML_LENS_TRANSLATE': {
      const dictionaries = await loadDictionaryIndexes();
      const dictionary = selectDictionaryIndex(dictionaries, resolveTargetLanguage(message, sender));
      return {
        ok: true,
        data: translateQuery(message.query, dictionary)
      };
    }
    case 'ML_LENS_RANK_PRODUCTS': {
      return {
        ok: true,
        data: rankProducts(message.products, message.filters)
      };
    }
    case 'ML_LENS_FETCH_HTML': {
      return {
        ok: true,
        data: {
          url: message.url,
          html: await fetchProductHtml(message.url)
        }
      };
    }
    default:
      return {
        ok: false,
        error: `Unknown message type: ${message?.type ?? 'undefined'}`
      };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  return true;
});
