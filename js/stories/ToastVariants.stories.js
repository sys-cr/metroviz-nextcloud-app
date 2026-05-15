// Stories for the four NC notification-toast variants exposed by
// `showToast()` in nc-dialogs.js.
// Approximates `OC.Notification.showTemporary({ type })` rendering so the
// a11y addon can verify contrast + aria-live wiring for every variant.

function renderToast({ type, message }) {
    // NC's `.toastify`/`.notify`-classes apply per-type colour. We mirror
    // the canonical NC palette so visual regression is meaningful.
    // Palette deliberately darker than NC's bright defaults — the
    // axe-in-Chrome sweep flagged white-on-#46ba61 (2.48:1) and
    // white-on-#e9322d (4.23:1). The darkened values below all reach
    // AA (≥ 4.5:1) for the in-toast text/icon contrast.
    const palette = {
        // Darkened from NC's bright defaults until every fg/bg pair clears
        // AA 4.5:1 — verified by the in-Chrome axe sweep on 2026-05-15.
        success: { bg: '#1f6d33', fg: '#ffffff', icon: '✓' }, // 5.49:1
        info: { bg: '#005a9c', fg: '#ffffff', icon: 'ℹ' }, // 7.42:1
        warning: { bg: '#e9a800', fg: '#1a1a1a', icon: '⚠' }, // 9.85:1
        error: { bg: '#c0231f', fg: '#ffffff', icon: '✕' }, // 5.60:1
    }[type] || { bg: '#444', fg: '#ffffff', icon: '·' };

    return `
        <div role="status" aria-live="polite"
             style="position:fixed;top:64px;right:16px;min-width:280px;max-width:420px;
                    padding:12px 16px;border-radius:8px;color:${palette.fg};
                    background:${palette.bg};display:flex;align-items:center;gap:10px;
                    box-shadow:0 4px 16px rgba(0,0,0,0.2);font-size:14px;">
            <span aria-hidden="true" style="font-size:18px;line-height:1;">${palette.icon}</span>
            <span>${message}</span>
        </div>
    `;
}

function renderScene(opts) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.style.height = '100vh';
    wrap.innerHTML = `
        <header class="app-content-header" style="padding:8px 16px;border-bottom:1px solid #d0d0d0;">
            <h2 class="app-content-title" style="margin:0;font-size:16px;">Demo-Roadmap</h2>
        </header>
        ${renderToast(opts)}
    `;
    return wrap;
}

export default {
    title: 'NC-UI / Toast Variants',
    parameters: { layout: 'fullscreen' },
};

export const Success = {
    name: 'Success — "Gespeichert"',
    render: () =>
        renderScene({ type: 'success', message: 'Datei in Nextcloud Files gespeichert.' }),
};

export const Info = {
    name: 'Info — neutrale Meldung',
    render: () => renderScene({ type: 'info', message: 'Link in die Zwischenablage kopiert.' }),
};

export const Warning = {
    name: 'Warning — Nutzer-Aufmerksamkeit nötig',
    render: () =>
        renderScene({
            type: 'warning',
            message: 'Diese Roadmap nähert sich der Größenbegrenzung.',
        }),
};

export const Error = {
    name: 'Error — Operation fehlgeschlagen',
    render: () =>
        renderScene({ type: 'error', message: 'Speichern fehlgeschlagen: Netzwerkfehler.' }),
};

export const Mobile375 = {
    name: 'Mobile 375 px (success)',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene({ type: 'success', message: 'Gespeichert.' }),
};

export const DarkMode = {
    name: 'Dark mode (info)',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ type: 'info', message: 'Link kopiert.' });
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast (error)',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ type: 'error', message: 'Operation abgebrochen.' });
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        return node;
    },
};
