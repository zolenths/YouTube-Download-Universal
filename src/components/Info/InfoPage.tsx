import { motion } from "framer-motion";
import { ShieldCheck, Heart, ExternalLink, Coffee, Shield, ArrowLeft, Zap } from "lucide-react";

interface InfoPageProps {
    onBack: () => void;
}

export const InfoPage = ({ onBack }: InfoPageProps) => {
    return (
        <div className="space-y-5">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    About
                </h2>
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                >
                    <ArrowLeft size={12} />
                    Back
                </button>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Safety Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} className="text-[var(--color-warning)]" />
                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Safety</h3>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                        <li>• Use Proxies to hide your real IP</li>
                        <li>• Limit: 40/day (IP safety zone)</li>
                        <li>• Warning: 25/day (Request warm-up)</li>
                    </ul>
                </motion.div>

                {/* Efficiency Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-[var(--color-accent)]" />
                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Efficiency</h3>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-[var(--color-text-secondary)]">
                        <li>• FLAC for master quality</li>
                        <li>• MP3 for mobile storage</li>
                        <li>• Clean metadata is automatic</li>
                    </ul>
                </motion.div>

                {/* Privacy Card - Full width */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="col-span-2 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={14} className="text-[var(--color-text-secondary)]" />
                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Privacy First</h3>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                        Runs 100% locally on your machine. No cloud processing, no tracking, and definitely <b>Zero Telemetry</b>. Your data is yours.
                    </p>
                </motion.div>
            </div>

            {/* Donate Section - Highlighted */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Heart size={14} className="text-[var(--color-accent)]" />
                        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Support</h3>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">Zero ads, pure tools</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <a
                        href="https://ko-fi.com/zolen"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg flex items-center justify-center gap-1.5
                                   bg-[var(--color-accent)]
                                   text-[var(--color-accent-text)]
                                   text-xs font-medium
                                   hover:opacity-90 transition-opacity"
                    >
                        <Coffee size={12} />
                        Ko-fi
                    </a>
                    <a
                        href="https://github.com/sponsors/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg flex items-center justify-center gap-1.5
                                   bg-[var(--color-bg-tertiary)]
                                   text-[var(--color-text-secondary)]
                                   text-xs font-medium
                                   hover:text-[var(--color-accent)] transition-colors"
                    >
                        <Heart size={12} />
                        Sponsor
                    </a>
                </div>
            </motion.div>

            {/* Links Row */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex justify-center gap-4 pt-2"
            >
                <a
                    href="https://github.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                >
                    GitHub <ExternalLink size={9} />
                </a>
                <span className="text-[var(--color-text-muted)] text-[10px]">•</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                    FOSS Project
                </span>
            </motion.div>
        </div>
    );
};
