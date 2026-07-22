<?php
namespace FixtureApp\Tests\Unit;

use PHPUnit\Framework\TestCase;
use FixtureApp\Controller\HealthController;

class HealthControllerTest extends TestCase
{
    public function testGetHealthReturnsOk(): void
    {
        $controller = new HealthController();
        $result = $controller->getHealth();
        $this->assertSame(['status' => 'ok'], $result);
    }
}
