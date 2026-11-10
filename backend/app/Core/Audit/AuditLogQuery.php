<?php

declare(strict_types=1);

namespace App\Core\Audit;

use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Spatie\Activitylog\Models\Activity;

/**
 * Audit records a viewer may read, shared by the list and the detail so both apply the same scope.
 */
final class AuditLogQuery
{
    /**
     * @return Builder<Activity>
     */
    public function visibleTo(User $viewer): Builder
    {
        $includeTrashed = fn (Builder $query) => $query->withoutGlobalScope(SoftDeletingScope::class);

        $query = Activity::query()->inLog(AuditLogger::LOG_NAME)->with([
            'causer' => fn (MorphTo $causer) => $causer->constrain([User::class => $includeTrashed]),
            'subject' => fn (MorphTo $subject) => $subject->constrain([User::class => $includeTrashed]),
        ]);

        if ($viewer->hasAnyRole(config('authorization.configuration_access.unrestricted_roles'))) {
            return $query;
        }

        // Configuration records carry old and new values, so they follow the configuration access scope.
        return $query->whereNot(fn (Builder $hidden) => $hidden
            ->where('event', 'like', 'system.%')
            ->whereNotNull('properties->key')
            ->whereNot(function (Builder $allowed): void {
                foreach (config('authorization.configuration_access.allowed_prefixes') as $prefix) {
                    $allowed->orWhere('properties->key', 'like', $prefix.'%');
                }
            }));
    }
}
