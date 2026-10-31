import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { WorkflowBuilder, WorkflowList, type Workflow } from '@/components/automation/workflow-builder';
import Heading from '@/components/heading';

interface Props {
    workflows: Workflow[];
}

export default function WorkflowsIndex({ workflows }: Props) {
    return (
        <AppLayout>
            <Head title="Workflows" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-4">
                    <Heading
                        title="Automation workflows"
                        description="Trigger actions when leads change status, go idle, or match other rules."
                    />
                    <WorkflowBuilder />
                </div>
                {workflows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No workflows yet. Create one to automate lead handling.
                    </p>
                ) : (
                    <WorkflowList workflows={workflows} />
                )}
            </div>
        </AppLayout>
    );
}
