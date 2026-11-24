<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Services;

use App\Core\Modules\MenuItemDefinition;
use App\Core\Modules\ModuleCatalog;
use App\Modules\UserManagement\Models\User;
use App\Shared\Contracts\ModuleAvailability;

/**
 * Combines the menu items registered in code with the arrangement stored by administrators.
 *
 * @phpstan-type LayoutItem array{key: string, label: string|null, hidden: bool}
 * @phpstan-type LayoutSection array{key: string, label: string, items: list<LayoutItem>}
 */
final readonly class NavigationLayout
{
    public function __construct(
        private ModuleCatalog $catalog,
        private ModuleAvailability $modules,
    ) {}

    /**
     * @return list<LayoutSection>
     */
    public function default(): array
    {
        return $this->current(null);
    }

    /**
     * The stored arrangement, without items that are no longer registered and with items added since
     * it was saved at the end of their default section.
     *
     * @return list<LayoutSection>
     */
    public function current(mixed $stored): array
    {
        $items = $this->catalog->menuItems();
        $sections = [];
        $placed = [];

        foreach (is_array($stored) ? $stored : [] as $section) {
            if (! is_array($section) || ! is_string($section['key'] ?? null) || ! is_string($section['label'] ?? null)) {
                continue;
            }

            $entries = [];

            foreach (is_array($section['items'] ?? null) ? $section['items'] : [] as $entry) {
                $key = is_array($entry) ? ($entry['key'] ?? null) : null;

                if (! is_string($key) || ! isset($items[$key]) || isset($placed[$key])) {
                    continue;
                }

                $placed[$key] = true;
                $entries[] = [
                    'key' => $key,
                    'label' => is_string($entry['label'] ?? null) ? $entry['label'] : null,
                    'hidden' => ($entry['hidden'] ?? false) === true && $items[$key]->canHide,
                ];
            }

            $sections[$section['key']] = ['key' => $section['key'], 'label' => $section['label'], 'items' => $entries];
        }

        foreach ($items as $key => $item) {
            if (isset($placed[$key])) {
                continue;
            }

            $sections[$item->section] ??= ['key' => $item->section, 'label' => $this->catalog->sections()[$item->section], 'items' => []];
            $sections[$item->section]['items'][] = ['key' => $key, 'label' => null, 'hidden' => false];
        }

        return array_values($sections);
    }

    /**
     * The menu a user sees: visible items of enabled modules they have the permission for.
     *
     * @return list<array{key: string, label: string, items: list<array{key: string, label: string, path: string, icon: string}>}>
     */
    public function forUser(User $user, mixed $stored): array
    {
        $items = $this->catalog->menuItems();
        $enabled = $this->modules->enabledModules();
        $menu = [];

        foreach ($this->current($stored) as $section) {
            $visible = [];

            foreach ($section['items'] as $entry) {
                $item = $items[$entry['key']];

                if ($entry['hidden'] || ! in_array($item->module, $enabled, true) || ($item->permission !== null && ! $user->can($item->permission))) {
                    continue;
                }

                $visible[] = ['key' => $item->key, 'label' => $entry['label'] ?? $item->label, 'path' => $item->path, 'icon' => $item->icon];
            }

            if ($visible !== []) {
                $menu[] = ['key' => $section['key'], 'label' => $section['label'], 'items' => $visible];
            }
        }

        return $menu;
    }

    /**
     * Everything the menu editor needs.
     *
     * @return array{sections: list<LayoutSection>, items: list<array<string, mixed>>, default: list<LayoutSection>, version: int}
     */
    public function editor(mixed $stored, int $version): array
    {
        $enabled = $this->modules->enabledModules();

        return [
            'sections' => $this->current($stored),
            'items' => array_values(array_map(fn (MenuItemDefinition $item): array => [
                'key' => $item->key,
                'module' => $item->module,
                'label' => $item->label,
                'path' => $item->path,
                'icon' => $item->icon,
                'can_hide' => $item->canHide,
                'module_enabled' => in_array($item->module, $enabled, true),
            ], $this->catalog->menuItems())),
            'default' => $this->default(),
            'version' => $version,
        ];
    }
}
