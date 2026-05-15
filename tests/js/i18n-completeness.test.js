// Every translation key must exist in every supported locale.
// If a key is added to de/translation.json but forgotten in en (or vice
// versa), this test fails the build before the user sees a raw `header.foo`
// key string in the UI.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

const de = JSON.parse(readFileSync(resolve(root, 'locales/de/translation.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(root, 'locales/en/translation.json'), 'utf8'));

// Recursively flatten a nested translation object to dot-separated key
// paths (e.g. { header: { save: 'Speichern' } } → ['header.save']).
function flatKeys(obj, prefix = '') {
    const keys = [];
    for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys.push(...flatKeys(v, full));
        } else {
            keys.push(full);
        }
    }
    return keys;
}

describe('locale key parity', () => {
    const deKeys = flatKeys(de).sort();
    const enKeys = flatKeys(en).sort();

    it('de and en have the same set of translation keys', () => {
        const missingInEn = deKeys.filter((k) => !enKeys.includes(k));
        const missingInDe = enKeys.filter((k) => !deKeys.includes(k));
        expect({ missingInEn, missingInDe }).toEqual({
            missingInEn: [],
            missingInDe: [],
        });
    });

    it('no key resolves to an empty string in either locale', () => {
        const deltas = [];
        for (const k of deKeys) {
            const path = k.split('.');
            const dv = path.reduce((o, p) => o && o[p], de);
            const ev = path.reduce((o, p) => o && o[p], en);
            if (dv === '' || dv == null) deltas.push(`de.${k} = ${JSON.stringify(dv)}`);
            if (ev === '' || ev == null) deltas.push(`en.${k} = ${JSON.stringify(ev)}`);
        }
        // Allow "[TODO: translate]" markers but never
        // a silent empty string.
        expect(deltas).toEqual([]);
    });
});
