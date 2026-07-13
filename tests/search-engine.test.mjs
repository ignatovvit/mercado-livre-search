import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseTerms,
  productMatchesFilters,
  rankProducts,
  scoreProduct
} from '../src/shared/search-engine.js';

test('parses comma and whitespace separated filter terms', () => {
  assert.deepEqual(parseTerms('cadeira, madeira estofada'), ['cadeira', 'madeira', 'estofada']);
});

test('rejects products below rating, review, material, and text filters', () => {
  const product = {
    title: 'Cadeira plastica branca empilhavel',
    description: 'Leve para cozinha',
    reviewText: 'simples',
    rating: 3.9,
    reviewCount: 18,
    materials: ['plastic'],
    seller: { official: false, reputation: 'yellow' }
  };

  const filters = {
    minRating: 4.4,
    minReviews: 80,
    titleTerms: ['cadeira'],
    reviewTerms: ['confortavel'],
    materialTerms: ['wood'],
    officialOnly: true
  };

  const result = productMatchesFilters(product, filters);

  assert.equal(result.matches, false);
  assert.ok(result.rejections.includes('rating'));
  assert.ok(result.rejections.includes('reviewCount'));
  assert.ok(result.rejections.includes('reviewTerms'));
  assert.ok(result.rejections.includes('material'));
  assert.ok(result.rejections.includes('officialSeller'));
});

test('scores a strong match above partial and rejected products', () => {
  const filters = {
    minRating: 4.4,
    minReviews: 80,
    titleTerms: ['cadeira', 'madeira'],
    descriptionTerms: ['estofado'],
    reviewTerms: ['confortavel'],
    materialTerms: ['wood'],
    officialOnly: false
  };

  const best = {
    id: 'best',
    title: 'Cadeira de jantar madeira macica com assento estofado',
    description: 'Cadeira estofado para sala',
    reviewText: 'muito confortavel e resistente',
    rating: 4.8,
    reviewCount: 214,
    materials: ['wood'],
    seller: { official: true, reputation: 'green' }
  };
  const partial = {
    id: 'partial',
    title: 'Cadeira escritorio base cromada',
    description: 'Assento confortavel',
    reviewText: 'boa qualidade',
    rating: 4.3,
    reviewCount: 32,
    materials: ['metal'],
    seller: { official: false, reputation: 'yellow' }
  };

  assert.ok(scoreProduct(best, filters).score > scoreProduct(partial, filters).score);
  assert.equal(scoreProduct(best, filters).match.matches, true);
  assert.equal(scoreProduct(partial, filters).match.matches, false);
});

test('ranks products by score with stable fallback order', () => {
  const products = [
    { id: 'low', title: 'Cadeira plastica', rating: 3.9, reviewCount: 18, materials: ['plastic'] },
    { id: 'high', title: 'Cadeira madeira confortavel', rating: 4.8, reviewCount: 214, materials: ['wood'], reviewText: 'confortavel' },
    { id: 'middle', title: 'Cadeira madeira', rating: 4.6, reviewCount: 90, materials: ['wood'] }
  ];

  const ranked = rankProducts(products, {
    minRating: 4,
    minReviews: 20,
    titleTerms: ['cadeira', 'madeira'],
    reviewTerms: ['confortavel'],
    materialTerms: ['wood']
  });

  assert.deepEqual(ranked.map((item) => item.product.id), ['high', 'middle', 'low']);
});

test('rewards lower price when product quality signals are equal', () => {
  const filters = {
    titleTerms: ['cabo', 'extensor']
  };
  const cheap = {
    id: 'cheap',
    title: 'Cabo extensor flexivel',
    price: 'R$ 42',
    rating: 4.8,
    reviewCount: 1200
  };
  const expensive = {
    id: 'expensive',
    title: 'Cabo extensor flexivel',
    price: 'R$ 420',
    rating: 4.8,
    reviewCount: 1200
  };

  assert.ok(scoreProduct(cheap, filters).score > scoreProduct(expensive, filters).score);
});

test('continues rewarding higher review counts above common listing thresholds', () => {
  const filters = {
    titleTerms: ['cabo', 'extensor']
  };
  const fewerReviews = {
    id: 'fewer-reviews',
    title: 'Cabo extensor flexivel',
    price: 'R$ 42',
    rating: 4.8,
    reviewCount: 1000
  };
  const moreReviews = {
    id: 'more-reviews',
    title: 'Cabo extensor flexivel',
    price: 'R$ 42',
    rating: 4.8,
    reviewCount: 2000
  };

  assert.ok(scoreProduct(moreReviews, filters).score > scoreProduct(fewerReviews, filters).score);
});

test('rewards the combined better value profile', () => {
  const filters = {
    titleTerms: ['cabo', 'extensor']
  };
  const stronger = {
    id: 'stronger',
    title: 'Cabo extensor flexivel',
    price: 'R$ 39',
    rating: 4.9,
    reviewCount: 2400
  };
  const weaker = {
    id: 'weaker',
    title: 'Cabo extensor flexivel',
    price: 'R$ 89',
    rating: 4.7,
    reviewCount: 800
  };

  assert.ok(scoreProduct(stronger, filters).score > scoreProduct(weaker, filters).score);
});

test('ranks strict matches before higher-scoring partial matches', () => {
  const ranked = rankProducts(
    [
      {
        id: 'partial-high-score',
        title: 'Cabo flexivel extensor',
        rating: 5,
        reviewCount: 99,
        seller: { official: true, reputation: 'green' }
      },
      {
        id: 'strict-lower-score',
        title: 'Cabo extensor simples',
        rating: 0,
        reviewCount: 100,
        seller: { official: false, reputation: '' }
      }
    ],
    {
      minReviews: 100
    }
  );

  assert.equal(ranked[0].product.id, 'strict-lower-score');
  assert.equal(ranked[0].match.matches, true);
  assert.equal(ranked[1].product.id, 'partial-high-score');
  assert.equal(ranked[1].match.matches, false);
  assert.ok(ranked[1].score > ranked[0].score);
});
