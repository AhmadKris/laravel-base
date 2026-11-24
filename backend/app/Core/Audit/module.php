<?php

declare(strict_types=1);

return [
    'key' => 'audit',
    'label' => 'Audit Log',
    'description' => 'Jejak aktivitas pengguna dan perubahan data penting.',
    'core' => true,
    'menu' => [
        'audit-logs' => [
            'label' => 'Audit Log',
            'path' => '/audit-logs',
            'icon' => 'scroll-text',
            'permission' => 'audit.view',
            'section' => 'administration',
            'position' => 30,
        ],
    ],
];
