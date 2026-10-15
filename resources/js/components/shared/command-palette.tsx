import { useEffect, useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Plus,
  Search,
  FileText,
  Users,
  Target,
  BarChart3,
  Settings,
  Home,
  Inbox,
  Archive,
  Trash2,
  Calendar,
  CheckSquare,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface CommandPaletteProps {
  recentLeads?: Array<{ id: number; title: string }>;
  recentProjects?: Array<{ id: number; title: string }>;
}

export function CommandPalette({ recentLeads = [], recentProjects = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

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

  const navigate = useCallback((path: string) => {
    setOpen(false);
    router.visit(path);
  }, []);

  const runAction = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  // Navigation items
  const navigationItems = [
    {
      icon: Home,
      label: 'Dashboard',
      shortcut: '⌘D',
      action: () => navigate('/dashboard'),
    },
    {
      icon: FileText,
      label: 'Leads',
      shortcut: '⌘L',
      action: () => navigate('/leads'),
    },
    {
      icon: Target,
      label: 'Pipeline',
      shortcut: '⌘P',
      action: () => navigate('/leads/pipeline'),
    },
    {
      icon: Users,
      label: 'Projects',
      shortcut: '⌘R',
      action: () => navigate('/projects'),
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      shortcut: '⌘A',
      action: () => navigate('/analytics'),
    },
    {
      icon: Settings,
      label: 'Settings',
      shortcut: '⌘,',
      action: () => navigate('/settings'),
    },
  ];

  // Create actions
  const createActions = [
    {
      icon: Plus,
      label: 'New Lead',
      shortcut: '⌘N',
      action: () => navigate('/leads/create'),
    },
    {
      icon: Plus,
      label: 'New Project',
      action: () => navigate('/projects/create'),
    },
    {
      icon: Plus,
      label: 'New Task',
      action: () => navigate('/tasks/create'),
    },
    {
      icon: Plus,
      label: 'New Opportunity',
      action: () => navigate('/opportunities/create'),
    },
  ];

  // Quick actions
  const quickActions = [
    {
      icon: Search,
      label: 'Search Leads',
      action: () => navigate('/leads?focus=search'),
    },
    {
      icon: Archive,
      label: 'View Archived',
      action: () => navigate('/leads?status=archived'),
    },
    {
      icon: CheckSquare,
      label: 'My Tasks',
      action: () => navigate('/tasks?assignee=me'),
    },
    {
      icon: Calendar,
      label: 'My Calendar',
      action: () => navigate('/calendar'),
    },
    {
      icon: Mail,
      label: 'Email Inbox',
      action: () => navigate('/emails'),
    },
    {
      icon: DollarSign,
      label: 'Revenue Report',
      action: () => navigate('/analytics/revenue'),
    },
  ];

  return (
    <>
      {/* Trigger Button (Optional - can be placed in navbar) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Quick search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-300 bg-white px-1.5 font-mono text-xs text-gray-600">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Navigate">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => item.action()}
                className="flex items-center gap-3"
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-300 bg-gray-100 px-1.5 font-mono text-xs text-gray-600">
                    {item.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Create Actions */}
          <CommandGroup heading="Create">
            {createActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => item.action()}
                className="flex items-center gap-3"
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-300 bg-gray-100 px-1.5 font-mono text-xs text-gray-600">
                    {item.shortcut}
                  </kbd>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Recent Leads */}
          {recentLeads.length > 0 && (
            <>
              <CommandGroup heading="Recent Leads">
                {recentLeads.slice(0, 5).map((lead) => (
                  <CommandItem
                    key={lead.id}
                    onSelect={() => navigate(`/leads/${lead.id}`)}
                    className="flex items-center gap-3"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{lead.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <>
              <CommandGroup heading="Recent Projects">
                {recentProjects.slice(0, 5).map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-3"
                  >
                    <Users className="h-4 w-4" />
                    <span>{project.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => item.action()}
                className="flex items-center gap-3"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Hook to use command palette programmatically
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

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

  return { open, setOpen };
}