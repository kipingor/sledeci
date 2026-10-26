<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Services\MakerCheckerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ApprovalController extends Controller
{
    public function __construct(private MakerCheckerService $makerChecker) {}

    /**
     * List all pending approvals for the current user (as a checker).
     */
    public function index(Request $request)
    {
        $pending = ApprovalRequest::with(['approvable', 'requester:id,name,email'])
            ->where('status', 'pending')
            ->orderBy('created_at')
            ->paginate(20);

        // Filter to ones this user can approve
        $pending->getCollection()->transform(function ($req) {
            $req->can_approve = $this->makerChecker->canApprove(Auth::user(), $req);
            return $req;
        });

        return Inertia::render('approvals/index', compact('pending'));
    }

    /**
     * Approve a pending request.
     */
    public function approve(Request $request, ApprovalRequest $approvalRequest)
    {
        if (! $this->makerChecker->canApprove(Auth::user(), $approvalRequest)) {
            abort(403, 'You are not authorised to approve this request.');
        }

        if (! $approvalRequest->isPending()) {
            return back()->with('error', 'This request is no longer pending.');
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);

        $this->makerChecker->approve($approvalRequest, Auth::user(), $request->input('notes'));

        return back()->with('success', 'Request approved successfully.');
    }

    /**
     * Reject a pending request.
     */
    public function reject(Request $request, ApprovalRequest $approvalRequest)
    {
        if (! $this->makerChecker->canApprove(Auth::user(), $approvalRequest)) {
            abort(403, 'You are not authorised to review this request.');
        }

        if (! $approvalRequest->isPending()) {
            return back()->with('error', 'This request is no longer pending.');
        }

        $request->validate(['reason' => 'required|string|min:5|max:1000']);

        $this->makerChecker->reject($approvalRequest, Auth::user(), $request->input('reason'));

        return back()->with('success', 'Request rejected.');
    }
}