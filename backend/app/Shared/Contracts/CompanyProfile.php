<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * The company identity administrators set in the settings, for email and other output that
 * names the company.
 */
interface CompanyProfile
{
    public function name(): string;

    public function email(): ?string;

    public function address(): ?string;

    public function phone(): ?string;
}
