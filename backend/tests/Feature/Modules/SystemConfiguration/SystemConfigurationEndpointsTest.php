<?php

declare(strict_types=1);

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

const SENSITIVE_VALUE = 'smtp-password-plain-value';

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->superAdmin = userWithRole('Super Admin');
    $this->admin = userWithRole('Admin');

    $this->companyName = SystemConfiguration::factory()->public()->create(['key' => 'company.name', 'value' => 'PT Maju']);
    $this->internal = SystemConfiguration::factory()->create(['key' => 'security.session_policy', 'value' => 'strict']);
    $this->sensitive = SystemConfiguration::factory()->sensitive()->create([
        'key' => 'company.smtp_password',
        'value' => Crypt::encrypt(SENSITIVE_VALUE),
    ]);
});

function configurationUrl(SystemConfiguration $configuration): string
{
    return "/api/v1/system-configurations/{$configuration->key}";
}

it('rejects guests on protected endpoints', function (string $method, string $path) {
    $this->json($method, '/api/v1/system-configurations'.$path)
        ->assertUnauthorized()
        ->assertJsonPath('code', 'AUTH_UNAUTHENTICATED');
})->with([
    ['GET', ''],
    ['GET', '/company.name'],
    ['PATCH', '/company.name'],
    ['GET', '/feature-flags'],
]);

it('rejects roles without access before looking up the key', function (string $role, string $method, string $path) {
    $this->actingAs(userWithRole($role))
        ->json($method, '/api/v1/system-configurations'.$path)
        ->assertForbidden()
        ->assertJsonPath('code', 'AUTH_FORBIDDEN');
})->with([
    'staff cannot list' => ['Staff', 'GET', ''],
    'staff cannot read' => ['Staff', 'GET', '/unknown.key'],
    'viewer cannot update' => ['Viewer', 'PATCH', '/unknown.key'],
    'admin cannot read feature flags' => ['Admin', 'GET', '/feature-flags'],
]);

it('shows every key to the super admin', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/system-configurations')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.pagination.total', 3);
});

it('limits an admin to the allowed prefixes', function () {
    $keys = collect($this->actingAs($this->admin)->getJson('/api/v1/system-configurations')->assertOk()->json('data'))
        ->pluck('key');

    expect($keys->all())->toBe(['company.name', 'company.smtp_password']);
});

it('hides keys outside the allowed prefixes from an admin', function (string $method, array $payload) {
    $this->actingAs($this->admin)
        ->json($method, configurationUrl($this->internal), $payload)
        ->assertNotFound()
        ->assertJsonPath('code', 'RESOURCE_NOT_FOUND');

    expect($this->internal->refresh()->value)->toBe('strict');
})->with([
    'read' => ['GET', []],
    'update' => ['PATCH', ['value' => 'relaxed', 'version' => 1]],
]);

it('returns a configuration by key', function () {
    $this->actingAs($this->admin)
        ->getJson(configurationUrl($this->companyName))
        ->assertOk()
        ->assertJsonPath('data.key', 'company.name')
        ->assertJsonPath('data.value', 'PT Maju')
        ->assertJsonPath('data.is_public', true)
        ->assertJsonPath('data.version', 1)
        ->assertJsonMissingPath('data.id');
});

it('returns not found for an unknown key', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/system-configurations/unknown.key')
        ->assertNotFound();
});

it('never sends a sensitive value', function (string $url) {
    $response = $this->actingAs($this->superAdmin)->getJson($url)->assertOk();

    expect($response->getContent())
        ->not->toContain(SENSITIVE_VALUE)
        ->not->toContain($this->sensitive->value);
})->with([
    'list' => ['/api/v1/system-configurations'],
    'detail' => ['/api/v1/system-configurations/company.smtp_password'],
]);

it('marks a sensitive configuration with a null value', function () {
    $this->actingAs($this->superAdmin)
        ->getJson(configurationUrl($this->sensitive))
        ->assertJsonPath('data.value', null)
        ->assertJsonPath('data.is_sensitive', true);
});

it('searches and sorts configurations', function () {
    $this->actingAs($this->superAdmin)->getJson('/api/v1/system-configurations?search=session')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.key', 'security.session_policy');
    $this->actingAs($this->superAdmin)->getJson('/api/v1/system-configurations?sort_by=key&sort_direction=desc')
        ->assertJsonPath('data.0.key', 'security.session_policy');
    $this->actingAs($this->superAdmin)->getJson('/api/v1/system-configurations?sort_by=value')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('sort_by');
});

it('updates a value and records who changed it', function () {
    $this->actingAs($this->admin)
        ->patchJson(configurationUrl($this->companyName), ['value' => 'PT Baru', 'version' => 1])
        ->assertOk()
        ->assertJsonPath('data.value', 'PT Baru')
        ->assertJsonPath('data.version', 2);

    expect($this->companyName->refresh()->updated_by)->toBe($this->admin->id);

    $activity = Activity::query()->where('event', 'system.configuration_updated')->sole();

    expect($activity->properties['key'])->toBe('company.name')
        ->and($activity->properties['old'])->toBe('PT Maju')
        ->and($activity->properties['new'])->toBe('PT Baru')
        ->and($activity->causer_id)->toBe($this->admin->id);
});

it('rejects a stale version without changing the value', function () {
    $this->actingAs($this->admin)
        ->patchJson(configurationUrl($this->companyName), ['value' => 'PT Baru', 'version' => 9])
        ->assertConflict()
        ->assertJsonPath('code', 'RESOURCE_VERSION_CONFLICT');

    expect($this->companyName->refresh()->value)->toBe('PT Maju');
});

it('stores a sensitive value encrypted and keeps it out of the response and audit', function () {
    $response = $this->actingAs($this->superAdmin)
        ->patchJson(configurationUrl($this->sensitive), ['value' => 'new-smtp-password', 'version' => 1])
        ->assertOk()
        ->assertJsonPath('data.value', null);

    $stored = json_decode(DB::table('system_configurations')->where('key', 'company.smtp_password')->value('value'));

    expect($stored)->not->toBe('new-smtp-password')
        ->and(Crypt::decrypt($stored))->toBe('new-smtp-password')
        ->and($response->getContent())->not->toContain('new-smtp-password')
        ->and(DB::table('activity_log')->sole()->properties)
        ->not->toContain('new-smtp-password')
        ->not->toContain(SENSITIVE_VALUE);
});

it('cannot change the visibility flags', function () {
    $this->actingAs($this->superAdmin)
        ->patchJson(configurationUrl($this->sensitive), ['value' => 'x', 'version' => 1, 'is_sensitive' => false, 'is_public' => true])
        ->assertOk();

    expect($this->sensitive->refresh()->is_sensitive)->toBeTrue()
        ->and($this->sensitive->is_public)->toBeFalse();
});

it('validates the payload', function (string $key, array $payload, string $field) {
    SystemConfiguration::factory()->create(['key' => 'company.email']);
    SystemConfiguration::factory()->create(['key' => 'localization.timezone']);
    SystemConfiguration::factory()->create(['key' => 'localization.locale']);
    SystemConfiguration::factory()->create(['key' => 'localization.currency']);
    SystemConfiguration::factory()->create(['key' => 'feature.reports']);
    SystemConfiguration::factory()->create(['key' => 'other.setting']);
    SystemConfiguration::factory()->create(['key' => 'company.logo_show_name']);
    SystemConfiguration::factory()->create(['key' => 'company.logo_background']);
    SystemConfiguration::factory()->create(['key' => 'company.logo_size']);

    $this->actingAs($this->superAdmin)
        ->patchJson("/api/v1/system-configurations/{$key}", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'missing value' => ['company.name', ['version' => 1], 'value'],
    'missing version' => ['company.name', ['value' => 'PT'], 'version'],
    'invalid version' => ['company.name', ['value' => 'PT', 'version' => 0], 'version'],
    'company name not a string' => ['company.name', ['value' => ['nested'], 'version' => 1], 'value'],
    'invalid email' => ['company.email', ['value' => 'not-an-email', 'version' => 1], 'value'],
    'invalid timezone' => ['localization.timezone', ['value' => 'Mars/Base', 'version' => 1], 'value'],
    'unsupported locale' => ['localization.locale', ['value' => 'fr', 'version' => 1], 'value'],
    'invalid currency' => ['localization.currency', ['value' => 'RUPIAH', 'version' => 1], 'value'],
    'feature flag not boolean' => ['feature.reports', ['value' => 'maybe', 'version' => 1], 'value'],
    'oversized value' => ['other.setting', ['value' => str_repeat('a', 10001), 'version' => 1], 'value'],
    'show name as number' => ['company.logo_show_name', ['value' => 1, 'version' => 1], 'value'],
    'unknown logo background' => ['company.logo_background', ['value' => 'gradient', 'version' => 1], 'value'],
    'unknown logo size' => ['company.logo_size', ['value' => 'huge', 'version' => 1], 'value'],
]);

it('names the configuration in validation messages', function () {
    $this->actingAs($this->superAdmin)
        ->patchJson(configurationUrl($this->companyName), ['value' => '', 'version' => 1])
        ->assertUnprocessable()
        ->assertJsonPath('errors.value.0', 'Nama perusahaan wajib diisi.');
});

it('explains an oversized value in Indonesian', function () {
    SystemConfiguration::factory()->create(['key' => 'other.setting']);

    $this->actingAs($this->superAdmin)
        ->patchJson('/api/v1/system-configurations/other.setting', ['value' => str_repeat('a', 10001), 'version' => 1])
        ->assertUnprocessable()
        ->assertJsonPath('errors.value.0', 'Nilai terlalu besar.');
});

it('accepts null for optional values', function () {
    SystemConfiguration::factory()->create(['key' => 'company.phone', 'value' => '021']);

    $this->actingAs($this->admin)
        ->patchJson('/api/v1/system-configurations/company.phone', ['value' => null, 'version' => 1])
        ->assertOk()
        ->assertJsonPath('data.value', null);
});

it('returns only public values to anonymous clients', function () {
    SystemConfiguration::factory()->public()->sensitive()->create(['key' => 'company.leak', 'value' => 'leaked-value']);

    $this->getJson('/api/v1/system-configurations/public')
        ->assertOk()
        ->assertExactJson([
            'success' => true,
            'message' => 'Public configurations retrieved successfully',
            'data' => ['company.name' => 'PT Maju'],
            'meta' => null,
        ]);
});

it('resolves static routes before a key with the same name', function () {
    SystemConfiguration::factory()->create(['key' => 'public', 'value' => 'shadow']);

    $this->getJson('/api/v1/system-configurations/public')
        ->assertOk()
        ->assertJsonMissing(['value' => 'shadow'])
        ->assertJsonMissingPath('data.key');
});

it('lists feature flags for permitted roles', function () {
    SystemConfiguration::factory()->create(['key' => 'feature.reports', 'value' => true]);
    SystemConfiguration::factory()->create(['key' => 'feature.exports', 'value' => false]);

    $this->actingAs($this->superAdmin)
        ->getJson('/api/v1/system-configurations/feature-flags')
        ->assertOk()
        ->assertJsonPath('data', [
            ['key' => 'feature.exports', 'enabled' => false],
            ['key' => 'feature.reports', 'enabled' => true],
        ]);
});
