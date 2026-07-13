const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/\p{Script=Latin}+/gu, (segment) => segment.normalize('NFKD').replace(/\p{Diacritic}/gu, ''))
    .toLowerCase()
    .match(WORD_PATTERN)
    ?.join(' ') ?? '';
}

export function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
}

export function createDictionaryIndex(packageData) {
  const entries = Array.isArray(packageData?.entries) ? packageData.entries : [];
  const normalizedEntries = entries
    .map((entry) => {
      const source = normalizeText(entry.source);
      const words = tokenize(entry.source);
      return {
        ...entry,
        source,
        sourceWords: words,
        targets: Array.isArray(entry.targets) ? entry.targets.map(normalizeText).filter(Boolean) : [],
        tags: Array.isArray(entry.tags) ? entry.tags : []
      };
    })
    .filter((entry) => entry.source && entry.targets.length > 0);

  const bySource = new Map();
  let maxPhraseWords = 1;
  for (const entry of normalizedEntries) {
    bySource.set(entry.source, entry);
    maxPhraseWords = Math.max(maxPhraseWords, entry.sourceWords.length);
  }

  return {
    id: packageData?.meta?.id ?? 'local',
    targetLanguage: packageData?.meta?.targetLanguage ?? 'pt-BR',
    entries: normalizedEntries,
    bySource,
    maxPhraseWords
  };
}

export function createDictionaryIndexes(packageDataList, defaultTargetLanguage = 'pt-BR') {
  const byTargetLanguage = new Map();
  const packages = Array.isArray(packageDataList) ? packageDataList : [];

  for (const packageData of packages) {
    const index = createDictionaryIndex(packageData);
    if (!byTargetLanguage.has(index.targetLanguage)) {
      byTargetLanguage.set(index.targetLanguage, index);
    }
  }

  const fallback = byTargetLanguage.get(defaultTargetLanguage) ?? byTargetLanguage.values().next().value ?? null;
  return {
    defaultTargetLanguage: fallback?.targetLanguage ?? defaultTargetLanguage,
    availableTargetLanguages: [...byTargetLanguage.keys()],
    byTargetLanguage,
    fallback
  };
}

export function selectDictionaryIndex(dictionaryIndexes, targetLanguage) {
  if (dictionaryIndexes?.byTargetLanguage instanceof Map) {
    return dictionaryIndexes.byTargetLanguage.get(targetLanguage) ?? dictionaryIndexes.fallback;
  }
  return dictionaryIndexes ?? null;
}

export function translateQuery(query, dictionaryIndex) {
  const tokens = tokenize(query);
  const translated = [];
  const matchedEntries = [];
  const unmatchedTerms = [];
  const materials = new Set();
  const maxPhraseWords = Math.max(1, dictionaryIndex?.maxPhraseWords ?? 1);

  let cursor = 0;
  while (cursor < tokens.length) {
    let match = null;
    let matchLength = 0;

    for (let length = Math.min(maxPhraseWords, tokens.length - cursor); length > 0; length -= 1) {
      const phrase = tokens.slice(cursor, cursor + length).join(' ');
      const entry = dictionaryIndex?.bySource?.get(phrase);
      if (entry) {
        match = entry;
        matchLength = length;
        break;
      }
    }

    if (match) {
      translated.push(match.targets[0]);
      matchedEntries.push(match);
      for (const tag of match.tags) {
        if (tag.startsWith('material:')) {
          materials.add(tag.slice('material:'.length));
        }
      }
      cursor += matchLength;
      continue;
    }

    translated.push(tokens[cursor]);
    unmatchedTerms.push(tokens[cursor]);
    cursor += 1;
  }

  return {
    sourceQuery: String(query ?? ''),
    translatedQuery: translated.join(' ').trim(),
    targetLanguage: dictionaryIndex?.targetLanguage ?? 'pt-BR',
    matchedEntries,
    unmatchedTerms,
    materials: [...materials]
  };
}
