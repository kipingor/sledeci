<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ClientReport;
use App\Models\User;
use App\Models\Project;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientReportController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientReport::with('client:id,name,email', 'project:id,name', 'creator:id,name');

        if ($client = $request->get('client_id')) {
            $query->where('client_id', $client);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        $reports  = $query->orderByDesc('period_start')->paginate(20)->withQueryString();
        $clients  = User::select('id', 'name', 'email')
            ->where('is_client', true)
            ->whereHas('invoices')
            ->orWhere(fn($q) => $q->where('is_client', true)->whereHas('projects'))
            ->orderBy('name')->get();
        $projects = Project::select('id', 'name', 'client_id')->orderBy('name')->get();

        return Inertia::render('accounting/client-reports', compact('reports', 'clients', 'projects'));
    }

    public function create(Request $request)
    {
        // Clients with at least one project — used for project-based reports
        $clientsWithProjects = User::select('id', 'name', 'email')
            ->whereHas('projects')
            ->orderBy('name')
            ->get();

        // All clients — used for general reports
        $allClients = User::select('id', 'name', 'email')
            ->where('is_client', true)
            ->orderBy('name')
            ->get();

        // Projects grouped/keyed for the frontend dropdown
        $projects = Project::select('id', 'name', 'client_id', 'status')
            ->orderBy('name')
            ->get();

        return Inertia::render('accounting/client-report-create', compact(
            'clientsWithProjects',
            'allClients',
            'projects',
        ));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id'    => 'required|exists:users,id',
            'project_id'   => 'nullable|exists:projects,id',
            'report_type'  => 'required|in:project,general',
            'title'        => 'required|string|max:255',
            'period_type'  => 'required|in:weekly,monthly,quarterly,custom',
            'period_start' => 'required|date',
            'period_end'   => 'required|date|after_or_equal:period_start',
            'content'      => 'required|string',
        ]);

        $metrics = ($data['report_type'] === 'project')
            ? $this->buildProjectMetrics(
                (int) $data['client_id'],
                $data['project_id'] ? (int) $data['project_id'] : null,
                $data['period_start'],
                $data['period_end'],
              )
            : $this->buildGeneralMetrics(
                (int) $data['client_id'],
                $data['period_start'],
                $data['period_end'],
              );

        $report = ClientReport::create([
            'client_id'    => $data['client_id'],
            'project_id'   => $data['project_id'] ?? null,
            'title'        => $data['title'],
            'period_type'  => $data['period_type'],
            'period_start' => $data['period_start'],
            'period_end'   => $data['period_end'],
            'content'      => $data['content'],
            'created_by'   => Auth::id(),
            'status'       => 'draft',
            'metrics'      => $metrics,
        ]);

        return redirect()->route('web.client-reports.show', $report)
            ->with('success', 'Report created.');
    }

    public function show(ClientReport $clientReport)
    {
        $clientReport->load('client:id,name,email', 'project:id,name', 'creator:id,name');
        return Inertia::render('accounting/client-report-show', ['report' => $clientReport]);
    }

    public function send(ClientReport $clientReport)
    {
        $clientReport->update(['status' => 'sent', 'sent_at' => now()]);
        return back()->with('success', 'Report marked as sent.');
    }

    public function destroy(ClientReport $clientReport)
    {
        $clientReport->delete();
        return back()->with('success', 'Report deleted.');
    }

    // ── JSON endpoint — called by frontend when client/project is selected ──

    /**
     * GET /api/v1/client-report-metrics
     * ?client_id=X &project_id=Y &from=YYYY-MM-DD &to=YYYY-MM-DD &type=project|general
     */
    public function metrics(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'  => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'from'       => 'nullable|date',
            'to'         => 'nullable|date',
            'type'       => 'nullable|in:project,general',
        ]);

        $clientId  = (int) $request->input('client_id');
        $projectId = $request->input('project_id') ? (int) $request->input('project_id') : null;
        $from      = $request->input('from');
        $to        = $request->input('to');
        $type      = $request->input('type', 'project');

        $metrics = ($type === 'project')
            ? $this->buildProjectMetrics($clientId, $projectId, $from, $to)
            : $this->buildGeneralMetrics($clientId, $from, $to);

        return response()->json($metrics);
    }

    // ── Metric builders ───────────────────────────────────────────────────

    private function buildProjectMetrics(int $clientId, ?int $projectId, ?string $from, ?string $to): array
    {
        $invoiceQ = Invoice::where('client_id', $clientId);
        $projectQ = Project::where('client_id', $clientId);

        if ($projectId) {
            $invoiceQ->where('project_id', $projectId);
            $projectQ->where('id', $projectId);
        }
        if ($from) $invoiceQ->whereDate('issue_date', '>=', $from);
        if ($to)   $invoiceQ->whereDate('issue_date', '<=', $to);

        $invoices = $invoiceQ->with('payments')->get();

        $now = now()->startOfDay();

        $projects = $projectQ
            ->with(['tasks.assignee:id,name'])
            ->get()
            ->map(function ($p) use ($now) {
                $tasks = $p->tasks;

                $doneTasks    = $tasks->where('status', 'done');

                // Delayed = in progress/review AND past due date
                $delayedTasks = $tasks->whereIn('status', ['in_progress', 'review'])
                    ->filter(fn($t) => $t->endAt && $t->endAt->lt($now));

                // Wins = done on or before due date
                $wins = $doneTasks->filter(fn($t) =>
                    $t->completed_at && $t->endAt && $t->completed_at->lte($t->endAt)
                );

                return [
                    'id'              => $p->id,
                    'name'            => $p->name,
                    'status'          => $p->status,
                    'tasks_total'     => $tasks->count(),
                    'tasks_done'      => $doneTasks->count(),
                    'hours_estimated' => (int) $tasks->sum('estimated_hours'),
                    'hours_spent'     => (int) $tasks->sum('spent_hours'),
                    'completed_tasks' => $doneTasks->values()->map(fn($t) => [
                        'id'           => $t->id,
                        'title'        => $t->title,
                        'completed_at' => $t->completed_at?->toDateString(),
                        'assignee'     => $t->assignee?->name,
                    ])->all(),
                    'delayed_tasks'   => $delayedTasks->values()->map(fn($t) => [
                        'id'           => $t->id,
                        'title'        => $t->title,
                        'due'          => $t->endAt?->toDateString(),
                        'delay_reason' => $t->delay_reason ?? null,
                        'mitigation'   => $t->mitigation ?? null,
                        'assignee'     => $t->assignee?->name,
                    ])->all(),
                    'wins'            => $wins->values()->map(fn($t) => [
                        'id'           => $t->id,
                        'title'        => $t->title,
                        'completed_at' => $t->completed_at?->toDateString(),
                        'assignee'     => $t->assignee?->name,
                    ])->all(),
                    'upcoming_tasks'  => $tasks->whereIn('status', ['todo', 'in_progress'])
                        ->sortBy('endAt')->take(5)->values()->map(fn($t) => [
                            'title'    => $t->title,
                            'due'      => $t->endAt?->toDateString(),
                            'priority' => $t->priority,
                            'assignee' => $t->assignee?->name,
                        ])->all(),
                ];
            });

        return [
            'type'           => 'project',
            'invoices_total' => $invoices->count(),
            'invoices_paid'  => $invoices->where('status', 'paid')->count(),
            'billed'         => (float) $invoices->whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'collected'      => (float) $invoices->sum(fn($i) => $i->payments->sum('amount')),
            'outstanding'    => (float) $invoices->where('status', 'overdue')->sum('total'),
            'projects'       => $projects->values()->all(),
            'generated_at'   => now()->toDateTimeString(),
        ];
    }

    private function buildGeneralMetrics(int $clientId, ?string $from, ?string $to): array
    {
        $invoiceQ = Invoice::where('client_id', $clientId);
        if ($from) $invoiceQ->whereDate('issue_date', '>=', $from);
        if ($to)   $invoiceQ->whereDate('issue_date', '<=', $to);

        $invoices = $invoiceQ->with('payments')->get();

        return [
            'type'           => 'general',
            'invoices_total' => $invoices->count(),
            'invoices_paid'  => $invoices->where('status', 'paid')->count(),
            'billed'         => (float) $invoices->whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'collected'      => (float) $invoices->sum(fn($i) => $i->payments->sum('amount')),
            'outstanding'    => (float) $invoices->where('status', 'overdue')->sum('total'),
            'projects'       => [],
            'generated_at'   => now()->toDateTimeString(),
        ];
    }
}