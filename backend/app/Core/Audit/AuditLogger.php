<?php

declare(strict_types=1);

namespace App\Core\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;

final class AuditLogger
{
    public const string LOG_NAME = 'audit';

    private const string REDACTED = '[REDACTED]';

    private const array SENSITIVE_KEY_FRAGMENTS = [
        'password',
        'token',
        'secret',
        'api_key',
        'apikey',
        'authorization',
        'cookie',
        'session',
        'credential',
        'private_key',
    ];

    public function __construct(private readonly Request $request) {}

    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(
        string $event,
        ?Model $subject = null,
        array $properties = [],
        ?Model $actor = null,
    ): void {
        $logger = activity(self::LOG_NAME)
            ->event($event)
            ->withProperties([
                ...$this->redact($properties),
                'context' => [
                    'ip_address' => $this->request->ip(),
                    'user_agent' => $this->request->userAgent(),
                    'request_id' => Context::get('request_id'),
                ],
            ]);

        if ($subject !== null) {
            $logger->performedOn($subject);
        }

        if ($actor !== null) {
            $logger->causedBy($actor);
        }

        $logger->log($event);
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    private function redact(array $values): array
    {
        $redacted = [];

        foreach ($values as $key => $value) {
            $redacted[$key] = match (true) {
                is_string($key) && $this->isSensitive($key) => self::REDACTED,
                is_array($value) => $this->redact($value),
                default => $value,
            };
        }

        return $redacted;
    }

    private function isSensitive(string $key): bool
    {
        return Str::contains($key, self::SENSITIVE_KEY_FRAGMENTS, ignoreCase: true);
    }
}
