// DEBT-001 — color values are constrained to a hex-only whitelist so the
// inline `:style="'background-color: ' + zone.color"` bindings in
// viewer.php cannot be turned into a CSS-injection vector via crafted
// import data (Deck-Sync, share-link import, JSON paste).

import { describe, it, expect } from 'vitest';
import { DataModel } from '../../js/metroviz/data-model.js';

const FALLBACK = '#6b6b6b';

function fixture(overrides = {}) {
    return {
        timeline: { start: '2024-Q1', end: '2025-Q4' },
        zones: [],
        lines: [],
        events: [],
        ...overrides,
    };
}

describe('DEBT-001: DataModel color whitelist', () => {
    const dm = new DataModel();

    it('accepts canonical #RRGGBB hex colors on zones', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ id: 'z1', color: '#0064B0' }],
            })
        );
        expect(out.zones[0].color).toBe('#0064B0');
    });

    it('accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [
                    { id: 'z1', color: '#fff' },
                    { id: 'z2', color: '#fffa' },
                    { id: 'z3', color: '#ffffff' },
                    { id: 'z4', color: '#ffffff80' },
                ],
            })
        );
        expect(out.zones.map((z) => z.color)).toEqual(['#fff', '#fffa', '#ffffff', '#ffffff80']);
    });

    it('rejects rgb() and hsl() functional notation', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [
                    { id: 'z1', color: 'rgb(255, 0, 0)' },
                    { id: 'z2', color: 'hsl(200, 50%, 50%)' },
                ],
            })
        );
        expect(out.zones[0].color).toBe(FALLBACK);
        expect(out.zones[1].color).toBe(FALLBACK);
    });

    it('rejects named CSS colors (potential vector for value chaining)', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ id: 'z1', color: 'red' }],
            })
        );
        expect(out.zones[0].color).toBe(FALLBACK);
    });

    it('neutralises CSS-injection payloads', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [
                    { id: 'a', color: 'red; background: url(//evil/)' },
                    { id: 'b', color: '#000; expression(alert(1))' },
                    { id: 'c', color: '"; -webkit-binding: url(#x);' },
                    { id: 'd', color: '   ' },
                    { id: 'e', color: '' },
                ],
            })
        );
        for (const z of out.zones) {
            expect(z.color).toBe(FALLBACK);
        }
    });

    it('rejects non-string values (number, null, object)', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [
                    { id: 'a', color: 0xff0000 },
                    { id: 'b', color: null },
                    { id: 'c', color: { hex: '#fff' } },
                ],
            })
        );
        for (const z of out.zones) {
            expect(z.color).toBe(FALLBACK);
        }
    });

    it('leaves color unset when none is provided (does not invent one)', () => {
        const out = dm.validateAndNormalize(
            fixture({
                zones: [{ id: 'z1' }],
            })
        );
        expect(out.zones[0].color).toBeUndefined();
    });

    it('also sanitises line.color', () => {
        const out = dm.validateAndNormalize(
            fixture({
                lines: [
                    { id: 'l1', color: '#abcdef', stations: [] },
                    { id: 'l2', color: 'javascript:alert(1)', stations: [] },
                ],
            })
        );
        expect(out.lines[0].color).toBe('#abcdef');
        expect(out.lines[1].color).toBe(FALLBACK);
    });

    it('also sanitises event.color', () => {
        const out = dm.validateAndNormalize(
            fixture({
                events: [
                    { date: '2024-Q2', color: '#ff0000' },
                    { date: '2024-Q3', color: 'url(http://evil/)' },
                ],
            })
        );
        const colours = out.events.map((e) => e.color);
        expect(colours).toContain('#ff0000');
        expect(colours).toContain(FALLBACK);
    });
});
