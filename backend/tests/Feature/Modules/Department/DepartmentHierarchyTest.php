<?php

declare(strict_types=1);

use App\Modules\Department\Models\Department;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->actingAs(userWithRole('Admin'));

    $this->root = Department::factory()->create();
    $this->child = Department::factory()->create(['parent_id' => $this->root->id]);
    $this->grandchild = Department::factory()->create(['parent_id' => $this->child->id]);
});

function moveDepartment(mixed $test, Department $department, Department $parent): mixed
{
    return $test->patchJson("/api/v1/departments/{$department->uuid}", ['parent_id' => $parent->uuid]);
}

it('rejects a department as its own parent', function () {
    moveDepartment($this, $this->root, $this->root)
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_FAILED')
        ->assertJsonValidationErrors('parent_id');
});

it('rejects a direct child as parent', function () {
    moveDepartment($this, $this->root, $this->child)->assertUnprocessable()->assertJsonValidationErrors('parent_id');

    expect($this->root->refresh()->parent_id)->toBeNull();
});

it('rejects a distant descendant as parent', function () {
    moveDepartment($this, $this->root, $this->grandchild)->assertUnprocessable()->assertJsonValidationErrors('parent_id');

    expect($this->root->refresh()->parent_id)->toBeNull();
});

it('allows moving a department under another branch', function () {
    $otherRoot = Department::factory()->create();

    moveDepartment($this, $this->child, $otherRoot)
        ->assertOk()
        ->assertJsonPath('data.parent_id', $otherRoot->uuid);

    expect($this->grandchild->refresh()->parent_id)->toBe($this->child->id);
});

it('allows keeping the current parent', function () {
    moveDepartment($this, $this->child, $this->root)->assertOk();
});
