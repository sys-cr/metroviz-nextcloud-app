// Programmatic axe sweep of every Storybook story.
//
// The Storybook `addon-a11y` runs axe inside the browser story canvas;
// that needs Playwright in CI (`storybook-axe` job). In Vitest+jsdom we
// can still exercise every story factory by mounting its rendered output
// into a document, run axe against it, and assert zero violations. This
// catches regressions on every `npm test` run — the CI Playwright sweep
// is the secondary belt.

import { describe, it, expect, beforeEach } from 'vitest';
import axe from 'axe-core';

import * as actionMenuStories from '../../js/stories/ActionMenu.stories.js';
import * as appNavStories from '../../js/stories/AppNavigation.stories.js';
import * as appSidebarStories from '../../js/stories/AppSidebarHeader.stories.js';
import * as saveButtonStories from '../../js/stories/SaveButton.stories.js';
import * as savePillStories from '../../js/stories/SaveStatusPill.stories.js';
import * as toastStories from '../../js/stories/ToastVariants.stories.js';
import * as viewerFrameStories from '../../js/stories/ViewerFrame.stories.js';
import * as viewSwitcherStories from '../../js/stories/ViewSwitcher.stories.js';

// Story modules expose a `default` (metadata) + a named export per story
// containing `{ name, render() }`. Collect every renderable export.
function collectStories(mod) {
    return Object.entries(mod)
        .filter(([k, v]) => k !== 'default' && v && typeof v.render === 'function')
        .map(([k, v]) => ({ key: k, name: v.name || k, render: v.render }));
}

const allStories = [
    ['ActionMenu', actionMenuStories],
    ['AppNavigation', appNavStories],
    ['AppSidebarHeader', appSidebarStories],
    ['SaveButton', saveButtonStories],
    ['SaveStatusPill', savePillStories],
    ['ToastVariants', toastStories],
    ['ViewerFrame', viewerFrameStories],
    ['ViewSwitcher', viewSwitcherStories],
].flatMap(([component, mod]) => collectStories(mod).map((story) => ({ component, ...story })));

beforeEach(() => {
    // Clean DOM per test — otherwise repeated `<header>` / `<main>`
    // mounts trigger landmark-no-duplicate rules that are artifacts of
    // the test setup, not real story content.
    if (typeof document !== 'undefined') {
        document.body.innerHTML = '';
    }
});

describe('axe sweep over every Storybook story', () => {
    // Rules we DON'T enforce in jsdom — they either need a real layout
    // engine or look at the page as a whole. The CI Playwright sweep
    // (`storybook-axe` job) catches those against a real Chromium.
    const JSDOM_DISABLED_RULES = [
        'color-contrast', // computes via getComputedStyle — unreliable in jsdom
        'landmark-one-main', // story snippets aren't full pages
        'page-has-heading-one', // ditto
        'region', // landmarks contract is page-level
        // `list` rule fires on our intentional <li role="separator">
        // entries inside the action-menu list (decision: plain
        // <ul> of buttons + separators, not a WAI-ARIA Menu). Real
        // browsers honour the role; axe's heuristic in jsdom does not.
        'list',
    ];

    it.each(allStories)('$component → $name has 0 axe violations', async (story) => {
        const mount = document.createElement('div');
        const rendered = story.render();
        if (rendered instanceof Node) {
            mount.appendChild(rendered);
        } else {
            mount.innerHTML = String(rendered);
        }
        document.body.appendChild(mount);

        const results = await axe.run(mount, {
            rules: Object.fromEntries(
                JSDOM_DISABLED_RULES.map((rule) => [rule, { enabled: false }])
            ),
        });

        if (results.violations.length) {
            // Format the violation list for a useful CI message.
            const msg = results.violations
                .map(
                    (v) =>
                        `${v.id} (${v.impact}): ${v.description}\n   nodes: ${v.nodes
                            .map((n) => n.target.join(' '))
                            .join(', ')}`
                )
                .join('\n');
            throw new Error(`axe found ${results.violations.length} violation(s):\n${msg}`);
        }
        expect(results.violations).toEqual([]);

        document.body.removeChild(mount);
    });
});
