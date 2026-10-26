<?php
namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', AuditLog::class);

        $logs = AuditLog::with('user:id,name,avatar')
            ->when($request->filled('event'),   fn ($q) => $q->event($request->event))
            ->when($request->filled('user_id'), fn ($q) => $q->byUser($request->user_id))
            ->when($request->filled('model'),   fn ($q) => $q->where('auditable_type', 'like', "%{$request->model}%"))
            ->latest()
            ->paginate(50)
            ->withQueryString();

        $eventTypes = AuditLog::select('event')->distinct()->pluck('event')->sort()->values();

        return Inertia::render('audit-logs/index', [
            'logs'       => $logs,
            'filters'    => $request->only(['event', 'user_id', 'model']),
            'eventTypes' => $eventTypes,
        ]);
    }
}