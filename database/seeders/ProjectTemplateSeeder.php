<?php

namespace Database\Seeders;

use App\Models\ProjectTemplate;
use App\Models\ProjectTemplateTask;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::first();
        
        if (!$admin) {
            $this->command->warn('No users found. Please create a user first.');
            return;
        }

        // Software Implementation Template
        $template = ProjectTemplate::create([
            'created_by' => $admin->id,
            'name' => 'Software Implementation Project',
            'description' => 'Standard software development and implementation workflow',
            'is_active' => true,
            'is_default' => true,
            'estimated_duration_days' => 45,
        ]);

        $tasks = [
            [
                'title' => 'Kickoff Meeting',
                'description' => 'Initial meeting with client to discuss project scope and timeline',
                'order' => 1,
                'start_day_offset' => 0,
                'duration_days' => 1,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Schedule meeting with all stakeholders',
                    'Prepare project overview presentation',
                    'Discuss timeline and milestones',
                    'Set communication protocols',
                ],
            ],
            [
                'title' => 'Requirements Gathering',
                'description' => 'Document all functional and technical requirements',
                'order' => 2,
                'start_day_offset' => 2,
                'duration_days' => 5,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Conduct stakeholder interviews',
                    'Document functional requirements',
                    'Document technical requirements',
                    'Get sign-off on requirements',
                ],
            ],
            [
                'title' => 'Design Phase',
                'description' => 'Create mockups, wireframes, and system architecture',
                'order' => 3,
                'start_day_offset' => 7,
                'duration_days' => 7,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Create wireframes',
                    'Design UI/UX mockups',
                    'Define system architecture',
                    'Client review and approval',
                ],
            ],
            [
                'title' => 'Development Sprint 1',
                'description' => 'Build core features and functionality',
                'order' => 4,
                'start_day_offset' => 14,
                'duration_days' => 10,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Set up development environment',
                    'Implement core features',
                    'Code review',
                    'Unit testing',
                ],
            ],
            [
                'title' => 'Development Sprint 2',
                'description' => 'Build additional features and integrations',
                'order' => 5,
                'start_day_offset' => 24,
                'duration_days' => 10,
                'priority' => 'medium',
                'status' => 'todo',
                'checklist' => [
                    'Implement remaining features',
                    'API integrations',
                    'Code review',
                    'Integration testing',
                ],
            ],
            [
                'title' => 'Testing & QA',
                'description' => 'Comprehensive testing and bug fixes',
                'order' => 6,
                'start_day_offset' => 34,
                'duration_days' => 5,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Functional testing',
                    'Performance testing',
                    'Security testing',
                    'Bug fixes',
                    'UAT preparation',
                ],
            ],
            [
                'title' => 'User Acceptance Testing',
                'description' => 'Client testing and feedback',
                'order' => 7,
                'start_day_offset' => 39,
                'duration_days' => 3,
                'priority' => 'high',
                'status' => 'todo',
                'checklist' => [
                    'Prepare UAT environment',
                    'Client testing',
                    'Gather feedback',
                    'Fix critical issues',
                ],
            ],
            [
                'title' => 'Deployment',
                'description' => 'Deploy to production environment',
                'order' => 8,
                'start_day_offset' => 42,
                'duration_days' => 1,
                'priority' => 'critical',
                'status' => 'todo',
                'checklist' => [
                    'Final code review',
                    'Production deployment',
                    'Smoke testing',
                    'Monitor for issues',
                ],
            ],
            [
                'title' => 'Training & Documentation',
                'description' => 'Train client team and provide documentation',
                'order' => 9,
                'start_day_offset' => 43,
                'duration_days' => 2,
                'priority' => 'medium',
                'status' => 'todo',
                'checklist' => [
                    'Prepare training materials',
                    'Conduct training sessions',
                    'Provide user documentation',
                    'Provide technical documentation',
                ],
            ],
            [
                'title' => 'Project Closure',
                'description' => 'Final review and handoff',
                'order' => 10,
                'start_day_offset' => 45,
                'duration_days' => 1,
                'priority' => 'low',
                'status' => 'todo',
                'checklist' => [
                    'Client sign-off',
                    'Knowledge transfer',
                    'Archive project files',
                    'Post-project review',
                ],
            ],
        ];

        foreach ($tasks as $taskData) {
            $template->tasks()->create($taskData);
        }

        $this->command->info('Default project template created successfully!');
        
        // Consulting Engagement Template
        $consultingTemplate = ProjectTemplate::create([
            'created_by' => $admin->id,
            'name' => 'Consulting Engagement',
            'description' => 'Standard consulting project workflow',
            'is_active' => true,
            'is_default' => false,
            'estimated_duration_days' => 30,
        ]);

        $consultingTasks = [
            [
                'title' => 'Discovery Call',
                'description' => 'Initial consultation to understand client needs',
                'order' => 1,
                'start_day_offset' => 0,
                'duration_days' => 1,
                'priority' => 'high',
                'status' => 'todo',
            ],
            [
                'title' => 'Assessment & Analysis',
                'description' => 'Analyze current situation and identify opportunities',
                'order' => 2,
                'start_day_offset' => 2,
                'duration_days' => 7,
                'priority' => 'high',
                'status' => 'todo',
            ],
            [
                'title' => 'Strategy Development',
                'description' => 'Develop strategic recommendations',
                'order' => 3,
                'start_day_offset' => 9,
                'duration_days' => 10,
                'priority' => 'high',
                'status' => 'todo',
            ],
            [
                'title' => 'Presentation & Review',
                'description' => 'Present findings and recommendations to client',
                'order' => 4,
                'start_day_offset' => 19,
                'duration_days' => 2,
                'priority' => 'high',
                'status' => 'todo',
            ],
            [
                'title' => 'Implementation Support',
                'description' => 'Support client in implementing recommendations',
                'order' => 5,
                'start_day_offset' => 21,
                'duration_days' => 7,
                'priority' => 'medium',
                'status' => 'todo',
            ],
            [
                'title' => 'Follow-up & Closure',
                'description' => 'Final check-in and project closure',
                'order' => 6,
                'start_day_offset' => 28,
                'duration_days' => 2,
                'priority' => 'low',
                'status' => 'todo',
            ],
        ];

        foreach ($consultingTasks as $taskData) {
            $consultingTemplate->tasks()->create($taskData);
        }

        $this->command->info('Consulting template created successfully!');
    }
}
