<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('supplier:id,name');

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"));
        }
        if ($cat = $request->get('category'))    $query->where('category', $cat);
        if ($sup = $request->get('supplier_id')) $query->where('supplier_id', $sup);
        if ($request->get('active') !== null)    $query->where('active', $request->boolean('active'));

        $products   = $query->orderBy('name')->paginate(25)->withQueryString();
        $categories = Product::distinct()->pluck('category')->filter()->sort()->values();
        $suppliers  = Supplier::select('id', 'name')->where('active', true)->orderBy('name')->get();

        return Inertia::render('products/index', compact('products', 'categories', 'suppliers'));
    }

    public function create()
    {
        $suppliers  = Supplier::select('id', 'name')->where('active', true)->orderBy('name')->get();
        $currencies = Product::CURRENCIES;

        return Inertia::render('products/create', compact('suppliers', 'currencies'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'sku'         => 'nullable|string|max:100|unique:products,sku',
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'unit'        => 'nullable|string|max:50',
            'unit_cost'   => 'required|numeric|min:0',
            'unit_price'  => 'required|numeric|min:0',
            'currency'    => ['nullable', 'string', 'size:3', Rule::in(array_keys(Product::CURRENCIES))],
            'stock_qty'   => 'nullable|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'active'      => 'boolean',
        ]);

        // Default to KES if not provided
        $data['currency'] = $data['currency'] ?? 'KES';

        $product = Product::create($data);

        return redirect()->route('web.products.show', $product)
            ->with('success', "Product '{$product->name}' created.");
    }

    public function show(Product $product)
    {
        $product->load('supplier:id,name');
        $recentOrders = $product->supplier?->purchaseOrders()
            ->with('client:id,name')
            ->orderByDesc('created_at')->limit(5)->get();

        return Inertia::render('products/show', compact('product', 'recentOrders'));
    }

    public function edit(Product $product)
    {
        $suppliers  = Supplier::select('id', 'name')->where('active', true)->orderBy('name')->get();
        $currencies = Product::CURRENCIES;

        return Inertia::render('products/edit', compact('product', 'suppliers', 'currencies'));
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'sku'         => "nullable|string|max:100|unique:products,sku,{$product->id}",
            'description' => 'nullable|string',
            'category'    => 'nullable|string|max:100',
            'unit'        => 'nullable|string|max:50',
            'unit_cost'   => 'required|numeric|min:0',
            'unit_price'  => 'required|numeric|min:0',
            'currency'    => ['nullable', 'string', 'size:3', Rule::in(array_keys(Product::CURRENCIES))],
            'stock_qty'   => 'nullable|integer|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'active'      => 'boolean',
        ]);

        $data['currency'] = $data['currency'] ?? 'KES';

        $product->update($data);

        return redirect()->route('web.products.show', $product)
            ->with('success', 'Product updated.');
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return redirect()->route('web.products.index')
            ->with('success', 'Product deleted.');
    }
}