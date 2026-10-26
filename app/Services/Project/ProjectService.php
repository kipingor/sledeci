<?php

namespace App\Services\Project;

use App\Events\ProjectCompleted;
use App\Events\ProjectCreated;
use App\Models\Project;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    // ── CRUD ──────────────────────────────────────────────────────────────────

    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Project::query()->with(['tasks', 'milestones']);

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['phase'])) {
            $query->where('phase', $filters['phase']);
        }

        if (isset($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                    ->orWhere('description', 'like', "%{$filters['search']}%");
            });
        }

        return $query->latest()->paginate($perPage);
    }

    public function create(array $data): Project
    {
        return DB::transaction(function () use ($data) {
            // Default phase to 'initiating' if not provided
            $data['phase'] ??= 'initiating';

            $project = Project::create($data);
            event(new ProjectCreated($project->id));

            return $project->load(['tasks', 'milestones']);
        });
    }

    public function update(Project $project, array $data): Project
    {
        return DB::transaction(function () use ($project, $data) {
            $project->update($data);

            return $project->refresh()->load(['tasks', 'milestones']);
        });
    }

    public function delete(Project $project): bool
    {
        return DB::transaction(function () use ($project) {
            $project->tasks()->delete();
            $project->milestones()->delete();
            $project->risks()->delete();
            $project->issues()->delete();
            $project->changes()->delete();
            $project->stakeholders()->delete();

            return $project->delete();
        });
    }

    // ── Status & Phase ────────────────────────────────────────────────────────

    public function updateStatus(Project $project, string $status): Project
    {
        $project->update(['status' => $status]);

        if ($status === 'completed') {
            $project->update([
                'completed_at' => now(),
                'phase' => 'closing',
            ]);
            event(new ProjectCompleted($project->id));
        }

        return $project->refresh();
    }

    /**
     * Advance the project to the next PMBOK process group phase.
     * Phases progress: initiating → planning → executing
     *                  → monitoring_controlling → closing.
     */
    public function advancePhase(Project $project): Project
    {
        $phases = Project::PHASES;
        $current = array_search($project->phase, $phases);

        if ($current !== false && isset($phases[$current + 1])) {
            $project->update(['phase' => $phases[$current + 1]]);
        }

        return $project->refresh();
    }

    // ── Progress ──────────────────────────────────────────────────────────────

    public function calculateProgress(Project $project): array
    {
        $totalTasks = $project->tasks()->count();
        $completedTasks = $project->tasks()->whereNotNull('completed_at')->count();

        $totalMilestones = $project->milestones()->count();
        $completedMilestones = $project->milestones()->whereNotNull('completed_at')->count();

        $taskProgress = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 2) : 0;
        $milestoneProgress = $totalMilestones > 0
            ? round(($completedMilestones / $totalMilestones) * 100, 2) : 0;

        // Weighted: 70% tasks, 30% milestones (same as original)
        $overallProgress = round(($taskProgress * 0.7) + ($milestoneProgress * 0.3), 2);

        return [
            'overall' => $overallProgress,
            'tasks' => [
                'total' => $totalTasks,
                'completed' => $completedTasks,
                'progress' => $taskProgress,
            ],
            'milestones' => [
                'total' => $totalMilestones,
                'completed' => $completedMilestones,
                'progress' => $milestoneProgress,
            ],
        ];
    }

    // ── PMBOK §7.4 — Earned Value Management ──────────────────────────────────

    /**
     * Calculate full EVM metrics for a project.
     *
     * Acronyms per PMBOK §7.4.2 Earned Value Analysis table:
     *  PV  — Planned Value       (budgeted value of work planned to date)
     *  EV  — Earned Value        (budgeted value of work actually completed)
     *  AC  — Actual Cost         (actual cost incurred to date)
     *  BAC — Budget At Completion (total approved budget)
     *  CV  — Cost Variance       EV − AC  (negative = over budget)
     *  SV  — Schedule Variance   EV − PV  (negative = behind schedule)
     *  CPI — Cost Performance Index    EV / AC  (< 1 = over budget)
     *  SPI — Schedule Performance Index EV / PV (< 1 = behind schedule)
     *  EAC — Estimate At Completion    BAC / CPI  (projected total cost)
     *  ETC — Estimate To Complete      EAC − AC   (remaining cost to finish)
     *  VAC — Variance At Completion    BAC − EAC  (projected surplus/deficit)
     *  TCPI— To-Complete Performance Index (BAC−EV)/(BAC−AC)
     *
     * AC is derived from:
     *  1. Actual expense records (project_expenses table) if available.
     *  2. Otherwise, task spent_hours × an implied hourly rate (budget/estimated_hours).
     *
     * @param  Project  $project  Must have tasks loaded or will be queried.
     * @param  float  $progress  Overall progress percentage (0–100).
     */
    public function calculateEVM(Project $project, float $progress): array
    {
        $bac = $project->bac;

        // ── Planned Value ─────────────────────────────────────────────────────
        $pv = $project->planned_value ?? 0.0;

        // ── Earned Value ──────────────────────────────────────────────────────
        $ev = $bac > 0 ? round($bac * ($progress / 100), 2) : 0.0;

        // ── Actual Cost ───────────────────────────────────────────────────────
        // Prefer expenses table; fall back to hours-based estimate.
        $ac = $this->calculateActualCost($project);

        // Guard: avoid division-by-zero
        $cpi = $ac > 0 ? round($ev / $ac, 3) : null;
        $spi = $pv > 0 ? round($ev / $pv, 3) : null;
        $cv = round($ev - $ac, 2);
        $sv = round($ev - $pv, 2);
        $eac = ($cpi && $cpi > 0) ? round($bac / $cpi, 2) : null;
        $etc = $eac !== null ? round($eac - $ac, 2) : null;
        $vac = $eac !== null ? round($bac - $eac, 2) : null;
        $tcpi = ($bac > 0 && ($bac - $ac) > 0)
                ? round(($bac - $ev) / ($bac - $ac), 3)
                : null;

        return [
            'bac' => $bac,
            'pv' => $pv,
            'ev' => $ev,
            'ac' => $ac,
            'cv' => $cv,   // Cost Variance
            'sv' => $sv,   // Schedule Variance
            'cpi' => $cpi,  // Cost Performance Index
            'spi' => $spi,  // Schedule Performance Index
            'eac' => $eac,  // Estimate At Completion
            'etc' => $etc,  // Estimate To Complete
            'vac' => $vac,  // Variance At Completion
            'tcpi' => $tcpi, // To-Complete Performance Index
            // Interpretations for the UI
            'cost_status' => $this->interpretIndex($cpi),
            'schedule_status' => $this->interpretIndex($spi),
        ];
    }

    /**
     * Derive Actual Cost (AC).
     *
     * Tries the expenses table first; falls back to hours-based proxy.
     * When hours are used, an implied rate is computed as budget / estimated_hours
     * so that the EVM figures remain meaningful even before an expense module is live.
     */
    protected function calculateActualCost(Project $project): float
    {
        // 1. Real expenses (if the expenses table/model exists)
        try {
            $expensesTotal = $project->expenses()->sum('amount');
            if ($expensesTotal > 0) {
                return (float) $expensesTotal;
            }
        } catch (\Exception $e) {
            // Table not yet migrated — fall through
        }

        // 2. Hours-based proxy
        $estimatedHours = (float) $project->tasks()->sum('estimated_hours');
        $spentHours = (float) $project->tasks()->sum('spent_hours');

        if ($estimatedHours <= 0 || $project->bac <= 0) {
            return 0.0;
        }

        $impliedRate = $project->bac / $estimatedHours; // cost per hour

        return round($spentHours * $impliedRate, 2);
    }

    /**
     * Interpret a CPI or SPI value into a traffic-light status string.
     * PMBOK §7.4.2 — values above 1.0 are favourable.
     */
    protected function interpretIndex(?float $index): string
    {
        if ($index === null) {
            return 'unknown';
        }
        if ($index >= 1.0) {
            return 'on_track';
        }
        if ($index >= 0.8) {
            return 'at_risk';
        }

        return 'critical';
    }

    // ── Budget Utilization (legacy — kept for backward compat) ────────────────

    public function calculateBudgetUtilization(Project $project): array
    {
        $budgetHours = (int) $project->tasks()->sum('estimated_hours');
        $spentHours = (int) $project->tasks()->sum('spent_hours');

        if ($budgetHours === 0 && $project->budget) {
            return [
                'budget' => (float) $project->budget,
                'spent' => 0,
                'remaining' => (float) $project->budget,
                'utilization' => 0,
                'mode' => 'monetary',
            ];
        }

        $remaining = max(0, $budgetHours - $spentHours);
        $utilization = $budgetHours > 0
            ? round(min(($spentHours / $budgetHours) * 100, 100), 1)
            : 0;

        return [
            'budget' => $budgetHours,
            'spent' => $spentHours,
            'remaining' => $remaining,
            'utilization' => $utilization,
            'mode' => 'hours',
        ];
    }

    // ── Timeline ──────────────────────────────────────────────────────────────

    public function getTimeline(Project $project): array
    {
        $milestones = $project->milestones()
            ->orderBy('due_date')
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'title' => $m->title,
                'due_date' => $m->due_date,
                'completed' => $m->completed_at !== null,
                'completed_at' => $m->completed_at,
                'type' => 'milestone',
            ]);

        $tasks = $project->tasks()
            ->whereNotNull('due_date')
            ->orderBy('due_date')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'title' => $t->title,
                'due_date' => $t->due_date,
                'completed' => $t->completed_at !== null,
                'completed_at' => $t->completed_at,
                'type' => 'task',
                'wbs_code' => $t->wbs_code ?? null,
            ]);

        return [
            'items' => $milestones->merge($tasks)->sortBy('due_date')->values(),
            'start_date' => $project->start_date,
            'end_date' => $project->end_date,
            'current_date' => now()->toDateString(),
        ];
    }

    // ── Risk Helpers ──────────────────────────────────────────────────────────

    /**
     * Return summarised risk metrics for the show page dashboard.
     */
    public function getRiskSummary(Project $project): array
    {
        $risks = $project->risks()->where('status', '!=', 'closed')->get();

        return [
            'total' => $risks->count(),
            'high' => $risks->filter(fn ($r) => ($r->probability * $r->impact) >= 15)->count(),
            'medium' => $risks->filter(fn ($r) => ($r->probability * $r->impact) >= 6 && ($r->probability * $r->impact) < 15)->count(),
            'low' => $risks->filter(fn ($r) => ($r->probability * $r->impact) < 6)->count(),
            'unmitigated' => $risks->whereNull('response_type')->count(),
        ];
    }

    // ── At Risk ───────────────────────────────────────────────────────────────

    public function isAtRisk(Project $project): bool
    {
        if ($project->end_date && now()->isAfter($project->end_date) && $project->status === 'active') {
            return true;
        }

        $progress = $this->calculateProgress($project);

        if ($project->start_date && $project->end_date) {
            $totalDays = max(1, $project->start_date->diffInDays($project->end_date));
            $daysElapsed = $project->start_date->diffInDays(now());
            $expectedProgress = ($daysElapsed / $totalDays) * 100;

            if ($progress['overall'] < ($expectedProgress - 20)) {
                return true;
            }
        }

        return false;
    }

    public function getAtRisk(): Collection
    {
        return Project::where('status', 'active')
            ->get()
            ->filter(fn ($p) => $this->isAtRisk($p));
    }

    // ── Statistics ────────────────────────────────────────────────────────────

    public function getStatistics(): array
    {
        return [
            'total' => Project::count(),
            'by_status' => collect(Project::STATUSES)
                ->mapWithKeys(fn ($s) => [$s => Project::where('status', $s)->count()])
                ->toArray(),
            'by_phase' => collect(Project::PHASES)
                ->mapWithKeys(fn ($p) => [$p => Project::where('phase', $p)->count()])
                ->toArray(),
            'overdue' => Project::where('status', 'active')
                ->whereNotNull('end_date')
                ->where('end_date', '<', now())
                ->count(),
            'at_risk' => $this->getAtRisk()->count(),
            'total_budget' => Project::sum('budget'),
            'average_completion_time' => $this->calculateAverageCompletionTime(),
        ];
    }

    protected function calculateAverageCompletionTime(): float
    {
        $completed = Project::where('status', 'completed')
            ->whereNotNull('completed_at')
            ->get();

        if ($completed->isEmpty()) {
            return 0;
        }

        $totalDays = $completed->sum(fn ($p) => $p->created_at->diffInDays($p->completed_at));

        return round($totalDays / $completed->count(), 2);
    }

    // ── Clone ─────────────────────────────────────────────────────────────────

    public function clone(Project $project, bool $includeTasks = true, bool $includeTeam = true): Project
    {
        return DB::transaction(function () use ($project, $includeTasks, $includeTeam) {
            $data = $project->only($project->getFillable());
            unset($data['id']);
            $data['name'] = $data['name'].' (Copy)';
            $data['status'] = 'planning';
            $data['phase'] = 'initiating';
            $data['completed_at'] = null;

            $newProject = Project::create($data);

            if ($includeTasks) {
                foreach ($project->tasks as $task) {
                    $taskData = $task->only($task->getFillable());
                    unset($taskData['id']);
                    $taskData['project_id'] = $newProject->id;
                    $taskData['completed_at'] = null;
                    $newProject->tasks()->create($taskData);
                }
            }

            if ($includeTeam) {
                foreach ($project->teamMembers as $member) {
                    $newProject->teamMembers()->create([
                        'user_id' => $member->user_id,
                        'role' => $member->role,
                        'allocation_percentage' => $member->allocation_percentage,
                        'joined_at' => now(),
                    ]);
                }
            }

            return $newProject->load(['tasks', 'milestones', 'teamMembers']);
        });
    }

    // ── Mark Completed ───────────────────────────────────────────────────────

    public function markAsCompleted(Project $project): Project
    {
        return DB::transaction(function () use ($project) {
            $project->update([
                'status' => 'completed',
                'phase' => 'closing',
                'completed_at' => now(),
            ]);
            event(new ProjectCompleted($project->id));

            return $project->refresh();
        });
    }

    public function getByStatus(string $status): Collection
    {
        return Project::where('status', $status)->with(['tasks', 'milestones'])->latest()->get();
    }

    public function getActive(): Collection
    {
        return $this->getByStatus('active');
    }

    public function getCompleted(): Collection
    {
        return $this->getByStatus('completed');
    }

    public function getOnHold(): Collection
    {
        return $this->getByStatus('on_hold');
    }

    public function getOverdue(): Collection
    {
        return Project::where('status', 'active')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->with(['tasks', 'milestones'])
            ->get();
    }

    public function getByTeamMember(User $user): Collection
    {
        return Project::whereHas('teamMembers', fn ($q) => $q->where('user_id', $user->id))
            ->with(['tasks', 'milestones'])
            ->latest()
            ->get();
    }

    // ── Team members ──────────────────────────────────────────────────────────

    public function addTeamMember(Project $project, int $userId, ?string $role = null): void
    {
        DB::transaction(function () use ($project, $userId, $role) {
            $exists = $project->teamMembers()->where('user_id', $userId)->exists();
            if (! $exists) {
                $project->teamMembers()->create([
                    'user_id' => $userId,
                    'role' => $role,
                    'joined_at' => now(),
                ]);
            }
        });
    }

    public function removeTeamMember(Project $project, int $userId): void
    {
        $project->teamMembers()->where('user_id', $userId)->delete();
    }
}
