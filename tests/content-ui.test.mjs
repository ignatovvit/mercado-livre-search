import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/content/content-script.js', 'utf8');

function currentPanelSource() {
  const start = source.indexOf('function createPanel()');
  const end = source.indexOf('function getViewport()', start);
  assert.notEqual(start, -1, 'createPanel should exist');
  assert.notEqual(end, -1, 'getViewport should follow createPanel');
  return source.slice(start, end);
}

test('current panel does not render page mutation action bar', () => {
  const panel = currentPanelSource();

  assert.equal(panel.includes('ml-lens-actionbar'), false);
  assert.equal(panel.includes('data-action="highlight"'), false);
  assert.equal(panel.includes('data-action="hide"'), false);
  assert.equal(panel.includes('data-action="reorder"'), false);
});

test('results rendering does not request a fixed display limit', () => {
  assert.equal(source.includes('selectDisplayResults(state.ranked, { limit'), false);
});

test('translation requests include marketplace language context', () => {
  assert.equal(source.includes('targetLanguage: getCurrentTargetLanguage()'), true);
  assert.equal(source.includes('pageUrl: window.location.href'), true);
});
