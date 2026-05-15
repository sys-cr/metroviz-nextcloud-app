// ESLint 9 flat-config for MetroViz-NC.
// Lints our adapter modules, stories, and tests; leaves the upstream
// MetroViz fork (`js/metroviz/`) and the vendored libs untouched
// (keeps upstream files clean for future merges).

import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                OC: 'readonly',
                OCA: 'readonly',
                OCP: 'readonly',
                OC_requesttoken: 'readonly',
                i18next: 'readonly',
                Alpine: 'readonly',
                d3: 'readonly',
                DOMPurify: 'readonly',
                LZString: 'readonly',
                marked: 'readonly',
                jspdf: 'readonly',
                svg2pdf: 'readonly',
                t: 'readonly',
                __ENV: 'readonly',
                __VU: 'readonly',
                __ITER: 'readonly',
            },
        },
        rules: {
            // Surface accidental console-leaks but allow warn/error (we use
            // them for genuine fault paths in nc-storage etc.).
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            // Forbid eval / Function-constructor in our own code.
            // Alpine internally calls `new Function()` — that's covered by
            // the per-route CSP override, not by our source.
            'no-eval': 'error',
            'no-new-func': 'error',
            // Cleanliness — surface dead bindings.
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^(_|e2?)$',
            }],
            // Allow our common idioms.
            'no-prototype-builtins': 'off',
        },
    },
    {
        // Storybook stories build DOM strings — `innerHTML` is intentional.
        files: ['js/stories/**/*.js'],
        rules: {
            'no-unused-vars': 'off',
        },
    },
    {
        // Tests stub many globals; relaxed rules.
        files: ['tests/**/*.js', 'tests/**/*.mjs'],
        languageOptions: {
            globals: {
                ...globals.node,
                vi: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
                test: 'readonly',
                performance: 'readonly',
                __dirname: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'off',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'js/vendor/**',
            'js/metroviz/**',     // upstream fork
            'css/metroviz.css',
            'storybook-static/**',
            'coverage/**',
            'js/dist/**',
            '**/*.timestamp-*.mjs',
        ],
    },
];
