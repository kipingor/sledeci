<?php

namespace App\DataTransferObjects\Lead;

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\LeadType;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Attributes\MapOutputName;
use Spatie\LaravelData\Attributes\WithCast;
use Spatie\LaravelData\Casts\EnumCast;
use Spatie\LaravelData\Data;

class CreateLeadData extends Data
{
    #[MapName('first_name')]
    public ?string $firstName;

    #[MapName('last_name')]
    public ?string $lastName;

    public ?string $company;

    public ?string $email;

    public ?string $phone;

    public ?string $address;

    public ?string $city;

    public ?string $state;

    public ?string $zip;

    public ?string $country;

    #[WithCast(EnumCast::class)]
    #[MapOutputName('lead_type')]
    public ?LeadType $leadType;

    #[WithCast(EnumCast::class)]
    #[MapOutputName('lead_status')]
    public ?LeadStatus $leadStatus;

    #[WithCast(EnumCast::class)]
    #[MapOutputName('lead_source')]
    public ?LeadSource $leadSource;

    public ?string $description;
}

