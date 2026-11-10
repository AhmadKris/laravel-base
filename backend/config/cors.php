<?php

declare(strict_types=1);

/*
 * The SPA and the API share one origin (API_SPECIFICATION.md section 11.5), so no path allows
 * cross-origin requests. Opening the API to another origin needs an allowlist per environment.
 */
return [
    'paths' => [],
    'allowed_methods' => [],
    'allowed_origins' => [],
    'allowed_origins_patterns' => [],
    'allowed_headers' => [],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
