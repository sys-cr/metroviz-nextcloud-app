// loadFile rejects > 5 MB responses.
//
// The drop / import path in file-manager.js already guards a 5 MB cap;
// the WebDAV GET path did not. A shared file path could otherwise deliver
// arbitrarily large JSON and freeze the viewer on open.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ncStorageActions } from '../../js/nc-storage.js';

function makeCtx(overrides = {}) {
    return {
        savedFiles: [],
        currentFileName: '',
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
    vi.stubGlobal('OC', { currentUser: 'alice' });
    vi.stubGlobal('OC_requesttoken', 'tok');
    vi.stubGlobal('i18next', { t: (key) => key });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('loadFile size cap', () => {
    it('refuses to parse a response with Content-Length > 5 MB', async () => {
        const oversized = '0'.repeat(10); // body content irrelevant — header drives the check
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: {
                    get: (h) =>
                        h.toLowerCase() === 'content-length' ? String(6 * 1024 * 1024) : null,
                },
                text: async () => oversized,
            })
        );
        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'big');

        expect(ctx.dialogAlert).toHaveBeenCalledWith(
            expect.stringMatching(/js\.errFileTooLarge|exceeds the 5 MB/i),
            'js.errorTitle'
        );
        expect(ctx.updateFromJson).not.toHaveBeenCalled();
        expect(ctx.rawJson).toBe('');
    });

    it('refuses to parse a response whose body length > 5 MB even without Content-Length', async () => {
        const big = 'x'.repeat(5 * 1024 * 1024 + 1);
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: { get: () => null },
                text: async () => big,
            })
        );
        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'big');

        expect(ctx.dialogAlert).toHaveBeenCalledWith(
            expect.stringMatching(/js\.errFileTooLarge|exceeds the 5 MB/i),
            'js.errorTitle'
        );
        expect(ctx.updateFromJson).not.toHaveBeenCalled();
    });

    it('accepts a normal-sized response and updates state', async () => {
        const normal = JSON.stringify({
            timeline: { start: '2024-Q1', end: '2024-Q4' },
            zones: [],
            lines: [],
        });
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                headers: { get: () => '1024' },
                text: async () => normal,
            })
        );
        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'normal');

        expect(ctx.rawJson).toBe(normal);
        expect(ctx.updateFromJson).toHaveBeenCalledTimes(1);
        expect(ctx.currentFileName).toBe('normal');
    });
});
