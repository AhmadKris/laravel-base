<?php

declare(strict_types=1);

namespace App\Core\Authorization\Permissions;

final readonly class PermissionDefinition
{
    /**
     * @param  list<string>  $requires
     */
    public function __construct(
        public string $name,
        public string $label,
        public string $description,
        public string $group,
        public string $groupLabel,
        public array $requires,
    ) {}
}
