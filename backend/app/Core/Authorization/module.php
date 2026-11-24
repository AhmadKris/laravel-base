<?php

declare(strict_types=1);

return [
    'key' => 'authorization',
    'label' => 'Role & Permission',
    'description' => 'Role, permission, dan batas kewenangan setiap pengguna.',
    'core' => true,
    'menu' => [
        'roles' => [
            'label' => 'Role',
            'path' => '/roles',
            'icon' => 'shield-check',
            'permission' => 'role.view',
            'section' => 'administration',
            'position' => 20,
        ],
    ],
];
