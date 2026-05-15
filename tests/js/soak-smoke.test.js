// Soak-smoke — abbreviated version of the 4 h soak plan (SOAK-TEST-PLAN.md).
//
// The real soak runs against a live NC instance for 4 hours with Playwright
// + Chrome DevTools heap snapshots. That gate needs a release
// engineer to execute and certify.
//
// This in-process smoke version runs 200 validate/serialize cycles against
// the DataModel + a representative roadmap and asserts:
//   1. No exception thrown across the run (steady-state stability).
//   2. The output object identity is fresh each cycle (no shared references
//      that would accumulate listener / DOM-node leaks in the real app).
//   3. Per-cycle wall-clock stays under 50 ms (regression guard — if the
//      validator degrades to a hot loop, this surfaces immediately).
//
// It does NOT replace the live soak — no DOM, no D3, no auto-save loop —
// but it catches the most common steady-state regressions on every
// `npm test` run.

import { describe, it, expect } from 'vitest';
import { DataModel } from '../../js/metroviz/data-model.js';

function buildRepresentativeRoadmap() {
    return {
        timeline: { start: '2024-Q1', end: '2026-Q4' },
        zones: Array.from({ length: 20 }, (_, i) => ({ id: `z${i}`, color: '#0064B0' })),
        lines: Array.from({ length: 10 }, (_, i) => ({
            id: `l${i}`,
            color: '#76D0BD',
            stations: Array.from({ length: 50 }, (_, j) => ({
                id: `l${i}s${j}`,
                date: '2024-Q2',
                label: `s ${j}`,
            })),
        })),
        events: Array.from({ length: 30 }, (_, i) => ({
            id: `e${i}`,
            date: '2024-Q3',
            label: `evt ${i}`,
        })),
    };
}

describe('Soak-smoke (in-process abbreviated)', () => {
    const ITERATIONS = 200;
    const PER_CYCLE_BUDGET_MS = 50;

    it(`runs ${ITERATIONS} validate-cycles without exception or per-cycle regression`, () => {
        const dm = new DataModel();
        const base = buildRepresentativeRoadmap();
        const seen = new Set();
        const timings = [];

        for (let i = 0; i < ITERATIONS; i++) {
            // Clone per cycle so the validator never sees the same input
            // object twice — flushes any cache that might hide a leak.
            const input = JSON.parse(JSON.stringify(base));
            const t0 = performance.now();
            const out = dm.validateAndNormalize(input);
            timings.push(performance.now() - t0);

            // Output identity must change every cycle.
            expect(seen.has(out)).toBe(false);
            seen.add(out);
        }

        // No leak heuristic: every cycle finished within budget.
        const slowest = Math.max(...timings);
        expect(slowest).toBeLessThan(PER_CYCLE_BUDGET_MS);

        // Steady-state heuristic: cycle 200 isn't > 3× cycle 1.
        // (Detects a hot-loop slow-down where each cycle takes longer.)
        const firstAvg = timings.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
        const lastAvg = timings.slice(-10).reduce((a, b) => a + b, 0) / 10;
        expect(lastAvg).toBeLessThan(firstAvg * 3 + 5);
    });
});
