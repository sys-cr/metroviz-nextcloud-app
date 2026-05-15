/**
 * Calculates a bitmask representing the collapsed state of up to 31 zones.
 * 
 * @param {Array} zones - Array of zone objects.
 * @returns {number} A bitmask integer.
 */
export function getZStateBitmask(zones) {
    let zstate = 0;
    if (zones && Array.isArray(zones)) {
        // We use bitwise operations to compactly store the state of up to 31 zones 
        // in a single 32-bit signed integer. This keeps the generated URL share link short.
        zones.forEach((zone, index) => {
            if (index < 31 && zone.collapsed) {
                zstate |= (1 << index);
            }
        });
    }
    return zstate;
}

export const urlStateActions = {
    /**
     * Parses URL query parameters and updates the application state accordingly.
     * Handles parameters like 'editor', 'view', 'file', 'zstate', and 'data'.
     */
    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);

        this._urlHadData = false;

        if (params.has('editor')) {
            this.editorVisible = params.get('editor') === '1' || params.get('editor') === 'true';
        }

        if (params.has('view')) {
            const v = params.get('view');
            if (v === 'map' || v === 'markdown') {
                this.globalView = v;
            }
        }

        if (params.has('zstate')) {
            this._urlZState = parseInt(params.get('zstate'), 10);
        }

        if (params.has('data') && typeof window.LZString !== 'undefined') {
            const raw = params.get('data');
            // DEBT-003: cap the compressed payload at ~5 MB so a crafted
            // share link cannot exhaust the main thread inside lz-string's
            // decompression loop (DoS via "LZ bomb"). 5 MB encoded equals
            // ~20-40 MB decompressed for typical text — already three orders
            // of magnitude beyond any legitimate roadmap.
            const MAX_DATA_BYTES = 5 * 1024 * 1024;
            if (raw.length > MAX_DATA_BYTES) {
                console.warn('?data= parameter exceeds 5 MB cap; refusing to decompress.');
                return;
            }
            const decompressed = window.LZString.decompressFromEncodedURIComponent(raw);
            if (decompressed) {
                this.rawJson = decompressed;
                this.currentFileName = '';
                this._urlHadData = true;
            }
        }
    },

    /**
     * Updates the browser's URL query parameters to reflect the current application state.
     * Replaces the history state without reloading the page.
     */
    updateUrlParams() {
        const url = new URL(window.location);
        // Drop any params that could leak data or trigger external loads.
        // `file` would leak the filename in browser history / server logs
        // (privacy). `source` would re-enable arbitrary remote loads
        // (already removed in parseUrlParams, drop here for safety).
        url.searchParams.delete('data');
        url.searchParams.delete('source');
        url.searchParams.delete('file');
        url.searchParams.set('editor', this.editorVisible ? '1' : '0');
        url.searchParams.set('view', this.globalView);

        if (window.Alpine && window.Alpine.store('i18n')) {
            url.searchParams.set('lang', window.Alpine.store('i18n').locale);
        }

        if (this.data && this.data.zones) {
            url.searchParams.set('zstate', getZStateBitmask(this.data.zones));
        }

        window.history.replaceState({}, '', url);
    },

    /**
     * Generates a compressed shareable URL containing the current JSON data and zone states,
     * then copies it to the user's clipboard.
     */
    async generateShareLink() {
        if (typeof window.LZString === 'undefined') {
            await this.dialogAlert(i18next.t('js.shareUnavailable'), i18next.t('header.share'));
            return;
        }
        if (!this.rawJson || !this.rawJson.trim()) {
            await this.dialogAlert(i18next.t('js.shareNoData'), i18next.t('header.share'));
            return;
        }
        // Validate that rawJson actually parses
        // and meets the DataModel constraints before turning it into a
        // share-link. Without this guard a user with broken JSON in the
        // editor could ship a link that errors on every recipient's side.
        try {
            const parsed = JSON.parse(this.rawJson);
            if (window.app && window.app.dataModel) {
                window.app.dataModel.validateAndNormalize(parsed);
            }
        } catch (e) {
            await this.dialogAlert(
                i18next.t('js.shareInvalidData') || (i18next.t('js.shareNoData') + ' (' + e.message + ')'),
                i18next.t('header.share')
            );
            return;
        }
        // Serialize the current state including zstate
        let zstate = getZStateBitmask(this.data && this.data.zones ? this.data.zones : []);
        let langStr = '';
        if (window.Alpine && window.Alpine.store('i18n')) {
            langStr = '&lang=' + window.Alpine.store('i18n').locale;
        }
        const compressed = window.LZString.compressToEncodedURIComponent(this.rawJson);
        const shareUrl = window.location.origin + window.location.pathname + '?zstate=' + zstate + langStr + '&data=' + compressed;
        try {
            await navigator.clipboard.writeText(shareUrl);
            await this.dialogAlert(i18next.t('js.shareLinkCopied'), i18next.t('header.share'));
        } catch {
            await this.dialogAlert(i18next.t('js.shareCopyFailed'), i18next.t('header.share'));
        }
    }
};
