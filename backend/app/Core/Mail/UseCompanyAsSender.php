<?php

declare(strict_types=1);

namespace App\Core\Mail;

use App\Shared\Contracts\CompanyProfile;
use Illuminate\Mail\Events\MessageSending;
use Symfony\Component\Mime\Address;

/**
 * Names the company as the sender of every email. The sender address stays the one in MAIL_FROM_ADDRESS,
 * because only a domain the mail server is allowed to send for passes SPF and DKIM checks. Replies go
 * to the company email when one is set.
 */
final readonly class UseCompanyAsSender
{
    public function __construct(private CompanyProfile $company) {}

    public function handle(MessageSending $event): void
    {
        $message = $event->message;
        $name = $this->company->name();

        $message->from(...array_map(
            fn (Address $sender): Address => new Address($sender->getAddress(), $name),
            $message->getFrom(),
        ));

        $replyTo = $this->company->email();

        if ($replyTo !== null && $message->getReplyTo() === []) {
            $message->replyTo($replyTo);
        }
    }
}
