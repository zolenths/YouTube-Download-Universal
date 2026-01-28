import { useEffect, useRef } from "react";
import { Eraser } from "lucide-react";
import { useDownloadStore, LogLevel } from "@/stores/downloadStore";

const LOG_COLORS: Record<LogLevel, string> = {
    error: "var(--color-error)",
    warn: "var(--color-warning)",
    success: "var(--color-success)",
    info: "var(--color-text-secondary)",
};

export const LogViewer = () => {
    const logs = useDownloadStore((state) => state.logs);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs added
    useEffect(() => {
        if (containerRef.current && logs.length > 0) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [logs.length]);

    if (logs.length === 0) return null;

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    return (
        <div className="relative group">
            <div
                ref={containerRef}
                className="h-32 overflow-y-auto rounded-lg p-3 scroll-smooth
                     bg-[var(--color-bg-secondary)] 
                     border border-[var(--color-bg-tertiary)]"
            >
                <div className="flex flex-col gap-0.5">
                    {logs.map((log, index) => (
                        <div
                            key={index}
                            className="flex gap-3 text-xs font-mono leading-5"
                        >
                            <span className="text-[var(--color-text-muted)] shrink-0">
                                {formatTime(log.timestamp)}
                            </span>
                            <span
                                style={{ color: LOG_COLORS[log.level] }}
                                className="break-all"
                            >
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Clear Button */}
            <button
                onClick={() => useDownloadStore.getState().clearLogs()}
                className="absolute top-2 right-2 p-1.5 rounded-md
                         bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]
                         hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-primary)]
                         transition-all opacity-0 group-hover:opacity-100 
                         focus:opacity-100 border border-[var(--color-bg-primary)]"
                title="Clear logs"
            >
                <Eraser size={12} />
            </button>
        </div>
    );
};
