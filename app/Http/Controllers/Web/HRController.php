<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\HrLeaveRequest;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HRController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('hr/index', [
            'stats' => [
                'total_staff' => StaffProfile::count(),
                'available' => StaffProfile::where('is_available', true)->count(),
                'contractors' => StaffProfile::where('is_contractor', true)->count(),
                // BUG FIX: LeaveRequest now maps to leave_requests — this works correctly
                'pending_leave' => HrLeaveRequest::where('status', 'pending')->count(),
            ],
        ]);
    }

    public function staff(Request $request): Response
    {
        $staff = StaffProfile::with('user:id,name,email,avatar')
            ->when($request->filled('search'), fn ($q) => $q->where(function ($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                    ->orWhere('last_name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('is_contractor', $request->type === 'contractor')
            )
            ->orderBy('last_name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('hr/staff', [
            'staff' => $staff,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function show(int $id): Response
    {
        $profile = StaffProfile::with([
            'user:id,name,email,avatar',
            // LeaveRequest now has staffProfile relation + maps to leave_requests
            'leaveRequests' => fn ($q) => $q->latest('from_date')->limit(10),
        ])->findOrFail($id);

        return Inertia::render('hr/show', compact('profile'));
    }

    public function create(): Response
    {
        return Inertia::render('hr/create', [
            'users' => User::select(['id', 'name', 'email'])
                ->whereNull('staff_profile_id')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['nullable', 'string', 'max:100'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'is_contractor' => ['boolean'],
            'is_available' => ['boolean'],
            'skills' => ['nullable', 'array'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        $userId = $data['user_id'] ?? null;
        unset($data['user_id']);
        $profile = StaffProfile::create($data);

        if ($userId) {
            User::where('id', $userId)->update(['staff_profile_id' => $profile->id]);
        }

        return redirect()->route('web.hr.index')->with('success', 'Staff profile created.');
    }

    public function edit(int $id): Response
    {
        return Inertia::render('hr/edit', [
            'profile' => StaffProfile::with('user:id,name,email')->findOrFail($id),
            'users' => User::select(['id', 'name', 'email'])->orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, int $id)
    {
        StaffProfile::findOrFail($id)->update($request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['nullable', 'string', 'max:100'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'is_contractor' => ['boolean'],
            'is_available' => ['boolean'],
            'skills' => ['nullable', 'array'],
        ]));

        return redirect()->route('web.hr.index')->with('success', 'Staff profile updated.');
    }

    public function leave(Request $request): Response
    {
        // BUG FIX: 'staffProfile' relation previously didn't exist on LeaveRequest.
        // Now HrLeaveRequest::$table = 'leave_requests' with staffProfile() relation.
        $leaves = HrLeaveRequest::with('staffProfile.user:id,name,avatar', 'approver:id,name')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->latest('from_date')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('hr/leave', [
            'leaves' => $leaves,
            'filters' => $request->only(['status']),
            'stats' => [
                'pending' => HrLeaveRequest::pending()->count(),
                // BUG FIX: was 'to_date' field on wrong model — now uses correct column name
                'approved' => HrLeaveRequest::active()->count(),
            ],
        ]);
    }

    public function approveLeave(Request $request, HrLeaveRequest $leave)
    {
        $leave->update([
            'status' => 'approved',
            'approved_by' => Auth::id(),
            'admin_notes' => $request->admin_notes,
        ]);

        return back()->with('success', 'Leave request approved.');
    }

    public function rejectLeave(Request $request, HrLeaveRequest $leave)
    {
        $leave->update([
            'status' => 'rejected',
            'approved_by' => Auth::id(),
            'admin_notes' => $request->validate(['admin_notes' => 'required|string'])['admin_notes'],
        ]);

        return back()->with('success', 'Leave request rejected.');
    }
}
