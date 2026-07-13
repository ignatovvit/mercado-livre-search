# ML Lens Edge Add-ons Submission Kit

Prepared: 2026-07-13
Package target: `dist/ml-lens-edge-0.1.0.zip`

## Submission Checklist

- Microsoft Partner Center account is ready.
- Extension ZIP is uploaded.
- Public availability is selected.
- Category is set to `Shopping`.
- Support email is set.
- Privacy policy URL is set.
- Screenshots are uploaded.
- Permission justifications are filled in.
- Review notes are included.

## Store Listing

### Product Name

ML Lens

### Short Description

Advanced Mercado Livre and Mercado Libre search with local RU/EN translation, filters, deep scan, and ranking.

### Full Description

ML Lens adds an advanced search assistant panel to Mercado Livre Brazil and Mercado Libre Spanish-language marketplaces.

It helps shoppers translate Russian or English product queries into the current marketplace language, open marketplace searches, scan result pages, inspect product detail pages, and rank products with practical filters.

Key features:

- Local RU/EN query translation for Mercado Livre Brazil (`pt-BR`) and Mercado Libre Spanish-language marketplaces (`es`).
- Automatic marketplace detection from the current domain.
- Product filters for rating, review count, title terms, description terms, review terms, seller signals, and material.
- Deep scan sessions across result pages with a configurable page limit.
- Local ranking of matched products.
- Collapsible right-side assistant panel with saved panel position and scan preferences.

ML Lens is designed for product research on supported Mercado Livre and Mercado Libre pages. The extension does not inject third-party scripts, does not use analytics, and does not send user data to a developer-operated server.

ML Lens is an independent browser extension and is not affiliated with, endorsed by, or sponsored by Mercado Libre, Mercado Livre, or MercadoLibre, Inc.

### Search Terms

Mercado Livre, Mercado Libre, shopping, search, product research, translation, filters, reviews, Brazil, Latin America

### Category

Shopping

### Support URL

https://github.com/ignatovvit/mercado-livre-search/issues

### Support Email

ignatov.vi@outlook.com

### Website

https://github.com/ignatovvit/mercado-livre-search

### Privacy Policy URL

https://ignatovvit.github.io/mercado-livre-search/privacy-policy/

## Store Assets

### Extension logo

`docs/store/assets/edge-logo-300.png`

Recommended Edge listing logo size: 300 x 300 pixels.

### Small promotional tile

`docs/store/assets/edge-small-promotional-tile-440x280.png`

Edge small promotional tile size: 440 x 280 pixels.

## Permission Justifications

### `storage`

ML Lens uses browser storage to save user preferences locally, including panel position, selected interface language, scan filters, active tab, and scan session state. This keeps the extension usable across page reloads without sending preferences to a server.

### Host permissions for Mercado Livre and Mercado Libre domains

ML Lens runs only on supported Mercado Livre and Mercado Libre marketplace domains. Host permissions are required to inject the assistant panel, read visible listing content, follow marketplace pagination, and fetch product detail HTML from the same marketplace domains when the user starts a deep scan.

### Content scripts

Content scripts render the assistant panel on supported marketplace pages and extract product listing information from the current page so the extension can filter and rank results locally.

### Background service worker

The service worker handles local dictionary translation, product ranking, and user-initiated detail page fetches from supported marketplace domains. It does not execute remote code.

## Privacy Answers

### Single purpose

ML Lens provides advanced search, local query translation, filtering, scanning, and ranking for supported Mercado Livre and Mercado Libre marketplace pages.

### Remote code

No. ML Lens does not load or execute remote JavaScript. Dictionaries and extension scripts are packaged with the extension.

### Data collection

ML Lens processes user-entered search queries, filter settings, marketplace page content, product metadata, and scan session data locally in the browser. The extension does not send this information to a developer-operated server, does not use analytics, and does not sell or share user data.

### Data storage

ML Lens stores preferences and scan session state locally using browser extension storage. Users can delete this data by clearing extension site data or removing the extension.

## Certification Review Notes

ML Lens is a marketplace search assistant for Mercado Livre and Mercado Libre.

The extension activates only on the host patterns declared in `manifest.json`. It uses local packaged dictionaries for RU/EN to marketplace-language query translation. For Brazil (`mercadolivre.com.br`) it targets `pt-BR`; for Spanish-language Mercado Libre domains it targets `es`.

The extension does not include remote code, analytics, ads, tracking, or a developer-operated backend. It stores preferences and scan session state locally in browser storage. Product detail HTML is fetched only from supported marketplace domains as part of a user-initiated scan.

Verification before submission:

- `npm.cmd test`
- `npm.cmd run check`

## Assets Still Needed

- At least one store screenshot showing the ML Lens panel on a supported marketplace page.
