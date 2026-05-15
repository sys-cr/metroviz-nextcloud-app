<?php
declare(strict_types=1);

// Minimal PHPUnit bootstrap.
//
// We do NOT pull in the full Nextcloud server bootstrap here — unit tests
// should run from a plain `composer install` without a co-located NC clone.
// Tests that need NC framework classes mock the interfaces (IRequest,
// IRootFolder, IUserSession, ...) via PHPUnit's createMock().
//
// Integration tests against a real NC instance live under
// tests/php/Integration/ and are run by NC's own `tests/run.sh` infra in CI
// (handled separately from this config).

$autoload = __DIR__ . '/../../vendor/autoload.php';
if (!file_exists($autoload)) {
    fwrite(
        STDERR,
        "PHPUnit bootstrap: vendor/autoload.php is missing.\n"
        . "Run `composer install` in the app root before invoking phpunit.\n"
    );
    exit(1);
}
require_once $autoload;

// Some OCP interfaces (e.g. OCP\Files\IRootFolder) extend or reference
// internal OC\* classes that are part of the Nextcloud server but not
// shipped in the nextcloud/ocp package. Provide minimal stubs so the
// autoloader can resolve them when PHPUnit builds mock objects.
if (!interface_exists('OC\\Hooks\\Emitter')) {
    eval('namespace OC\\Hooks; interface Emitter {}');
}
if (!class_exists('OC\\User\\NoUserException')) {
    eval('namespace OC\\User; class NoUserException extends \\Exception {}');
}

// OCP\Server::get() and OCP\Util::callRegister() dereference the global
// \OC::$server container. Outside a running Nextcloud instance the class
// is missing entirely, which breaks every test that exercises code paths
// touching those statics. Install a permissive null-object container so
// arbitrary chained calls return a sentinel token rather than fatalling.
if (!class_exists('OC')) {
    eval('class OC { public static $server; }');
    \OC::$server = new class {
        public function get(string $serviceName): object
        {
            return new class {
                public function __call(string $name, array $args)
                {
                    return $name === 'getEncryptedValue' ? 'phpunit-stub-token' : $this;
                }
            };
        }
    };
}

// Stub the OCA\Viewer\Event\LoadViewer class so PHPUnit-level tests can
// reference Application::register() without the viewer app installed.
if (!class_exists(\OCA\Viewer\Event\LoadViewer::class)) {
    eval('namespace OCA\\Viewer\\Event; class LoadViewer extends \\OCP\\EventDispatcher\\Event {}');
}
