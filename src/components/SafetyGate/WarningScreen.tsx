import { motion } from "framer-motion";
import { ShieldAlert, Coffee, Activity, Globe } from "lucide-react";
import { useDownloadStore } from "@/stores/downloadStore";

export const WarningScreen = () => {
    const dailyDownloads = useDownloadStore((state) => state.dailyDownloads);
    const setGateWarning = useDownloadStore((state) => state.setGateWarning);
    const setGateBypass = useDownloadStore((state) => state.setGateBypass);

    const handleBypass = () => {
        setGateBypass(true);
        setGateWarning(false);
    };

    const handleCancel = () => {
        setGateWarning(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
            style={{ backgroundColor: "oklch(0 0 0 / 0.8)" }}
        >
            <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="w-full max-w-md p-6 rounded-2xl
                   bg-[var(--color-bg-secondary)] 
                   border border-amber-500/20 shadow-2xl shadow-amber-500/10"
            >
                {/* Status Indicator */}
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                        <ShieldAlert size={28} className="text-amber-500" />
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 justify-end text-amber-500 mb-1">
                            <Activity size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Rate-Limit Warning</span>
                        </div>
                        <span className="text-2xl font-mono leading-none text-[var(--color-text-primary)]">
                            {dailyDownloads}<span className="text-[var(--color-text-muted)] text-lg">/40</span>
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                    IP Health Protection
                </h2>

                {/* Technical Context */}
                <div className="space-y-4 mb-8">
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        YouTube has detected high request volume from your IP. Standard residential connections usually trigger <span className="text-amber-500 font-mono">429 (Too Many Requests)</span> errors after ~30-40 rapid downloads.
                    </p>

                    <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-primary)]">
                        <div className="flex items-start gap-3">
                            <Globe size={16} className="text-[var(--color-text-muted)] mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-[var(--color-text-primary)] uppercase">Risk Assessment</p>
                                <p className="text-[11px] text-[var(--color-text-muted)]">
                                    Continuing without a VPN or Proxy may lead to a temporary IP shadowban (24h - 48h).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleCancel}
                        className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2
                       bg-amber-500 text-black
                       text-sm font-bold
                       hover:bg-amber-400
                       transition-all active:scale-[0.98]"
                    >
                        <Coffee size={16} />
                        Pause Downloads (Recommended)
                    </button>

                    <button
                        onClick={handleBypass}
                        className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2
                       bg-[var(--color-bg-tertiary)]
                       text-[var(--color-text-secondary)]
                       text-xs font-medium
                       hover:text-amber-500 hover:bg-[var(--color-bg-primary)]
                       transition-colors"
                    >
                        I'm using a VPN / Ignore risk
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
