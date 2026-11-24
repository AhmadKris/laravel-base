<?php

declare(strict_types=1);

use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    Storage::fake(User::AVATAR_DISK);
    $this->user = userWithRole('Staff', ['name' => 'Rina Wati', 'email' => 'rina@example.com', 'username' => 'rina']);
});

function uploadAvatar(mixed $test, User $user, UploadedFile $file): mixed
{
    return $test->actingAs($user)->post('/api/v1/account/avatar', ['file' => $file], ['Accept' => 'application/json']);
}

it('rejects guests on every account endpoint', function (string $method, string $path) {
    $this->json($method, '/api/v1'.$path)->assertUnauthorized()->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', '/account'],
    ['PATCH', '/account'],
    ['GET', '/account/avatar'],
    ['POST', '/account/avatar'],
    ['DELETE', '/account/avatar'],
]);

it('shows the signed-in account without secrets', function () {
    $response = $this->actingAs($this->user)->getJson('/api/v1/account')->assertOk();

    expect($response->json('data'))->toMatchArray([
        'id' => $this->user->uuid,
        'name' => 'Rina Wati',
        'email' => 'rina@example.com',
        'username' => 'rina',
        'phone' => null,
        'avatar' => null,
        'pending_email' => null,
        'roles' => ['Staff'],
    ])->and($response->json('data'))->not->toHaveKeys(['password', 'remember_token', 'avatar_path', 'pending_email_token']);
});

it('lets users without any role manage their own account', function () {
    $this->actingAs(User::factory()->create())
        ->patchJson('/api/v1/account', ['name' => 'Tanpa Role'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Tanpa Role');
});

it('updates the name and phone and records the change', function () {
    $this->actingAs($this->user)
        ->patchJson('/api/v1/account', ['name' => 'Rina Wati S.', 'phone' => '+62 812-3456-7890'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Rina Wati S.')
        ->assertJsonPath('data.phone', '+62 812-3456-7890');

    $activity = Activity::query()->where('event', 'user.updated')->sole();

    expect($activity->causer_id)->toBe($this->user->id)
        ->and($activity->properties['new'])->toEqual(['name' => 'Rina Wati S.', 'phone' => '+62 812-3456-7890']);
});

it('ignores fields that only administrators or the email flow may change', function () {
    $this->actingAs($this->user)
        ->patchJson('/api/v1/account', ['email' => 'other@example.com', 'username' => 'other', 'status' => 'inactive', 'roles' => ['Super Admin']])
        ->assertOk();

    $this->user->refresh();

    expect($this->user->email)->toBe('rina@example.com')
        ->and($this->user->username)->toBe('rina')
        ->and($this->user->is_active)->toBeTrue()
        ->and($this->user->getRoleNames()->all())->toBe(['Staff']);
});

it('validates the profile', function (array $payload, string $field) {
    $this->actingAs($this->user)->patchJson('/api/v1/account', $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'empty name' => [['name' => ''], 'name'],
    'long name' => [['name' => str_repeat('a', 151)], 'name'],
    'phone with letters' => [['phone' => '0812abc'], 'phone'],
    'phone too short' => [['phone' => '12'], 'phone'],
]);

it('stores the photo as a 256 pixel square and serves it to its owner', function () {
    uploadAvatar($this, $this->user, UploadedFile::fake()->image('photo.jpg', 900, 600))
        ->assertOk()
        ->assertJsonPath('data.avatar.version', $this->user->refresh()->avatarVersion());

    $path = $this->user->avatarPath();
    [$width, $height] = getimagesizefromstring(Storage::disk(User::AVATAR_DISK)->get($path));

    expect($path)->toStartWith('avatars/')
        ->and([$width, $height])->toBe([256, 256]);

    $this->actingAs($this->user)
        ->get('/api/v1/account/avatar')
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('keeps a small photo at its own size instead of enlarging it', function () {
    uploadAvatar($this, $this->user, UploadedFile::fake()->image('small.png', 120, 80))->assertOk();

    [$width, $height] = getimagesizefromstring(Storage::disk(User::AVATAR_DISK)->get($this->user->refresh()->avatarPath()));

    expect([$width, $height])->toBe([80, 80]);
});

it('replaces and removes the photo, deleting the old files', function () {
    uploadAvatar($this, $this->user, UploadedFile::fake()->image('first.png', 300, 300))->assertOk();
    $first = $this->user->refresh()->avatarPath();

    uploadAvatar($this, $this->user, UploadedFile::fake()->image('second.png', 300, 300))->assertOk();
    $second = $this->user->refresh()->avatarPath();

    Storage::disk(User::AVATAR_DISK)->assertMissing($first);
    Storage::disk(User::AVATAR_DISK)->assertExists($second);

    $this->actingAs($this->user)->deleteJson('/api/v1/account/avatar')->assertOk()->assertJsonPath('data.avatar', null);

    Storage::disk(User::AVATAR_DISK)->assertMissing($second);
    expect(Activity::query()->orderBy('id')->pluck('event')->all())->toBe(['user.avatar_updated', 'user.avatar_updated', 'user.avatar_removed']);

    $this->actingAs($this->user)->get('/api/v1/account/avatar')->assertNotFound();
});

it('rejects files that are not a usable photo', function (Closure $file, string $message) {
    $response = uploadAvatar($this, $this->user, $file())->assertUnprocessable();

    expect($response->json('errors.file'))->toContain($message)
        ->and(Storage::disk(User::AVATAR_DISK)->allFiles())->toBe([]);
})->with([
    'svg' => [fn () => UploadedFile::fake()->createWithContent('photo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'), 'Foto harus berupa file PNG, JPG, atau WebP.'],
    'too large' => [fn () => UploadedFile::fake()->image('photo.png', 64, 64)->size(2049), 'Foto maksimal 2 MB.'],
    'damaged' => [fn () => UploadedFile::fake()->createWithContent('photo.png', "\x89PNG\r\n\x1a\nbroken"), 'Foto tidak dapat dibaca. Simpan ulang gambarnya lalu unggah kembali.'],
]);

it('serves photos of other users only within the viewer scope', function () {
    uploadAvatar($this, $this->user, UploadedFile::fake()->image('photo.png', 64, 64))->assertOk();
    $path = "/api/v1/users/{$this->user->uuid}/avatar";

    $this->actingAs(userWithRole('Admin'))->get($path)->assertOk()->assertHeader('Content-Type', 'image/png');
    $this->actingAs(userWithRole('Staff'))->getJson($path)->assertNotFound();
    $this->actingAs(User::factory()->create())->getJson($path)->assertForbidden();
    $this->actingAs(userWithRole('Admin'))->getJson('/api/v1/users/'.User::factory()->create()->uuid.'/avatar')->assertNotFound();
});

it('includes the photo version for the signed-in user and in the user list', function () {
    uploadAvatar($this, $this->user, UploadedFile::fake()->image('photo.png', 64, 64))->assertOk();
    $version = $this->user->refresh()->avatarVersion();

    $this->actingAs($this->user)->getJson('/api/v1/auth/user')->assertJsonPath('data.avatar.version', $version);
    $this->actingAs($this->user)->getJson('/api/v1/users')->assertJsonPath('data.0.avatar.version', $version);
});
