import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { router } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, Plus, Target, Briefcase } from 'lucide-react';
import { useEffect, useState } from 'react';

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const { data: results, isLoading } = useQuery({
        queryKey: ['global-search', query],
        queryFn: async () => {
            const response = await axios.get('/api/v1/search', {
                params: { q: query },
            });
            return response.data;
        },
        enabled: query.length > 2,
    });

    // Cmd+K to open
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSelect = (href: string) => {
        setOpen(false);
        router.visit(href);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Search leads, opportunities, projects..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {isLoading && query.length > 2 && (
                    <div className="py-6 text-center text-sm">Searching...</div>
                )}

                {!isLoading && query.length > 2 && results?.total === 0 && (
                    <CommandEmpty>No results found.</CommandEmpty>
                )}

                {results?.leads && results.leads.length > 0 && (
                    <CommandGroup heading="Leads">
                        {results.leads.map((lead: any) => (
                            <CommandItem
                                key={lead.id}
                                value={`lead-${lead.id}`}
                                onSelect={() => handleSelect(`/leads/${lead.id}`)}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>{lead.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results?.opportunities && results.opportunities.length > 0 && (
                    <CommandGroup heading="Opportunities">
                        {results.opportunities.map((opp: any) => (
                            <CommandItem
                                key={opp.id}
                                value={`opportunity-${opp.id}`}
                                onSelect={() =>
                                    handleSelect(`/opportunities/${opp.id}`)
                                }
                            >
                                <Target className="mr-2 h-4 w-4" />
                                <span>{opp.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results?.projects && results.projects.length > 0 && (
                    <CommandGroup heading="Projects">
                        {results.projects.map((project: any) => (
                            <CommandItem
                                key={project.id}
                                value={`project-${project.id}`}
                                onSelect={() =>
                                    handleSelect(`/projects/${project.id}`)
                                }
                            >
                                <Briefcase className="mr-2 h-4 w-4" />
                                <span>{project.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {(!query || query.length <= 2) && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Quick Actions">
                            <CommandItem
                                onSelect={() => handleSelect('/leads/create')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Create Lead</span>
                            </CommandItem>
                            <CommandItem
                                onSelect={() => handleSelect('/opportunities/create')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Create Opportunity</span>
                            </CommandItem>
                            <CommandItem
                                onSelect={() => handleSelect('/projects/create')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Create Project</span>
                            </CommandItem>
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}