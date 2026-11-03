<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class ContactEditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_contact_shows_edit_form_for_owned_contact(): void
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        $contact = Contact::create([
            'owner_id' => $user->id,
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'source' => 'conference',
        ]);

        $this->actingAs($user)
            ->get(route('web.contacts.edit', $contact))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('contacts/create')
                ->where('contact.name', 'Jane Smith')
                ->where('contact.source', 'conference'));
    }

    public function test_updates_a_contact_and_returns_to_its_detail_page()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        $contact = Contact::create([
            'owner_id' => $user->id,
            'name' => 'Jane Smith',
            'source' => 'conference',
        ]);

        $this->actingAs($user)
            ->patch(route('web.contacts.update', $contact), [
                'name' => 'Jane Doe',
                'email' => 'jane@example.com',
                'source' => 'referral',
            ])
            ->assertRedirect(route('web.contacts.show', $contact));

        expect($contact->fresh())
            ->name->toBe('Jane Doe')
            ->email->toBe('jane@example.com')
            ->source->toBe('referral');
    }
}
