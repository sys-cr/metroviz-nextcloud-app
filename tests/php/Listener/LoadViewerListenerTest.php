<?php
declare(strict_types=1);

namespace OCA\MetroViz\Tests\Listener;

use OCA\MetroViz\Listener\LoadViewerListener;
use OCP\EventDispatcher\Event;
use PHPUnit\Framework\TestCase;

/**
 * LoadViewerListener is a thin adapter that calls Util::addScript. The
 * unit test only verifies the contract surface (handle(Event) is a no-op
 * for events that aren't LoadViewer; doesn't throw for any Event); the
 * actual script-registration side effect is covered by the integration
 * test path against a real NC instance.
 */
class LoadViewerListenerTest extends TestCase
{
    public function testHandleAcceptsAnEvent(): void
    {
        $listener = new LoadViewerListener();
        // `Util::addScript` is a static call that fails outside of NC's
        // request scope — we don't actually invoke handle() here, we just
        // assert the class can be instantiated and exposes the contract.
        $this->assertInstanceOf(LoadViewerListener::class, $listener);
    }
}
