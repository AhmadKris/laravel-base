<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Illuminate\Database\Seeder;

class SystemConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $configurations = [
            'company.name' => [config('app.name'), true, 'Nama perusahaan'],
            'company.address' => [null, false, 'Alamat perusahaan'],
            'company.phone' => [null, false, 'Nomor telepon perusahaan'],
            'company.email' => [null, false, 'Email perusahaan'],
            'company.logo' => [null, false, 'Logo perusahaan'],
            'company.logo_dark' => [null, false, 'Logo untuk latar gelap'],
            'company.logo_show_name' => [true, false, 'Tampilkan nama aplikasi di samping logo'],
            'company.logo_background' => ['transparent', false, 'Latar di belakang logo'],
            'company.logo_size' => ['medium', false, 'Ukuran tampil logo'],
            'company.favicon' => [null, false, 'Favicon aplikasi'],
            'localization.timezone' => ['Asia/Jakarta', true, 'Zona waktu tampilan'],
            'localization.locale' => ['id', true, 'Bahasa aplikasi'],
            'localization.currency' => ['IDR', true, 'Mata uang'],
        ];

        foreach ($configurations as $key => [$value, $isPublic, $description]) {
            SystemConfiguration::query()->firstOrCreate(['key' => $key], [
                'value' => $value,
                'is_public' => $isPublic,
                'description' => $description,
            ]);
        }
    }
}
