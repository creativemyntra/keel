<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller;

use App\Controller\HealthController;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;
use Cake\Datasource\ConnectionManager;

/**
 * HealthController Test
 *
 * Tests GET /health endpoint against HEALTH-1 acceptance criteria.
 * All tests written BEFORE implementation (TDD Red phase).
 */
class HealthControllerTest extends TestCase
{
    use IntegrationTestTrait;

    // ── Happy path ────────────────────────────────────────────────────

    /**
     * AC: GET /health returns HTTP 200 when app + DB are healthy
     */
    public function testHealthReturns200WhenHealthy(): void
    {
        $this->get('/health');
        $this->assertResponseCode(200);
    }

    /**
     * AC: Response Content-Type is application/json
     */
    public function testHealthReturnsJsonContentType(): void
    {
        $this->get('/health');
        $this->assertContentType('application/json');
    }

    /**
     * AC: Response body contains status=ok when DB is reachable
     */
    public function testHealthBodyContainsStatusOk(): void
    {
        $this->get('/health');
        $body = json_decode((string)$this->_response->getBody(), true);

        $this->assertIsArray($body);
        $this->assertSame('ok', $body['status']);
    }

    /**
     * AC: Response includes version, uptime, timestamp fields
     */
    public function testHealthBodyContainsRequiredFields(): void
    {
        $this->get('/health');
        $body = json_decode((string)$this->_response->getBody(), true);

        $this->assertArrayHasKey('version', $body);
        $this->assertArrayHasKey('uptime', $body);
        $this->assertArrayHasKey('timestamp', $body);
        $this->assertIsInt($body['uptime']);
        $this->assertGreaterThanOrEqual(0, $body['uptime']);
    }

    /**
     * AC: Response includes db.status=ok when database is reachable
     */
    public function testHealthBodyContainsDbStatusOk(): void
    {
        $this->get('/health');
        $body = json_decode((string)$this->_response->getBody(), true);

        $this->assertArrayHasKey('db', $body);
        $this->assertSame('ok', $body['db']['status']);
        $this->assertArrayHasKey('latency_ms', $body['db']);
    }

    /**
     * AC: No authentication required — no 401/403
     */
    public function testHealthRequiresNoAuthentication(): void
    {
        $this->get('/health');
        $this->assertResponseNotEquals(401);
        $this->assertResponseNotEquals(403);
    }

    // ── Degraded path ─────────────────────────────────────────────────

    /**
     * AC: Returns 503 with status=degraded when DB is unreachable
     */
    public function testHealthReturns503WhenDatabaseUnreachable(): void
    {
        // Simulate DB failure by mocking the controller's DB check
        $this->get('/health?simulate_db_failure=1');
        $this->assertResponseCode(503);

        $body = json_decode((string)$this->_response->getBody(), true);
        $this->assertSame('degraded', $body['status']);
        $this->assertSame('error', $body['db']['status']);
        $this->assertArrayHasKey('message', $body['db']);
    }

    // ── Security / NFR ────────────────────────────────────────────────

    /**
     * NFR: Response must not contain stack traces or env vars
     */
    public function testHealthResponseContainsNoSensitiveData(): void
    {
        $this->get('/health');
        $rawBody = (string)$this->_response->getBody();

        $this->assertStringNotContainsString('Traceback', $rawBody);
        $this->assertStringNotContainsString('Exception', $rawBody);
        $this->assertStringNotContainsString('DB_PASSWORD', $rawBody);
        $this->assertStringNotContainsString('APP_KEY', $rawBody);
    }

    /**
     * NFR: Response is always valid JSON even on error
     */
    public function testHealthAlwaysReturnsValidJson(): void
    {
        $this->get('/health');
        $body = json_decode((string)$this->_response->getBody(), true);
        $this->assertNotNull($body, 'Response must be valid JSON');
        $this->assertSame(JSON_ERROR_NONE, json_last_error());
    }
}
