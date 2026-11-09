<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Adding and dropping constraints commits implicitly in MySQL, so a wrapping test transaction cannot be used.
uses(DatabaseMigrations::class);

function identifierMigration(): object
{
    return require database_path('migrations/2026_11_09_130000_normalize_user_identifiers.php');
}

function insertLegacyUser(string $email, ?string $username = null): int
{
    return DB::table('users')->insertGetId([
        'uuid' => (string) Str::uuid(),
        'name' => 'Legacy',
        'password' => 'not-a-real-hash',
        'is_active' => true,
        'email' => $email,
        'username' => $username,
    ]);
}

it('normalizes existing identifiers and then enforces the constraint', function () {
    $migration = identifierMigration();
    $migration->down();
    $id = insertLegacyUser('  Legacy@Example.COM ', ' Legacy.User ');

    $migration->up();

    expect(DB::table('users')->where('id', $id)->first(['email', 'username']))
        ->email->toBe('legacy@example.com')
        ->username->toBe('legacy.user');
    expect(fn () => insertLegacyUser('UPPER@EXAMPLE.COM'))->toThrow(Exception::class, 'normalized');
});

it('stops without changing anything when normalization would merge accounts', function () {
    $migration = identifierMigration();
    $migration->down();
    $spaced = insertLegacyUser(' same@example.com');
    insertLegacyUser('same@example.com');
    $untouched = insertLegacyUser('Other@Example.COM');

    expect(fn () => $migration->up())->toThrow(RuntimeException::class, 'duplicates');

    expect(DB::table('users')->where('id', $spaced)->value('email'))->toBe(' same@example.com')
        ->and(DB::table('users')->where('id', $untouched)->value('email'))->toBe('Other@Example.COM');

    DB::table('users')->where('id', $spaced)->delete();
    DB::table('users')->where('id', $untouched)->update(['email' => 'other@example.com']);
    $migration->up();
});
