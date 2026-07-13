import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMercadoMarketplaceFromUrl,
  isAllowedMercadoLivreUrl
} from '../src/shared/mercado-url.js';

test('allows HTTPS Mercado Livre and Mercado Libre hosts', () => {
  assert.equal(isAllowedMercadoLivreUrl('https://www.mercadolivre.com.br/produto/MLB-123'), true);
  assert.equal(isAllowedMercadoLivreUrl('https://mercadolivre.com.br/search?q=cadeira'), true);
  assert.equal(isAllowedMercadoLivreUrl('https://lista.mercadolivre.com.br/cadeira'), true);
  assert.equal(isAllowedMercadoLivreUrl('https://www.mercadolibre.com.mx/p/MLM-123'), true);
  assert.equal(isAllowedMercadoLivreUrl('https://listado.mercadolibre.com.ar/cable-usb'), true);
  assert.equal(isAllowedMercadoLivreUrl('https://www.mercadolibre.cl/notebook'), true);
});

test('blocks lookalike, non-HTTPS, and malformed URLs', () => {
  assert.equal(isAllowedMercadoLivreUrl('http://www.mercadolivre.com.br/produto/MLB-123'), false);
  assert.equal(isAllowedMercadoLivreUrl('https://mercadolivre.com.br.evil.example/produto/MLB-123'), false);
  assert.equal(isAllowedMercadoLivreUrl('https://evilmercadolivre.com.br/produto/MLB-123'), false);
  assert.equal(isAllowedMercadoLivreUrl('https://www.mercadolibre.com/produto/MLB-123'), false);
  assert.equal(isAllowedMercadoLivreUrl('not a url'), false);
});

test('detects marketplace search host and translation target from URL', () => {
  assert.deepEqual(getMercadoMarketplaceFromUrl('https://www.mercadolivre.com.br/p/MLB-123'), {
    rootDomain: 'mercadolivre.com.br',
    searchHost: 'lista.mercadolivre.com.br',
    targetLanguage: 'pt-BR'
  });
  assert.deepEqual(getMercadoMarketplaceFromUrl('https://listado.mercadolibre.com.mx/cable-usb'), {
    rootDomain: 'mercadolibre.com.mx',
    searchHost: 'listado.mercadolibre.com.mx',
    targetLanguage: 'es'
  });
});
