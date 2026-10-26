<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\Rfp;
use App\Services\MakerCheckerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class RfpController extends Controller
{
    public function __construct(private MakerCheckerService $makerChecker) {}

    // ── Index ──────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Rfp::where('owner_id', Auth::id());

        if ($type   = $request->get('type'))   $query->where('type', $type);
        if ($status = $request->get('status')) $query->where('status', $status);
        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('reference_number', 'like', "%{$search}%")
            );
        }

        $rfps = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $counts = Rfp::where('owner_id', Auth::id())
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return Inertia::render('rfps/index', compact('rfps', 'counts'));
    }

    // ── Create / Store ─────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('rfps/create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type'                => 'required|in:rfp,rfq',
            'title'               => 'required|string|max:255',
            'reference_number'    => 'nullable|string|max:100',
            'description'         => 'nullable|string',
            'scope_of_work'       => 'nullable|string',
            'issue_date'          => 'nullable|date',
            'submission_deadline' => 'nullable|date',
            'budget'              => 'nullable|numeric|min:0',
            'currency'            => 'nullable|string|size:3',
            'requirements'        => 'nullable|array',
            'evaluation_criteria' => 'nullable|array',
            'notes'               => 'nullable|string',
            'document'            => 'nullable|file|mimes:pdf,doc,docx|max:20480',
        ]);

        $docPath = null;
        $docName = null;
        if ($request->hasFile('document')) {
            $file    = $request->file('document');
            $docPath = $file->store('rfps/' . Auth::id(), 'private');
            $docName = $file->getClientOriginalName();
        }

        $rfp = Rfp::create([
            ...$data,
            'owner_id'        => Auth::id(),
            'currency'        => $data['currency'] ?? CompanySetting::current()->default_currency,
            'status'          => 'draft',
            'approval_status' => 'not_required',
            'document_path'   => $docPath,
            'document_name'   => $docName,
        ]);

        return redirect()->route('web.rfps.show', $rfp)
            ->with('success', ucfirst($data['type']) . ' created successfully.');
    }

    // ── Show ───────────────────────────────────────────────────────────────────

    public function show(Rfp $rfp)
    {
        $this->authorize('view', $rfp);
        $rfp->load(['submitter:id,name', 'approver:id,name']);

        $pendingApproval    = $rfp->approvalRequests()->where('status', 'pending')->first();
        $makerCheckerActive = CompanySetting::current()->makerCheckerEnabledFor('rfp');

        return Inertia::render('rfps/show', [
            'rfp'                => $rfp,
            'pendingApproval'    => $pendingApproval,
            'makerCheckerActive' => $makerCheckerActive,
            'canApprove'         => $pendingApproval
                ? $this->makerChecker->canApprove(Auth::user(), $pendingApproval)
                : false,
        ]);
    }

    // ── Update / Delete ────────────────────────────────────────────────────────

    public function update(Request $request, Rfp $rfp)
    {
        $this->authorize('update', $rfp);
        $rfp->update($request->validate([
            'title'               => 'sometimes|required|string|max:255',
            'description'         => 'nullable|string',
            'scope_of_work'       => 'nullable|string',
            'submission_deadline' => 'nullable|date',
            'budget'              => 'nullable|numeric',
            'currency'            => 'nullable|string|size:3',
            'requirements'        => 'nullable|array',
            'evaluation_criteria' => 'nullable|array',
            'notes'               => 'nullable|string',
        ]));

        return back()->with('success', 'Updated successfully.');
    }

    public function destroy(Rfp $rfp)
    {
        $this->authorize('delete', $rfp);
        if ($rfp->document_path) Storage::disk('private')->delete($rfp->document_path);
        $rfp->delete();
        return redirect()->route('web.rfps.index')->with('success', 'Deleted.');
    }

    // ── Maker-Checker ──────────────────────────────────────────────────────────

    public function requestApproval(Request $request, Rfp $rfp)
    {
        $this->authorize('update', $rfp);

        if (! CompanySetting::current()->makerCheckerEnabledFor('rfp')) {
            return back()->with('error', 'Maker-checker is not enabled for RFPs.');
        }

        if ($rfp->approval_status === 'pending') {
            return back()->with('error', 'Approval already pending.');
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $this->makerChecker->requestApproval($rfp, Auth::user(), 'publish', $request->input('notes'));

        return back()->with('success', 'Approval requested. Awaiting review.');
    }

    public function approveRequest(Request $request, Rfp $rfp)
    {
        $pending = $rfp->approvalRequests()->where('status', 'pending')->firstOrFail();

        if (! $this->makerChecker->canApprove(Auth::user(), $pending)) {
            abort(403);
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $this->makerChecker->approve($pending, Auth::user(), $request->input('notes'));

        return back()->with('success', 'RFP approved. It can now be published.');
    }

    public function rejectRequest(Request $request, Rfp $rfp)
    {
        $pending = $rfp->approvalRequests()->where('status', 'pending')->firstOrFail();

        if (! $this->makerChecker->canApprove(Auth::user(), $pending)) {
            abort(403);
        }

        $request->validate(['reason' => 'required|string|min:5|max:1000']);
        $this->makerChecker->reject($pending, Auth::user(), $request->input('reason'));

        return back()->with('success', 'RFP returned for revision.');
    }

    // ── Status Transitions ─────────────────────────────────────────────────────

    public function publish(Rfp $rfp)
    {
        $this->authorize('update', $rfp);

        if ($rfp->needsApprovalToPublish()) {
            return back()->with('error', 'This RFP requires approval before it can be published.');
        }

        $rfp->update(['status' => 'published', 'issue_date' => now()->toDateString()]);
        return back()->with('success', ucfirst($rfp->type) . ' published successfully.');
    }

    public function close(Rfp $rfp)
    {
        $this->authorize('update', $rfp);
        $rfp->update(['status' => 'closed']);
        return back()->with('success', ucfirst($rfp->type) . ' closed.');
    }

    public function award(Rfp $rfp)
    {
        $this->authorize('update', $rfp);
        $rfp->update(['status' => 'awarded', 'award_date' => now()->toDateString()]);
        return back()->with('success', ucfirst($rfp->type) . ' marked as awarded.');
    }
}