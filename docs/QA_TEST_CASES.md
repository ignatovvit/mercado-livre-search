# ML Lens QA Test Cases

## Automated Regression

Run before every change:

```bash
npm.cmd test
npm.cmd run check
```

### A-001 Dictionary Normalization

**Covers:** accents, punctuation, lowercase, Cyrillic preservation.

**Expected:** `Confortável, ALGODÃO! Дерево` normalizes to `confortavel algodao дерево`.

### A-002 RU Phrase Translation

**Covers:** RU phrase matching, phrase priority, material tag extraction, unmatched tokens.

**Expected:** `деревянный стул с мягкое сиденье` translates to `madeira cadeira с assento estofado`; material is `wood`; unmatched term is `с`.

### A-003 EN Material Translation

**Covers:** EN material/review dictionary entries.

**Expected:** `comfortable cotton chair` translates known terms to `confortavel algodao`, keeps unknown `chair` if not present in the test fixture.

### A-004 Packaged Dictionary Shape

**Covers:** local dictionary index, package path existence, RU/EN source languages, pt-BR target.

**Expected:** every configured package exists and targets `pt-BR`.

### A-005 Packaged MVP Materials

**Covers:** real packaged entries for wood, plastic, cotton, and chair/sofa terms.

**Expected:** required MVP terms translate from RU/EN into pt-BR.

### A-006 Search Term Parsing

**Covers:** comma and whitespace parsing.

**Expected:** `cadeira, madeira estofada` becomes `cadeira`, `madeira`, `estofada`.

### A-007 Filter Rejection Reasons

**Covers:** rating, review count, review terms, material, official seller.

**Expected:** weak product is rejected with all relevant rejection reasons.

### A-008 Product Scoring

**Covers:** title, description, review text, material, seller signals.

**Expected:** strong match scores higher than partial product.

### A-009 Stable Ranking

**Covers:** score sorting and stable fallback order.

**Expected:** products rank `high`, `middle`, `low`.

### A-010 Manifest MV3

**Covers:** Manifest V3, module service worker, storage permission.

**Expected:** manifest declares MV3 and `src/background/service-worker.js` as module worker.

### A-011 Manifest Assets

**Covers:** content script and CSS file references.

**Expected:** every referenced file exists.

### A-012 Host Permissions Scope

**Covers:** least-privilege Mercado Livre host permissions.

**Expected:** host permissions are scoped to `mercadolivre.com.br` Brazil domains only.

### A-013 Background URL Allowlist

**Covers:** allowed HTTPS Mercado Livre hosts.

**Expected:** `https://www.mercadolivre.com.br`, root host, and subdomains are allowed.

### A-014 Background URL Blocking

**Covers:** SSRF/lookalike prevention.

**Expected:** `http`, malformed URLs, `mercadolivre.com.br.evil.example`, and other countries are blocked.

## Manual Chrome QA

### M-001 Load Unpacked Extension

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select `C:\Users\admin\Documents\antigravity-pj\mercado-livre-search`.

**Expected:** Chrome loads `ML Lens` without manifest errors.

### M-002 Panel Injection

1. Open `https://www.mercadolivre.com.br/`.
2. Search for `cadeira madeira estofada`.

**Expected:** right-side `ML Lens` glass panel appears; it does not block native search input; panel text is readable.

### M-002A Collapse And Expand Pill

1. Click the circular collapse button in the `ML Lens` header.
2. Hover the collapsed transparent pill.
3. Click the pill.

**Expected:** panel collapses to a small transparent pill; hover reveals `Развернуть`; click expands the full panel without losing scan/filter state.

### M-002B Drag Panel Position

1. Drag the expanded panel by its header.
2. Collapse the panel.
3. Drag the collapsed pill.
4. Reload the page.

**Expected:** expanded and collapsed states can be moved anywhere within the viewport; the last position and mode persist after reload.

### M-003 RU Query Translation

1. In `Запрос пользователя`, enter `деревянный стул с мягким сиденьем`.
2. Click `RU → pt-BR`.

**Expected:** translated field contains pt-BR terms such as `madeira`, `cadeira`, `estofado`; material chip includes wood/madeira.

### M-003A Automatic Mercado Livre Search

1. In `Запрос пользователя`, enter `удлинитель`.
2. Click `Search Mercado Livre`.

**Expected:** extension translates the query to pt-BR, opens a Mercado Livre results URL such as `lista.mercadolivre.com.br/cabo-de-extensao`, and starts/resumes the scan session.

### M-003B Multi-page Search Session

1. Set `Max pages` to `2`.
2. Click `Search Mercado Livre`.
3. Let the scan finish the first page.

**Expected:** extension saves products from page 1, opens the next result page when available, then shows aggregated product/match counts across scanned pages.

### M-004 EN Query Translation

1. Enter `comfortable cotton sofa`.
2. Click `RU → pt-BR`.

**Expected:** translated field includes `confortavel`, `algodao`, `sofa`.

### M-005 Start And Stop Deep Scan

1. Click `Start scan`.
2. Wait until progress and result counters update.
3. Click `Stop`.

**Expected:** status changes to running, counters update, Stop ends the scan without page reload.

### M-006 Filter Tightening

1. Set `Рейтинг min` to `4.8`.
2. Set `Отзывы min` to `100`.
3. Add material `madeira`.

**Expected:** results update; weak/partial items show lower scores or partial badges.

### M-007 Highlight Best

1. Click `Highlight best`.

**Expected:** best matching Mercado Livre card gets cyan outline; clicking a result scrolls to the matching card.

### M-008 Hide Weak Results

1. Click `Hide`.

**Expected:** weak or rejected cards disappear from the page; result list remains visible in the panel.

### M-009 Reorder Results

1. Click `Reorder`.

**Expected:** visible Mercado Livre cards are reordered by ML Lens score.

### M-010 Reset Page

1. After highlight/hide/reorder, click `Reset`.

**Expected:** hidden cards return, outlines are removed, and the original page order is restored.

### M-011 Detail Fetch Failure Handling

1. Start scan on a page with mixed listing cards.
2. Keep DevTools Network offline or block a product detail request.

**Expected:** scan continues; product with failed detail fetch remains as partial data instead of breaking the panel.

### M-012 Keyboard Focus

1. Use `Tab` through the panel controls.

**Expected:** every input and button has visible focus and can be activated by keyboard.

### M-013 Mobile Width

1. Resize browser below `760px`.

**Expected:** panel moves to bottom layout, stays within viewport, and no horizontal scroll appears.

### M-014 No External Translation API

1. Open DevTools Network.
2. Use translation and scan.

**Expected:** no translation API calls occur; dictionary data loads from extension packaged files only. Product fetches are limited to Mercado Livre URLs.

### M-015 Categorized Dictionary

1. Open `data/dictionaries/ru-en_pt-BR_v1.json`.

**Expected:** `meta.categories` is present and every entry has a valid `category`; package contains at least 5,000 entries.
