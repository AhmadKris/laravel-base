<?php

declare(strict_types=1);

return [
    'role' => [
        'label' => 'Role',
        'position' => 20,
        'permissions' => [
            'role.view' => [
                'label' => 'Lihat role',
                'description' => 'Membuka menu, daftar, dan detail role.',
            ],
            'role.create' => [
                'label' => 'Tambah role',
                'description' => 'Membuat role kustom baru.',
                'requires' => ['role.view'],
            ],
            'role.update' => [
                'label' => 'Ubah role',
                'description' => 'Mengubah nama role kustom.',
                'requires' => ['role.view'],
            ],
            'role.delete' => [
                'label' => 'Hapus role',
                'description' => 'Menghapus role kustom yang belum dipakai pengguna.',
                'requires' => ['role.view'],
            ],
        ],
    ],
    'permission' => [
        'label' => 'Permission',
        'position' => 30,
        'permissions' => [
            'permission.view' => [
                'label' => 'Lihat daftar permission',
                'description' => 'Melihat seluruh opsi permission saat mengelola role.',
            ],
            'permission.assign' => [
                'label' => 'Atur permission role',
                'description' => 'Menambahkan atau mencabut hak akses pada role.',
                'requires' => ['role.view', 'permission.view'],
            ],
        ],
    ],
];
