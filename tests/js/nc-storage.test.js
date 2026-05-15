// Unit tests for js/nc-storage.js — Nextcloud WebDAV storage adapter

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ncStorageActions } from '../../js/nc-storage.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal 207 Multi-Status XML response for PROPFIND */
function buildPropfindXml(entries) {
    const responses = entries
        .map(
            ({ href, contentType }) => `
      <d:response>
        <d:href>${href}</d:href>
        <d:propstat>
          <d:prop>
            <d:getcontenttype>${contentType}</d:getcontenttype>
          </d:prop>
          <d:status>HTTP/1.1 200 OK</d:status>
        </d:propstat>
      </d:response>`
        )
        .join('');
    return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">${responses}</d:multistatus>`;
}

/** Creates a fresh context object that mimics the Alpine.js component state */
function makeCtx(overrides = {}) {
    return {
        savedFiles: [],
        currentFileName: '',
        rawJson: '',
        data: { lines: [], stations: [] },
        updateFromJson: vi.fn(),
        dialogAlert: vi.fn().mockResolvedValue(undefined),
        dialogConfirm: vi.fn().mockResolvedValue(true),
        dialogPrompt: vi.fn().mockResolvedValue('new-roadmap'),
        saveAsNew: vi.fn(),
        saveFile: vi.fn(),
        loadIndex: vi.fn(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadIndex
// ---------------------------------------------------------------------------

describe('loadIndex', () => {
    it('parses 207 XML and populates savedFiles with .metro filenames', async () => {
        const xml = buildPropfindXml([
            {
                href: '/remote.php/dav/files/testuser/MetroViz/',
                contentType: 'httpd/unix-directory',
            },
            {
                href: '/remote.php/dav/files/testuser/MetroViz/my-roadmap.metro',
                contentType: 'application/x-metroviz',
            },
            {
                href: '/remote.php/dav/files/testuser/MetroViz/another.metro',
                contentType: 'application/x-metroviz',
            },
        ]);

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, status: 207, text: async () => xml })
        );

        const ctx = makeCtx();
        await ncStorageActions.loadIndex.call(ctx);

        expect(ctx.savedFiles).toEqual(['my-roadmap', 'another']);
    });

    it('also picks up .metro files by href suffix (any content-type)', async () => {
        const xml = buildPropfindXml([
            { href: '/remote.php/dav/files/testuser/MetroViz/fallback.metro', contentType: '' },
        ]);

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, status: 207, text: async () => xml })
        );

        const ctx = makeCtx();
        await ncStorageActions.loadIndex.call(ctx);

        expect(ctx.savedFiles).toContain('fallback');
    });

    it('sets savedFiles to [] when PROPFIND returns a non-207 error', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' })
        );

        const ctx = makeCtx({ savedFiles: ['stale'] });
        await ncStorageActions.loadIndex.call(ctx);

        expect(ctx.savedFiles).toEqual([]);
    });

    it('sets savedFiles to [] when fetch throws a network error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

        const ctx = makeCtx({ savedFiles: ['stale'] });
        await ncStorageActions.loadIndex.call(ctx);

        expect(ctx.savedFiles).toEqual([]);
    });

    it('sends the CSRF requesttoken header', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 207,
            text: async () => buildPropfindXml([]),
        });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx();
        await ncStorageActions.loadIndex.call(ctx);

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers).toMatchObject({ requesttoken: 'test-csrf-token' });
    });
});

// ---------------------------------------------------------------------------
// saveIndex
// ---------------------------------------------------------------------------

describe('saveIndex', () => {
    it('is a no-op and does not throw', () => {
        const ctx = makeCtx();
        expect(() => ncStorageActions.saveIndex.call(ctx)).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// loadFile
// ---------------------------------------------------------------------------

describe('loadFile', () => {
    it('fetches the .metro file and sets rawJson and currentFileName', async () => {
        const fileContent = JSON.stringify({ lines: [], stations: [] });
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => fileContent })
        );

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'my-roadmap');

        expect(ctx.rawJson).toBe(fileContent);
        expect(ctx.currentFileName).toBe('my-roadmap');
        expect(ctx.updateFromJson).toHaveBeenCalledOnce();
    });

    it('calls dialogAlert on 404 and does not set currentFileName', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' })
        );

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'missing');

        expect(ctx.dialogAlert).toHaveBeenCalledOnce();
        expect(ctx.currentFileName).toBe('');
    });

    it('calls dialogAlert on network error', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'bad-file');

        expect(ctx.dialogAlert).toHaveBeenCalledOnce();
    });

    it('does nothing when name is empty', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, '');

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends the CSRF requesttoken header', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '{}',
        });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'roadmap');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers).toMatchObject({ requesttoken: 'test-csrf-token' });
    });

    it('URL-encodes the filename in the WebDAV path', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '{}',
        });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx();
        await ncStorageActions.loadFile.call(ctx, 'my roadmap & more');

        const [url] = mockFetch.mock.calls[0];
        expect(url).toContain('my%20roadmap%20%26%20more');
    });
});

// ---------------------------------------------------------------------------
// saveFile
// ---------------------------------------------------------------------------

describe('saveFile', () => {
    it('PUT sends JSON body with correct URL and Content-Type header', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx({
            currentFileName: 'my-roadmap',
            data: { lines: ['L1'], stations: [] },
            loadIndex: vi.fn().mockResolvedValue(undefined),
            dialogAlert: vi.fn().mockResolvedValue(undefined),
        });

        await ncStorageActions.saveFile.call(ctx);

        const [url, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('PUT');
        expect(url).toContain('/MetroViz/my-roadmap.metro');
        expect(options.headers).toMatchObject({
            'Content-Type': 'application/x-metroviz',
            requesttoken: 'test-csrf-token',
        });
        expect(JSON.parse(options.body)).toEqual(ctx.data);
    });

    it('calls loadIndex() after a successful PUT to refresh file list', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

        const loadIndex = vi.fn().mockResolvedValue(undefined);
        const ctx = makeCtx({
            currentFileName: 'x',
            loadIndex,
            dialogAlert: vi.fn().mockResolvedValue(undefined),
        });

        await ncStorageActions.saveFile.call(ctx);

        expect(loadIndex).toHaveBeenCalledOnce();
    });

    it('calls dialogAlert when PUT returns an error status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

        const ctx = makeCtx({ currentFileName: 'x' });
        await ncStorageActions.saveFile.call(ctx);

        expect(ctx.dialogAlert).toHaveBeenCalledOnce();
    });

    it('delegates to saveAsNew() when currentFileName is empty', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        const saveAsNew = vi.fn().mockResolvedValue(undefined);
        const ctx = makeCtx({ currentFileName: '', saveAsNew });

        await ncStorageActions.saveFile.call(ctx);

        expect(saveAsNew).toHaveBeenCalledOnce();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// saveAsNew
// ---------------------------------------------------------------------------

describe('saveAsNew', () => {
    it('prompts the user, sets currentFileName and calls saveFile()', async () => {
        const saveFile = vi.fn().mockResolvedValue(undefined);
        const ctx = makeCtx({
            dialogPrompt: vi.fn().mockResolvedValue('brand-new'),
            saveFile,
        });

        await ncStorageActions.saveAsNew.call(ctx);

        expect(ctx.currentFileName).toBe('brand-new');
        expect(saveFile).toHaveBeenCalledOnce();
    });

    it('does nothing when user cancels the prompt (returns null)', async () => {
        const saveFile = vi.fn();
        const ctx = makeCtx({
            dialogPrompt: vi.fn().mockResolvedValue(null),
            saveFile,
        });

        await ncStorageActions.saveAsNew.call(ctx);

        expect(saveFile).not.toHaveBeenCalled();
    });

    it('does nothing when user confirms an empty name', async () => {
        const saveFile = vi.fn();
        const ctx = makeCtx({
            dialogPrompt: vi.fn().mockResolvedValue('   '),
            saveFile,
        });

        await ncStorageActions.saveAsNew.call(ctx);

        expect(saveFile).not.toHaveBeenCalled();
    });

    it('asks for overwrite confirmation when filename already exists', async () => {
        const saveFile = vi.fn().mockResolvedValue(undefined);
        const dialogConfirm = vi.fn().mockResolvedValue(true);
        const ctx = makeCtx({
            savedFiles: ['existing'],
            dialogPrompt: vi.fn().mockResolvedValue('existing'),
            dialogConfirm,
            saveFile,
        });

        await ncStorageActions.saveAsNew.call(ctx);

        expect(dialogConfirm).toHaveBeenCalledOnce();
        expect(saveFile).toHaveBeenCalledOnce();
    });

    it('aborts when user declines overwrite confirmation', async () => {
        const saveFile = vi.fn();
        const ctx = makeCtx({
            savedFiles: ['existing'],
            dialogPrompt: vi.fn().mockResolvedValue('existing'),
            dialogConfirm: vi.fn().mockResolvedValue(false),
            saveFile,
        });

        await ncStorageActions.saveAsNew.call(ctx);

        expect(saveFile).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// deleteFile
// ---------------------------------------------------------------------------

describe('deleteFile', () => {
    it('sends DELETE to the correct URL after confirmation', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', mockFetch);

        const loadIndex = vi.fn().mockResolvedValue(undefined);
        const ctx = makeCtx({
            dialogConfirm: vi.fn().mockResolvedValue(true),
            loadIndex,
        });

        await ncStorageActions.deleteFile.call(ctx, 'old-map');

        const [url, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('DELETE');
        expect(url).toContain('/MetroViz/old-map.metro');
    });

    it('calls loadIndex() after successful DELETE', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

        const loadIndex = vi.fn().mockResolvedValue(undefined);
        const ctx = makeCtx({ dialogConfirm: vi.fn().mockResolvedValue(true), loadIndex });

        await ncStorageActions.deleteFile.call(ctx, 'old-map');

        expect(loadIndex).toHaveBeenCalledOnce();
    });

    it('clears currentFileName if the deleted file was active', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));

        const ctx = makeCtx({
            currentFileName: 'old-map',
            dialogConfirm: vi.fn().mockResolvedValue(true),
            loadIndex: vi.fn().mockResolvedValue(undefined),
        });

        await ncStorageActions.deleteFile.call(ctx, 'old-map');

        expect(ctx.currentFileName).toBe('');
    });

    it('does not DELETE when user cancels confirmation', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx({ dialogConfirm: vi.fn().mockResolvedValue(false) });
        await ncStorageActions.deleteFile.call(ctx, 'old-map');

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does nothing when name is empty', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx();
        await ncStorageActions.deleteFile.call(ctx, '');

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls dialogAlert when DELETE returns an error status', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

        const ctx = makeCtx({ dialogConfirm: vi.fn().mockResolvedValue(true) });
        await ncStorageActions.deleteFile.call(ctx, 'old-map');

        expect(ctx.dialogAlert).toHaveBeenCalledOnce();
    });

    it('sends the CSRF requesttoken header', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeCtx({
            dialogConfirm: vi.fn().mockResolvedValue(true),
            loadIndex: vi.fn().mockResolvedValue(undefined),
        });

        await ncStorageActions.deleteFile.call(ctx, 'roadmap');

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers).toMatchObject({ requesttoken: 'test-csrf-token' });
    });
});
