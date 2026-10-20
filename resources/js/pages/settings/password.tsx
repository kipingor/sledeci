/**
 * settings/password.tsx — Amber Obsidian
 * Content is unchanged — just works with the new SettingsLayout which
 * now renders the SF left-nav sidebar instead of plain buttons.
 * The only styling change is inside SettingsLayout itself (already delivered).
 */
import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/user-password';
import { Lock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Password settings', href: edit().url }];

export default function Password() {
    const passwordInput        = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />
            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Update Password</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Use a long, random password to keep your account secure
                            </p>
                        </div>
                    </div>

                    <Form
                        action="/settings/password"
                        method="put"
                        options={{ preserveScroll: true }}
                        resetOnError={['password', 'password_confirmation', 'current_password']}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password)         passwordInput.current?.focus();
                            if (errors.current_password) currentPasswordInput.current?.focus();
                        }}
                        className="space-y-5"
                    >
                        {({ errors, processing, recentlySuccessful }) => (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="current_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Current Password
                                    </Label>
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Current password"
                                    />
                                    <InputError message={errors.current_password} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        New Password
                                    </Label>
                                    <Input
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="New password"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password_confirmation" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Confirm New Password
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder="Confirm new password"
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <Button disabled={processing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                        Save Password
                                    </Button>
                                    <Transition show={recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                                        <p className="text-sm text-emerald-600 font-medium">Saved ✓</p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}