import { normalizeText, tokenize } from './dictionary.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseTerms(value) {
  return tokenize(String(value ?? '').replace(/,/g, ' '));
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parsePriceValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '');
  const match = raw.match(/(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)(?:,(\d{1,2}))?/);
  if (!match) return 0;
  const integer = match[1].replace(/[.\s]/g, '');
  const cents = match[2] ? match[2].padEnd(2, '0') : '00';
  const price = Number(`${integer}.${cents}`);
  return Number.isFinite(price) ? price : 0;
}

function normalizeProduct(product) {
  return {
    ...product,
    titleText: normalizeText(product?.title),
    descriptionText: normalizeText(product?.description),
    reviewTextNormalized: normalizeText(product?.reviewText),
    priceValue: parsePriceValue(product?.price),
    ratingValue: asNumber(product?.rating),
    reviewCountValue: asNumber(product?.reviewCount),
    materialValues: Array.isArray(product?.materials) ? product.materials.map(normalizeText).filter(Boolean) : [],
    sellerOfficial: Boolean(product?.seller?.official),
    sellerReputation: normalizeText(product?.seller?.reputation)
  };
}

function allTermsInText(terms, text) {
  if (!terms?.length) return true;
  return terms.every((term) => text.includes(normalizeText(term)));
}

function materialMatches(product, terms) {
  if (!terms?.length) return true;
  const materialText = [
    ...product.materialValues,
    product.titleText,
    product.descriptionText,
    product.reviewTextNormalized
  ].join(' ');
  return terms.every((term) => materialText.includes(normalizeText(term)));
}

function termFraction(terms, text) {
  if (!terms?.length) return 1;
  const matched = terms.filter((term) => text.includes(normalizeText(term))).length;
  return matched / terms.length;
}

export function productMatchesFilters(product, filters = {}) {
  const normalized = normalizeProduct(product);
  const rejections = [];

  if (filters.minRating && normalized.ratingValue < asNumber(filters.minRating)) {
    rejections.push('rating');
  }
  if (filters.minReviews && normalized.reviewCountValue < asNumber(filters.minReviews)) {
    rejections.push('reviewCount');
  }
  if (!allTermsInText(filters.titleTerms, normalized.titleText)) {
    rejections.push('titleTerms');
  }
  if (!allTermsInText(filters.descriptionTerms, normalized.descriptionText)) {
    rejections.push('descriptionTerms');
  }
  if (!allTermsInText(filters.reviewTerms, normalized.reviewTextNormalized)) {
    rejections.push('reviewTerms');
  }
  if (!materialMatches(normalized, filters.materialTerms)) {
    rejections.push('material');
  }
  if (filters.officialOnly && !normalized.sellerOfficial) {
    rejections.push('officialSeller');
  }

  return {
    matches: rejections.length === 0,
    rejections
  };
}

export function scoreProduct(product, filters = {}) {
  const normalized = normalizeProduct(product);
  const match = productMatchesFilters(product, filters);
  const ratingScore = clamp(normalized.ratingValue / 5, 0, 1) * 28;
  const reviewScore = clamp(Math.log10(normalized.reviewCountValue + 1) / Math.log10(10001), 0, 1) * 20;
  const priceScore = normalized.priceValue > 0
    ? clamp(1 - (Math.log10(normalized.priceValue + 1) / Math.log10(10001)), 0, 1) * 12
    : 0;
  const titleScore = termFraction(filters.titleTerms, normalized.titleText) * 16;
  const descriptionScore = termFraction(filters.descriptionTerms, normalized.descriptionText) * 8;
  const reviewTextScore = termFraction(filters.reviewTerms, normalized.reviewTextNormalized) * 10;
  const materialScore = materialMatches(normalized, filters.materialTerms) ? 8 : 0;
  const sellerScore = normalized.sellerOfficial ? 5 : normalized.sellerReputation.includes('green') ? 3 : 0;
  const rejectionPenalty = match.rejections.length * 8;

  const score = Math.round(clamp(
    ratingScore +
      reviewScore +
      priceScore +
      titleScore +
      descriptionScore +
      reviewTextScore +
      materialScore +
      sellerScore -
      rejectionPenalty,
    0,
    100
  ));

  return {
    product,
    score,
    match,
    reasons: buildReasons(normalized, filters, match),
    partial: !match.matches
  };
}

function buildReasons(product, filters, match) {
  const reasons = [];
  if (product.ratingValue) reasons.push(`${product.ratingValue.toFixed(1)} rating`);
  if (product.reviewCountValue) reasons.push(`${product.reviewCountValue} reviews`);
  if (termFraction(filters.titleTerms, product.titleText) === 1 && filters.titleTerms?.length) {
    reasons.push('title terms');
  }
  if (termFraction(filters.reviewTerms, product.reviewTextNormalized) === 1 && filters.reviewTerms?.length) {
    reasons.push('review terms');
  }
  if (materialMatches(product, filters.materialTerms) && filters.materialTerms?.length) {
    reasons.push('material');
  }
  if (product.sellerOfficial) reasons.push('official store');
  if (!match.matches) reasons.push(`missing: ${match.rejections.join(', ')}`);
  return reasons;
}

export function rankProducts(products, filters = {}) {
  return [...(products ?? [])]
    .map((product, index) => ({
      ...scoreProduct(product, filters),
      index
    }))
    .sort((a, b) => {
      if (a.match.matches !== b.match.matches) return a.match.matches ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });
}
