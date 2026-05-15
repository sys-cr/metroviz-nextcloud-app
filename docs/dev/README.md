# Developer Documentation — MetroViz-NC

> Audience: developers, maintainers, contributors.
> Language: English.

**Upstream relationship.** MetroViz-NC is the **Nextcloud-native
successor** to [rstockm/Metroviz](https://github.com/rstockm/Metroviz).
The MetroViz SPA core lives unmodified under
[`js/metroviz/`](../../js/metroviz/) — keeping it pristine is a hard
constraint so we can pull upstream improvements forward cheaply.
Everything around it (storage adapter, NC theming, file-viewer
registration, dialog wrappers) belongs to this repo.

If you find a bug in the core rendering / data model / Markdown
export, **please open it upstream first** — we'll pull the fix in.
NC-specific issues (storage, sharing, theming, the OCA\Viewer flow)
belong here.

---

## TL;DR

MetroViz-NC is a Nextcloud app (PHP delivery layer + JS SPA) that
stores `.metro` roadmap files in the user's Nextcloud Files via
WebDAV. It wraps upstream MetroViz with:

- `nc-storage.js` replacing `localStorage`
- NC-CSS theme variables (`--color-primary`, `--color-main-background`, …)
- `OC.dialogs.*` + `OC.Notification` for native NC modals / toasts
- An OCA\Viewer handler so a double-click on `.metro` in Files opens
  the viewer fullscreen

No own database. No CDN dependencies. No analytics. All assets
self-hosted in `js/vendor/`.

---

## Quick start

```bash
# In the Nextcloud server's apps directory:
git clone <repo> apps/metroviz
cd apps/metroviz
npm install

# In Nextcloud:
occ app:enable metroviz
```

The app registers itself as a top navigation entry (`#app-metroviz`) and as a file-viewer route at `/index.php/apps/metroviz/viewer`.

---

## Stack

| Layer | Technology | Where |
|---|---|---|
| Delivery | PHP 8.1, Nextcloud App Framework, **`OCP\`** only | `lib/Controller/PageController.php` |
| Template | Plain PHP + Alpine.js bindings | `templates/viewer.php` |
| State | Alpine.js 3.13 + Alpine `$store` | `js/metroviz/app.js` |
| Render | D3.js v7 (SVG metro map) | `js/metroviz/metro-renderer.js` |
| Storage | WebDAV via `fetch()` (PROPFIND, MKCOL, PUT, GET, DELETE) | `js/nc-storage.js` |
| Dialogs | `OC.dialogs.*` (alert/info/confirm/prompt/filepicker) | `js/nc-dialogs.js` |
| Toasts | `OC.Notification.showTemporary` | inline in callers |
| i18n | i18next 23 with inline resources | `js/metroviz/utils.js` + `PageController.php` |
| Markdown | marked 12 + DOMPurify 3 | `js/metroviz/markdown-export.js` |
| Compression | lz-string 1.5 | `js/metroviz/url-state.js` |
| PDF export | jspdf 4.2 + svg2pdf.js 2.7 | `js/metroviz/pdf-export.js` |

All vendor JS is mirrored into `js/vendor/` and pinned in `package.json`. There are no `<script src="https://…">` references anywhere.

---

## Architecture

```
Browser
  ↓ HTTP
PageController::viewer()           ← thin delivery layer; CSP override + i18n/example JSON injection
  ↓ TemplateResponse
templates/viewer.php               ← markup + Alpine bindings
  ↓ ES modules
js/metroviz/app.js                 ← Alpine bootstrap; metrovizApp() factory
  ↓ uses
js/nc-storage.js                   ← THE ONLY MODULE that talks to WebDAV
  ↓ HTTP (PUT/GET/DELETE)
Nextcloud WebDAV API               ← /remote.php/dav/files/<user>/MetroViz/...
```

**Layer order, strictly:** Delivery → Service (`nc-storage.js`, `nc-autosave.js`, `nc-dialogs.js`) → Domain (`js/metroviz/*` — data model, renderer, file-manager) → Infrastructure (WebDAV, `OC.*`).

`PageController` does *no* business logic. It:

1. Validates the Nextcloud session (`@NoAdminRequired` implies "any logged-in user").
2. Reads the locale and example JSON files server-side and injects them as `window.METROVIZ_I18N_RESOURCES` / `window.METROVIZ_EXAMPLE_JSON` globals.
3. Applies a per-route CSP override allowing `unsafe-eval` so Alpine.js can evaluate its directives.
4. Returns the `viewer.php` template.

Everything else is in the SPA.

---

## Project layout

```
metroviz-nc/
├── appinfo/
│   ├── info.xml               # App manifest, NC version constraints, navigation entry
│   └── routes.php             # GET /viewer → PageController::viewer()
├── lib/
│   ├── AppInfo/Application.php          # IBootstrap registration
│   └── Controller/PageController.php    # Thin delivery layer (~120 LoC)
├── templates/
│   └── viewer.php             # Single-page template; Alpine root #metroviz-app
├── js/
│   ├── metroviz/              # MetroViz Core fork — minimal edits
│   │   ├── app.js             # Alpine factory metrovizApp()
│   │   ├── data-model.js      # Schema + validateAndNormalize
│   │   ├── metro-renderer.js  # D3 SVG render
│   │   ├── file-manager.js    # Open / Save / Import / Export
│   │   ├── markdown-export.js
│   │   ├── pdf-export.js
│   │   ├── url-state.js       # ?data= compression
│   │   └── utils.js           # i18n init + escapeHtml + sanitizeHtml
│   ├── nc-storage.js          # WebDAV adapter — sole HTTP gateway
│   ├── nc-autosave.js         # Debounced auto-save (2 s)
│   ├── nc-dialogs.js          # OC.dialogs.* Promise wrappers
│   ├── data/example.json      # First-run demo roadmap
│   └── vendor/                # Self-hosted minified deps (no CDN)
├── css/
│   ├── metroviz.css           # Upstream — kept clean for upstream PRs
│   └── nc-overrides.css       # NC-CSS variables, layout overrides, dark mode, HC
├── img/
│   └── metroviz-app.svg       # White SVG for NC topbar
├── l10n/                      # NC-native PHP translations
├── locales/                   # i18next JSON resources (de, en)
│   ├── de/translation.json
│   └── en/translation.json
├── docs/                      # This documentation tree
├── .htaccess                  # no-cache headers for .js/.mjs/.css/.svg
├── package.json               # Pinned vendor versions
└── README.md
```

---

## Critical conventions

### 1. `nc-storage.js` is the only WebDAV client

Domain modules MUST NOT call `fetch()` against `/remote.php/dav/...` directly. They go through `loadFile`, `saveFile`, `loadIndex`, `deleteFile`, `ensureDir`.

### 2. Every state-changing request sends `OC.requestToken` + `X-Requested-With`

```js
function getHeaders(extra = {}) {
    return {
        'requesttoken': (typeof OC_requesttoken !== 'undefined') ? OC_requesttoken : '',
        'X-Requested-With': 'XMLHttpRequest',
        ...extra,
    };
}
```

The token is rendered into the template by `OCP\Util::callRegister()` and read in JS via the global `OC_requesttoken`. Missing token → NC returns 412.

### 3. Auto-save uses a snapshot diff, not a watch

Alpine `$watch('data', …, { deep: true })` fires on initial load too. `_lastSavedSnapshot` is set after every successful load/save, and the autosave guard short-circuits when the deep-equal snapshot matches the current state. Only user-driven edits cross the diff and trigger a write.

`saveFile({ silent: true })` is the autosave variant — no modal, only the Save-Status-Pill changes from `saving` → `saved`.

### 4. i18n resources are server-injected, not fetched

Nextcloud's bundled `.htaccess` blocks `.json` MIME from app directories. So `i18next-http-backend` cannot fetch `/apps/metroviz/locales/de/translation.json`. Workaround:

```php
// PageController.php
$locales = [
    'de' => json_decode(file_get_contents("$base/locales/de/translation.json"), true),
    'en' => json_decode(file_get_contents("$base/locales/en/translation.json"), true),
];
$response->setParams(['localesJson' => json_encode($locales)]);
```

```html
<!-- viewer.php -->
<script nonce="<?= $_['cspNonce'] ?>">
    window.METROVIZ_I18N_RESOURCES = <?= $_['localesJson'] ?>;
</script>
```

```js
// utils.js — initI18n()
if (typeof window.METROVIZ_I18N_RESOURCES === 'object') {
    await i18next.init({ resources: window.METROVIZ_I18N_RESOURCES, lng: detectedLng, fallbackLng: 'de' });
} else {
    // dev fallback only
    await i18next.use(HttpBackend).init({ backend: { loadPath: '/locales/{{lng}}/translation.json' } });
}
```

The same trick is used for `js/data/example.json` (first-run demo roadmap).

### 5. CSP override is scoped to the viewer route

Alpine.js 3 evaluates every directive via `new Function(...)`. Nextcloud's default CSP forbids `unsafe-eval`. Without an override, *no* Alpine directive evaluates.

```php
// PageController::viewer()
$csp = new ContentSecurityPolicy();
$csp->allowEvalScript(true);
$response->setContentSecurityPolicy($csp);
```

Scope is intentional: only the viewer route loosens CSP. Everything else in NC keeps the strict default. Every HTML sink in the SPA goes through `DOMPurify`; the `x-html` and `D3.html(...)` call-sites are protected via `utils.js::sanitizeHtml`.

### 6. Asset cache-busting is filesystem-driven

Every static asset URL is appended with `?v=<mtime>`:

```php
$mtime = filemtime("$base/js/metroviz/app.js");
echo '<script type="module" src="' . $urlGen->linkTo('metroviz', 'js/metroviz/app.js') . '?v=' . $mtime . '"></script>';
```

Plus a project-local `.htaccess` setting `Cache-Control: no-cache, must-revalidate` for `.js|.mjs|.css|.svg` files.

---

## i18n

- Supported languages: **de** (primary), **en**.
- Strings live in `locales/<lang>/translation.json`, keyed `feature.component.key` (e.g. `editor.tabVisual`).
- PHP strings (template attrs, page title) use `$l->t('…')` from NC's framework.
- Adding a string: edit both `de/translation.json` AND `en/translation.json` in the same commit.
