<?php

use App\Models\ProjectStakeholder;
use App\Models\User;

it('flags an engagement gap when current engagement is below the desired level', function () {
    $stakeholder = new ProjectStakeholder([
        'name' => 'Jane',
        'current_engagement' => 'neutral',
        'desired_engagement' => 'leading',
    ]);

    expect($stakeholder->has_engagement_gap)->toBeTrue();

    $stakeholder->current_engagement = 'leading';
    expect($stakeholder->has_engagement_gap)->toBeFalse();
});

it('exposes engagement_strategy to the UI as management_strategy', function () {
    $stakeholder = new ProjectStakeholder(['name' => 'Jane', 'engagement_strategy' => 'Keep informed']);

    expect($stakeholder->management_strategy)->toBe('Keep informed')
        ->and($stakeholder->toArray())->toHaveKeys(['display_name', 'management_strategy', 'has_engagement_gap']);
});

it('prefers the linked user name for display', function () {
    $stakeholder = new ProjectStakeholder(['name' => 'Fallback']);
    expect($stakeholder->display_name)->toBe('Fallback');

    $stakeholder->setRelation('user', new User(['name' => 'Linked User']));
    expect($stakeholder->display_name)->toBe('Linked User');
});
