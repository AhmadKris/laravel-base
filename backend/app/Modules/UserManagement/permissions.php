<?php

declare(strict_types=1);

return [
    'user' => [
        'label' => 'Pengguna',
        'position' => 10,
        'permissions' => [
            'user.view' => [
                'label' => 'Lihat pengguna',
                'description' => 'Membuka menu, daftar, dan detail pengguna.',
            ],
            'user.create' => [
                'label' => 'Tambah pengguna',
                'description' => 'Membuat akun pengguna baru.',
                'requires' => ['user.view'],
            ],
            'user.update' => [
                'label' => 'Ubah pengguna',
                'description' => 'Mengubah data akun dan mengaktifkan kembali pengguna.',
                'requires' => ['user.view'],
            ],
            'user.delete' => [
                'label' => 'Nonaktifkan pengguna',
                'description' => 'Menonaktifkan akun pengguna dan mengakhiri sesinya.',
                'requires' => ['user.view'],
            ],
            'user.assign_role' => [
                'label' => 'Tetapkan role pengguna',
                'description' => 'Mengatur role yang dimiliki pengguna lain.',
                'requires' => ['user.view', 'role.view'],
            ],
        ],
    ],
];
