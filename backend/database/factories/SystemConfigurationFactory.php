<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SystemConfiguration>
 */
class SystemConfigurationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'key' => 'sample.'.fake()->unique()->lexify('????????'),
            'value' => fake()->word(),
            'is_public' => false,
            'is_sensitive' => false,
        ];
    }

    public function public(): static
    {
        return $this->state(['is_public' => true]);
    }

    public function sensitive(): static
    {
        return $this->state(['is_sensitive' => true]);
    }
}
