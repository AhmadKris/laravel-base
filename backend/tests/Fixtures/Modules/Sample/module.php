<?php

declare(strict_types=1);

return [
    'key' => 'sample',
    'label' => 'Contoh',
    'description' => 'Modul opsional untuk test.',
    'core' => false,
    'menu' => [
        'samples' => [
            'label' => 'Contoh',
            'path' => '/samples',
            'icon' => 'box',
            'permission' => null,
            'section' => 'operations',
            'position' => 10,
        ],
    ],
];
