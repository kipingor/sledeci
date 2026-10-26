<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HrLeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * HR Leave Request API Controller
 *
 * NOTE on model naming:
 *   HrLeaveRequest → leave_requests table (has migration, has StaffProfile FK) ✅ KEEP
 *   LeaveRequest   → leave_requests table (NO migration, never used anywhere)      ❌ DELETE
 *
 * The original audit report had this backwards. HrLeaveRequest is the correct
 * model for this controller. LeaveRequest is the unused stub to be deleted.
 *
 * FIX: update() previously used $request->all() with no validation — replaced
 * with explicit validated fields.
 */
class LeaveRequestController extends Controller
{
    public function index(): JsonResponse
    {
        $leaves = HrLeaveRequest::with('staffProfile.user:id,name,avatar', 'approver:id,name')
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $leaves->through(fn ($l) => $this->transform($l)),
            'meta' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'total' => $leaves->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'staff_profile_id' => ['required', 'exists:staff_profiles,id'],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'type' => ['required', 'string', 'in:annual,sick,unpaid,maternity,paternity,other'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $leave = HrLeaveRequest::create($data);

        return response()->json([
            'success' => true,
            'data' => $this->transform($leave->load('staffProfile.user', 'approver')),
        ], 201);
    }

    public function show(HrLeaveRequest $leave): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->transform($leave->load('staffProfile.user', 'approver')),
        ]);
    }

    public function update(Request $request, HrLeaveRequest $leave): JsonResponse
    {
        // FIX: was $request->all() — no validation, mass-assignment risk
        $data = $request->validate([
            'status' => ['sometimes', 'in:pending,approved,rejected,cancelled'],
            'admin_notes' => ['nullable', 'string', 'max:1000'],
            'approved_by' => ['nullable', 'exists:users,id'],
        ]);

        // Auto-set approver when approving
        if (isset($data['status']) && $data['status'] === 'approved' && empty($data['approved_by'])) {
            $data['approved_by'] = Auth::id();
        }

        $leave->update($data);

        return response()->json([
            'success' => true,
            'data' => $this->transform($leave->fresh()->load('staffProfile.user', 'approver')),
        ]);
    }

    public function destroy(HrLeaveRequest $leave): JsonResponse
    {
        $leave->delete();

        return response()->json(['success' => true], 204);
    }

    private function transform(HrLeaveRequest $leave): array
    {
        return [
            'id' => $leave->id,
            'staff' => $leave->staffProfile ? [
                'id' => $leave->staffProfile->id,
                'name' => $leave->staffProfile->user?->name,
            ] : null,
            'from_date' => $leave->from_date,
            'to_date' => $leave->to_date,
            'type' => $leave->type,
            'reason' => $leave->reason,
            'status' => $leave->status,
            'approved_by' => $leave->approver?->name,
            'admin_notes' => $leave->admin_notes,
            'created_at' => $leave->created_at,
        ];
    }
}
