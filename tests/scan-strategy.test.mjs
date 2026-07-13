import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadScanStrategy() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/scan-strategy.js', 'utf8'), context);
  return context.MlLensScanStrategy;
}

test('skips product detail requests when listing data satisfies filters', () => {
  const strategy = loadScanStrategy();
  const products = [
    {
      id: 'listing-ready',
      url: 'https://www.mercadolivre.com.br/p/MLB123',
      title: 'Varao para cortina preto',
      description: 'Varao para cortina de metal resistente',
      rating: 4.8,
      reviewCount: 421,
      materials: ['metal']
    }
  ];

  const plan = strategy.createDetailScanPlan(products, {
    minRating: 4.5,
    minReviews: 100,
    titleTerms: ['varao', 'cortina'],
    descriptionTerms: [],
    reviewTerms: [],
    materialTerms: ['metal'],
    officialOnly: false
  });

  assert.equal(plan.shouldFetchDetails, false);
  assert.equal(plan.products.length, 0);
  assert.equal(plan.batchSize, 6);
  assert.equal(plan.batchDelayMs, 0);
});

test('requests details only for products whose active filters need unavailable data', () => {
  const strategy = loadScanStrategy();
  const products = [
    {
      id: 'needs-review',
      url: 'https://www.mercadolivre.com.br/p/MLB1',
      title: 'Cadeira de madeira',
      description: 'Cadeira resistente',
      rating: 4.9,
      reviewCount: 100,
      materials: ['wood']
    },
    {
      id: 'needs-material',
      url: 'https://www.mercadolivre.com.br/p/MLB2',
      title: 'Cadeira para cozinha',
      description: 'Cadeira moderna',
      rating: 4.9,
      reviewCount: 100,
      materials: []
    },
    {
      id: 'already-enriched',
      url: 'https://www.mercadolivre.com.br/p/MLB3',
      title: 'Cadeira madeira confortavel',
      description: 'Cadeira de madeira',
      reviewText: 'muito confortavel',
      rating: 4.9,
      reviewCount: 100,
      materials: ['wood']
    },
    {
      id: 'no-url',
      title: 'Cadeira sem link',
      rating: 4.9,
      reviewCount: 100
    }
  ];

  const plan = strategy.createDetailScanPlan(products, {
    reviewTerms: ['confortavel'],
    materialTerms: ['wood']
  });

  assert.equal(plan.shouldFetchDetails, true);
  assert.deepEqual(plan.products.map((product) => product.id), ['needs-review', 'needs-material']);
});

test('requests details when min rating or reviews are missing from listing data', () => {
  const strategy = loadScanStrategy();
  const products = [
    {
      id: 'missing-numbers',
      url: 'https://www.mercadolivre.com.br/p/MLB4',
      title: 'Varao para cortina',
      description: 'Varao para cortina'
    },
    {
      id: 'has-numbers',
      url: 'https://www.mercadolivre.com.br/p/MLB5',
      title: 'Varao para cortina',
      description: 'Varao para cortina',
      rating: 4.8,
      reviewCount: 50
    }
  ];

  const plan = strategy.createDetailScanPlan(products, {
    minRating: 4,
    minReviews: 20
  });

  assert.deepEqual(plan.products.map((product) => product.id), ['missing-numbers']);
});

test('does not retranslate during scan when Mercado Livre query is already available', () => {
  const strategy = loadScanStrategy();

  assert.equal(
    strategy.shouldTranslateBeforeScan({
      translatedState: null,
      query: 'extension cable adapter',
      translatedQuery: 'cabo de extensao'
    }),
    false
  );
});

test('translates during scan only when user query exists and Mercado Livre query is empty', () => {
  const strategy = loadScanStrategy();

  assert.equal(
    strategy.shouldTranslateBeforeScan({
      translatedState: null,
      query: 'extension cord',
      translatedQuery: ''
    }),
    true
  );
  assert.equal(
    strategy.shouldTranslateBeforeScan({
      translatedState: { translatedQuery: 'extensao' },
      query: 'extension cord',
      translatedQuery: ''
    }),
    false
  );
  assert.equal(
    strategy.shouldTranslateBeforeScan({
      translatedState: null,
      query: '',
      translatedQuery: ''
    }),
    false
  );
});
