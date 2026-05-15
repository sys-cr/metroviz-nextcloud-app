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

// Stub the OCA\Viewer\Event\LoadViewer class so PHPUnit-level tests can
// reference Application::register() without the viewer app installed.
if (!class_exists(\OCA\Viewer\Event\LoadViewer::class)) {
    eval('namespace OCA\\Viewer\\Event; class LoadViewer extends \\OCP\\EventDispatcher\\Event {}');
}
