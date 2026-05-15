// Stories for the Save button + its feedback dialog (success, 401 session
// expired, 403 permission denied, network error). Lets the a11y addon verify
// ARIA roles, contrast and focus order in every state.

const SAVE_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
</svg>`;

const SPINNER_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="mv-spin">
  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="42 24"/>
</svg>`;

/** Render the Save button. Variant controls aria-busy + icon. */
function renderSaveButton({ label = 'Speichern', loading = false, disabled = false }) {
    const icon = loading ? SPINNER_SVG : SAVE_ICON_SVG;
    const ariaBusy = loading ? 'true' : 'false';
    const disabledAttr = disabled ? 'disabled' : '';
    return `
        <button
            type="button"
            class="mv-save-btn"
            aria-busy="${ariaBusy}"
            ${disabledAttr}
            title="Roadmap in Nextcloud Files speichern">
            ${icon}
            <span>${label}</span>
        </button>
    `;
}

/** Render the dialog modal used for save feedback (success + errors). */
function renderFeedbackDialog({ title, message, kind = 'info' }) {
    const role = kind === 'error' ? 'alertdialog' : 'dialog';
    const ariaLive = kind === 'error' ? 'assertive' : 'polite';
    return `
        <div class="app-modal-backdrop app-modal-backdrop--above">
            <div class="app-modal"
                 role="${role}"
                 aria-live="${ariaLive}"
                 aria-labelledby="dialog-title-id"
                 aria-describedby="dialog-msg-id">
                <div class="app-modal-header">
                    <h2 id="dialog-title-id">${title}</h2>
                    <button type="button" class="app-modal-close" aria-label="Schließen">&times;</button>
                </div>
                <div class="app-modal-body">
                    <p id="dialog-msg-id">${message}</p>
                </div>
                <div class="app-modal-footer">
                    <button type="button" id="dialog-ok-btn" class="mv-primary-btn">OK</button>
                </div>
            </div>
        </div>
    `;
}

/** Compose button + (optional) dialog in a header strip for the story canvas. */
function renderScene({ button = {}, dialog = null }) {
    const wrap = document.createElement('div');
    wrap.id = 'metroviz-app';
    wrap.innerHTML = `
        <header id="header" style="padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #ddd;">
            <h1 style="font-size:16px;margin:0;">MetroViz</h1>
            <div class="controls" style="margin-left:auto;display:flex;gap:8px;">
                ${renderSaveButton(button)}
            </div>
        </header>
        ${dialog ? renderFeedbackDialog(dialog) : ''}
    `;
    return wrap;
}

export default {
    title: 'Save Button',
    parameters: {
        layout: 'fullscreen',
    },
    argTypes: {
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export const Default = {
    name: 'Default — idle',
    render: () => renderScene({ button: { loading: false } }),
};

export const Loading = {
    name: 'Loading — save in flight',
    render: () => renderScene({ button: { loading: true } }),
};

export const SuccessDialog = {
    name: 'Success — "Gespeichert"',
    render: () =>
        renderScene({
            button: {},
            dialog: {
                title: 'Gespeichert',
                kind: 'info',
                message:
                    '"my-roadmap" wurde in Nextcloud Files gespeichert. Die Datei liegt im Ordner /MetroViz.',
            },
        }),
};

export const ErrorSession401 = {
    name: 'Error 401 — Sitzung abgelaufen',
    render: () =>
        renderScene({
            button: {},
            dialog: {
                title: 'Fehler',
                kind: 'error',
                message: 'Sitzung abgelaufen — bitte die Seite neu laden, um fortzufahren.',
            },
        }),
};

export const ErrorPermission403 = {
    name: 'Error 403 — Keine Berechtigung',
    render: () =>
        renderScene({
            button: {},
            dialog: {
                title: 'Fehler',
                kind: 'error',
                message:
                    'Keine Berechtigung für diese Datei. Bitte einen Administrator kontaktieren oder die Datei-Freigaben in Nextcloud prüfen.',
            },
        }),
};

export const ErrorNetwork = {
    name: 'Error — network failure',
    render: () =>
        renderScene({
            button: {},
            dialog: {
                title: 'Fehler',
                kind: 'error',
                message: 'Fehler beim Speichern: Failed to fetch',
            },
        }),
};

export const Mobile375 = {
    name: 'Mobile 375 px',
    parameters: { viewport: { defaultViewport: 'mobile375' } },
    render: () => renderScene({ button: {} }),
};

export const DarkMode = {
    name: 'Dark mode',
    parameters: { backgrounds: { default: 'dark' } },
    render: () => {
        const node = renderScene({ button: {} });
        node.classList.add('mv-theme-dark');
        node.style.background = '#1a1a1a';
        node.style.color = '#f0f0f0';
        return node;
    },
};

export const HighContrast = {
    name: 'High contrast',
    parameters: { backgrounds: { default: 'high-contrast' } },
    render: () => {
        const node = renderScene({ button: {} });
        node.classList.add('mv-theme-hc');
        node.style.background = '#000000';
        node.style.color = '#ffffff';
        node.style.setProperty('--mv-focus-ring', '3px solid #ffff00');
        return node;
    },
};
