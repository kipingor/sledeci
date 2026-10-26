<?php

namespace Sledeci\Core\Contracts;

/**
 * Sends a message over email, SMS or WhatsApp. Implemented by the
 * communications module so accounting never imports a concrete messaging service.
 */
interface Notifier
{
    /**
     * @param  'email'|'sms'|'whatsapp'  $channel
     * @param  array<string, mixed>  $context  free-form data used for logging (invoice id, payment id, ...)
     */
    public function send(string $channel, string $to, string $subject, string $body, array $context = []): bool;
}
