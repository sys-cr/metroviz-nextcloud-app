import { parseDate } from './utils.js';

// Hex color whitelist for any color value bound into a CSS context (`:style`
// attribute bindings on zones/lines/events — viewer.php Z. 382/407/411/...).
// Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA only — no rgb()/hsl()/named.
// Background: the CSP audit (DEBT-001 / 2026-05-14 CSP-Eval-Vektor-Walk)
// flagged the inline `:style="'background-color: ' + zone.color"` pattern
// as a CSS-injection vector if `color` were ever user-controllable text.
// Today's threat is theoretical, but Deck-Sync / Share-Link import will add
// external entry points; locking down the value space here is cheaper than
// auditing every binding site later.
const HEX_COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const FALLBACK_COLOR = '#6b6b6b';

function sanitizeColor(value) {
    if (typeof value !== 'string') return FALLBACK_COLOR;
    return HEX_COLOR_RE.test(value.trim()) ? value.trim() : FALLBACK_COLOR;
}

// DEBT-003: incoming `id` fields are interpolated into DOM ids and
// `aria-labelledby`/`for` attribute bindings (viewer.php Z. 351/421/509).
// Locking the value space here prevents attribute-injection via
// `id="x" onmouseover=alert(1) x="..."` payloads from external imports.
// Length cap 64 — generous enough for any human-authored slug.
const SAFE_ID_RE = /^[A-Za-z0-9_\-]{1,64}$/;

function sanitizeId(value) {
    if (typeof value !== 'string') return '';
    return SAFE_ID_RE.test(value) ? value : '';
}

// Harte Element-Anzahl-Limits oberhalb des
// 5 MB-Payload-Caps: ein einzelner Wert kann unter 5 MB liegen und trotzdem
// die D3-Render-Schleife einfrieren (z. B. 50.000 Events). Die Caps unten
// sind großzügig — der Default-Demo nutzt < 1 % davon — verhindern aber
// Worst-Case-DoS durch crafted Imports. Bei Überschreitung fliegt ein
// Error mit i18n-Key `js.errSizeLimit`, der vom Caller als Toast gezeigt
// wird (siehe `file-manager.js::importJsonFromFile`).
const MAX_LINES = 200;
const MAX_STATIONS_PER_LINE = 2000;
const MAX_ZONES = 500;
const MAX_EVENTS = 1000;

function assertWithinLimits(data) {
    const violations = [];
    if (Array.isArray(data.lines) && data.lines.length > MAX_LINES) {
        violations.push(`lines: ${data.lines.length} > ${MAX_LINES}`);
    }
    if (Array.isArray(data.zones) && data.zones.length > MAX_ZONES) {
        violations.push(`zones: ${data.zones.length} > ${MAX_ZONES}`);
    }
    if (Array.isArray(data.events) && data.events.length > MAX_EVENTS) {
        violations.push(`events: ${data.events.length} > ${MAX_EVENTS}`);
    }
    if (Array.isArray(data.lines)) {
        for (const line of data.lines) {
            if (Array.isArray(line.stations) && line.stations.length > MAX_STATIONS_PER_LINE) {
                violations.push(
                    `stations on line ${line.id || '?'}: ${line.stations.length} > ${MAX_STATIONS_PER_LINE}`
                );
                break;
            }
        }
    }
    if (violations.length) {
        const err = new Error(`Roadmap exceeds size limits: ${violations.join('; ')}`);
        err.code = 'js.errSizeLimit';
        throw err;
    }
}

/**
 * Handles fetching, validation, and normalization of Metro map data.
 */
export class DataModel {
    constructor() {}

    async loadFromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return this.validateAndNormalize(data);
    }

    /**
     * Validates raw JSON data and normalizes dates into sortable Date objects.
     * @param {Object} data - The raw JSON configuration for the metro map.
     * @returns {Object} A normalized data object with parsed dates and sorted arrays.
     */
    validateAndNormalize(data) {
        // Minimal validation
        // Intent: Fail early if core structure is missing to prevent complex errors downstream.
        if (!data.timeline || !data.zones || !data.lines) {
            throw new Error('Invalid data format: missing required fields');
        }

        if (!Array.isArray(data.zones)) throw new Error('Invalid data format: zones must be an array');
        if (!Array.isArray(data.lines)) throw new Error('Invalid data format: lines must be an array');
        if (data.events && !Array.isArray(data.events)) throw new Error('Invalid data format: events must be an array');

        // Hard element-count limits beyond the 5 MB payload-cap
        // (which alone does not catch many-small-elements DoS payloads).
        assertWithinLimits(data);

        const validStationTypes = ['start', 'milestone', 'transfer', 'terminus', 'existing', 'normal', 'interchange', 'terminal'];

        const normalizedData = {
            meta: data.meta || {},
            timeline: {
                start: parseDate(data.timeline.start, 'throw'),
                end: parseDate(data.timeline.end, 'throw')
            },
            events: (data.events || []).map(e => ({
                ...e,
                id: e.id !== undefined ? sanitizeId(e.id) : e.id,
                color: e.color !== undefined ? sanitizeColor(e.color) : e.color,
                dateObj: parseDate(e.date, 'throw')
            })).sort((a, b) => a.dateObj - b.dateObj),
            zones: data.zones.map(z => ({
                ...z,
                id: z.id !== undefined ? sanitizeId(z.id) : z.id,
                color: z.color !== undefined ? sanitizeColor(z.color) : z.color,
            })),
            lines: data.lines.map(line => {
                const safeLineId = line.id !== undefined ? sanitizeId(line.id) : line.id;
                const normalizedLine = {
                    ...line,
                    id: safeLineId,
                    color: line.color !== undefined ? sanitizeColor(line.color) : line.color,
                };
                normalizedLine.stations = (line.stations || []).map(station => {
                    if (station.type && !validStationTypes.includes(station.type)) {
                        throw new Error(`Invalid station type: ${station.type}`);
                    }
                    return {
                        ...station,
                        id: station.id !== undefined ? sanitizeId(station.id) : station.id,
                        dateObj: parseDate(station.date, 'throw'),
                        lineId: safeLineId
                    };
                }).sort((a, b) => a.dateObj - b.dateObj);
                return normalizedLine;
            })
        };

        return normalizedData;
    }
}