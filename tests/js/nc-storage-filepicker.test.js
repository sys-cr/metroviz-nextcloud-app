// NC-FilePicker integration for Open / Save-As.
//
// Verifies that the new methods on ncStorageActions:
//   - call dialogFilePicker with the correct mode (file vs directory)
//   - pin window.METROVIZ_TARGET_PATH on the chosen path
//   - skip the operation gracefully when the user cancels
//   - degrade to the legacy prompt-based saveAsNew when the picker is
//     unavailable (e.g. inside Vitest without NC chrome)

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
        dialogFilePicker: vi.fn(),
        saveFile: vi.fn().mockResolvedValue(undefined),
        loadFile: vi.fn().mockResolvedValue(undefined),
        loadIndex: vi.fn(),
        saveAsNew: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.stubGlobal('OC', { currentUser: 'alice' });
    vi.stubGlobal('OC_requesttoken', 'tok');
    vi.stubGlobal('i18next', {
        t: (key) => key,
    });
    // start with no pinned path
    if (typeof window !== 'undefined') window.METROVIZ_TARGET_PATH = '';
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('openFromFilePicker', () => {
    it('pins METROVIZ_TARGET_PATH and loads the chosen file', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue('/Projekte/Roadmap.metro'),
        });

        await ncStorageActions.openFromFilePicker.call(ctx);

        expect(ctx.dialogFilePicker).toHaveBeenCalledTimes(1);
        expect(window.METROVIZ_TARGET_PATH).toBe('/Projekte/Roadmap.metro');
        expect(ctx.currentFileName).toBe('Roadmap');
        expect(ctx.loadFile).toHaveBeenCalledWith('Roadmap');
    });

    it('does nothing when the user cancels the picker', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue(null),
        });

        await ncStorageActions.openFromFilePicker.call(ctx);

        expect(window.METROVIZ_TARGET_PATH).toBe('');
        expect(ctx.loadFile).not.toHaveBeenCalled();
    });

    it('requests the .metro MIME filter', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue('/x.metro'),
        });
        await ncStorageActions.openFromFilePicker.call(ctx);
        const [, opts] = ctx.dialogFilePicker.mock.calls[0];
        expect(opts).toMatchObject({ mimeFilter: 'application/x-metroviz' });
    });
});

describe('saveAsViaFilePicker', () => {
    it('pins the new target path under <dir>/<name>.metro and saves', async () => {
        const ctx = makeCtx({
            currentFileName: 'old-name',
            dialogFilePicker: vi.fn().mockResolvedValue('/Archiv'),
            dialogPrompt: vi.fn().mockResolvedValue('new-name'),
        });

        await ncStorageActions.saveAsViaFilePicker.call(ctx);

        expect(window.METROVIZ_TARGET_PATH).toBe('/Archiv/new-name.metro');
        expect(ctx.currentFileName).toBe('new-name');
        expect(ctx.saveFile).toHaveBeenCalledTimes(1);
    });

    it('normalises a trailing slash on the chosen directory', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue('/Archiv/'),
            dialogPrompt: vi.fn().mockResolvedValue('roadmap'),
        });
        await ncStorageActions.saveAsViaFilePicker.call(ctx);
        expect(window.METROVIZ_TARGET_PATH).toBe('/Archiv/roadmap.metro');
    });

    it('aborts when the user cancels at the folder step', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue(null),
            dialogPrompt: vi.fn(),
        });
        await ncStorageActions.saveAsViaFilePicker.call(ctx);
        expect(ctx.dialogPrompt).not.toHaveBeenCalled();
        expect(ctx.saveFile).not.toHaveBeenCalled();
    });

    it('aborts when the user cancels at the name prompt', async () => {
        const ctx = makeCtx({
            dialogFilePicker: vi.fn().mockResolvedValue('/Archiv'),
            dialogPrompt: vi.fn().mockResolvedValue(null),
        });
        await ncStorageActions.saveAsViaFilePicker.call(ctx);
        expect(ctx.saveFile).not.toHaveBeenCalled();
    });

    it('falls back to legacy saveAsNew when no FilePicker wrapper is on the context', async () => {
        const ctx = makeCtx();
        delete ctx.dialogFilePicker;
        await ncStorageActions.saveAsViaFilePicker.call(ctx);
        expect(ctx.saveAsNew).toHaveBeenCalledTimes(1);
    });
});
