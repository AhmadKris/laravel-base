<?php

declare(strict_types=1);

return [
    'key' => 'system_configuration',
    'label' => 'Pengaturan sistem',
    'description' => 'Data perusahaan, lokalisasi, branding, menu, dan modul.',
    'core' => true,
    'menu' => [
        'settings' => [
            'label' => 'Pengaturan',
            'path' => '/settings',
            'icon' => 'settings',
            'permission' => 'system_config.view',
            'section' => 'administration',
            'position' => 40,
            // Hiding it would leave administrators without a way back to the menu settings.
            'can_hide' => false,
        ],
    ],
];
