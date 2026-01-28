import { create } from "zustand";

/** Download status states */
export type DownloadStatus =
    | "idle"
    | "validating"
    | "downloading"
    | "converting"
    | "success"
    | "error";

/** Log levels */
export type LogLevel = "info" | "warn" | "error" | "success";

/** Audio format options */
export type AudioFormat = "mp3" | "flac";

/** Theme options */
export type Theme = "light" | "dark";

/** Download metadata returned from backend */
export interface DownloadMetadata {
    title: string;
    artist: string | null;
    album: string | null;
    duration: number | null;
    thumbnailPath: string | null;
    outputPath: string;
}

/** Error details */
export interface DownloadError {
    code: string;
    message: string;
}

/** Discriminated union for status-dependent data */
type DownloadProcessState =
    | { status: "idle" | "validating" | "downloading" | "converting"; metadata: DownloadMetadata | null; error: null }
    | { status: "success"; metadata: DownloadMetadata; error: null }
    | { status: "error"; metadata: DownloadMetadata | null; error: DownloadError };

/** Common state fields */
interface CommonState {
    progress: number;
    url: string;
    format: AudioFormat;

    // Safety gate
    dailyDownloads: number;
    isGateWarning: boolean;
    gateBypass: boolean;

    // Settings
    downloadPath: string | null;
    theme: Theme;

    // Logs for terminal view
    logs: Array<{
        timestamp: Date;
        level: LogLevel;
        message: string;
    }>;
}

/** Complete store state */
type DownloadState = DownloadProcessState & CommonState & {
    // Actions
    setUrl: (url: string) => void;
    setFormat: (format: AudioFormat) => void;
    setStatus: (status: DownloadStatus) => void;
    setProgress: (progress: number) => void;
    setMetadata: (metadata: DownloadMetadata | null) => void;
    setError: (error: DownloadError | null) => void;
    addLog: (level: LogLevel, message: string) => void;
    clearLogs: () => void;
    setDailyDownloads: (count: number) => void;
    setGateWarning: (warning: boolean) => void;
    setGateBypass: (bypass: boolean) => void;
    setDownloadPath: (path: string | null) => void;
    setTheme: (theme: Theme) => void;
    reset: () => void;
};

const initialState: DownloadProcessState & CommonState = {
    status: "idle",
    metadata: null,
    error: null,
    progress: 0,
    url: "",
    format: "mp3",
    dailyDownloads: 0,
    isGateWarning: false,
    gateBypass: false,
    downloadPath: null,
    theme: "light",
    logs: [],
};

export const useDownloadStore = create<DownloadState>((set) => ({
    ...initialState,

    setUrl: (url) => set({ url }),

    setFormat: (format) => set({ format }),

    setStatus: (status) => set((state) => {
        // Clear metadata only when going back to idle
        const metadata = status === "idle" ? null : state.metadata;
        const error = status === "error" ? state.error : null;
        return { ...state, status, metadata, error } as any;
    }),

    setProgress: (progress) => set({ progress: Math.min(100, Math.max(0, progress)) }),

    setMetadata: (metadata) => set((state) => {
        if (!metadata) return state;

        // If we already have a success status, just update metadata (e.g. adding outputPath)
        // If we are currently downloading, keep downloading status but store metadata
        const nextStatus = state.status === "success" || state.status === "idle" ? "success" : state.status;

        return {
            ...state,
            status: nextStatus,
            metadata: metadata,
            error: null
        } as DownloadState;
    }),

    setError: (error) => set((state) => {
        if (error) {
            return { ...state, status: "error", error };
        }
        return state;
    }),

    addLog: (level, message) => set((state) => ({
        logs: [
            ...state.logs.slice(-999), // Keep last 1000 logs
            { timestamp: new Date(), level, message }
        ]
    })),

    clearLogs: () => set({ logs: [] }),

    setDailyDownloads: (count) => set({
        dailyDownloads: count,
        isGateWarning: count >= 45
    }),

    setGateWarning: (isGateWarning) => set({ isGateWarning }),

    setGateBypass: (gateBypass) => set({ gateBypass }),

    setDownloadPath: (downloadPath) => set({ downloadPath }),

    setTheme: (theme) => set({ theme }),

    reset: () => set({
        ...initialState,
    }),
}));

