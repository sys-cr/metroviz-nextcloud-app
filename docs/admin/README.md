# Operator / Nextcloud Admin Documentation — MetroViz-NC

> Audience: Nextcloud administrators, hosting / DevOps engineers, security reviewers.
> Language: English.

**MetroViz-NC is the Nextcloud-native successor to**
[**rstockm/Metroviz**](https://github.com/rstockm/Metroviz) — the
same metro-map roadmap visualiser, wrapped for Nextcloud Files
storage, NC-native sharing, and OCA\Viewer double-click integration.
The roadmap rendering engine itself is the upstream's, kept
unmodified under `js/metroviz/` so future upstream improvements flow
in cleanly. The Nextcloud-specific layer adds storage, auth, theming,
and the file-viewer registration. Both projects are MIT-licensed.

---

## At a glance

| Item | Value |
|---|---|
| App ID | `metroviz` |
| App name | MetroViz |
| Category | `files` |
| Supported Nextcloud | **28 – 32** (tested on 30) |
| Required PHP | **≥ 8.3** |
| Database tables | **none** (`.metro` files live in user's NC Files) |
| External services | **none** (no CDN, no analytics, no telemetry) |
| Background jobs | **none** |
| Open ports | **none beyond NC's own** |
| User-data location | `Files/MetroViz/*.metro` in each user's home |
| Authentication | 100 % Nextcloud-native session — no custom auth |

If you are running Nextcloud already, this app adds essentially no new operational surface. The only deviations from a vanilla NC are listed under [Security model](#security-model).

---

## Installation

→ Full step-by-step: [`INSTALL.md`](./INSTALL.md).

Short version once the app is on disk under `apps/metroviz/`:

```bash
sudo -u www-data php occ app:enable metroviz
```

That registers the navigation entry, the `.metro` MIME type, and the viewer route at `/index.php/apps/metroviz/viewer`. No database migration runs.

---

## What this app actually does on your server

1. **Serves static assets** from `apps/metroviz/js/` and `apps/metroviz/css/`. Roughly 1.2 MB of vendored JS (Alpine, D3, lz-string, marked, DOMPurify, i18next, jspdf, svg2pdf), no minifier pipeline yet.
2. **Renders one HTML template** (`templates/viewer.php`) on each viewer request — about 30 KB.
3. **Reads two locale JSON files** (`locales/de`, `locales/en`) and one example file (`js/data/example.json`) at request time and inlines them into the page.
4. **Sets a per-route Content Security Policy override** allowing `'unsafe-eval'` for the viewer route only (see [Security model](#security-model)).

That is the entire server-side footprint per request. Everything else happens in the browser, which talks to the regular WebDAV endpoints (`/remote.php/dav/files/<user>/MetroViz/...`) to load and save `.metro` JSON files.

---

## Data & storage

- **Where files live:** each user's own NC home, under `Files/MetroViz/` by default. The folder is created on first use via WebDAV `MKCOL`.
- **What files contain:** plain UTF-8 JSON describing the roadmap (stations, lines, zones, events). Schema is forward-compatible and matches the upstream MetroViz format.
- **File size:** typically a few KB; large roadmaps with hundreds of events may reach a few hundred KB. There is no server-side hard limit beyond the user's NC quota.
- **MIME type:** `application/x-metroviz` (registered by the app on enable; falls back to `application/json` if MIME registry refresh is needed — see [Troubleshooting](#troubleshooting)).
- **Sharing:** uses NC's native sharing — no separate ACL system. If a user shares the folder, the recipient opens `.metro` files in their own MetroViz viewer with their own permissions.

### Backup

Nothing to add to your existing NC backup strategy. `.metro` files are regular files in users' home directories — whatever backs up `data/<user>/files/` backs up MetroViz roadmaps.

### Data minimisation / GDPR

- No PII is logged or written to URLs.
- No analytics or telemetry of any kind.
- GDPR Art. 15 (export) is covered by Nextcloud's own data-export mechanism — `.metro` files are exported as part of the user's Files.
- GDPR Art. 17 (deletion) is covered by NC's account deletion — the files are deleted with the account.

---

## Security model

### Authentication

100 % Nextcloud-native. The viewer route is annotated `@NoAdminRequired` (any logged-in user) and rejects unauthenticated requests at the framework level. All state-changing requests from the browser go to WebDAV with the standard `OC-RequestToken` (`OC.requestToken` in JS). Missing token → NC returns 412. No password is ever entered into the app or transmitted by it.

### Authorization

Per request, on every WebDAV call, NC checks the user's permissions against the target path. The app holds no permission state of its own; if a user lacks read access to a path, WebDAV returns 403 and the app surfaces an NC-style toast.

### CSRF

`OC-RequestToken` on every POST / PUT / DELETE — enforced by NC's middleware, included by `nc-storage.js::getHeaders()` plus `X-Requested-With: XMLHttpRequest`. The viewer route itself is GET-only and annotated `@NoCSRFRequired` (template render).

### Content Security Policy

**This app loosens CSP for its own route.** Specifically, the controller sets:

```php
$csp = new ContentSecurityPolicy();
$csp->allowEvalScript(true);
$response->setContentSecurityPolicy($csp);
```

Reason: Alpine.js 3 evaluates every binding via `new Function(...)`. Without `'unsafe-eval'` *for this route*, the SPA cannot boot at all.

**Scope:** the override applies only to the viewer route. Every other route on your Nextcloud retains the strict default CSP.

**Mitigations in place:**

- Every user-data sink in the SPA passes through DOMPurify.
- The only `x-html` directive in the template is the Markdown export preview — sanitised through DOMPurify.
- All other dynamic content uses Alpine's `x-text`, which the browser auto-escapes.

If your organisation's policy forbids `'unsafe-eval'` even on a single app route, do not enable this app.

### Other headers

`Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options` — all handled by Nextcloud at the platform level. The app does not override them.

### Vendor dependencies

All client-side JS is vendored under `js/vendor/`. Versions pinned in `package.json`, `package-lock.json` committed. No CDN fetches.

| Dependency | Version | Purpose |
|---|---|---|
| alpinejs | 3.13.10 | Reactive UI |
| d3 | 7.9.0 | SVG metro map rendering |
| dompurify | 3.1.6 | XSS sanitisation of HTML sinks |
| i18next + language-detector | 23 / 8 | Translation lookup |
| jspdf | 4.2.1 | PDF export |
| lz-string | 1.5.0 | Share-link compression |
| marked | 12 | Markdown rendering |
| svg2pdf.js | 2.7.0 | SVG → PDF conversion |

### Outbound network

The app makes **zero** outbound requests from the server. Browser-side, it talks only to the same-origin NC WebDAV API.

---

## Performance

Performance characteristics derive from upstream MetroViz and are dominated by client-side D3 rendering. There is no significant server load.

### Per request

- **Page load:** one PHP request returning ~30 KB HTML + cold ~1.2 MB JS / ~30 KB CSS (cached after first load — see [Cache behaviour](#cache-behaviour)).
- **WebDAV PUT (save):** small JSON payload, typically 5–50 KB. Auto-save debounces at 2 s.
- **WebDAV GET (load):** same size, no transform.
- **PROPFIND (file list):** standard NC behaviour.

### Cache behaviour

A project-local `.htaccess` sets `Cache-Control: no-cache, must-revalidate` for `.js`, `.mjs`, `.css`, and `.svg` files under `apps/metroviz/`.

### Hardware sizing

Negligible incremental load over baseline NC. If your NC already handles the user base, MetroViz adds nothing measurable — its hot paths are entirely in the browser.

---

## Monitoring

Use Nextcloud's standard monitoring. There is no app-specific metric to scrape. The app does not emit logs of its own beyond NC's framework-level access log.

If a user reports MetroViz issues, check in this order:

1. NC's own log (`data/nextcloud.log`) for PHP-level errors in the `metroviz` app namespace.
2. Browser DevTools console (where almost all app logic runs).
3. WebDAV request log (Apache / Nginx access log) — look for the user's PUT/GET to `/remote.php/dav/files/<user>/MetroViz/*`.

---

## Upgrade

```bash
# 1. Disable the app (optional but recommended for clean swap)
sudo -u www-data php occ app:disable metroviz

# 2. Replace the apps/metroviz/ directory with the new version
# (rsync, git pull, tarball extraction — your standard NC app-upgrade flow)

# 3. Re-enable
sudo -u www-data php occ app:enable metroviz

# 4. Force MIME-DB refresh in case the registered MIME type changed
sudo -u www-data php occ maintenance:mimetype:update-db
sudo -u www-data php occ files:scan --all
```

No data migration. Users' `.metro` files in NC Files are forward-compatible — the schema is intentionally additive.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Top-bar MetroViz icon is missing | App not enabled or NC nav cache stale | `occ app:list | grep metroviz`, then `occ maintenance:repair` |
| Top-bar icon is black on dark mode | `img/metroviz-app.svg` not refreshed | Hard reload (NC caches SVGs); confirm `img/metroviz-app.svg` is the white version |
| `.metro` files open as raw JSON in Files app | MIME registry not refreshed | `occ maintenance:mimetype:update-db && occ files:scan --all` |
| Viewer shows two empty modals and a "MetroViz" header | CSP override is not being applied (route not hitting `PageController::viewer()`) | Check NC's CSP header on the viewer route with `curl -I -b cookie.txt $URL/apps/metroviz/viewer`; ensure no other CSP-tightening app intercepts |
| Browser console fills with "Alpine Expression Error" | CSP `'unsafe-eval'` blocked | Same as above — verify per-route CSP override; check for upstream proxies adding their own CSP |
| Auto-save silently fails | WebDAV write permission denied | Browser DevTools → Network tab → look for 403 on PUT; check NC file permissions on `Files/MetroViz/` |
| First-time users see an empty viewer | Bootstrap demo roadmap not seeded | Hard reload — example JSON is server-injected; if it's still empty, check `js/data/example.json` is readable by PHP |
| PHP changes in dev not picked up | `opcache.revalidate_freq` | Wait or `php -r 'opcache_reset();'` |

---

## Disabling / uninstalling

```bash
sudo -u www-data php occ app:disable metroviz
# Optionally remove the app directory:
sudo rm -rf apps/metroviz/
```

User data is untouched. `.metro` files remain in users' Nextcloud Files; users can re-open them once the app is re-enabled, or download them via WebDAV / the web UI.

---

## Pointers

- [Installation guide](./INSTALL.md)
- [User documentation (German)](../user/de/README.md)
- [User documentation (English)](../user/en/README.md)
