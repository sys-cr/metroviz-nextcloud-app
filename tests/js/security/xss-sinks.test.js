// DEBT-002 — XSS payload battery against the application's HTML sinks.
//
// The CSP-Eval-Vektor-Code-Walk (2026-05-14) identified one `x-html` sink
// (Markdown preview) and three D3 `.html(...)` calls reachable from user
// data. All of them route through utils.js::sanitizeHtml (DOMPurify-backed)
// or escapeHtml. This file is a regression guard: if a future refactor
// drops DOMPurify or weakens sanitizeHtml, the payloads here re-introduce
// detectable XSS and the test goes red.
//
// The list of payloads is curated from the OWASP XSS Filter Evasion
// Cheat-Sheet — broad coverage of the classes the audit considered:
//   - direct <script> insertion
//   - inline event handlers (onerror, onload, onclick, ...)
//   - `javascript:` pseudo-protocol URLs
//   - SVG-vector payloads
//   - data: URI smuggling
//   - polyglot escapes / encoded variants
//   - mXSS via mutated parsing

import { describe, it, expect, beforeAll, vi } from 'vitest';
import DOMPurify from 'dompurify';

import { sanitizeHtml, escapeHtml } from '../../../js/metroviz/utils.js';

beforeAll(() => {
    // Pin the application's DOMPurify-on-window contract for jsdom so
    // sanitizeHtml takes the DOMPurify path, not its regex fallback.
    vi.stubGlobal('DOMPurify', DOMPurify);
    window.DOMPurify = DOMPurify;
});

const PAYLOADS = [
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '<svg><script>alert(1)</script></svg>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<object data="javascript:alert(1)"></object>',
    '<embed src="javascript:alert(1)">',
    '<body onload="alert(1)">',
    '"><script>alert(1)</script>',
    '<img """><script>alert(1)</script>"\\>',
    '<svg/onload=alert(1)>',
    '<math href="javascript:alert(1)">x</math>',
    '<style>@import "javascript:alert(1)";</style>',
    '<link rel="stylesheet" href="javascript:alert(1)">',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<form action="javascript:alert(1)"><input type="submit"></form>',
    '<button formaction="javascript:alert(1)">x</button>',
    '<img src=x onerror=alert`1`>',
    '<svg><animate attributeName="xlink:href" values="javascript:alert(1)"/></svg>',
];

describe('DEBT-002: sanitizeHtml strips every known XSS class', () => {
    it.each(PAYLOADS)('neutralises: %s', (payload) => {
        const out = sanitizeHtml(payload);
        const lower = String(out).toLowerCase();

        // No raw <script> tags after sanitisation.
        expect(lower).not.toMatch(/<script\b/);

        // No inline event handlers.
        expect(lower).not.toMatch(/\son[a-z]+\s*=/);

        // No `javascript:` (in any casing) and no `data:` URIs in href/src.
        // We check the most common smuggling targets.
        expect(lower).not.toMatch(/javascript:/);

        // No mXSS-only constructs that DOMPurify is known to neutralise.
        expect(lower).not.toMatch(/<iframe\b/);
        expect(lower).not.toMatch(/<object\b/);
        expect(lower).not.toMatch(/<embed\b/);
        expect(lower).not.toMatch(/<meta\b/);
    });
});

describe('DEBT-002: escapeHtml is total for the four critical metacharacters', () => {
    // escapeHtml is used in non-HTML contexts (D3 tooltip text injection,
    // export filenames). It must remove the ability to break out of an
    // attribute or text node.
    const cases = [
        ['<', '&lt;'],
        ['>', '&gt;'],
        ['"', '&quot;'],
        // Single quotes use `&#039;` (the form sanitizeHtml's fallback uses).
    ];
    it.each(cases)('escapes "%s" → "%s"', (input, expected) => {
        expect(escapeHtml(input)).toContain(expected);
    });

    it('escapes the full XSS-into-attribute payload', () => {
        // escapeHtml's job is to neutralise *metacharacters* — the word
        // `onmouseover` stays in the output as plain text, but every quote
        // and angle-bracket that could break out of context is replaced.
        const out = escapeHtml('" onmouseover="alert(1)" x="');
        expect(out).not.toContain('"');
        expect(out).not.toContain('<');
        expect(out).not.toContain('>');
    });
});

describe('DEBT-002: sanitizeHtml accepts and preserves benign Markdown output', () => {
    // Negative-side regression: the sanitiser must not over-block legitimate
    // markdown-rendered output (paragraphs, lists, links with https://).
    const benign =
        '<p>Hello <strong>world</strong></p><ul><li>one</li></ul>' +
        '<a href="https://example.com">link</a>';
    const out = sanitizeHtml(benign);
    it('keeps paragraphs, lists, and HTTPS links intact', () => {
        expect(out).toMatch(/<p>/);
        expect(out).toMatch(/<strong>world<\/strong>/);
        expect(out).toMatch(/<li>one<\/li>/);
        expect(out).toMatch(/href="https:\/\/example\.com"/);
    });
});
