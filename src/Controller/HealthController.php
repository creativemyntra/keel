<?php
declare(strict_types=1);

namespace App\Controller;

use Cake\Controller\Controller;
use Cake\Datasource\ConnectionManager;
use Cake\Http\Response;
use Throwable;

/**
 * Health Check Controller
 *
 * Provides GET /health — lightweight liveness + readiness probe.
 * No authentication required. Always returns valid JSON.
 * Used by load balancers, uptime monitors, and New Relic.
 *
 * HEALTH-1 | keel tdd-green phase
 */
class HealthController extends Controller
{
    /**
     * GET /health
     *
     * Returns system status including DB connectivity.
     * HTTP 200 = healthy, HTTP 503 = degraded.
     */
    public function index(): Response
    {
        // Simulate DB failure in test/dev environments when flag is set
        $simulateFailure = $this->request->getQuery('simulate_db_failure') === '1'
            && in_array(env('APP_ENV', 'production'), ['test', 'development'], true);

        $dbResult  = $simulateFailure
            ? $this->buildDbErrorResult('Simulated connection failure')
            : $this->checkDatabase();

        $status     = $dbResult['status'] === 'ok' ? 'ok' : 'degraded';
        $httpStatus = $status === 'ok' ? 200 : 503;

        $payload = [
            'status'    => $status,
            'version'   => $this->getAppVersion(),
            'uptime'    => $this->getUptimeSeconds(),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'db'        => $dbResult,
        ];

        return $this->response
            ->withStatus($httpStatus)
            ->withType('application/json')
            ->withStringBody((string)json_encode($payload, JSON_UNESCAPED_SLASHES));
    }

    // ── Private helpers ───────────────────────────────────────────────

    /**
     * Pings the default DB connection and measures latency.
     * Never throws — returns error result on failure.
     *
     * @return array{status: string, latency_ms?: int, message?: string}
     */
    private function checkDatabase(): array
    {
        $start = microtime(true);
        try {
            $connection = ConnectionManager::get('default');
            $connection->execute('SELECT 1');
            $latencyMs = (int)round((microtime(true) - $start) * 1000);

            return [
                'status'     => 'ok',
                'latency_ms' => $latencyMs,
            ];
        } catch (Throwable $e) {
            // Intentionally omit full exception message to avoid leaking internals
            return $this->buildDbErrorResult('Connection check failed');
        }
    }

    /**
     * @return array{status: string, message: string}
     */
    private function buildDbErrorResult(string $message): array
    {
        return [
            'status'  => 'error',
            'message' => $message,
        ];
    }

    /**
     * Reads version from plugin.json (single source of truth).
     */
    private function getAppVersion(): string
    {
        $pluginJson = ROOT . DS . 'plugin.json';
        if (is_file($pluginJson)) {
            $data = json_decode((string)file_get_contents($pluginJson), true);
            return (string)($data['version'] ?? 'unknown');
        }

        return (string)(env('APP_VERSION', 'unknown'));
    }

    /**
     * Returns seconds since PHP-FPM/CLI process started.
     * Falls back to 0 if $_SERVER['REQUEST_TIME'] is unavailable.
     */
    private function getUptimeSeconds(): int
    {
        $requestTime = (int)($_SERVER['REQUEST_TIME'] ?? time());
        return max(0, time() - $requestTime);
    }
}
