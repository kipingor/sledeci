<?php

namespace App\Http\Controllers\Tenant\CRM;

use App\Http\Controllers\Controller;
use App\Http\Requests\CRM\StoreActivityRequest;
use App\Models\Activity;
use App\Models\Contact;
use App\Models\Deal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    /**
     * Log an activity against a contact or deal.
     * The actable is determined by ?for=contact,{id} or ?for=deal,{id}.
     */
    public function store(StoreActivityRequest $request): RedirectResponse
    {
        $data = $request->validated();

        [$type, $id] = explode(',', $request->input('for', ','));

        if ($type === 'contact') {
            $actable = Contact::findOrFail((int) $id);
        } elseif ($type === 'deal') {
            $actable = Deal::findOrFail((int) $id);
        } else {
            abort(422, 'Invalid actable type.');
        }

        $activity = new Activity($data);
        $activity->owner_id = $data['owner_id'] ?? auth()->id();
        $actable->activities()->save($activity);

        return back()->with('success', 'Activity logged.');
    }

    public function update(Request $request, Activity $activity): RedirectResponse
    {
        $activity->update($request->only(['subject', 'body', 'due_at', 'done_at']));

        return back()->with('success', 'Activity updated.');
    }

    public function markDone(Activity $activity): RedirectResponse
    {
        $activity->markDone();

        return back()->with('success', 'Activity marked as done.');
    }

    public function destroy(Activity $activity): RedirectResponse
    {
        $activity->delete();

        return back()->with('success', 'Activity deleted.');
    }
}
