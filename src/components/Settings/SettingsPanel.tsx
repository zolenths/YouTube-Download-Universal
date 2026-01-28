import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Settings, X, Upload, Shield, Clock, Folder, Sun, Moon, Palette, Check, Loader2 } from "lucide-react";
import { useDownloadStore } from "@/stores/downloadStore";
import { useShallow } from "zustand/react/shallow";

type ProxyType = "none" | "http" | "socks5";

interface ProxyAuth {
    username: string;
    password: string;
}

interface ProxyConfig {
    proxy_type: ProxyType;
    host: string;
    port: number;
    auth?: ProxyAuth;
}

interface AntiBanConfig {
    rotate_user_agent: boolean;
    enable_delays: boolean;
    min_delay_secs: number;
    max_delay_secs: number;
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
    const [proxyConfig, setProxyConfig] = useState<ProxyConfig>({
        proxy_type: "none",
        host: "",
        port: 8080,
        auth: undefined,
    });

    const [antiBanConfig, setAntiBanConfig] = useState<AntiBanConfig>({
        rotate_user_agent: true,
        enable_delays: true,
        min_delay_secs: 1,
        max_delay_secs: 5,
    });

    const [downloadPath, setDownloadPath] = useState<string>("");
    const [useAuth, setUseAuth] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const { theme, setTheme } = useDownloadStore(useShallow(state => ({
        theme: state.theme,
        setTheme: state.setTheme
    })));

    // Load existing config
    useEffect(() => {
        if (isOpen) {
            invoke<ProxyConfig>("get_proxy_config").then(setProxyConfig);
            invoke<AntiBanConfig>("get_anti_ban_config").then(setAntiBanConfig);
            invoke<string>("get_download_path").then(setDownloadPath);
        }
    }, [isOpen]);

    // Reset feedback states when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setSaving(false);
            setSaved(false);
        }
    }, [isOpen]);

    const handlePickFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Download Folder",
            });
            if (selected) {
                setDownloadPath(selected as string);
            }
        } catch (error) {
            console.error("Failed to pick folder:", error);
        }
    };

    const handleSave = async () => {
        if (saving || saved) return;

        setSaving(true);
        setSaved(false);

        try {
            // Min delay to show spinner
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));

            await Promise.all([
                invoke("set_proxy_config", { config: proxyConfig }),
                invoke("set_anti_ban_config", { config: antiBanConfig }),
                invoke("set_download_path", { path: downloadPath }),
                minDelay
            ]);

            setSaving(false);
            setSaved(true);

            // Wait 1.5s then close
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaving(false);
            setSaved(false);
        }
    };

    const handleImportProxies = async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const content = await file.text();
            const proxies = await invoke<ProxyConfig[]>("import_proxies", { content });
            if (proxies && proxies.length > 0) {
                const firstProxy = proxies[0];
                if (firstProxy) {
                    setProxyConfig(firstProxy);
                }
            }
        };
        input.click();
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-default"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        className="relative z-50 w-full max-w-md bg-[var(--color-bg-secondary)] rounded-2xl shadow-2xl border border-[var(--color-bg-tertiary)] overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar no-drag">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Settings size={18} className="text-[var(--color-accent)]" />
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                        Settings
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Proxy Section */}
                            <section className="mb-5">
                                <h3 className="text-sm font-medium mb-3 text-[var(--color-accent)]">
                                    Proxy Configuration
                                </h3>

                                {/* Proxy Type */}
                                <div className="flex gap-2 mb-3">
                                    {(["none", "http", "socks5"] as ProxyType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setProxyConfig({ ...proxyConfig, proxy_type: type })}
                                            className={`px-3 py-1.5 text-xs uppercase rounded transition-colors
                    ${proxyConfig.proxy_type === type
                                                    ? "bg-[var(--color-accent)] text-[var(--color-accent-text)]"
                                                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {/* Host/Port */}
                                {proxyConfig.proxy_type !== "none" && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Host (e.g. 127.0.0.1)"
                                                value={proxyConfig.host}
                                                onChange={(e) => setProxyConfig({ ...proxyConfig, host: e.target.value })}
                                                className="flex-1 px-3 py-2 text-sm rounded
                               bg-[var(--color-bg-tertiary)]
                               border border-[var(--color-bg-primary)]
                               text-[var(--color-text-primary)]
                               placeholder:text-[var(--color-text-muted)]"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Port"
                                                value={proxyConfig.port}
                                                onChange={(e) => setProxyConfig({ ...proxyConfig, port: parseInt(e.target.value) || 0 })}
                                                className="w-20 px-3 py-2 text-sm rounded
                               bg-[var(--color-bg-tertiary)]
                               border border-[var(--color-bg-primary)]
                               text-[var(--color-text-primary)]"
                                            />
                                        </div>

                                        {/* Auth toggle */}
                                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                            <input
                                                type="checkbox"
                                                checked={useAuth}
                                                onChange={(e) => setUseAuth(e.target.checked)}
                                                className="accent-[var(--color-accent)]"
                                            />
                                            Use authentication
                                        </label>

                                        {/* Auth fields */}
                                        {useAuth && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Username"
                                                    value={proxyConfig.auth?.username || ""}
                                                    onChange={(e) => setProxyConfig({
                                                        ...proxyConfig,
                                                        auth: { username: e.target.value, password: proxyConfig.auth?.password || "" }
                                                    })}
                                                    className="flex-1 px-3 py-2 text-sm rounded
                                 bg-[var(--color-bg-tertiary)]
                                 border border-[var(--color-bg-primary)]
                                 text-[var(--color-text-primary)]"
                                                />
                                                <input
                                                    type="password"
                                                    placeholder="Password"
                                                    value={proxyConfig.auth?.password || ""}
                                                    onChange={(e) => setProxyConfig({
                                                        ...proxyConfig,
                                                        auth: { username: proxyConfig.auth?.username || "", password: e.target.value }
                                                    })}
                                                    className="flex-1 px-3 py-2 text-sm rounded
                                 bg-[var(--color-bg-tertiary)]
                                 border border-[var(--color-bg-primary)]
                                 text-[var(--color-text-primary)]"
                                                />
                                            </div>
                                        )}

                                        {/* Import button */}
                                        <button
                                            onClick={handleImportProxies}
                                            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
                                        >
                                            <Upload size={12} />
                                            Import from .txt file
                                        </button>
                                    </div>
                                )}
                            </section>

                            {/* Appearance Section */}
                            <section className="mb-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Palette size={14} className="text-[var(--color-accent)]" />
                                    <h3 className="text-sm font-medium text-[var(--color-accent)]">
                                        Appearance
                                    </h3>
                                </div>

                                <div className="flex gap-2 p-1 rounded-lg bg-[var(--color-bg-tertiary)] w-fit">
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${theme === "light"
                                            ? "bg-[var(--color-accent)] text-[var(--color-accent-text)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                            }`}
                                    >
                                        <Sun size={14} />
                                        <span className="text-xs font-bold uppercase">Light</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${theme === "dark"
                                            ? "bg-[var(--color-accent)] text-[var(--color-accent-text)] shadow-sm"
                                            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                            }`}
                                    >
                                        <Moon size={14} />
                                        <span className="text-xs font-bold uppercase">Dark</span>
                                    </button>
                                </div>
                            </section>

                            {/* Download Section */}
                            <section className="mb-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Folder size={14} className="text-[var(--color-accent)]" />
                                    <h3 className="text-sm font-medium text-[var(--color-accent)]">
                                        Download Folder
                                    </h3>
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 px-3 py-2 text-[10px] font-mono rounded truncate
                               bg-[var(--color-bg-tertiary)]
                               border border-[var(--color-bg-primary)]
                               text-[var(--color-text-muted)]"
                                        title={downloadPath || "Default downloads folder"}
                                    >
                                        {downloadPath || "Using system default..."}
                                    </div>
                                    <button
                                        onClick={handlePickFolder}
                                        className="px-3 py-2 text-xs font-bold rounded
                                 bg-[var(--color-bg-tertiary)]
                                 text-[var(--color-text-primary)]
                                 hover:bg-[var(--color-bg-primary)]
                                 border border-[var(--color-bg-primary)]
                                 transition-colors"
                                    >
                                        Change
                                    </button>
                                </div>
                            </section>

                            {/* Anti-Ban Section */}
                            <section className="mb-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Shield size={14} className="text-[var(--color-accent)]" />
                                    <h3 className="text-sm font-medium text-[var(--color-accent)]">
                                        Anti-Ban Protection
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {/* User-Agent rotation */}
                                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                        <input
                                            type="checkbox"
                                            checked={antiBanConfig.rotate_user_agent}
                                            onChange={(e) => setAntiBanConfig({ ...antiBanConfig, rotate_user_agent: e.target.checked })}
                                            className="accent-[var(--color-accent)]"
                                        />
                                        Rotate User-Agent
                                    </label>

                                    {/* Request delays */}
                                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                        <input
                                            type="checkbox"
                                            checked={antiBanConfig.enable_delays}
                                            onChange={(e) => setAntiBanConfig({ ...antiBanConfig, enable_delays: e.target.checked })}
                                            className="accent-[var(--color-accent)]"
                                        />
                                        Random request delays
                                    </label>

                                    {/* Delay range */}
                                    {antiBanConfig.enable_delays && (
                                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                                            <Clock size={12} />
                                            <span>Delay:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="30"
                                                value={antiBanConfig.min_delay_secs}
                                                onChange={(e) => setAntiBanConfig({ ...antiBanConfig, min_delay_secs: parseInt(e.target.value) || 0 })}
                                                className="w-14 px-2 py-1 text-sm rounded text-center
                               bg-[var(--color-bg-tertiary)]
                               border border-[var(--color-bg-primary)]
                               text-[var(--color-text-primary)]"
                                            />
                                            <span>-</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={antiBanConfig.max_delay_secs}
                                                onChange={(e) => setAntiBanConfig({ ...antiBanConfig, max_delay_secs: parseInt(e.target.value) || 0 })}
                                                className="w-14 px-2 py-1 text-sm rounded text-center
                               bg-[var(--color-bg-tertiary)]
                               border border-[var(--color-bg-primary)]
                               text-[var(--color-text-primary)]"
                                            />
                                            <span>seconds</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Actions (Fixed at bottom) */}
                        <div className="p-5 border-t border-[var(--color-bg-tertiary)] flex gap-2 no-drag">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 text-sm rounded cursor-pointer
                         bg-[var(--color-bg-tertiary)]
                         text-[var(--color-text-secondary)]
                         hover:bg-[var(--color-bg-primary)]
                         hover:text-[var(--color-text-primary)]
                         transition-all active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || saved}
                                className={`flex-1 px-4 py-2 text-sm rounded font-medium flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer
                                ${saved
                                        ? "bg-[var(--color-success)] text-white shadow-[0_0_15px_rgba(80,250,123,0.3)] animate-pop"
                                        : "bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:shadow-[0_0_15px_rgba(255,121,198,0.3)] hover:brightness-110"
                                    }
                                active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {saved ? (
                                    <>
                                        <Check size={14} />
                                        Saved!
                                    </>
                                ) : saving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Settings"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
