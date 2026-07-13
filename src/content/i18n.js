(function attachI18n(global) {
  const defaultLocale = 'en';
  const supportedLocales = ['en', 'ru'];

  const messages = {
    en: {
      'app.caption': 'Deep product and review search',
      'app.expand': 'Expand',
      'app.expandLabel': 'Expand ML Lens',
      'app.collapseLabel': 'Collapse panel',
      'app.interfaceLanguage': 'Interface language',
      'app.translateButton': 'RU/EN -> {targetLanguage}',

      'labels.userQuery': 'User query',
      'labels.mercadoQuery': 'Mercado Livre search query',
      'labels.maxPages': 'Max pages',
      'labels.minRating': 'Rating min',
      'labels.minReviews': 'Reviews min',
      'labels.titleTerms': 'Words in title',
      'labels.descriptionTerms': 'Words in description',
      'labels.reviewTerms': 'Words in reviews',
      'labels.material': 'Material',
      'labels.officialOnly': 'Official store only',
      'labels.dictionaryMatches': 'Dictionary matches',
      'labels.startFromCurrentPage': 'Start from current page',
      'labels.useMercadoLivreFilters': 'Use Mercado Livre filters',

      'tabs.filters': 'Filters',
      'tabs.scan': 'Scan',
      'tabs.dictionary': 'Dictionary',

      'actions.searchMercado': 'Search Mercado Livre',
      'actions.startScan': 'Start scan',
      'actions.stop': 'Stop',
      'actions.reset': 'Reset',
      'actions.highlightResult': 'Highlight',
      'actions.openProduct': 'Open',

      'status.idle': 'idle',
      'status.ready': 'ready',
      'status.running': 'running',
      'status.stopped': 'stopped',
      'status.dictionary': 'dictionary',
      'status.dictionaryError': 'dictionary error',
      'status.sessionError': 'session error',
      'status.rankError': 'rank error',

      'scan.readyTitle': 'Ready to scan current search',
      'scan.deepRunning': 'Deep scan running',
      'scan.stoppedSaved': 'Stopped. Results saved locally',
      'scan.stoppedByUser': 'Scan stopped by user',
      'scan.openingPage': 'Opening page {page}',
      'scan.openingFirstPage': 'Opening first page',
      'scan.local': 'local',
      'scan.pages': '{count} pages',
      'scan.count': '{products} products · {matches} matches',
      'scan.zeroCount': '0 products · 0 matches',
      'scan.sessionHelperMissing': 'Search session helper is not loaded',

      'dictionary.ready': 'Dictionary is ready. Enter a search query above.',
      'dictionary.noTranslationResults': 'No translation results.',
      'dictionary.category': 'Category: {category}',
      'dictionary.generalCategory': 'general',
      'dictionary.unmatched': 'Not translated (searched as-is): {terms}',

      'results.title': 'Results',
      'results.noData': 'no data',
      'results.summary': '{matches} matches · {ranked} ranked',
      'results.openSearchAndStart': 'Open a Mercado Livre search page and click Start scan.',
      'results.noStrictMatches': 'No products match the current filters. Lower the minimum rating/reviews or remove strict terms.',
      'results.priceNA': 'price n/a',
      'results.partialData': 'partial data',
      'results.visible': 'visible',
      'results.partial': 'partial'
    },
    ru: {
      'app.caption': 'Глубокий поиск по товарам и отзывам',
      'app.expand': 'Развернуть',
      'app.expandLabel': 'Развернуть ML Lens',
      'app.collapseLabel': 'Свернуть панель',
      'app.interfaceLanguage': 'Язык интерфейса',
      'app.translateButton': 'RU/EN -> {targetLanguage}',

      'labels.userQuery': 'Запрос пользователя',
      'labels.mercadoQuery': 'Поисковый запрос Mercado Livre',
      'labels.maxPages': 'Макс. страниц',
      'labels.minRating': 'Рейтинг min',
      'labels.minReviews': 'Отзывы min',
      'labels.titleTerms': 'Слова в названии',
      'labels.descriptionTerms': 'Слова в описании',
      'labels.reviewTerms': 'Слова в отзывах',
      'labels.material': 'Материал',
      'labels.officialOnly': 'Только official store',
      'labels.dictionaryMatches': 'Совпадения в словаре',
      'labels.startFromCurrentPage': 'Начинать с текущей страницы',
      'labels.useMercadoLivreFilters': 'Использовать фильтры Mercado Livre',

      'tabs.filters': 'Фильтры',
      'tabs.scan': 'Скан',
      'tabs.dictionary': 'Словарь',

      'actions.searchMercado': 'Искать на Mercado Livre',
      'actions.startScan': 'Начать скан',
      'actions.stop': 'Стоп',
      'actions.reset': 'Сброс',
      'actions.highlightResult': 'Подсветить',
      'actions.openProduct': 'Открыть',

      'status.idle': 'ожидание',
      'status.ready': 'готово',
      'status.running': 'скан',
      'status.stopped': 'остановлено',
      'status.dictionary': 'словарь',
      'status.dictionaryError': 'ошибка словаря',
      'status.sessionError': 'ошибка сессии',
      'status.rankError': 'ошибка ранжирования',

      'scan.readyTitle': 'Готово к сканированию текущего поиска',
      'scan.deepRunning': 'Идет глубокий скан',
      'scan.stoppedSaved': 'Остановлено. Результаты сохранены локально',
      'scan.stoppedByUser': 'Скан остановлен пользователем',
      'scan.openingPage': 'Открываем страницу {page}',
      'scan.openingFirstPage': 'Открываем первую страницу',
      'scan.local': 'локально',
      'scan.pages': '{count} стр.',
      'scan.count': '{products} товаров · {matches} совпадений',
      'scan.zeroCount': '0 товаров · 0 совпадений',
      'scan.sessionHelperMissing': 'Модуль поисковой сессии не загружен',

      'dictionary.ready': 'Словарь готов. Введите поисковый запрос выше.',
      'dictionary.noTranslationResults': 'Нет результатов перевода.',
      'dictionary.category': 'Категория: {category}',
      'dictionary.generalCategory': 'общая',
      'dictionary.unmatched': 'Не переведено (поиск как есть): {terms}',

      'results.title': 'Результаты',
      'results.noData': 'нет данных',
      'results.summary': '{matches} совпадений · {ranked} ранжировано',
      'results.openSearchAndStart': 'Откройте страницу поиска Mercado Livre и нажмите Начать скан.',
      'results.noStrictMatches': 'Нет товаров под текущие фильтры. Уменьшите минимальный рейтинг/отзывы или уберите строгие слова.',
      'results.priceNA': 'цена н/д',
      'results.partialData': 'частичные данные',
      'results.visible': 'видимый',
      'results.partial': 'частично'
    }
  };

  function normalizeLocale(locale) {
    return supportedLocales.includes(locale) ? locale : defaultLocale;
  }

  function interpolate(template, params = {}) {
    return String(template).replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  function t(locale, key, params = {}) {
    const normalizedLocale = normalizeLocale(locale);
    const value = messages[normalizedLocale]?.[key] ?? messages[defaultLocale]?.[key] ?? key;
    return interpolate(value, params);
  }

  global.MlLensI18n = {
    defaultLocale,
    supportedLocales,
    normalizeLocale,
    t
  };
})(globalThis);
