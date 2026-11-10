<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Data for the Playwright tests in frontend/e2e. Run only against the testing database.
 */
class E2ESeeder extends Seeder
{
    public const string USERNAME = 'e2e.admin';

    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('The E2E seeder must never run in production.');
        }

        // Read from the process: frontend/e2e/global-setup.ts passes it when it runs this seeder.
        $password = getenv('E2E_PASSWORD');

        if (! is_string($password) || strlen($password) < 12) {
            throw new RuntimeException('Set E2E_PASSWORD to a password of at least 12 characters.');
        }

        $this->call([RolePermissionSeeder::class, SystemConfigurationSeeder::class]);

        User::factory()
            ->create(['name' => 'Admin E2E', 'username' => self::USERNAME, 'email' => 'e2e.admin@example.com', 'password' => $password])
            ->assignRole('Admin');
    }
}
