<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    private const array COLUMNS = ['email', 'username'];

    public function up(): void
    {
        DB::transaction(function (): void {
            foreach (self::COLUMNS as $column) {
                $this->normalizeColumn($column);
            }
        });

        foreach (self::COLUMNS as $column) {
            // The binary cast is required: under a case-insensitive collation LOWER(x) = x is always true.
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_{$column}_normalized CHECK (
                CAST({$column} AS BINARY) = CAST(LOWER({$column}) AS BINARY)
                AND {$column} NOT REGEXP '^[[:space:]]|[[:space:]]$'
            )");
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNS as $column) {
            DB::statement("ALTER TABLE users DROP CHECK users_{$column}_normalized");
        }
    }

    private function normalizeColumn(string $column): void
    {
        $rows = DB::table('users')->whereNotNull($column)->get(['id', $column]);
        $normalize = fn (object $row): string => Str::lower(Str::trim($row->{$column}));

        $collidingIds = $rows->groupBy($normalize)
            ->filter(fn ($group): bool => $group->count() > 1)
            ->flatten()
            ->pluck('id');

        if ($collidingIds->isNotEmpty()) {
            throw new RuntimeException("Normalizing users.{$column} would create duplicates for user ids: {$collidingIds->implode(', ')}");
        }

        foreach ($rows as $row) {
            if ($normalize($row) !== $row->{$column}) {
                DB::table('users')->where('id', $row->id)->update([$column => $normalize($row)]);
            }
        }
    }
};
