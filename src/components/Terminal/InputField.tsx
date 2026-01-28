import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDownloadStore } from "@/stores/downloadStore";

interface InputFieldProps {
    onSubmit: (url: string) => void;
    initialUrl?: string;
}

export const InputField = ({ onSubmit, initialUrl = "" }: InputFieldProps) => {
    const [url, setUrl] = useState(initialUrl);
    const [isFocused, setIsFocused] = useState(false);

    const { status, format, setFormat } = useDownloadStore(
        useShallow((state) => ({
            status: state.status,
            format: state.format,
            setFormat: state.setFormat,
        }))
    );

    // Update URL when initialUrl changes (from history selection)
    useEffect(() => {
        if (initialUrl) {
            setUrl(initialUrl);
        }
    }, [initialUrl]);

    const isLoading = status === "validating" || status === "downloading" || status === "converting";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim() && !isLoading) {
            onSubmit(url.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL Input */}
            <div className="relative">
                <motion.div
                    className="absolute -inset-0.5 rounded-lg opacity-0"
                    style={{ background: "var(--color-accent)" }}
                    animate={{ opacity: isFocused ? 0.15 : 0 }}
                    transition={{ duration: 0.2 }}
                />
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Paste YouTube URL here..."
                    disabled={isLoading}
                    className="relative w-full px-4 py-3 rounded-lg 
                     bg-[var(--color-bg-secondary)] 
                     border border-[var(--color-bg-tertiary)]
                     text-[var(--color-text-primary)] 
                     placeholder:text-[var(--color-text-muted)]
                     focus:outline-none focus:border-[var(--color-accent-muted)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-mono text-sm
                     transition-colors duration-200"
                />
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-3">
                {/* Format Toggle */}
                <div className="flex rounded-lg overflow-hidden border border-[var(--color-bg-tertiary)]">
                    {(["mp3", "flac"] as const).map((fmt) => (
                        <button
                            key={fmt}
                            type="button"
                            onClick={() => setFormat(fmt)}
                            disabled={isLoading}
                            className={`px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all duration-200
                ${format === fmt
                                    ? "bg-[var(--color-accent)] text-[var(--color-accent-text)]"
                                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                }
                disabled:opacity-50`}
                        >
                            {fmt}
                        </button>
                    ))}
                </div>

                {/* Download Button */}
                <motion.button
                    type="submit"
                    disabled={!url.trim() || isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="flex-1 px-6 py-2.5 rounded-lg flex items-center justify-center gap-2
                     bg-[var(--color-accent)] 
                     text-[var(--color-accent-text)] 
                     font-medium text-sm
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity duration-200"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <Download size={16} />
                            <span>Download</span>
                        </>
                    )}
                </motion.button>
            </div>
        </form>
    );
};
