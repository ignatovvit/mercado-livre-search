import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadScanState() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/scan-state.js', 'utf8'), context);
  return context.MlLensScanState;
}

test('resets stale scan results before starting a fresh session', () => {
  const scanState = loadScanState();
  const state = {
    products: [{ id: 'old-product' }],
    ranked: [{ product: { id: 'old-product' }, score: 91 }],
    cardMap: new Map([['old-product', {}]]),
    scannedCount: 7,
    matchedCount: 3,
    searchSession: {
      active: false,
      products: [{ id: 'old-product' }]
    },
    translated: { translatedQuery: 'cabo de extensao' }
  };

  const result = scanState.resetForFreshScan(state);

  assert.equal(result, state);
  assert.equal(Array.isArray(state.products), true);
  assert.equal(state.products.length, 0);
  assert.equal(Array.isArray(state.ranked), true);
  assert.equal(state.ranked.length, 0);
  assert.equal(state.cardMap.size, 0);
  assert.equal(state.scannedCount, 0);
  assert.equal(state.matchedCount, 0);
  assert.equal(state.searchSession, null);
  assert.deepEqual(state.translated, { translatedQuery: 'cabo de extensao' });
});
