import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadSearchSession() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/search-session.js', 'utf8'), context);
  return context.MlLensSearchSession;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('builds Mercado Livre search URL from pt-BR query', () => {
  const session = loadSearchSession();

  assert.equal(
    session.buildMercadoSearchUrl('cabo de extensão 10 metros'),
    'https://lista.mercadolivre.com.br/cabo-de-extensao-10-metros'
  );
});

test('builds Mercado Libre search URL from the current marketplace domain', () => {
  const session = loadSearchSession();

  assert.equal(
    session.buildMercadoSearchUrl('extension cable', 'https://www.mercadolibre.com.mx/'),
    'https://listado.mercadolibre.com.mx/extension-cable'
  );
  assert.equal(
    session.buildMercadoSearchUrl('curtain rod', 'https://www.mercadolibre.cl/'),
    'https://listado.mercadolibre.cl/curtain-rod'
  );
});

test('builds first page URL by removing Mercado Livre pagination suffix', () => {
  const session = loadSearchSession();

  assert.equal(
    session.getFirstPageUrl('https://lista.mercadolivre.com.br/cabo-extensor_Desde_51_NoIndex_True'),
    'https://lista.mercadolivre.com.br/cabo-extensor'
  );
  assert.equal(
    session.getFirstPageUrl('https://lista.mercadolivre.com.br/cabo-extensor'),
    'https://lista.mercadolivre.com.br/cabo-extensor'
  );
});

test('creates active search session with max page limit', () => {
  const session = loadSearchSession();
  const created = session.createSearchSession({
    sourceQuery: 'удлинитель',
    translatedQuery: 'cabo de extensao',
    maxPages: '10'
  });

  assert.equal(created.active, true);
  assert.equal(created.sourceQuery, 'удлинитель');
  assert.equal(created.translatedQuery, 'cabo de extensao');
  assert.equal(created.maxPages, 10);
  assert.equal(created.pagesScanned, 0);
  assert.equal(created.products.length, 0);
  assert.equal(created.searchUrl, 'https://lista.mercadolivre.com.br/cabo-de-extensao');
});

test('creates active search session on current Mercado Libre marketplace', () => {
  const session = loadSearchSession();
  const created = session.createSearchSession({
    sourceQuery: 'extension cord',
    translatedQuery: 'cable extension',
    currentPageUrl: 'https://www.mercadolibre.com.mx/',
    maxPages: '5'
  });

  assert.equal(created.searchUrl, 'https://listado.mercadolibre.com.mx/cable-extension');
  assert.equal(created.firstPageUrl, 'https://listado.mercadolibre.com.mx/cable-extension');
});

test('creates search session from the current page only when requested', () => {
  const session = loadSearchSession();

  const fromFirstPage = session.createSearchSession({
    sourceQuery: 'карниз для штор',
    translatedQuery: 'varao para cortina',
    currentPageUrl: 'https://lista.mercadolivre.com.br/varao-para-cortina_Desde_51_NoIndex_True',
    startFromCurrentPage: false
  });
  const fromCurrentPage = session.createSearchSession({
    sourceQuery: 'карниз для штор',
    translatedQuery: 'varao para cortina',
    currentPageUrl: 'https://lista.mercadolivre.com.br/varao-para-cortina_Desde_51_NoIndex_True',
    startFromCurrentPage: true
  });

  assert.equal(fromFirstPage.searchUrl, 'https://lista.mercadolivre.com.br/varao-para-cortina');
  assert.equal(fromFirstPage.startFromCurrentPage, false);
  assert.equal(fromCurrentPage.searchUrl, 'https://lista.mercadolivre.com.br/varao-para-cortina_Desde_51_NoIndex_True');
  assert.equal(fromCurrentPage.startFromCurrentPage, true);
});

test('creates search session from Mercado Livre filters at first filtered page', () => {
  const session = loadSearchSession();

  const withMercadoFilters = session.createSearchSession({
    sourceQuery: 'ignored when filters are used',
    translatedQuery: 'ignored when filters are used',
    currentPageUrl: 'https://lista.mercadolivre.com.br/varao-para-cortina-marca-x_Desde_51_NoIndex_True',
    useMercadoLivreFilters: true
  });

  assert.equal(
    withMercadoFilters.searchUrl,
    'https://lista.mercadolivre.com.br/varao-para-cortina-marca-x'
  );
  assert.equal(withMercadoFilters.useMercadoLivreFilters, true);
  assert.equal(withMercadoFilters.startFromCurrentPage, false);
});

test('merges session products by URL and preserves newer details', () => {
  const session = loadSearchSession();
  const created = session.createSearchSession({
    sourceQuery: 'удлинитель',
    translatedQuery: 'cabo de extensao'
  });

  const merged = session.mergeSessionProducts(created, [
    { id: 'a', title: 'Filtro de linha', url: 'https://www.mercadolivre.com.br/a', rating: 4.5 },
    { id: 'b', title: 'Extensao tomada', url: 'https://www.mercadolivre.com.br/b' }
  ]);
  const updated = session.mergeSessionProducts(merged, [
    { id: 'a2', title: 'Filtro de linha 10A', url: 'https://www.mercadolivre.com.br/a', reviewText: 'bom' }
  ]);

  assert.equal(updated.products.length, 2);
  assert.equal(updated.products[0].title, 'Filtro de linha 10A');
  assert.equal(updated.products[0].rating, 4.5);
  assert.equal(updated.products[0].reviewText, 'bom');
});

test('marks scanned page once and stops when max pages reached', () => {
  const session = loadSearchSession();
  const created = session.createSearchSession({
    sourceQuery: 'удлинитель',
    translatedQuery: 'cabo de extensao',
    maxPages: 1
  });
  const scanned = session.markPageScanned(created, 'https://lista.mercadolivre.com.br/cabo-de-extensao');
  const repeated = session.markPageScanned(scanned, 'https://lista.mercadolivre.com.br/cabo-de-extensao');

  assert.equal(repeated.pagesScanned, 1);
  assert.equal(
    session.shouldContinueToNextPage(repeated, 'https://lista.mercadolivre.com.br/cabo-de-extensao_Desde_51'),
    false
  );
});

test('continues to next unvisited page while active and under page limit', () => {
  const session = loadSearchSession();
  const created = session.createSearchSession({
    sourceQuery: 'удлинитель',
    translatedQuery: 'cabo de extensao',
    maxPages: 3
  });
  const scanned = session.markPageScanned(created, 'https://lista.mercadolivre.com.br/cabo-de-extensao');

  assert.equal(
    session.shouldContinueToNextPage(scanned, 'https://lista.mercadolivre.com.br/cabo-de-extensao_Desde_51'),
    true
  );
  assert.equal(
    session.shouldContinueToNextPage(scanned, 'https://lista.mercadolivre.com.br/cabo-de-extensao'),
    false
  );
});
