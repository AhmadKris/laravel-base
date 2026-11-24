<?php

declare(strict_types=1);

namespace App\Core\Modules;

use LogicException;

/**
 * The modules and menu items the code provides, read from the module.php file of each module.
 * Administrators arrange the menu and switch optional modules, but cannot add either.
 */
final class ModuleCatalog
{
    private const string KEY_PATTERN = '/^[a-z0-9_-]{1,50}$/';

    /**
     * @param  array<string, ModuleDefinition>  $modules
     * @param  array<string, MenuItemDefinition>  $menuItems  In default order.
     * @param  array<string, string>  $sections  Default section labels, in order.
     */
    private function __construct(
        private readonly array $modules,
        private readonly array $menuItems,
        private readonly array $sections,
    ) {}

    /**
     * @param  list<string>  $files
     * @param  array<string, mixed>  $sections  The "sections" entry of config/navigation.php.
     */
    public static function fromFiles(array $files, array $sections): self
    {
        $sectionLabels = self::readSections($sections);
        $modules = [];
        $menuItems = [];

        foreach ($files as $file) {
            $module = self::readModule($file, require $file, $sectionLabels);

            if (isset($modules[$module->key])) {
                throw new LogicException("Module {$module->key} is registered twice.");
            }

            $modules[$module->key] = $module;

            foreach ($module->menu as $item) {
                if (isset($menuItems[$item->key])) {
                    throw new LogicException("Menu item {$item->key} is registered twice.");
                }

                $menuItems[$item->key] = $item;
            }
        }

        $sectionOrder = array_flip(array_keys($sectionLabels));
        uasort($menuItems, fn (MenuItemDefinition $first, MenuItemDefinition $second): int => [$sectionOrder[$first->section], $first->position]
            <=> [$sectionOrder[$second->section], $second->position]);

        return new self($modules, $menuItems, $sectionLabels);
    }

    /**
     * Core modules first, then optional ones, each by label.
     *
     * @return list<ModuleDefinition>
     */
    public function modules(): array
    {
        $modules = array_values($this->modules);
        usort($modules, fn (ModuleDefinition $first, ModuleDefinition $second): int => [! $first->isCore, $first->label]
            <=> [! $second->isCore, $second->label]);

        return $modules;
    }

    /**
     * @return list<string>
     */
    public function optionalModuleKeys(): array
    {
        return array_values(array_map(
            fn (ModuleDefinition $module): string => $module->key,
            array_filter($this->modules, fn (ModuleDefinition $module): bool => ! $module->isCore),
        ));
    }

    /**
     * @return array<string, MenuItemDefinition>
     */
    public function menuItems(): array
    {
        return $this->menuItems;
    }

    /**
     * @return array<string, string>
     */
    public function sections(): array
    {
        return $this->sections;
    }

    /**
     * @param  array<string, string>  $sectionLabels
     */
    private static function readModule(string $file, mixed $content, array $sectionLabels): ModuleDefinition
    {
        if (! is_array($content)
            || ! self::isKey($content['key'] ?? null)
            || ! is_string($content['label'] ?? null)
            || ! is_string($content['description'] ?? null)
            || ! is_bool($content['core'] ?? null)
            || ! is_array($content['menu'] ?? [])) {
            throw new LogicException("{$file} needs a key, a label, a description, and a core flag.");
        }

        /** @var string $key */
        $key = $content['key'];
        $menu = [];

        foreach ($content['menu'] ?? [] as $itemKey => $item) {
            $menu[] = self::readMenuItem($file, $key, (string) $itemKey, $item, $sectionLabels);
        }

        return new ModuleDefinition($key, $content['label'], $content['description'], $content['core'], $menu);
    }

    /**
     * @param  array<string, string>  $sectionLabels
     */
    private static function readMenuItem(string $file, string $module, string $key, mixed $item, array $sectionLabels): MenuItemDefinition
    {
        if (! self::isKey($key)
            || ! is_array($item)
            || ! is_string($item['label'] ?? null)
            || ! is_string($item['path'] ?? null)
            || ! str_starts_with($item['path'], '/')
            || ! self::isKey($item['icon'] ?? null)
            || ! (is_string($item['permission'] ?? null) || ($item['permission'] ?? null) === null)
            || ! is_int($item['position'] ?? null)
            || ! is_bool($item['can_hide'] ?? true)) {
            throw new LogicException("Menu item {$key} in {$file} needs a label, a path starting with /, an icon, and a position.");
        }

        $section = $item['section'] ?? null;

        if (! is_string($section) || ! isset($sectionLabels[$section])) {
            throw new LogicException("Menu item {$key} in {$file} refers to an unknown section.");
        }

        /** @var string $icon */
        $icon = $item['icon'];
        /** @var string|null $permission */
        $permission = $item['permission'] ?? null;
        /** @var bool $canHide */
        $canHide = $item['can_hide'] ?? true;

        return new MenuItemDefinition($key, $module, $item['label'], $item['path'], $icon, $permission, $section, $item['position'], $canHide);
    }

    /**
     * @param  array<string, mixed>  $sections
     * @return array<string, string>
     */
    private static function readSections(array $sections): array
    {
        $labels = [];

        foreach ($sections as $key => $label) {
            if (! self::isKey($key) || ! is_string($label)) {
                throw new LogicException("Menu section {$key} needs a key and a label.");
            }

            $labels[$key] = $label;
        }

        return $labels;
    }

    private static function isKey(mixed $value): bool
    {
        return is_string($value) && preg_match(self::KEY_PATTERN, $value) === 1;
    }
}
