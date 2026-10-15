<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Jobs\AnalyzeTenderJob;
use App\Models\CompanySetting;
use App\Models\Tender;
use App\Services\MakerCheckerService;
use App\Services\Tender\TenderAgentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TenderController extends Controller
{
    public function __construct(
        private TenderAgentService  $agent,
        private MakerCheckerService $makerChecker,
    ) {
    }

    // ── Index ──────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = Tender::where('owner_id', Auth::id());

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->get('search')) {
            $query->where(
                fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('issuer', 'like', "%{$search}%")
                ->orWhere('reference_number', 'like', "%{$search}%")
            );
        }

        $paginator = $query
            ->orderByRaw("FIELD(status, 'reviewing', 'drafting', 'submitted', 'won', 'lost', 'withdrawn')")
            ->orderBy('submission_deadline')
            ->paginate(20)->withQueryString();

        // Reshape into the { data, meta } structure the React page expects.
        $tenders = [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
        ];

        $counts = [
            'reviewing' => Tender::where('owner_id', Auth::id())->where('status', 'reviewing')->count(),
            'drafting'  => Tender::where('owner_id', Auth::id())->where('status', 'drafting')->count(),
            'submitted' => Tender::where('owner_id', Auth::id())->where('status', 'submitted')->count(),
            'won'       => Tender::where('owner_id', Auth::id())->where('status', 'won')->count(),
            'lost'      => Tender::where('owner_id', Auth::id())->where('status', 'lost')->count(),
        ];

        $urgentCount = Tender::where('owner_id', Auth::id())
            ->whereIn('status', ['reviewing', 'drafting'])
            ->where('submission_deadline', '<=', now()->addDays(7))
            ->count();

        // Pending approvals this user requested
        $pendingApprovals = Tender::where('owner_id', Auth::id())
            ->where('approval_status', 'pending')
            ->count();

        return Inertia::render('tenders/index', compact(
            'tenders',
            'counts',
            'urgentCount',
            'pendingApprovals'
        ));
    }

    // ── Create / Store ─────────────────────────────────────────────────────────

    public function create()
    {
        return Inertia::render('tenders/create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'               => 'required|string|max:255',
            'issuer'              => 'nullable|string|max:255',
            'reference_number'    => 'nullable|string|max:100',
            'submission_deadline' => 'nullable|date',
            'estimated_value'     => 'nullable|numeric|min:0',
            'currency'            => 'nullable|string|size:3',
            'notes'               => 'nullable|string',
            'document'            => 'nullable|file|mimes:pdf,txt,doc,docx,md|max:20480',
        ]);

        $documentPath = null;
        $documentName = null;
        if ($request->hasFile('document')) {
            $file         = $request->file('document');
            $documentPath = $file->store('tenders/' . Auth::id(), 'private');
            $documentName = $file->getClientOriginalName();
        }

        $tender = Tender::create([
            'owner_id'            => Auth::id(),
            'title'               => $data['title'],
            'issuer'              => $data['issuer'] ?? null,
            'reference_number'    => $data['reference_number'] ?? null,
            'submission_deadline' => $data['submission_deadline'] ?? null,
            'estimated_value'     => $data['estimated_value'] ?? null,
            'currency'            => $data['currency'] ?? CompanySetting::current()->default_currency,
            'notes'               => $data['notes'] ?? null,
            'document_path'       => $documentPath,
            'document_name'       => $documentName,
            'analysis_status'     => $documentPath ? 'pending' : null,
            'status'              => 'reviewing',
            'approval_status'     => 'not_required',
        ]);

        // Analysis runs several sequential AI calls — dispatch to the queue so the
        // upload request returns immediately instead of blocking (and timing out).
        if ($documentPath) {
            AnalyzeTenderJob::dispatch($tender);
        }

        return redirect()
            ->route('web.tenders.show', $tender)
            ->with('success', $documentPath ? 'Tender created — AI is analysing the document.' : 'Tender created. Upload a document for AI analysis.');
    }

    // ── Show ───────────────────────────────────────────────────────────────────

    public function show(Tender $tender)
    {
        $this->authorize('view', $tender);
        $tender->load(['lead:id,title,status', 'opportunity:id,title,stage', 'project:id,name,status',
            'submitter:id,name', 'approver:id,name']);

        $pendingApproval   = $tender->approvalRequests()->where('status', 'pending')->first();
        $makerCheckerActive = CompanySetting::current()->makerCheckerEnabledFor('tenders');

        return Inertia::render('tenders/show', [
            'tender'             => $tender,
            'pendingApproval'    => $pendingApproval,
            'makerCheckerActive' => $makerCheckerActive,
            'canApprove'         => $pendingApproval
                ? $this->makerChecker->canApprove(Auth::user(), $pendingApproval)
                : false,
        ]);
    }

    // ── Update / Delete ────────────────────────────────────────────────────────

    public function update(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $tender->update($request->validate([
            'title'               => 'sometimes|required|string|max:255',
            'issuer'              => 'nullable|string|max:255',
            'reference_number'    => 'nullable|string|max:100',
            'submission_deadline' => 'nullable|date',
            'estimated_value'     => 'nullable|numeric',
            'currency'            => 'nullable|string|size:3',
            'notes'               => 'nullable|string',
            'status'              => 'nullable|in:reviewing,drafting,submitted,won,lost,withdrawn',
        ]));

        return back()->with('success', 'Tender updated.');
    }

    public function destroy(Tender $tender)
    {
        $this->authorize('delete', $tender);
        if ($tender->document_path) {
            Storage::disk('private')->delete($tender->document_path);
        }
        $tender->delete();
        return redirect()->route('web.tenders.index')->with('success', 'Tender removed.');
    }

    // ── Maker-Checker Actions ──────────────────────────────────────────────────

    /**
     * Maker requests approval before submitting.
     */
    public function requestApproval(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);

        if (! CompanySetting::current()->makerCheckerEnabledFor('tenders')) {
            return back()->with('error', 'Maker-checker is not enabled for tenders.');
        }

        if ($tender->approval_status === 'pending') {
            return back()->with('error', 'Approval already pending.');
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);

        $this->makerChecker->requestApproval($tender, Auth::user(), 'submit', $request->input('notes'));

        return back()->with('success', 'Approval requested. Awaiting review.');
    }

    /**
     * Checker approves.
     */
    public function approveRequest(Request $request, Tender $tender)
    {
        $pendingApproval = $tender->approvalRequests()->where('status', 'pending')->firstOrFail();

        if (! $this->makerChecker->canApprove(Auth::user(), $pendingApproval)) {
            abort(403, 'You are not authorised to approve this tender.');
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $this->makerChecker->approve($pendingApproval, Auth::user(), $request->input('notes'));

        return back()->with('success', 'Tender approved. It can now be submitted.');
    }

    /**
     * Checker rejects.
     */
    public function rejectRequest(Request $request, Tender $tender)
    {
        $pendingApproval = $tender->approvalRequests()->where('status', 'pending')->firstOrFail();

        if (! $this->makerChecker->canApprove(Auth::user(), $pendingApproval)) {
            abort(403, 'You are not authorised to review this tender.');
        }

        $request->validate(['reason' => 'required|string|min:5|max:1000']);
        $this->makerChecker->reject($pendingApproval, Auth::user(), $request->input('reason'));

        return back()->with('success', 'Tender returned for revision.');
    }

    // ── AI Actions ─────────────────────────────────────────────────────────────

    public function reanalyze(Tender $tender)
    {
        $this->authorize('update', $tender);
        $tender->update(['analysis_status' => 'pending']);
        AnalyzeTenderJob::dispatch($tender);
        return back()->with('success', 'Re-analysis started — this runs in the background.');
    }

    public function generateDocument(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $request->validate(['type' => 'required|string', 'additional_context' => 'nullable|string']);
        $doc = $this->agent->generateDocument($tender, $request->input('type'), $request->input('additional_context'));
        return response()->json(['success' => true, 'document' => $doc]);
    }

    public function chat(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $request->validate(['message' => 'required|string|max:2000']);
        $response = $this->agent->chat($tender, $request->input('message'));
        return response()->json(['response' => $response]);
    }

    public function answerGap(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $request->validate(['gap_index' => 'required|integer|min:0', 'answer' => 'required|string']);
        $this->agent->answerGap($tender, $request->integer('gap_index'), $request->input('answer'));
        return response()->json(['success' => true, 'gaps' => $tender->fresh()->information_gaps]);
    }

    public function toggleChecklist(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $request->validate(['item_index' => 'required|integer|min:0', 'done' => 'required|boolean']);
        $this->agent->toggleChecklistItem($tender, $request->integer('item_index'), $request->boolean('done'));
        return response()->json(['success' => true, 'checklist' => $tender->fresh()->checklist]);
    }

    // ── Status Transitions ─────────────────────────────────────────────────────

    public function submit(Tender $tender)
    {
        $this->authorize('update', $tender);

        if ($tender->needsApprovalToSubmit()) {
            return back()->with('error', 'This tender requires approval before it can be submitted. Please request approval first.');
        }

        $tender->update(['status' => 'submitted', 'submitted_at' => now()->toDateString()]);
        return back()->with('success', 'Tender marked as submitted.');
    }

    public function markWon(Tender $tender)
    {
        $this->authorize('update', $tender);
        $tender->update(['status' => 'won']);
        return back()->with('success', 'Congratulations! Tender marked as won.');
    }

    public function markLost(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        $notes = $tender->notes ? $tender->notes . "\n\nLost reason: " . $request->input('reason', '') : 'Lost reason: ' . $request->input('reason', '');
        $tender->update(['status' => 'lost', 'notes' => $notes]);
        return back()->with('success', 'Tender marked as lost.');
    }

    public function convertToProject(Request $request, Tender $tender)
    {
        $this->authorize('update', $tender);
        if ($tender->status !== 'won') {
            return response()->json(['error' => 'Only won tenders can be converted.'], 422);
        }
        if ($tender->project_id) {
            return response()->json(['error' => 'Project already created.'], 422);
        }
        $project = $this->agent->convertToProject($tender, $request->only('client_id'));
        return response()->json(['success' => true, 'project_id' => $project->id, 'project_url' => route('web.projects.show', $project)]);
    }

    public function createLeadAndOpportunity(Tender $tender)
    {
        $this->authorize('update', $tender);
        if ($tender->lead_id) {
            return response()->json(['error' => 'Lead already created.'], 422);
        }
        $result = $this->agent->createLeadAndOpportunity($tender);
        return response()->json(['success' => true, 'lead_id' => $result['lead']->id, 'opportunity_id' => $result['opportunity']->id, 'lead_url' => route('web.leads.show', $result['lead'])]);
    }
}
