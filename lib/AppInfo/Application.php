<?php
declare(strict_types=1);

namespace OCA\MetroViz\AppInfo;

use OCA\MetroViz\Listener\LoadViewerListener;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap
{
    public const APP_ID = 'metroviz';

    public function __construct(array $urlParams = [])
    {
        parent::__construct(self::APP_ID, $urlParams);
    }

    public function register(IRegistrationContext $context): void
    {
        // OCA\Viewer event class is referenced by string so the app still
        // boots when the optional `viewer` app is absent (info.xml declares
        // it as a hard dep, but defensive coupling is cheaper than a fatal).
        $context->registerEventListener(
            \OCA\Viewer\Event\LoadViewer::class,
            LoadViewerListener::class
        );
    }

    public function boot(IBootContext $context): void
    {
    }
}
