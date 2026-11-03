<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProductIndexTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
    }

    public function test_if_it_renders_the_product_index_page_for_authenticated_users()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $this->actingAs($user)
            ->get('/products')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('products/index')
                ->has('products')
                ->has('categories')
                ->has('suppliers')
                ->has('filters'));
    }

    public function test_if_it_filters_products_by_search_term()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $matchingProduct = Product::create([
            'name' => 'Valve',
            'sku' => 'VALVE-1',
            'category' => 'Hardware',
        ]);

        Product::create([
            'name' => 'Pipe',
            'sku' => 'PIPE-1',
            'category' => 'Hardware',
        ]);

        $this->actingAs($user)
            ->get('/products?search=Valve&category=Hardware')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('products/index')
                ->where('filters.search', 'Valve')
                ->where('filters.category', 'Hardware')
                ->has('products.data', 1)
                ->where('products.data.0.id', $matchingProduct->id));
    }

    public function test_if_it_filters_products_by_stock_status()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        $lowStockProduct = Product::create([
            'name' => 'Valve',
            'sku' => 'VALVE-1',
            'category' => 'Hardware',
            'stock_qty' => 2,
            'reorder_point' => 5,
        ]);

        Product::create([
            'name' => 'Valve spare',
            'sku' => 'VALVE-2',
            'category' => 'Hardware',
            'stock_qty' => 20,
            'reorder_point' => 5,
        ]);

        $this->actingAs($user)
            ->get('/products?search=Valve&category=Hardware&stock_status=low_stock')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('products/index')
                ->where('filters.search', 'Valve')
                ->where('filters.category', 'Hardware')
                ->where('filters.stock_status', 'low_stock')
                ->has('products.data', 1)
                ->where('products.data.0.id', $lowStockProduct->id));
    }
}
