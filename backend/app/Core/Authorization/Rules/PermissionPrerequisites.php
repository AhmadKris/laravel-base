<?php

declare(strict_types=1);

namespace App\Core\Authorization\Rules;

use App\Core\Authorization\Permissions\PermissionCatalog;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects a permission list that grants an action without the access it builds on, such as
 * creating users without seeing them.
 */
final readonly class PermissionPrerequisites implements ValidationRule
{
    public function __construct(private PermissionCatalog $catalog) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            return;
        }

        // Entries that are not strings are reported by the rules on each item.
        $permissions = array_values(array_filter($value, is_string(...)));

        foreach ($this->catalog->missingPrerequisites($permissions) as $permission => $requirements) {
            $fail('validation.permission_prerequisites')->translate([
                'permission' => $this->catalog->describe($permission)->label,
                'requires' => implode(', ', array_map(
                    fn (string $requirement): string => $this->catalog->describe($requirement)->label,
                    $requirements,
                )),
            ]);
        }
    }
}
