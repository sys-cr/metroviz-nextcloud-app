// Nextcloud WebDAV storage adapter. The sole HTTP gateway for the app;
// every load/save/delete flows through here. Authenticates via the NC session
// (server-side) and signs state-changing calls with the request
// token. Composed last into the Alpine component so its methods
// win over the upstream MetroViz file-manager (see `js/metroviz/app.js`).

const BASE_PATH = '/remote.php/dav/files';

function getDavBase() {
    const user = typeof OC !== 'undefined' && OC.currentUser ? OC.currentUser : '';
    return `${BASE_PATH}/${encodeURIComponent(user)}/MetroViz`;
}

// Build a WebDAV URL for a user-relative path (e.g. "/Projekte/Roadmap.metro").
// Encodes each segment individually so paths with spaces or non-ASCII don't
// break, but slashes between segments stay literal.
function getDavUrlForPath(path) {
    const user = typeof OC !== 'undefined' && OC.currentUser ? OC.currentUser : '';
    const segments = String(path || '')
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
    return `${BASE_PATH}/${encodeURIComponent(user)}/${segments}`;
}

function getHeaders(extra = {}) {
    return {
        // OC_requesttoken is injected by templates/viewer.php.
        requesttoken: typeof OC_requesttoken !== 'undefined' ? OC_requesttoken : '',
        // NC AJAX convention. Current versions accept calls without it, but
        // future tightening could make it mandatory and break every save/load
        // silently.
        'X-Requested-With': 'XMLHttpRequest',
        ...extra,
    };
}

// Returns a user-facing i18n key for the two HTTP statuses that need a
// dedicated message; null lets the caller append a generic op-specific text.
function mapStatusToKey(status) {
    if (status === 401) return 'js.errSession';
    if (status === 403) return 'js.errPermission';
    return null;
}

export const ncStorageActions = {
    async ensureBaseFolder() {
        try {
            // MKCOL returns 201 (created) or 405 (already exists); both fine.
            await fetch(getDavBase(), {
                method: 'MKCOL',
                headers: getHeaders(),
            });
        } catch (e) {
            console.warn('ensureBaseFolder failed:', e);
        }
    },

    async loadIndex() {
        try {
            const response = await fetch(getDavBase() + '/', {
                method: 'PROPFIND',
                headers: getHeaders({
                    'Content-Type': 'application/xml',
                    Depth: '1',
                }),
                body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontenttype/>
  </d:prop>
</d:propfind>`,
            });
            if (!response.ok && response.status !== 207) {
                this.savedFiles = [];
                return;
            }
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'application/xml');
            // getElementsByTagNameNS is required — querySelectorAll does not
            // match namespace-prefixed elements (d:response) in WebDAV XML.
            const responses = xml.getElementsByTagNameNS('DAV:', 'response');
            const files = [];
            Array.from(responses).forEach((r) => {
                const href = r.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent || '';
                const ct = r.getElementsByTagNameNS('DAV:', 'getcontenttype')[0]?.textContent || '';
                if (ct === 'application/x-metroviz' || href.endsWith('.metro')) {
                    const name = decodeURIComponent(href.split('/').pop().replace('.metro', ''));
                    if (name) files.push(name);
                }
            });
            this.savedFiles = files;
        } catch (e) {
            console.warn('loadIndex failed:', e);
            this.savedFiles = [];
        }
    },

    // No-op: the index is derived from the filesystem via PROPFIND, never
    // persisted. Kept so upstream callers that still invoke it do not throw.
    saveIndex() {},

    async loadFile(name) {
        if (!name) return;
        try {
            // If the SPA was opened via OCA\Viewer, the target file path is
            // pinned by the controller (window.METROVIZ_TARGET_PATH) and
            // overrides the default /MetroViz/<name>.metro location.
            const targetPath =
                typeof window !== 'undefined' && window.METROVIZ_TARGET_PATH
                    ? window.METROVIZ_TARGET_PATH
                    : null;
            const url = targetPath
                ? getDavUrlForPath(targetPath)
                : `${getDavBase()}/${encodeURIComponent(name)}.metro`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders(),
            });
            if (!response.ok) {
                const mappedKey = mapStatusToKey(response.status);
                const message = mappedKey
                    ? i18next.t(mappedKey)
                    : i18next.t('js.loadFileError') + ` (HTTP ${response.status})`;
                await this.dialogAlert(message, i18next.t('js.errorTitle'));
                return;
            }
            // Match the 5 MB cap that the
            // drop-/import-path already enforces (file-manager.js). Bob
            // could otherwise share a 50 MB JSON with Alice and freeze
            // her viewer on open. We check Content-Length first (cheap)
            // and fall back to inspecting the buffered body length.
            const MAX_FILE_BYTES = 5 * 1024 * 1024;
            const headers = response && response.headers;
            const lenHeader =
                headers && typeof headers.get === 'function' ? headers.get('content-length') : null;
            const declaredLen = parseInt(lenHeader || '0', 10);
            if (declaredLen > MAX_FILE_BYTES) {
                await this.dialogAlert(
                    i18next.t('js.errFileTooLarge') ||
                        'File exceeds the 5 MB size limit and was not loaded.',
                    i18next.t('js.errorTitle')
                );
                return;
            }
            const text = await response.text();
            if (text.length > MAX_FILE_BYTES) {
                await this.dialogAlert(
                    i18next.t('js.errFileTooLarge') ||
                        'File exceeds the 5 MB size limit and was not loaded.',
                    i18next.t('js.errorTitle')
                );
                return;
            }
            this.rawJson = text;
            this.updateFromJson();
            this.currentFileName = name;
        } catch (e) {
            await this.dialogAlert(
                i18next.t('js.loadFileError') + e.message,
                i18next.t('js.errorTitle')
            );
        }
    },

    /**
     * Save the current roadmap to the user's NC Files.
     *
     * @param {object}  [options]
     * @param {boolean} [options.silent=false] - When true, suppress the
     *   success dialog. Used by auto-save and the first-run demo bootstrap
     *   so they never interrupt the user. Errors always surface.
     */
    async saveFile(options = {}) {
        const silent = options.silent === true;
        if (!this.currentFileName) {
            return await this.saveAsNew();
        }
        this.rawJson = JSON.stringify(this.data, null, 2);
        const targetPath =
            typeof window !== 'undefined' && window.METROVIZ_TARGET_PATH
                ? window.METROVIZ_TARGET_PATH
                : null;
        const url = targetPath
            ? getDavUrlForPath(targetPath)
            : `${getDavBase()}/${encodeURIComponent(this.currentFileName)}.metro`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: getHeaders({ 'Content-Type': 'application/x-metroviz' }),
                body: this.rawJson,
            });
            if (!response.ok) {
                const mappedKey = mapStatusToKey(response.status);
                const message = mappedKey
                    ? i18next.t(mappedKey)
                    : i18next.t('js.saveError') + ` (HTTP ${response.status})`;
                await this.dialogAlert(message, i18next.t('js.errorTitle'));
                return;
            }
            await this.loadIndex();
            if (!silent) {
                await this.dialogAlert(
                    i18next.t('js.savedSuccess').replace('{{name}}', this.currentFileName),
                    i18next.t('js.savedTitle')
                );
            }
        } catch (e) {
            await this.dialogAlert(
                i18next.t('js.saveError') + e.message,
                i18next.t('js.errorTitle')
            );
        }
    },

    async saveAsNew() {
        const name = await this.dialogPrompt(
            i18next.t('js.promptNewName'),
            i18next.t('js.defaultNewName'),
            i18next.t('js.defaultNewTitle')
        );
        if (name === null) return;
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        if (this.savedFiles.includes(trimmed)) {
            const ok = await this.dialogConfirm(
                i18next.t('js.confirmOverwrite'),
                i18next.t('js.overwriteTitle')
            );
            if (!ok) return;
        }
        this.currentFileName = trimmed;
        await this.saveFile();
    },

    /**
     * Open a `.metro` file via the NC FilePicker.
     * Lets the user pick any `.metro` file in their NC Files (not only
     * those under /MetroViz/). Pins the chosen path on
     * `window.METROVIZ_TARGET_PATH` so subsequent saves land back at the
     * same path.
     */
    async openFromFilePicker() {
        if (typeof this.dialogFilePicker !== 'function') return;
        const path = await this.dialogFilePicker(
            i18next.t('js.pickFileToOpen') || 'Open .metro file',
            { mimeFilter: 'application/x-metroviz' }
        );
        if (!path) return;
        if (typeof window !== 'undefined') {
            window.METROVIZ_TARGET_PATH = path;
        }
        const fileName = (path.split('/').pop() || '').replace(/\.metro$/i, '');
        this.currentFileName = fileName || 'roadmap';
        await this.loadFile(this.currentFileName);
    },

    /**
     * Save the current roadmap to a user-chosen NC Files location via the
     * native FilePicker. The picker selects a target
     * directory; we then prompt for the file name and PUT to
     * `<dir>/<name>.metro`. On success, pins the new path as the active
     * target so subsequent saves stay at that location.
     */
    async saveAsViaFilePicker() {
        if (typeof this.dialogFilePicker !== 'function') {
            return await this.saveAsNew();
        }
        const dir = await this.dialogFilePicker(
            i18next.t('js.pickFolderToSave') || 'Pick destination folder',
            { allowSelectDir: true }
        );
        if (dir === null) return;
        const proposed = this.currentFileName || i18next.t('js.defaultNewName') || 'roadmap';
        const name = await this.dialogPrompt(
            i18next.t('js.promptNewName'),
            proposed,
            i18next.t('js.defaultNewTitle')
        );
        if (name === null) return;
        const trimmed = String(name || '').trim();
        if (!trimmed) return;
        const targetPath = dir.replace(/\/$/, '') + '/' + trimmed + '.metro';
        if (typeof window !== 'undefined') {
            window.METROVIZ_TARGET_PATH = targetPath;
        }
        this.currentFileName = trimmed;
        await this.saveFile();
    },

    /**
     * Open Nextcloud's native sharing surface for the active file
     * Preferred path: `OCA.Files.Sidebar.open()` with
     * the `sharing` tab. If the Files-Sidebar API isn't loaded on the viewer
     * route, fall back to the upstream MetroViz share-link (compressed URL
     * to the clipboard) so the user still gets *some* way to share.
     *
     * Why the fallback: NC's Files-Sidebar is loaded by the Files app, not
     * by every NC route. When MetroViz is reached via the top-bar (not via
     * a double-click from Files), Sidebar may not have been initialised
     * yet — the upstream share-link still works in that case.
     */
    async shareViaNextcloud() {
        const targetPath =
            typeof window !== 'undefined' && window.METROVIZ_TARGET_PATH
                ? window.METROVIZ_TARGET_PATH
                : null;
        const sidebar =
            (typeof OCA !== 'undefined' && OCA && OCA.Files && OCA.Files.Sidebar) || null;

        if (targetPath && sidebar && typeof sidebar.open === 'function') {
            try {
                // Newer NC versions accept a second arg with the active tab id.
                await sidebar.open(targetPath, 'sharing');
                return;
            } catch (e) {
                // Older NC versions may not accept the tab argument — try
                // without; if THAT also throws, drop to the upstream share-link.
                try {
                    await sidebar.open(targetPath);
                    return;
                } catch (e2) {
                    console.warn('OCA.Files.Sidebar.open failed; falling back to share-link.', e2);
                }
            }
        }

        // Fallback: the upstream MetroViz share-link flow (compressed
        // URL to clipboard). Still useful for cross-instance sharing or
        // for users who reached the viewer via the top-bar nav.
        if (typeof this.generateShareLink === 'function') {
            await this.generateShareLink();
        }
    },

    async deleteFile(name) {
        if (!name) return;
        // Always confirm before destroying user data.
        const ok = await this.dialogConfirm(
            i18next.t('js.confirmDelete', { name }),
            i18next.t('js.deleteTitle')
        );
        if (!ok) return;
        const url = `${getDavBase()}/${encodeURIComponent(name)}.metro`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!response.ok) {
                const mappedKey = mapStatusToKey(response.status);
                const message = mappedKey
                    ? i18next.t(mappedKey)
                    : i18next.t('js.deleteError') + ` (HTTP ${response.status})`;
                await this.dialogAlert(message, i18next.t('js.errorTitle'));
                return;
            }
            if (this.currentFileName === name) {
                this.currentFileName = '';
            }
            await this.loadIndex();
        } catch (e) {
            await this.dialogAlert(
                i18next.t('js.deleteError') + e.message,
                i18next.t('js.errorTitle')
            );
        }
    },
};
