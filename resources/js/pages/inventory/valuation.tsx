import { useMemo, useState } from 'react';

type Valuation = {
	id: string;
	name: string;
	sku: string;
	category: string;
	quantity: number;
	unitCost: number;
	value: number;
	change: number;
};

type Props = {
	valuations?: Valuation[];
	currency?: string;
};

const sampleValuations: Valuation[] = [
	{ id: '1', name: 'Wireless Headphones', sku: 'WH-2048', category: 'Electronics', quantity: 128, unitCost: 42.5, value: 5440, change: 8.2 },
	{ id: '2', name: 'Office Chair — Ergonomic', sku: 'OC-1092', category: 'Furniture', quantity: 36, unitCost: 185, value: 6660, change: 3.4 },
	{ id: '3', name: 'USB-C Charging Cable', sku: 'UC-3381', category: 'Accessories', quantity: 415, unitCost: 6.25, value: 2593.75, change: -1.8 },
	{ id: '4', name: 'Laptop Stand', sku: 'LS-0784', category: 'Accessories', quantity: 92, unitCost: 28, value: 2576, change: 0 },
	{ id: '5', name: 'Mechanical Keyboard', sku: 'MK-5520', category: 'Electronics', quantity: 57, unitCost: 74.99, value: 4274.43, change: 5.6 },
	{ id: '6', name: 'Desk Lamp', sku: 'DL-2416', category: 'Furniture', quantity: 63, unitCost: 32, value: 2016, change: -2.1 },
];

const money = (amount: number, currency: string) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export default function Valuation({ valuations = sampleValuations, currency = 'USD' }: Props) {
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('All categories');
	const [sortByValue, setSortByValue] = useState(true);

	const categories = useMemo(() => ['All categories', ...Array.from(new Set(valuations.map((item) => item.category)))], [valuations]);
	const filtered = useMemo(() => {
		const search = query.trim().toLowerCase();
		return valuations
			.filter((item) => category === 'All categories' || item.category === category)
			.filter((item) => !search || `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search))
			.sort((a, b) => sortByValue ? b.value - a.value : a.name.localeCompare(b.name));
	}, [valuations, query, category, sortByValue]);

	const totalValue = valuations.reduce((sum, item) => sum + item.value, 0);
	const totalUnits = valuations.reduce((sum, item) => sum + item.quantity, 0);
	const averageCost = totalUnits ? valuations.reduce((sum, item) => sum + item.unitCost * item.quantity, 0) / totalUnits : 0;
	const categoryCount = new Set(valuations.map((item) => item.category)).size;

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="mb-1 text-sm font-medium text-slate-500">Inventory</p>
						<h1 className="text-3xl font-semibold tracking-tight">Valuation</h1>
						<p className="mt-2 text-sm text-slate-500">Review the current cost and value of your inventory.</p>
					</div>
					<button
						type="button"
						onClick={() => window.print()}
						className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-slate-100"
					>
						Print report
					</button>
				</header>

				<section aria-label="Valuation summary" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<SummaryCard label="Total inventory value" value={money(totalValue, currency)} note="At current unit cost" />
					<SummaryCard label="Units in stock" value={totalUnits.toLocaleString()} note="Across all products" />
					<SummaryCard label="Average unit cost" value={money(averageCost, currency)} note="Weighted by quantity" />
					<SummaryCard label="Categories" value={String(categoryCount)} note="With inventory on hand" />
				</section>

				<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
					<div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-lg font-semibold">Inventory breakdown</h2>
							<p className="mt-1 text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? 'product' : 'products'} shown</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<label className="sr-only" htmlFor="valuation-search">Search inventory</label>
							<input
								id="valuation-search"
								type="search"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search products..."
								className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-56"
							/>
							<label className="sr-only" htmlFor="valuation-category">Filter by category</label>
							<select
								id="valuation-category"
								value={category}
								onChange={(event) => setCategory(event.target.value)}
								className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
							>
								{categories.map((item) => <option key={item} value={item}>{item}</option>)}
							</select>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] text-left text-sm">
							<thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-5 py-3 font-medium">Product</th>
									<th className="px-5 py-3 font-medium">Category</th>
									<th className="px-5 py-3 text-right font-medium">Quantity</th>
									<th className="px-5 py-3 text-right font-medium">Unit cost</th>
									<th className="px-5 py-3 text-right font-medium">
										<button type="button" onClick={() => setSortByValue((value) => !value)} className="ml-auto inline-flex items-center gap-1 hover:text-slate-900">
											Total value <span aria-hidden="true">↕</span>
										</button>
									</th>
									<th className="px-5 py-3 text-right font-medium">Change</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{filtered.map((item) => (
									<tr key={item.id} className="transition hover:bg-slate-50">
										<td className="px-5 py-4">
											<div className="font-medium text-slate-900">{item.name}</div>
											<div className="mt-1 text-xs text-slate-500">SKU: {item.sku}</div>
										</td>
										<td className="px-5 py-4 text-slate-600">{item.category}</td>
										<td className="px-5 py-4 text-right tabular-nums">{item.quantity.toLocaleString()}</td>
										<td className="px-5 py-4 text-right tabular-nums">{money(item.unitCost, currency)}</td>
										<td className="px-5 py-4 text-right font-medium tabular-nums">{money(item.value, currency)}</td>
										<td className="px-5 py-4 text-right">
											<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.change > 0 ? 'bg-emerald-50 text-emerald-700' : item.change < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
												{item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
											</span>
										</td>
									</tr>
								))}
								{filtered.length === 0 && (
									<tr>
										<td colSpan={6} className="px-5 py-12 text-center text-slate-500">No products match your search.</td>
									</tr>
								)}
							</tbody>
							<tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
								<tr>
									<td colSpan={2} className="px-5 py-4">Filtered total</td>
									<td className="px-5 py-4 text-right tabular-nums">{filtered.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()}</td>
									<td className="px-5 py-4" />
									<td className="px-5 py-4 text-right tabular-nums">{money(filtered.reduce((sum, item) => sum + item.value, 0), currency)}</td>
									<td className="px-5 py-4" />
								</tr>
							</tfoot>
						</table>
					</div>
					<div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
						Values are calculated from the recorded unit cost and quantity on hand.
					</div>
				</section>
			</div>
		</main>
	);
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
	return (
		<article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<p className="text-sm font-medium text-slate-500">{label}</p>
			<p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
			<p className="mt-1 text-xs text-slate-400">{note}</p>
		</article>
	);
}
