<?php
namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TimeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FIX: pages/time-logs/ existed with no backend route or controller.
 */
class TimeLogController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = TimeLog::with('user:id,name', 'project:id,name', 'task:id,title')
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->filled('user_id'),    fn ($q) => $q->where('user_id', $request->user_id))
            ->latest('started_at')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('time-logs/index', [
            'logs'     => $logs,
            'filters'  => $request->only(['project_id', 'user_id']),
            'totals'   => [
                'today' => TimeLog::where('user_id', Auth::id())
                    ->whereDate('started_at', today())->sum('duration_minutes'),
                'week'  => TimeLog::where('user_id', Auth::id())
                    ->where('started_at', '>=', now()->startOfWeek())->sum('duration_minutes'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('time-logs/create', [
            'projects' => \App\Models\Project::select(['id', 'name'])->where('status', 'active')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'task_id'          => ['required', 'integer', 'exists:tasks,id'],
            // Either hours (the UI) or duration_minutes (API clients) — never written to the DB directly,
            // because time_logs.duration_minutes / hours are GENERATED columns derived from started_at/ended_at.
            'hours'            => ['required_without:duration_minutes', 'nullable', 'numeric', 'min:0.01', 'max:24'],
            'duration_minutes' => ['required_without:hours', 'nullable', 'integer', 'min:1', 'max:1440'],
            'started_at'       => ['nullable', 'date'],
            'notes'            => ['nullable', 'string', 'max:2000'],
        ]);

        $task    = Task::findOrFail($data['task_id']);
        $minutes = isset($data['duration_minutes'])
            ? (int) $data['duration_minutes']
            : (int) round(((float) $data['hours']) * 60);

        $start = isset($data['started_at'])
            ? \Illuminate\Support\Carbon::parse($data['started_at'])
            : now()->subMinutes($minutes);

        TimeLog::create([
            'task_id'    => $task->id,
            'project_id' => $task->project_id,
            'user_id'    => Auth::id(),
            'started_at' => $start,
            'ended_at'   => $start->copy()->addMinutes($minutes),
            'notes'      => $data['notes'] ?? null,
        ]);

        return redirect()->route('web.time-logs.index')->with('success', 'Time logged.');
    }
}
