// Hard element-count caps.
//
// Background: post-sprint audit recommended a many-small-elements
// DoS guard above the 5 MB ?data= cap, because the existing payload-size
// limit alone does not stop a small compressed payload that explodes into
// thousands of elements once decoded. Without this guard a malicious share
// link could freeze the D3 render loop.

import { describe, it, expect } from 'vitest';
import { DataModel } from '../../js/metroviz/data-model.js';

function fixture(extra = {}) {
    return {
        timeline: { start: '2024-Q1', end: '2025-Q4' },
        zones: [],
        lines: [],
        events: [],
        ...extra,
    };
}

describe('DataModel element-count caps', () => {
    const dm = new DataModel();

    it('accepts a roadmap with realistic counts (10 lines, 50 stations, 20 zones, 30 events)', () => {
        const data = fixture({
            lines: Array.from({ length: 10 }, (_, i) => ({
                id: `l${i}`,
                stations: Array.from({ length: 50 }, (_, j) => ({
                    id: `l${i}s${j}`,
                    date: '2024-Q2',
                })),
            })),
            zones: Array.from({ length: 20 }, (_, i) => ({ id: `z${i}` })),
            events: Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, date: '2024-Q3' })),
        });
        expect(() => dm.validateAndNormalize(data)).not.toThrow();
    });

    it('rejects > 200 lines with a sized error (i18n key js.errSizeLimit)', () => {
        const data = fixture({
            lines: Array.from({ length: 201 }, (_, i) => ({ id: `l${i}`, stations: [] })),
        });
        try {
            dm.validateAndNormalize(data);
            throw new Error('expected validation to throw');
        } catch (e) {
            expect(e.code).toBe('js.errSizeLimit');
            expect(e.message).toMatch(/lines: 201/);
        }
    });

    it('rejects > 2000 stations on a single line', () => {
        const data = fixture({
            lines: [
                {
                    id: 'l1',
                    stations: Array.from({ length: 2001 }, (_, j) => ({
                        id: `s${j}`,
                        date: '2024-Q2',
                    })),
                },
            ],
        });
        expect(() => dm.validateAndNormalize(data)).toThrow(/stations on line l1: 2001/);
    });

    it('rejects > 500 zones', () => {
        const data = fixture({
            zones: Array.from({ length: 501 }, (_, i) => ({ id: `z${i}` })),
        });
        expect(() => dm.validateAndNormalize(data)).toThrow(/zones: 501/);
    });

    it('rejects > 1000 events', () => {
        const data = fixture({
            events: Array.from({ length: 1001 }, (_, i) => ({ id: `e${i}`, date: '2024-Q3' })),
        });
        expect(() => dm.validateAndNormalize(data)).toThrow(/events: 1001/);
    });

    it('reports all violating dimensions at once for a fully-oversized payload', () => {
        const data = fixture({
            lines: Array.from({ length: 250 }, (_, i) => ({ id: `l${i}`, stations: [] })),
            zones: Array.from({ length: 600 }, (_, i) => ({ id: `z${i}` })),
            events: Array.from({ length: 1500 }, (_, i) => ({ id: `e${i}`, date: '2024-Q3' })),
        });
        try {
            dm.validateAndNormalize(data);
            throw new Error('expected validation to throw');
        } catch (e) {
            expect(e.message).toMatch(/lines: 250/);
            expect(e.message).toMatch(/zones: 600/);
            expect(e.message).toMatch(/events: 1500/);
        }
    });
});
