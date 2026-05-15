// OCA\Viewer handler registration for MetroViz.
//
// When the Files app double-clicks a `.metro` file, NC fires the
// `OCA.Viewer.openFile` flow. Apps register handlers via the OCA.Viewer
// JS API and supply a Vue component that NC mounts inside the fullscreen
// Viewer overlay.
//
// We intentionally do NOT bundle Vue ourselves — `OCA.Viewer` provides it.
// The component uses an h-render function (no template-compiler required)
// so this file can ship as plain JS without a build step.
//
// Strategy: the handler component renders an <iframe> pointing at the
// existing standalone viewer route (`/apps/metroviz/viewer?fileid=…`).
// That keeps the SPA logic, CSP override and i18n bootstrap in one place
// (templates/viewer.php) and avoids re-implementing Alpine inside Vue.

(function () {
    'use strict';

    if (
        typeof OCA === 'undefined' ||
        !OCA.Viewer ||
        typeof OCA.Viewer.registerHandler !== 'function'
    ) {
        // Viewer app not present (or not yet loaded). Nothing to do —
        // info.xml declares `viewer` as a hard dep, so this branch is
        // mostly a safety net for misconfigured installs.
        return;
    }

    var generateUrl =
        typeof OC !== 'undefined' && OC.generateUrl
            ? OC.generateUrl
            : function (path) {
                  return path;
              };

    OCA.Viewer.registerHandler({
        id: 'metroviz',
        group: null,
        mimes: ['application/x-metroviz'],
        // The component receives props from OCA\Viewer: filename, fileid,
        // mime, source (full WebDAV URL), permissions, ...
        // See: nextcloud/server apps/viewer for the canonical contract.
        component: {
            name: 'MetrovizViewer',
            props: {
                filename: { type: String, default: '' },
                fileid: { type: [String, Number], default: '' },
                source: { type: String, default: '' },
            },
            data: function () {
                return { loaded: false, errored: false };
            },
            computed: {
                viewerUrl: function () {
                    var base = generateUrl('/apps/metroviz/viewer');
                    var qs = this.fileid ? '?fileid=' + encodeURIComponent(this.fileid) : '';
                    return base + qs;
                },
                t: function () {
                    return typeof t === 'function'
                        ? function (key, fallback) {
                              return t('metroviz', key) || fallback;
                          }
                        : function (_key, fallback) {
                              return fallback;
                          };
                },
            },
            render: function (h) {
                var self = this;
                var wrapStyle = {
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--color-main-background, #ffffff)',
                };

                // Error fallback: when the iframe fails to load (e.g. server
                // 500 on the viewer route), show an actionable retry. A
                // previous "silent blank" was a dead-end for users.
                if (this.errored) {
                    return h(
                        'div',
                        { staticClass: 'metroviz-viewer-frame-wrap', staticStyle: wrapStyle },
                        [
                            h(
                                'div',
                                {
                                    attrs: { role: 'alert' },
                                    staticStyle: {
                                        margin: 'auto',
                                        padding: '24px',
                                        maxWidth: '480px',
                                        textAlign: 'center',
                                        color: '#a00',
                                    },
                                },
                                [
                                    self.t(
                                        'viewer.loadFailed',
                                        'Datei konnte nicht geladen werden.'
                                    ),
                                    h('div', { staticStyle: { marginTop: '16px' } }, [
                                        h(
                                            'button',
                                            {
                                                attrs: { type: 'button' },
                                                staticStyle: {
                                                    padding: '8px 16px',
                                                    borderRadius: '6px',
                                                    border: '1px solid currentColor',
                                                    background: 'transparent',
                                                    color: 'inherit',
                                                    cursor: 'pointer',
                                                },
                                                on: {
                                                    click: function () {
                                                        self.errored = false;
                                                        self.loaded = false;
                                                    },
                                                },
                                            },
                                            self.t('viewer.retry', 'Erneut versuchen')
                                        ),
                                    ]),
                                ]
                            ),
                        ]
                    );
                }

                return h(
                    'div',
                    { staticClass: 'metroviz-viewer-frame-wrap', staticStyle: wrapStyle },
                    [
                        h('iframe', {
                            staticClass: 'metroviz-viewer-frame',
                            // `key` forces Vue to recreate the iframe element on
                            // retry so the src reloads even if it didn't change.
                            key: this.viewerUrl + ':' + (self.loaded ? '1' : '0'),
                            attrs: {
                                src: this.viewerUrl,
                                title: this.t('viewer.frameTitle', 'MetroViz Roadmap'),
                                // sandbox intentionally omitted: the iframe loads
                                // a same-origin route and needs full Nextcloud
                                // session cookies + CSP-eval.
                                allowfullscreen: true,
                            },
                            staticStyle: {
                                width: '100%',
                                height: '100%',
                                border: '0',
                                flex: '1 1 auto',
                            },
                            on: {
                                load: function () {
                                    self.loaded = true;
                                },
                                error: function () {
                                    self.errored = true;
                                },
                            },
                        }),
                    ]
                );
            },
        },
    });
})();
