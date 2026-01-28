import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Settings, Sun, Moon, History, Clock, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useDownloadStore } from "@/stores/downloadStore";
import { useShallow } from "zustand/react/shallow";

interface SidebarProps {
    onSettingsClick: () => void;
    onUrlSelect: (url: string) => void;
}

interface HistoryItem {
    url: string;
    title: string;
    timestamp: Date;
}

// Load history from localStorage
const loadHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem("url_history");
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.map((item: { url: string; title: string; timestamp: string }) => ({
                ...item,
                timestamp: new Date(item.timestamp),
            }));
        }
    } catch {
        // Ignore parse errors
    }
    return [];
};

// Save history to localStorage
const saveHistory = (history: HistoryItem[]) => {
    try {
        localStorage.setItem("url_history", JSON.stringify(history.slice(0, 20)));
    } catch {
        // Ignore storage errors
    }
};

// Add URL to history
export const addToHistory = (url: string, title: string = "Unknown") => {
    const history = loadHistory();
    // Remove duplicates
    const filtered = history.filter(item => item.url !== url);
    // Add new item at the beginning
    const newHistory = [{ url, title, timestamp: new Date() }, ...filtered];
    saveHistory(newHistory);
};

export const Sidebar = ({ onSettingsClick, onUrlSelect }: SidebarProps) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const { theme, setTheme } = useDownloadStore(useShallow(state => ({
        theme: state.theme,
        setTheme: state.setTheme
    })));
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Load history on mount
    useEffect(() => {
        setHistory(loadHistory());

        // Refresh history periodically
        const interval = setInterval(() => {
            setHistory(loadHistory());
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    const extractVideoId = (url: string): string | null => {
        const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
        return match?.[1] ?? null;
    };

    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 48 : 224 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-full flex flex-col
                    bg-[var(--color-bg-secondary)]
                    border-r border-[var(--color-bg-tertiary)]"
        >
            {/* Header - matches main header height (py-3 = 12px + content) */}
            <div className="h-[52px] flex items-center justify-between px-3 border-b border-[var(--color-bg-tertiary)]">
                {!isCollapsed && (
                    <div className="flex gap-2 flex-1">
                        {/* Settings Button */}
                        <button
                            onClick={onSettingsClick}
                            className="flex-1 px-2 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5
                           bg-[var(--color-bg-tertiary)]
                           text-[var(--color-text-secondary)]
                           hover:text-[var(--color-accent)]
                           transition-colors"
                            title="Settings"
                        >
                            <Settings size={14} strokeWidth={2} />
                            <span>Settings</span>
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="px-2 py-1.5 text-xs rounded-lg flex items-center justify-center
                           bg-[var(--color-bg-tertiary)]
                           text-[var(--color-text-secondary)]
                           hover:text-[var(--color-accent)]
                           transition-colors"
                            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                        >
                            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    </div>
                )}

                {/* Collapse Toggle - always visible */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-1.5 rounded-lg
                           text-[var(--color-text-muted)]
                           hover:text-[var(--color-accent)]
                           hover:bg-[var(--color-bg-tertiary)]
                           transition-colors
                           ${isCollapsed ? "mx-auto" : "ml-1"}`}
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
            </div>

            {/* Collapsed Mode - Icon buttons stack */}
            {isCollapsed && (
                <div className="flex flex-col items-center gap-2 py-3">
                    <button
                        onClick={onSettingsClick}
                        className="p-2 rounded-lg
                               text-[var(--color-text-secondary)]
                               hover:text-[var(--color-accent)]
                               hover:bg-[var(--color-bg-tertiary)]
                               transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg
                               text-[var(--color-text-secondary)]
                               hover:text-[var(--color-accent)]
                               hover:bg-[var(--color-bg-tertiary)]
                               transition-colors"
                        title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                    >
                        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            )}

            {/* History Section - Hidden when collapsed */}
            {!isCollapsed && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="px-3 py-2 flex items-center gap-1.5">
                        <History size={12} className="text-[var(--color-text-muted)]" />
                        <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                            Recent
                        </h3>
                    </div>

                    {/* History List */}
                    <div className="flex-1 overflow-y-auto px-2">
                        {history.length === 0 ? (
                            <div className="px-2 py-4 text-center">
                                <p className="text-xs text-[var(--color-text-muted)]">
                                    No history yet
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {history.map((item, index) => {
                                    const videoId = extractVideoId(item.url);
                                    return (
                                        <motion.button
                                            key={`${item.url}-${index}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => onUrlSelect(item.url)}
                                            className="w-full p-2 rounded-lg text-left group
                                               hover:bg-[var(--color-bg-tertiary)]
                                               transition-colors"
                                        >
                                            {/* Thumbnail */}
                                            {videoId && (
                                                <div className="w-full h-12 rounded mb-1.5 overflow-hidden bg-[var(--color-bg-tertiary)]">
                                                    <img
                                                        src={`https://i.ytimg.com/vi/${videoId}/default.jpg`}
                                                        alt=""
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <p className="text-xs text-[var(--color-text-primary)] truncate font-medium">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock size={10} className="text-[var(--color-text-muted)]" />
                                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                                    {formatTime(item.timestamp)}
                                                </p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="p-3 border-t border-[var(--color-bg-tertiary)]">
                {isCollapsed ? (
                    <div className="flex justify-center">
                        <span className="text-xs text-[var(--color-text-muted)]">{history.length}</span>
                    </div>
                ) : (
                    <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                        {history.length} in history
                    </p>
                )}
            </div>
        </motion.div>
    );
};
