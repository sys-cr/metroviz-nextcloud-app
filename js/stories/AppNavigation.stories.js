// Storybook stories for the App-Navigation file list (left sidebar).

const ICON_PLUS = `
<svg viewBox="0 0 24 24" class="app-navigation__icon" aria-hidden="true" focusable="false"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;

const ICON_FILE = `
<svg viewBox="0 0 24 24" class="app-navigation__icon" aria-hidden="true" focusable="false"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>`;

function renderNavigation({ files = ['Demo-Roadmap'], active = 'Demo-Roadmap' }) {
    const entries = files
        .map(
            (name) => `
        <li class="app-navigation-entry ${name === active ? 'app-navigation-entry--active' : ''}">
            <button type="button" class="app-navigation-entry__link">
                ${ICON_FILE}
                <span class="app-navigation-entry__label">${name}</span>
            </button>
        </li>
    `
        )
        .join('');
    return `
        <aside id="app-navigation" class="app-navigation">
            <ul class="app-navigation__list">
                <li class="app-navigation-new">
                    <button type="button" class="app-navigation-new__button" title="Neue Roadmap anlegen">
                        ${ICON_PLUS}
                        <span>Neu</span>
                    </button>
                </li>
                <li class="app-navigation-separator" role="presentation"></li>
                ${entries}
            </ul>
        </aside>
    `;
}

function renderScene(opts = {}) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.style.display = 'flex';
    wrap.style.height = '480px';
    wrap.innerHTML =
        renderNavigation(opts) +
        `
        <main style="flex:1 1 auto;background:var(--color-main-background,#fff);padding:24px;">
            <em style="color:var(--color-text-maxcontrast,#6b6b6b);">Main content area (Map / Markdown)…</em>
        </main>
    `;
    return wrap;
}

export default {
    title: 'NC-UI / App Navigation',
    parameters: { layout: 'fullscreen' },
};

export const SingleFile = {
    name: 'One file (active)',
    render: () => renderScene({ files: ['Demo-Roadmap'], active: 'Demo-Roadmap' }),
};

export const MultipleFiles = {
    name: 'Multiple files, one active',
    render: () =>
        renderScene({
            files: ['Demo-Roadmap', 'Migration-2026', 'Tech-Strategy', 'Backlog'],
            active: 'Migration-2026',
        }),
};

export const Empty = {
    name: 'Empty (no files yet)',
    render: () => renderScene({ files: [], active: '' }),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () =>
        renderScene({
            files: ['Demo-Roadmap', 'Migration-2026'],
            active: 'Demo-Roadmap',
        }),
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({
            files: ['Demo-Roadmap', 'Migration-2026'],
            active: 'Demo-Roadmap',
        });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({
            files: ['Demo-Roadmap', 'Migration-2026'],
            active: 'Demo-Roadmap',
        });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
