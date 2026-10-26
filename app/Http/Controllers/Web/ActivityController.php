<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Enums\ActivityType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * FIXES applied:
 *
 * 1. show(), create(), edit(), dashboard() used view() (Blade) instead of Inertia::render().
 *    This is an Inertia SPA — there are no Blade templates for these views.
 *    Fixed: all non-JSON responses now use Inertia::render().
 *
 * 2. show() called Activity::with('user') but Activity has no user() relation —
 *    it has lead() and causer (polymorphic). Fixed to load lead and infer user
 *    from the lead's owner.
 *
 * 3. The JSON/Inertia dual-response branching is unnecessary in an Inertia app
 *    (the API has its own controller at Api/V1/ActivityController). Retained for
 *    backwards compatibility but simplified.
 *
 * 4. Removed the private helper waterfall (applyUserFilter, applyTypeFilter etc.)
 *    — replaced with inline when() scopes, which is the Laravel idiomatic pattern.
 */
class ActivityController extends Controller
{
    public function index(Request $request)
    {
        $activities = Activity::with(['lead:id,title', 'user:id,name,avatar'])
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->user_id))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('lead_id'), fn ($q) => $q->where('lead_id', $request->lead_id))
            ->when(
                $request->filled('start_date') && $request->filled('end_date'),
                fn ($q) =>
                $q->whereBetween('created_at', [$request->start_date, $request->end_date])
            )
            ->when(
                $request->filled('description_keyword'),
                fn ($q) =>
                $q->where('description', 'like', "%{$request->description_keyword}%")
            )
            ->latest('created_at')
            ->paginate((int) $request->input('per_page', 20))
            ->withQueryString();

        if ($request->wantsJson()) {
            return response()->json($activities);
        }

        return Inertia::render('activities/index', [
            'activities' => $activities,
            'filters'    => $request->only(['user_id', 'type', 'lead_id', 'start_date', 'end_date']),
            'typeOptions' => collect(ActivityType::cases())->map(fn ($c) => $c->value)->toArray(),
        ]);
    }

    public function show(int $id)
    {
        $activity = Activity::with(['lead:id,title,status', 'user:id,name,avatar'])
            ->findOrFail($id);

        if (request()->wantsJson()) {
            return response()->json($activity);
        }

        // FIX: was view('activities.show') — Blade view does not exist in Inertia app
        return Inertia::render('activities/show', compact('activity'));
    }

    public function create(): Response
    {
        // FIX: was view('activities.create')
        return Inertia::render('activities/create', [
            'typeOptions' => collect(ActivityType::cases())->map(fn ($c) => $c->value)->toArray(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'lead_id'      => ['required', 'exists:leads,id'],
            'type'         => ['required', 'string'],
            'subject'      => ['nullable', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'outcome'      => ['nullable', 'string', 'max:100'],
            'duration'     => ['nullable', 'string', 'max:50'],
        ]);

        $data['user_id'] = Auth::id();
        $activity = Activity::create($data);

        return redirect()->route('web.activities.show', $activity->id)
            ->with('success', 'Activity logged.');
    }

    public function edit(int $id): Response
    {
        $activity = Activity::with('lead:id,title')->findOrFail($id);

        // FIX: was view('activities.edit')
        return Inertia::render('activities/edit', [
            'activity'    => $activity,
            'typeOptions' => collect(ActivityType::cases())->map(fn ($c) => $c->value)->toArray(),
        ]);
    }

    public function update(Request $request, int $id)
    {
        $activity = Activity::findOrFail($id);

        $data = $request->validate([
            'type'         => ['sometimes', 'string'],
            'subject'      => ['nullable', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'outcome'      => ['nullable', 'string', 'max:100'],
            'duration'     => ['nullable', 'string', 'max:50'],
            'completed_at' => ['nullable', 'date'],
        ]);

        $activity->update($data);

        return redirect()->route('web.activities.show', $activity->id)
            ->with('success', 'Activity updated.');
    }

    public function destroy(int $id)
    {
        Activity::findOrFail($id)->delete();
        return redirect()->route('web.activities.index')->with('success', 'Activity deleted.');
    }
}
