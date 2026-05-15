// Stories for the OCA\Viewer integration frame — the wrapper that surrounds
// the MetroViz SPA when it is opened by double-clicking a .metro file in
// Nextcloud Files. The real frame is a Vue render
// function inside `js/files-viewer-handler.js` mounted by OCA\Viewer; these
// stories approximate the resulting DOM so the a11y addon can verify the
// surrounding chrome (focus order, contrast, iframe title attribute).

const PLACEHOLDER_MAP_SVG = `
<svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;background:#f7f7f7;">
    <rect x="20" y="40" width="560" height="40" fill="#cfe6ff" rx="8"/>
    <line x1="40" y1="80" x2="560" y2="80" stroke="#0078D4" stroke-width="6" stroke-linecap="round"/>
    <line x1="40" y1="120" x2="500" y2="120" stroke="#e63946" stroke-width="6" stroke-linecap="round"/>
    <circle cx="100" cy="80"  r="9" fill="#0078D4"/>
    <circle cx="240" cy="80"  r="9" fill="#0078D4"/>
    <circle cx="400" cy="80"  r="9" fill="#0078D4"/>
    <circle cx="180" cy="120" r="9" fill="#e63946"/>
    <circle cx="340" cy="120" r="9" fill="#e63946"/>
    <text x="20" y="170" font-family="sans-serif" font-size="12" fill="#666">Demo-Roadmap (placeholder)</text>
</svg>`;

function renderFrame({ filename = 'Demo-Roadmap.metro', loaded = true, errored = false }) {
    // OCA\Viewer wraps the handler component inside a `.viewer__file` slot.
    // We mimic just enough to expose contrast / focus order to axe.
    return `
        <div class="viewer-modal" role="dialog" aria-label="MetroViz Viewer"
             style="position:relative;width:100%;height:520px;background:#000;color:#fff;">
            <div class="viewer-modal__header"
                 style="display:flex;align-items:center;gap:12px;padding:10px 14px;
                        background:rgba(0,0,0,0.85);">
                <button type="button" class="viewer-modal__close" aria-label="Close viewer"
                        style="background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;">
                    ✕
                </button>
                <span style="font-weight:600;">${filename}</span>
            </div>
            <div class="metroviz-viewer-frame-wrap"
                 style="position:absolute;inset:50px 0 0 0;display:flex;flex-direction:column;
                        background:var(--color-main-background,#ffffff);color:var(--color-main-text,#1a1a1a);">
                ${
                    errored
                        ? `
                    <div role="alert" style="margin:auto;padding:24px;max-width:480px;text-align:center;color:#a00;">
                        <div>Datei konnte nicht geladen werden.</div>
                        <div style="margin-top:16px;">
                            <button type="button"
                                    style="padding:8px 16px;border-radius:6px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;">
                                Erneut versuchen
                            </button>
                        </div>
                    </div>
                `
                        : loaded
                          ? `
                    <div style="flex:1 1 auto;display:flex;flex-direction:column;">
                        <div style="padding:8px 16px;border-bottom:1px solid var(--color-border,#e0e0e0);
                                    background:var(--color-main-background,#fff);">
                            <strong>${filename.replace(/\.metro$/, '')}</strong>
                        </div>
                        <div style="flex:1 1 auto;padding:16px;">
                            ${PLACEHOLDER_MAP_SVG}
                        </div>
                    </div>
                `
                          : `
                    <div style="margin:auto;padding:24px;color:var(--color-text-maxcontrast,#6b6b6b);">
                        Lade Roadmap…
                    </div>
                `
                }
            </div>
        </div>
    `;
}

function renderScene(opts = {}) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.style.height = '100vh';
    wrap.innerHTML = renderFrame(opts);
    return wrap;
}

export default {
    title: 'NC-UI / Viewer Frame',
    parameters: { layout: 'fullscreen' },
};

export const Default = {
    name: 'Default (file loaded)',
    render: () => renderScene({ filename: 'Demo-Roadmap.metro', loaded: true }),
};

export const Loading = {
    name: 'Loading state',
    render: () => renderScene({ filename: 'Migration-2026.metro', loaded: false }),
};

export const ErrorState = {
    name: 'Error — file not loadable',
    render: () => renderScene({ filename: 'Tech-Strategy.metro', errored: true }),
};

export const LongFilename = {
    name: 'Long filename (truncation)',
    render: () =>
        renderScene({
            filename: 'Plattform-Migration-Q4-2026-mit-besonders-langem-Dateinamen.metro',
            loaded: true,
        }),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene({ filename: 'Demo-Roadmap.metro', loaded: true }),
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ filename: 'Demo-Roadmap.metro', loaded: true });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ filename: 'Demo-Roadmap.metro', loaded: true });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
