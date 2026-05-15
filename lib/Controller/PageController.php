<?php
declare(strict_types=1);

namespace OCA\MetroViz\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\IRequest;
use OCP\IUserSession;

class PageController extends Controller
{
    public function __construct(
        string $appName,
        IRequest $request,
        private IRootFolder $rootFolder,
        private IUserSession $userSession,
    ) {
        parent::__construct($appName, $request);
    }

    /**
     * Resolve a Nextcloud file id to a user-relative path (e.g.
     * `/Projekte/Roadmap.metro`). Returns an empty string when the id is
     * unset, the user is not signed in, or the file does not exist /
     * isn't accessible — the SPA then falls back to its default
     * /MetroViz/-folder listing.
     */
    private function resolveFileidToPath(string $fileid): string
    {
        if ($fileid === '') {
            return '';
        }
        $user = $this->userSession->getUser();
        if ($user === null) {
            return '';
        }
        try {
            $userFolder = $this->rootFolder->getUserFolder($user->getUID());
            // getById() returns an array (Node[]) — works across NC 28..32.
            // Newer NC also has getFirstNodeById() but we keep the broader
            // API so the same code runs on every supported NC.
            $nodes = $userFolder->getById((int)$fileid);
            if (empty($nodes)) {
                return '';
            }
            $node = $nodes[0];
            return '/' . ltrim($userFolder->getRelativePath($node->getPath()) ?? '', '/');
        } catch (NotFoundException $e) {
            return '';
        }
    }

    /**
     * Render the MetroViz Alpine SPA.
     *
     * GET-only. All state changes happen client-side via WebDAV with the
     * OC-RequestToken header. If a future revision adds POST/PUT routes
     * here, `@NoCSRFRequired` MUST be removed and any state-changing method
     * needs an explicit CSRF guard.
     *
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function viewer(string $fileid = ''): TemplateResponse
    {
        // NC's root .htaccess rewrites *.json requests under custom_apps/ to
        // index.php, so i18next-http-backend cannot fetch translation files.
        // We inject the resources inline; app.js passes them to i18next.init().
        $localeBase = __DIR__ . '/../../locales';
        $locales = [];
        foreach (['de', 'en'] as $lang) {
            $path = $localeBase . '/' . $lang . '/translation.json';
            if (is_file($path)) {
                $locales[$lang] = ['translation' => json_decode(file_get_contents($path), true)];
            }
        }
        // Example data: same .htaccess constraint. Round-trip through
        // decode/encode so a malformed bundled example cannot poison the
        // inline <script>.
        $examplePath = __DIR__ . '/../../js/data/example.json';
        $example = 'null';
        if (is_file($examplePath)) {
            $decoded = json_decode(file_get_contents($examplePath), true);
            if ($decoded !== null) {
                // Same </script>-breakout consideration as the locales below.
                $example = json_encode($decoded, JSON_UNESCAPED_UNICODE);
            }
        }

        // If the SPA was opened from the Files app via OCA\Viewer the URL
        // carries a fileid query parameter. Resolve it to the user-relative
        // path; the template forwards it to Alpine, which loads / saves
        // through nc-storage at that exact path instead of the default
        // /MetroViz/ folder.
        $targetPath = $this->resolveFileidToPath($fileid);
        $targetName = $targetPath !== '' ? basename($targetPath, '.metro') : '';

        $response = new TemplateResponse(
            $this->appName,
            'viewer',
            [
                'fileid' => $fileid,
                'targetPath' => $targetPath,
                'targetName' => $targetName,
                'requesttoken' => \OCP\Util::callRegister(),
                // DEBT-003: keep JSON_UNESCAPED_SLASHES OFF so any literal
                // </script> substring in a future translation cannot break
                // out of the inline <script> tag in viewer.php.
                'localesJson' => json_encode($locales, JSON_UNESCAPED_UNICODE),
                'exampleJson' => $example,
            ]
        );

        // Alpine.js evaluates directives via `new Function()`, which requires
        // `unsafe-eval` in script-src. Scoped to this route only — any string
        // bound to x-html/x-text MUST pass through DOMPurify first.
        $csp = new ContentSecurityPolicy();
        $csp->allowEvalScript(true);
        $response->setContentSecurityPolicy($csp);

        return $response;
    }
}
