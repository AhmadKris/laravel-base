<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Console;

use App\Core\Audit\AuditLogger;
use App\Modules\UserManagement\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

final class CreateSuperAdminCommand extends Command
{
    private const string ROLE = 'Super Admin';

    protected $signature = 'app:create-super-admin';

    protected $description = 'Create the first Super Admin account';

    public function handle(AuditLogger $auditLogger): int
    {
        if (! Role::query()->where('name', self::ROLE)->exists()) {
            $this->error('The Super Admin role does not exist. Run the RolePermissionSeeder first.');

            return self::FAILURE;
        }

        if (User::role(self::ROLE)->exists()) {
            $this->error('A Super Admin account already exists.');

            return self::FAILURE;
        }

        $validator = Validator::make([
            'name' => $this->ask('Name'),
            'email' => $this->ask('Email'),
            'password' => $this->secret('Password'),
            'password_confirmation' => $this->secret('Confirm password'),
        ], [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->uncompromised()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $attributes = $validator->validated();

        DB::transaction(function () use ($attributes, $auditLogger): void {
            $user = new User;
            $user->forceFill([...$attributes, 'email_verified_at' => now(), 'is_active' => true])->save();
            $user->assignRole(self::ROLE);

            $auditLogger->record('user.created', $user, ['source' => 'console', 'role' => self::ROLE]);
        });

        $this->info('Super Admin account created.');

        return self::SUCCESS;
    }
}
