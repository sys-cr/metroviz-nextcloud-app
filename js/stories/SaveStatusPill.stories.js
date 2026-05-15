// Storybook stories for the Save-Status-Pill (idle / dirty / saving / saved).
// Status not by color alone — text + icon glyph carry the meaning.

function renderPill(state) {
    const labels = {
        idle: { glyph: '', text: '' },
        saving: { glyph: '⊙', text: 'Speichert…' },
        saved: { glyph: '✓', text: 'Gespeichert' },
        dirty: { glyph: '●', text: 'Ungespeicherte Änderungen' },
    };
    const l = labels[state] || labels.idle;
    return `
        <span class="save-status save-status--${state}" role="status" aria-live="polite">
            ${l.glyph ? `${l.glyph} <span>${l.text}</span>` : ''}
        </span>
    `;
}

function renderScene(state) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.innerHTML = `
        <header class="app-content-header" style="padding:8px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--color-border,#d0d0d0);">
            <h2 class="app-content-title" style="margin:0;font-size:16px;">Demo-Roadmap</h2>
            ${renderPill(state)}
        </header>
    `;
    return wrap;
}

export default {
    title: 'NC-UI / Save Status Pill',
    parameters: { layout: 'fullscreen' },
};

export const Idle = {
    name: 'Idle (no file loaded — pill hidden)',
    render: () => renderScene('idle'),
};

export const Dirty = {
    name: 'Dirty (unsaved changes)',
    render: () => renderScene('dirty'),
};

export const Saving = {
    name: 'Saving (PUT in flight)',
    render: () => renderScene('saving'),
};

export const Saved = {
    name: 'Saved (last write succeeded)',
    render: () => renderScene('saved'),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene('saved'),
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene('saved');
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene('saved');
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
