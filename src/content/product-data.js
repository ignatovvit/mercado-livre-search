(function attachProductData(global) {
  function toRatingNumber(value) {
    const number = Number(String(value || '').replace(',', '.'));
    if (!Number.isFinite(number) || number < 0 || number > 5) return 0;
    return Math.round(number * 10) / 10;
  }

  function firstRatingMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const rating = toRatingNumber(match?.[1]);
      if (rating) return rating;
    }
    return 0;
  }

  function extractRating(value) {
    const text = String(value || '');
    if (!text) return 0;

    const structuredRating = firstRatingMatch(text, [
      /"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*"?([1-5](?:[.,]\d)?)"?/i,
      /"@type"\s*:\s*"AggregateRating"[^}]*"ratingValue"\s*:\s*"?([1-5](?:[.,]\d)?)"?/i,
      /(?:ratingValue|rating_value|ratingAverage|rating_average|averageRating|average_rating)["']?\s*[:=]\s*["']?([1-5](?:[.,]\d)?)/i,
      /itemprop=["']ratingValue["'][^>]*(?:content|value)=["']([1-5](?:[.,]\d)?)/i
    ]);
    if (structuredRating) return structuredRating;

    const decimalRating = firstRatingMatch(text, [
      /\b([1-5][.,]\d)\s*(?:[★⭐]+|stars?|estrelas?|rating|de\s*5|\/\s*5)/i,
      /\b([1-5][.,]\d)\s*\(\s*[\d.,]+\s*\)/i,
      /\b([1-5][.,]\d)\s+[\d.,]+\s+(?:avalia(?:coes|ções)|opin(?:ioes|iões)|reviews|comentarios|comentários)\b/i
    ]);
    if (decimalRating) return decimalRating;

    return firstRatingMatch(text, [
      /\b([1-5])\s*(?:[★⭐]+|stars?|rating|de\s*5|\/\s*5)/i,
      /\b([1-5])\s+estrelas?\b/i
    ]);
  }

  global.MlLensProductData = {
    extractRating
  };
})(globalThis);
