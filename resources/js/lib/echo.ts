import { configureEcho } from "@laravel/echo-react";
import Echo from 'laravel-echo';
import { toast } from "sonner";

// import Pusher from 'pusher-js';

// window.Pusher = Pusher;

// window.Echo = new Echo({
//     broadcaster: 'reverb',
//     key: import.meta.env.VITE_REVERB_APP_KEY,
//     wsHost: import.meta.env.VITE_REVERB_HOST,
//     wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
//     wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
//     forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https'),
//     enabledTransports: ["ws", "wss"],
// })

// export default window.Echo;

// Check if Echo environment variables are configured
const hasEchoConfig = !!(
    import.meta.env.VITE_REVERB_APP_KEY &&
    import.meta.env.VITE_REVERB_HOST &&
    import.meta.env.VITE_REVERB_PORT
);

export const echo = hasEchoConfig ? configureEcho({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT,
    wssPort: import.meta.env.VITE_REVERB_PORT,
    forceTLS: false,
    enabledTransports: ["ws", "wss"],
}) : null;

// window.Echo.private(`leads.${leadId}`)
//     .listen('LeadUpdated', (e) => {
//         toast.info('Lead updated by ' + e.user.name);
//     });

// window.Echo.private(`user.${userId}`)
//     .notification((notification) => {
//         toast.success(notification.message);
//         // Add to notification center
//     });

// Also export as default for compatibility
export default echo;