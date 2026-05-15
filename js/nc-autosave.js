// Debounced auto-save trigger. Bursts of editor changes collapse into a
// single WebDAV PUT after `delay` ms of inactivity. The returned function
// is callable, preserves `this`, and exposes `.cancel()` to drop any
// pending save (e.g. on file unload or explicit manual save).

export function debounceAutoSave({ saveFn, delay = 2000 } = {}) {
    let timer = null;

    function trigger(...args) {
        if (timer !== null) clearTimeout(timer);
        const ctx = this;
        timer = setTimeout(() => {
            timer = null;
            saveFn.apply(ctx, args);
        }, delay);
    }

    trigger.cancel = function cancel() {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };

    return trigger;
}
