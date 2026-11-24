import { cn } from 'cn';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Permission } from '@/types/api-response';
import {
    isStandardAction,
    permissionAction,
    type PermissionCatalog,
    type PermissionGroup,
    STANDARD_ACTIONS,
} from '../permissionGroups';

interface PermissionMatrixProps {
    groups: PermissionGroup[];
    catalog: PermissionCatalog;
    selected: string[];
    canGrant: (name: string) => boolean;
    onBlur: () => void;
    onToggleOne: (name: string, checked: boolean) => void;
    onToggleGroup: (group: PermissionGroup, selectAll: boolean) => void;
}

const ROW_COLUMNS = 'md:grid md:grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)_minmax(0,1.2fr)]';

/**
 * One row per module and one column per common action, so many modules still fit on one screen.
 * Below 768 px each row becomes a block with its permissions listed by name.
 */
export function PermissionMatrix({ groups, ...rowProps }: PermissionMatrixProps) {
    return (
        <div className="overflow-hidden rounded-lg border">
            <div
                aria-hidden="true"
                className={cn(
                    'hidden gap-x-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground',
                    ROW_COLUMNS,
                )}
            >
                <span>Modul</span>
                {STANDARD_ACTIONS.map(({ action, label }) => (
                    <span key={action} className="text-center">
                        {label}
                    </span>
                ))}
                <span>Lainnya</span>
            </div>
            {groups.map((group) => (
                <PermissionRow key={group.key} group={group} {...rowProps} />
            ))}
        </div>
    );
}

interface PermissionRowProps extends Omit<PermissionMatrixProps, 'groups'> {
    group: PermissionGroup;
}

function PermissionRow({
    group,
    catalog,
    selected,
    canGrant,
    onBlur,
    onToggleOne,
    onToggleGroup,
}: PermissionRowProps) {
    const names = group.permissions.map(({ name }) => name);
    const selectedCount = names.filter((name) => selected.includes(name)).length;
    const controllable = names.filter((name) => selected.includes(name) || canGrant(name));
    const allSelected =
        controllable.length > 0 && controllable.every((name) => selected.includes(name));
    const groupCheckboxId = `role-module-${group.key}`;
    const others = group.permissions.filter(({ name }) => !isStandardAction(name));

    const cell = (permission: Permission, labelClassName: string) => (
        <PermissionCheckbox
            key={permission.name}
            permission={permission}
            checked={selected.includes(permission.name)}
            disabled={!selected.includes(permission.name) && !canGrant(permission.name)}
            labelClassName={labelClassName}
            onBlur={onBlur}
            onToggle={onToggleOne}
        />
    );

    return (
        <div
            role="group"
            aria-labelledby={`${groupCheckboxId}-label`}
            className={cn(
                'grid gap-x-3 gap-y-2.5 border-b px-3 py-3 last:border-b-0 md:items-center md:py-2',
                ROW_COLUMNS,
            )}
        >
            <div className="flex min-w-0 items-center gap-2">
                <Checkbox
                    id={groupCheckboxId}
                    checked={allSelected ? true : selectedCount > 0 ? 'indeterminate' : false}
                    disabled={controllable.length === 0}
                    aria-label={`Pilih semua izin ${group.label}`}
                    onCheckedChange={() => onToggleGroup(group, !allSelected)}
                />
                <span id={`${groupCheckboxId}-label`} className="truncate text-sm font-medium">
                    {group.label}
                </span>
                <Badge variant="secondary" className="tabular-nums">
                    {selectedCount}/{names.length}
                </Badge>
                <PermissionGroupInfo
                    group={group}
                    catalog={catalog}
                    isLocked={(name) => !selected.includes(name) && !canGrant(name)}
                />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 md:contents">
                {STANDARD_ACTIONS.map(({ action }) => {
                    const permission = group.permissions.find(
                        ({ name }) => permissionAction(name) === action,
                    );

                    return permission === undefined ? (
                        <span
                            key={action}
                            aria-hidden="true"
                            className="hidden text-center text-muted-foreground md:block"
                        >
                            -
                        </span>
                    ) : (
                        <div key={action} className="contents md:flex md:justify-center">
                            {cell(permission, 'md:sr-only')}
                        </div>
                    );
                })}
                <div className="contents md:flex md:flex-wrap md:gap-x-4 md:gap-y-2">
                    {others.map((permission) => cell(permission, ''))}
                </div>
            </div>
        </div>
    );
}

interface PermissionCheckboxProps {
    permission: Permission;
    checked: boolean;
    disabled: boolean;
    labelClassName: string;
    onBlur: () => void;
    onToggle: (name: string, checked: boolean) => void;
}

function PermissionCheckbox({
    permission,
    checked,
    disabled,
    labelClassName,
    onBlur,
    onToggle,
}: PermissionCheckboxProps) {
    const id = `role-permission-${permission.name}`;

    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onBlur={onBlur}
                onCheckedChange={(next) => onToggle(permission.name, next === true)}
            />
            <Label
                htmlFor={id}
                className={cn(
                    'text-sm font-normal',
                    disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
                    labelClassName,
                )}
            >
                {permission.label}
            </Label>
        </div>
    );
}

interface PermissionGroupInfoProps {
    group: PermissionGroup;
    catalog: PermissionCatalog;
    isLocked: (name: string) => boolean;
}

function PermissionGroupInfo({ group, catalog, isLocked }: PermissionGroupInfoProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    aria-label={`Keterangan izin ${group.label}`}
                >
                    <Info aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="max-h-(--radix-popover-content-available-height) w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
            >
                <dl className="grid gap-3 text-sm">
                    {group.permissions.map((permission) => (
                        <div key={permission.name} className="grid gap-0.5">
                            <dt className="font-medium">{permission.label}</dt>
                            <dd className="font-mono text-xs text-muted-foreground">
                                {permission.name}
                            </dd>
                            {permission.description !== '' && (
                                <dd className="text-muted-foreground">{permission.description}</dd>
                            )}
                            {permission.requires.length > 0 && (
                                <dd className="text-xs text-muted-foreground">
                                    Membutuhkan:{' '}
                                    {permission.requires
                                        .map((name) => catalog.get(name)?.label ?? name)
                                        .join(', ')}
                                </dd>
                            )}
                            {isLocked(permission.name) && (
                                <dd className="text-xs text-warning">Di luar kewenangan Anda.</dd>
                            )}
                        </div>
                    ))}
                </dl>
            </PopoverContent>
        </Popover>
    );
}
