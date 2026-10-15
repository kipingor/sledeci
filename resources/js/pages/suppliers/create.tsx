import AppLayout from "@/layouts/app-layout";
import { Head, router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, ChevronRight, Save } from "lucide-react";
import { useState } from "react";
import { type BreadcrumbItem } from "@/types";

const breadcrumbs: BreadcrumbItem[] = [{ title: "Suppliers", href: "/suppliers" }, { title: "Add Supplier", href: "/suppliers/create" }];

function Field({ label, required, error, children }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function SupplierCreate() {
    const [form, setForm] = useState({ name:"",email:"",phone:"",address:"",website:"",contact_person:"",payment_terms:"",category:"",notes:"",rating:"" });
    const [errors, setErrors] = useState<Record<string,string>>({});
    const [saving, setSaving] = useState(false);
    const s = (f: any) => setForm(prev => ({ ...prev, ...f }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Supplier" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/suppliers" className="text-muted-foreground hover:text-foreground">Suppliers</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Add Supplier</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">Add Supplier</h1>
                </div>
            </div>
            <div className="p-6 max-w-2xl space-y-5">
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30"><p className="text-sm font-semibold">Supplier Details</p></div>
                    <div className="p-5 grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <Field label="Company Name" required error={errors.name}>
                                <Input value={form.name} onChange={e => s({ name: e.target.value })} placeholder="Acme Technologies Ltd" autoFocus />
                            </Field>
                        </div>
                        <Field label="Contact Person"><Input value={form.contact_person} onChange={e => s({ contact_person: e.target.value })} placeholder="John Smith" /></Field>
                        <Field label="Category"><Input value={form.category} onChange={e => s({ category: e.target.value })} placeholder="IT, Hardware, Services…" /></Field>
                        <Field label="Email"><Input type="email" value={form.email} onChange={e => s({ email: e.target.value })} placeholder="sales@acme.com" /></Field>
                        <Field label="Phone"><Input value={form.phone} onChange={e => s({ phone: e.target.value })} placeholder="+254 700 000 000" /></Field>
                        <Field label="Website"><Input type="url" value={form.website} onChange={e => s({ website: e.target.value })} placeholder="https://acme.com" /></Field>
                        <Field label="Payment Terms"><Input value={form.payment_terms} onChange={e => s({ payment_terms: e.target.value })} placeholder="Net 30, COD…" /></Field>
                        <div className="sm:col-span-2">
                            <Field label="Address">
                                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.address} onChange={e => s({ address: e.target.value })} />
                            </Field>
                        </div>
                        <div className="sm:col-span-2">
                            <Field label="Notes">
                                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring" value={form.notes} onChange={e => s({ notes: e.target.value })} />
                            </Field>
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 -mx-6 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => history.back()}>Cancel</Button>
                    <Button onClick={() => { setSaving(true); router.post("/suppliers", form, { onError: e => { setErrors(e); setSaving(false); }, onSuccess: () => setSaving(false) }); }} disabled={saving || !form.name} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="h-4 w-4" />{saving ? "Saving…" : "Add Supplier"}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}