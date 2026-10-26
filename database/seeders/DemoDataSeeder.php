<?php

namespace Database\Seeders;

use App\Models\Lead;
use App\Models\Milestone;
use App\Models\Opportunity;
use App\Models\PipelineStage;
use App\Models\Project;
use App\Models\ProjectTeamMember;
use App\Models\Supplier;
use App\Models\Task;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Sledeci\Accounting\Models\Expense;
use Sledeci\Accounting\Models\Invoice;
use Sledeci\Accounting\Models\Payment;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminUser = User::where('id', 1)->first();
        if (! $adminUser) {
            $adminUser = User::factory()->create([
                'name' => 'Antony Kipingor',
                'email' => 'kipingor@gmail.com',
                'password' => Hash::make('deadenman80'),
            ]);
        }

        // ── 2. Supporting users ────────────────────────────────────────────────
        $users = User::factory(10)->create();

        foreach ($users as $user) {
            $user->assignRole(fake()->randomElement(['human resource', 'manager', 'accountant', 'viewer', 'project manager', 'auditor', 'sales', 'finance']));
        }

        $allUsers = $users->push($adminUser); // include admin in pool

        // ── 3. Pipeline stages ─────────────────────────────────────────────────
        $pipelineStages = PipelineStage::get();
        if ($pipelineStages->isEmpty()) {
            $this->call(PipelineStageSeeder::class);
            $pipelineStages = PipelineStage::get();
        }

        // ── Helpers ────────────────────────────────────────────────────────────
        $yearStart = Carbon::create(now()->year, 1, 1);
        $now = now();
        $randomDate = fn () => Carbon::parse(fake()->dateTimeBetween($yearStart, $now));

        // Pre-compute eligible users for lead assignment to avoid repeated filtering.
        // BUG FIX #1: The original code called $allUsers->with('roles')->get()->filter(...)
        // inside the factory loop. Eloquent Collection does NOT have a with() method —
        // only Builder does. This threw: BadMethodCallException: Call to undefined method
        // Illuminate\Database\Eloquent\Collection::with()
        //
        // Fix: filter the in-memory collection directly using hasRole(), which Spatie
        // resolves via its cached role lookup (roles were already assigned above).
        $eligibleUsers = $allUsers->filter(
            fn ($user) => $user->hasRole(['admin', 'manager', 'sales', 'project manager'])
        );

        // Fallback: if no eligible users somehow, use the full pool.
        if ($eligibleUsers->isEmpty()) {
            $eligibleUsers = $allUsers;
        }

        // ── 4. Leads → Opportunities ───────────────────────────────────────────
        Lead::factory(20)->make()->each(function ($lead) use ($eligibleUsers, $pipelineStages, $randomDate) {
            $lead->created_by = $eligibleUsers->random()->id;
            $lead->owner_id = $eligibleUsers->random()->id;
            $lead->pipeline_stage_id = $pipelineStages->random()->id;
            $lead->created_at = $randomDate();
            $lead->updated_at = $lead->created_at;
            $lead->save();

            // 40 % become opportunities
            if (rand(1, 100) <= 40) {
                Opportunity::factory()->create([
                    'lead_id' => $lead->id,
                    'owner_id' => $lead->owner_id,
                    'created_at' => $randomDate(),
                ]);
            }
        });

        // ── 5. Projects ────────────────────────────────────────────────────────
        Opportunity::all()->each(function (Opportunity $opp) use ($randomDate, $allUsers) {

            // Decide project lifecycle state FIRST so tasks are seeded consistently:
            //   20 % completed  → all tasks done
            //   10 % on_hold    → tasks mostly todo / in_progress, none done
            //   10 % cancelled  → no tasks created
            //   60 % active     → mixed in_progress / review / todo tasks
            $roll = rand(1, 100);
            $lifecycle = match (true) {
                $roll <= 20 => 'completed',
                $roll <= 30 => 'on_hold',
                $roll <= 40 => 'cancelled',
                default => 'active',
            };

            // Create project with matching factory state
            $projectFactory = match ($lifecycle) {
                'completed' => Project::factory()->completed(),
                'on_hold' => Project::factory()->onHold(),
                'cancelled' => Project::factory()->cancelled(),
                default => Project::factory(),
            };

            $project = $projectFactory->create([
                'opportunity_id' => $opp->id,
                'client_id' => $opp->lead?->owner_id ?? $allUsers->random()->id,
                'owner_id' => $opp->owner_id,
                'created_at' => $randomDate(),
            ]);

            // ── No tasks for cancelled projects ───────────────────────────────
            if ($lifecycle === 'cancelled') {
                return;
            }

            // ── Milestones ────────────────────────────────────────────────────
            $milestoneCount = rand(2, 5);
            $milestones = Milestone::factory($milestoneCount)->create([
                'project_id' => $project->id,
                'created_at' => $randomDate(),
                'status' => $lifecycle === 'completed' ? 'achieved' : 'pending',
            ]);

            // ── Tasks — status must match project lifecycle ───────────────────
            $taskCount = rand(6, 14);

            $tasks = Task::factory($taskCount)
                ->when($lifecycle === 'completed', fn ($f) => $f->done())
                ->when($lifecycle === 'on_hold', fn ($f) => $f->pending())
                ->when($lifecycle === 'active', fn ($f) => $f->inProgress())
                ->create([
                    'project_id' => $project->id,
                    'created_at' => $randomDate(),
                ]);

            // For completed projects, ensure ALL tasks have status='done'
            if ($lifecycle === 'completed') {
                $tasks->each(fn ($t) => $t->status !== 'done' && $t->update(['status' => 'done', 'completed_at' => $randomDate()]));
            }

            // Assign WBS codes to top-level tasks (1.0, 2.0, …)
            // NOTE: wbs_code and sort_order must be in Task::$fillable for this to persist.
            // See the companion fix in app/Models/Task.php.
            $tasks->values()->each(function ($task, $index) {
                $task->update(['wbs_code' => ($index + 1).'.0', 'sort_order' => $index]);
            });

            // Assign tasks to milestones + create time logs
            $tasks->each(function ($task) use ($milestones, $randomDate) {
                if (rand(0, 1)) {
                    $task->update(['milestone_id' => $milestones->random()->id]);
                }
                TimeLog::factory(rand(1, 4))->create([
                    'task_id' => $task->id,
                    'user_id' => $task->assigned_to ?? null,
                    'project_id' => $task->project_id,
                    'started_at' => $randomDate(), ]);
            });

            // ── Team members ──────────────────────────────────────────────────
            $teamSize = rand(2, 5);
            $assignedUserIds = collect([$project->owner_id]);

            $allUsers->shuffle()->take($teamSize + 2)->each(function ($u) use ($project, &$assignedUserIds, $teamSize) {
                if ($assignedUserIds->count() > $teamSize) {
                    return;
                }
                if ($assignedUserIds->contains($u->id)) {
                    return;
                }
                ProjectTeamMember::create([
                    'project_id' => $project->id,
                    'user_id' => $u->id,
                    'role' => fake()->randomElement(['developer', 'designer', 'analyst', 'tester', 'manager']),
                    'allocation_percentage' => fake()->randomElement([25, 50, 75, 100]),
                    'joined_at' => now()->subDays(rand(10, 90)),
                ]);
                $assignedUserIds->push($u->id);
            });

            // ── Invoices & Payments ───────────────────────────────────────────
            $invoiceCount = $lifecycle === 'completed' ? rand(2, 4) : rand(1, 2);
            $invoices = Invoice::factory($invoiceCount)->make([
                'project_id' => $project->id,
                'client_id' => $project->client_id,
                'created_at' => $randomDate(),
                'due_date' => $randomDate()->addDays(rand(7, 45)),
            ])->each(function ($invoice) {
                // The Invoice model has 'lines' => 'array' cast — Eloquent handles
                // json_encode automatically. Do NOT manually encode here.
                $invoice->save();
            });

            // For completed projects most invoices should be paid
            $invoices->each(function ($invoice) use ($randomDate, $lifecycle) {
                $paymentCount = $lifecycle === 'completed' ? rand(1, 2) : rand(0, 1);
                $totalPaid = 0;
                $invoiceTotal = $invoice->total; // Assuming Invoice has a 'total' attribute

                for ($i = 0; $i < $paymentCount; $i++) {
                    $remaining = $invoiceTotal - $totalPaid;
                    if ($remaining <= 0) {
                        break;
                    }

                    // Generate a payment amount that doesn't exceed remaining
                    $amount = min(fake()->randomFloat(2, 10, $remaining), $remaining);

                    Payment::factory()->create([
                        'invoice_id' => $invoice->id,
                        'amount' => $amount,
                        'paid_at' => $randomDate(),
                    ]);

                    $totalPaid += $amount;
                }

                // After creating payments, check if fully paid
                if ($totalPaid >= $invoiceTotal) {
                    $invoice->update(['status' => 'paid']);
                }
            });

            // ── Expenses ──────────────────────────────────────────────────────
            Expense::factory(rand(2, 6))->make([
                'project_id' => $project->id,
                'incurred_at' => $randomDate(),
            ])->each(function ($expense) {
                // The Expense model has 'lines' => 'array' cast — Eloquent handles
                // json_encode automatically. Do NOT manually encode here.
                $expense->save();
            });
        });

        // ── 6. Standalone suppliers ────────────────────────────────────────────
        // BUG FIX #2: The previous comment claimed Supplier had no array casts,
        // but Supplier::$casts includes 'contact_info' => 'array', 'products' => 'array',
        // and 'metadata' => 'array'. Manually calling json_encode() before save()
        // caused double-encoding: Eloquent re-encodes what is already a JSON string,
        // storing it as an escaped string inside a string. The frontend then receives
        // a string instead of an array/object.
        //
        // Fix: let Eloquent's cast handle encoding — call save() directly.
        Supplier::factory(8)->create();
    }
}
