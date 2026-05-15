<?php
declare(strict_types=1);

namespace OCA\MetroViz\Listener;

use OCP\AppFramework\Services\IInitialState;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/**
 * Loads the OCA\Viewer handler script when the Files app initialises the
 * Viewer overlay. Once the script is on the page it calls
 * `OCA.Viewer.registerHandler({ mimes: ['application/x-metroviz'] ... })`,
 * which causes a double-click on a `.metro` file to open MetroViz in the
 * fullscreen Viewer panel.
 *
 * The OCA\Viewer event class lives in the optional `viewer` app, declared
 * as a hard dependency in appinfo/info.xml. If for some reason that app is
 * missing the class won't load — the listener registration in Application
 * uses the class name as a string, so the absence is non-fatal.
 *
 * @implements IEventListener<Event>
 */
class LoadViewerListener implements IEventListener
{
    public function handle(Event $event): void
    {
        Util::addScript('metroviz', 'files-viewer-handler');
    }
}
