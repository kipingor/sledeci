import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine, X, Camera, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    onDetected: (code: string) => void;
    onClose: () => void;
    title?: string;
}

// BarcodeDetector is not in TypeScript's lib yet — declare it
declare class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(source: HTMLVideoElement | ImageBitmap | HTMLCanvasElement): Promise<Array<{ rawValue: string; format: string }>>;
    static getSupportedFormats(): Promise<string[]>;
}

const SUPPORTED_FORMATS = [
    'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93',
    'qr_code', 'data_matrix', 'itf', 'upc_a', 'upc_e',
];

export default function BarcodeScanner({ onDetected, onClose, title = 'Scan Barcode' }: Props) {
    const videoRef    = useRef<HTMLVideoElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const streamRef   = useRef<MediaStream | null>(null);
    const rafRef      = useRef<number>(0);
    const lastCode    = useRef<string>('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [mode, setMode]         = useState<'camera' | 'text'>('camera');
    const [error, setError]       = useState<string | null>(null);
    const [detected, setDetected] = useState<string | null>(null);
    const [textInput, setTextInput] = useState('');
    const [nativeSupported, setNativeSupported] = useState(false);

    // Check BarcodeDetector support
    useEffect(() => {
        if ('BarcodeDetector' in window) {
            setNativeSupported(true);
        } else {
            // No native support — go straight to text fallback
            setMode('text');
            setError('Camera barcode scanning is not supported in this browser. Please type or paste the code below.');
        }
    }, []);

    // Start camera stream
    useEffect(() => {
        if (mode !== 'camera' || !nativeSupported) return;

        let detector: BarcodeDetector;
        let active = true;

        async function startCamera() {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                const supported = SUPPORTED_FORMATS.filter(f => formats.includes(f));

                detector = new BarcodeDetector({ formats: supported.length > 0 ? supported : SUPPORTED_FORMATS });

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' }, // rear camera on mobile
                        width:  { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                });

                streamRef.current = stream;

                if (videoRef.current && active) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    scanLoop(detector, active);
                }
            } catch (e: any) {
                if (active) {
                    setError(e.name === 'NotAllowedError'
                        ? 'Camera permission denied. Please allow camera access and try again.'
                        : `Camera error: ${e.message}`);
                    setMode('text');
                }
            }
        }

        startCamera();

        return () => {
            active = false;
            stopCamera();
        };
    }, [mode, nativeSupported]);

    function stopCamera() {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }

    const scanLoop = useCallback((detector: BarcodeDetector, active: { valueOf(): boolean } | boolean) => {
        async function tick() {
            if (!active || !videoRef.current || videoRef.current.readyState < 2) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            try {
                const results = await detector.detect(videoRef.current);
                if (results.length > 0) {
                    const code = results[0].rawValue;

                    if (code !== lastCode.current) {
                        lastCode.current = code;
                        setDetected(code);
                        onDetected(code);

                        // Reset debounce so the same code can fire again after 1.5s
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                        debounceRef.current = setTimeout(() => {
                            lastCode.current = '';
                            setDetected(null);
                        }, 1500);
                    }
                }
            } catch { /* detection errors are transient, keep scanning */ }

            rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, [onDetected]);

    function handleTextSubmit() {
        const code = textInput.trim();
        if (!code) return;
        setDetected(code);
        onDetected(code);
        setTextInput('');
        setTimeout(() => setDetected(null), 1500);
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <ScanLine className="h-4 w-4 text-amber-500" /> {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Toggle between camera and text input */}
                        {nativeSupported && (
                            <button
                                onClick={() => { stopCamera(); setMode(m => m === 'camera' ? 'text' : 'camera'); setError(null); }}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded border border-border">
                                {mode === 'camera' ? <><Keyboard className="h-3 w-3" /> Type</> : <><Camera className="h-3 w-3" /> Camera</>}
                            </button>
                        )}
                        <button onClick={() => { stopCamera(); onClose(); }}>
                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                </div>

                {/* Camera view */}
                {mode === 'camera' && (
                    <div className="relative bg-black">
                        <video
                            ref={videoRef}
                            className="w-full aspect-video object-cover"
                            playsInline
                            muted
                        />
                        {/* Scanning reticle overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-56 h-40">
                                {/* Corner brackets */}
                                {[
                                    'top-0 left-0 border-t-2 border-l-2',
                                    'top-0 right-0 border-t-2 border-r-2',
                                    'bottom-0 left-0 border-b-2 border-l-2',
                                    'bottom-0 right-0 border-b-2 border-r-2',
                                ].map((cls, i) => (
                                    <div key={i} className={cn('absolute w-6 h-6 border-amber-400', cls)} />
                                ))}
                                {/* Scanning line animation */}
                                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-400/70 animate-pulse" />
                            </div>
                        </div>
                        {/* Detection flash */}
                        {detected && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-mono text-sm font-semibold shadow-lg">
                                    ✓ {detected}
                                </div>
                            </div>
                        )}
                        {/* Scanning status */}
                        <div className="absolute bottom-3 inset-x-0 text-center">
                            <span className="text-xs text-white/70 bg-black/40 px-2 py-1 rounded-full">
                                Point camera at barcode
                            </span>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && mode === 'text' && (
                    <div className="px-5 pt-4 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 py-3 border-b border-amber-200 dark:border-amber-800">
                        {error}
                    </div>
                )}

                {/* Text input fallback */}
                <div className="p-5 space-y-3">
                    {mode === 'text' && (
                        <div className="flex gap-2">
                            <Input
                                autoFocus
                                placeholder="Scan barcode or type SKU / code…"
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                className="font-mono"
                            />
                            <Button onClick={handleTextSubmit} disabled={!textInput.trim()}
                                className="bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                                Look up
                            </Button>
                        </div>
                    )}

                    {detected && mode === 'text' && (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                            ✓ {detected}
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center">
                        {mode === 'camera'
                            ? 'Supports EAN-13, EAN-8, Code 128, QR Code, and more'
                            : 'Hardware barcode scanners work here too — they type the code + Enter'}
                    </p>
                </div>

                {/* Hidden canvas for frame capture (future: manual capture mode) */}
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}