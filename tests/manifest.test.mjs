import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));

test('manifest is a Chrome MV3 extension with module service worker', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'ML Lens');
  assert.equal(manifest.background.service_worker, 'src/background/service-worker.js');
  assert.equal(manifest.background.type, 'module');
  assert.ok(manifest.permissions.includes('storage'));
});

test('manifest content script and CSS files exist', () => {
  const contentScript = manifest.content_scripts[0];
  assert.ok(contentScript.matches.includes('https://www.mercadolivre.com.br/*'));
  assert.ok(contentScript.matches.includes('https://*.mercadolivre.com.br/*'));
  assert.ok(contentScript.matches.includes('https://www.mercadolibre.com.mx/*'));
  assert.ok(contentScript.matches.includes('https://*.mercadolibre.com.mx/*'));
  assert.ok(contentScript.matches.includes('https://www.mercadolibre.cl/*'));
  assert.ok(contentScript.matches.includes('https://*.mercadolibre.cl/*'));
  assert.deepEqual(contentScript.js, [
    'src/content/panel-position.js',
    'src/content/panel-tabs.js',
    'src/content/search-session.js',
    'src/content/result-selection.js',
    'src/content/product-data.js',
    'src/content/i18n.js',
    'src/content/scan-state.js',
    'src/content/scan-preferences.js',
    'src/content/scan-strategy.js',
    'src/content/content-script.js'
  ]);

  for (const file of [...contentScript.js, ...contentScript.css, manifest.background.service_worker]) {
    assert.equal(existsSync(resolve(file)), true, `${file} should exist`);
  }
});

test('host permissions stay scoped to Mercado Livre and Mercado Libre marketplaces', () => {
  assert.ok(manifest.host_permissions.includes('https://mercadolivre.com.br/*'));
  assert.ok(manifest.host_permissions.includes('https://*.mercadolivre.com.br/*'));
  assert.ok(manifest.host_permissions.includes('https://mercadolibre.com.mx/*'));
  assert.ok(manifest.host_permissions.includes('https://*.mercadolibre.com.mx/*'));
  assert.ok(manifest.host_permissions.includes('https://mercadolibre.cl/*'));
  assert.ok(manifest.host_permissions.includes('https://*.mercadolibre.cl/*'));
  assert.equal(
    manifest.host_permissions.some((permission) => permission.includes('mercadolibre.com.evil')),
    false
  );
});
