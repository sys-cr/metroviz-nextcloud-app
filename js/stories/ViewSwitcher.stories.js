// Storybook stories for the View-Switcher (Map ⇄ Textfassung segmented control).

const ICON_MAP = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>`;

const ICON_TEXT = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`;

function renderViewSwitcher({ active = 'map' }) {
    return `
        <div class="view-switcher" role="tablist" aria-label="Ansicht">
            <button type="button" role="tab"
                    class="${active === 'map' ? 'active' : ''}"
                    aria-selected="${active === 'map'}"
                    title="Metro-Map Ansicht">
                ${ICON_MAP}
                <span>Metro-Map</span>
            </button>
            <button type="button" role="tab"
                    class="${active === 'markdown' ? 'active' : ''}"
                    aria-selected="${active === 'markdown'}"
                    title="Textfassung">
                ${ICON_TEXT}
                <span>Textfassung</span>
            </button>
        </div>
    `;
}

function renderScene(opts = {}) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.innerHTML = `
        <header class="app-content-header" style="padding:8px 16px;display:flex;align-items:center;border-bottom:1px solid var(--color-border,#d0d0d0);">
            <div style="margin-right:auto;">
                <h2 class="app-content-title" style="margin:0;font-size:16px;">Demo-Roadmap</h2>
            </div>
            <div class="app-content-header__toolbar" style="display:flex;align-items:center;gap:4px;">
                ${renderViewSwitcher(opts)}
            </div>
        </header>
    `;
    return wrap;
}

export default {
    title: 'NC-UI / View Switcher',
    parameters: { layout: 'fullscreen' },
};

export const MapActive = {
    name: 'Map active (default)',
    render: () => renderScene({ active: 'map' }),
};

export const MarkdownActive = {
    name: 'Markdown active',
    render: () => renderScene({ active: 'markdown' }),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene({ active: 'map' }),
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ active: 'map' });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ active: 'map' });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        // HC palette: yellow primary needs black foreground on top
        // (white-on-yellow = 1.07:1, far below AA). NC's own HC theme
        // pairs `--color-primary-element-text` with the new primary —
        // the story has to override both to stay realistic.
        node.style.setProperty('--color-primary', '#ffff00');
        node.style.setProperty('--color-primary-element-text', '#000000');
        return node;
    },
};
