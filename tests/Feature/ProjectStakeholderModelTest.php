<?php

namespace Tests\Feature;

use App\Models\ProjectStakeholder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProjectStakeholderModelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_flags_an_engagement_gap_when_current_engagement_is_below_the_desired_level()
    {
        $stakeholder = new ProjectStakeholder([
            'name' => 'Jane',
            'current_engagement' => 'neutral',
            'desired_engagement' => 'leading',
        ]);

        expect($stakeholder->has_engagement_gap)->toBeTrue();

        $stakeholder->current_engagement = 'leading';
        expect($stakeholder->has_engagement_gap)->toBeFalse();
    }

    public function test_exposes_engagement_strategy_to_the_UI_as_management_strategy()
    {
        $stakeholder = new ProjectStakeholder(['name' => 'Jane', 'engagement_strategy' => 'Keep informed']);

        expect($stakeholder->management_strategy)->toBe('Keep informed')
            ->and($stakeholder->toArray())->toHaveKeys(['display_name', 'management_strategy', 'has_engagement_gap']);
    }

    public function test_prefers_the_linked_user_name_for_display()
    {
        $stakeholder = new ProjectStakeholder(['name' => 'Fallback']);
        expect($stakeholder->display_name)->toBe('Fallback');

        $stakeholder->setRelation('user', new User(['name' => 'Linked User']));
        expect($stakeholder->display_name)->toBe('Linked User');
    }
}
