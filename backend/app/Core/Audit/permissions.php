<?php

declare(strict_types=1);

return [
    'audit' => [
        'label' => 'Audit Log',
        'position' => 50,
        'permissions' => [
            'audit.view' => [
                'label' => 'Lihat audit log',
                'description' => 'Membuka menu, daftar, dan detail jejak aktivitas sistem.',
            ],
        ],
    ],
];
