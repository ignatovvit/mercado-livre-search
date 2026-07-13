(function bootstrapMlLens() {
  if (window.__ML_LENS_INSTALLED__) return;
  window.__ML_LENS_INSTALLED__ = true;

  const PANEL_STORAGE_KEY = 'mlLensPanelState';
  const ACTIVE_TAB_STORAGE_KEY = 'mlLensActiveTab';
  const INTERFACE_LOCALE_STORAGE_KEY = 'mlLensInterfaceLocale';
  const SEARCH_SESSION_STORAGE_KEY = 'mlLensSearchSession';
  const SCAN_PREFERENCES_STORAGE_KEY = 'mlLensScanPreferences';
  const PENDING_FOCUS_STORAGE_KEY = 'mlLensPendingFocusProduct';
  const PanelPosition = window.MlLensPanelPosition;
  const PanelTabs = window.MlLensPanelTabs;
  const SearchSession = window.MlLensSearchSession;
  const ResultSelection = window.MlLensResultSelection;
  const ProductData = window.MlLensProductData;
  const I18n = window.MlLensI18n;
  const ScanState = window.MlLensScanState;
  const ScanPreferences = window.MlLensScanPreferences;
  const ScanStrategy = window.MlLensScanStrategy;
  const SCAN_PREFERENCES_VERSION = ScanPreferences?.SCAN_PREFERENCES_VERSION || 2;
  const CARD_SELECTORS = [
    'li.ui-search-layout__item',
    '.ui-search-result',
    '[class*="ui-search-layout__item"]',
    '[class*="ui-search-result"]'
  ];
  const MATERIAL_ALIASES = new Map([
    ['wood', ['wood', 'madeira', 'madeira macica', 'madera', 'дерево', 'деревянный']],
    ['plastic', ['plastic', 'plastico', 'plastica', 'пластик']],
    ['cotton', ['cotton', 'algodao', 'хлопок']],
    ['leather', ['leather', 'couro', 'кожа']],
    ['metal', ['metal', 'aco', 'aluminio', 'металл']]
  ]);
  const MATERIAL_TARGETS_BY_LANGUAGE = {
    'pt-BR': {
      wood: 'madeira',
      plastic: 'plastico',
      cotton: 'algodao',
      leather: 'couro',
      metal: 'metal'
    },
    es: {
      wood: 'madera',
      plastic: 'plastico',
      cotton: 'algodon',
      leather: 'cuero',
      metal: 'metal'
    }
  };

  const state = {
    products: [],
    ranked: [],
    cardMap: new Map(),
    translated: null,
    scanning: false,
    scanToken: 0,
    scannedCount: 0,
    matchedCount: 0,
    panelState: null,
    searchSession: null,
    locale: I18n?.defaultLocale || 'en',
    statusKind: 'idle',
    statusKey: 'status.idle',
    statusParams: {},
    scanTitleKey: 'scan.readyTitle',
    scanTitleParams: {},
    drag: null,
    suppressNextClick: false
  };

  const refs = {};

  function normalizeText(value) {
    return String(value || '')
      .replace(/\p{Script=Latin}+/gu, (segment) => segment.normalize('NFKD').replace(/\p{Diacritic}/gu, ''))
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.join(' ') ?? '';
  }

  function parseTerms(value) {
    const normalized = normalizeText(String(value || '').replace(/,/g, ' '));
    return normalized ? normalized.split(' ') : [];
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function sendMessage(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...payload }, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || 'Extension message failed'));
          return;
        }
        resolve(response.data);
      });
    });
  }

  function getInitialQuery() {
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q') || params.get('search');
    if (queryParam) return queryParam;

    const input = document.querySelector('input[name="as_word"], input[type="text"][aria-label], input[type="text"]');
    return input?.value || '';
  }

  function t(key, params = {}) {
    return I18n?.t
      ? I18n.t(state.locale, key, params)
      : key;
  }

  function getCurrentMarketplace() {
    return SearchSession?.getMercadoMarketplaceFromUrl?.(window.location.href) || {
      targetLanguage: 'pt-BR'
    };
  }

  function getCurrentTargetLanguage() {
    return getCurrentMarketplace().targetLanguage || 'pt-BR';
  }

  function getCurrentMaterialTargets() {
    return MATERIAL_TARGETS_BY_LANGUAGE[getCurrentTargetLanguage()] || MATERIAL_TARGETS_BY_LANGUAGE['pt-BR'];
  }

  function applyMarketplaceText() {
    if (refs.translateButton) {
      refs.translateButton.textContent = t('app.translateButton', {
        targetLanguage: getCurrentTargetLanguage()
      });
    }
  }

  function normalizeLocale(locale) {
    return I18n?.normalizeLocale ? I18n.normalizeLocale(locale) : (locale === 'ru' ? 'ru' : 'en');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function html(key, params = {}) {
    return escapeHtml(t(key, params));
  }

  function createPanelLegacy() {
    const root = document.createElement('aside');
    root.id = 'ml-lens-root';
    root.setAttribute('aria-label', 'ML Lens Mercado Livre search assistant');
    root.setAttribute('data-active-tab', 'filters');
    root.innerHTML = `
      <button class="ml-lens-pill" type="button" data-action="expand" data-ml-lens-drag-handle aria-label="Развернуть ML Lens">
        <span class="ml-lens-pill-dot" aria-hidden="true"></span>
        <span class="ml-lens-pill-name">ML Lens</span>
        <span class="ml-lens-pill-label">Развернуть</span>
      </button>
      <div class="ml-lens-shell">
        <header class="ml-lens-header" data-ml-lens-drag-handle>
          <div>
            <div class="ml-lens-brand">ML Lens</div>
            <div class="ml-lens-caption">Глубокий поиск по товарам и отзывам</div>
          </div>
          <div class="ml-lens-header-actions">
            <button class="ml-lens-lang" type="button" data-action="translate">RU → pt-BR</button>
            <button class="ml-lens-icon-btn" type="button" data-action="collapse" aria-label="Свернуть панель">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 8.5h10v3H5z"></path>
              </svg>
            </button>
          </div>
        </header>

        <section class="ml-lens-section">
          <label class="ml-lens-label" for="ml-lens-query">Запрос пользователя</label>
          <input class="ml-lens-input" id="ml-lens-query" type="text" autocomplete="off" />
          <label class="ml-lens-label" for="ml-lens-translated">Поисковый запрос Mercado Livre</label>
          <input class="ml-lens-input ml-lens-input--accent" id="ml-lens-translated" type="text" autocomplete="off" />
          <div class="ml-lens-grid ml-lens-search-grid">
            <button class="ml-lens-btn ml-lens-btn--primary" type="button" data-action="search-mercado">Search Mercado Livre</button>
            <div>
              <label class="ml-lens-label" for="ml-lens-max-pages">Max pages</label>
              <input class="ml-lens-input" id="ml-lens-max-pages" type="number" min="0" step="1" value="10" />
            </div>
          </div>
        </section>

        <nav class="ml-lens-tabs" aria-label="ML Lens sections">
          <button class="ml-lens-tab is-active" type="button" data-tab="filters">Фильтры</button>
          <button class="ml-lens-tab" type="button" data-tab="scan">Скан</button>
          <button class="ml-lens-tab" type="button" data-tab="dictionary">Словарь</button>
        </nav>

        <section class="ml-lens-scan-card ml-lens-tab-content-scan ml-lens-tab-content" aria-live="polite">
          <div class="ml-lens-scan-top">
            <strong id="ml-lens-scan-title">Ready to scan current search</strong>
            <span class="ml-lens-status is-idle" id="ml-lens-status">idle</span>
          </div>
          <div class="ml-lens-progress" aria-hidden="true"><span id="ml-lens-progress-fill"></span></div>
          <div class="ml-lens-scan-meta">
            <span id="ml-lens-scan-count">0 товаров · 0 совпадений</span>
            <span id="ml-lens-scan-mode">локально</span>
          </div>
          <div class="ml-lens-actions">
            <button class="ml-lens-btn ml-lens-btn--primary" type="button" data-action="start">Start scan</button>
            <button class="ml-lens-btn" type="button" data-action="stop">Stop</button>
            <button class="ml-lens-btn ml-lens-btn--danger" type="button" data-action="reset">Reset</button>
          </div>
        </section>

        <section class="ml-lens-section ml-lens-tab-content-filters ml-lens-tab-content">
          <div class="ml-lens-grid">
            <div>
              <label class="ml-lens-label" for="ml-lens-rating">Рейтинг min</label>
              <input class="ml-lens-input" id="ml-lens-rating" type="number" min="0" max="5" step="0.1" value="" />
            </div>
            <div>
              <label class="ml-lens-label" for="ml-lens-reviews">Отзывы min</label>
              <input class="ml-lens-input" id="ml-lens-reviews" type="number" min="0" step="1" value="" />
            </div>
          </div>
          <label class="ml-lens-label" for="ml-lens-title-terms">Слова в названии</label>
          <input class="ml-lens-input" id="ml-lens-title-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-description-terms">Слова в описании</label>
          <input class="ml-lens-input" id="ml-lens-description-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-review-terms">Слова в отзывах</label>
          <input class="ml-lens-input" id="ml-lens-review-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-material-terms">Материал</label>
          <input class="ml-lens-input" id="ml-lens-material-terms" type="text" value="" />
          <div class="ml-lens-chip-row" id="ml-lens-material-chips"></div>
          <label class="ml-lens-check">
            <input id="ml-lens-official" type="checkbox" />
            <span>Только official store</span>
          </label>
        </section>

        <section class="ml-lens-actionbar ml-lens-tab-content-filters ml-lens-tab-content">
          <button class="ml-lens-btn ml-lens-btn--primary" type="button" data-action="highlight">Highlight best</button>
          <button class="ml-lens-btn" type="button" data-action="hide">Hide</button>
          <button class="ml-lens-btn" type="button" data-action="reorder">Reorder</button>
        </section>

        <section class="ml-lens-section ml-lens-tab-content-dictionary ml-lens-tab-content">
          <label class="ml-lens-label">Совпадения в словаре</label>
          <div id="ml-lens-dictionary-details" class="ml-lens-dict-details">
            <div class="ml-lens-empty">Словарь готов. Введите поисковый запрос выше.</div>
          </div>
        </section>

        <section class="ml-lens-results">
          <div class="ml-lens-results-head">
            <strong>Results</strong>
            <span id="ml-lens-result-summary">нет данных</span>
          </div>
          <div class="ml-lens-result-list" id="ml-lens-results"></div>
          <div id="ml-lens-debug-log" style="font-size: 10px; color: var(--ml-muted); margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 8px; border: 1px solid var(--ml-border); white-space: pre-wrap; font-family: monospace; max-height: 120px; overflow-y: auto; display: none;"></div>
        </section>
      </div>
    `;
    document.documentElement.appendChild(root);

    refs.root = root;
    refs.pill = root.querySelector('.ml-lens-pill');
    refs.query = root.querySelector('#ml-lens-query');
    refs.translated = root.querySelector('#ml-lens-translated');
    refs.maxPages = root.querySelector('#ml-lens-max-pages');
    refs.rating = root.querySelector('#ml-lens-rating');
    refs.reviews = root.querySelector('#ml-lens-reviews');
    refs.titleTerms = root.querySelector('#ml-lens-title-terms');
    refs.descriptionTerms = root.querySelector('#ml-lens-description-terms');
    refs.reviewTerms = root.querySelector('#ml-lens-review-terms');
    refs.materialTerms = root.querySelector('#ml-lens-material-terms');
    refs.materialChips = root.querySelector('#ml-lens-material-chips');
    refs.official = root.querySelector('#ml-lens-official');
    refs.status = root.querySelector('#ml-lens-status');
    refs.scanTitle = root.querySelector('#ml-lens-scan-title');
    refs.scanCount = root.querySelector('#ml-lens-scan-count');
    refs.scanMode = root.querySelector('#ml-lens-scan-mode');
    refs.progressFill = root.querySelector('#ml-lens-progress-fill');
    refs.results = root.querySelector('#ml-lens-results');
    refs.resultSummary = root.querySelector('#ml-lens-result-summary');
    refs.dictionaryDetails = root.querySelector('#ml-lens-dictionary-details');
    refs.debugLog = root.querySelector('#ml-lens-debug-log');

    refs.query.value = getInitialQuery();
    refs.query.addEventListener('change', updateTranslation);
    refs.translated.addEventListener('change', syncTermsFromTranslatedQuery);
    root.addEventListener('click', handleActionClick);
    root.addEventListener('pointerdown', handleDragPointerDown);
    root.addEventListener('input', (event) => {
      if (event.target.matches('.ml-lens-input, #ml-lens-official')) rankCurrentProducts();
    });
  }

  function createPanel() {
    const root = document.createElement('aside');
    root.id = 'ml-lens-root';
    root.setAttribute('aria-label', 'ML Lens Mercado Livre search assistant');
    root.setAttribute('data-active-tab', 'filters');
    root.innerHTML = `
      <button class="ml-lens-pill" type="button" data-action="expand" data-ml-lens-drag-handle data-i18n-aria-label="app.expandLabel" aria-label="${html('app.expandLabel')}">
        <span class="ml-lens-pill-dot" aria-hidden="true"></span>
        <span class="ml-lens-pill-name">ML Lens</span>
        <span class="ml-lens-pill-label" data-i18n="app.expand">${html('app.expand')}</span>
      </button>
      <div class="ml-lens-shell">
        <header class="ml-lens-header" data-ml-lens-drag-handle>
          <div>
            <div class="ml-lens-brand">ML Lens</div>
            <div class="ml-lens-caption" data-i18n="app.caption">${html('app.caption')}</div>
          </div>
          <div class="ml-lens-header-actions">
            <select class="ml-lens-locale" id="ml-lens-locale" data-i18n-aria-label="app.interfaceLanguage" aria-label="${html('app.interfaceLanguage')}">
              <option value="en"${state.locale === 'en' ? ' selected' : ''}>EN</option>
              <option value="ru"${state.locale === 'ru' ? ' selected' : ''}>RU</option>
            </select>
            <button class="ml-lens-lang" type="button" data-action="translate" data-i18n="app.translateButton">${html('app.translateButton')}</button>
            <button class="ml-lens-icon-btn" type="button" data-action="collapse" data-i18n-aria-label="app.collapseLabel" aria-label="${html('app.collapseLabel')}">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 8.5h10v3H5z"></path>
              </svg>
            </button>
          </div>
        </header>

        <section class="ml-lens-section">
          <label class="ml-lens-label" for="ml-lens-query" data-i18n="labels.userQuery">${html('labels.userQuery')}</label>
          <input class="ml-lens-input" id="ml-lens-query" type="text" autocomplete="off" />
          <label class="ml-lens-label" for="ml-lens-translated" data-i18n="labels.mercadoQuery">${html('labels.mercadoQuery')}</label>
          <input class="ml-lens-input ml-lens-input--accent" id="ml-lens-translated" type="text" autocomplete="off" />
          <div class="ml-lens-grid ml-lens-search-grid">
            <button class="ml-lens-btn ml-lens-btn--primary" type="button" data-action="search-mercado" data-i18n="actions.searchMercado">${html('actions.searchMercado')}</button>
            <div>
              <label class="ml-lens-label" for="ml-lens-max-pages" data-i18n="labels.maxPages">${html('labels.maxPages')}</label>
              <input class="ml-lens-input" id="ml-lens-max-pages" type="number" min="0" step="1" value="10" />
            </div>
          </div>
        </section>

        <nav class="ml-lens-tabs" aria-label="ML Lens sections">
          <button class="ml-lens-tab is-active" type="button" data-tab="filters" data-i18n="tabs.filters">${html('tabs.filters')}</button>
          <button class="ml-lens-tab" type="button" data-tab="scan" data-i18n="tabs.scan">${html('tabs.scan')}</button>
          <button class="ml-lens-tab" type="button" data-tab="dictionary" data-i18n="tabs.dictionary">${html('tabs.dictionary')}</button>
        </nav>

        <section class="ml-lens-scan-card ml-lens-tab-content-scan ml-lens-tab-content" aria-live="polite">
          <div class="ml-lens-scan-top">
            <strong id="ml-lens-scan-title">${html('scan.readyTitle')}</strong>
            <span class="ml-lens-status is-idle" id="ml-lens-status">${html('status.idle')}</span>
          </div>
          <div class="ml-lens-progress" aria-hidden="true"><span id="ml-lens-progress-fill"></span></div>
          <div class="ml-lens-scan-meta">
            <span id="ml-lens-scan-count">${html('scan.zeroCount')}</span>
            <span id="ml-lens-scan-mode">${html('scan.local')}</span>
          </div>
          <div class="ml-lens-actions">
            <button class="ml-lens-btn ml-lens-btn--primary" type="button" data-action="start" data-i18n="actions.startScan">${html('actions.startScan')}</button>
            <button class="ml-lens-btn" type="button" data-action="stop" data-i18n="actions.stop">${html('actions.stop')}</button>
            <button class="ml-lens-btn ml-lens-btn--danger" type="button" data-action="reset" data-i18n="actions.reset">${html('actions.reset')}</button>
          </div>
          <label class="ml-lens-check">
            <input id="ml-lens-start-current" type="checkbox" />
            <span data-i18n="labels.startFromCurrentPage">${html('labels.startFromCurrentPage')}</span>
          </label>
          <label class="ml-lens-check">
            <input id="ml-lens-use-ml-filters" type="checkbox" checked />
            <span data-i18n="labels.useMercadoLivreFilters">${html('labels.useMercadoLivreFilters')}</span>
          </label>
        </section>

        <section class="ml-lens-section ml-lens-tab-content-filters ml-lens-tab-content">
          <div class="ml-lens-grid">
            <div>
              <label class="ml-lens-label" for="ml-lens-rating" data-i18n="labels.minRating">${html('labels.minRating')}</label>
              <input class="ml-lens-input" id="ml-lens-rating" type="number" min="0" max="5" step="0.1" value="" />
            </div>
            <div>
              <label class="ml-lens-label" for="ml-lens-reviews" data-i18n="labels.minReviews">${html('labels.minReviews')}</label>
              <input class="ml-lens-input" id="ml-lens-reviews" type="number" min="0" step="1" value="" />
            </div>
          </div>
          <label class="ml-lens-label" for="ml-lens-title-terms" data-i18n="labels.titleTerms">${html('labels.titleTerms')}</label>
          <input class="ml-lens-input" id="ml-lens-title-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-description-terms" data-i18n="labels.descriptionTerms">${html('labels.descriptionTerms')}</label>
          <input class="ml-lens-input" id="ml-lens-description-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-review-terms" data-i18n="labels.reviewTerms">${html('labels.reviewTerms')}</label>
          <input class="ml-lens-input" id="ml-lens-review-terms" type="text" value="" />
          <label class="ml-lens-label" for="ml-lens-material-terms" data-i18n="labels.material">${html('labels.material')}</label>
          <input class="ml-lens-input" id="ml-lens-material-terms" type="text" value="" />
          <div class="ml-lens-chip-row" id="ml-lens-material-chips"></div>
          <label class="ml-lens-check">
            <input id="ml-lens-official" type="checkbox" />
            <span data-i18n="labels.officialOnly">${html('labels.officialOnly')}</span>
          </label>
        </section>

        <section class="ml-lens-section ml-lens-tab-content-dictionary ml-lens-tab-content">
          <label class="ml-lens-label" data-i18n="labels.dictionaryMatches">${html('labels.dictionaryMatches')}</label>
          <div id="ml-lens-dictionary-details" class="ml-lens-dict-details">
            <div class="ml-lens-empty" data-i18n="dictionary.ready">${html('dictionary.ready')}</div>
          </div>
        </section>

        <section class="ml-lens-results">
          <div class="ml-lens-results-head">
            <strong data-i18n="results.title">${html('results.title')}</strong>
            <span id="ml-lens-result-summary">${html('results.noData')}</span>
          </div>
          <div class="ml-lens-result-list" id="ml-lens-results"></div>
          <div id="ml-lens-debug-log" style="font-size: 10px; color: var(--ml-muted); margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 8px; border: 1px solid var(--ml-border); white-space: pre-wrap; font-family: monospace; max-height: 120px; overflow-y: auto; display: none;"></div>
        </section>
      </div>
    `;
    document.documentElement.appendChild(root);

    refs.root = root;
    refs.pill = root.querySelector('.ml-lens-pill');
    refs.locale = root.querySelector('#ml-lens-locale');
    refs.translateButton = root.querySelector('[data-action="translate"]');
    refs.query = root.querySelector('#ml-lens-query');
    refs.translated = root.querySelector('#ml-lens-translated');
    refs.maxPages = root.querySelector('#ml-lens-max-pages');
    refs.rating = root.querySelector('#ml-lens-rating');
    refs.reviews = root.querySelector('#ml-lens-reviews');
    refs.titleTerms = root.querySelector('#ml-lens-title-terms');
    refs.descriptionTerms = root.querySelector('#ml-lens-description-terms');
    refs.reviewTerms = root.querySelector('#ml-lens-review-terms');
    refs.materialTerms = root.querySelector('#ml-lens-material-terms');
    refs.materialChips = root.querySelector('#ml-lens-material-chips');
    refs.official = root.querySelector('#ml-lens-official');
    refs.status = root.querySelector('#ml-lens-status');
    refs.scanTitle = root.querySelector('#ml-lens-scan-title');
    refs.scanCount = root.querySelector('#ml-lens-scan-count');
    refs.scanMode = root.querySelector('#ml-lens-scan-mode');
    refs.startFromCurrentPage = root.querySelector('#ml-lens-start-current');
    refs.useMercadoLivreFilters = root.querySelector('#ml-lens-use-ml-filters');
    refs.progressFill = root.querySelector('#ml-lens-progress-fill');
    refs.results = root.querySelector('#ml-lens-results');
    refs.resultSummary = root.querySelector('#ml-lens-result-summary');
    refs.dictionaryDetails = root.querySelector('#ml-lens-dictionary-details');
    refs.debugLog = root.querySelector('#ml-lens-debug-log');
    applyMarketplaceText();

    refs.query.value = getInitialQuery();
    refs.locale.addEventListener('change', handleLocaleChange);
    refs.query.addEventListener('change', updateTranslation);
    refs.translated.addEventListener('change', syncTermsFromTranslatedQuery);
    root.addEventListener('click', handleActionClick);
    root.addEventListener('pointerdown', handleDragPointerDown);
    root.addEventListener('input', (event) => {
      if (event.target.matches('.ml-lens-input, #ml-lens-official, #ml-lens-start-current, #ml-lens-use-ml-filters')) {
        saveScanPreferences();
      }
      if (event.target.matches('.ml-lens-input, #ml-lens-official')) rankCurrentProducts();
    });
  }

  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  function createDefaultPanelState() {
    if (PanelPosition?.createDefaultPanelState) {
      return PanelPosition.createDefaultPanelState(getViewport());
    }
    return {
      mode: 'expanded',
      left: Math.max(24, window.innerWidth - 456),
      top: 24
    };
  }

  function normalizePanelState(nextState) {
    if (PanelPosition?.normalizePanelState) {
      return PanelPosition.normalizePanelState(nextState, getViewport());
    }
    return {
      mode: nextState?.mode === 'collapsed' ? 'collapsed' : 'expanded',
      left: Math.max(8, Number(nextState?.left ?? 24)),
      top: Math.max(8, Number(nextState?.top ?? 24))
    };
  }

  function applyPanelState(nextState, options = {}) {
    if (!refs.root) return;
    const normalized = normalizePanelState(nextState || createDefaultPanelState());
    state.panelState = normalized;
    refs.root.classList.toggle('is-collapsed', normalized.mode === 'collapsed');
    refs.root.style.left = `${normalized.left}px`;
    refs.root.style.top = `${normalized.top}px`;
    refs.root.style.right = 'auto';
    refs.root.style.bottom = 'auto';
    refs.root.dataset.mlLensMode = normalized.mode;
    refs.root.setAttribute('aria-expanded', normalized.mode === 'expanded' ? 'true' : 'false');
    if (options.persist !== false) savePanelState();
  }

  function loadPanelState() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get(PANEL_STORAGE_KEY, (items) => {
        resolve(items?.[PANEL_STORAGE_KEY] || null);
      });
    });
  }

  function savePanelState() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !state.panelState) return;
    chrome.storage.local.set({ [PANEL_STORAGE_KEY]: state.panelState });
  }

  function loadActiveTab() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get(ACTIVE_TAB_STORAGE_KEY, (items) => {
        resolve(items?.[ACTIVE_TAB_STORAGE_KEY] || null);
      });
    });
  }

  function saveActiveTab(tabName) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.set({ [ACTIVE_TAB_STORAGE_KEY]: tabName });
  }

  function loadInterfaceLocale() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(normalizeLocale(null));
        return;
      }
      chrome.storage.local.get(INTERFACE_LOCALE_STORAGE_KEY, (items) => {
        resolve(normalizeLocale(items?.[INTERFACE_LOCALE_STORAGE_KEY]));
      });
    });
  }

  function saveInterfaceLocale(locale) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.set({ [INTERFACE_LOCALE_STORAGE_KEY]: normalizeLocale(locale) });
  }

  function loadSearchSession() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get(SEARCH_SESSION_STORAGE_KEY, (items) => {
        resolve(items?.[SEARCH_SESSION_STORAGE_KEY] || null);
      });
    });
  }

  function saveSearchSession() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !state.searchSession) return;
    chrome.storage.local.set({ [SEARCH_SESSION_STORAGE_KEY]: state.searchSession });
  }

  function normalizeScanPreferences(value) {
    const hasMercadoLivreFilterPreference = Object.prototype.hasOwnProperty.call(value ?? {}, 'useMercadoLivreFilters');
    const preferencesVersion = Number(value?.preferencesVersion || 0);
    return ScanPreferences?.normalizeScanPreferences
      ? ScanPreferences.normalizeScanPreferences(value)
      : {
          filters: {
            minRating: String(value?.filters?.minRating ?? ''),
            minReviews: String(value?.filters?.minReviews ?? ''),
            titleTerms: String(value?.filters?.titleTerms ?? ''),
            descriptionTerms: String(value?.filters?.descriptionTerms ?? ''),
            reviewTerms: String(value?.filters?.reviewTerms ?? ''),
            materialTerms: String(value?.filters?.materialTerms ?? ''),
            officialOnly: Boolean(value?.filters?.officialOnly)
          },
          startFromCurrentPage: Boolean(value?.startFromCurrentPage),
          useMercadoLivreFilters: hasMercadoLivreFilterPreference && preferencesVersion >= SCAN_PREFERENCES_VERSION
            ? Boolean(value.useMercadoLivreFilters)
            : true
        };
  }

  function readScanPreferences() {
    return {
      ...normalizeScanPreferences({
        filters: {
          minRating: refs.rating.value,
          minReviews: refs.reviews.value,
          titleTerms: refs.titleTerms.value,
          descriptionTerms: refs.descriptionTerms.value,
          reviewTerms: refs.reviewTerms.value,
          materialTerms: refs.materialTerms.value,
          officialOnly: refs.official.checked
        },
        startFromCurrentPage: Boolean(refs.startFromCurrentPage?.checked),
        useMercadoLivreFilters: Boolean(refs.useMercadoLivreFilters?.checked)
      }),
      preferencesVersion: SCAN_PREFERENCES_VERSION
    };
  }

  function applyScanPreferences(preferences) {
    const normalized = normalizeScanPreferences(preferences);
    refs.rating.value = normalized.filters.minRating;
    refs.reviews.value = normalized.filters.minReviews;
    refs.titleTerms.value = normalized.filters.titleTerms;
    refs.descriptionTerms.value = normalized.filters.descriptionTerms;
    refs.reviewTerms.value = normalized.filters.reviewTerms;
    refs.materialTerms.value = normalized.filters.materialTerms;
    refs.official.checked = normalized.filters.officialOnly;
    if (refs.startFromCurrentPage) refs.startFromCurrentPage.checked = normalized.startFromCurrentPage;
    if (refs.useMercadoLivreFilters) refs.useMercadoLivreFilters.checked = normalized.useMercadoLivreFilters;
  }

  function loadScanPreferences() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get(SCAN_PREFERENCES_STORAGE_KEY, (items) => {
        resolve(items?.[SCAN_PREFERENCES_STORAGE_KEY] || null);
      });
    });
  }

  function saveScanPreferences() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.set({ [SCAN_PREFERENCES_STORAGE_KEY]: readScanPreferences() });
  }

  async function initScanPreferences() {
    const savedPreferences = await loadScanPreferences();
    if (savedPreferences) {
      applyScanPreferences(savedPreferences);
    }
    if (refs.startFromCurrentPage) {
      refs.startFromCurrentPage.checked = Boolean(state.searchSession?.active && state.searchSession.startFromCurrentPage);
    }
    if (refs.useMercadoLivreFilters && state.searchSession?.active) {
      refs.useMercadoLivreFilters.checked = Boolean(state.searchSession.useMercadoLivreFilters);
    }
  }

  function loadPendingFocusProduct() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get(PENDING_FOCUS_STORAGE_KEY, (items) => {
        resolve(items?.[PENDING_FOCUS_STORAGE_KEY] || null);
      });
    });
  }

  function savePendingFocusProduct(product) {
    if (typeof chrome === 'undefined' || !chrome.storage?.local || !product?.url) return Promise.resolve();
    return new Promise((resolve) => {
      chrome.storage.local.set({
        [PENDING_FOCUS_STORAGE_KEY]: {
          url: product.url,
          title: product.title || '',
          sourcePageUrl: product.sourcePageUrl || '',
          createdAt: Date.now()
        }
      }, resolve);
    });
  }

  function clearPendingFocusProduct() {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    chrome.storage.local.remove(PENDING_FOCUS_STORAGE_KEY);
  }

  async function initSearchSession() {
    state.searchSession = await loadSearchSession();
    if (!state.searchSession) return;
    refs.query.value = state.searchSession.sourceQuery || refs.query.value;
    refs.translated.value = state.searchSession.translatedQuery || refs.translated.value;
    refs.maxPages.value = String(state.searchSession.maxPages ?? refs.maxPages.value);
    refs.scanMode.textContent = t('scan.pages', { count: state.searchSession.pagesScanned || 0 });
  }

  async function initPanelPlacement() {
    const savedState = await loadPanelState();
    applyPanelState(savedState || createDefaultPanelState(), { persist: false });
    window.addEventListener('resize', () => {
      applyPanelState(state.panelState || createDefaultPanelState());
    });
  }

  function setPanelMode(mode) {
    const current = state.panelState || createDefaultPanelState();
    applyPanelState({
      ...current,
      mode
    });
  }

  function handleDragPointerDown(event) {
    const handle = event.target.closest('[data-ml-lens-drag-handle]');
    if (!handle || !refs.root?.contains(handle)) return;
    const isPill = Boolean(event.target.closest('.ml-lens-pill'));
    if (!isPill && event.target.closest('button, input, textarea, select, a')) return;

    const rect = refs.root.getBoundingClientRect();
    state.drag = {
      pointerId: event.pointerId,
      offset: {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      },
      startX: event.clientX,
      startY: event.clientY,
      startedOnPill: isPill,
      moved: false
    };
    refs.root.classList.add('is-dragging');
    try {
      refs.root.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail in some embedded page states; window listeners still handle drag.
    }
    window.addEventListener('pointermove', handleDragPointerMove);
    window.addEventListener('pointerup', handleDragPointerUp, { once: true });
  }

  function handleDragPointerMove(event) {
    if (!state.drag) return;
    const isDrag = PanelPosition?.isDragMovement
      ? PanelPosition.isDragMovement(
          { clientX: state.drag.startX, clientY: state.drag.startY },
          event
        )
      : Math.hypot(event.clientX - state.drag.startX, event.clientY - state.drag.startY) >= 8;
    if (isDrag) state.drag.moved = true;
    if (!state.drag.moved) return;
    event.preventDefault();

    const nextState = PanelPosition?.positionFromPointer
      ? PanelPosition.positionFromPointer(
          event,
          state.drag.offset,
          state.panelState || createDefaultPanelState(),
          getViewport()
        )
      : {
          ...(state.panelState || createDefaultPanelState()),
          left: event.clientX - state.drag.offset.x,
          top: event.clientY - state.drag.offset.y
        };
    applyPanelState(nextState, { persist: false });
  }

  function handleDragPointerUp() {
    if (!state.drag) return;
    if (state.drag.moved) {
      state.suppressNextClick = true;
      window.setTimeout(() => {
        state.suppressNextClick = false;
      }, 0);
      savePanelState();
    } else if (state.drag.startedOnPill && state.panelState?.mode === 'collapsed') {
      setPanelMode('expanded');
    }
    refs.root.classList.remove('is-dragging');
    window.removeEventListener('pointermove', handleDragPointerMove);
    state.drag = null;
  }

  async function updateTranslation(options = {}) {
    const syncFilters = options.syncFilters !== false;
    const query = refs.query.value.trim();
    if (!query) return;

    setStatus('loading', 'status.dictionary');
    try {
      state.translated = await sendMessage('ML_LENS_TRANSLATE', {
        query,
        targetLanguage: getCurrentTargetLanguage(),
        pageUrl: window.location.href
      });
      refs.translated.value = state.translated.translatedQuery;
      if (syncFilters) syncTermsFromTranslatedQuery();
      renderMaterialChips();
      renderDictionaryDetails();
      setStatus(state.scanning ? 'running' : 'idle', state.scanning ? 'status.running' : 'status.ready');
    } catch (error) {
      setStatus('error', 'status.dictionaryError');
      setScanTitleText(error.message);
    }
  }

  async function ensureTranslatedQuery(options = {}) {
    if (!refs.translated.value.trim() && refs.query.value.trim()) {
      await updateTranslation(options);
    }
    return refs.translated.value.trim() || state.translated?.translatedQuery || refs.query.value.trim();
  }

  async function searchMercadoLivre() {
    if (!SearchSession) {
      setScanTitle('scan.sessionHelperMissing');
      setStatus('error', 'status.sessionError');
      return;
    }
    const translatedQuery = await ensureTranslatedQuery({ syncFilters: false });
    if (!translatedQuery) return;

    state.searchSession = SearchSession.createSearchSession({
      sourceQuery: refs.query.value.trim(),
      translatedQuery,
      maxPages: refs.maxPages.value
    });
    setActiveTab('scan');
    saveScanPreferences();
    saveSearchSession();
    window.location.assign(state.searchSession.searchUrl);
  }

  function syncTermsFromTranslatedQuery() {
    const translatedTerms = parseTerms(refs.translated.value);
    if (translatedTerms.length) {
      refs.titleTerms.value = translatedTerms.slice(0, 5).join(', ');
    }

    const materialTargetMap = getCurrentMaterialTargets();
    const materialTargets = (state.translated?.materials || [])
      .map((material) => materialTargetMap[material] || material)
      .filter(Boolean);
    if (materialTargets.length) {
      refs.materialTerms.value = materialTargets.join(', ');
    }
    saveScanPreferences();
    rankCurrentProducts();
  }

  function renderMaterialChips() {
    refs.materialChips.replaceChildren();
    const materials = state.translated?.materials?.length ? state.translated.materials : [];
    for (const material of materials) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ml-lens-chip';
      chip.textContent = `${material} → ${MATERIAL_TARGETS[material] || material}`;
      chip.addEventListener('click', () => {
        refs.materialTerms.value = MATERIAL_TARGETS[material] || material;
        saveScanPreferences();
        rankCurrentProducts();
      });
      refs.materialChips.appendChild(chip);
    }
  }

  function readFilters() {
    return {
      minRating: Number(refs.rating.value || 0),
      minReviews: Number(refs.reviews.value || 0),
      titleTerms: parseTerms(refs.titleTerms.value),
      descriptionTerms: parseTerms(refs.descriptionTerms.value),
      reviewTerms: parseTerms(refs.reviewTerms.value),
      materialTerms: parseTerms(refs.materialTerms.value),
      officialOnly: refs.official.checked
    };
  }

  function setStatus(kind, key, params = {}) {
    state.statusKind = kind;
    state.statusKey = key;
    state.statusParams = params;
    refs.status.className = `ml-lens-status is-${kind}`;
    refs.status.textContent = t(key, params);
  }

  function setScanTitle(key, params = {}) {
    state.scanTitleKey = key;
    state.scanTitleParams = params;
    refs.scanTitle.textContent = t(key, params);
  }

  function setScanTitleText(text) {
    state.scanTitleKey = '';
    state.scanTitleParams = {};
    refs.scanTitle.textContent = text;
  }

  function applyLocalizedStaticText() {
    if (!refs.root) return;
    for (const node of refs.root.querySelectorAll('[data-i18n]')) {
      node.textContent = t(node.dataset.i18n);
    }
    for (const node of refs.root.querySelectorAll('[data-i18n-aria-label]')) {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
    }
    if (refs.locale) refs.locale.value = state.locale;
    if (state.statusKey) setStatus(state.statusKind, state.statusKey, state.statusParams);
    if (state.scanTitleKey) setScanTitle(state.scanTitleKey, state.scanTitleParams);
    if (state.searchSession) {
      refs.scanMode.textContent = t('scan.pages', { count: state.searchSession.pagesScanned || 0 });
    } else if (refs.scanMode.textContent) {
      refs.scanMode.textContent = t('scan.local');
    }
    applyMarketplaceText();
  }

  function handleLocaleChange(event) {
    state.locale = normalizeLocale(event.target.value);
    saveInterfaceLocale(state.locale);
    applyLocalizedStaticText();
    renderDictionaryDetails();
    renderResults();
  }

  function handleActionClick(event) {
    const tabButton = event.target.closest('.ml-lens-tab');
    if (tabButton) {
      const tabName = tabButton.dataset.tab;
      if (tabName) {
        setActiveTab(tabName);
        return;
      }
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (state.suppressNextClick) {
      event.preventDefault();
      state.suppressNextClick = false;
      return;
    }
    if (action === 'translate') updateTranslation();
    if (action === 'search-mercado') searchMercadoLivre();
    if (action === 'collapse') setPanelMode('collapsed');
    if (action === 'expand') setPanelMode('expanded');
    if (action === 'start') startScan();
    if (action === 'stop') stopScan();
    if (action === 'reset') resetPage();
  }

  function setActiveTab(tabName, options = {}) {
    if (!refs.root) return;
    const normalizedTabName = PanelTabs?.normalizeActiveTab
      ? PanelTabs.normalizeActiveTab(tabName)
      : ['filters', 'scan', 'dictionary'].includes(tabName) ? tabName : 'filters';
    refs.root.setAttribute('data-active-tab', normalizedTabName);
    
    const tabs = refs.root.querySelectorAll('.ml-lens-tab');
    for (const tab of tabs) {
      tab.classList.toggle('is-active', tab.dataset.tab === normalizedTabName);
    }
    if (options.persist !== false) saveActiveTab(normalizedTabName);
  }

  function renderDictionaryDetails() {
    if (!refs.dictionaryDetails) return;
    refs.dictionaryDetails.replaceChildren();

    const matched = state.translated?.matchedEntries || [];
    const unmatched = state.translated?.unmatchedTerms || [];

    if (!matched.length && !unmatched.length) {
      const empty = document.createElement('div');
      empty.className = 'ml-lens-empty';
      empty.textContent = t('dictionary.noTranslationResults');
      refs.dictionaryDetails.appendChild(empty);
      return;
    }

    if (matched.length) {
      for (const entry of matched) {
        const item = document.createElement('div');
        item.className = 'ml-lens-dict-entry';
        
        const sourceSpan = document.createElement('strong');
        sourceSpan.textContent = entry.source;
        
        const arrow = document.createTextNode(' → ');
        
        const targetSpan = document.createElement('span');
        targetSpan.textContent = entry.targets.join(', ');
        
        const category = document.createElement('small');
        category.style.display = 'block';
        category.style.color = 'var(--ml-muted)';
        category.style.marginTop = '4px';
        category.textContent = t('dictionary.category', {
          category: entry.category || t('dictionary.generalCategory')
        });

        item.append(sourceSpan, arrow, targetSpan, category);
        refs.dictionaryDetails.appendChild(item);
      }
    }

    if (unmatched.length) {
      const unmatchedDiv = document.createElement('div');
      unmatchedDiv.className = 'ml-lens-dict-unmatched';
      unmatchedDiv.textContent = t('dictionary.unmatched', { terms: unmatched.join(', ') });
      refs.dictionaryDetails.appendChild(unmatchedDiv);
    }
  }

  function findCards() {
    const seen = new Set();
    const cards = [];
    for (const selector of CARD_SELECTORS) {
      for (const node of document.querySelectorAll(selector)) {
        if (!(node instanceof HTMLElement) || seen.has(node)) continue;
        if (!node.querySelector('a[href]')) continue;
        if (!node.innerText || node.innerText.length < 20) continue;
        seen.add(node);
        cards.push(node);
      }
    }
    return cards;
  }

  function extractProductsFromPage() {
    const cards = findCards();
    state.cardMap.clear();
    state.products = cards.map((card, index) => {
      const id = card.dataset.mlLensId || `ml-lens-${Date.now()}-${index}`;
      card.dataset.mlLensId = id;
      state.cardMap.set(id, card);
      return extractProductFromCard(card, index, id);
    });
    return state.products;
  }

  function extractProductFromCard(card, index, id) {
    const titleNode = card.querySelector('.ui-search-item__title, h2, a[title], [class*="title"]');
    const link = card.querySelector('a[href*="/MLB-"], a[href*="/p/"], a[href]');
    const rawText = card.innerText || '';
    const title = titleNode?.textContent?.trim() || link?.getAttribute('title') || rawText.split('\n').find(Boolean) || 'Mercado Livre item';
    return {
      id,
      index,
      title,
      url: link?.href || '',
      sourcePageUrl: window.location.href,
      price: extractPrice(rawText),
      rating: extractRating(rawText),
      reviewCount: extractReviewCount(rawText),
      description: rawText,
      reviewText: '',
      materials: detectMaterials(rawText),
      seller: {
        official: /loja oficial|tienda oficial|official store/i.test(rawText),
        reputation: /mercadoLider|mercado líder|lider|green|verde/i.test(rawText) ? 'green' : ''
      }
    };
  }

  function extractPrice(text) {
    const match = text.match(/R\$\s?[\d.,]+/);
    return match?.[0] || '';
  }

  function extractRating(text) {
    if (ProductData?.extractRating) return ProductData.extractRating(text);
    const match = normalizeText(text).match(/\b([1-5])(?:[,.](\d))?\b(?=\s*(estrelas|avalia|opin|reviews|coment))/i);
    if (!match) return 0;
    return Number(`${match[1]}.${match[2] || '0'}`);
  }

  function extractReviewCount(text) {
    const normalized = normalizeText(text);
    const match = normalized.match(/\b(\d{1,6})\s+(avaliacoes|avaliacao|opinioes|opiniao|reviews|comentarios)\b/);
    return match ? Number(match[1]) : 0;
  }

  function detectMaterials(text) {
    const normalized = normalizeText(text);
    const found = [];
    for (const [material, aliases] of MATERIAL_ALIASES) {
      if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
        found.push(material);
      }
    }
    return found;
  }

  function normalizeUrlForCompare(url) {
    try {
      const parsed = new URL(String(url || ''));
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return String(url || '');
    }
  }

  function shouldNavigateToSessionStart(session) {
    if (!session?.searchUrl || session.startFromCurrentPage) return false;
    return normalizeUrlForCompare(window.location.href) !== normalizeUrlForCompare(session.searchUrl);
  }

  async function startScan() {
    setActiveTab('scan');
    if (state.scanning) return;
    const startsFreshSession = !state.searchSession || !state.searchSession.active;
    if (startsFreshSession) {
      resetFreshScanArtifacts();
      if (SearchSession) {
        const translatedQuery = await ensureTranslatedQuery({ syncFilters: false });
        if (translatedQuery) {
          state.searchSession = SearchSession.createSearchSession({
            sourceQuery: refs.query.value.trim(),
            translatedQuery,
            maxPages: Number(refs.maxPages.value || 10),
            currentPageUrl: window.location.href,
            startFromCurrentPage: Boolean(refs.startFromCurrentPage?.checked),
            useMercadoLivreFilters: Boolean(refs.useMercadoLivreFilters?.checked)
          });
          saveScanPreferences();
          saveSearchSession();
          if (shouldNavigateToSessionStart(state.searchSession)) {
            setStatus('running', 'status.running');
            setScanTitle('scan.openingFirstPage');
            window.location.assign(state.searchSession.searchUrl);
            return;
          }
        }
      }
    }
    const token = state.scanToken + 1;
    state.scanToken = token;
    state.scanning = true;
    state.scannedCount = 0;
    setStatus('running', 'status.running');
    setScanTitle('scan.deepRunning');

    const shouldTranslateForScan = ScanStrategy?.shouldTranslateBeforeScan
      ? ScanStrategy.shouldTranslateBeforeScan({
          translatedState: state.translated,
          query: refs.query.value,
          translatedQuery: refs.translated.value
        })
      : Boolean(!state.translated && refs.query.value.trim() && !refs.translated.value.trim());
    if (shouldTranslateForScan) {
      await updateTranslation({ syncFilters: false });
    }

    extractProductsFromPage();
    if (SearchSession && (!state.searchSession || !state.searchSession.active)) {
      state.searchSession = SearchSession.createSearchSession({
        sourceQuery: refs.query.value.trim(),
        translatedQuery: refs.translated.value.trim() || refs.query.value.trim(),
        maxPages: Number(refs.maxPages.value || 10),
        currentPageUrl: window.location.href,
        startFromCurrentPage: Boolean(refs.startFromCurrentPage?.checked),
        useMercadoLivreFilters: Boolean(refs.useMercadoLivreFilters?.checked)
      });
      saveScanPreferences();
      saveSearchSession();
      logDebug("created new session:", state.searchSession);
    } else if (state.searchSession) {
      logDebug("using existing active session:", state.searchSession);
    }
    if (state.searchSession && SearchSession) {
      state.searchSession = SearchSession.mergeSessionProducts(state.searchSession, state.products);
      saveSearchSession();
    }

    const detailPlan = ScanStrategy?.createDetailScanPlan
      ? ScanStrategy.createDetailScanPlan(state.products, readFilters())
      : {
          products: state.products.filter((product) => product.url),
          shouldFetchDetails: state.products.some((product) => product.url),
          batchSize: 3,
          batchDelayMs: 150
        };
    state.scannedCount = Math.max(0, state.products.length - detailPlan.products.length);
    await rankCurrentProducts();

    for (let i = 0; i < detailPlan.products.length; i += detailPlan.batchSize) {
      if (!state.scanning || state.scanToken !== token) break;

      const batch = detailPlan.products.slice(i, i + detailPlan.batchSize);
      const fetches = batch.map(async (product) => {
        try {
          const result = await sendMessage('ML_LENS_FETCH_HTML', { url: product.url });
          const detail = parseProductDetailHtml(result.html);
          Object.assign(product, {
            description: [product.description, detail.description].filter(Boolean).join(' '),
            reviewText: detail.reviewText,
            rating: detail.rating || product.rating,
            reviewCount: detail.reviewCount || product.reviewCount,
            materials: [...new Set([...(product.materials || []), ...detail.materials])]
          });
        } catch (error) {
          product.scanError = error.message;
        }
        state.scannedCount += 1;
      });

      await Promise.all(fetches);

      if (state.searchSession && SearchSession) {
        state.searchSession = SearchSession.mergeSessionProducts(state.searchSession, batch);
        saveSearchSession();
      }
      renderResults();
      if (detailPlan.batchDelayMs > 0 && i + detailPlan.batchSize < detailPlan.products.length) {
        await delay(detailPlan.batchDelayMs);
      }
    }

    if (detailPlan.shouldFetchDetails && state.scanning && state.scanToken === token) {
      state.scannedCount = state.products.length;
      await rankCurrentProducts();
    }

    if (state.scanToken === token) {
      const transitioning = await finishPageScanAndMaybeContinue({ rankBeforeContinue: false });
      if (!transitioning) {
        state.scanning = false;
        setStatus('idle', 'status.stopped');
        setScanTitle('scan.stoppedSaved');
        refs.scanMode.textContent = t('scan.local');
      }
    }
  }

  function stopScan() {
    state.scanning = false;
    state.scanToken += 1;
    if (state.searchSession && SearchSession) {
      state.searchSession = SearchSession.stopSearchSession(state.searchSession);
      saveSearchSession();
    }
    setStatus('idle', 'status.stopped');
    setScanTitle('scan.stoppedByUser');
  }

  async function finishPageScanAndMaybeContinue(options = {}) {
    if (!state.searchSession?.active || !SearchSession) {
      logDebug("search session not active or helper not loaded");
      return false;
    }
    state.searchSession = SearchSession.markPageScanned(state.searchSession, window.location.href);
    state.searchSession = SearchSession.mergeSessionProducts(state.searchSession, state.products);
    saveSearchSession();
    if (options.rankBeforeContinue !== false) await rankCurrentProducts();

    logDebug("pagesScanned =", state.searchSession.pagesScanned, "maxPages =", state.searchSession.maxPages);

    if (state.searchSession.maxPages > 0 && state.searchSession.pagesScanned >= state.searchSession.maxPages) {
      logDebug("reached max pages limit, stopping");
      state.searchSession = SearchSession.stopSearchSession(state.searchSession);
      saveSearchSession();
      return false;
    }

    const nextPageUrl = findNextPageUrl();
    if (nextPageUrl) {
      logDebug("navigating via URL:", nextPageUrl);
      setScanTitle('scan.openingPage', { page: state.searchSession.pagesScanned + 1 });
      await delay(500);
      window.location.assign(nextPageUrl);
      return true;
    }

    const nextBtn = findNextPageElement();
    if (nextBtn) {
      logDebug("clicking next page button (SPA navigation)");
      setScanTitle('scan.openingPage', { page: state.searchSession.pagesScanned + 1 });
      saveSearchSession();
      const previousUrl = window.location.href;
      await delay(500);
      nextBtn.click();
      logDebug("clicked, waiting for SPA page change...");

      const changed = await waitForSpaPageChange(previousUrl);
      if (!changed) {
        logDebug("SPA page did not change after click, stopping");
        state.searchSession = SearchSession.stopSearchSession(state.searchSession);
        saveSearchSession();
        return false;
      }
      logDebug("SPA navigated to:", window.location.href);

      state.scanning = false;
      state.products = [];
      state.cardMap = new Map();
      state.ranked = [];
      startScan();
      return true;
    }

    logDebug("no next page mechanism found, stopping");
    state.searchSession = SearchSession.stopSearchSession(state.searchSession);
    saveSearchSession();
    return false;
  }

  function findNextPageUrl() {
    const selectors = [
      '.andes-pagination__button--next a',
      'a.andes-pagination__link[rel="next"]',
      'a[data-andes-pagination-control="next"]',
      '.andes-pagination a[title*="siguiente" i]',
      '.andes-pagination a[title*="seguinte" i]',
      '.andes-pagination a[href*="_Desde_"]'
    ];
    const currentUrl = window.location.href;
    for (const selector of selectors) {
      const links = document.querySelectorAll(selector);
      for (const link of links) {
        if (!link?.href || link.href === currentUrl || link.href === '' || link.href.endsWith('#')) continue;
        if (!isSearchResultsUrl(link.href)) {
          logDebug("findNextPageUrl: skipping non-search URL", link.href);
          continue;
        }
        logDebug("findNextPageUrl: matched", selector, "->", link.href);
        return link.href;
      }
    }
    return '';
  }

  function isSearchResultsUrl(url) {
    try {
      const parsed = new URL(url);
      const marketplace = SearchSession?.getMercadoMarketplaceFromUrl?.(url);
      if (!marketplace) return false;
      return parsed.hostname === marketplace.searchHost ||
             (parsed.hostname.endsWith(`.${marketplace.rootDomain}`) &&
               (parsed.pathname.startsWith('/lista') || parsed.pathname.startsWith('/listado')));
    } catch {
      return false;
    }
  }

  function findNextPageElement() {
    const selectors = [
      '.andes-pagination__button--next:not(.andes-pagination__button--disabled) a',
      'a[data-andes-pagination-control="next"]:not([data-andes-state="disabled"])'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        logDebug("findNextPageElement: found via", selector);
        return el;
      }
    }
    logDebug("findNextPageElement: no clickable next button found");
    return null;
  }

  function waitForSpaPageChange(previousUrl) {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (result) => {
        if (resolved) return;
        resolved = true;
        clearInterval(urlCheck);
        clearTimeout(timeout);
        if (result) {
          waitForNewCards().then(() => resolve(true));
        } else {
          resolve(false);
        }
      };
      const urlCheck = setInterval(() => {
        if (window.location.href !== previousUrl) done(true);
      }, 150);
      const timeout = setTimeout(() => done(false), 12000);
    });
  }

  function waitForNewCards() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30;
      const check = setInterval(() => {
        attempts++;
        const cards = document.querySelectorAll('li.ui-search-layout__item, .ui-search-result');
        logDebug("waiting for cards... attempt", attempts, "found", cards.length);
        if (cards.length > 0 || attempts >= maxAttempts) {
          clearInterval(check);
          setTimeout(resolve, 500);
        }
      }, 300);
    });
  }

  function parseProductDetailHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const description = [
      doc.querySelector('meta[name="description"]')?.getAttribute('content'),
      doc.querySelector('.ui-pdp-description__content')?.textContent,
      doc.querySelector('[data-testid="content"]')?.textContent
    ].filter(Boolean).join(' ');
    const reviewText = Array.from(doc.querySelectorAll('[class*="review"], [class*="comment"], [data-testid*="review"]'))
      .slice(0, 30)
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    const bodyText = doc.body?.innerText || '';
    return {
      description,
      reviewText,
      rating: extractRating(html) || extractRating(`${description} ${reviewText} ${bodyText}`),
      reviewCount: extractReviewCount(`${description} ${reviewText} ${bodyText}`),
      materials: detectMaterials(`${description} ${reviewText} ${bodyText}`)
    };
  }

  async function rankCurrentProducts() {
    if (!state.products.length) extractProductsFromPage();
    if (!state.products.length && !state.searchSession?.products?.length) {
      renderResults();
      return;
    }

    try {
      const productsToRank = state.searchSession?.products?.length ? state.searchSession.products : state.products;
      state.ranked = await sendMessage('ML_LENS_RANK_PRODUCTS', {
        products: productsToRank,
        filters: readFilters()
      });
      state.matchedCount = state.ranked.filter((item) => item.match?.matches).length;
      renderResults();
    } catch (error) {
      setScanTitleText(error.message);
      setStatus('error', 'status.rankError');
    }
  }

  function renderResults() {
    refs.results.replaceChildren();
    refs.scanCount.textContent = t('scan.count', {
      products: state.products.length,
      matches: state.matchedCount
    });
    refs.resultSummary.textContent = state.ranked.length
      ? t('results.summary', { matches: state.matchedCount, ranked: state.ranked.length })
      : t('results.noData');
    const totalProducts = state.searchSession?.products?.length || state.products.length;
    const pageCount = state.searchSession?.pagesScanned || 0;
    refs.scanCount.textContent = t('scan.count', {
      products: totalProducts,
      matches: state.matchedCount
    });
    if (state.searchSession) refs.scanMode.textContent = t('scan.pages', { count: pageCount });
    const progress = state.products.length ? state.scannedCount / state.products.length : 0;
    refs.progressFill.style.width = `${Math.round(progress * 100)}%`;

    const displayResults = ResultSelection?.selectDisplayResults
      ? ResultSelection.selectDisplayResults(state.ranked)
      : state.ranked.filter((item) => item.match?.matches);

    if (!state.ranked.length) {
      const empty = document.createElement('div');
      empty.className = 'ml-lens-empty';
      empty.textContent = t('results.openSearchAndStart');
      refs.results.appendChild(empty);
      return;
    }

    if (!displayResults.length) {
      const empty = document.createElement('div');
      empty.className = 'ml-lens-empty';
      empty.textContent = t('results.noStrictMatches');
      refs.results.appendChild(empty);
      return;
    }

    for (const item of displayResults) {
      const row = document.createElement('div');
      row.className = `ml-lens-result ${item.match?.matches ? 'is-match' : 'is-partial'}`;

      const score = document.createElement('span');
      score.className = 'ml-lens-result-score';
      score.textContent = String(item.score);

      const body = document.createElement('span');
      body.className = 'ml-lens-result-body';
      const title = document.createElement('strong');
      title.textContent = item.product.title;
      const meta = document.createElement('small');
      meta.textContent = `${item.product.price || t('results.priceNA')} · ${item.reasons.slice(0, 3).join(' · ') || t('results.partialData')}`;
      body.append(title, meta);

      const actions = document.createElement('span');
      actions.className = 'ml-lens-result-actions';

      const highlightButton = document.createElement('button');
      highlightButton.type = 'button';
      highlightButton.className = 'ml-lens-result-action';
      highlightButton.textContent = t('actions.highlightResult');
      highlightButton.addEventListener('click', () => highlightResultProduct(item.product));

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'ml-lens-result-action ml-lens-result-action--primary';
      openButton.textContent = t('actions.openProduct');
      openButton.addEventListener('click', () => openProductPage(item.product));

      actions.append(highlightButton, openButton);
      row.append(score, body, actions);
      refs.results.appendChild(row);
    }
  }

  function focusProductCard(card) {
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.add('ml-lens-card-focus');
    window.setTimeout(() => card.classList.remove('ml-lens-card-focus'), 1200);
  }

  function findCardByProductUrl(productUrl) {
    const target = ResultSelection?.canonicalUrl ? ResultSelection.canonicalUrl(productUrl) : String(productUrl || '');
    if (!target) return null;
    for (const card of state.cardMap.values()) {
      const link = card.querySelector('a[href*="/MLB-"], a[href*="/p/"], a[href]');
      const current = ResultSelection?.canonicalUrl ? ResultSelection.canonicalUrl(link?.href) : String(link?.href || '');
      if (current && current === target) return card;
    }
    return null;
  }

  function scrollToProduct(id) {
    focusProductCard(state.cardMap.get(id));
  }

  async function highlightResultProduct(product) {
    const card = state.cardMap.get(product?.id) || findCardByProductUrl(product?.url);
    if (card) {
      focusProductCard(card);
      return;
    }

    const navigation = ResultSelection?.resolveResultAction
      ? ResultSelection.resolveResultAction(product, 'highlight', window.location.href)
      : ResultSelection?.resolveResultNavigation
        ? ResultSelection.resolveResultNavigation(product, window.location.href)
        : { type: product?.url ? 'product-page' : 'none', url: product?.url || '' };

    if (navigation.type === 'source-page' && navigation.url) {
      await savePendingFocusProduct(product);
      window.location.assign(navigation.url);
      return;
    }

    if (navigation.type === 'product-page' && product?.url) {
      window.location.assign(product.url);
    }
  }

  function openProductPage(product) {
    const navigation = ResultSelection?.resolveResultAction
      ? ResultSelection.resolveResultAction(product, 'open-product', window.location.href)
      : { type: product?.url ? 'product-page' : 'none', url: product?.url || '' };

    if (navigation.type === 'product-page' && navigation.url) {
      window.location.assign(navigation.url);
    }
  }

  async function focusPendingProduct() {
    const pending = await loadPendingFocusProduct();
    if (!pending?.url) return;

    const card = findCardByProductUrl(pending.url);
    if (card) {
      focusProductCard(card);
      clearPendingFocusProduct();
      return;
    }

    const isStale = Date.now() - Number(pending.createdAt || 0) > 10 * 60 * 1000;
    if (isStale) clearPendingFocusProduct();
  }

  function clearPageMarks() {
    for (const card of state.cardMap.values()) {
      card.classList.remove('ml-lens-card-focus');
    }
  }

  function resetFreshScanArtifacts() {
    clearPageMarks();
    if (ScanState?.resetForFreshScan) {
      ScanState.resetForFreshScan(state);
    } else {
      state.products = [];
      state.ranked = [];
      state.scannedCount = 0;
      state.matchedCount = 0;
      state.searchSession = null;
      state.cardMap.clear();
    }
    refs.progressFill.style.width = '0%';
    refs.scanMode.textContent = t('scan.local');
    renderResults();
  }

  function resetPage() {
    stopScan();
    clearPageMarks();
    state.searchSession = null;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.remove(SEARCH_SESSION_STORAGE_KEY);
    }
    refs.progressFill.style.width = '0%';
    refs.scanMode.textContent = t('scan.local');
    setScanTitle('scan.readyTitle');
    setStatus('idle', 'status.idle');
  }

  function logDebug(...args) {
    if (!window.__ML_LENS_DEBUG__) return;
    const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    console.log("ML Lens debug:", text);
    if (refs.debugLog) {
      refs.debugLog.style.display = 'block';
      refs.debugLog.textContent += text + "\n";
      refs.debugLog.scrollTop = refs.debugLog.scrollHeight;
    }
  }

  async function init() {
    if (!document.body) return;
    state.locale = await loadInterfaceLocale();
    createPanel();
    await initPanelPlacement();
    await initSearchSession();
    const savedActiveTab = await loadActiveTab();
    const initialActiveTab = PanelTabs?.chooseInitialActiveTab
      ? PanelTabs.chooseInitialActiveTab({
          savedTab: savedActiveTab,
          searchSession: state.searchSession
        })
      : state.searchSession?.active ? 'scan' : savedActiveTab || 'filters';
    setActiveTab(initialActiveTab, { persist: false });
    renderMaterialChips();
    extractProductsFromPage();
    await focusPendingProduct();
    if (refs.query.value.trim() && !refs.translated.value.trim()) {
      await updateTranslation();
    }
    await initScanPreferences();
    rankCurrentProducts();
    if (state.searchSession?.active) startScan();
  }

  init();
})();
