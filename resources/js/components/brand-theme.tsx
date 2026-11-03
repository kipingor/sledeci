import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

type Brand = {
    primary?: string | null;
    secondary?: string | null;
    accent?: string | null;
    logo_url?: string | null;
    theme_from_logo?: boolean;
};

/**
 * Applies company brand colours (from logo extraction) as CSS variables.
 */
export function BrandTheme() {
    const brand = (usePage().props as { brand?: Brand }).brand;

    useEffect(() => {
        if (!brand?.primary) return;
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', brand.primary);
        if (brand.secondary) root.style.setProperty('--brand-secondary', brand.secondary);
        if (brand.accent) root.style.setProperty('--brand-accent', brand.accent);

        // Map into shadcn-style primary tokens (hex is accepted by modern browsers)
        root.style.setProperty('--primary', brand.primary);
        root.style.setProperty('--sidebar-primary', brand.primary);
        root.style.setProperty('--ring', brand.primary);
    }, [brand?.primary, brand?.secondary, brand?.accent]);

    return null;
}
