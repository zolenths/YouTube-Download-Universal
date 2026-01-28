import { type ReactNode } from "react";
import { Heart, Lock } from "lucide-react";

interface TerminalLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    showInfo?: boolean;
    onSetShowInfo?: (show: boolean) => void;
}

export const TerminalLayout = ({ children, sidebar, showInfo, onSetShowInfo }: TerminalLayoutProps) => {
    return (
        <div className="h-screen flex overflow-hidden bg-[var(--color-bg-primary)]">
            {/* Sidebar */}
            {sidebar && (
                <aside className="shrink-0">
                    {sidebar}
                </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Title Bar - fixed height 52px to match sidebar */}
                <header className="drag-region h-[52px] flex items-center justify-between px-4 border-b border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                        {/* Window controls */}
                        <div className="flex gap-2 no-drag">
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-muted)] opacity-60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-muted)] opacity-40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-muted)] opacity-20" />
                        </div>

                        {/* App Title and Info toggle - both clickable */}
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <button
                                onClick={() => onSetShowInfo?.(false)}
                                className={`no-drag transition-colors ${!showInfo ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"}`}
                            >
                                YouTube Download Universal
                            </button>
                            <span className="text-[var(--color-text-muted)]">୧</span>
                            <button
                                onClick={() => onSetShowInfo?.(true)}
                                className={`no-drag transition-colors
                                    ${showInfo
                                        ? "text-[var(--color-accent)]"
                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                                    }`}
                            >
                                Info
                            </button>
                        </div>
                    </div>

                    {/* Version badge */}
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                        v0.1.0
                    </span>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col relative z-10 px-6 py-6 overflow-y-auto">
                    <div className="max-w-xl mx-auto w-full">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="px-4 py-3 border-t border-[var(--color-bg-tertiary)]">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                            Made with <Heart size={10} className="text-[var(--color-accent)]" /> using Rust + Tauri
                        </span>
                        <span className="flex items-center gap-1 font-mono opacity-60">
                            <Lock size={10} />
                            Zero telemetry
                        </span>
                    </div>
                </footer>
            </div>
        </div>
    );
};
