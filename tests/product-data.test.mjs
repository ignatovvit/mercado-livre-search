import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadProductData() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/product-data.js', 'utf8'), context);
  return context.MlLensProductData;
}

test('extracts decimal product rating before review histogram stars', () => {
  const productData = loadProductData();

  assert.equal(
    productData.extractRating('4.8 ★★★★★ (1200) Opiniões do produto 5 estrelas 980 4 estrelas 120'),
    4.8
  );
});

test('extracts rating from structured product metadata', () => {
  const productData = loadProductData();

  assert.equal(
    productData.extractRating('{"@type":"AggregateRating","ratingValue":"4.7","reviewCount":461} 5 estrelas'),
    4.7
  );
});

test('keeps integer star rating as a fallback', () => {
  const productData = loadProductData();

  assert.equal(productData.extractRating('5 estrelas 99 avaliações'), 5);
});
