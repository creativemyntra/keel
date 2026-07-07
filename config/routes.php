<?php
declare(strict_types=1);

use Cake\Routing\RouteBuilder;

/**
 * Routes configuration
 *
 * CakePHP 4.4 — add application routes here.
 */
return static function (RouteBuilder $routes): void {

    // ── Health check — no auth, no middleware, lightweight ────────────
    $routes->get('/health', ['controller' => 'Health', 'action' => 'index']);

    // ── API v1 scope (extend here) ────────────────────────────────────
    $routes->scope('/api/v1', function (RouteBuilder $builder): void {
        $builder->setExtensions(['json']);
        // Add API routes here
    });

    // ── Default fallback ──────────────────────────────────────────────
    $routes->scope('/', function (RouteBuilder $builder): void {
        $builder->connect('/{controller}/{action}/*');
    });
};
