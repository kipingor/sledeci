<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\AgentVisit;
use App\Models\FieldAgent;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FieldAgentController
 *
 * Manages field sales reps / collection agents who visit clients in person.
 * Two surfaces: Admin view (manage agents, territory performance) and
 * Agent view (mobile-friendly GPS check-in, order capture, collection).
 */
class FieldAgentController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    public function index(Request $request): Response
    {
        $query = FieldAgent::with('user:id,name,email')->withCount('visits');

        if ($territory = $request->get('territory')) $query->where('territory', $territory);
        if ($request->boolean('active_only'))         $query->where('active', true);

        $agents = $query->orderBy('agent_code')->paginate(20)->withQueryString();

        $agents->getCollection()->transform(function (FieldAgent $a) {
            $a->today_visits  = $a->todayVisits();
            $a->month_revenue = $a->monthRevenue();
            return $a;
        });

        $territories = FieldAgent::whereNotNull('territory')->distinct()->pluck('territory');

        return Inertia::render('field-agents/index', [
            'agents'      => $agents,
            'territories' => $territories,
            'filters'     => $request->only(['territory', 'active_only']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('field-agents/create', [
            'users' => \App\Models\User::whereDoesntHave('fieldAgent')
                ->select('id', 'name', 'email')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id'         => 'required|exists:users,id|unique:field_agents,user_id',
            'agent_code'      => 'nullable|string|max:20|unique:field_agents,agent_code',
            'territory'       => 'nullable|string|max:100',
            'phone'           => 'nullable|string|max:20',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $data['agent_code'] = $data['agent_code'] ?? 'FA-' . str_pad((string) (FieldAgent::count() + 1), 3, '0', STR_PAD_LEFT);
        $data['active']     = true;

        $agent = FieldAgent::create($data);

        return redirect()->route('web.field-agents.show', $agent)->with('success', 'Field agent created.');
    }

    public function show(FieldAgent $fieldAgent): Response
    {
        $fieldAgent->load('user:id,name,email');
        $visits = $fieldAgent->visits()
            ->with('client:id,name', 'lead:id,title')
            ->orderByDesc('checked_in_at')
            ->paginate(20);

        $stats = [
            'today_visits'   => $fieldAgent->todayVisits(),
            'month_revenue'  => $fieldAgent->monthRevenue(),
            'total_visits'   => $fieldAgent->visits()->count(),
            'collection_30d' => $fieldAgent->visits()
                ->where('checked_in_at', '>=', now()->subDays(30))
                ->sum('amount_collected'),
        ];

        return Inertia::render('field-agents/show', compact('fieldAgent', 'visits', 'stats'));
    }

    public function update(Request $request, FieldAgent $fieldAgent)
    {
        $data = $request->validate([
            'territory'       => 'nullable|string|max:100',
            'phone'           => 'nullable|string|max:20',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'active'          => 'boolean',
        ]);

        $fieldAgent->update($data);
        return back()->with('success', 'Field agent updated.');
    }

    public function myDashboard(): Response
    {
        $agent = FieldAgent::where('user_id', Auth::id())->firstOrFail();

        $todayVisits = $agent->visits()
            ->whereDate('checked_in_at', today())
            ->orderByDesc('checked_in_at')
            ->get();

        $products = Product::where('active', true)
            ->where('stock_qty', '>', 0)
            ->select('id', 'name', 'sku', 'unit_price', 'currency', 'stock_qty')
            ->orderBy('name')
            ->get();

        return Inertia::render('field-agents/my-dashboard', [
            'agent'        => $agent,
            'todayVisits'  => $todayVisits,
            'products'     => $products,
            'monthRevenue' => $agent->monthRevenue(),
        ]);
    }

    public function checkIn(Request $request)
    {
        $agent = FieldAgent::where('user_id', Auth::id())->firstOrFail();

        $data = $request->validate([
            'client_id'     => 'nullable|exists:users,id',
            'lead_id'       => 'nullable|exists:leads,id',
            'latitude'      => 'required|numeric|between:-90,90',
            'longitude'     => 'required|numeric|between:-180,180',
            'location_name' => 'nullable|string|max:255',
            'purpose'       => 'required|in:sales_call,collection,delivery,survey,other',
        ]);

        $visit = AgentVisit::create([
            ...$data,
            'field_agent_id' => $agent->id,
            'checked_in_at'  => now(),
        ]);

        return response()->json(['success' => true, 'visit_id' => $visit->id]);
    }

    public function checkOut(Request $request, AgentVisit $visit)
    {
        $agent = FieldAgent::where('user_id', Auth::id())->firstOrFail();
        if ($visit->field_agent_id !== $agent->id) abort(403);

        $data = $request->validate([
            'outcome'                  => 'required|in:order_placed,payment_collected,no_decision,follow_up,rejected',
            'amount_collected'         => 'nullable|numeric|min:0',
            'collection_reference'     => 'nullable|string|max:100',
            'order_items'               => 'nullable|array',
            'order_items.*.product_id'  => 'required_with:order_items|exists:products,id',
            'order_items.*.quantity'    => 'required_with:order_items|integer|min:1',
            'order_items.*.unit_price'  => 'required_with:order_items|numeric|min:0',
            'notes'                    => 'nullable|string|max:1000',
        ]);

        $orderTotal = collect($data['order_items'] ?? [])
            ->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

        DB::transaction(function () use ($visit, $data, $orderTotal) {
            $visit->update([
                'checked_out_at'      => now(),
                'outcome'              => $data['outcome'],
                'amount_collected'     => $data['amount_collected'] ?? null,
                'collection_reference' => $data['collection_reference'] ?? null,
                'order_items'           => $data['order_items'] ?? null,
                'order_total'           => $orderTotal > 0 ? $orderTotal : null,
                'notes'                => $data['notes'] ?? null,
            ]);

            if (! empty($data['order_items'])) {
                $this->inventory->recordSale($data['order_items'], "AGENT-VISIT-{$visit->id}");
            }
        });

        return response()->json(['success' => true, 'visit' => $visit->fresh()]);
    }

    public function territoryReport(): Response
    {
        $agents = FieldAgent::with('user:id,name')
            ->where('active', true)
            ->get()
            ->groupBy('territory')
            ->map(function ($agentsInTerritory, $territory) {
                return [
                    'territory'       => $territory ?: 'Unassigned',
                    'agent_count'     => $agentsInTerritory->count(),
                    'visits_30d'      => $agentsInTerritory->sum(fn ($a) =>
                        $a->visits()->where('checked_in_at', '>=', now()->subDays(30))->count()
                    ),
                    'revenue_30d'     => $agentsInTerritory->sum(fn ($a) =>
                        $a->visits()->where('checked_in_at', '>=', now()->subDays(30))->sum('order_total')
                    ),
                    'collections_30d' => $agentsInTerritory->sum(fn ($a) =>
                        $a->visits()->where('checked_in_at', '>=', now()->subDays(30))->sum('amount_collected')
                    ),
                ];
            })
            ->values();

        return Inertia::render('field-agents/territory-report', compact('agents'));
    }
}
