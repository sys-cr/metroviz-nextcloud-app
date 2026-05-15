// generateShareLink must not produce links from
// invalid or broken JSON.
//
// Without this guard a user with a syntactically broken editor buffer
// could press "Share" and copy a corrupted link to their clipboard; the
// recipient would then get a parse-error on every open.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { urlStateActions } from '../../js/metroviz/url-state.js';

function makeCtx(overrides = {}) {
    return {
        rawJson: '{"timeline":{"start":"2024-Q1","end":"2024-Q4"},"zones":[],"lines":[]}',
        data: { zones: [] },
        dialogAlert: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

beforeEach(() => {
    vi.stubGlobal('i18next', { t: (key) => key });
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.stubGlobal('window', {
        ...(typeof window !== 'undefined' ? window : {}),
        LZString: { compressToEncodedURIComponent: vi.fn().mockReturnValue('CMP') },
        location: { origin: 'https://nc', pathname: '/index.php/apps/metroviz/viewer' },
        Alpine: { store: () => null },
        // Stub the DataModel exposed on window.app — required for the new
        // validateAndNormalize check in generateShareLink.
        app: {
            dataModel: {
                validateAndNormalize: vi.fn().mockImplementation((d) => d),
            },
        },
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('generateShareLink validation', () => {
    it('aborts when rawJson does not parse', async () => {
        const ctx = makeCtx({ rawJson: '{this is not json' });
        await urlStateActions.generateShareLink.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        expect(window.LZString.compressToEncodedURIComponent).not.toHaveBeenCalled();
        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('aborts when validateAndNormalize throws', async () => {
        window.app.dataModel.validateAndNormalize.mockImplementationOnce(() => {
            throw new Error('size cap exceeded');
        });
        const ctx = makeCtx();
        await urlStateActions.generateShareLink.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledTimes(1);
        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('proceeds when JSON parses + validates cleanly', async () => {
        const ctx = makeCtx();
        await urlStateActions.generateShareLink.call(ctx);

        expect(window.LZString.compressToEncodedURIComponent).toHaveBeenCalledTimes(1);
        expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
        // The success-dialog ("link copied") still fires after the write.
        expect(ctx.dialogAlert).toHaveBeenCalled();
    });

    it('aborts on empty rawJson before reaching the validator', async () => {
        const ctx = makeCtx({ rawJson: '   ' });
        await urlStateActions.generateShareLink.call(ctx);
        expect(window.app.dataModel.validateAndNormalize).not.toHaveBeenCalled();
        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
});
