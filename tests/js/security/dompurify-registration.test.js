// DEBT-002 — guard that DOMPurify remains registered in viewer.php. If a
// future bundler-migration commit drops the `Util::addScript` line for
// dompurify, the fallback regex in utils.js takes over — and that fallback
// is known to be bypassable. This static test fails the build before such
// a regression ever reaches production.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

describe('DEBT-002: DOMPurify vendor registration is load-bearing', () => {
    const viewerPhp = readFileSync(resolve(root, 'templates/viewer.php'), 'utf8');

    it('templates/viewer.php registers vendor/dompurify via addScript', () => {
        // Either form is acceptable:
        //   \OCP\Util::addScript('metroviz', 'vendor/dompurify.min')
        //   \OCP\Util::addScript('metroviz', 'vendor/dompurify')
        const ok = /Util::addScript\([^)]*vendor\/dompurify(\.min)?'\s*\)/.test(viewerPhp);
        expect(ok).toBe(true);
    });

    it('the vendored dompurify.min.js file exists on disk', () => {
        expect(existsSync(resolve(root, 'js/vendor/dompurify.min.js'))).toBe(true);
    });

    it('utils.js still routes through window.DOMPurify when available', () => {
        const utils = readFileSync(resolve(root, 'js/metroviz/utils.js'), 'utf8');
        expect(utils).toMatch(/window\.DOMPurify/);
        expect(utils).toMatch(/DOMPurify\.sanitize/);
    });
});
