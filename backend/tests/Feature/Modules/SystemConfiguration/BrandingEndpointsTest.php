<?php

declare(strict_types=1);

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemConfigurationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([RolePermissionSeeder::class, SystemConfigurationSeeder::class]);
    $this->disk = Storage::fake(SystemConfiguration::BRANDING_DISK);
    $this->admin = userWithRole('Admin');
});

function brandingValue(string $asset): mixed
{
    return SystemConfiguration::query()->where('key', "company.{$asset}")->sole()->value;
}

/**
 * A real upload, so the type is detected from the content like in production. Fake files take it from the name.
 */
function uploadedContent(string $name, string $content): UploadedFile
{
    $path = (string) tempnam(sys_get_temp_dir(), 'upl');
    file_put_contents($path, $content);

    return new UploadedFile($path, $name, null, null, true);
}

/**
 * An ICO file that holds one PNG image, which is how current browsers and tools write favicons.
 */
function icoFile(int $size = 32): UploadedFile
{
    $png = UploadedFile::fake()->image('icon.png', $size, $size)->getContent();
    $header = pack('vvv', 0, 1, 1).pack('CCCCvvVV', $size, $size, 0, 0, 1, 32, strlen($png), 22);

    return uploadedContent('favicon.ico', $header.$png);
}

it('serves branding without login', function () {
    $this->actingAs($this->admin)
        ->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('logo.png', 200, 80)])
        ->assertOk();

    auth()->forgetGuards();

    $this->getJson('/api/v1/branding')
        ->assertOk()
        ->assertJsonPath('data.logo.version', 2)
        ->assertJsonPath('data.logo_dark', null)
        ->assertJsonPath('data.favicon', null)
        ->assertJsonPath('data.display', ['show_name' => true, 'background' => 'transparent', 'size' => 'medium']);

    $this->get('/api/v1/branding/logo')
        ->assertOk()
        ->assertHeader('Content-Type', 'image/png')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Content-Security-Policy', "default-src 'none'; sandbox");
});

it('rejects guests and roles without the update permission', function (?string $role, int $status) {
    if ($role !== null) {
        $this->actingAs(userWithRole($role));
    }

    $this->postJson('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('logo.png')])->assertStatus($status);
    $this->deleteJson('/api/v1/branding/logo')->assertStatus($status);
})->with([
    'guest' => [null, 401],
    'staff' => ['Staff', 403],
]);

it('stores the logo privately under a random name and records it', function () {
    $this->actingAs($this->admin)
        ->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('Logo Kantor.png', 200, 80)])
        ->assertOk()
        ->assertJsonPath('data.version', 2);

    $value = brandingValue('logo');

    expect($value['path'])->toMatch('#^branding/[A-Za-z0-9]{40}\.png$#')
        ->and($value['mime_type'])->toBe('image/png')
        ->and($this->disk->exists($value['path']))->toBeTrue();

    $activity = Activity::query()->where('event', 'system.branding_updated')->sole();

    expect($activity->properties['asset'])->toBe('logo')
        ->and($activity->causer_id)->toBe($this->admin->id);
});

it('replaces the previous file', function () {
    $this->actingAs($this->admin)->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('a.png')]);
    $oldPath = brandingValue('logo')['path'];

    $this->actingAs($this->admin)->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('b.jpg')])->assertOk();

    expect($this->disk->exists($oldPath))->toBeFalse()
        ->and($this->disk->allFiles('branding'))->toHaveCount(1)
        ->and(brandingValue('logo')['path'])->toEndWith('.jpg');
});

it('accepts a favicon as ICO or PNG', function (UploadedFile $file, string $type) {
    $this->actingAs($this->admin)->post('/api/v1/branding/favicon', ['file' => $file])->assertOk();

    $this->get('/api/v1/branding/favicon')->assertOk()->assertHeader('Content-Type', $type);
})->with([
    'ico' => [fn () => icoFile(), 'image/x-icon'],
    'png' => [fn () => UploadedFile::fake()->image('favicon.png', 64, 64), 'image/png'],
]);

it('validates the file', function (string $asset, Closure $file, string $message) {
    $this->actingAs($this->admin)
        ->post("/api/v1/branding/{$asset}", ['file' => $file()], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.file.0', $message);

    expect($this->disk->allFiles('branding'))->toBe([]);
})->with([
    'missing file' => ['logo', fn () => null, 'Pilih file logo.'],
    'svg logo' => ['logo', fn () => uploadedContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'Logo harus berupa file PNG, JPG, atau WebP.'],
    'text renamed to png' => ['logo', fn () => uploadedContent('logo.png', 'bukan gambar'), 'Logo harus berupa file PNG, JPG, atau WebP.'],
    'png renamed to txt' => ['logo', fn () => uploadedContent('logo.txt', UploadedFile::fake()->image('x.png')->getContent()), 'Logo harus berupa file PNG, JPG, atau WebP.'],
    'logo too large' => ['logo', fn () => UploadedFile::fake()->image('logo.png')->size(2049), 'Logo maksimal 2 MB.'],
    'dark logo svg' => ['logo-dark', fn () => uploadedContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'), 'Logo latar gelap harus berupa file PNG, JPG, atau WebP.'],
    'logo too wide' => ['logo', fn () => UploadedFile::fake()->image('logo.png', 2049, 100), 'Logo maksimal 2048 x 2048 piksel.'],
    'favicon not square' => ['favicon', fn () => UploadedFile::fake()->image('favicon.png', 64, 32), 'Favicon harus persegi, 16 sampai 512 piksel.'],
    'favicon jpg' => ['favicon', fn () => UploadedFile::fake()->image('favicon.jpg', 32, 32), 'Favicon harus berupa file PNG atau ICO.'],
    'favicon too large' => ['favicon', fn () => UploadedFile::fake()->image('favicon.png', 64, 64)->size(1025), 'Favicon maksimal 1 MB.'],
]);

it('accepts files up to the size limit', function (string $asset, UploadedFile $file) {
    $this->actingAs($this->admin)->post("/api/v1/branding/{$asset}", ['file' => $file])->assertOk();
})->with([
    'logo of 2 MB' => ['logo', fn () => UploadedFile::fake()->image('logo.png', 400, 120)->size(2048)],
    'favicon of 1 MB' => ['favicon', fn () => UploadedFile::fake()->image('favicon.png', 64, 64)->size(1024)],
]);

it('stores a separate logo for dark backgrounds', function () {
    $this->actingAs($this->admin)
        ->post('/api/v1/branding/logo-dark', ['file' => UploadedFile::fake()->image('logo-putih.png', 400, 120)])
        ->assertOk();

    expect(brandingValue('logo_dark')['path'])->toMatch('#^branding/[A-Za-z0-9]{40}\.png$#');

    $this->getJson('/api/v1/branding')->assertJsonPath('data.logo_dark.version', 2)->assertJsonPath('data.logo', null);
    $this->get('/api/v1/branding/logo-dark')->assertOk()->assertHeader('Content-Type', 'image/png');
});

it('returns the logo display settings', function () {
    foreach (['logo_show_name' => false, 'logo_background' => 'white', 'logo_size' => 'large'] as $name => $value) {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/system-configurations/company.{$name}", ['value' => $value, 'version' => 1])
            ->assertOk();
    }

    auth()->forgetGuards();

    $this->getJson('/api/v1/branding')
        ->assertJsonPath('data.display', ['show_name' => false, 'background' => 'white', 'size' => 'large']);
});

it('returns not found for an unknown asset', function () {
    $this->getJson('/api/v1/branding/banner')->assertNotFound();
    $this->actingAs($this->admin)->postJson('/api/v1/branding/banner', ['file' => UploadedFile::fake()->image('a.png')])->assertNotFound();
});

it('returns not found when no file was uploaded', function () {
    $this->get('/api/v1/branding/logo')->assertNotFound();
});

it('removes the file and goes back to the default', function () {
    $this->actingAs($this->admin)->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('a.png')]);
    $path = brandingValue('logo')['path'];

    $this->actingAs($this->admin)->deleteJson('/api/v1/branding/logo')->assertNoContent();

    expect(brandingValue('logo'))->toBeNull()
        ->and($this->disk->exists($path))->toBeFalse()
        ->and(Activity::query()->where('event', 'system.branding_removed')->count())->toBe(1);

    $this->get('/api/v1/branding/logo')->assertNotFound();
    $this->getJson('/api/v1/branding')->assertJsonPath('data.logo', null);
});

it('never serves a stored path that the upload did not write', function (string $path) {
    $this->disk->put($path, 'secret');
    SystemConfiguration::query()->where('key', 'company.logo')->update(['value' => json_encode(['path' => $path])]);

    $this->get('/api/v1/branding/logo')->assertNotFound();
    $this->getJson('/api/v1/branding')->assertJsonPath('data.logo', null);
})->with([
    'outside the directory' => ['other/'.str_repeat('a', 40).'.png'],
    'traversal' => ['branding/../.env'],
    'unexpected extension' => ['branding/'.str_repeat('a', 40).'.php'],
]);

it('keeps branding keys out of the generic update', function (mixed $value) {
    $this->actingAs($this->admin)
        ->patchJson('/api/v1/system-configurations/company.logo_dark', ['value' => $value, 'version' => 1])
        ->assertUnprocessable();

    $this->actingAs($this->admin)
        ->patchJson('/api/v1/system-configurations/company.logo', ['value' => $value, 'version' => 1])
        ->assertUnprocessable()
        ->assertJsonPath('errors.value.0', 'Logo perusahaan hanya dapat diubah dengan mengunggah file.');

    expect(brandingValue('logo'))->toBeNull();
})->with([
    'a path' => [['path' => 'branding/../.env']],
    'null' => [null],
]);

it('deletes the new file when saving fails', function () {
    SystemConfiguration::saving(fn () => throw new RuntimeException('database down'));

    $this->actingAs($this->admin)
        ->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('a.png')], ['Accept' => 'application/json'])
        ->assertServerError();

    expect($this->disk->allFiles('branding'))->toBe([])
        ->and(brandingValue('logo'))->toBeNull();
});

it('limits uploads per user', function () {
    foreach (range(1, 20) as $attempt) {
        $this->actingAs($this->admin)->post('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('a.png')])->assertOk();
    }

    $this->actingAs($this->admin)
        ->postJson('/api/v1/branding/logo', ['file' => UploadedFile::fake()->image('a.png')])
        ->assertTooManyRequests();
});
