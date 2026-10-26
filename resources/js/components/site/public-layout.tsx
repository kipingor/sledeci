import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { about, contact, home, login, register, solutions, terms } from '@/routes';
import * as careers from '@/routes/careers';
import { dashboard } from '@/routes/web';
import type { SharedData } from '@/types';

/**
 * Chrome shared by every public page: header, navigation and footer.
 * The authenticated app uses AppLayout instead.
 */
export default function PublicLayout({ children, canRegister = true }: { children: ReactNode; canRegister?: boolean }) {
    const { auth, name } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    useFlashToast();

    const nav = [
        { label: 'Solutions', href: solutions().url },
        { label: 'About', href: about().url },
        { label: 'Careers', href: careers.index().url },
        { label: 'Contact', href: contact().url },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link href={home().url} className="flex items-center gap-2 font-semibold">
                        <AppLogoIcon className="h-7 w-7 fill-current text-primary" />
                        <span className="text-lg tracking-tight">{name}</span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
                        {nav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-2 md:flex">
                        {auth?.user ? (
                            <Button asChild size="sm">
                                <Link href={dashboard().url}>Dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={login().url}>Log in</Link>
                                </Button>
                                {canRegister && (
                                    <Button asChild size="sm">
                                        <Link href={register().url}>Get started</Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted md:hidden"
                        onClick={() => setOpen((o) => !o)}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                    >
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {open && (
                    <div className="border-t border-border bg-background px-4 py-3 md:hidden">
                        <nav className="flex flex-col gap-1" aria-label="Mobile">
                            {nav.map((item) => (
                                <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                                    {item.label}
                                </Link>
                            ))}
                            <Link href={auth?.user ? dashboard().url : login().url} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                                {auth?.user ? 'Dashboard' : 'Log in'}
                            </Link>
                        </nav>
                    </div>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-border bg-muted/30">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p>
                        &copy; {new Date().getFullYear()} {name}. All rights reserved.
                    </p>
                    <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
                        <Link href={solutions().url} className="hover:text-foreground">
                            Solutions
                        </Link>
                        <Link href={careers.index().url} className="hover:text-foreground">
                            Careers
                        </Link>
                        <Link href={contact().url} className="hover:text-foreground">
                            Contact
                        </Link>
                        <Link href={terms().url} className="hover:text-foreground">
                            Terms &amp; Conditions
                        </Link>
                    </nav>
                </div>
            </footer>
        </div>
    );
}
