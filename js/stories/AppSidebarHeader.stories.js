// Storybook stories for the App-Sidebar header (right-side editor panel —
// title + close button). The sidebar itself hosts the Visual/JSON editor
// tabs; this story focuses on the header chrome only.

const ICON_CLOSE = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

function renderSidebar({ title = 'Editor', activeTab = 'visual', showBody = true }) {
    const body = showBody
        ? `
        <div id="editor-container">
            <div class="editor-tabs">
                <button class="${activeTab === 'visual' ? 'active' : ''}">Visual Editor</button>
                <button class="${activeTab === 'json' ? 'active' : ''}">JSON</button>
            </div>
            <div class="tab-content" style="padding:16px;color:var(--color-text-maxcontrast,#6b6b6b);">
                <em>Editor content area…</em>
            </div>
        </div>
    `
        : '';
    return `
        <aside id="app-sidebar" class="app-sidebar" style="display:flex;flex-direction:column;width:360px;height:480px;border-left:1px solid var(--color-border,#d0d0d0);">
            <header class="app-sidebar__header">
                <h3 class="app-sidebar__title">${title}</h3>
                <button type="button" class="app-sidebar__close" aria-label="Sidebar schließen">
                    ${ICON_CLOSE}
                </button>
            </header>
            ${body}
        </aside>
    `;
}

function renderScene(opts = {}) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'row';
    wrap.innerHTML = `
        <main style="flex:1 1 auto;background:var(--color-main-background,#fff);padding:24px;">
            <em style="color:var(--color-text-maxcontrast,#6b6b6b);">Main content area (Map)…</em>
        </main>
        ${renderSidebar(opts)}
    `;
    return wrap;
}

export default {
    title: 'NC-UI / App Sidebar Header',
    parameters: { layout: 'fullscreen' },
};

export const Default = {
    name: 'Default (Visual tab active)',
    render: () => renderScene({ title: 'Editor', activeTab: 'visual' }),
};

export const JsonTab = {
    name: 'JSON tab active',
    render: () => renderScene({ title: 'Editor', activeTab: 'json' }),
};

export const HeaderOnly = {
    name: 'Header only (no body)',
    render: () => renderScene({ title: 'Editor', showBody: false }),
};

export const LongTitle = {
    name: 'Long title (truncation guard)',
    render: () =>
        renderScene({
            title: 'Editor — Demo-Roadmap Q4 2026 mit besonders langem Titel',
            activeTab: 'visual',
        }),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => {
        const node = renderScene({ title: 'Editor', activeTab: 'visual' });
        // On mobile the sidebar takes the full screen — mimic that here.
        const aside = node.querySelector('#app-sidebar');
        if (aside) {
            aside.style.width = '100%';
            aside.style.borderLeft = 'none';
        }
        const main = node.querySelector('main');
        if (main) main.style.display = 'none';
        return node;
    },
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ title: 'Editor', activeTab: 'visual' });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ title: 'Editor', activeTab: 'visual' });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
