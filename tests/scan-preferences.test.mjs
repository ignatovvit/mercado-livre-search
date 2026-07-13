import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadScanPreferences() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/scan-preferences.js', 'utf8'), context);
  return context.MlLensScanPreferences;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('normalizes persisted scan filters without loosening strict numeric values', () => {
  const preferences = loadScanPreferences();

  assert.deepEqual(
    plain(preferences.normalizeScanPreferences({
      filters: {
        minRating: '4.8',
        minReviews: '2000',
        titleTerms: 'varao cortina',
        descriptionTerms: 'metal',
        reviewTerms: 'resistente',
        materialTerms: 'metal',
        officialOnly: true
      },
      startFromCurrentPage: true,
      useMercadoLivreFilters: true
    })),
    {
      filters: {
        minRating: '4.8',
        minReviews: '2000',
        titleTerms: 'varao cortina',
        descriptionTerms: 'metal',
        reviewTerms: 'resistente',
        materialTerms: 'metal',
        officialOnly: true
      },
      startFromCurrentPage: true,
      useMercadoLivreFilters: true
    }
  );
});

test('defaults navigation flags conservatively', () => {
  const preferences = loadScanPreferences();

  assert.equal(preferences.normalizeScanPreferences(null).startFromCurrentPage, false);
  assert.equal(preferences.normalizeScanPreferences({}).startFromCurrentPage, false);
  assert.equal(preferences.normalizeScanPreferences(null).useMercadoLivreFilters, true);
  assert.equal(preferences.normalizeScanPreferences({}).useMercadoLivreFilters, true);
});

test('migrates legacy Mercado Livre filter default to enabled', () => {
  const preferences = loadScanPreferences();

  assert.equal(preferences.normalizeScanPreferences({ useMercadoLivreFilters: false }).useMercadoLivreFilters, true);
});

test('preserves explicit Mercado Livre filter opt-out after preferences are saved by the current version', () => {
  const preferences = loadScanPreferences();

  assert.equal(
    preferences.normalizeScanPreferences({
      preferencesVersion: preferences.SCAN_PREFERENCES_VERSION,
      useMercadoLivreFilters: false
    }).useMercadoLivreFilters,
    false
  );
});
