<?php
declare(strict_types=1);

namespace OCA\MetroViz\Tests\Controller;

use OCA\MetroViz\Controller\PageController;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\Files\Node;
use OCP\IRequest;
use OCP\IUser;
use OCP\IUserSession;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for the file-viewer route. The full TemplateResponse round-trip
 * needs a running NC instance; here we cover the pieces of the controller
 * that don't depend on NC bootstrapping — argument plumbing, CSP setup,
 * fileid → path resolution, and the safe-fallback behaviour when the user
 * is anonymous or the file is gone.
 */
class PageControllerTest extends TestCase
{
    private IRequest $request;
    private IRootFolder $rootFolder;
    private IUserSession $userSession;
    private PageController $controller;

    protected function setUp(): void
    {
        $this->request = $this->createMock(IRequest::class);
        $this->rootFolder = $this->createMock(IRootFolder::class);
        $this->userSession = $this->createMock(IUserSession::class);
        $this->controller = new PageController(
            'metroviz',
            $this->request,
            $this->rootFolder,
            $this->userSession,
        );
    }

    public function testViewerReturnsTemplateResponse(): void
    {
        $this->userSession->method('getUser')->willReturn(null);
        $response = $this->controller->viewer();
        $this->assertInstanceOf(TemplateResponse::class, $response);
    }

    public function testViewerSetsAllowEvalScriptCsp(): void
    {
        $this->userSession->method('getUser')->willReturn(null);
        $response = $this->controller->viewer();
        $csp = $response->getContentSecurityPolicy();
        $this->assertNotNull($csp, 'Per-route CSP override must be set');

        // The CSP must allow 'unsafe-eval' for the route. The
        // ContentSecurityPolicy class doesn't expose a getter, so we
        // assert via the rendered header value.
        $rendered = $csp->buildPolicy();
        $this->assertStringContainsString("'unsafe-eval'", $rendered);
    }

    public function testFileidResolutionReturnsEmptyForAnonymous(): void
    {
        $this->userSession->method('getUser')->willReturn(null);
        $response = $this->controller->viewer('42');
        $params = $response->getParams();
        $this->assertSame('', $params['targetPath']);
        $this->assertSame('', $params['targetName']);
    }

    public function testFileidResolutionReturnsEmptyWhenFileMissing(): void
    {
        $user = $this->createMock(IUser::class);
        $user->method('getUID')->willReturn('alice');
        $this->userSession->method('getUser')->willReturn($user);

        $folder = $this->createMock(Folder::class);
        $folder->method('getById')->willReturn([]);   // file not accessible
        $this->rootFolder->method('getUserFolder')->willReturn($folder);

        $response = $this->controller->viewer('999');
        $params = $response->getParams();
        $this->assertSame('', $params['targetPath']);
    }

    public function testFileidResolutionEmitsUserRelativePath(): void
    {
        $user = $this->createMock(IUser::class);
        $user->method('getUID')->willReturn('alice');
        $this->userSession->method('getUser')->willReturn($user);

        $node = $this->createMock(Node::class);
        $node->method('getPath')->willReturn('/alice/files/Projekte/Roadmap.metro');

        $folder = $this->createMock(Folder::class);
        $folder->method('getById')->willReturn([$node]);
        $folder->method('getRelativePath')
            ->with('/alice/files/Projekte/Roadmap.metro')
            ->willReturn('/Projekte/Roadmap.metro');
        $this->rootFolder->method('getUserFolder')->willReturn($folder);

        $response = $this->controller->viewer('42');
        $params = $response->getParams();

        $this->assertSame('/Projekte/Roadmap.metro', $params['targetPath']);
        $this->assertSame('Roadmap', $params['targetName']);
    }

    public function testTemplateExposesRequestTokenAndJsonGlobals(): void
    {
        $this->userSession->method('getUser')->willReturn(null);
        $response = $this->controller->viewer();
        $params = $response->getParams();

        $this->assertArrayHasKey('requesttoken', $params);
        $this->assertArrayHasKey('localesJson', $params);
        $this->assertArrayHasKey('exampleJson', $params);

        // localesJson and exampleJson are stringified JSON that the
        // template prints unescaped into a <script> tag — they must
        // never carry an unescaped `</script>` (DEBT-003).
        $this->assertStringNotContainsString('</script>', $params['localesJson']);
        $this->assertStringNotContainsString('</script>', $params['exampleJson']);
    }
}
