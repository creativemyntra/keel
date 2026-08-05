<?php
namespace FixtureApp\Controller;

class HealthController
{
    public function getHealth(): array
    {
        return ['status' => 'ok'];
    }
}
