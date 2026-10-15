<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ClientFollowUp;
use App\Models\User;
use App\Models\Project;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClientFollowUpController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientFollowUp::with(
            'client:id,name,email',
            'project:id,name',
            'invoice:id,number,total,currency',
            'creator:id,name'
        );

        if ($status = $request->get('status')) {
            if ($status === 'pending') {
                $query->whereNull('completed_at');
            }
            if ($status === 'completed') {
                $query->whereNotNull('completed_at');
            }
            if ($status === 'overdue') {
                $query->whereNull('completed_at')->where('scheduled_at', '<', now());
            }
        }
        if ($client = $request->get('client_id')) {
            $query->where('client_id', $client);
        }
        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        $followUps = $query->orderBy('scheduled_at')->paginate(20)->withQueryString();

        $counts = [
            'pending'   => ClientFollowUp::whereNull('completed_at')->count(),
            'overdue'   => ClientFollowUp::whereNull('completed_at')->where('scheduled_at', '<', now())->count(),
            'today'     => ClientFollowUp::whereNull('completed_at')->whereDate('scheduled_at', today())->count(),
            'completed' => ClientFollowUp::whereNotNull('completed_at')->count(),
        ];

        $clients = User::select('id', 'name', 'email')
            ->whereHas('invoices')
            ->orWhereHas('projects')
            ->orderBy('name')
            ->get();

        $projects = Project::select('id', 'name')->orderBy('name')->get();

        return Inertia::render('accounting/follow-ups', compact('followUps', 'counts', 'clients', 'projects'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id'    => 'required|exists:users,id',
            'project_id'   => 'nullable|exists:projects,id',
            'invoice_id'   => 'nullable|exists:invoices,id',
            'type'         => 'required|in:call,email,meeting,check_in,invoice_reminder,report',
            'subject'      => 'required|string|max:255',
            'notes'        => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'priority'     => 'in:low,normal,high',
        ]);

        ClientFollowUp::create(array_merge($data, ['created_by' => Auth::id()]));

        return back()->with('success', 'Follow-up scheduled.');
    }

    public function update(Request $request, ClientFollowUp $followUp)
    {
        $data = $request->validate([
            'subject'      => 'sometimes|required|string|max:255',
            'notes'        => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'priority'     => 'in:low,normal,high',
            'type'         => 'in:call,email,meeting,check_in,invoice_reminder,report',
        ]);

        $followUp->update($data);
        return back()->with('success', 'Follow-up updated.');
    }

    public function complete(Request $request, ClientFollowUp $followUp)
    {
        $data = $request->validate([
            'outcome' => 'nullable|string|max:255',
            'notes'   => 'nullable|string',
        ]);

        $followUp->update(array_merge($data, ['completed_at' => now()]));
        return back()->with('success', 'Follow-up marked as complete.');
    }

    public function destroy(ClientFollowUp $followUp)
    {
        $followUp->delete();
        return back()->with('success', 'Follow-up removed.');
    }
}
