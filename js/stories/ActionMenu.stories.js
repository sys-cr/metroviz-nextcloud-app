// Storybook stories for the Action Menu (3-dots dropdown with Save / SaveAs
// / Import / Export-Submenu / Cleanup). Keyboard accessible button list,
// no role=menu by design.

const ICON_DOTS = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

const ICON_SAVE = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`;

const ICON_COPY = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;

const ICON_IMPORT = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`;

const ICON_EXPORT = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;

const ICON_CLEANUP = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`;

const ICON_CHEVRON = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="action-menu-chevron"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>`;

function renderActionMenu({ menuOpen = false, exportOpen = false }) {
    const list = menuOpen
        ? `
        <ul class="action-menu-list">
            <li><button type="button">${ICON_SAVE}<span>Speichern</span></button></li>
            <li><button type="button">${ICON_COPY}<span>Speichern als…</span></button></li>
            <li class="action-menu-separator" role="separator"></li>
            <li><button type="button">${ICON_IMPORT}<span>Importieren</span></button></li>
            <li class="action-menu-submenu">
                <button type="button" aria-expanded="${exportOpen}">
                    ${ICON_EXPORT}<span>Exportieren</span>${ICON_CHEVRON}
                </button>
                ${
                    exportOpen
                        ? `
                    <ul class="action-menu-submenu-list">
                        <li><button type="button">als SVG Map</button></li>
                        <li><button type="button">als PNG Map</button></li>
                        <li><button type="button">als PDF Map</button></li>
                        <li><button type="button">als JSON</button></li>
                        <li><button type="button">als Markdown</button></li>
                    </ul>
                `
                        : ''
                }
            </li>
            <li class="action-menu-separator" role="separator"></li>
            <li><button type="button">${ICON_CLEANUP}<span>Aufräumen</span></button></li>
        </ul>
    `
        : '';
    return `
        <div class="action-menu-wrapper">
            <button type="button"
                    class="app-content-header__action action-menu-trigger"
                    aria-expanded="${menuOpen}"
                    aria-label="Mehr Aktionen">
                ${ICON_DOTS}
            </button>
            ${list}
        </div>
    `;
}

function renderScene(opts = {}) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    // Force a tall container so the open menu (≈ 280 px) doesn't get
    // clipped by `#metroviz-app { overflow: hidden }`. In the live app
    // the container fills the viewport (~900 px) so the menu fits; the
    // story needs to match that to give an accurate visual.
    wrap.style.minHeight = '480px';
    wrap.innerHTML = `
        <header class="app-content-header" style="padding:8px 16px;display:flex;align-items:center;border-bottom:1px solid var(--color-border,#d0d0d0);">
            <h2 class="app-content-title" style="margin:0;font-size:16px;margin-right:auto;">Demo-Roadmap</h2>
            <div class="app-content-header__toolbar" style="display:flex;align-items:center;gap:4px;position:relative;">
                ${renderActionMenu(opts)}
            </div>
        </header>
        <div style="height:420px;"></div>
    `;
    return wrap;
}

export default {
    title: 'NC-UI / Action Menu',
    parameters: { layout: 'fullscreen' },
};

export const Closed = {
    name: 'Closed (default)',
    render: () => renderScene({ menuOpen: false }),
};

export const Open = {
    name: 'Open (top-level menu)',
    render: () => renderScene({ menuOpen: true, exportOpen: false }),
};

export const OpenWithSubmenu = {
    name: 'Open + Export submenu',
    render: () => renderScene({ menuOpen: true, exportOpen: true }),
};

export const Mobile375 = {
    name: 'Mobile 375 px (open)',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene({ menuOpen: true }),
};

export const DarkMode = {
    name: 'Dark mode (open)',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ menuOpen: true });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast (open)',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ menuOpen: true });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
