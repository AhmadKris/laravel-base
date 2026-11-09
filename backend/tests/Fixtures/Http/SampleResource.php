<?php

declare(strict_types=1);

namespace Tests\Fixtures\Http;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class SampleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['name' => $this->resource['name']];
    }
}
