// Native Nextcloud sharing integration.
//
// shareViaNextcloud() prefers OCA.Files.Sidebar.open() with the 'sharing'
// tab if available (new NC), falls back to plain open() (older NC), and
// finally to the upstream MetroViz share-link if Sidebar isn't on the page.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ncStorageActions } from '../../js/nc-storage.js';

function makeCtx(overrides = {}) {
    return {
        generateShareLink: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

beforeEach(() => {
    if (typeof window !== 'undefined') window.METROVIZ_TARGET_PATH = '';
    vi.stubGlobal('console', { ...console, warn: vi.fn() });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (typeof window !== 'undefined') {
        delete window.METROVIZ_TARGET_PATH;
    }
});

describe('shareViaNextcloud', () => {
    it('opens OCA.Files.Sidebar with the sharing tab when both target-path and the API are present', async () => {
        window.METROVIZ_TARGET_PATH = '/Projekte/Roadmap.metro';
        const open = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('OCA', { Files: { Sidebar: { open } } });
        const ctx = makeCtx();

        await ncStorageActions.shareViaNextcloud.call(ctx);

        expect(open).toHaveBeenCalledWith('/Projekte/Roadmap.metro', 'sharing');
        expect(ctx.generateShareLink).not.toHaveBeenCalled();
    });

    it('retries Sidebar.open() without the tab argument if the first call throws', async () => {
        window.METROVIZ_TARGET_PATH = '/x.metro';
        const open = vi
            .fn()
            .mockRejectedValueOnce(new Error('tab not supported'))
            .mockResolvedValueOnce(undefined);
        vi.stubGlobal('OCA', { Files: { Sidebar: { open } } });
        const ctx = makeCtx();

        await ncStorageActions.shareViaNextcloud.call(ctx);

        expect(open).toHaveBeenCalledTimes(2);
        expect(open.mock.calls[1]).toEqual(['/x.metro']);
        expect(ctx.generateShareLink).not.toHaveBeenCalled();
    });

    it('falls back to the upstream share-link when Sidebar.open keeps throwing', async () => {
        window.METROVIZ_TARGET_PATH = '/x.metro';
        const open = vi.fn().mockRejectedValue(new Error('nope'));
        vi.stubGlobal('OCA', { Files: { Sidebar: { open } } });
        const ctx = makeCtx();

        await ncStorageActions.shareViaNextcloud.call(ctx);

        expect(ctx.generateShareLink).toHaveBeenCalledTimes(1);
    });

    it('falls back to the upstream share-link when OCA.Files.Sidebar is not loaded', async () => {
        window.METROVIZ_TARGET_PATH = '/x.metro';
        // No OCA stub.
        const ctx = makeCtx();
        await ncStorageActions.shareViaNextcloud.call(ctx);
        expect(ctx.generateShareLink).toHaveBeenCalledTimes(1);
    });

    it('falls back to the upstream share-link when no target path is pinned (top-bar entry)', async () => {
        // No METROVIZ_TARGET_PATH — Sidebar needs a path to open.
        const open = vi.fn();
        vi.stubGlobal('OCA', { Files: { Sidebar: { open } } });
        const ctx = makeCtx();
        await ncStorageActions.shareViaNextcloud.call(ctx);
        expect(open).not.toHaveBeenCalled();
        expect(ctx.generateShareLink).toHaveBeenCalledTimes(1);
    });

    it('is a no-op (no throw) when both Sidebar and generateShareLink are missing', async () => {
        const ctx = {};
        await expect(ncStorageActions.shareViaNextcloud.call(ctx)).resolves.toBeUndefined();
    });
});
