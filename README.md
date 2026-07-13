# ML Lens

Chrome MV3 extension MVP for advanced Mercado Livre search.

## What It Does

- Injects an Apple Glass right-side panel on Mercado Livre Brazil and Mercado Libre Spanish-language marketplaces.
- Translates RU/EN queries to the current marketplace language through local packaged dictionaries (`pt-BR` on Brazil, `es` elsewhere).
- Can launch Mercado Livre search automatically from the translated query.
- Scans visible listing cards and can fetch product detail pages through the background worker.
- Can continue a search session across Mercado Livre result pages up to `Max pages`.
- Filters and ranks by rating, review count, title terms, description terms, review terms, seller signals, and material.
- Supports reversible page actions: highlight best, hide weak matches, reorder, and reset.
- Can collapse into a transparent draggable pill and remembers panel position.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this project folder: `C:\Users\admin\Documents\antigravity-pj\mercado-livre-search`.
5. Open a supported marketplace such as `https://www.mercadolivre.com.br/`, `https://www.mercadolibre.com.mx/`, or `https://www.mercadolibre.cl/` and use the `ML Lens` panel.

## Verification

```bash
npm.cmd test
npm.cmd run check
```

PowerShell may block `npm.ps1`; use `npm.cmd` on Windows.

Full regression and manual Chrome QA cases are documented in
`docs/QA_TEST_CASES.md`.

## Dictionary

The extension currently ships with `data/dictionaries/ru-en_pt-BR_v1.json` and `data/dictionaries/ru-en_es_v1.json`.
The format is categorized through `meta.categories` and each entry has a `category`.
The pt-BR package currently contains 5,000+ RU/EN entries generated from common marketplace categories; the Spanish package covers common marketplace terms and falls back to as-is search for unmatched terms.
The format is compatible with a future GitHub Pages/CDN dictionary index, while the MVP stays serverless and uses only packaged data.

Regenerate the packaged dictionary:

```bash
node scripts/generate-dictionary.mjs
```
