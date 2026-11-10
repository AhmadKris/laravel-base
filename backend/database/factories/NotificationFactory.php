<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Modules\Notification\Enums\NotificationCategory;
use App\Modules\Notification\Models\Notification;
use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid7(),
            'type' => 'security.password_changed',
            'notifiable_type' => (new User)->getMorphClass(),
            'notifiable_id' => User::factory(),
            'data' => [
                'category' => NotificationCategory::Security->value,
                'title' => fake()->sentence(4),
                'message' => fake()->sentence(10),
                'action_url' => '/change-password',
            ],
            'read_at' => null,
        ];
    }

    public function forUser(User $user): static
    {
        return $this->state(fn (): array => [
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->getKey(),
        ]);
    }

    public function read(): static
    {
        return $this->state(fn (): array => [
            'read_at' => now(),
        ]);
    }
}
