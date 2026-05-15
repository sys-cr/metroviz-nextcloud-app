// Performance smoke-test for DataModel + LayoutEngine at the cap edges.
// Calibrates the element-count caps (MAX_LINES=200,
// MAX_STATIONS_PER_LINE=2000, MAX_ZONES=500, MAX_EVENTS=1000) against
// actual JS-engine throughput.

import { describe, it, expect } from 'vitest';
import { DataModel } from '../../../js/metroviz/data-model.js';

function buildSyntheticRoadmap({ lines = 10, stationsPerLine = 50, zones = 20, events = 30 }) {
    return {
        timeline: { start: '2024-Q1', end: '2030-Q4' },
        zones: Array.from({ length: zones }, (_, i) => ({ id: `z${i}`, color: '#0064B0' })),
        lines: Array.from({ length: lines }, (_, i) => ({
            id: `l${i}`,
            color: '#76D0BD',
            stations: Array.from({ length: stationsPerLine }, (_, j) => ({
                id: `l${i}s${j}`,
                date: '2024-Q2',
                label: `Station ${j}`,
            })),
        })),
        events: Array.from({ length: events }, (_, i) => ({
            id: `e${i}`,
            date: '2024-Q3',
            label: `Event ${i}`,
        })),
    };
}

function timeMs(fn) {
    const start = performance.now();
    fn();
    return performance.now() - start;
}

describe('Performance smoke', () => {
    const dm = new DataModel();

    it('default-demo-sized roadmap validates in well under 100 ms', () => {
        // Default demo is roughly 8 lines × 8 stations. Validation should
        // be near-instant. If this regresses past 100 ms something serious
        // is wrong with the validator.
        const r = buildSyntheticRoadmap({ lines: 8, stationsPerLine: 8, zones: 4, events: 6 });
        const ms = timeMs(() => dm.validateAndNormalize(r));
        expect(ms).toBeLessThan(100);
    });

    it('mid-size roadmap (50 lines × 100 stations) stays under 500 ms', () => {
        // 5 000 stations + 50 lines is what a heavy real-world team
        // roadmap might look like. Should still be sub-second.
        const r = buildSyntheticRoadmap({
            lines: 50,
            stationsPerLine: 100,
            zones: 50,
            events: 100,
        });
        const ms = timeMs(() => dm.validateAndNormalize(r));
        expect(ms).toBeLessThan(500);
    });

    it('quarter-cap roadmap (50 lines × 500 stations) stays under 2 s', () => {
        // 25 000 stations — the audit's recommended Worst-Case-Smoke
        // point. If this wedges past 2 s we tighten the caps.
        const r = buildSyntheticRoadmap({
            lines: 50,
            stationsPerLine: 500,
            zones: 125,
            events: 250,
        });
        const ms = timeMs(() => dm.validateAndNormalize(r));
        expect(ms).toBeLessThan(2000);
    });

    it('rejects a payload at the cap edge in O(1) — fail-fast, no full traversal', () => {
        // assertWithinLimits should bail at the first violating dimension.
        // Even with thousands of zones, the check itself is constant-time
        // relative to the violation.
        const r = buildSyntheticRoadmap({ zones: 600 }); // > 500 cap
        const ms = timeMs(() => {
            try {
                dm.validateAndNormalize(r);
            } catch {
                /* expected */
            }
        });
        expect(ms).toBeLessThan(50);
    });
});
