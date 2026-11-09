<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Activitylog\Models\Activity;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = userWithRole('Admin');
    $this->department = Department::factory()->create(['code' => 'IT']);
});

it('soft deletes an unused department and records it', function () {
    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/departments/{$this->department->uuid}")
        ->assertNoContent();

    expect(Department::query()->whereKey($this->department->id)->exists())->toBeFalse()
        ->and(Department::withTrashed()->whereKey($this->department->id)->exists())->toBeTrue()
        ->and(Activity::query()->where('event', 'department.deleted')->sole()->properties['code'])->toBe('IT');
});

it('refuses to delete a department that has users', function () {
    User::factory()->create(['department_id' => $this->department->id]);

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/departments/{$this->department->uuid}")
        ->assertConflict()
        ->assertJsonPath('code', 'DEPARTMENT_HAS_DEPENDENCIES');

    expect(Department::query()->whereKey($this->department->id)->exists())->toBeTrue();
});

it('counts inactive users as dependencies', function () {
    User::factory()->create(['department_id' => $this->department->id, 'is_active' => false]);

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/departments/{$this->department->uuid}")
        ->assertConflict();
});

it('refuses to delete a department that has sub-departments', function () {
    Department::factory()->create(['parent_id' => $this->department->id]);

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/departments/{$this->department->uuid}")
        ->assertConflict()
        ->assertJsonPath('code', 'DEPARTMENT_HAS_DEPENDENCIES');
});

it('ignores soft deleted users and sub-departments', function () {
    User::factory()->create(['department_id' => $this->department->id])->delete();
    Department::factory()->create(['parent_id' => $this->department->id])->delete();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/departments/{$this->department->uuid}")
        ->assertNoContent();
});
