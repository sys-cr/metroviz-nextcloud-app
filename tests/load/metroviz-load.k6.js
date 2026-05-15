// k6 load-test for MetroViz-NC.
//
// Runs against a real Nextcloud instance with a pre-seeded test user.
// Mirrors the realistic load profile of a 50-person pilot:
//
//   - 50 virtual users
//   - Each opens MetroViz, loads a sample .metro file, edits, saves.
//   - 5 minutes sustained.
//   - Pass criteria: P95 < 500 ms, error rate < 0.1 %
//
// Run locally (after installing k6 — https://k6.io):
//
//   K6_NC_BASE=https://nc.example.com \
//   K6_NC_USER=loadtest \
//   K6_NC_PASS=app-password \
//   k6 run tests/load/metroviz-load.k6.js
//
// Run in CI: the GitHub Actions workflow has a `load-test` job that is
// gated behind the `release-candidate` label (manually applied to PRs
// that are candidates for a tag).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE = __ENV.K6_NC_BASE || 'http://localhost:8080';
const USER = __ENV.K6_NC_USER || 'loadtest';
const PASS = __ENV.K6_NC_PASS || 'changeme';

const SAMPLE_METRO = JSON.stringify({
    timeline: { start: '2024-Q1', end: '2026-Q4' },
    zones: [{ id: 'z1', color: '#0064B0' }],
    lines: [
        {
            id: 'l1',
            color: '#76D0BD',
            stations: [
                { id: 'l1s1', date: '2024-Q2', label: 'kickoff' },
                { id: 'l1s2', date: '2025-Q1', label: 'beta' },
                { id: 'l1s3', date: '2026-Q1', label: 'GA' },
            ],
        },
    ],
    events: [{ id: 'e1', date: '2025-Q2', label: 'review' }],
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const viewerLatency = new Trend('metroviz_viewer_ms', true);
const saveLatency = new Trend('metroviz_save_ms', true);
const loadLatency = new Trend('metroviz_load_ms', true);
const errors = new Rate('metroviz_errors');

// ---------------------------------------------------------------------------
// Pass / fail criteria
// ---------------------------------------------------------------------------
export const options = {
    scenarios: {
        pilot_load: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '30s', target: 50 },
                { duration: '4m', target: 50 }, // 4 min steady state
                { duration: '30s', target: 0 },
            ],
        },
    },
    thresholds: {
        // Performance budget.
        metroviz_viewer_ms: ['p(95)<500'],
        metroviz_save_ms: ['p(95)<500'],
        metroviz_load_ms: ['p(95)<500'],
        metroviz_errors: ['rate<0.001'], // < 0.1%
    },
};

// ---------------------------------------------------------------------------
// Test flow per VU
// ---------------------------------------------------------------------------
function authHeaders() {
    return {
        Authorization: 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64'),
        'X-Requested-With': 'XMLHttpRequest',
    };
}

export default function () {
    // 1) Open the viewer route (cold page-load).
    const t0 = Date.now();
    const viewerRes = http.get(`${BASE}/index.php/apps/metroviz/viewer`, {
        headers: authHeaders(),
        tags: { name: 'viewer' },
    });
    viewerLatency.add(Date.now() - t0);
    const viewerOk = check(viewerRes, { 'viewer 200': (r) => r.status === 200 });
    if (!viewerOk) errors.add(1);

    // 2) PUT a .metro file (save flow).
    const filePath = `${BASE}/remote.php/dav/files/${USER}/MetroViz/loadtest-${__VU}-${__ITER}.metro`;
    const t1 = Date.now();
    const saveRes = http.put(filePath, SAMPLE_METRO, {
        headers: { ...authHeaders(), 'Content-Type': 'application/x-metroviz' },
        tags: { name: 'save' },
    });
    saveLatency.add(Date.now() - t1);
    const saveOk = check(saveRes, {
        'save 201/204': (r) => r.status === 201 || r.status === 204,
    });
    if (!saveOk) errors.add(1);

    // 3) GET the file back (load flow).
    const t2 = Date.now();
    const loadRes = http.get(filePath, {
        headers: authHeaders(),
        tags: { name: 'load' },
    });
    loadLatency.add(Date.now() - t2);
    const loadOk = check(loadRes, { 'load 200': (r) => r.status === 200 });
    if (!loadOk) errors.add(1);

    // Simulate realistic think-time between user actions.
    sleep(1 + Math.random() * 2);
}

// ---------------------------------------------------------------------------
// Setup / teardown (per-test, not per-VU)
// ---------------------------------------------------------------------------
export function setup() {
    // Make sure /MetroViz exists for the test user.
    http.request('MKCOL', `${BASE}/remote.php/dav/files/${USER}/MetroViz`, null, {
        headers: authHeaders(),
    });
}
