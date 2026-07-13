import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDictionaryIndex,
  createDictionaryIndexes,
  normalizeText,
  selectDictionaryIndex,
  translateQuery
} from '../src/shared/dictionary.js';

const packageData = {
  meta: {
    id: 'ru-en_pt-BR_v1',
    targetLanguage: 'pt-BR'
  },
  entries: [
    {
      source: 'деревянный',
      sourceLang: 'ru',
      targets: ['madeira'],
      tags: ['material:wood']
    },
    {
      source: 'стул',
      sourceLang: 'ru',
      targets: ['cadeira'],
      tags: ['category:chair']
    },
    {
      source: 'мягкое сиденье',
      sourceLang: 'ru',
      targets: ['assento estofado'],
      tags: ['attribute:upholstered']
    },
    {
      source: 'cotton',
      sourceLang: 'en',
      targets: ['algodao'],
      tags: ['material:cotton']
    },
    {
      source: 'comfortable',
      sourceLang: 'en',
      targets: ['confortavel'],
      tags: ['review:comfort']
    }
  ]
};

test('normalizes accents, punctuation, and case without dropping Cyrillic', () => {
  assert.equal(normalizeText('Confortável, ALGODÃO! Дерево'), 'confortavel algodao дерево');
});

test('translates Russian product query into pt-BR with phrase priority', () => {
  const result = translateQuery('деревянный стул с мягкое сиденье', createDictionaryIndex(packageData));

  assert.equal(result.translatedQuery, 'madeira cadeira с assento estofado');
  assert.deepEqual(
    result.matchedEntries.map((entry) => entry.source),
    ['деревянный', 'стул', 'мягкое сиденье']
  );
  assert.deepEqual(result.materials, ['wood']);
  assert.deepEqual(result.unmatchedTerms, ['с']);
});

test('translates English material and review terms into pt-BR', () => {
  const result = translateQuery('comfortable cotton chair', createDictionaryIndex(packageData));

  assert.equal(result.translatedQuery, 'confortavel algodao chair');
  assert.deepEqual(result.materials, ['cotton']);
  assert.deepEqual(result.unmatchedTerms, ['chair']);
});

test('indexes dictionaries by target language and falls back to default', () => {
  const indexes = createDictionaryIndexes([
    packageData,
    {
      meta: {
        id: 'ru-en_es_v1',
        targetLanguage: 'es'
      },
      entries: [
        {
          source: 'chair',
          sourceLang: 'en',
          targets: ['silla'],
          tags: ['category:chair']
        }
      ]
    }
  ]);

  assert.equal(selectDictionaryIndex(indexes, 'es').targetLanguage, 'es');
  assert.equal(selectDictionaryIndex(indexes, 'pt-BR').targetLanguage, 'pt-BR');
  assert.equal(selectDictionaryIndex(indexes, 'fr').targetLanguage, 'pt-BR');
});
