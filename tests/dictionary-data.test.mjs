import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createDictionaryIndex, translateQuery } from '../src/shared/dictionary.js';

const dictionaryIndex = JSON.parse(readFileSync('data/dictionaries/dictionary-index.json', 'utf8'));

test('dictionary index points to existing marketplace language packages', () => {
  assert.deepEqual(dictionaryIndex.targetLanguages, ['pt-BR', 'es']);
  assert.ok(dictionaryIndex.packages.length > 1);

  for (const dictionaryPackage of dictionaryIndex.packages) {
    assert.ok(['pt-BR', 'es'].includes(dictionaryPackage.targetLanguage));
    assert.ok(dictionaryPackage.sourceLanguages.includes('ru'));
    assert.ok(dictionaryPackage.sourceLanguages.includes('en'));
    assert.equal(existsSync(resolve('data/dictionaries', dictionaryPackage.path)), true);
  }
});

test('dictionary package entries are searchable and tagged consistently', () => {
  const dictionaryPackage = JSON.parse(readFileSync('data/dictionaries/ru-en_pt-BR_v1.json', 'utf8'));
  const sources = new Set();
  const categories = new Set(dictionaryPackage.meta.categories.map((category) => category.id));

  for (const entry of dictionaryPackage.entries) {
    assert.equal(typeof entry.source, 'string');
    assert.ok(entry.source.length > 0);
    assert.ok(['ru', 'en'].includes(entry.sourceLang));
    assert.ok(Array.isArray(entry.targets));
    assert.ok(entry.targets.length > 0);
    assert.ok(Array.isArray(entry.tags));
    assert.ok(categories.has(entry.category), `unknown category: ${entry.category}`);
    assert.equal(sources.has(`${entry.sourceLang}:${entry.source}`), false, `duplicate source: ${entry.source}`);
    sources.add(`${entry.sourceLang}:${entry.source}`);
  }
});

test('packaged dictionary translates required MVP material terms', () => {
  const dictionaryPackage = JSON.parse(readFileSync('data/dictionaries/ru-en_pt-BR_v1.json', 'utf8'));
  const dictionary = createDictionaryIndex(dictionaryPackage);

  assert.equal(translateQuery('деревянный стул', dictionary).translatedQuery, 'madeira cadeira');
  assert.equal(translateQuery('plastic chair', dictionary).translatedQuery, 'plastico cadeira');
  assert.equal(translateQuery('cotton sofa', dictionary).translatedQuery, 'algodao sofa');
  assert.equal(translateQuery('удлинитель', dictionary).translatedQuery, 'cabo de extensao');
});

test('packaged dictionary translates curtain rod queries', () => {
  const dictionaryPackage = JSON.parse(readFileSync('data/dictionaries/ru-en_pt-BR_v1.json', 'utf8'));
  const dictionary = createDictionaryIndex(dictionaryPackage);

  assert.equal(translateQuery('карниз для штор', dictionary).translatedQuery, 'varao para cortina');
  assert.equal(translateQuery('curtain rod', dictionary).translatedQuery, 'varao para cortina');
});

test('packaged Spanish dictionary translates common Mercado Libre queries', () => {
  const dictionaryPackage = JSON.parse(readFileSync('data/dictionaries/ru-en_es_v1.json', 'utf8'));
  const dictionary = createDictionaryIndex(dictionaryPackage);

  assert.equal(dictionary.targetLanguage, 'es');
  assert.equal(translateQuery('plastic chair', dictionary).translatedQuery, 'plastico silla');
  assert.equal(translateQuery('extension cord', dictionary).translatedQuery, 'cable alargador');
  assert.equal(translateQuery('curtain rod', dictionary).translatedQuery, 'barral para cortina');
});

test('packaged dictionary is categorized and has at least 15000 entries', () => {
  const dictionaryPackage = JSON.parse(readFileSync('data/dictionaries/ru-en_pt-BR_v1.json', 'utf8'));

  assert.ok(dictionaryPackage.meta.categories.length >= 10);
  assert.ok(dictionaryPackage.entries.length >= 15000);
});
