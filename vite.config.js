// Vite build config for MetroViz-NC.
//
// Two entries — the MetroViz Alpine SPA + the OCA\Viewer-handler script.
// Output lands in `js/dist/` with content-hashed filenames and a
// `manifest.json` that the PageController consults to emit the right
// `<script src>` URLs. This replaces the `?v=<mtime>` + `.htaccess`
// no-cache cache-busting strategy with proper long-cache + hashed
// filenames.
//
// Build:
//   npm run build
// Output:
//   js/dist/
//     ├── manifest.json
//     ├── app.<hash>.js
//     ├── files-viewer-handler.<hash>.js
//     └── assets/<chunk>.<hash>.js   (split common chunks)
//
// Notes:
// - We don't bundle css/metroviz.css or css/nc-overrides.css — they
//   remain plain CSS loaded by `templates/viewer.php`. Reason: keeping
//   the upstream metroviz.css unprocessed (fork stays clean).
// - js/vendor/* keeps its hand-vendored builds; Vite does not touch
//   that directory. The PageController still loads vendor scripts via
//   `\OCP\Util::addScript`.

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    root: __dirname,
    base: './',
    appType: 'mpa',
    build: {
        outDir: 'js/dist',
        emptyOutDir: true,
        // emit a manifest.json under the build root.
        manifest: 'manifest.json',
        // Don't minify variable names too aggressively — easier to debug
        // production reports until we have proper source-maps wired.
        minify: 'esbuild',
        sourcemap: true,
        rollupOptions: {
            input: {
                app: resolve(__dirname, 'js/metroviz/app.js'),
                'files-viewer-handler': resolve(__dirname, 'js/files-viewer-handler.js'),
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash][extname]',
            },
            // External: everything in window.* is provided at runtime by
            // the vendored scripts (d3, alpine, lz-string, marked, ...).
            // Vite resolving them to npm packages would double-bundle.
            external: [
                /^d3($|\/)/,
                /^alpinejs($|\/)/,
                /^lz-string($|\/)/,
                /^marked($|\/)/,
                /^dompurify($|\/)/,
                /^i18next($|\/)/,
                /^i18next-browser-languagedetector($|\/)/,
                /^jspdf($|\/)/,
                /^svg2pdf\.js($|\/)/,
            ],
        },
    },
});
