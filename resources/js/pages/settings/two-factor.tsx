/**
 * settings/two-factor.tsx — Amber Obsidian redesign
 * All useTwoFactorAuth() hook usage, Form wiring, TwoFactorSetupModal, and
 * TwoFactorRecoveryCodes components are preserved exactly.
 */
import HeadingSmall from '@/components/heading-small';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable, show } from '@/routes/two-factor';
import { type BreadcrumbItem } from '@/types';
import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TwoFactorProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Two-Factor Authentication', href: show.url() },
];

export default function TwoFactor({ requiresConfirmation = false, twoFactorEnabled = false }: TwoFactorProps) {
    const { qrCodeSvg, hasSetupData, manualSetupKey, clearSetupData, fetchSetupData, recoveryCodesList, fetchRecoveryCodes, errors } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Two-Factor Authentication" />
            <SettingsLayout>
                <div className="space-y-6">
                    {/* Section header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                        <div className={cn(
                            'h-8 w-8 rounded-md flex items-center justify-center',
                            twoFactorEnabled ? 'bg-emerald-50' : 'bg-muted'
                        )}>
                            <ShieldAlert className={cn('h-4 w-4', twoFactorEnabled ? 'text-emerald-600' : 'text-muted-foreground')} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Manage your two-factor authentication settings
                            </p>
                        </div>
                        {/* Status pill */}
                        <div className="ml-auto">
                            {twoFactorEnabled ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                    <ShieldCheck className="h-3 w-3" /> Enabled
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
                                    <ShieldBan className="h-3 w-3" /> Disabled
                                </span>
                            )}
                        </div>
                    </div>

                    {twoFactorEnabled ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Two-factor authentication is enabled. You will be prompted for a secure, random pin during login,
                                which you can retrieve from the TOTP-supported application on your phone.
                            </p>

                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />

                            <Form {...disable.form()}>
                                {({ processing }) => (
                                    <Button variant="destructive" type="submit" disabled={processing} className="gap-2">
                                        <ShieldBan className="h-4 w-4" /> Disable 2FA
                                    </Button>
                                )}
                            </Form>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                When you enable two-factor authentication, you will be prompted for a secure pin during login.
                                This pin can be retrieved from a TOTP-supported application on your phone.
                            </p>

                            <div>
                                {hasSetupData ? (
                                    <Button onClick={() => setShowSetupModal(true)} className="gap-2">
                                        <ShieldCheck className="h-4 w-4" /> Continue Setup
                                    </Button>
                                ) : (
                                    <Form {...enable.form()} onSuccess={() => setShowSetupModal(true)}>
                                        {({ processing }) => (
                                            <Button type="submit" disabled={processing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                                <ShieldCheck className="h-4 w-4" /> Enable 2FA
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </div>
                        </div>
                    )}

                    <TwoFactorSetupModal
                        isOpen={showSetupModal}
                        onClose={() => setShowSetupModal(false)}
                        requiresConfirmation={requiresConfirmation}
                        twoFactorEnabled={twoFactorEnabled}
                        qrCodeSvg={qrCodeSvg}
                        manualSetupKey={manualSetupKey}
                        clearSetupData={clearSetupData}
                        fetchSetupData={fetchSetupData}
                        errors={errors}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}