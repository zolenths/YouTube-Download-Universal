import { motion } from "framer-motion";
import { useDownloadStore, DownloadStatus } from "@/stores/downloadStore";

const STATUS_COLORS: Partial<Record<DownloadStatus, string>> = {
    error: "var(--color-error)",
    success: "var(--color-success)",
};

export const ProgressBar = () => {
    const status = useDownloadStore((state) => state.status);
    const progress = useDownloadStore((state) => state.progress);

    // Only show when there's activity
    const isActive = status !== "idle" && status !== "success" && status !== "error";

    if (!isActive && progress === 0) return null;

    const getStatusText = () => {
        switch (status) {
            case "validating": return "Validating URL...";
            case "downloading": return `Downloading: ${progress.toFixed(0)}%`;
            case "converting": return "Converting audio...";
            case "success": return "Complete!";
            case "error": return "Failed";
            default: return "";
        }
    };

    return (
        <div className="space-y-2">
            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)]">
                <motion.div
                    className="h-full rounded-full"
                    style={{
                        backgroundColor: STATUS_COLORS[status] || "var(--color-accent)"
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                />
            </div>


            {/* Status text */}
            <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-secondary)]">
                    {getStatusText()}
                </span>
                {isActive && (
                    <span className="text-[var(--color-text-muted)]">
                        {progress.toFixed(0)}%
                    </span>
                )}
            </div>
        </div>
    );
};
