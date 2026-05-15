import { downloadBlob, sanitizeSvg, sanitizeFilename } from './utils.js';

// MetroViz-NC fork: localStorage-using methods (loadIndex, saveIndex,
// loadFile, saveFile, saveAsNew) were removed. Nextcloud WebDAV equivalents
// live in js/nc-storage.js (ncStorageActions) and are spread into
// metrovizApp after fileManagerActions in js/metroviz/app.js.

export const fileManagerActions = {
/**
     * Creates a new roadmap with a small starter line and two stations so
     * the map area is not blank after the user clicks "Neu". Without this,
     * the renderer draws only the ~150 px timeline strip and the user has
     * no visual cue that the roadmap was created. MetroViz-NC change vs.
     * upstream (which uses an empty `lines: []`).
     */
    createNew() {
        const year = new Date().getFullYear();
        const stamp = Date.now().toString(36);
        this.currentFileName = '';
        this.editorVisible = true;
        this.data = {
            meta: { title: i18next.t('js.defaultNewTitle'), organization: '' },
            timeline: { start: `${year}-Q1`, end: `${year + 1}-Q3` },
            events: [],
            zones: [],
            lines: [
                {
                    id: 'line-' + stamp,
                    label: i18next.t('js.starterLineLabel'),
                    color: '#0078D4',
                    stations: [
                        { id: 'station-' + stamp + '-start', label: i18next.t('js.starterStationStart'), date: `${year}-Q2` },
                        { id: 'station-' + stamp + '-goal',  label: i18next.t('js.starterStationGoal'),  date: `${year + 1}-Q2` }
                    ]
                }
            ]
        };
        this.rawJson = JSON.stringify(this.data, null, 2);
        this.renderMap(this.data);
    },

/**
     * Handles importing JSON data from a selected or dropped file.
     * Includes a 5MB size limit security check.
     * @param {File} file - The file object to read.
     */
    importJsonFromFile(file) {
        if (!file) return;
        
        // Security check: limit upload size to prevent DoS via excessively
        // large files. `dialogAlert` is guaranteed by the spread order in
        // app.js (ncDialogActions ↦ dialogActions).
        if (file.size > 5 * 1024 * 1024) { // 5 MB
            this.dialogAlert(i18next.t('js.importFileTooLarge'), i18next.t('js.errorTitle'));
            return;
        }
        
        const reader = new FileReader();
        reader.onerror = (err) => console.error('FileReader error:', err);
        reader.onload = (e) => {
            this.rawJson = e.target.result;
            this.updateFromJson();
            this.currentFileName = '';
            this.importModalOpen = false;
        };
        reader.readAsText(file);
    },

/**
     * Handles the file input change event for importing.
     * @param {Event} event - The DOM change event.
     */
    handleImportFileInput(event) {
        const file = event.target.files[0];
        if (file) this.importJsonFromFile(file);
        event.target.value = '';
    },

/**
     * Handles the drag-and-drop event for importing JSON files.
     * @param {DragEvent} event - The DOM drop event.
     */
    importDropHandler(event) {
        event.preventDefault();
        this.importDropActive = false;
        const file = event.dataTransfer.files[0];
        if (file) this.importJsonFromFile(file);
    },

    // MetroViz-NC: `importFromUrl` from upstream removed alongside
    // `loadFromRemoteSource`. The Import dialog's URL input is no longer
    // wired; only the local file dropzone remains in scope for the MVP.

/**
     * Loads the default example dataset (data/example.json).
     */
    async loadInitialData() {
        // MetroViz-NC: NC's .htaccess blocks .json requests in app dirs
        // so viewer.php injects the example map inline as
        // window.METROVIZ_EXAMPLE_JSON. Use it directly when present;
        // fall back to the upstream fetch path for standalone MetroViz.
        try {
            if (typeof window !== 'undefined' && window.METROVIZ_EXAMPLE_JSON) {
                this.rawJson = typeof window.METROVIZ_EXAMPLE_JSON === 'string'
                    ? window.METROVIZ_EXAMPLE_JSON
                    : JSON.stringify(window.METROVIZ_EXAMPLE_JSON);
                this.updateFromJson();
                return;
            }
            const response = await fetch('data/example.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.rawJson = await response.text();
            this.updateFromJson();
        } catch (error) {
            console.error('Failed to initialize MetroViz:', error);
        }
    },

    // MetroViz-NC: `loadFromRemoteSource(url)` from upstream removed.
    // It triggered arbitrary cross-origin fetches via the `?source=` URL
    // param, leaking the NC instance IP + user UA to any third-party
    // server linked in a malicious share URL. Out of MVP scope — Nextcloud
    // Files is the only roadmap source.

    /**
     * Serializes the current SVG element into a data URL.
     * 
     * @returns {string|null} The data URL of the SVG, or null if it fails.
     */
    _getSvgDataUrl() {
        const svgElement = window.app.renderer.svgElement;
        if (!svgElement) return null;

        try {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            
            // Workaround: Manually inject missing XML namespaces.
            // When serializing DOM nodes, default namespaces might be omitted by the browser,
            // which causes the resulting SVG file to be invalid when opened standalone.
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
                source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
            }

            source = sanitizeSvg(source);

            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

            return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        } catch (e) {
            console.error('Fehler beim SVG-Serialisieren:', e);
            return null;
        }
    },

    /**
     * Exports the current roadmap view as an SVG file.
     */
    exportSVG() {
        const svgUrl = this._getSvgDataUrl();
        if (!svgUrl) return;
        
        try {
            const source = decodeURIComponent(svgUrl.split(',')[1]);
            const filename = sanitizeFilename(this.currentFileName) + '.svg';
            downloadBlob(source, 'image/svg+xml;charset=utf-8;', filename);
        } catch (e) {
            console.error('Fehler beim SVG-Export:', e);
        }
    },

    /**
     * Exports the current roadmap view as a high-resolution PNG file.
     */
    exportPNG() {
        const svgUrl = this._getSvgDataUrl();
        if (!svgUrl) return;
        const svgElement = window.app.renderer.svgElement;
        const width = svgElement.viewBox.baseVal.width;
        const height = svgElement.viewBox.baseVal.height;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 4; // High resolution
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                const filename = sanitizeFilename(this.currentFileName) + '.png';
                downloadBlob(blob, 'image/png', filename);
            }, 'image/png');
        };
        img.onerror = () => {
            console.error('Fehler beim Rendern des SVG für den PNG Export.');
            this.dialogAlert(i18next.t('js.pngExportError'), i18next.t('js.errorTitle'));
        };
        img.src = svgUrl;
    },

    /**
     * Exports the current roadmap view as a PDF file.
     * Requires jsPDF and svg2pdf libraries to be loaded globally.
     */
    async exportPDF() {
        const svgElement = window.app.renderer.svgElement;
        if (!svgElement) return;
        
        const width = svgElement.viewBox.baseVal.width;
        const height = svgElement.viewBox.baseVal.height;

        if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF && window.svg2pdf) {
            const pdf = new window.jspdf.jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [width, height]
            });
            
            try {
                await pdf.svg(svgElement, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
                
                const filename = sanitizeFilename(this.currentFileName) + '.pdf';
                pdf.save(filename);
            } catch (err) {
                console.error("Fehler beim SVG-to-PDF Export:", err);
                this.dialogAlert(i18next.t('js.pdfExportError') + err.message, i18next.t('js.errorTitle'));
            }
        } else {
            console.error("jsPDF- oder svg2pdf-Bibliothek konnte nicht gefunden werden.");
            this.dialogAlert(i18next.t('js.pdfExportErrorLibs'), i18next.t('js.errorTitle'));
        }
    },

/**
     * Exports the raw JSON representation of the current roadmap state.
     */
    exportJSON() {
        if (!this.rawJson) return;
        const filename = sanitizeFilename(this.currentFileName) + '.json';
        downloadBlob(this.rawJson, 'application/json;charset=utf-8;', filename);
    }
};
