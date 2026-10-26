<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Opportunity;
use App\Models\Project;
use App\Models\ProjectChange;
use App\Models\ProjectLesson;
use App\Models\ProjectRisk;
use App\Models\ProjectStakeholder;
use App\Models\ProjectTeamMember;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectService;
use App\Support\SqlOrder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function __construct(
        protected ProjectService $projectService
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()
            ->with(['client:id,name,email,avatar', 'owner:id,name,email,avatar', 'opportunity:id,title', 'teamMembers'])
            ->withCount(['tasks', 'milestones']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('phase') && $request->phase !== 'all') {
            $query->where('phase', $request->phase);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }
        if ($request->filled('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        $projects = $query->latest()->paginate(15)->withQueryString();

        $projects->through(function ($project) {
            $progress = $this->projectService->calculateProgress($project);
            $project->progress = $progress;
            $project->completedTasksCount = $progress['tasks']['completed'];
            $project->tasksCount = $progress['tasks']['total'];
            $project->teamMembersCount = $project->teamMembers->count();
            $project->overdue = $project->end_date
                && now()->isAfter($project->end_date)
                && $project->status === 'active';

            return $project;
        });

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'filters' => $request->only(['status', 'phase', 'search', 'owner_id', 'client_id']),
            'statistics' => $this->projectService->getStatistics(),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Project::class);

        return Inertia::render('projects/create', $this->formOptions());
    }

    public function store(Request $request)
    {
        $this->authorize('create', Project::class);
        $data = $this->validate($request, $this->rules());
        $project = $this->projectService->create($data);

        return redirect()->route('web.projects.show', $project->id)
            ->with('success', 'Project created successfully.');
    }

    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        $project->load([
            'client:id,name,email,avatar',
            'owner:id,name,email,avatar',
            'manager:id,name,email,avatar',
            'sponsor:id,name,email,avatar',
            'opportunity:id,title,estimated_value,stage',
            'milestones',
            'teamMembers.user:id,name,email,avatar',
            'tasks' => fn ($q) => $q
                ->with(['assignee:id,name,email,avatar', 'children'])
                ->orderBy('wbs_code')
                ->orderBy('sort_order'),
            'risks' => fn ($q) => $q
                ->with('owner:id,name,avatar')
                ->orderByRaw('probability * impact DESC'),
            'issues' => fn ($q) => $q
                ->with('owner:id,name,avatar')
                ->orderByRaw(SqlOrder::byList('severity', ['critical', 'high', 'medium', 'low']))
                ->orderBy('raised_date', 'desc'),
            'changes' => fn ($q) => $q
                ->with('requestedBy:id,name,avatar', 'reviewedBy:id,name,avatar')
                ->latest(),
            'stakeholders' => fn ($q) => $q
                ->with('user:id,name,email,avatar')
                ->orderByRaw(SqlOrder::byList('influence', ['high', 'medium', 'low']))
                ->orderByRaw(SqlOrder::byList('interest', ['high', 'medium', 'low'])),
            'lessons' => fn ($q) => $q
                ->with('createdBy:id,name,avatar')
                ->latest(),
        ]);

        $progress = $this->projectService->calculateProgress($project);
        $timeline = $this->projectService->getTimeline($project);
        $budget = $this->projectService->calculateBudgetUtilization($project);
        $isAtRisk = $this->projectService->isAtRisk($project);
        $evm = $this->projectService->calculateEVM($project, $progress['overall']);
        $riskSummary = $this->projectService->getRiskSummary($project);

        // FIX: was \App\Models\ActivityLog — now uses canonical AuditLog model
        $recentActivity = AuditLog::where(function ($q) use ($project) {
            $q->where('auditable_type', Project::class)
                ->where('auditable_id', $project->id);
        })
            ->orWhere(function ($q) use ($project) {
                $q->where('auditable_type', Task::class)
                    ->whereIn('auditable_id', $project->tasks->pluck('id'));
            })
            ->with('user:id,name,email,avatar')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'event' => $log->event,
                'description' => $log->change_summary,
                'user' => $log->user
                    ? ['id' => $log->user->id, 'name' => $log->user->name, 'avatar' => $log->user->avatar]
                    : null,
                'created_at' => $log->created_at,
                'new_values' => $log->new_values,
            ])
            ->toArray();

        $existingMemberIds = $project->teamMembers->pluck('user_id')->toArray();
        $availableUsers = User::select(['id', 'name', 'email', 'avatar'])
            ->whereNotIn('id', $existingMemberIds)
            ->orderBy('name')
            ->get();

        return Inertia::render('projects/show', [
            'project' => $project,
            'progress' => $progress,
            'timeline' => $timeline,
            'budget' => $budget,
            'isAtRisk' => $isAtRisk,
            'evm' => $evm,
            'riskSummary' => $riskSummary,
            'recentActivity' => $recentActivity,
            'availableUsers' => $availableUsers,
            'canManage' => $this->can('update', $project),
            'riskCategories' => ProjectRisk::CATEGORIES,
            'riskResponseTypes' => ProjectRisk::RESPONSE_TYPES,
            'riskStatuses' => ProjectRisk::STATUSES,
            'changeTypes' => ProjectChange::CHANGE_TYPES,
            'changeTypeLabels' => ProjectChange::CHANGE_TYPE_LABELS,
            'lessonCategories' => ProjectLesson::CATEGORIES,
            'lessonTypes' => ProjectLesson::TYPES,
            'engagementLevels' => ProjectStakeholder::ENGAGEMENT_LEVELS,
            'phaseOptions' => Project::PHASES,
        ]);
    }

    public function edit(Project $project): Response
    {
        $this->authorize('update', $project);
        $project->load(['client:id,name', 'owner:id,name', 'sponsor:id,name', 'opportunity:id,title']);

        return Inertia::render('projects/edit', array_merge(['project' => $project], $this->formOptions()));
    }

    public function update(Request $request, Project $project)
    {
        $this->authorize('update', $project);
        $this->projectService->update($project, $this->validate($request, $this->rules()));

        return redirect()->route('web.projects.show', $project->id)
            ->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project)
    {
        $this->authorize('delete', $project);
        $this->projectService->delete($project);

        return redirect()->route('web.projects.index')
            ->with('success', 'Project deleted.');
    }

    public function updateStatus(Request $request, Project $project)
    {
        $this->authorize('update', $project);
        $request->validate(['status' => ['required', Rule::in(Project::STATUSES)]]);
        $this->projectService->updateStatus($project, $request->status);

        return back()->with('success', 'Status updated.');
    }

    public function advancePhase(Project $project)
    {
        $this->authorize('update', $project);
        $this->projectService->advancePhase($project);

        return back()->with('success', 'Phase advanced.');
    }

    public function clone(Request $request, Project $project)
    {
        $this->authorize('create', Project::class);
        $this->authorize('view', $project);
        $request->validate([
            'include_tasks' => ['boolean'],
            'include_team' => ['boolean'],
        ]);

        $newProject = $this->projectService->clone(
            $project,
            $request->boolean('include_tasks', true),
            $request->boolean('include_team', true)
        );

        return redirect()->route('web.projects.show', $newProject->id)
            ->with('success', 'Project cloned.');
    }

    public function atRisk(): Response
    {
        $this->authorize('viewAny', Project::class);

        return Inertia::render('projects/at-risk', [
            'projects' => $this->projectService->getAtRisk(),
        ]);
    }

    public function export(Project $project)
    {
        $this->authorize('view', $project);
        $project->load(['tasks', 'milestones', 'teamMembers', 'client', 'owner', 'risks', 'issues', 'changes', 'stakeholders', 'lessons']);

        return response()->json($project);
    }

    public function addMember(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'role' => ['nullable', 'string', 'max:100'],
            'allocation_percentage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $exists = ProjectTeamMember::where('project_id', $project->id)
            ->where('user_id', $data['user_id'])
            ->exists();

        if ($exists) {
            return back()->with('error', 'User is already a team member.');
        }

        ProjectTeamMember::create([
            'project_id' => $project->id,
            'user_id' => $data['user_id'],
            'role' => $data['role'] ?? null,
            'allocation_percentage' => $data['allocation_percentage'] ?? null,
            'joined_at' => now(),
        ]);

        return back()->with('success', 'Team member added.');
    }

    public function removeMember(Project $project, User $user)
    {
        $this->authorize('update', $project);
        ProjectTeamMember::where('project_id', $project->id)->where('user_id', $user->id)->delete();

        return back()->with('success', 'Team member removed.');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    protected function formOptions(): array
    {
        return [
            'opportunities' => Opportunity::select(['id', 'title'])->orderBy('title')->get(),
            // FIX: was User::all() — now scoped correctly; clients dropdown uses is_client scope
            'clients' => User::clients()->select(['id', 'name', 'email'])->orderBy('name')->get(),
            'owners' => User::select(['id', 'name', 'email'])->orderBy('name')->get(),
            'sponsors' => User::select(['id', 'name', 'email'])->orderBy('name')->get(),
            'statusOptions' => Project::STATUSES,
            'phaseOptions' => Project::PHASES,
            'currencyOptions' => ['USD', 'EUR', 'GBP', 'KES'],
        ];
    }

    protected function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'success_criteria' => ['nullable', 'array'],
            'assumptions' => ['nullable', 'array'],
            'constraints' => ['nullable', 'array'],
            'high_level_risks' => ['nullable', 'string'],
            'opportunity_id' => ['nullable', Rule::exists('opportunities', 'id')],
            'client_id' => ['nullable', Rule::exists('users', 'id')],
            'owner_id' => ['nullable', Rule::exists('users', 'id')],
            'manager_id' => ['nullable', Rule::exists('users', 'id')],
            'sponsor_id' => ['nullable', Rule::exists('users', 'id')],
            'status' => ['required', Rule::in(Project::STATUSES)],
            'phase' => ['required', Rule::in(Project::PHASES)],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'cost_baseline' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
