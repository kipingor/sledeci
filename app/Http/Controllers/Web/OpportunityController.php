<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OpportunityController extends Controller
{
    public function index(Request $request)
    {
        // The opportunities/index page only renders <OpportunityKanban /> which
        // fetches its own data via GET /api/v1/opportunities/kanban.
        // No server-side props needed here.
        return Inertia::render('opportunities/index');
    }

    public function show(Request $request, Opportunity $opportunity)
    {
        $opportunity->load(['lead:id,title', 'owner:id,name,avatar', 'project:id,name']);

        return Inertia::render('opportunities/show', ['opportunity' => $opportunity]);
    }

    public function create()
    {
        return Inertia::render('opportunities/create', $this->formOptions());
    }

    public function edit(Opportunity $opportunity)
    {
        return Inertia::render('opportunities/edit', array_merge(
            ['opportunity' => $opportunity->load('lead:id,title', 'owner:id,name')],
            $this->formOptions()
        ));
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        $data['owner_id'] ??= Auth::id();
        $opportunity = Opportunity::create($data);
        session()->flash('success', 'Opportunity created successfully.');

        return redirect()->route('web.opportunities.show', $opportunity);
    }

    public function update(Request $request, Opportunity $opportunity)
    {
        $opportunity->update($request->validate($this->rules($opportunity->id)));
        session()->flash('success', 'Opportunity updated successfully.');

        return redirect()->route('web.opportunities.show', $opportunity);
    }

    public function destroy(Opportunity $opportunity)
    {
        $opportunity->delete();
        session()->flash('success', 'Opportunity deleted.');

        return redirect()->route('web.opportunities.index');
    }

    private function formOptions(): array
    {
        return [
            'leads' => Lead::select('id', 'title')->orderByDesc('created_at')->limit(100)->get(),
            'owners' => User::select('id', 'name')->orderBy('name')->get(),
            'stageOptions' => Opportunity::STAGES,
            'currencyOptions' => ['USD', 'EUR', 'GBP', 'KES'],
        ];
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            'lead_id' => ['nullable', 'exists:leads,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'stage' => ['nullable', Rule::in(Opportunity::STAGES)],
            'expected_close_date' => ['nullable', 'date'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'owner_id' => ['nullable', 'exists:users,id'],
            'currency' => ['nullable', 'string', 'max:10'],
        ];
    }
}
