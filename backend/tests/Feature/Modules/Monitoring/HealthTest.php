<?php

declare(strict_types=1);

it('reports only the minimum status to anonymous clients', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertExactJson(['status' => 'ok', 'service' => 'enterprise-api']);
});
