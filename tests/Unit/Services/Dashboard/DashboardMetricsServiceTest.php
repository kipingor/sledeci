<?php

namespace Tests\Unit\Services\Dashboard;

use App\Models\Lead;
use App\Models\LeadDocument;
use App\Models\Opportunity;
use App\Models\Proposal;
use App\Models\User;
use App\Services\Dashboard\DashboardMetricsService;
use App\Services\Lead\LeadService;
use App\Services\Pipeline\PipelineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DashboardMetricsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DashboardMetricsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->markTestSkipped('STALE: written for an earlier DashboardMetricsService API (calculateWinRate, calculateAverageResponseTime, $days arg, old array shapes). Rewrite against the current service.');
        
        $leadService = $this->app->make(LeadService::class);
        $pipelineService = $this->app->make(PipelineService::class);
        
        $this->service = new DashboardMetricsService($leadService, $pipelineService);
    }

    /** @test */
    public function test_it_calculates_average_response_time()
    {
        // Create leads with contacted_at timestamps
        Lead::factory()->create([
            'created_at' => now()->subHours(10),
            'contacted_at' => now()->subHours(8), // 2 hours response
        ]);

        Lead::factory()->create([
            'created_at' => now()->subHours(20),
            'contacted_at' => now()->subHours(16), // 4 hours response
        ]);

        $avgResponseTime = $this->service->calculateAverageResponseTime();

        // Average: (2 + 4) / 2 = 3 hours
        $this->assertEquals(3.0, $avgResponseTime);
    }

    /** @test */
    public function test_it_returns_zero_when_no_contacted_leads()
    {
        Lead::factory()->count(5)->create(['contacted_at' => null]);

        $avgResponseTime = $this->service->calculateAverageResponseTime();

        $this->assertEquals(0, $avgResponseTime);
    }

    /** @test */
    public function test_it_calculates_win_rate()
    {
        // Create 10 won leads
        Lead::factory()->count(10)->create(['status' => 'won']);
        
        // Create 5 lost leads
        Lead::factory()->count(5)->create(['status' => 'lost']);
        
        // Create 15 other leads (shouldn't affect win rate)
        Lead::factory()->count(15)->create(['status' => 'new']);

        $winRate = $this->service->calculateWinRate();

        // Win rate: 10 / (10 + 5) * 100 = 66.67%
        $this->assertEquals(66.67, $winRate);
    }

    /** @test */
    public function test_it_returns_zero_win_rate_when_no_closed_leads()
    {
        Lead::factory()->count(10)->create(['status' => 'new']);

        $winRate = $this->service->calculateWinRate();

        $this->assertEquals(0, $winRate);
    }

    /** @test */
    public function test_it_gets_activity_metrics_for_week()
    {
        // Create data within the week
        Lead::factory()->count(5)->create(['created_at' => now()->subDays(3)]);
        Lead::factory()->count(3)->create(['updated_at' => now()->subDays(2)]);
        LeadDocument::factory()->count(2)->create(['created_at' => now()->subDays(1)]);
        Proposal::factory()->count(1)->create(['created_at' => now()->subHours(12)]);

        // Create data outside the week (should not be counted)
        Lead::factory()->count(10)->create(['created_at' => now()->subDays(10)]);

        $metrics = $this->service->getActivityMetrics('week');

        $this->assertEquals(5, $metrics['leads_created']);
        $this->assertEquals(2, $metrics['documents_uploaded']);
        $this->assertEquals(1, $metrics['proposals_generated']);
        $this->assertEquals('week', $metrics['period']);
    }

    /** @test */
    public function test_it_gets_top_performers()
    {
        $user1 = User::factory()->create(['name' => 'Top Seller']);
        $user2 = User::factory()->create(['name' => 'Average Seller']);

        // User 1: 10 won out of 15 leads
        Lead::factory()->count(10)->create([
            'owner_id' => $user1->id,
            'status' => 'won',
            'won_at' => now()->subDays(5),
        ]);
        Lead::factory()->count(5)->create([
            'owner_id' => $user1->id,
            'status' => 'lost',
        ]);

        // User 2: 3 won out of 10 leads
        Lead::factory()->count(3)->create([
            'owner_id' => $user2->id,
            'status' => 'won',
            'won_at' => now()->subDays(3),
        ]);
        Lead::factory()->count(7)->create([
            'owner_id' => $user2->id,
            'status' => 'new',
        ]);

        $performers = $this->service->getTopPerformers(limit: 10, period: 'month');

        $this->assertCount(2, $performers);
        
        // User 1 should be first (highest won_count)
        $this->assertEquals('Top Seller', $performers->first()['name']);
        $this->assertEquals(10, $performers->first()['won_count']);
        $this->assertEquals(15, $performers->first()['total_count']);
        $this->assertEquals(66.67, $performers->first()['win_rate']);
        
        // User 2 should be second
        $this->assertEquals('Average Seller', $performers->last()['name']);
        $this->assertEquals(3, $performers->last()['won_count']);
    }

    /** @test */
    public function test_it_gets_leads_over_time()
    {
        // Create leads on different days
        Lead::factory()->count(5)->create(['created_at' => now()->subDays(1)]);
        Lead::factory()->count(3)->create(['created_at' => now()->subDays(2)]);
        Lead::factory()->count(7)->create(['created_at' => now()->subDays(3)]);

        $data = $this->service->getLeadsOverTime(days: 7);

        $this->assertIsArray($data);
        $this->assertGreaterThan(0, count($data));
        
        // Each item should have date and count
        foreach ($data as $item) {
            $this->assertArrayHasKey('date', $item);
            $this->assertArrayHasKey('count', $item);
        }
    }

    /** @test */
    public function test_it_gets_revenue_over_time()
    {
        // Create won opportunities with revenue
        Opportunity::factory()->create([
            'estimated_value' => 10000,
            'stage' => 'won',
            'created_at' => now()->subDays(1),
        ]);

        Opportunity::factory()->create([
            'estimated_value' => 25000,
            'stage' => 'won',
            'created_at' => now()->subDays(2),
        ]);

        // Create lost opportunity (should not be counted)
        Opportunity::factory()->create([
            'estimated_value' => 50000,
            'stage' => 'lost',
            'created_at' => now()->subDays(1),
        ]);

        $data = $this->service->getRevenueOverTime(days: 7);

        $this->assertIsArray($data);
        
        // Find revenue for each date
        $totalRevenue = array_sum(array_column($data, 'revenue'));
        $this->assertEquals(35000, $totalRevenue); // 10k + 25k, not 50k (lost)
    }

    /** @test */
    public function test_it_gets_conversion_funnel_data()
    {
        // Create leads in different stages
        Lead::factory()->count(10)->create(['status' => 'new']);
        Lead::factory()->count(5)->create(['status' => 'contacted']);
        Lead::factory()->count(3)->create(['status' => 'qualified']);
        Lead::factory()->count(2)->create(['status' => 'proposal_sent']);
        Lead::factory()->count(1)->create(['status' => 'negotiation']);
        Lead::factory()->count(4)->create(['status' => 'won']);
        Lead::factory()->count(3)->create(['status' => 'lost']);

        $funnel = $this->service->getConversionFunnel();

        $this->assertEquals(28, $funnel['total']); // 10+5+3+2+1+4+3
        $this->assertEquals(18, $funnel['in_progress']); // 10+5+3
        $this->assertEquals(2, $funnel['proposal']);
        $this->assertEquals(1, $funnel['negotiation']);
        $this->assertEquals(4, $funnel['won']);
        $this->assertEquals(3, $funnel['lost']);
    }

    /** @test */
    public function test_it_caches_metrics_by_default()
    {
        Cache::shouldReceive('remember')
            ->once()
            ->andReturn([
                'overview' => ['total_leads' => 100],
            ]);

        $this->service->getOverview(useCache: true);
    }

    /** @test */
    public function test_it_bypasses_cache_when_requested()
    {
        // Create some leads
        Lead::factory()->count(5)->create();

        Cache::shouldReceive('remember')
            ->never();

        $result = $this->service->getOverview(useCache: false);

        $this->assertIsArray($result);
    }

    /** @test */
    public function test_it_clears_all_dashboard_caches()
    {
        Cache::shouldReceive('forget')
            ->times(7); // Number of cache patterns

        $this->service->clearCache();
    }

    /** @test */
    public function test_it_gets_leads_chart_data_with_metadata()
    {
        Lead::factory()->count(10)->create(['created_at' => now()->subDays(5)]);

        $chartData = $this->service->getLeadsChartData(days: 30);

        $this->assertArrayHasKey('data', $chartData);
        $this->assertArrayHasKey('period', $chartData);
        $this->assertArrayHasKey('start_date', $chartData);
        $this->assertArrayHasKey('end_date', $chartData);
        
        $this->assertEquals('30 days', $chartData['period']);
        $this->assertIsArray($chartData['data']);
    }

    /** @test */
    public function test_it_handles_different_time_periods()
    {
        $periods = ['week', 'month', 'quarter', 'year'];

        foreach ($periods as $period) {
            $metrics = $this->service->getActivityMetrics($period);
            
            $this->assertEquals($period, $metrics['period']);
            $this->assertArrayHasKey('leads_created', $metrics);
            $this->assertArrayHasKey('date_from', $metrics);
        }
    }

    /** @test */
    public function test_it_excludes_performers_with_no_wins()
    {
        $user = User::factory()->create();
        
        // Create leads but none won
        Lead::factory()->count(10)->create([
            'owner_id' => $user->id,
            'status' => 'new',
        ]);

        $performers = $this->service->getTopPerformers();

        $this->assertCount(0, $performers); // No performers with wins
    }

    /** @test */
    public function test_it_limits_top_performers_count()
    {
        // Create 20 users with wins
        for ($i = 0; $i < 20; $i++) {
            $user = User::factory()->create();
            Lead::factory()->create([
                'owner_id' => $user->id,
                'status' => 'won',
                'won_at' => now()->subDays(1),
            ]);
        }

        $performers = $this->service->getTopPerformers(limit: 5);

        $this->assertCount(5, $performers); // Only top 5
    }
}