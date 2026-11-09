<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use App\Modules\Department\Services\DepartmentAccessService;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->finance = Department::factory()->create();
    $this->it = Department::factory()->create();
    $this->financeUser = User::factory()->create(['department_id' => $this->finance->id]);
    $this->itUser = User::factory()->create(['department_id' => $this->it->id]);
    $this->unassignedUser = User::factory()->create();
});

function visibleIdsFor(User $viewer): array
{
    return User::query()->visibleTo($viewer)->pluck('id')->sort()->values()->all();
}

it('shows every user to roles with global access', function (string $role) {
    $viewer = userWithRole($role, ['department_id' => $this->finance->id]);

    expect(visibleIdsFor($viewer))->toBe(User::query()->pluck('id')->sort()->values()->all());
})->with(['Super Admin', 'Admin']);

it('shows only the same department to other roles', function (string $role) {
    $viewer = userWithRole($role, ['department_id' => $this->finance->id]);

    expect(visibleIdsFor($viewer))->toBe([$this->financeUser->id, $viewer->id]);
})->with(['Staff', 'Viewer']);

it('shows only themselves to a user without a department', function () {
    $viewer = userWithRole('Staff');

    expect(visibleIdsFor($viewer))->toBe([$viewer->id])
        ->and(User::query()->visibleTo($viewer)->whereKey($this->unassignedUser->id)->exists())->toBeFalse();
});

it('keeps other query conditions inside the scope', function () {
    $viewer = userWithRole('Staff', ['department_id' => $this->finance->id]);

    $query = User::query()->visibleTo($viewer)->where('email', $this->itUser->email);

    expect($query->exists())->toBeFalse();
});

it('grants department access only within the scope', function () {
    $service = app(DepartmentAccessService::class);
    $staff = userWithRole('Staff', ['department_id' => $this->finance->id]);
    $admin = userWithRole('Admin', ['department_id' => $this->finance->id]);

    expect($service->canAccessDepartment($staff, $this->finance))->toBeTrue()
        ->and($service->canAccessDepartment($staff, $this->it))->toBeFalse()
        ->and($service->canAccessDepartment($admin, $this->it))->toBeTrue();
});
