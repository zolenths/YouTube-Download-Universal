import { motion } from "framer-motion";
import { Download, AlertTriangle, Loader2, ShieldCheck, HardDrive } from "lucide-react";
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

interface BinaryDownloaderProps {
    onComplete: () => void;
}

export const BinaryDownloader = ({ onComplete }: BinaryDownloaderProps) => {
    const [isInstalling, setIsInstalling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Required tools are missing.");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for setup progress events from Rust
        const unlisten = listen<{ progress: number; status: string }>("setup-progress", (event) => {
            setProgress(event.payload.progress);
            setStatus(event.payload.status);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        setError(null);
        try {
            await invoke("install_sidecar");
            onComplete();
        } catch (err) {
            setError(err as string);
            setIsInstalling(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--color-bg-primary)]/90 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md p-8 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)] shadow-2xl"
            >
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Icon Header */}
                    <div className="relative">
                        <div className="p-4 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                            <HardDrive size={32} />
                        </div>
                        {!isInstalling && (
                            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-black">
                                <AlertTriangle size={12} />
                            </div>
                        )}
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                            Initial Setup Required
                        </h2>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            To download YouTube content, we need to install <b>yt-dlp</b> and <b>ffmpeg</b> locally on your machine.
                        </p>
                    </div>

                    {/* Progress / Info Area */}
                    <div className="w-full py-4 px-6 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-primary)]">
                        {isInstalling ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <span>{status}</span>
                                    <span>{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="h-full bg-[var(--color-accent)] shadow-[0_0_10px_rgba(255,166,252,0.4)]"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 text-left">
                                <ShieldCheck size={18} className="text-emerald-500" />
                                <div className="space-y-0.5">
                                    <p className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase tracking-tight">Privacy Verified</p>
                                    <p className="text-[10px] text-[var(--color-text-muted)]">Official binary from GitHub. No malware.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-mono leading-tight">
                            Error: {error}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.98] ${isInstalling
                            ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed"
                            : "bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:opacity-90 shadow-lg shadow-[var(--color-accent)]/20"
                            }`}
                    >
                        {isInstalling ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Installing...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Setup Tools Automatically
                            </>
                        )}
                    </button>

                    {!isInstalling && (
                        <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-tighter">
                            Size: ~90MB • Platform: {window.navigator.platform}
                        </p>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
