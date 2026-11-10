<?php

declare(strict_types=1);

namespace App\Core\Audit\Enums;

enum AuditEvent: string
{
    case Login = 'auth.login';
    case LoginFailed = 'auth.login_failed';
    case Logout = 'auth.logout';
    case PasswordChanged = 'auth.password_changed';
    case PasswordReset = 'auth.password_reset';
    case PermissionAssigned = 'permission.assigned';
    case PermissionRevoked = 'permission.revoked';
    case RoleCreated = 'role.created';
    case RoleUpdated = 'role.updated';
    case RoleDeleted = 'role.deleted';
    case ConfigurationUpdated = 'system.configuration_updated';
    case BrandingUpdated = 'system.branding_updated';
    case BrandingRemoved = 'system.branding_removed';
    case UserCreated = 'user.created';
    case UserUpdated = 'user.updated';
    case UserDeactivated = 'user.deactivated';
    case UserRoleAssigned = 'user.role_assigned';
    case UserRoleRemoved = 'user.role_removed';

    /**
     * What the actor did, written to follow their name, as in "Budi masuk ke aplikasi".
     */
    public function action(): string
    {
        return match ($this) {
            self::Login => 'masuk ke aplikasi',
            self::LoginFailed => 'gagal masuk',
            self::Logout => 'keluar dari aplikasi',
            self::PasswordChanged => 'mengubah password',
            self::PasswordReset => 'mereset password',
            self::PermissionAssigned => 'memberikan permission',
            self::PermissionRevoked => 'mencabut permission',
            self::RoleCreated => 'membuat role',
            self::RoleUpdated => 'memperbarui role',
            self::RoleDeleted => 'menghapus role',
            self::ConfigurationUpdated => 'memperbarui pengaturan sistem',
            self::BrandingUpdated => 'mengunggah logo atau favicon',
            self::BrandingRemoved => 'menghapus logo atau favicon',
            self::UserCreated => 'menambahkan pengguna',
            self::UserUpdated => 'memperbarui data pengguna',
            self::UserDeactivated => 'menonaktifkan pengguna',
            self::UserRoleAssigned => 'memberikan role kepada pengguna',
            self::UserRoleRemoved => 'mencabut role pengguna',
        };
    }

    /**
     * Events whose action contains the term, ignoring case.
     *
     * @return list<string>
     */
    public static function matchingAction(string $term): array
    {
        return array_values(array_map(
            fn (self $event): string => $event->value,
            array_filter(self::cases(), fn (self $event): bool => mb_stripos($event->action(), $term) !== false),
        ));
    }
}
