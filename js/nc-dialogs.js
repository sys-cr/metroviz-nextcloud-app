// Promise-based wrappers around Nextcloud's dialog and notification APIs
// (`OC.dialogs.*`, `OC.Notification.showTemporary`). Replace the upstream
// MetroViz `dialogActions` (which renders its own modal overlays) so the
// app feels native inside NC.
//
// Spread order in `js/metroviz/app.js` MUST be:
//
//   ...dialogActions          // upstream defaults
//   ...ncDialogActions        // NC overrides win
//   ...fileManagerActions
//   ...ncStorageActions
//
// All methods stay Promise-based so the upstream callers (`nc-storage.js`,
// `file-manager.js::saveAsNew`, ...) keep working unchanged.

function ncDialogsAvailable() {
    return typeof OC !== 'undefined' && OC && OC.dialogs && typeof OC.dialogs.alert === 'function';
}

function ncNotificationAvailable() {
    return (
        typeof OC !== 'undefined' &&
        OC &&
        OC.Notification &&
        typeof OC.Notification.showTemporary === 'function'
    );
}

// Save-success is the canonical "show as toast, not modal" case — a 2 s
// auto-save must never pop a blocking dialog. Matches both the i18n key
// and the resolved strings in de / en so callers can pass either.
function isSuccessTitle(title) {
    if (!title) return false;
    const t = String(title);
    return t === 'js.savedTitle' || t === 'Gespeichert' || t === 'Saved';
}

// Build a toast at the right type. Instead of binary
// "is it a success or a modal?", let callers explicitly request
// `success` / `info` / `warning` / `error` so different non-blocking
// notifications land as the right NC toast variant.
function showToast(message, type = 'info', timeout = 5) {
    if (!ncNotificationAvailable()) return false;
    const opts = { timeout };
    if (['success', 'info', 'warning', 'error'].includes(type)) {
        opts.type = type;
    }
    OC.Notification.showTemporary(String(message), opts);
    return true;
}

export const ncDialogActions = {
    dialogAlert(message, title = '') {
        if (!ncDialogsAvailable()) {
            // Test / non-NC environment — fall back to whatever the upstream
            // dialog layer provided (mocked in Vitest).
            return this.__upstream_dialogAlert
                ? this.__upstream_dialogAlert(message, title)
                : new Promise((r) => r());
        }
        if (isSuccessTitle(title) && ncNotificationAvailable()) {
            OC.Notification.showTemporary(String(message), { type: 'success', timeout: 5 });
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            OC.dialogs.info(String(message), String(title || ''), () => resolve(), true);
        });
    },

    dialogConfirm(message, title = '') {
        if (!ncDialogsAvailable()) {
            return this.__upstream_dialogConfirm
                ? this.__upstream_dialogConfirm(message, title)
                : new Promise((r) => r(false));
        }
        return new Promise((resolve) => {
            OC.dialogs.confirm(String(message), String(title || ''), (ok) => resolve(!!ok), true);
        });
    },

    // OC.dialogs.prompt callback signature: (ok: boolean, value: string).
    // Resolves to the entered string, or null if the user cancelled.
    dialogPrompt(message, defaultValue = '', title = '') {
        if (!ncDialogsAvailable() || typeof OC.dialogs.prompt !== 'function') {
            return this.__upstream_dialogPrompt
                ? this.__upstream_dialogPrompt(message, defaultValue, title)
                : new Promise((r) => r(null));
        }
        return new Promise((resolve) => {
            OC.dialogs.prompt(
                String(message),
                String(title || ''),
                (ok, value) => resolve(ok ? String(value || '') : null),
                true,
                String(defaultValue || ''),
                false
            );
        });
    },

    dialogConfirmDestructive(message, title = '', confirmLabel = '') {
        if (!ncDialogsAvailable() || typeof OC.dialogs.confirmDestructive !== 'function') {
            return this.dialogConfirm(message, title);
        }
        return new Promise((resolve) => {
            OC.dialogs.confirmDestructive(
                String(message),
                String(title || ''),
                {
                    type: OC.dialogs.YES_NO_BUTTONS,
                    confirm: String(confirmLabel || ''),
                },
                (ok) => resolve(!!ok),
                true
            );
        });
    },

    /**
     * Non-blocking toast variant. Use for transient feedback that does not
     * require acknowledgement — save status, copy-to-clipboard, etc.
     * Falls back to dialogAlert when the NC notification API is missing.
     *
     * @param {string} message - User-facing text (already localised).
     * @param {'success'|'info'|'warning'|'error'} [type='info']
     * @param {number} [timeout=5] - Seconds before auto-dismiss.
     */
    showToast(message, type = 'info', timeout = 5) {
        if (showToast(message, type, timeout)) return Promise.resolve();
        // Last-resort fallback in jsdom / outside NC.
        return this.dialogAlert(message, '');
    },

    /**
     * Destructive confirmation with a red "Confirm" button (NC pattern).
     * Resolves to true / false. Wrapper around `OC.dialogs.confirmDestructive`.
     */
    dialogConfirmDanger(message, title = '', confirmLabel = '') {
        return this.dialogConfirmDestructive(message, title, confirmLabel);
    },

    /**
     * Pick a file via NC's native FilePicker.
     * Resolves to the user-relative path string, or `null` on cancel.
     *
     * `OC.dialogs.filepicker(title, callback, multiselect, mimetype, modal, type, path, options)`
     *
     * @param {string} title            Dialog title.
     * @param {Object} [opts]
     * @param {string|string[]} [opts.mimeFilter='application/x-metroviz']
     * @param {boolean}         [opts.allowSelectDir=false] - true for save-mode (pick a directory).
     */
    dialogFilePicker(title, opts = {}) {
        const mime = opts.mimeFilter || 'application/x-metroviz';
        const isSaveMode = opts.allowSelectDir === true;
        if (!ncDialogsAvailable() || typeof OC.dialogs.filepicker !== 'function') {
            return Promise.resolve(null);
        }
        return new Promise((resolve) => {
            OC.dialogs.filepicker(
                String(title),
                (path) => resolve(typeof path === 'string' ? path : null),
                false, // multiselect
                isSaveMode ? 'httpd/unix-directory' : mime,
                true // modal
            );
        });
    },

    // NC dialogs resolve themselves; these stay defined only so any leftover
    // upstream x-bind / @click references don't throw in Alpine.
    dialogDismiss() {},
    dialogConfirmOk() {},

    // Alpine's `@keydown.escape.window` on the root calls this. NC dialogs
    // handle Escape on their own; we only need to dismiss the import modal
    // and any overlay sidebars (still MetroViz-managed).
    onEscapeModal() {
        if (this.importModalOpen) {
            this.importModalOpen = false;
            return;
        }
        if (this.navOverlayOpen) this.navOverlayOpen = false;
        if (this.editorVisible) this.editorVisible = false;
    },
};
