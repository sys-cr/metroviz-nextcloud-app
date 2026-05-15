// MetroViz-NC: static imports (upstream layout). Top-level await + dynamic
// imports for cache busting was tried but is incompatible with Alpine's
// auto-boot on DOMContentLoaded. Cache
// busting between module edits is a known dev-time annoyance — hard-refresh
// once after editing transitive modules. Proper systemic fix is a build
// step with hashed filenames, planned post-MVP.
import { DataModel } from './data-model.js';
import { LayoutEngine } from './layout-engine.js';
import { MetroRenderer } from './metro-renderer.js';

import { sortPaletteRainbow, METRO_PALETTE_BASE } from './color-utils.js';
import { dialogActions } from './dialog.js';
import { urlStateActions } from './url-state.js';
import { fileManagerActions } from './file-manager.js';
import { markdownExportActions } from './markdown-export.js';
import { editorActions } from './editor-actions.js';
import { ncStorageActions } from '../nc-storage.js';
import { ncDialogActions } from '../nc-dialogs.js';
import { debounceAutoSave } from '../nc-autosave.js';

// Initialize i18next asynchronously
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');

// MetroViz-NC: when running inside Nextcloud, viewer.php injects translations
// inline via window.METROVIZ_I18N_RESOURCES because NC's .htaccess blocks
// .json requests from app directories. We use the injected
// resources and skip the http-backend in that case. Falls back to the
// original loadPath when the global is absent (standalone MetroViz).
// Translations are injected inline by templates/viewer.php as
// window.METROVIZ_I18N_RESOURCES — Nextcloud's .htaccess blocks .json
// requests from app directories, so the http-backend would 404 anyway.
const i18nPromise = i18next
    .use(i18nextBrowserLanguageDetector)
    .init({
        lng: langParam || undefined,
        fallbackLng: 'de',
        resources: window.METROVIZ_I18N_RESOURCES || {},
    }).then(() => {
        document.documentElement.lang = i18next.resolvedLanguage;
        if (window.Alpine && window.Alpine.store('i18n')) {
            window.Alpine.store('i18n').locale = i18next.resolvedLanguage;
            window.Alpine.store('i18n').loaded = true;
        }
    });

document.addEventListener('alpine:init', () => {
    Alpine.store('i18n', {
        locale: i18next.resolvedLanguage || 'de',
        loaded: false,
        t(key, opts) {
            // Read `locale` and `loaded` so Alpine's reactivity tracks them.
            // Without these reads, x-text bindings would not re-evaluate when
            // the language switches at runtime. Do NOT remove.
            void this.locale; void this.loaded;
            return i18next.t(key, opts);
        },
        async changeLanguage(lang) {
            await i18next.changeLanguage(lang);
            this.locale = i18next.resolvedLanguage;
            document.documentElement.lang = this.locale;
            window.dispatchEvent(new Event('language-changed'));
        }
    });
});

/**
 * Main Application Controller handling state, UI interactions, and visualization updates.
 */
class App {
    constructor() {
        this.dataModel = new DataModel();
        this.layoutEngine = new LayoutEngine();
        this.renderer = new MetroRenderer('#metroviz-container');
        
        this.initAlpine();
        this.setupEventListeners();
    }

    /**
     * Initializes Alpine.js, defining global data and watching for state changes.
     */
    initAlpine() {
        document.addEventListener('alpine:init', () => {
            const objKeys = new WeakMap();
            let nextObjKey = 1;

            Alpine.data('metrovizApp', () => ({
                editorVisible: false,
                // navOverlayOpen toggles the left navigation as an overlay on
                // narrow viewports (< 1024 px). On desktop the nav is always
                // visible via CSS regardless of this flag.
                navOverlayOpen: false,
                // isNarrowViewport tracks the (max-width: 1023px) media query
                // reactively so the title-click handler / aria-expanded
                // bindings can be gated on it.
                isNarrowViewport: false,
                globalView: 'map',
                activeTab: 'visual',
                rawJson: '',
                jsonError: '',
                savedFiles: [],
                currentFileName: '',
                importModalOpen: false,
                importUrl: '',
                importDropActive: false,
                dialogOpen: false,
                dialogMode: 'alert',
                dialogTitle: '',
                dialogMessage: '',
                dialogInput: '',
                _dialogResolve: null,
                /** 30 Metro map colors, sorted by rainbow (HSV hue) */
                metroPalette: sortPaletteRainbow(METRO_PALETTE_BASE),

                data: {
                    meta: { title: '', organization: '' },
                    timeline: { start: '', end: '' },
                    events: [],
                    zones: [],
                    lines: []
                },

                // Spread modules. Order matters — the latter wins.
                //  1. dialogActions — upstream MetroViz dialog system (modal overlays)
                //  2. ncDialogActions — NC overrides: `OC.dialogs.*` + toasts.
                //  3. fileManagerActions — upstream import/export/createNew
                //  4. ncStorageActions — WebDAV-backed save/load/saveAsNew/deleteFile
                ...dialogActions,
                ...ncDialogActions,
                ...urlStateActions,
                ...fileManagerActions,
                ...ncStorageActions,
                ...markdownExportActions,
                ...editorActions,

                _autoSave: null,
                _lastSavedSnapshot: null,
                /** Save-status indicator state. One of:
                 *   'idle'   — no file loaded yet
                 *   'saved'  — last known state matches what's on the server
                 *   'dirty'  — user has unsaved edits
                 *   'saving' — PUT in flight
                 * Driven by data $watch + the auto-save wrapper.
                 */
                _saveState: 'idle',

                /**
                 * Returns a stable render key for mutable editor objects.
                 * This keeps Alpine from recreating DOM nodes when editable IDs change.
                 */
                getObjKey(obj) {
                    if (!obj || typeof obj !== 'object') return String(obj);
                    if (!objKeys.has(obj)) objKeys.set(obj, `obj-${nextObjKey++}`);
                    return objKeys.get(obj);
                },

                async init() {
                    await i18nPromise;

                    // Track viewport breakpoint reactively. The title acts as
                    // a nav-toggle only when narrow; on desktop it stays a
                    // plain heading. matchMedia + change listener keeps the
                    // state in sync across resize and orientation changes.
                    const mq = window.matchMedia('(max-width: 1023px)');
                    this.isNarrowViewport = mq.matches;
                    mq.addEventListener('change', (e) => {
                        this.isNarrowViewport = e.matches;
                        if (!e.matches) this.navOverlayOpen = false;
                    });

                    // Make sure /MetroViz folder exists in Nextcloud Files
                    // before any save/load operation.
                    await this.ensureBaseFolder();

                    // Debounced auto-save: collapse rapid edits into a single
                    // WebDAV PUT 2 s after the last change. Silent (no
                    // "Gespeichert" modal) — only manual Save shows confirmation.
                    // After a successful PUT we update _lastSavedSnapshot so the
                    // next data-watch tick won't immediately re-fire.
                    // The _saveState transitions drive the header status pill:
                    // idle → dirty → saving → saved. Modal feedback only on
                    // manual Save to avoid spam during continuous editing.
                    this._autoSave = debounceAutoSave({
                        saveFn: async () => {
                            if (!this.currentFileName) return;
                            const snapshot = JSON.stringify(this.data);
                            this._saveState = 'saving';
                            await this.saveFile({ silent: true });
                            this._lastSavedSnapshot = snapshot;
                            this._saveState = 'saved';
                        },
                        delay: 2000,
                    });

                    await this.loadIndex();
                    this.parseUrlParams();

                    // Highest priority: if PageController resolved a fileid to
                    // an explicit target path (OCA\Viewer flow), the
                    // SPA loads that file directly — bypassing the /MetroViz/
                    // listing fallback. nc-storage's loadFile/saveFile honour
                    // window.METROVIZ_TARGET_PATH automatically; we only need
                    // to seed currentFileName so the title bar reads correctly.
                    let loaded = false;
                    if (typeof window !== 'undefined' && window.METROVIZ_TARGET_PATH) {
                        this.currentFileName = window.METROVIZ_TARGET_NAME || 'roadmap';
                        await this.loadFile(this.currentFileName);
                        loaded = true;
                    }
                    if (!loaded && this._urlHadData) {
                        this.updateFromJson();
                        loaded = true;
                    }
                    if (!loaded) {
                        if (this.currentFileName && this.savedFiles.includes(this.currentFileName)) {
                            await this.loadFile(this.currentFileName);
                        } else if (this.savedFiles.length > 0) {
                            this.currentFileName = this.savedFiles[0];
                            await this.loadFile(this.currentFileName);
                        } else {
                            // First-run bootstrap: empty /MetroViz/ folder.
                            // Load the bundled demo and persist it as a real
                            // .metro file so it shows up in Nextcloud Files
                            // and in the file dropdown. Silent save — we
                            // don't want a "Gespeichert" modal greeting the
                            // very first visit.
                            await this.loadInitialData();
                            const demoName = i18next.t('js.demoFileName') || 'Demo';
                            if (demoName && this.rawJson) {
                                this.currentFileName = demoName;
                                await this.saveFile({ silent: true });
                            }
                        }
                    }

                    // Set initial URL state correctly if it was defaulted
                    this.updateUrlParams();

                    // Watch states to update URL dynamically
                    // Intent: Persist UI state to URL so users can share links with exact visual states.
                    this.$watch('editorVisible', () => this.updateUrlParams());
                    this.$watch('globalView', () => this.updateUrlParams());
                    this.$watch('currentFileName', () => this.updateUrlParams());
                    
                    // Watch for any changes in the parsed data object (from visual editor)
                    // Intent: Ensure the raw JSON string and map visualization stay synchronized 
                    // whenever the visual editor modifies the underlying data object.
                    this.$watch('data', (value) => {
                        if (this.activeTab === 'visual') {
                            this.rawJson = JSON.stringify(value, null, 2);
                            this.renderMap(value);
                        }
                        this.updateUrlParams();
                        // Auto-save only when `data` actually differs from the
                        // last saved/loaded snapshot. Without this, Alpine's
                        // deep-watch callback fires for post-init reactivity
                        // settling (URL state, zstate bitmask, etc.) and would
                        // PUT the file back without any user edit.
                        if (this._autoSave && this.currentFileName) {
                            const current = JSON.stringify(value);
                            if (current !== this._lastSavedSnapshot) {
                                this._saveState = 'dirty';
                                this._autoSave();
                            }
                        }
                    }, { deep: true });

                    // Watch for tab changes to trigger re-renders or formatting
                    // Intent: Keep JSON view strictly synchronized with memory data when switching tabs.
                    this.$watch('activeTab', (tab) => {
                        if (tab === 'json') {
                            this.rawJson = JSON.stringify(this.data, null, 2);
                        }
                    });

                    this.$watch('dialogOpen', (open) => {
                        if (!open) return;
                        this.$nextTick(() => {
                            if (this.dialogMode === 'prompt') {
                                const input = document.getElementById('dialog-prompt-input');
                                if (input) input.focus();
                            } else {
                                const btn = document.getElementById('dialog-ok-btn');
                                if (btn) btn.focus();
                            }
                        });
                    });

                    window.addEventListener('language-changed', () => {
                        this.updateUrlParams();
                        if (this.data && this.data.timeline) {
                            this.renderMap(this.data);
                        }
                    });

                    // Snapshot the loaded state. Subsequent data mutations
                    // compare against this snapshot; only real diffs trigger
                    // an auto-save PUT. The snapshot is refreshed inside the
                    // auto-save wrapper after each successful PUT.
                    this._lastSavedSnapshot = JSON.stringify(this.data);
                    this._saveState = this.currentFileName ? 'saved' : 'idle';
                },

                /**
                 * Parses the raw JSON string into the Alpine data state and triggers a re-render.
                 * Includes handling for legacy URL zone state encoding.
                 */
                updateFromJson() {
                    try {
                        if (!this.rawJson.trim()) return;
                        const parsed = JSON.parse(this.rawJson);
                        
                        // Security/Validation check: Ensure parsed data is actually a JSON object
                        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                            throw new Error(i18next.t('js.jsonRootMustBeObject'));
                        }
                        
                        if (!parsed.events) parsed.events = [];
                        
                        if (typeof this._urlZState === 'number' && parsed.zones) {
                            parsed.zones.forEach((zone, index) => {
                                if (index < 31) {
                                    zone.collapsed = (this._urlZState & (1 << index)) !== 0;
                                }
                            });
                            this._urlZState = null;
                        }

                        this.data = parsed; // This triggers the $watch above
                        this.jsonError = '';
                        this.renderMap(this.data);
                    } catch (error) {
                        this.jsonError = 'JSON Error: ' + error.message;
                    }
                },

                /**
                 * Re-calculates layout properties and renders the D3 SVG.
                 * @param {Object} jsonData - The internal state tree representing the roadmap.
                 */
                renderMap(jsonData) {
                    try {
                        // We need to pass a clone to the layout engine to avoid mutation issues
                        const clone = JSON.parse(JSON.stringify(jsonData));
                        const normalizedData = window.app.dataModel.validateAndNormalize(clone);
                        const layout = window.app.layoutEngine.calculate(normalizedData);
                        window.app.renderer.render(layout);
                    } catch (e) {
                        // DataModel.validateAndNormalize attaches a translation
                        // key for the size-limit case; surface it
                        // as a normal NC error toast instead of a silent
                        // console-error so the user understands why the map
                        // didn't update.
                        if (e && e.code === 'js.errSizeLimit' && typeof this.dialogAlert === 'function') {
                            this.dialogAlert(i18next.t(e.code), i18next.t('js.errorTitle'));
                        }
                        console.error("Render error:", e);
                    }
                }
            }));
        });
    }

    /**
     * Sets up global event listeners, like drag-and-drop for JSON file uploads.
     */
    setupEventListeners() {
        // Drag and drop support
        const container = document.getElementById('metroviz-container');
        if (!container) return;

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.opacity = '0.5';
        });

        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.opacity = '1';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            container.style.opacity = '1';
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                
                // Security check: limit file size to prevent DoS via large files.
                // Bubble through the Alpine root's dialogAlert instead of
                // window.alert (NC convention; consistent with importJsonFromFile).
                if (file.size > 5 * 1024 * 1024) { // 5 MB
                    const root = document.getElementById('metroviz-app');
                    const state = root && root._x_dataStack && root._x_dataStack[0];
                    if (state && state.dialogAlert) {
                        state.dialogAlert(i18next.t('js.importFileTooLarge'), i18next.t('js.errorTitle'));
                    }
                    return;
                }
                
                const reader = new FileReader();
                reader.onerror = (err) => console.error('FileReader error:', err);
                reader.onload = (event) => {
                    // Need to update Alpine state instead of just DOM
                    const editor = document.getElementById('json-editor');
                    if (editor) {
                        editor.value = event.target.result;
                        // Dispatch input event so Alpine catches it
                        editor.dispatchEvent(new Event('input'));
                    }
                };
                reader.readAsText(file);
            }
        });
    }
}

// Start app when DOM is ready
// No need to wait for DOMContentLoaded here, Alpine handles initialization timing
window.app = new App();
