# MetroViz for Nextcloud

> Visualise technology roadmaps as Metro Maps — stored, shared, and opened
> natively in Nextcloud Files.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Nextcloud 28–32](https://img.shields.io/badge/nextcloud-28--32-blue)
![PHP 8.3+](https://img.shields.io/badge/php-8.3+-blue)
![Based on: rstockm/Metroviz](https://img.shields.io/badge/based%20on-rstockm%2FMetroviz-orange)

---

## Successor project to [rstockm/Metroviz](https://github.com/rstockm/Metroviz)

This is a **Nextcloud-native continuation** of the
[MetroViz roadmap visualiser by Ralf Stockmann](https://github.com/rstockm/Metroviz).

| | rstockm/Metroviz (upstream) | MetroViz-NC (this repo) |
|---|---|---|
| **Storage** | Browser `localStorage` | Nextcloud Files via WebDAV |
| **Sharing** | Compressed-URL share-link | NC native Files-Sidebar (URL fallback) |
| **Open `.metro`** | Drag-drop / file picker | Double-click in NC Files (OCA\Viewer) |
| **Auth** | None | Nextcloud session, server-side enforced |
| **Theming** | Standalone palette | Follows NC's Light / Dark / High-Contrast |
| **Deployment** | Static page | Nextcloud app |

**The MetroViz Core stays the upstream's.** Files under
[`js/metroviz/`](./js/metroviz/) are the upstream SPA, kept as-is so
future improvements over there can be pulled in cleanly. The
Nextcloud-specific layer lives in [`js/nc-*.js`](./js/),
[`lib/`](./lib/), [`templates/viewer.php`](./templates/viewer.php),
and [`css/nc-overrides.css`](./css/nc-overrides.css).

Credit for the visual design, the roadmap-as-metro-map metaphor and
the D3 rendering belongs to Ralf Stockmann. This repo wraps it for
Nextcloud-integrated environments where data lives on the user's NC
instance instead of in the browser.

Both projects are MIT-licensed.

---

<img width="1343" height="949" alt="Bildschirmfoto 2026-05-15 um 17 35 08" src="https://github.com/user-attachments/assets/54ec2a34-9487-4868-b3df-ae29f5bcb35f" />

---
## What it does

MetroViz-NC turns `.metro` files into editable, shareable subway-style
roadmaps inside Nextcloud. Double-click a `.metro` file in the Files app
and a fullscreen viewer opens — auto-save writes back to the same path,
the file is shared like any other Nextcloud document, and exports to SVG,
PNG, PDF, JSON, and Markdown are one menu click away.

No external services. No analytics. No CDN. All assets self-hosted.

## Install on your Nextcloud

Two paths, both self-contained — no Node, no Composer, no build step on the server.

**Download a release tarball** (recommended for production):

```bash
VERSION=0.3.1
cd /tmp
curl -L -O https://github.com/sys-cr/metroviz-nextcloud-app/releases/download/v${VERSION}/metroviz-${VERSION}.tar.gz
cd /var/www/nextcloud/apps
sudo -u www-data tar xzf /tmp/metroviz-${VERSION}.tar.gz
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

**Clone the git repository** (recommended for tracking `main`):

```bash
cd /var/www/nextcloud/apps
sudo -u www-data git clone https://github.com/sys-cr/metroviz-nextcloud-app.git metroviz
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

Full step-by-step (verification, upgrading, troubleshooting): [docs/admin/INSTALL.md](./docs/admin/INSTALL.md).

## Documentation

- **Users (Deutsch):** [docs/user/de/](./docs/user/de/)
- **Users (English):** [docs/user/en/](./docs/user/en/)
- **Operators / NC admins:** [docs/admin/README.md](./docs/admin/README.md)

## Architecture

```
Browser (Alpine.js + D3.js + i18next, all vendored under js/vendor/)
  ↓ HTTP
PageController (thin PHP delivery layer)
  ↓ TemplateResponse
js/nc-storage.js (sole WebDAV adapter)
  ↓ HTTP (PUT/GET/PROPFIND/DELETE)
Nextcloud WebDAV API → users' Nextcloud Files
```

No app database. No background jobs. No outbound requests. Authentication
and authorisation are 100 % Nextcloud-native; the app holds no permission
state of its own.

## Contributing

This repository is a Nextcloud-specific fork-and-wrap of
[**rstockm/Metroviz**](https://github.com/rstockm/Metroviz):

- **Upstream-bound changes belong upstream.** Improvements to the
  rendering, data model, or general roadmap UX should be proposed at
  https://github.com/rstockm/Metroviz first. We pull them in.
- **NC-specific changes stay here.** Storage, sharing, file-viewer
  integration, NC-theme adaptation, accessibility fixes that depend on
  NC-CSS variables — all live in this repo.
- **Don't edit `js/metroviz/` unless you must.** That tree is the
  upstream source; edits create merge cost forever. Put adapter code
  in the `js/nc-*.js` files at the same level.

## License

MIT (matches the upstream's licence) — see [LICENSE](./LICENSE) and
`appinfo/info.xml` for the canonical declarations.
