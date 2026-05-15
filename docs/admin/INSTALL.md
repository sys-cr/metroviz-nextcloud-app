# Installation Guide — MetroViz-NC

> Audience: technical operator installing the app on an existing Nextcloud instance.
> App version: **0.1.0** (Phase 0, pre-production — do not use in production yet).
> Time to install: ~5 minutes.

---

## Prerequisites

| Requirement | Minimum | Tested with |
|---|---|---|
| Nextcloud | 26 | 30 |
| PHP | 8.1 | 8.2 |
| Browser (end users) | Chromium 110, Firefox 110, Safari 16 | latest |
| Disk space for app | ~5 MB | |

No new ports, no database changes, no background jobs to configure.

If your Nextcloud's Content Security Policy is centrally enforced and forbids `'unsafe-eval'` outright (uncommon but possible), read the [Security model section in the admin guide](./README.md#content-security-policy) first.

---

## Step 1 — Install the app on disk

### Option A: from a release tarball

```bash
cd /var/www/nextcloud/apps
sudo -u www-data tar xzf /path/to/metroviz-0.1.0.tar.gz
sudo chown -R www-data:www-data metroviz
```

### Option B: from the git repository

```bash
cd /var/www/nextcloud/apps
sudo -u www-data git clone https://github.com/<owner>/metroviz-nc.git metroviz
cd metroviz
sudo -u www-data npm install   # only needed if you intend to run tests / Storybook
sudo chown -R www-data:www-data .
```

> The `npm install` step is **only** needed for running tests or Storybook. The runtime ships with all vendored JS already in `js/vendor/` — production users do not need Node on the server.

---

## Step 2 — Enable the app

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
```

Expected output: `metroviz 0.1.0 enabled`.

This registers:

- The navigation entry "MetroViz" in the top bar (icon: `img/metroviz-app.svg`).
- The viewer route `GET /index.php/apps/metroviz/viewer`.
- The `.metro` MIME type → `application/x-metroviz`.

No database migrations run because the app has none.

---

## Step 3 — Register the `.metro` MIME type

NC caches its MIME registry. After enabling the app once, force a refresh:

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
sudo -u www-data php /var/www/nextcloud/occ files:scan --all
```

The `files:scan` pass may take a while on large instances — it walks every user's file tree and re-classifies any existing files with the `.metro` extension. If you have no existing `.metro` files, you can skip this scan and let it happen lazily on first use.

---

## Step 4 — Verify

1. Log in to Nextcloud as any user.
2. The top bar shows a "MetroViz" entry. Click it.
3. The viewer loads with a demo roadmap (`Files/MetroViz/Demo-Roadmap.metro` is created on first save).
4. Click "Speichern" / "Save" — the toast confirms a successful WebDAV PUT.
5. Switch to the Files app and navigate to `MetroViz/`. The demo file should be there.

If anything goes wrong, see the [troubleshooting matrix in the admin guide](./README.md#troubleshooting).

---

## Post-install checklist (pre-production)

This is pre-production. The following items are **not yet certified** and gate production go-live:

- [ ] Load test passed (P95 < 500 ms, error rate < 0.1 %)
- [ ] Soak test passed (≥ 4 h, no memory leak)
- [ ] axe-core CI run: 0 violations across all components
- [ ] Storybook sign-off for every UI component
- [ ] Sprint-end attack simulation

Until all of these are green, the recommended scope for MetroViz-NC is **internal staging or pilot users**, not your production fleet.

---

## Upgrading

Same procedure as a fresh install — replace the contents of `apps/metroviz/`, then:

```bash
sudo -u www-data php /var/www/nextcloud/occ app:disable metroviz
# replace files
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

User data in NC Files is untouched. The `.metro` schema is forward-compatible — newer versions of the app will read older files without conversion.

---

## Removing

```bash
sudo -u www-data php /var/www/nextcloud/occ app:disable metroviz
sudo rm -rf /var/www/nextcloud/apps/metroviz
```

`.metro` files in users' Nextcloud Files remain. They will appear as `application/json` (the fallback MIME) once the MIME registry is refreshed:

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

Users can still download and open the files in any JSON-aware tool, or re-install the app later to read them visually again.

---

## Common installation errors

| Error | Fix |
|---|---|
| `Could not download app metroviz` from app store | The app is not yet listed in the NC app store. Use Option A or B above. |
| `App "MetroViz" cannot be installed because it is not compatible with this version of Nextcloud` | Check `appinfo/info.xml` `<nextcloud min-version="…" max-version="…"/>`. The default is 26–30. If your NC is newer, update `max-version` and re-enable. |
| White screen at `/apps/metroviz/viewer` | Likely a CSP issue — check the response headers and your reverse proxy for additional CSP injection. See [admin guide → Security model](./README.md#content-security-policy). |
| Top-bar icon missing | `occ maintenance:repair` to rebuild the navigation cache. |
| Permissions error in NC log | `chown -R www-data:www-data /var/www/nextcloud/apps/metroviz` |

---

## Where to go next

- [Admin / operator guide](./README.md) — full operational reference.
- [Developer documentation](../dev/README.md) — for contributors and reviewers.
- [User documentation (German)](../user/de/README.md) / [English](../user/en/README.md).
