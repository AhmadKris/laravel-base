<?php

declare(strict_types=1);

return [
    'system_config' => [
        'label' => 'Pengaturan sistem',
        'position' => 40,
        'permissions' => [
            'system_config.view' => [
                'label' => 'Lihat pengaturan',
                'description' => 'Membuka menu dan membaca pengaturan aplikasi.',
            ],
            'system_config.update' => [
                'label' => 'Ubah pengaturan sistem',
                'description' => 'Mengubah profil perusahaan, lokalisasi, dan tampilan merek.',
                'requires' => ['system_config.view'],
            ],
            'system_config.feature_flags' => [
                'label' => 'Kelola fitur sistem',
                'description' => 'Mengaktifkan atau menonaktifkan modul dan feature flag.',
                'requires' => ['system_config.view'],
            ],
        ],
    ],
];
