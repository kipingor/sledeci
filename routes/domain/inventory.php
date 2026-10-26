<?php

use App\Http\Controllers\Web\DeliveryController;
use App\Http\Controllers\Web\InventoryController;
use App\Http\Controllers\Web\PosController;
use App\Http\Controllers\Web\ProductController;
use App\Http\Controllers\Web\PurchaseOrderController;
use App\Http\Controllers\Web\SupplierController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Inventory, procurement, deliveries and point of sale
| (public delivery-confirmation links are registered in routes/web.php)
|--------------------------------------------------------------------------
*/

// ── Supply chain ───────────────────────────────────────────────────────
Route::get('vendors', fn () => redirect()->route('web.suppliers.index'))->name('vendors.index');
Route::resource('suppliers', SupplierController::class);
Route::resource('products', ProductController::class);

Route::resource('purchase-orders', PurchaseOrderController::class)->only(['index', 'create', 'store', 'show', 'destroy']);
Route::post('purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send'])->name('purchase-orders.send');
Route::post('purchase-orders/{purchaseOrder}/confirm', [PurchaseOrderController::class, 'confirm'])->name('purchase-orders.confirm');
Route::post('purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->name('purchase-orders.cancel');
Route::post('purchase-orders/{purchaseOrder}/deliveries', [PurchaseOrderController::class, 'createDelivery'])->name('purchase-orders.create-delivery');
Route::post('purchase-orders/{purchaseOrder}/documents', [PurchaseOrderController::class, 'uploadDocument'])->name('purchase-orders.upload-document');

Route::get('deliveries', [DeliveryController::class, 'index'])->name('deliveries.index');
Route::get('deliveries/{delivery}', [DeliveryController::class, 'show'])->name('deliveries.show');
Route::post('deliveries/{delivery}/dispatch', [DeliveryController::class, 'dispatch'])->name('deliveries.dispatch');
Route::post('deliveries/{delivery}/deliver', [DeliveryController::class, 'deliver'])->name('deliveries.deliver');
Route::post('deliveries/{delivery}/reject', [DeliveryController::class, 'reject'])->name('deliveries.reject');
Route::post('deliveries/{delivery}/documents', [DeliveryController::class, 'uploadDocument'])->name('deliveries.upload-document');
Route::get('deliveries/{delivery}/confirmation-pdf', [DeliveryController::class, 'confirmationPdf'])->name('deliveries.confirmation-pdf');
Route::post('delivery-documents/{document}/approve', [DeliveryController::class, 'approveDocument'])->name('delivery-documents.approve');

// ── Inventory ──────────────────────────────────────────────────────────
Route::prefix('inventory')->name('inventory.')->group(function () {
    Route::get('/', [InventoryController::class, 'index'])->name('index');
    Route::get('/valuation', [InventoryController::class, 'valuation'])->name('valuation');
    Route::get('/lookup', [InventoryController::class, 'lookup'])->name('lookup');
    Route::get('/products/{product}/movements', [InventoryController::class, 'movements'])->name('movements');
    Route::post('/products/{product}/adjust', [InventoryController::class, 'adjust'])->name('adjust');
});

// ── Point of sale ──────────────────────────────────────────────────────
Route::prefix('pos')->name('pos.')->group(function () {
    Route::get('/', [PosController::class, 'index'])->name('index');
    Route::post('/checkout', [PosController::class, 'checkout'])->name('checkout');
    Route::post('/mpesa-push', [PosController::class, 'mpesaPush'])->name('mpesa-push');
    Route::get('/receipt/{sale:receipt_number}', [PosController::class, 'receipt'])->name('receipt');
    Route::get('/history', [PosController::class, 'history'])->name('history');
    Route::post('/shift/open', [PosController::class, 'openShift'])->name('shift.open');
    Route::post('/shift/{shift}/close', [PosController::class, 'closeShift'])->name('shift.close');
    Route::post('/{sale}/void', [PosController::class, 'void'])->name('void');
});
