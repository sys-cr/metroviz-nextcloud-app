// Static assertions guarding file-viewer registration.
//   - appinfo/info.xml declares the MIME type + viewer dependency
//   - appinfo/mimetypemapping.json maps .metro → application/x-metroviz
//   - js/files-viewer-handler.js registers with OCA.Viewer and points the
//     iframe at /apps/metroviz/viewer with the fileid query param
//   - nc-storage.js honours window.METROVIZ_TARGET_PATH

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

describe('appinfo/info.xml', () => {
    const infoXml = readFileSync(resolve(root, 'appinfo/info.xml'), 'utf8');

    it('declares the application/x-metroviz MIME type', () => {
        expect(infoXml).toMatch(/<mimetype>application\/x-metroviz<\/mimetype>/);
    });

    it('declares the OCA\\Viewer app as a hard dependency', () => {
        expect(infoXml).toMatch(/<app>viewer<\/app>/);
    });
});

describe('appinfo/mimetypemapping.json', () => {
    const mapping = JSON.parse(readFileSync(resolve(root, 'appinfo/mimetypemapping.json'), 'utf8'));

    it('maps the .metro extension to application/x-metroviz', () => {
        expect(mapping.metro).toBeDefined();
        expect(mapping.metro).toContain('application/x-metroviz');
    });
});

describe('files-viewer-handler.js', () => {
    const handler = readFileSync(resolve(root, 'js/files-viewer-handler.js'), 'utf8');

    it('calls OCA.Viewer.registerHandler exactly once', () => {
        // Match only the call site (followed by `(`), not the typeof guard.
        const occurrences = (handler.match(/OCA\.Viewer\.registerHandler\s*\(/g) || []).length;
        expect(occurrences).toBe(1);
    });

    it('registers for the application/x-metroviz MIME type', () => {
        expect(handler).toMatch(/mimes\s*:\s*\[\s*['"]application\/x-metroviz['"]\s*\]/);
    });

    it('uses /apps/metroviz/viewer as the iframe target', () => {
        expect(handler).toMatch(/\/apps\/metroviz\/viewer/);
    });

    it('passes the fileid through as a query parameter', () => {
        expect(handler).toMatch(/fileid=/);
    });

    it('renders inside an <iframe> (Vue render-fn)', () => {
        // Render-fn uses `h('iframe', …)` — make sure we did not regress to a
        // template string that would need a Vue compiler.
        expect(handler).toMatch(/h\(\s*['"]iframe['"]/);
    });

    it('is plain JS, no imports / ES modules', () => {
        // OCA\Viewer loads handler scripts via plain <script> tags. Imports
        // would silently fail at runtime.
        expect(handler).not.toMatch(/^\s*import\s+/m);
        expect(handler).not.toMatch(/^\s*export\s+/m);
    });
});

describe('nc-storage path-aware', () => {
    const storage = readFileSync(resolve(root, 'js/nc-storage.js'), 'utf8');

    it('exports a getDavUrlForPath helper or honours METROVIZ_TARGET_PATH', () => {
        expect(storage).toMatch(/METROVIZ_TARGET_PATH/);
    });

    it('loadFile and saveFile both honour METROVIZ_TARGET_PATH', () => {
        // Both flows must check the global so the OCA\Viewer file gets
        // loaded AND saved at its actual NC path.
        const occurrences = (storage.match(/METROVIZ_TARGET_PATH/g) || []).length;
        expect(occurrences).toBeGreaterThanOrEqual(2);
    });
});
