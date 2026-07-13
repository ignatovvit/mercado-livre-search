import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadI18n() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/i18n.js', 'utf8'), context);
  return context.MlLensI18n;
}

test('defaults interface locale to English', () => {
  const i18n = loadI18n();

  assert.equal(i18n.defaultLocale, 'en');
  assert.equal(i18n.normalizeLocale(undefined), 'en');
  assert.equal(i18n.normalizeLocale('de'), 'en');
  assert.equal(i18n.t(undefined, 'tabs.filters'), 'Filters');
});

test('translates interface strings to Russian when selected', () => {
  const i18n = loadI18n();

  assert.equal(i18n.normalizeLocale('ru'), 'ru');
  assert.equal(i18n.t('ru', 'tabs.filters'), 'Фильтры');
  assert.equal(i18n.t('ru', 'scan.openingPage', { page: 4 }), 'Открываем страницу 4');
});

test('falls back to English for missing locale keys', () => {
  const i18n = loadI18n();

  assert.equal(i18n.t('ru', 'missing.key'), 'missing.key');
  assert.equal(i18n.t('bad-locale', 'actions.startScan'), 'Start scan');
});
