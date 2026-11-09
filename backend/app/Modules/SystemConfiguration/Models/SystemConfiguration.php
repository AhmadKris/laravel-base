<?php

declare(strict_types=1);

namespace App\Modules\SystemConfiguration\Models;

use Database\Factories\SystemConfigurationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'value', 'is_public', 'is_sensitive', 'description'])]
#[UseFactory(SystemConfigurationFactory::class)]
class SystemConfiguration extends Model
{
    /** @use HasFactory<SystemConfigurationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'json',
            'is_public' => 'boolean',
            'is_sensitive' => 'boolean',
            'version' => 'integer',
        ];
    }
}
