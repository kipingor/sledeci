<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Workflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Backend for the automation workflow builder component.
 *
 * The builder posts `trigger` and `actions` as JSON strings; they are decoded
 * here into the model's trigger_type / trigger_conditions / actions columns.
 */
class WorkflowController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Workflow::class);

        $workflow = Workflow::create([
            ...$this->payload($request),
            'user_id' => $request->user()->id,
        ]);

        return back()->with('success', "Workflow \"{$workflow->name}\" created.");
    }

    public function update(Request $request, Workflow $workflow): RedirectResponse
    {
        $this->authorize('update', $workflow);

        $workflow->update($this->payload($request));

        return back()->with('success', "Workflow \"{$workflow->name}\" updated.");
    }

    public function toggle(Request $request, Workflow $workflow): RedirectResponse
    {
        $this->authorize('update', $workflow);

        $workflow->update(['enabled' => $request->boolean('enabled', ! $workflow->enabled)]);

        return back()->with('success', $workflow->enabled ? 'Workflow enabled.' : 'Workflow disabled.');
    }

    public function destroy(Workflow $workflow): RedirectResponse
    {
        $this->authorize('delete', $workflow);

        $workflow->delete();

        return back()->with('success', 'Workflow deleted.');
    }

    /**
     * @return array{name: string, description: ?string, enabled: bool, trigger_type: string, trigger_conditions: array, actions: array}
     */
    private function payload(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'enabled' => ['sometimes', 'boolean'],
            'trigger' => ['required'],
            'actions' => ['required'],
        ]);

        $trigger = $this->decode($data['trigger']);
        $actions = $this->decode($data['actions']);

        validator(
            ['trigger' => $trigger, 'actions' => $actions],
            [
                'trigger' => ['required', 'array'],
                'trigger.type' => ['required', 'string', 'max:100'],
                'trigger.conditions' => ['nullable', 'array'],
                'actions' => ['required', 'array', 'min:1'],
            ]
        )->validate();

        return [
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'enabled' => (bool) ($data['enabled'] ?? true),
            'trigger_type' => $trigger['type'],
            'trigger_conditions' => $trigger['conditions'] ?? [],
            'actions' => array_values($actions),
        ];
    }

    private function decode(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = is_string($value) ? json_decode($value, true) : null;

        return is_array($decoded) ? $decoded : [];
    }
}
