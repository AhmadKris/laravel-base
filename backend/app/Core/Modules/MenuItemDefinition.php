<?php

declare(strict_types=1);

namespace App\Core\Modules;

final readonly class MenuItemDefinition
{
    public function __construct(
        public string $key,
        public string $module,
        public string $label,
        public string $path,
        public string $icon,
        public ?string $permission,
        public string $section,
        public int $position,
        public bool $canHide,
    ) {}
}
