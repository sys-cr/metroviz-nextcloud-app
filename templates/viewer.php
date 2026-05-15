<?php
declare(strict_types=1);

/**
 * MetroViz-NC viewer template. Hosts the Alpine.js SPA inside the Nextcloud
 * chrome.
 *
 * Schema of $_:
 *   - 'fileid'       optional Nextcloud file id (set by OCA\Viewer)
 *   - 'requesttoken' Nextcloud CSRF token
 *   - 'localesJson'  pre-serialised i18next resources (see PageController)
 *   - 'exampleJson'  pre-serialised first-run demo roadmap
 */

// Vendor scripts — all self-hosted under js/vendor/. Alpine is
// loaded LAST and deferred below so it boots after the metroviz module has
// registered its `alpine:init` listener.
\OCP\Util::addScript('metroviz', 'vendor/d3.min');
\OCP\Util::addScript('metroviz', 'vendor/i18next.min');
\OCP\Util::addScript('metroviz', 'vendor/i18next-browser-languagedetector.min');
\OCP\Util::addScript('metroviz', 'vendor/dompurify.min');
\OCP\Util::addScript('metroviz', 'vendor/marked.min');
\OCP\Util::addScript('metroviz', 'vendor/lz-string.min');
\OCP\Util::addScript('metroviz', 'vendor/jspdf.umd.min');
\OCP\Util::addScript('metroviz', 'vendor/svg2pdf.umd.min');

$nonce        = \OC::$server->getContentSecurityPolicyNonceManager()->getNonce();
$urlGenerator = \OC::$server->getURLGenerator();

// Two cache-busting strategies coexist:
//
//   1. Production build path (vite): if `js/dist/manifest.json`
//      exists, read it and emit hashed-filename URLs. Browsers can then
//      cache assets forever (immutable). Run `npm run build` to produce
//      the dist tree.
//
//   2. Development fallback: append `?v=<mtime>` to the un-bundled
//      source URL. NC's own addScript/addStyle stamps a global app
//      version that doesn't move per file, so without the mtime suffix
//      the browser holds onto stale assets for months.
//
// Prefer (1) when a manifest is present.
$_manifestPath = __DIR__ . '/../js/dist/manifest.json';
$viteManifest  = is_file($_manifestPath)
    ? json_decode(file_get_contents($_manifestPath), true)
    : null;

if (is_array($viteManifest) && isset($viteManifest['js/metroviz/app.js']['file'])) {
    $appJsUrl = $urlGenerator->linkTo('metroviz', 'js/dist/' . $viteManifest['js/metroviz/app.js']['file']);
} else {
    $_appJsPath = __DIR__ . '/../js/metroviz/app.js';
    $appVersion = is_file($_appJsPath) ? (string)filemtime($_appJsPath) : '0.1.0';
    $appJsUrl   = $urlGenerator->linkTo('metroviz', 'js/metroviz/app.js') . '?v=' . urlencode($appVersion);
}

// nc-overrides loads AFTER metroviz.css so the NC-theme-variable rules win.
$_cssMetrovizPath  = __DIR__ . '/../css/metroviz.css';
$_cssOverridesPath = __DIR__ . '/../css/nc-overrides.css';
$cssMetrovizUrl  = $urlGenerator->linkTo('metroviz', 'css/metroviz.css')
    . '?v=' . urlencode(is_file($_cssMetrovizPath) ? (string)filemtime($_cssMetrovizPath) : '0.1.0');
$cssOverridesUrl = $urlGenerator->linkTo('metroviz', 'css/nc-overrides.css')
    . '?v=' . urlencode(is_file($_cssOverridesPath) ? (string)filemtime($_cssOverridesPath) : '0.1.0');
$alpineJsUrl  = $urlGenerator->linkTo('metroviz', 'js/vendor/alpine.min.js');
$exampleUrl   = $urlGenerator->linkTo('metroviz', 'js/data/example.json');
$requesttoken = $_['requesttoken'] ?? '';
?>

<link rel="stylesheet" href="<?php p($cssMetrovizUrl); ?>">
<link rel="stylesheet" href="<?php p($cssOverridesUrl); ?>">

<script nonce="<?php p($nonce); ?>">
    // CSRF token for WebDAV writes.
    const OC_requesttoken = <?php echo json_encode($requesttoken); ?>;

    // i18n + example data injected here because NC's .htaccess blocks .json
    // requests under app directories — i18next-http-backend cannot reach them.
    window.METROVIZ_I18N_RESOURCES = <?php print_unescaped($_['localesJson']); ?>;
    window.METROVIZ_EXAMPLE_JSON   = <?php print_unescaped($_['exampleJson'] !== null ? $_['exampleJson'] : 'null'); ?>;
    // When opened via OCA\Viewer the controller resolved the fileid to a
    // user-relative path; the SPA loads/saves at exactly that path instead
    // of falling back to /MetroViz/<name>.metro.
    window.METROVIZ_TARGET_PATH = <?php echo json_encode($_['targetPath'] ?? ''); ?>;
    window.METROVIZ_TARGET_NAME = <?php echo json_encode($_['targetName'] ?? ''); ?>;
</script>

<script type="module" nonce="<?php p($nonce); ?>" src="<?php p($appJsUrl); ?>"></script>
<script defer nonce="<?php p($nonce); ?>" src="<?php p($alpineJsUrl); ?>"></script>

<div id="metroviz-app"
     data-fileid="<?php p($_['fileid'] ?? ''); ?>"
     x-data="metrovizApp"
     @focus-station.window="focusStation($event.detail.id)"
     @toggle-zone.window="const z = data.zones.find(zone => zone.id === $event.detail.id); if (z) { z.collapsed = !z.collapsed; }"
     @keydown.escape.window="onEscapeModal()">

    <!-- NC-Pattern layout: app-navigation (left) | app-content (center) | app-sidebar (right).
         On viewports < 1024 px both side-panels become overlays; the scrim below
         dims the content and closes them on tap. -->

    <div class="app-overlay-scrim"
         x-show="navOverlayOpen || editorVisible"
         x-cloak
         @click="navOverlayOpen = false; editorVisible = false"
         aria-hidden="true"></div>

    <aside id="app-navigation" class="app-navigation"
           :class="{ 'app-navigation--overlay-open': navOverlayOpen }">
        <ul class="app-navigation__list">
            <li class="app-navigation-new">
                <button type="button" class="app-navigation-new__button"
                        @click="createNew(); navOverlayOpen = false"
                        :title="$store.i18n.t('header.newTitle')">
                    <svg viewBox="0 0 24 24" class="app-navigation__icon" aria-hidden="true" focusable="false"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    <span x-text="$store.i18n.t('header.new')">Neu</span>
                </button>
            </li>
            <li class="app-navigation-separator" role="presentation"></li>
            <template x-for="name in savedFiles" :key="name">
                <li class="app-navigation-entry"
                    :class="{'app-navigation-entry--active': name === currentFileName}">
                    <button type="button" class="app-navigation-entry__link"
                            @click="currentFileName = name; loadFile(name); navOverlayOpen = false">
                        <svg viewBox="0 0 24 24" class="app-navigation__icon" aria-hidden="true" focusable="false"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
                        <span class="app-navigation-entry__label" x-text="name"></span>
                    </button>
                </li>
            </template>
        </ul>
    </aside>

    <main id="app-content" class="app-content">

        <header class="app-content-header">
            <div class="app-content-header__title">
                <!-- On narrow viewports the entire title acts as the nav-toggle
                     (Slack/Discord pattern); a chevron below the text hints at
                     the dropdown affordance. On desktop the button is inert
                     (tabindex -1, no chevron) — the nav is always visible. -->
                <button type="button" class="app-content-header__title-trigger"
                        :tabindex="isNarrowViewport ? '0' : '-1'"
                        @click="if (isNarrowViewport) navOverlayOpen = !navOverlayOpen"
                        :aria-expanded="isNarrowViewport ? (navOverlayOpen ? 'true' : 'false') : null"
                        :aria-label="isNarrowViewport ? ($store.i18n.t('header.toggleNav') || 'Dateiliste') : null">
                <h2 class="app-content-title">
                    <span x-text="currentFileName || $store.i18n.t('header.unsaved')">MetroViz</span>
                </h2>
                    <svg class="app-content-header__title-chevron"
                         viewBox="0 0 24 24" aria-hidden="true" focusable="false"
                         :style="navOverlayOpen ? 'transform: rotate(180deg)' : ''">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                </button>
                <span class="save-status" :class="'save-status--' + (_saveState || 'idle')"
                      role="status" aria-live="polite">
                    <span x-show="_saveState === 'saving'" x-cloak>⊙ <span x-text="$store.i18n.t('header.saving') || 'Speichert…'">Speichert…</span></span>
                    <span x-show="_saveState === 'saved'"  x-cloak>✓ <span x-text="$store.i18n.t('js.savedTitle') || 'Gespeichert'">Gespeichert</span></span>
                    <span x-show="_saveState === 'dirty'"  x-cloak>● <span x-text="$store.i18n.t('header.unsavedChanges') || 'Ungespeicherte Änderungen'">Ungespeicherte Änderungen</span></span>
                </span>
            </div>
            <div class="app-content-header__toolbar">
                <div class="view-switcher" role="tablist" :aria-label="$store.i18n.t('header.viewSwitcher')">
                    <button type="button" role="tab"
                            :class="{'active': globalView === 'map'}"
                            :aria-selected="globalView === 'map'"
                            @click="globalView = 'map'"
                            :title="$store.i18n.t('header.viewMapTitle')">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>
                        <span x-text="$store.i18n.t('header.viewMap')">Metro-Map</span>
                    </button>
                    <button type="button" role="tab"
                            :class="{'active': globalView === 'markdown'}"
                            :aria-selected="globalView === 'markdown'"
                            @click="globalView = 'markdown'"
                            :title="$store.i18n.t('header.viewMarkdownTitle')">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
                        <span x-text="$store.i18n.t('header.viewMarkdown')">Textfassung</span>
                    </button>
                </div>

                <button type="button" class="app-content-header__action"
                        @click="shareViaNextcloud()"
                        :title="$store.i18n.t('header.shareTitle')">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                    <span x-text="$store.i18n.t('header.share')">Teilen</span>
                </button>

                <!--
                    Action menu (3-dots). Markup is a plain <ul> of buttons —
                    NOT role="menu" — because we don't implement the full
                    WAI-ARIA Menu Pattern (arrow-key navigation, type-ahead).
                    Tab/Shift+Tab is sufficient for a button list; Escape and
                    focus-leave close it.
                -->
                <div x-data="{ menuOpen: false, exportOpen: false }"
                     @click.away="menuOpen = false; exportOpen = false"
                     @keydown.escape.window="menuOpen = false; exportOpen = false"
                     @focusout="if (!$el.contains($event.relatedTarget)) { menuOpen = false; exportOpen = false; }"
                     class="action-menu-wrapper">
                    <button type="button"
                            class="app-content-header__action action-menu-trigger"
                            @click="menuOpen = !menuOpen"
                            :aria-expanded="menuOpen ? 'true' : 'false'"
                            :aria-haspopup="'menu'"
                            :title="$store.i18n.t('header.moreActions')"
                            :aria-label="$store.i18n.t('header.moreActions')">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                    <ul x-show="menuOpen" x-cloak class="action-menu-list">
                        <li>
                            <button type="button" @click="saveFile(); menuOpen = false"
                                    :title="$store.i18n.t('header.saveTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
                                <span x-text="$store.i18n.t('header.save')">Speichern</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" @click="saveAsViaFilePicker(); menuOpen = false"
                                    :title="$store.i18n.t('header.saveAsTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                <span x-text="$store.i18n.t('header.saveAs') || $store.i18n.t('header.copy')">Speichern unter…</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" @click="openFromFilePicker(); menuOpen = false"
                                    :title="$store.i18n.t('header.openTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                                <span x-text="$store.i18n.t('header.open')">Öffnen…</span>
                            </button>
                        </li>
                        <li class="action-menu-separator" role="separator"></li>
                        <li>
                            <button type="button" @click="importModalOpen = true; menuOpen = false"
                                    :title="$store.i18n.t('header.importTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
                                <span x-text="$store.i18n.t('header.import')">Importieren</span>
                            </button>
                        </li>
                        <li class="action-menu-submenu" @click.stop>
                            <button type="button"
                                    @click="exportOpen = !exportOpen"
                                    :aria-expanded="exportOpen ? 'true' : 'false'"
                                    :title="$store.i18n.t('header.exportTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                <span x-text="$store.i18n.t('header.export')">Exportieren</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="action-menu-chevron"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
                            </button>
                            <ul x-show="exportOpen" x-cloak class="action-menu-submenu-list">
                                <li><button type="button" @click="exportSVG(); menuOpen = false; exportOpen = false" x-text="$store.i18n.t('header.exportSvg')">als SVG Map</button></li>
                                <li><button type="button" @click="exportPNG(); menuOpen = false; exportOpen = false" x-text="$store.i18n.t('header.exportPng')">als PNG Map</button></li>
                                <li><button type="button" @click="exportPDF(); menuOpen = false; exportOpen = false" x-text="$store.i18n.t('header.exportPdf')">als PDF Map</button></li>
                                <li><button type="button" @click="exportJSON(); menuOpen = false; exportOpen = false" x-text="$store.i18n.t('header.exportJson')">als JSON</button></li>
                                <li><button type="button" @click="exportMD(); menuOpen = false; exportOpen = false" x-text="$store.i18n.t('header.exportMd')">als Markdown</button></li>
                            </ul>
                        </li>
                        <li class="action-menu-separator" role="separator"></li>
                        <li>
                            <button type="button" @click="resortAndClean(); menuOpen = false"
                                    :title="$store.i18n.t('header.cleanupTitle')">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
                                <span x-text="$store.i18n.t('header.cleanup')">Aufräumen</span>
                            </button>
                        </li>
                    </ul>
                </div>

                <button type="button" class="app-content-header__action edit-toggle"
                        :class="{'active': editorVisible}"
                        :aria-pressed="editorVisible ? 'true' : 'false'"
                        @click="editorVisible = !editorVisible"
                        :title="$store.i18n.t('header.toggleEditor')">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span x-text="$store.i18n.t('header.edit')">Edit</span>
                </button>
            </div>
        </header>

        <div id="metroviz-container" x-show="globalView === 'map'"></div>
        <div id="tooltip" class="tooltip hidden"></div>

        <div id="markdown-container" x-show="globalView === 'markdown'" class="markdown-container" x-cloak>
            <div class="markdown-body markdown-content" x-html="renderMarkdown()"></div>
        </div>
    </main>

    <aside id="app-sidebar" class="app-sidebar" x-show="editorVisible" x-cloak>
        <header class="app-sidebar__header">
            <h3 class="app-sidebar__title" x-text="$store.i18n.t('editor.tabVisual') || 'Editor'">Editor</h3>
            <button type="button" class="app-sidebar__close"
                    @click="editorVisible = false"
                    :aria-label="$store.i18n.t('header.closeSidebar')">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </header>
        <div id="editor-container">
            <div class="editor-tabs">
                <button :class="{'active': activeTab === 'visual'}" @click="activeTab = 'visual'" x-text="$store.i18n.t('editor.tabVisual')">Visual Editor</button>
                <button :class="{'active': activeTab === 'json'}" @click="activeTab = 'json'" x-text="$store.i18n.t('editor.tabJson')">JSON</button>
            </div>
            
            <div class="tab-content" x-show="activeTab === 'json'">
                <textarea id="json-editor" spellcheck="false"
                          :aria-label="$store.i18n.t('editor.tabJson')"
                          x-model="rawJson" @input="updateFromJson()"></textarea>
                <div id="editor-error" :class="{'hidden': !jsonError}" x-text="jsonError"></div>
            </div>

            <div class="tab-content visual-editor" x-show="activeTab === 'visual'" x-cloak>
                
                <div class="editor-section-container">
                    <div class="section-header-top">
                        <h3 class="editor-section-title" x-text="$store.i18n.t('editor.meta')">Metadaten</h3>
                    </div>
                    <div class="editor-section">
                        <div class="form-group">
                            <label>

                                <span x-text="$store.i18n.t('editor.title')">Titel</span>

                                <input type="text" x-model="data.meta.title">

                            </label>
                        </div>
                        <div class="form-group">
                            <label>

                                <span x-text="$store.i18n.t('editor.organization')">Organisation</span>

                                <input type="text" x-model="data.meta.organization">

                            </label>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>

                                    <span x-text="$store.i18n.t('editor.start')">Start (z.B. 2020-Q1)</span>

                                    <input type="text" x-model="data.timeline.start">

                                </label>
                            </div>
                            <div class="form-group">
                                <label>

                                    <span x-text="$store.i18n.t('editor.end')">Ende (z.B. 2030-Q4)</span>

                                    <input type="text" x-model="data.timeline.end">

                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="editor-section-container">
                    <div class="section-header-top">
                        <h3 class="editor-section-title" x-text="$store.i18n.t('editor.eventsTitle')">Events (Deadlines, Termine)</h3>
                        <button class="btn-small" @click="addEvent()" x-text="$store.i18n.t('editor.addEvent')">+ Event</button>
                    </div>
                    <div class="editor-section">
                        <template x-for="(event, index) in data.events" :key="event.id || index">
                            <div class="card" :id="'editor-event-' + (event.id || index)">
                                <div class="form-row">
                                    <div class="form-group" style="flex: 1;">
                                        <label>

                                            <span x-text="$store.i18n.t('editor.label')">Label</span>

                                            <input type="text" x-model="event.label">

                                        </label>
                                    </div>
                                    <div class="form-group" style="width: 110px; flex: none;">
                                        <label>

                                            <span x-text="$store.i18n.t('editor.date')">Datum</span>

                                            <input type="text" x-model="event.date" placeholder="2025-Q1">

                                        </label>
                                    </div>
                                    <div class="form-group event-actions" style="flex: none;">
                                        <button class="btn-icon btn-danger" @click="removeEvent(index)" :title="$store.i18n.t('editor.deleteEvent')">✕</button>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="editor-section-container">
                    <div class="section-header-top">
                        <h3 class="editor-section-title" x-text="$store.i18n.t('editor.zonesTitle')">Zonen (Themenbereiche)</h3>
                        <button class="btn-small" @click="addZone()" x-text="$store.i18n.t('editor.addZone')">+ Zone</button>
                    </div>
                    <div class="editor-section">
                        <template x-for="(zone, index) in data.zones" :key="getObjKey(zone)">
                            <div class="card" :id="'editor-zone-' + (zone.id || index)" x-data="{ collapsed: true }" @expand-zone="collapsed = false">
                                <div class="zone-header-row"
                                     role="button"
                                     tabindex="0"
                                     :aria-expanded="!collapsed"
                                     @click="collapsed = !collapsed"
                                     @keydown.enter.prevent="collapsed = !collapsed"
                                     @keydown.space.prevent="collapsed = !collapsed">
                                    <div class="flex-center-gap">
                                        <div class="zone-color-dot" :style="'background-color: ' + zone.color"></div>
                                        <strong x-text="zone.label || $store.i18n.t('editor.newZone')" class="zone-title"></strong>
                                    </div>
                                    <div class="zone-actions">
                                        <button class="btn-icon btn-icon-sm" @click.stop="moveZoneUp(index)" :disabled="index === 0" :title="$store.i18n.t('editor.moveUp')">↑</button>
                                        <button class="btn-icon btn-icon-sm" @click.stop="moveZoneDown(index)" :disabled="index === data.zones.length - 1" :title="$store.i18n.t('editor.moveDown')">↓</button>
                                        <button class="btn-icon btn-danger btn-icon-xs" @click.stop="removeZone(index)" :title="$store.i18n.t('editor.delete')">✕</button>
                                        <span x-text="collapsed ? '▼' : '▲'" class="collapse-icon"></span>
                                    </div>
                                </div>
                                
                                <div x-show="!collapsed" class="zone-content">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label>

                                                <span x-text="$store.i18n.t('editor.id')">ID</span>

                                                <input type="text" x-model="zone.id">

                                            </label>
                                        </div>
                                        <div class="form-group metro-color-field" x-data="{ paletteOpen: false }" @click.outside="paletteOpen = false">
                                            <label x-text="$store.i18n.t('editor.color')">Farbe</label>
                                            <button type="button" x-ref="metroPaletteTrigger" class="metro-color-trigger" :style="'background-color:' + (zone.color || '#cccccc')" @click.stop="paletteOpen = !paletteOpen; if (paletteOpen) $nextTick(() => $nextTick(() => window.metrovizPositionPalette($refs.metroPaletteTrigger, $refs.metroPaletteMenu)))" :aria-expanded="paletteOpen" :title="$store.i18n.t('editor.chooseColor')"></button>
                                            <div class="metro-palette-dropdown" x-ref="metroPaletteMenu" x-show="paletteOpen" x-cloak @click.stop role="group" :aria-label="$store.i18n.t('editor.color') + ': ' + (zone.label || zone.id)">
                                                <div class="metro-palette metro-palette--compact">
                                                    <template x-if="zone.color && !colorInMetroPalette(zone.color)">
                                                        <button type="button" class="metro-swatch metro-swatch--compact metro-swatch--custom metro-swatch--active" :style="'background-color:' + zone.color" :title="$store.i18n.t('editor.currentColorNotInPalette')" tabindex="-1" aria-hidden="true"></button>
                                                    </template>
                                                    <template x-for="c in metroPalette" :key="c">
                                                        <button type="button" class="metro-swatch metro-swatch--compact" :style="'background-color:' + c" :title="c" :class="{ 'metro-swatch--active': paletteColorsEqual(zone.color, c) }" @click="zone.color = c; paletteOpen = false"></button>
                                                    </template>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>

                                            <span x-text="$store.i18n.t('editor.label')">Label</span>

                                            <input type="text" x-model="zone.label" class="w-100">

                                        </label>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="editor-section-container">
                    <div class="section-header-top">
                        <h3 class="editor-section-title" x-text="$store.i18n.t('editor.linesTitle')">Linien (Technologien)</h3>
                        <button class="btn-small" @click="addLine()" x-text="$store.i18n.t('editor.addLine')">+ Linie</button>
                    </div>
                    <div class="editor-section">
                        <template x-for="(line, lineIndex) in data.lines" :key="line.id || lineIndex">
                            <div class="card line-card" :id="'editor-line-' + (line.id || lineIndex)" :style="`border-left-color: ${line.color}; --line-color: ${line.color}`" x-data="{ collapsed: true }" @expand-line="collapsed = false">
                                <div class="line-header line-header-row"
                                     role="button"
                                     tabindex="0"
                                     :aria-expanded="!collapsed"
                                     @click="collapsed = !collapsed"
                                     @keydown.enter.prevent="collapsed = !collapsed"
                                     @keydown.space.prevent="collapsed = !collapsed">
                                    <strong x-text="line.label || $store.i18n.t('editor.newLine')" class="line-title"></strong>
                                    <div class="line-actions">
                                        <button class="btn-icon btn-icon-sm" @click.stop="moveLineUp(lineIndex)" :disabled="!canMoveLineUp(lineIndex)" :title="$store.i18n.t('editor.moveUp')">↑</button>
                                        <button class="btn-icon btn-icon-sm" @click.stop="moveLineDown(lineIndex)" :disabled="!canMoveLineDown(lineIndex)" :title="$store.i18n.t('editor.moveDown')">↓</button>
                                        <button class="btn-icon btn-danger btn-icon-xs" @click.stop="removeLine(lineIndex)" :title="$store.i18n.t('editor.deleteLine')">✕</button>
                                        <span x-text="collapsed ? '▼' : '▲'" class="collapse-icon"></span>
                                    </div>
                                </div>

                                <div x-show="!collapsed" class="line-content">
                                    <div class="form-row">
                                        <div class="form-group flex-2">
                                            <label>

                                                <span x-text="$store.i18n.t('editor.name')">Name</span>

                                                <input type="text" x-model="line.label">

                                            </label>
                                        </div>
                                        <div class="form-group metro-color-field flex-1" x-data="{ paletteOpen: false }" @click.outside="paletteOpen = false">
                                            <label x-text="$store.i18n.t('editor.color')">Farbe</label>
                                            <button type="button" x-ref="metroPaletteTrigger" class="metro-color-trigger" :style="'background-color:' + (line.color || '#0078D4')" @click.stop="paletteOpen = !paletteOpen; if (paletteOpen) $nextTick(() => $nextTick(() => window.metrovizPositionPalette($refs.metroPaletteTrigger, $refs.metroPaletteMenu)))" :aria-expanded="paletteOpen" :title="$store.i18n.t('editor.chooseColor')"></button>
                                            <div class="metro-palette-dropdown" x-ref="metroPaletteMenu" x-show="paletteOpen" x-cloak @click.stop role="group" :aria-label="$store.i18n.t('editor.color') + ': ' + (line.label || line.id)">
                                                <div class="metro-palette metro-palette--compact">
                                                    <template x-if="line.color && !colorInMetroPalette(line.color)">
                                                        <button type="button" class="metro-swatch metro-swatch--compact metro-swatch--custom metro-swatch--active" :style="'background-color:' + line.color" :title="$store.i18n.t('editor.currentColorNotInPalette')" tabindex="-1" aria-hidden="true"></button>
                                                    </template>
                                                    <template x-for="c in metroPalette" :key="c">
                                                        <button type="button" class="metro-swatch metro-swatch--compact" :style="'background-color:' + c" :title="c" :class="{ 'metro-swatch--active': paletteColorsEqual(line.color, c) }" @click="line.color = c; paletteOpen = false"></button>
                                                    </template>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group flex-1">
                                            <label>

                                                <span x-text="$store.i18n.t('editor.zone')">Zone</span>

                                                <select x-model="line.zone">
                                                    <template x-for="z in data.zones">
                                                        <option :value="z.id" x-text="z.label" :selected="z.id === line.zone"></option>
                                                    </template>
                                                </select>
                                            </label>
                                        </div>
                                    </div>

                                    <div class="stations-container">
                                        <div class="section-header">
                                            <h4 x-text="$store.i18n.t('editor.stationsTitle')">Stationen</h4>
                                            <button class="btn-small" @click="addStation(line)" x-text="$store.i18n.t('editor.addStation')">+ Station</button>
                                        </div>
                                        <template x-for="(station, stationIndex) in line.stations" :key="stationIndex">
                                            <div class="card station-card" :id="'editor-station-' + station.id">
                                                <div class="station-header-row">
                                                    <input type="text" x-model="station.label" :placeholder="$store.i18n.t('editor.stationName')" class="flex-grow-1">
                                                    <button class="btn-icon btn-danger" @click="removeStation(line, stationIndex)">✕</button>
                                                </div>
                                                <div class="form-row">
                                                    <div class="form-group flex-1">
                                                        <label>

                                                            <span x-text="$store.i18n.t('editor.date')">Datum</span>

                                                            <input type="text" x-model="station.date" placeholder="2022-Q1">

                                                        </label>
                                                    </div>
                                                    <div class="form-group flex-2">
                                                        <label>

                                                            <span x-text="$store.i18n.t('editor.type')">Typ</span>

                                                            <select x-model="station.type" @change="handleTypeChange(station)">
                                                                <option value="existing" x-text="$store.i18n.t('editor.typeExisting')">Bestehend</option>
                                                                <option value="start" x-text="$store.i18n.t('editor.typeStart')">Start</option>
                                                                <option value="milestone" x-text="$store.i18n.t('editor.typeMilestone')">Meilenstein</option>
                                                                <option value="transfer" x-text="$store.i18n.t('editor.typeTransfer')">Transfer</option>
                                                                <option value="terminus" x-text="$store.i18n.t('editor.typeTerminus')">Ende</option>
                                                            </select>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div class="form-row">
                                                    <div class="form-group checkbox-group">
                                                        <input type="checkbox" x-model="station.tint" :id="'tint-' + station.id" class="w-auto">
                                                        <label :for="'tint-' + station.id" class="checkbox-label" x-text="$store.i18n.t('editor.tintLine')">Linie verblassen</label>
                                                    </div>
                                                    <div class="form-group checkbox-group">
                                                        <input type="checkbox" x-model="station.isStop" :id="'stop-' + station.id" class="w-auto">
                                                        <label :for="'stop-' + station.id" class="checkbox-label" x-text="$store.i18n.t('editor.isStop')">Haltestelle</label>
                                                    </div>
                                                    <div class="form-group checkbox-group">
                                                        <input type="checkbox" x-model="station.flipLabel" :id="'flip-' + station.id" class="w-auto">
                                                        <label :for="'flip-' + station.id" class="checkbox-label" x-text="$store.i18n.t('editor.flipLabel')">Label spiegeln</label>
                                                    </div>
                                                </div>

                                                <template x-if="['transfer', 'terminus'].includes(station.type)">
                                                    <div class="form-group mt-2">
                                                        <label>

                                                            <span x-text="$store.i18n.t('editor.transferToFrom')">Transfer zu/von Station</span>

                                                            <select x-model="station.transferTo" @change="handleTransferChange(station)">
                                                                <option value="" x-text="$store.i18n.t('editor.noTransfer')">-- Kein Transfer --</option>
                                                                <template x-for="s in getAllStations(station.id)">
                                                                    <option :value="s.id" x-text="s.label + ' (' + s.lineLabel + ')'" :selected="s.id === station.transferTo"></option>
                                                                </template>
                                                            </select>
                                                        </label>
                                                    </div>
                                                </template>

                                                <div class="form-group mt-2">
                                                    <label x-text="$store.i18n.t('editor.relations')">Beziehungen</label>
                                                    <template x-for="(rel, relIdx) in (station.relations || [])" :key="relIdx">
                                                        <div class="form-row relation-row">
                                                            <select x-model="rel.kind" class="relation-kind">
                                                                <option value="dependsOn" x-text="$store.i18n.t('editor.relDependsOn')">Abhängig von</option>
                                                                <option value="synchronizedWith" x-text="$store.i18n.t('editor.relSynchronized')">Zeitgleich mit</option>
                                                            </select>
                                                            <select x-model="rel.target" class="relation-target">
                                                                <option value="" x-text="$store.i18n.t('editor.relTarget')">-- Ziel --</option>
                                                                <template x-for="s in getAllStations(station.id)">
                                                                    <option :value="s.id" x-text="s.label + ' (' + s.lineLabel + ')'"></option>
                                                                </template>
                                                            </select>
                                                            <input type="text" x-model="rel.label" :placeholder="$store.i18n.t('editor.relNote')" class="relation-note">
                                                            <button type="button" class="btn-icon btn-danger" @click="removeStationRelation(station, relIdx)" :title="$store.i18n.t('editor.relRemove')">✕</button>
                                                        </div>
                                                    </template>
                                                    <button type="button" class="btn-small" @click="addStationRelation(station)" x-text="$store.i18n.t('editor.addRelation')">+ Beziehung</button>
                                                </div>

                                                <div class="form-row mt-2" x-data="{ showDesc: false }">
                                                    <div class="w-100">
                                                        <button class="btn-small btn-desc-toggle" @click="showDesc = !showDesc" x-text="showDesc ? $store.i18n.t('editor.descHide') : (station.description ? $store.i18n.t('editor.descEdit') : $store.i18n.t('editor.descAdd'))"></button>
                                                        <div x-show="showDesc" class="mt-2">
                                                            <textarea x-model="station.description" :placeholder="$store.i18n.t('editor.descPlaceholder')" rows="4" class="desc-textarea"></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
                
            </div>
        </div>
    </aside>

</div>
