<?php

declare(strict_types=1);

use App\Modules\SystemConfiguration\Models\SystemConfiguration;
use App\Modules\UserManagement\Models\User;
use Database\Seeders\SystemConfigurationSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SystemConfigurationSeeder::class);
    config(['mail.default' => 'array', 'mail.from' => ['address' => 'no-reply@mail.example.com', 'name' => 'Enterprise System']]);
});

/**
 * @param  array<string, string|null>  $values
 */
function setCompany(array $values): void
{
    foreach ($values as $key => $value) {
        SystemConfiguration::query()->where('key', "company.{$key}")->update(['value' => $value === null ? null : json_encode($value)]);
    }
}

function sendResetEmail(): Email
{
    User::factory()->create(['email' => 'user@example.com'])->notify(new ResetPassword('token-value'));

    $sent = app('mailer')->getSymfonyTransport()->messages();
    expect($sent)->toHaveCount(1);

    /** @var Email */
    return $sent->first()->getOriginalMessage();
}

it('names the company as sender, keeps the configured address, and replies to the company email', function () {
    setCompany(['name' => 'PT Maju Bersama', 'email' => 'halo@majubersama.co.id']);

    $email = sendResetEmail();

    expect($email->getFrom())->toEqual([new Address('no-reply@mail.example.com', 'PT Maju Bersama')])
        ->and($email->getReplyTo())->toEqual([new Address('halo@majubersama.co.id')]);
});

it('puts the company name and contact details in the email', function () {
    setCompany([
        'name' => 'PT Maju Bersama',
        'address' => 'Jl. Merdeka No. 1, Jakarta',
        'phone' => '021-555-0101',
        'email' => 'halo@majubersama.co.id',
    ]);

    $email = sendResetEmail();

    expect($email->getHtmlBody())
        ->toContain('PT Maju Bersama. Hak cipta dilindungi.')
        ->toContain('Jl. Merdeka No. 1, Jakarta')
        ->toContain('021-555-0101 | halo@majubersama.co.id')
        ->not->toContain('Enterprise System')
        ->and($email->getTextBody())
        ->toContain('Salam,')
        ->toContain('PT Maju Bersama')
        ->toContain('Jl. Merdeka No. 1, Jakarta');
});

it('leaves out contact details that are not set and has no reply-to without a company email', function () {
    setCompany(['name' => 'PT Maju Bersama', 'address' => null, 'phone' => '  ', 'email' => null]);

    $email = sendResetEmail();

    expect($email->getReplyTo())->toBe([])
        ->and($email->getHtmlBody())->not->toContain(' | ');
});

it('falls back to the application name while the company name is empty', function () {
    setCompany(['name' => '']);

    expect(sendResetEmail()->getFrom())->toEqual([new Address('no-reply@mail.example.com', config('app.name'))]);
});

it('does not turn markdown in company details into links or html', function () {
    setCompany(['address' => '[Klik di sini](https://evil.example) <b>tebal</b>']);

    $html = sendResetEmail()->getHtmlBody();

    expect($html)->not->toContain('href="https://evil.example"')
        ->not->toContain('<b>tebal</b>');
});
