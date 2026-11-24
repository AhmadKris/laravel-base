<?php

declare(strict_types=1);

namespace App\Core\Authorization\Permissions;

use LogicException;

/**
 * Every permission the application knows, read from the permissions.php file of each module.
 * The seeder creates permissions from it and the API describes them with it, so a new module
 * only has to register its own file.
 */
final class PermissionCatalog
{
    /**
     * @param  array<string, PermissionDefinition>  $definitions  In display order, keyed by name.
     */
    private function __construct(private readonly array $definitions) {}

    /**
     * @param  list<string>  $files
     */
    public static function fromFiles(array $files): self
    {
        $groups = [];

        foreach ($files as $file) {
            $content = require $file;

            if (! is_array($content)) {
                throw new LogicException("{$file} must return an array of permission groups.");
            }

            foreach ($content as $key => $group) {
                $groups[] = self::readGroup($file, (string) $key, $group);
            }
        }

        usort($groups, fn (array $first, array $second): int => $first['position'] <=> $second['position']);

        $definitions = [];

        foreach ($groups as $group) {
            foreach ($group['permissions'] as $definition) {
                if (isset($definitions[$definition->name])) {
                    throw new LogicException("Permission {$definition->name} is registered twice.");
                }

                $definitions[$definition->name] = $definition;
            }
        }

        foreach ($definitions as $definition) {
            foreach ($definition->requires as $requirement) {
                if (! isset($definitions[$requirement])) {
                    throw new LogicException("Permission {$definition->name} requires unknown permission {$requirement}.");
                }
            }
        }

        return new self($definitions);
    }

    /**
     * @return list<PermissionDefinition>
     */
    public function all(): array
    {
        return array_values($this->definitions);
    }

    /**
     * @return list<string>
     */
    public function names(): array
    {
        return array_keys($this->definitions);
    }

    /**
     * A permission left in the database after its module dropped it is still shown, by its name,
     * because roles that hold it keep granting it until it is removed.
     */
    public function describe(string $name): PermissionDefinition
    {
        if (isset($this->definitions[$name])) {
            return $this->definitions[$name];
        }

        $group = explode('.', $name)[0];

        return new PermissionDefinition($name, $name, '', $group, $group, []);
    }

    /**
     * Display position of a permission; unknown permissions come last.
     */
    public function position(string $name): int
    {
        $position = array_search($name, $this->names(), true);

        return $position === false ? PHP_INT_MAX : $position;
    }

    /**
     * @param  list<string>  $permissions
     * @return array<string, list<string>> The missing prerequisites, keyed by the permission that needs them.
     */
    public function missingPrerequisites(array $permissions): array
    {
        $missing = [];

        foreach ($permissions as $permission) {
            $absent = array_values(array_diff($this->definitions[$permission]->requires ?? [], $permissions));

            if ($absent !== []) {
                $missing[$permission] = $absent;
            }
        }

        return $missing;
    }

    /**
     * @return array{position: int, permissions: list<PermissionDefinition>}
     */
    private static function readGroup(string $file, string $key, mixed $group): array
    {
        if (! is_array($group) || ! is_string($group['label'] ?? null) || ! is_int($group['position'] ?? null) || ! is_array($group['permissions'] ?? null)) {
            throw new LogicException("Group {$key} in {$file} needs a label, a position, and permissions.");
        }

        $permissions = [];

        foreach ($group['permissions'] as $name => $permission) {
            $name = (string) $name;

            if (! str_starts_with($name, $key.'.')) {
                throw new LogicException("Permission {$name} in {$file} must start with {$key}.");
            }

            if (! is_array($permission) || ! is_string($permission['label'] ?? null) || ! is_string($permission['description'] ?? null)) {
                throw new LogicException("Permission {$name} in {$file} needs a label and a description.");
            }

            $requires = $permission['requires'] ?? [];

            if (! is_array($requires) || ! array_is_list($requires) || array_filter($requires, 'is_string') !== $requires) {
                throw new LogicException("The requirements of {$name} in {$file} must be a list of permission names.");
            }

            /** @var list<string> $requires */
            $permissions[] = new PermissionDefinition($name, $permission['label'], $permission['description'], $key, $group['label'], $requires);
        }

        return ['position' => $group['position'], 'permissions' => $permissions];
    }
}
