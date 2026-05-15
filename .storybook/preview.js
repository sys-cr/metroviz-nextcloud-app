// Storybook preview config. The stylesheet order MUST match templates/viewer.php
// (metroviz → nc-overrides) so the NC-theme overrides win specificity-wise.
// The a11y addon runs axe-core in every story — 0-violations is the gate.

import '../css/metroviz.css';
import '../css/nc-overrides.css';

/** @type {import('@storybook/html-vite').Preview} */
const preview = {
    parameters: {
        backgrounds: {
            default: 'light',
            values: [
                { name: 'light', value: '#ffffff' },
                { name: 'dark', value: '#1a1a1a' },
                { name: 'high-contrast', value: '#000000' },
            ],
        },
        viewport: {
            viewports: {
                mobile375: {
                    name: 'Mobile 375 px',
                    styles: { width: '375px', height: '667px' },
                },
                tablet: {
                    name: 'Tablet 768 px',
                    styles: { width: '768px', height: '1024px' },
                },
                desktop: {
                    name: 'Desktop 1280 px',
                    styles: { width: '1280px', height: '800px' },
                },
            },
            defaultViewport: 'desktop',
        },
        a11y: {
            element: '#storybook-root',
            config: {},
            options: {},
        },
    },
};

export default preview;
