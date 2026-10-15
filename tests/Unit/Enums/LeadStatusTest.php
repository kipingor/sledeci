<?php

namespace Tests\Unit\Enums;

use App\Enums\LeadStatus;
use PHPUnit\Framework\TestCase;

class LeadStatusTest extends TestCase
{
    /**
     * Test NEW status can transition to CONTACTED
     */
    public function test_new_can_transition_to_contacted(): void
    {
        $this->assertTrue(LeadStatus::NEW->canTransitionTo(LeadStatus::CONTACTED));
    }

    /**
     * Test NEW status cannot transition to WON (must go through pipeline)
     */
    public function test_new_cannot_transition_to_won(): void
    {
        $this->assertFalse(LeadStatus::NEW->canTransitionTo(LeadStatus::WON));
    }

    /**
     * Test NEW status cannot transition to QUALIFIED (must go through CONTACTED first)
     */
    public function test_new_cannot_skip_to_qualified(): void
    {
        $this->assertFalse(LeadStatus::NEW->canTransitionTo(LeadStatus::QUALIFIED));
    }

    /**
     * Test CONTACTED can transition to QUALIFIED
     */
    public function test_contacted_can_transition_to_qualified(): void
    {
        $this->assertTrue(LeadStatus::CONTACTED->canTransitionTo(LeadStatus::QUALIFIED));
    }

    /**
     * Test CONTACTED cannot transition to PROPOSAL_SENT (must qualify first)
     */
    public function test_contacted_cannot_skip_to_proposal_sent(): void
    {
        $this->assertFalse(LeadStatus::CONTACTED->canTransitionTo(LeadStatus::PROPOSAL_SENT));
    }

    /**
     * Test any status can transition to LOST
     */
    public function test_any_active_status_can_transition_to_lost(): void
    {
        $this->assertTrue(LeadStatus::NEW->canTransitionTo(LeadStatus::LOST));
        $this->assertTrue(LeadStatus::CONTACTED->canTransitionTo(LeadStatus::LOST));
        $this->assertTrue(LeadStatus::QUALIFIED->canTransitionTo(LeadStatus::LOST));
        $this->assertTrue(LeadStatus::PROPOSAL_SENT->canTransitionTo(LeadStatus::LOST));
        $this->assertTrue(LeadStatus::NEGOTIATION->canTransitionTo(LeadStatus::LOST));
    }

    /**
     * Test any status can transition to ARCHIVED
     */
    public function test_any_status_can_transition_to_archived(): void
    {
        $this->assertTrue(LeadStatus::NEW->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::CONTACTED->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::QUALIFIED->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::PROPOSAL_SENT->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::NEGOTIATION->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::WON->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertTrue(LeadStatus::LOST->canTransitionTo(LeadStatus::ARCHIVED));
    }

    /**
     * Test ARCHIVED cannot transition to anything
     */
    public function test_archived_cannot_transition_to_anything(): void
    {
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::NEW));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::CONTACTED));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::QUALIFIED));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::PROPOSAL_SENT));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::NEGOTIATION));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::WON));
        $this->assertFalse(LeadStatus::ARCHIVED->canTransitionTo(LeadStatus::LOST));
    }

    /**
     * Test WON can only transition to ARCHIVED
     */
    public function test_won_can_only_transition_to_archived(): void
    {
        $this->assertTrue(LeadStatus::WON->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertFalse(LeadStatus::WON->canTransitionTo(LeadStatus::NEGOTIATION));
        $this->assertFalse(LeadStatus::WON->canTransitionTo(LeadStatus::LOST));
    }

    /**
     * Test LOST can only transition to ARCHIVED
     */
    public function test_lost_can_only_transition_to_archived(): void
    {
        $this->assertTrue(LeadStatus::LOST->canTransitionTo(LeadStatus::ARCHIVED));
        $this->assertFalse(LeadStatus::LOST->canTransitionTo(LeadStatus::WON));
        $this->assertFalse(LeadStatus::LOST->canTransitionTo(LeadStatus::NEW));
    }

    /**
     * Test complete valid pipeline flow
     */
    public function test_complete_pipeline_flow_is_valid(): void
    {
        // NEW -> CONTACTED -> QUALIFIED -> PROPOSAL_SENT -> NEGOTIATION -> WON -> ARCHIVED
        $this->assertTrue(LeadStatus::NEW->canTransitionTo(LeadStatus::CONTACTED));
        $this->assertTrue(LeadStatus::CONTACTED->canTransitionTo(LeadStatus::QUALIFIED));
        $this->assertTrue(LeadStatus::QUALIFIED->canTransitionTo(LeadStatus::PROPOSAL_SENT));
        $this->assertTrue(LeadStatus::PROPOSAL_SENT->canTransitionTo(LeadStatus::NEGOTIATION));
        $this->assertTrue(LeadStatus::NEGOTIATION->canTransitionTo(LeadStatus::WON));
        $this->assertTrue(LeadStatus::WON->canTransitionTo(LeadStatus::ARCHIVED));
    }

    /**
     * Test getAllowedTransitions returns correct transitions
     */
    public function test_get_allowed_transitions_for_new(): void
    {
        $transitions = LeadStatus::NEW->getAllowedTransitions();
        
        $this->assertCount(3, $transitions);
        $this->assertContains(LeadStatus::CONTACTED, $transitions);
        $this->assertContains(LeadStatus::LOST, $transitions);
        $this->assertContains(LeadStatus::ARCHIVED, $transitions);
    }

    /**
     * Test getAllowedTransitions returns correct transitions for QUALIFIED
     */
    public function test_get_allowed_transitions_for_qualified(): void
    {
        $transitions = LeadStatus::QUALIFIED->getAllowedTransitions();
        
        $this->assertCount(3, $transitions);
        $this->assertContains(LeadStatus::PROPOSAL_SENT, $transitions);
        $this->assertContains(LeadStatus::LOST, $transitions);
        $this->assertContains(LeadStatus::ARCHIVED, $transitions);
    }

    /**
     * Test getAllowedTransitions returns empty for ARCHIVED
     */
    public function test_get_allowed_transitions_for_archived(): void
    {
        $transitions = LeadStatus::ARCHIVED->getAllowedTransitions();
        
        $this->assertCount(0, $transitions);
    }

    /**
     * Test timestamp fields are correct
     */
    public function test_timestamp_fields(): void
    {
        $this->assertNull(LeadStatus::NEW->timestampField());
        $this->assertEquals('contacted_at', LeadStatus::CONTACTED->timestampField());
        $this->assertEquals('qualified_at', LeadStatus::QUALIFIED->timestampField());
        $this->assertEquals('proposal_sent_at', LeadStatus::PROPOSAL_SENT->timestampField());
        $this->assertEquals('negotiation_started_at', LeadStatus::NEGOTIATION->timestampField());
        $this->assertEquals('won_at', LeadStatus::WON->timestampField());
        $this->assertEquals('lost_at', LeadStatus::LOST->timestampField());
        $this->assertEquals('archived_at', LeadStatus::ARCHIVED->timestampField());
    }

    /**
     * Test terminal statuses
     */
    public function test_terminal_statuses(): void
    {
        $this->assertTrue(LeadStatus::WON->isTerminal());
        $this->assertTrue(LeadStatus::LOST->isTerminal());
        $this->assertTrue(LeadStatus::ARCHIVED->isTerminal());
        
        $this->assertFalse(LeadStatus::NEW->isTerminal());
        $this->assertFalse(LeadStatus::CONTACTED->isTerminal());
        $this->assertFalse(LeadStatus::QUALIFIED->isTerminal());
        $this->assertFalse(LeadStatus::PROPOSAL_SENT->isTerminal());
        $this->assertFalse(LeadStatus::NEGOTIATION->isTerminal());
    }

    /**
     * Test status labels
     */
    public function test_status_labels(): void
    {
        $this->assertEquals('New Lead', LeadStatus::NEW->label());
        $this->assertEquals('Contacted', LeadStatus::CONTACTED->label());
        $this->assertEquals('Qualified', LeadStatus::QUALIFIED->label());
        $this->assertEquals('Proposal Sent', LeadStatus::PROPOSAL_SENT->label());
        $this->assertEquals('In Negotiation', LeadStatus::NEGOTIATION->label());
        $this->assertEquals('Won', LeadStatus::WON->label());
        $this->assertEquals('Lost', LeadStatus::LOST->label());
        $this->assertEquals('Archived', LeadStatus::ARCHIVED->label());
    }

    /**
     * Test status colors
     */
    public function test_status_colors(): void
    {
        $this->assertEquals('blue', LeadStatus::NEW->color());
        $this->assertEquals('cyan', LeadStatus::CONTACTED->color());
        $this->assertEquals('green', LeadStatus::QUALIFIED->color());
        $this->assertEquals('purple', LeadStatus::PROPOSAL_SENT->color());
        $this->assertEquals('yellow', LeadStatus::NEGOTIATION->color());
        $this->assertEquals('emerald', LeadStatus::WON->color());
        $this->assertEquals('red', LeadStatus::LOST->color());
        $this->assertEquals('gray', LeadStatus::ARCHIVED->color());
    }

    /**
     * Test active statuses
     */
    public function test_active_statuses(): void
    {
        $active = LeadStatus::active();
        
        $this->assertCount(5, $active);
        $this->assertContains(LeadStatus::NEW, $active);
        $this->assertContains(LeadStatus::CONTACTED, $active);
        $this->assertContains(LeadStatus::QUALIFIED, $active);
        $this->assertContains(LeadStatus::PROPOSAL_SENT, $active);
        $this->assertContains(LeadStatus::NEGOTIATION, $active);
        
        $this->assertNotContains(LeadStatus::WON, $active);
        $this->assertNotContains(LeadStatus::LOST, $active);
        $this->assertNotContains(LeadStatus::ARCHIVED, $active);
    }
}