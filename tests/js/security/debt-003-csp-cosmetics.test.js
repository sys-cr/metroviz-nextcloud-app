// DEBT-003 — three small CSP-related hardenings flagged by the
// CSP-Eval-Vektor-Code-Walk on 2026-05-14:
//   1. ?data= URL-parameter has a 5 MB size cap (LZ-bomb DoS guard).
//   2. PageController emits locale JSON without JSON_UNESCAPED_SLASHES so
//      `</script>` in a future translation cannot break the inline tag.
//   3. DataModel.validateAndNormalize sanitises `id` fields against an
//      [A-Za-z0-9_-]{1,64} whitelist (attribute-injection guard).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataModel } from '../../../js/metroviz/data-model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../../..');

function fixture(extra = {}) {
    return {
        timeline: { start: '2024-Q1', end: '2025-Q4' },
        zones: [],
        lines: [],
        events: [],
        ...extra,
    };
}

describe('DEBT-003 (1): url-state.js caps ?data= length', () => {
    const src = readFileSync(resolve(root, 'js/metroviz/url-state.js'), 'utf8');

    it('checks the raw query length before decompressing', () => {
        expect(src).toMatch(/MAX_DATA_BYTES/);
        // Cap value is explicit (5 MB).
        expect(src).toMatch(/5\s*\*\s*1024\s*\*\s*1024/);
    });

    it('aborts on oversize without calling decompress', () => {
        // Make sure the early-return / warn precedes the decompress call.
        const decompressIdx = src.indexOf('decompressFromEncodedURIComponent');
        const guardIdx = src.indexOf('MAX_DATA_BYTES');
        expect(guardIdx).toBeGreaterThan(-1);
        expect(decompressIdx).toBeGreaterThan(guardIdx);
    });
});

describe('DEBT-003 (2): PageController inlines JSON without unescaped slashes', () => {
    const src = readFileSync(resolve(root, 'lib/Controller/PageController.php'), 'utf8');

    it('removes JSON_UNESCAPED_SLASHES from the inline encodes', () => {
        // Match the flag only inside json_encode() flag positions, not in
        // explanatory comments. A flag appears immediately after a `|` or
        // as a bare arg inside `json_encode(`.
        const callSiteFlag = /json_encode\([^)]*JSON_UNESCAPED_SLASHES/;
        expect(src).not.toMatch(callSiteFlag);
    });
});

describe('DEBT-003 (3): DataModel ID-whitelist', () => {
    const dm = new DataModel();

    it('accepts conventional alphanumeric / dash / underscore ids', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ id: 'zone_1', color: '#ffffff' }],
                lines: [{ id: 'line-A', stations: [{ id: 'st_42', date: '2024-Q2' }] }],
                events: [{ id: 'evt-1', date: '2024-Q3' }],
            })
        );
        expect(out.zones[0].id).toBe('zone_1');
        expect(out.lines[0].id).toBe('line-A');
        expect(out.lines[0].stations[0].id).toBe('st_42');
        expect(out.events[0].id).toBe('evt-1');
    });

    it('strips attribute-injection payloads from ids', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [
                    { id: 'x" onmouseover="alert(1)' },
                    { id: '<script>alert(1)</script>' },
                    { id: 'ok\ttab' },
                    { id: 'space inside' },
                ],
            })
        );
        for (const z of out.zones) {
            expect(z.id).toBe('');
        }
    });

    it('caps ids at 64 chars', () => {
        const tooLong = 'a'.repeat(65);
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ id: tooLong }],
            })
        );
        expect(out.zones[0].id).toBe('');
    });

    it('leaves id untouched when not present', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ color: '#fff' }],
            })
        );
        expect(out.zones[0].id).toBeUndefined();
    });

    it('propagates the sanitised line.id to its stations.lineId', () => {
        // Tampered line id is dropped — and stations must not carry the
        // tampered original through lineId either.
        const out = dm.validateAndNormalize(
            fixture({
                lines: [{ id: 'l1<script>', stations: [{ date: '2024-Q2' }] }],
            })
        );
        expect(out.lines[0].id).toBe('');
        expect(out.lines[0].stations[0].lineId).toBe('');
    });
});
