# Installation Guide — MetroViz for Nextcloud

> Audience: a Nextcloud administrator installing the app on their own server.
> Time to install: ~5 minutes.

---

## Prerequisites

| Requirement | Minimum | Tested with |
|---|---|---|
| Nextcloud | 28 | 30 |
| PHP | 8.3 | 8.3 |
| Browser (end users) | Chromium 110, Firefox 110, Safari 16 | latest |
| Disk space for the app | ~5 MB | |

No new ports, no database changes, no background jobs.

If your Nextcloud's Content Security Policy is centrally enforced and forbids `'unsafe-eval'` outright (uncommon but possible), read the [Security model section in the admin guide](./README.md#content-security-policy) before enabling — the viewer route relies on per-route `'unsafe-eval'`.

---

## Two install paths

| Path | Best for | What you get |
|---|---|---|
| **A — Release tarball** | Production / pilot installs | A frozen, runtime-only build of the latest tagged release. No dev tooling, no test files, no CI configs. |
| **B — Git clone** | Tracking the latest `main`, contributing back, or pulling in upstream fixes immediately | A working tree of the full repository. Functionally equivalent for the runtime but ships extra developer files. |

Pick **A** unless you have a specific reason for B.

---

## Path A — Install from a release tarball *(recommended)*

1. **Download the latest release.**

   Browse to https://github.com/sys-cr/metroviz-nextcloud-app/releases and pick the topmost tag (currently `v0.3.1`). Each release ships:

   - `metroviz-<version>.tar.gz` — the installable archive
   - `metroviz-<version>.tar.gz.sha256` — a checksum to verify the download

   Or pull both via the command line:

   ```bash
   VERSION=0.3.1
   cd /tmp
   curl -L -o metroviz-${VERSION}.tar.gz \
       https://github.com/sys-cr/metroviz-nextcloud-app/releases/download/v${VERSION}/metroviz-${VERSION}.tar.gz
   curl -L -o metroviz-${VERSION}.tar.gz.sha256 \
       https://github.com/sys-cr/metroviz-nextcloud-app/releases/download/v${VERSION}/metroviz-${VERSION}.tar.gz.sha256
   sha256sum -c metroviz-${VERSION}.tar.gz.sha256
   ```

2. **Extract into the Nextcloud apps directory.**

   ```bash
   cd /var/www/nextcloud/apps
   sudo -u www-data tar xzf /tmp/metroviz-${VERSION}.tar.gz
   ```

   The archive expands into `metroviz/` — that is the app directory Nextcloud expects.

3. Continue with [Step 2 — Enable the app](#step-2--enable-the-app).

---

## Path B — Install from the git repository

```bash
cd /var/www/nextcloud/apps
sudo -u www-data git clone https://github.com/sys-cr/metroviz-nextcloud-app.git metroviz
```

That is all. The runtime ships with the vendored browser libraries already under `js/vendor/`, so the server needs no Node, no `npm install`, no `composer install`.

To later pull in updates:

```bash
cd /var/www/nextcloud/apps/metroviz
sudo -u www-data git pull --ff-only
```

Continue with [Step 2 — Enable the app](#step-2--enable-the-app).

---

## Step 2 — Enable the app

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
```

Expected output: `metroviz 0.3.1 enabled`.

This registers:

- The "MetroViz" entry in the top bar (icon: `img/metroviz-app.svg`).
- The viewer route `GET /index.php/apps/metroviz/viewer`.
- The `.metro` MIME type → `application/x-metroviz`.

No database migrations run — the app has no own tables.

---

## Step 3 — Register the `.metro` MIME type

Nextcloud caches its MIME registry. After enabling the app for the first time, force a refresh:

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
4. Click **Speichern** / **Save** — the toast confirms a successful WebDAV PUT.
5. Switch to the Files app and navigate to `MetroViz/`. The demo file should be there.
6. Double-click any `.metro` file in the Files app — the viewer opens in fullscreen via the OCA\Viewer integration.

If anything goes wrong, see the [troubleshooting matrix in the admin guide](./README.md#troubleshooting).

---

## Upgrading

```bash
sudo -u www-data php /var/www/nextcloud/occ app:disable metroviz
```

Then replace the on-disk app folder. With Path A:

```bash
sudo -u www-data rm -rf /var/www/nextcloud/apps/metroviz
cd /var/www/nextcloud/apps
sudo -u www-data tar xzf /tmp/metroviz-<new-version>.tar.gz
```

With Path B:

```bash
cd /var/www/nextcloud/apps/metroviz
sudo -u www-data git pull --ff-only
```

Re-enable and refresh the MIME database:

```bash
sudo -u www-data php /var/www/nextcloud/occ app:enable metroviz
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

User data in Nextcloud Files is untouched. The `.metro` schema is forward-compatible — newer versions of the app read older files without conversion.

---

## Removing

```bash
sudo -u www-data php /var/www/nextcloud/occ app:disable metroviz
sudo rm -rf /var/www/nextcloud/apps/metroviz
```

`.metro` files in users' Nextcloud Files remain. After the MIME registry refresh below they show as `application/json` and can still be downloaded, edited externally, or re-opened once the app is re-installed:

```bash
sudo -u www-data php /var/www/nextcloud/occ maintenance:mimetype:update-db
```

---

## Common installation errors

| Symptom | Fix |
|---|---|
| `Could not download app metroviz` from the in-app store | The app is not listed in the Nextcloud App Store. Use Path A (tarball) or Path B (git clone) above. |
| `App "MetroViz" cannot be installed because it is not compatible with this version of Nextcloud` | Check the `<nextcloud min-version max-version>` line in `appinfo/info.xml`. The defaults are 28 – 32. If your Nextcloud is newer, raise `max-version` and re-enable. |
| White screen at `/apps/metroviz/viewer` | Likely a CSP issue — check response headers and any reverse proxy for extra CSP injection. See [admin guide → Security model](./README.md#content-security-policy). |
| Top-bar icon missing | `sudo -u www-data php /var/www/nextcloud/occ maintenance:repair` to rebuild the navigation cache. |
| Permissions error in the Nextcloud log | `sudo chown -R www-data:www-data /var/www/nextcloud/apps/metroviz` |
| `.metro` files still open as raw JSON in the Files app | The MIME registry refresh did not catch this user's existing files. Re-run `occ maintenance:mimetype:update-db && occ files:scan --all`. |

---

## Where to go next

- [Admin / operator guide](./README.md) — operational reference, security model, troubleshooting matrix.
- [User documentation (German)](../user/de/README.md) / [English](../user/en/README.md) — what end users need to know once the app is live.
