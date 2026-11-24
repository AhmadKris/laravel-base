<?php

declare(strict_types=1);

namespace App\Core\Modules;

final readonly class ModuleDefinition
{
    /**
     * @param  list<MenuItemDefinition>  $menu
     */
    public function __construct(
        public string $key,
        public string $label,
        public string $description,
        public bool $isCore,
        public array $menu,
    ) {}
}
