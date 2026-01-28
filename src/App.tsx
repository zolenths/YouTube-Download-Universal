import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { TerminalLayout } from "@/components/Terminal/TerminalLayout";
import { InputField } from "@/components/Terminal/InputField";
import { LogViewer } from "@/components/Terminal/LogViewer";
import { ProgressBar } from "@/components/Terminal/ProgressBar";
import { KaomojiReactor } from "@/components/Kaomoji/KaomojiReactor";
import { WarningScreen } from "@/components/SafetyGate/WarningScreen";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { Sidebar, addToHistory } from "@/components/Sidebar/Sidebar";
import { InfoPage } from "@/components/Info/InfoPage";
import { BinaryDownloader } from "@/components/Setup/BinaryDownloader";
import { useShallow } from "zustand/react/shallow";
import { useDownloadStore, LogLevel, DownloadMetadata } from "@/stores/downloadStore";

import "./index.css";

/** Progress event payload from Rust backend */
interface ProgressPayload {
  progress: number;
  status: string;
}

/** Log event payload from Rust backend */
interface LogPayload {
  level: LogLevel;
  message: string;
}

const App = () => {
  const {
    setStatus,
    setProgress,
    setMetadata,
    setError,
    addLog,
    isGateWarning,
    format,
    dailyDownloads,
    setDailyDownloads,
    gateBypass,
    setGateWarning,
    theme,
  } = useDownloadStore(
    useShallow((state) => ({
      setStatus: state.setStatus,
      setProgress: state.setProgress,
      setMetadata: state.setMetadata,
      setError: state.setError,
      addLog: state.addLog,
      isGateWarning: state.isGateWarning,
      format: state.format,
      dailyDownloads: state.dailyDownloads,
      setDailyDownloads: state.setDailyDownloads,
      gateBypass: state.gateBypass,
      setGateWarning: state.setGateWarning,
      theme: state.theme,
    }))
  );

  // Apply theme class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string>("");
  const [showInfo, setShowInfo] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean | null>(null);

  // Check sidecar status on startup
  useEffect(() => {
    const isAndroid = /android/i.test(window.navigator.userAgent);

    if (isAndroid) {
      setIsSetupRequired(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const status = await invoke<{ yt_dlp: boolean; ffmpeg: boolean }>("check_sidecar_status");
        // Setup required if either tool is missing
        setIsSetupRequired(!status.yt_dlp || !status.ffmpeg);
      } catch (err) {
        console.error("Failed to check sidecar status:", err);
        setIsSetupRequired(true); // Assume setup needed if check fails
      }
    };
    checkStatus();
  }, []);

  // Listen to download progress events from Rust
  useEffect(() => {
    const unlistenProgress = listen<ProgressPayload>("download-progress", (event) => {
      setProgress(event.payload.progress);
      if (event.payload.status) {
        addLog("info", event.payload.status);
      }
    });

    const unlistenLog = listen<LogPayload>("download-log", (event) => {
      addLog(event.payload.level, event.payload.message);
    });

    return () => {
      unlistenProgress.then((unlisten) => unlisten());
      unlistenLog.then((unlisten) => unlisten());
    };
  }, [setProgress, addLog]);


  // Load initial download count from store
  useEffect(() => {
    const loadDownloadCount = async () => {
      try {
        const count = await invoke<number>("get_download_count");
        setDailyDownloads(count);
      } catch {
        // Store not available yet, use default
        setDailyDownloads(0);
      }
    };
    loadDownloadCount();
  }, [setDailyDownloads]);

  const handleDownload = useCallback(async (url: string) => {
    // Check safety gate
    if (dailyDownloads >= 25 && !gateBypass) {
      setGateWarning(true);
      return;
    }

    try {
      setStatus("validating");
      addLog("info", `Starting download for: ${url}`);
      addLog("info", `Format: ${format.toUpperCase()}`);

      // 1. Kick off metadata fetch in parallel
      const infoPromise = invoke<DownloadMetadata>("get_video_info", { url });

      // 2. Start actual download
      const downloadPromise = invoke<DownloadMetadata>("start_download", {
        url,
        format,
      });

      // 3. Handle metadata response (usually faster than download)
      infoPromise.then(info => {
        // If we haven't finished download yet, show info ASAP
        if (useDownloadStore.getState().status !== "success") {
          setMetadata(info);
          addLog("info", `Found: ${info.title} (${info.artist || "Unknown artist"})`);
        }
      }).catch(err => {
        // Log info failure but don't stop download
        console.warn("Metadata fetch failed, falling back to download results", err);
      });

      // 4. Wait for download to finish
      const result = await downloadPromise;

      // Add to history
      addToHistory(url, result.title);

      setMetadata(result);
      setStatus("success");

      addLog("success", `Downloaded: ${result.title}`);
      if (result.outputPath) {
        addLog("success", `Saved to: ${result.outputPath}`);
      }

      // Update download count
      setDailyDownloads(dailyDownloads + 1);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError({
        code: "DOWNLOAD_FAILED",
        message: errorMessage,
      });
      addLog("error", `Download failed: ${errorMessage}`);
    }
  }, [
    dailyDownloads, gateBypass, format,
    setStatus, setMetadata, setError, addLog,
    setDailyDownloads, setGateWarning
  ]);

  // Handle URL selection from history
  const handleUrlFromHistory = (url: string) => {
    setPendingUrl(url);
    setShowInfo(false); // Switch back to download view
    // Trigger download with a small delay to allow UI update
    setTimeout(() => {
      handleDownload(url);
      setPendingUrl("");
    }, 100);
  };

  return (
    <>
      <TerminalLayout
        sidebar={
          <Sidebar
            onSettingsClick={() => setIsSettingsOpen(true)}
            onUrlSelect={handleUrlFromHistory}
          />
        }
        showInfo={showInfo}
        onSetShowInfo={setShowInfo}
      >
        {showInfo ? (
          <InfoPage onBack={() => setShowInfo(false)} />
        ) : (
          <>
            {/* Kaomoji Status Indicator */}
            <KaomojiReactor />

            {/* URL Input and Controls */}
            <div className="glass rounded-xl p-5 space-y-5">
              <InputField onSubmit={handleDownload} initialUrl={pendingUrl} />

              {/* Progress Bar */}
              <ProgressBar />
            </div>

            {/* Log Viewer */}
            <div className="mt-6">
              <LogViewer />
            </div>

            {/* Download Counter - Bar Style */}
            <div className="mt-6 flex flex-col items-center">
              <div className="flex justify-between w-48 mb-1.5">
                <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-tighter font-bold">
                  IP Safety Status
                </span>
                <span className={`text-[9px] font-mono ${dailyDownloads >= 40 ? "text-red-500" :
                  dailyDownloads >= 25 ? "text-amber-500" :
                    "text-[var(--color-text-muted)] font-medium"
                  }`}>
                  {dailyDownloads}/40
                </span>
              </div>
              <div className="w-48 h-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden border border-[var(--color-bg-primary)] p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((dailyDownloads / 40) * 100, 100)}%` }}
                  className={`h-full rounded-full transition-colors duration-500 ${dailyDownloads >= 40 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" :
                    dailyDownloads >= 25 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" :
                      "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    }`}
                />
              </div>
            </div>
          </>
        )}

        {/* Safety Gate Warning Modal */}
        <AnimatePresence>
          {isGateWarning && <WarningScreen />}
        </AnimatePresence>

        {/* Binary Setup Wizard */}
        <AnimatePresence>
          {isSetupRequired && (
            <BinaryDownloader onComplete={() => setIsSetupRequired(false)} />
          )}
        </AnimatePresence>

      </TerminalLayout>

      {/* Settings Panel - Moved to root for better stacking context */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default App;
