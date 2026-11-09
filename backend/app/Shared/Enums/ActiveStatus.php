<?php

declare(strict_types=1);

namespace App\Shared\Enums;

enum ActiveStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';

    public static function fromBoolean(bool $isActive): self
    {
        return $isActive ? self::Active : self::Inactive;
    }

    public function toBoolean(): bool
    {
        return $this === self::Active;
    }
}
