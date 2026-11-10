<?php

declare(strict_types=1);

use App\Core\Authentication\Events\PasswordChanged;
use App\Modules\Notification\Enums\NotificationCategory;
use App\Modules\Notification\Models\Notification;
use App\Modules\Notification\Notifications\PasswordChangedNotification;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Http::fake(['api.pwnedpasswords.com/*' => Http::response('')]);
});

it('rejects guests on every notification endpoint', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    'list' => ['GET', '/notifications'],
    'unread count' => ['GET', '/notifications/unread-count'],
    'mark as read' => ['PATCH', '/notifications/'.UNKNOWN_USER.'/read'],
    'read all' => ['POST', '/notifications/read-all'],
]);

it('allows any authenticated user without permissions to read and count only their own notifications', function () {
    $viewer = User::factory()->create();
    $other = User::factory()->create();

    Notification::factory()->forUser($viewer)->create([
        'type' => 'security.password_changed',
        'data' => [
            'category' => NotificationCategory::Security->value,
            'title' => 'Password diubah',
            'message' => 'Pesan keamanan milik viewer.',
            'action_url' => '/change-password',
        ],
    ]);
    Notification::factory()->forUser($viewer)->read()->create([
        'type' => 'user.roles_updated',
        'data' => [
            'category' => NotificationCategory::User->value,
            'title' => 'Role diperbarui',
            'message' => 'Role saat ini: Staff.',
            'action_url' => '/',
        ],
    ]);
    Notification::factory()->forUser($other)->create();

    $this->actingAs($viewer)
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.pagination.total', 2);

    $this->actingAs($viewer)
        ->getJson('/api/v1/notifications/unread-count')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 1);
});

it('lists newest notifications first and supports filtering, searching, and sorting', function () {
    $user = User::factory()->create();

    $this->travelTo('2026-11-01 08:00:00');
    $older = Notification::factory()->forUser($user)->read()->create([
        'type' => 'security.password_changed',
        'data' => [
            'category' => 'security',
            'title' => 'Password akun diubah',
            'message' => 'Persen 100% aman.',
            'action_url' => '/change-password',
        ],
    ]);

    $this->travelTo('2026-11-02 09:00:00');
    $newer = Notification::factory()->forUser($user)->create([
        'type' => 'user.roles_updated',
        'data' => [
            'category' => 'user',
            'title' => 'Role akun diperbarui',
            'message' => 'Role Anda diperbarui ke Staff.',
            'action_url' => '/',
        ],
    ]);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?status=unread')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $newer->id);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?status=read')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $older->id);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?category=security')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $older->id);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?search=STAFF')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $newer->id);

    // Wildcards in search are treated as literal characters.
    $this->actingAs($user)
        ->getJson('/api/v1/notifications?search=%25')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $older->id);

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?sort_by=created_at&sort_direction=asc')
        ->assertOk()
        ->assertJsonPath('data.0.id', $older->id);
});

it('validates notification list filters and sorting', function (string $query, string $field) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'invalid status' => ['status=archived', 'status'],
    'invalid category' => ['category=unknown', 'category'],
    'category no notification is sent for' => ['category=workflow', 'category'],
    'disallowed sort field' => ['sort_by=data', 'sort_by'],
    'invalid per page' => ['per_page=101', 'per_page'],
    'invalid date' => ['date_from=01-11-2026', 'date_from'],
    'reversed date range' => ['date_from=2026-11-10&date_to=2026-11-09', 'date_to'],
    'date-time without offset' => ['date_from=2026-11-10T00:00:00', 'date_from'],
]);

it('filters notifications by date range and timezone offset', function () {
    $user = User::factory()->create();

    $this->travelTo('2026-11-09 16:59:00');
    Notification::factory()->forUser($user)->create(['data' => ['category' => 'security', 'title' => 'Kemarin WIB', 'message' => 'Sebelum tengah malam']]);

    $this->travelTo('2026-11-09 17:00:00');
    $start = Notification::factory()->forUser($user)->create(['data' => ['category' => 'security', 'title' => 'Awal hari WIB', 'message' => 'Tepat tengah malam']]);

    $this->travelTo('2026-11-10 16:59:59');
    $end = Notification::factory()->forUser($user)->create(['data' => ['category' => 'security', 'title' => 'Akhir hari WIB', 'message' => 'Menjelang tengah malam']]);

    $this->travelTo('2026-11-10 17:00:00');
    Notification::factory()->forUser($user)->create(['data' => ['category' => 'security', 'title' => 'Besok WIB', 'message' => 'Hari berikutnya']]);

    $titles = $this->actingAs($user)
        ->getJson('/api/v1/notifications?'.http_build_query([
            'date_from' => '2026-11-10T00:00:00+07:00',
            'date_to' => '2026-11-10T23:59:59+07:00',
        ]))
        ->assertOk()
        ->json('data.*.id');

    expect($titles)->toBe([$end->id, $start->id]);
});

it('marks an owned notification as read idempotently', function () {
    $user = User::factory()->create();
    $notification = Notification::factory()->forUser($user)->create();

    $this->actingAs($user)
        ->patchJson("/api/v1/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.id', $notification->id)
        ->assertJsonPath('data.is_read', true);

    $firstReadAt = $notification->refresh()->read_at;
    expect($firstReadAt)->not->toBeNull();

    $this->travel(5)->minutes();

    $this->actingAs($user)
        ->patchJson("/api/v1/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.is_read', true);

    expect($notification->refresh()->read_at?->toISOString())->toBe($firstReadAt?->toISOString());
});

it('returns not found when marking another user notification or an unknown id as read', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherNotification = Notification::factory()->forUser($other)->create();

    $this->actingAs($user)
        ->patchJson("/api/v1/notifications/{$otherNotification->id}/read")
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($otherNotification->refresh()->read_at)->toBeNull();

    $this->actingAs($user)
        ->patchJson('/api/v1/notifications/999/read')
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');
});

it('marks all unread notifications of the current user as read without affecting others', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    Notification::factory()->count(2)->forUser($user)->create();
    Notification::factory()->forUser($user)->read()->create();
    $otherUnread = Notification::factory()->forUser($other)->create();

    $this->actingAs($user)
        ->postJson('/api/v1/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 0)
        ->assertJsonPath('data.marked_count', 2);

    expect(Notification::query()->visibleTo($user)->whereNull('read_at')->count())->toBe(0)
        ->and($otherUnread->refresh()->read_at)->toBeNull();
});

it('creates an in-app security notification when a user changes or resets their password without secrets', function () {
    $oldPassword = 'the-current-long-password';
    $newPassword = 'a-brand-new-long-password';
    $resetPassword = 'another-brand-new-password';
    $user = User::factory()->create(['password' => $oldPassword]);

    $this->actingAs($user)
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/change-password', [
            'current_password' => $oldPassword,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ])
        ->assertOk();

    $changed = Notification::query()->visibleTo($user)->sole();
    expect($changed->type)->toBe('security.password_changed')
        ->and($changed->data['category'])->toBe('security')
        ->and($changed->data['action_url'])->toBe('/change-password')
        ->and(json_encode($changed->data))->not->toContain($oldPassword)
        ->and(json_encode($changed->data))->not->toContain($newPassword);

    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email,
        'token' => $token,
        'password' => $resetPassword,
        'password_confirmation' => $resetPassword,
    ])->assertOk();

    expect(Notification::query()->visibleTo($user)->where('type', 'security.password_reset')->count())->toBe(1);
});

it('notifies the target user only when existing roles change and never on create or rollback', function () {
    $admin = userWithRole('Super Admin');

    $createdId = $this->actingAs($admin)
        ->postJson('/api/v1/users', [
            'name' => 'Pengguna Baru',
            'email' => 'baru@example.com',
            'password' => 'a-strong-initial-password',
            'roles' => ['Staff'],
        ])
        ->assertCreated()
        ->json('data.id');

    $target = User::query()->where('uuid', $createdId)->sole();
    expect(Notification::query()->visibleTo($target)->count())->toBe(0);

    // Same role set sends no notification.
    $this->actingAs($admin)
        ->putJson("/api/v1/users/{$target->uuid}/roles", ['roles' => ['Staff']])
        ->assertOk();
    expect(Notification::query()->visibleTo($target)->count())->toBe(0);

    // Changing roles notifies the user.
    $this->actingAs($admin)
        ->putJson("/api/v1/users/{$target->uuid}/roles", ['roles' => ['Admin']])
        ->assertOk();

    $roleNotification = Notification::query()->visibleTo($target)->sole();
    expect($roleNotification->type)->toBe('user.roles_updated')
        ->and($roleNotification->data['category'])->toBe('user')
        ->and($roleNotification->data['message'])->toContain('Admin');

    // Failed role escalation does not notify.
    $normalAdmin = userWithRole('Admin');
    $this->actingAs($normalAdmin)
        ->putJson("/api/v1/users/{$target->uuid}/roles", ['roles' => ['Super Admin']])
        ->assertForbidden();

    expect(Notification::query()->visibleTo($target)->count())->toBe(1);
});

it('queues notifications and skips duplicate ids on retry', function () {
    Queue::fake();

    $user = User::factory()->create();
    PasswordChanged::dispatch($user);

    Queue::assertPushed(SendQueuedNotifications::class, function (SendQueuedNotifications $job) use ($user): bool {
        return $job->afterCommit === true
            && $job->deleteWhenMissingModels === true
            && $job->notifiables->contains($user);
    });

    $notification = new PasswordChangedNotification;
    $notification->id = (string) Str::uuid7();

    expect($notification->shouldSend($user, 'database'))->toBeTrue();

    Notification::factory()->forUser($user)->create(['id' => $notification->id]);

    expect($notification->shouldSend($user, 'database'))->toBeFalse();
});

it('searches notifications when the server treats double quotes as identifiers', function () {
    $user = User::factory()->create();
    $match = Notification::factory()->forUser($user)->create([
        'data' => ['category' => 'security', 'title' => 'Password akun diubah', 'message' => 'Isi pesan', 'action_url' => null],
    ]);
    Notification::factory()->forUser($user)->create([
        'data' => ['category' => 'security', 'title' => 'Lain', 'message' => 'Isi lain', 'action_url' => null],
    ]);
    DB::statement("SET SESSION sql_mode = CONCAT(@@SESSION.sql_mode, ',ANSI_QUOTES')");

    $this->actingAs($user)
        ->getJson('/api/v1/notifications?search=password')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id);
});
