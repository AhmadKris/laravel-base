<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Actions;

use App\Core\Api\Exceptions\ResourceVersionConflictException;
use App\Core\Audit\AuditLogger;
use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class UpdateConfigurationAction
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @throws ResourceVersionConflictException
     */
    public function execute(SystemConfiguration $configuration, mixed $value, int $version, User $actor): SystemConfiguration
    {
        DB::transaction(function () use ($configuration, $value, $version, $actor): void {
            $oldValue = $configuration->value;

            $configuration->updateWithVersion($version, [
                'value' => $configuration->is_sensitive && $value !== null ? Crypt::encrypt($value) : $value,
                'updated_by' => $actor->id,
            ]);

            $this->auditLogger->record(
                'system.configuration_updated',
                $configuration,
                $configuration->is_sensitive
                    ? ['key' => $configuration->key]
                    : ['key' => $configuration->key, 'old' => $oldValue, 'new' => $value],
                $actor,
            );
        });

        return $configuration;
    }
}
