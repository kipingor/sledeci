import {
    configureEcho,
    echo as getEcho,
    echoIsConfigured,
} from '@laravel/echo-react';

// Check if Echo environment variables are configured
const hasEchoConfig = !!(
    import.meta.env.VITE_REVERB_APP_KEY &&
    import.meta.env.VITE_REVERB_HOST &&
    import.meta.env.VITE_REVERB_PORT
);

if (hasEchoConfig) {
    configureEcho({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT),
        forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
        enabledTransports: ['ws', 'wss'],
    });
}

export const echo = echoIsConfigured() ? getEcho() : null;

export default echo;