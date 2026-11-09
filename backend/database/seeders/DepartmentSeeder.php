<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Department\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    private const array DEPARTMENTS = [
        'IT' => 'Information Technology',
        'FIN' => 'Finance',
        'HR' => 'Human Resources',
    ];

    public function run(): void
    {
        foreach (self::DEPARTMENTS as $code => $name) {
            Department::withTrashed()->firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }
}
