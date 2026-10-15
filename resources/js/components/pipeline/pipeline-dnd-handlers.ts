import api from "@/lib/axios";

type ToastOpts = { title: string; description?: string; variant?: 'default' | 'destructive' };

const showToast = (opts: ToastOpts) => {
    try {
        // prefer a global toast helper if available
        const g = (globalThis as any) || window as any;
        if (g?.toast && typeof g.toast === 'function') {
            g.toast(opts);
            return;
        }
    } catch { }

    // fallback to alert for visibility during dev
    if (opts.variant === 'destructive') {
        alert(`${opts.title}\n${opts.description ?? ''}`);
    } else {
        // non-blocking console log for success/info
        console.info(opts.title, opts.description ?? '');
    }
};

export const handleDragEnd = ({ event, columns, setColumns }: any) => {
    const { active, over } = event;
    if (!over) return;


    const activeId = active.id;
    const overId = over.id;


    if (activeId === overId) return;


    const source = columns.find((col: any) => col.leads.some((l: any) => l.id === activeId));
    const destination = columns.find((col: any) => col.leads.some((l: any) => l.id === overId));


    if (!source || !destination) return;


    const sourceIndex = source.leads.findIndex((l: any) => l.id === activeId);
    const destinationIndex = destination.leads.findIndex((l: any) => l.id === overId);


    const newColumns = [...columns];


    // remove from source
    const [moved] = source.leads.splice(sourceIndex, 1);


    // add to destination using arrayMove for sorted placement
    destination.leads.splice(destinationIndex, 0, moved);


    // keep a shallow clone for possible rollback
    const prevColumns = JSON.parse(JSON.stringify(columns));

    setColumns(newColumns);

    // POST update to server (optimistic, will rollback on failure)
    (async () => {
        try {
            const { data, status } = await api.put(`/leads/${activeId}/move`, {
                stage_id: destination.id  // Match backend expectation
            }, { withCredentials: true });


            if (status >= 200 && status < 300) {
                showToast({ title: 'Moved', description: 'Item moved successfully' });
                // optionally reconcile server response if it contains canonical ordering
                if (data?.stages) {
                    // Expect server to return updated structure; caller may refresh
                }
                return;
            }

            console.error('Failed to move pipeline item', status, data);
            showToast({ title: 'Move failed', description: String(data ?? status), variant: 'destructive' });
            setColumns(prevColumns);
        } catch (err: any) {
            console.error('Error moving pipeline item:', err);
            showToast({ title: 'Move error', description: err?.message ?? String(err), variant: 'destructive' });
            setColumns(prevColumns);
        }
    })();
};