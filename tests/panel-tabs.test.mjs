import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadPanelTabs() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(readFileSync('src/content/panel-tabs.js', 'utf8'), context);
  return context.MlLensPanelTabs;
}

test('forces scan tab while a search session is still active', () => {
  const tabs = loadPanelTabs();

  assert.equal(
    tabs.chooseInitialActiveTab({
      savedTab: 'filters',
      searchSession: { active: true, pagesScanned: 2 }
    }),
    'scan'
  );

  assert.equal(
    tabs.chooseInitialActiveTab({
      savedTab: 'dictionary',
      searchSession: { active: true, pagesScanned: 0 }
    }),
    'scan'
  );
});

test('restores saved tab only when no active scan is running', () => {
  const tabs = loadPanelTabs();

  assert.equal(
    tabs.chooseInitialActiveTab({
      savedTab: 'dictionary',
      searchSession: { active: false, pagesScanned: 3 }
    }),
    'dictionary'
  );
  assert.equal(tabs.chooseInitialActiveTab({ savedTab: 'bad-tab', searchSession: null }), 'filters');
  assert.equal(tabs.normalizeActiveTab('scan'), 'scan');
  assert.equal(tabs.normalizeActiveTab('bad-tab'), 'filters');
});
