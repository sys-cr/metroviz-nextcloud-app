// Static + composition tests guarding the WebDAV-storage integration:
//   1. No file under js/metroviz/ references localStorage / sessionStorage
//      in executable code. The upstream MetroViz used localStorage as its
//      primary store; if that ever creeps back in, saves bypass NC entirely.
//   2. app.js spreads ncStorageActions AFTER fileManagerActions inside
//      Alpine.data, so the WebDAV methods win over the upstream defaults.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileManagerActions } from '../../js/metroviz/file-manager.js';
import { ncStorageActions } from '../../js/nc-storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const metrovizDir = resolve(__dirname, '../../js/metroviz');
const appJsPath = resolve(__dirname, '../../js/metroviz/app.js');

describe('no localStorage in MetroViz source tree', () => {
    it('file-manager.js contains no `localStorage` reference', () => {
        const src = readFileSync(resolve(metrovizDir, 'file-manager.js'), 'utf8');
        // Comments documenting the removal are allowed in a small allowlist block;
        // we strip block + line comments before the check.
        const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
        expect(stripped).not.toMatch(/localStorage/);
    });

    it('no js/metroviz/*.js file references localStorage in executable code', () => {
        const offenders = [];
        for (const entry of readdirSync(metrovizDir)) {
            if (!entry.endsWith('.js')) continue;
            const src = readFileSync(join(metrovizDir, entry), 'utf8');
            const stripped = src
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:])\/\/.*$/gm, '$1');
            if (/localStorage/.test(stripped)) offenders.push(entry);
        }
        expect(offenders).toEqual([]);
    });

    it('no js/metroviz/*.js file references sessionStorage in executable code', () => {
        const offenders = [];
        for (const entry of readdirSync(metrovizDir)) {
            if (!entry.endsWith('.js')) continue;
            const src = readFileSync(join(metrovizDir, entry), 'utf8');
            const stripped = src
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/(^|[^:])\/\/.*$/gm, '$1');
            if (/sessionStorage/.test(stripped)) offenders.push(entry);
        }
        expect(offenders).toEqual([]);
    });
});

describe('app.js wires ncStorageActions after fileManagerActions', () => {
    const appSrc = readFileSync(appJsPath, 'utf8');

    it('imports ncStorageActions from ../nc-storage.js (static or dynamic)', () => {
        // Either import form is acceptable. Dynamic imports were once used
        // to propagate version-string cache-busting to child modules; static
        // imports remain valid now that .htaccess handles no-cache.
        const staticImport =
            /import\s*\{\s*[^}]*ncStorageActions[^}]*\}\s*from\s*['"]\.\.\/nc-storage\.js['"]/;
        const dynamicImport = /import\(\s*['"]\.\.\/nc-storage\.js['"]/;
        expect(staticImport.test(appSrc) || dynamicImport.test(appSrc)).toBe(true);
    });

    it('spreads ncStorageActions AFTER fileManagerActions inside Alpine.data', () => {
        const fileMgrPos = appSrc.indexOf('...fileManagerActions');
        const ncStoragePos = appSrc.indexOf('...ncStorageActions');
        expect(fileMgrPos).toBeGreaterThan(-1);
        expect(ncStoragePos).toBeGreaterThan(fileMgrPos);
    });
});

describe('spread composition behavior', () => {
    it('ncStorageActions overrides fileManagerActions for shared method names', () => {
        // Simulate the same spread order app.js uses.
        const composed = {
            ...fileManagerActions,
            ...ncStorageActions,
        };
        for (const key of ['saveFile', 'loadFile', 'saveAsNew', 'loadIndex', 'saveIndex']) {
            // Either the original method is gone from fileManagerActions, or the
            // composed object resolves to the ncStorageActions implementation.
            if (typeof fileManagerActions[key] === 'function') {
                expect(composed[key]).toBe(ncStorageActions[key]);
            } else {
                expect(typeof composed[key]).toBe('function');
                expect(composed[key]).toBe(ncStorageActions[key]);
            }
        }
    });

    it('exposes the new ensureBaseFolder + deleteFile entry points', () => {
        const composed = { ...fileManagerActions, ...ncStorageActions };
        expect(typeof composed.ensureBaseFolder).toBe('function');
        expect(typeof composed.deleteFile).toBe('function');
    });
});
