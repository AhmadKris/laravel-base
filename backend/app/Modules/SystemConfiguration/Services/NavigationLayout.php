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
 * @phpstan-type LayoutItem array{key: string, label: string|null, icon: string|null, hidden: bool}
 * @phpstan-type LayoutSection array{key: string, label: string|null, items: list<LayoutItem>}
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
            if (! is_array($section) || ! is_string($section['key'] ?? null)) {
                continue;
            }

            $label = $section['label'] ?? null;

            $entries = [];

            foreach (is_array($section['items'] ?? null) ? $section['items'] : [] as $entry) {
                $key = is_array($entry) ? ($entry['key'] ?? null) : null;

                if (! is_string($key) || ! isset($items[$key]) || isset($placed[$key])) {
                    continue;
                }

                $icon = $entry['icon'] ?? null;
                $placed[$key] = true;
                $entries[] = [
                    'key' => $key,
                    'label' => is_string($entry['label'] ?? null) ? $entry['label'] : null,
                    // An icon removed from the allowed list falls back to the one the module registers.
                    'icon' => is_string($icon) && in_array($icon, self::icons(), true) ? $icon : null,
                    'hidden' => ($entry['hidden'] ?? false) === true && $items[$key]->canHide,
                ];
            }

            $sections[$section['key']] = ['key' => $section['key'], 'label' => is_string($label) ? $label : null, 'items' => $entries];
        }

        foreach ($items as $key => $item) {
            if (isset($placed[$key])) {
                continue;
            }

            $sections[$item->section] ??= ['key' => $item->section, 'label' => $this->catalog->sections()[$item->section], 'items' => []];
            $sections[$item->section]['items'][] = ['key' => $key, 'label' => null, 'icon' => null, 'hidden' => false];
        }

        return array_values($sections);
    }

    /**
     * Icons administrators may choose for a menu item.
     *
     * @return list<string>
     */
    public static function icons(): array
    {
        /** @var list<string> */
        return config('navigation.icons');
    }

    /**
     * The menu a user sees: visible items of enabled modules they have the permission for. A section
     * without a label shows its items without a heading.
     *
     * @return list<array{key: string, label: string|null, items: list<array{key: string, label: string, path: string, icon: string}>}>
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

                $visible[] = ['key' => $item->key, 'label' => $entry['label'] ?? $item->label, 'path' => $item->path, 'icon' => $entry['icon'] ?? $item->icon];
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
     * @return array{sections: list<LayoutSection>, items: list<array<string, mixed>>, icons: list<string>, default: list<LayoutSection>, version: int}
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
            'icons' => self::icons(),
            'default' => $this->default(),
            'version' => $version,
        ];
    }
}
