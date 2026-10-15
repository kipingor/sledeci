import AppLayout from "@/layouts/app-layout";
import { Head, usePage, useForm } from "@inertiajs/react";
import { type BreadcrumbItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ChevronRight, Save } from "lucide-react";

export default function SupplierEdit({ supplier }: { supplier?: any }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Suppliers", href: "/suppliers" },
        { title: supplier ? `Edit ${supplier.name}` : "New Supplier", href: "#" },
    ];
    const { data, setData, post, put, processing, errors } = useForm({ name: supplier?.name ?? "", email: supplier?.email ?? "", phone: supplier?.phone ?? "" });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (supplier?.id) put(`/suppliers/${supplier.id}`);
        else post("/suppliers");
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={supplier ? `Edit ${data.name}` : "New Supplier"} />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/suppliers" className="text-muted-foreground hover:text-foreground">Suppliers</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">{supplier ? `Edit ${supplier.name}` : "New Supplier"}</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
                    <h1 className="text-xl font-bold tracking-tight">{supplier ? `Edit ${data.name}` : "New Supplier"}</h1>
                </div>
            </div>
            <form onSubmit={submit} className="p-6 max-w-lg space-y-5">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    {[["name","Name","Supplier name"],["email","Email","contact@supplier.com"],["phone","Phone","+254 700 000 000"]].map(([k,l,p]) => (
                        <div key={k} className="space-y-1.5">
                            <Label htmlFor={k} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</Label>
                            <Input id={k} placeholder={p} value={(data as any)[k]} onChange={e => setData(k as any, e.target.value)} type={k === "email" ? "email" : "text"} />
                            {(errors as any)[k] && <p className="text-xs text-destructive">{(errors as any)[k]}</p>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <Button type="submit" disabled={processing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="h-4 w-4" />{processing ? "Saving…" : supplier ? "Update Supplier" : "Create Supplier"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
                </div>
            </form>
        </AppLayout>
    );
}