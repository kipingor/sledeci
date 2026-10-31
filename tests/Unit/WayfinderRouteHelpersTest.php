<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Static checks for Wayfinder-compatible route stubs (no Laravel boot required).
 */
class WayfinderRouteHelpersTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = dirname(__DIR__, 2);
    }

    public function test_route_helper_modules_exist(): void
    {
        foreach (['types.ts', 'web/index.ts', 'web/leads.ts', 'web/ai.ts', 'web/workflows.ts'] as $rel) {
            $path = $this->root.'/resources/js/routes/'.$rel;
            $this->assertFileExists($path, $path);
        }
    }

    public function test_leads_helper_covers_bulk_operations(): void
    {
        $src = file_get_contents($this->root.'/resources/js/routes/web/leads.ts');
        foreach (['bulkImport', 'bulkDelete', 'bulkExport', 'bulkUpdateStatus', 'bulkAssign', 'bulkUpdateStage', '/leads/import'] as $needle) {
            $this->assertStringContainsString($needle, $src);
        }
    }

    public function test_ai_helper_covers_insights_endpoints(): void
    {
        $src = file_get_contents($this->root.'/resources/js/routes/web/ai.ts');
        foreach (['pipelineHealth', 'batchScore', 'leadInsights', '/ai/pipeline-health'] as $needle) {
            $this->assertStringContainsString($needle, $src);
        }
    }

    public function test_workflows_helper_and_page_exist(): void
    {
        $src = file_get_contents($this->root.'/resources/js/routes/web/workflows.ts');
        $this->assertStringContainsString('toggle', $src);
        $this->assertStringContainsString("route('/workflows'", $src);
        $this->assertFileExists($this->root.'/resources/js/pages/workflows/index.tsx');
    }
}
