<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::withCount(['productCatalog as products_count', 'purchaseOrders as orders_count']);

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%"));
        }
        if ($cat = $request->get('category')) $query->where('category', $cat);

        $suppliers = $query->orderBy('name')->paginate(20)->withQueryString();
        $categories = Supplier::distinct()->pluck('category')->filter()->sort()->values();

        return Inertia::render('suppliers/index', compact('suppliers', 'categories'));
    }

    public function create()
    {
        return Inertia::render('suppliers/create');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'address'        => 'nullable|string',
            'website'        => 'nullable|url|max:255',
            'contact_person' => 'nullable|string|max:255',
            'payment_terms'  => 'nullable|string|max:100',
            'category'       => 'nullable|string|max:100',
            'notes'          => 'nullable|string',
            'rating'         => 'nullable|numeric|min:0|max:5',
        ]);

        $supplier = Supplier::create(array_merge($data, ['active' => true]));

        return redirect()->route('web.suppliers.show', $supplier)
            ->with('success', "Supplier '{$supplier->name}' created.");
    }

    public function show(Supplier $supplier)
    {
        $supplier->load([]);

        $products      = Product::where('supplier_id', $supplier->id)->orderBy('name')->get();
        $recentOrders  = PurchaseOrder::where('supplier_id', $supplier->id)
            ->with('client:id,name,company')
            ->orderByDesc('order_date')->limit(10)->get();

        $stats = [
            'total_orders'   => PurchaseOrder::where('supplier_id', $supplier->id)->count(),
            'total_spent'    => PurchaseOrder::where('supplier_id', $supplier->id)
                ->whereNotIn('status', ['draft', 'cancelled'])->sum('total'),
            'products_count' => $products->count(),
            'pending_orders' => PurchaseOrder::where('supplier_id', $supplier->id)
                ->whereIn('status', ['sent', 'confirmed'])->count(),
        ];

        return Inertia::render('suppliers/show', compact('supplier', 'products', 'recentOrders', 'stats'));
    }

    public function edit(Supplier $supplier)
    {
        return Inertia::render('suppliers/edit', compact('supplier'));
    }

    public function update(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'nullable|email|max:255',
            'phone'          => 'nullable|string|max:50',
            'address'        => 'nullable|string',
            'website'        => 'nullable|url|max:255',
            'contact_person' => 'nullable|string|max:255',
            'payment_terms'  => 'nullable|string|max:100',
            'category'       => 'nullable|string|max:100',
            'notes'          => 'nullable|string',
            'rating'         => 'nullable|numeric|min:0|max:5',
            'active'         => 'boolean',
        ]);

        $supplier->update($data);

        return redirect()->route('web.suppliers.show', $supplier)
            ->with('success', 'Supplier updated.');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->update(['active' => false]);
        return redirect()->route('web.suppliers.index')
            ->with('success', 'Supplier deactivated.');
    }
}