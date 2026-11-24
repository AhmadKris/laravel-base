<?php

declare(strict_types=1);

return [
    'key' => 'user_management',
    'label' => 'Pengguna',
    'description' => 'Akun pengguna, status, dan role yang dimilikinya.',
    'core' => true,
    'menu' => [
        'users' => [
            'label' => 'Pengguna',
            'path' => '/users',
            'icon' => 'users',
            'permission' => 'user.view',
            'section' => 'administration',
            'position' => 10,
        ],
    ],
];
