import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadResultSelection() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/result-selection.js', 'utf8'), context);
  return context.MlLensResultSelection;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('selects only strict matches for visible results', () => {
  const selection = loadResultSelection();
  const results = [
    { product: { id: 'partial-a' }, match: { matches: false }, score: 98 },
    { product: { id: 'match-a' }, match: { matches: true }, score: 61 },
    { product: { id: 'partial-b' }, match: { matches: false }, score: 90 },
    { product: { id: 'match-b' }, match: { matches: true }, score: 58 }
  ];

  assert.deepEqual(
    selection.selectDisplayResults(results, { limit: 5 }).map((item) => item.product.id),
    ['match-a', 'match-b']
  );
});

test('selects every strict match by default without a display limit', () => {
  const selection = loadResultSelection();
  const results = Array.from({ length: 12 }, (_, index) => ({
    product: { id: `match-${index + 1}` },
    match: { matches: true },
    score: 100 - index
  }));

  assert.deepEqual(
    selection.selectDisplayResults(results).map((item) => item.product.id),
    results.map((item) => item.product.id)
  );
});

test('sorts visible strict matches by score descending', () => {
  const selection = loadResultSelection();
  const results = [
    { product: { id: 'match-low' }, match: { matches: true }, score: 62 },
    { product: { id: 'partial-high' }, match: { matches: false }, score: 99 },
    { product: { id: 'match-high' }, match: { matches: true }, score: 91 },
    { product: { id: 'match-middle' }, match: { matches: true }, score: 73 }
  ];

  assert.deepEqual(
    selection.selectDisplayResults(results).map((item) => item.product.id),
    ['match-high', 'match-middle', 'match-low']
  );
});

test('resolves result clicks to the source search page before product page fallback', () => {
  const selection = loadResultSelection();
  const currentUrl = 'https://lista.mercadolivre.com.br/cabo-extensor';

  assert.deepEqual(
    plain(selection.resolveResultNavigation(
      {
        url: 'https://www.mercadolivre.com.br/produto-1',
        sourcePageUrl: 'https://lista.mercadolivre.com.br/cabo-extensor_Desde_51'
      },
      currentUrl
    )),
    {
      type: 'source-page',
      url: 'https://lista.mercadolivre.com.br/cabo-extensor_Desde_51'
    }
  );

  assert.deepEqual(
    plain(selection.resolveResultNavigation(
      {
        url: 'https://www.mercadolivre.com.br/produto-1'
      },
      currentUrl
    )),
    {
      type: 'product-page',
      url: 'https://www.mercadolivre.com.br/produto-1'
    }
  );
});

test('resolves result clicks on the same search page as local focus', () => {
  const selection = loadResultSelection();

  assert.deepEqual(
    plain(selection.resolveResultNavigation(
      {
        url: 'https://www.mercadolivre.com.br/produto-1?tracking=true',
        sourcePageUrl: 'https://lista.mercadolivre.com.br/cabo-extensor?sort=price'
      },
      'https://lista.mercadolivre.com.br/cabo-extensor'
    )),
    {
      type: 'current-page',
      url: ''
    }
  );
});

test('resolves separate result actions for highlighting and opening product page', () => {
  const selection = loadResultSelection();
  const product = {
    url: 'https://www.mercadolivre.com.br/produto-1',
    sourcePageUrl: 'https://lista.mercadolivre.com.br/cabo-extensor_Desde_51'
  };

  assert.deepEqual(
    plain(selection.resolveResultAction(product, 'highlight', 'https://lista.mercadolivre.com.br/cabo-extensor')),
    {
      type: 'source-page',
      url: 'https://lista.mercadolivre.com.br/cabo-extensor_Desde_51'
    }
  );
  assert.deepEqual(
    plain(selection.resolveResultAction(product, 'open-product', 'https://lista.mercadolivre.com.br/cabo-extensor')),
    {
      type: 'product-page',
      url: 'https://www.mercadolivre.com.br/produto-1'
    }
  );
});
