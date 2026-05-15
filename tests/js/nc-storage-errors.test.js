// Save/Load error-mapping tests: HTTP 401 maps to the "session expired"
// i18n key, 403 to "permission denied", and the silent-save option
// suppresses the success dialog (used by auto-save and the demo bootstrap).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ncStorageActions } from '../../js/nc-storage.js';

function makeCtx(overrides = {}) {
    return {
        savedFiles: [],
        currentFileName: 'roadmap-x',
        rawJson: '',
        data: { lines: [], stations: [] },
        updateFromJson: vi.fn(),
        dialogAlert: vi.fn().mockResolvedValue(undefined),
        dialogConfirm: vi.fn().mockResolvedValue(true),
        dialogPrompt: vi.fn().mockResolvedValue('roadmap-x'),
        loadIndex: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.stubGlobal('OC', { currentUser: 'testuser' });
    vi.stubGlobal('OC_requesttoken', 'test-csrf-token');
    vi.stubGlobal('i18next', {
        t: (key, opts) => (opts?.name ? `${key}:${opts.name}` : key),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('saveFile error mapping', () => {
    it('401 -> dialogAlert receives js.errSession key', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message, title] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.errSession');
        expect(title).toContain('js.errorTitle');
    });

    it('403 -> dialogAlert receives js.errPermission key', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.errPermission');
    });

    it('5xx -> dialogAlert receives generic js.saveError with HTTP code', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.saveError');
        expect(message).toContain('502');
    });

    it('2xx -> dialogAlert receives savedSuccess title (no error path)', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce({ ok: true, status: 201 }) // PUT
                .mockResolvedValueOnce({
                    ok: true,
                    status: 207,
                    text: async () =>
                        '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>',
                }) // PROPFIND from loadIndex
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalled();
        const [_, title] = ctx.dialogAlert.mock.calls[0];
        expect(title).toContain('js.savedTitle');
    });
});

describe('silent save', () => {
    it('saveFile() shows success dialog by default', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce({ ok: true, status: 201 }) // PUT
                .mockResolvedValueOnce({
                    ok: true,
                    status: 207,
                    text: async () =>
                        '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>',
                }) // PROPFIND
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx);
        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [, title] = ctx.dialogAlert.mock.calls[0];
        expect(title).toContain('js.savedTitle');
    });

    it('saveFile({silent:true}) suppresses the success dialog', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce({ ok: true, status: 201 })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 207,
                    text: async () =>
                        '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"></d:multistatus>',
                })
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx, { silent: true });
        expect(ctx.dialogAlert).not.toHaveBeenCalled();
    });

    it('saveFile({silent:true}) still surfaces errors via dialogAlert', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.saveFile.call(ctx, { silent: true });
        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.errPermission');
    });
});

describe('loadFile error mapping', () => {
    it('401 -> dialogAlert receives js.errSession key', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'roadmap-x');

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.errSession');
    });

    it('403 -> dialogAlert receives js.errPermission key', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => '' })
        );
        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'roadmap-x');

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        const [message] = ctx.dialogAlert.mock.calls[0];
        expect(message).toContain('js.errPermission');
    });
});
