//! Download command handling
//! Manages yt-dlp execution and progress parsing

use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use thiserror::Error;

use crate::proxy;
use crate::safety;
use crate::sidecar::{get_sidecar_path, SidecarType};

#[cfg(target_os = "android")]
use tauri_plugin_ytdlp::YtdlpExt;
#[cfg(target_os = "android")]
use tauri_plugin_ytdlp::models as plugin_models;

/// Cached regex for progress parsing - compiled once, used many times
static PROGRESS_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\[download\]\s+(\d+\.?\d*)%").expect("Invalid progress regex")
});

/// Audio format options
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    Mp3,
    Flac,
}

impl AudioFormat {
    fn as_str(&self) -> &'static str {
        match self {
            AudioFormat::Mp3 => "mp3",
            AudioFormat::Flac => "flac",
        }
    }

    fn quality_args(&self) -> Vec<&'static str> {
        match self {
            AudioFormat::Mp3 => vec!["--audio-quality", "0"], // Best quality
            AudioFormat::Flac => vec!["--audio-quality", "0"],
        }
    }
}

/// Download result returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub title: String,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<u64>,
    #[serde(rename = "thumbnailPath")]
    pub thumbnail_path: Option<String>,
    #[serde(rename = "outputPath")]
    pub output_path: String,
}

/// Download error types
#[derive(Debug, Error)]
pub enum DownloadError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Sidecar error: {0}")]
    SidecarError(String),

    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("Safety gate locked")]
    GateLocked,
}

impl Serialize for DownloadError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Progress event payload
#[derive(Clone, Serialize)]
struct ProgressPayload {
    progress: f64,
    status: String,
}

/// Log event payload
#[derive(Clone, Serialize)]
struct LogPayload {
    level: String,
    message: String,
}

/// Validate URL format
fn validate_url(url: &str) -> Result<(), DownloadError> {
    // Basic URL validation - yt-dlp handles the rest
    if url.is_empty() {
        return Err(DownloadError::InvalidUrl("URL cannot be empty".to_string()));
    }

    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(DownloadError::InvalidUrl(
            "URL must start with http:// or https://".to_string(),
        ));
    }

    Ok(())
}

/// Get download directory
fn get_download_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> PathBuf {
    use tauri_plugin_store::StoreExt;
    
    // 1. Try to get custom path from store
    if let Ok(store) = app.store("settings.bin") {
        if let Some(config) = store.get("downloadPath").and_then(|v| v.as_str().map(|s| s.to_string())) {
            if !config.is_empty() {
                let path = PathBuf::from(config);
                if path.exists() {
                    return path;
                }
            }
        }
    }

    // 2. Fallback to user's download directory, then app data
    dirs::download_dir().unwrap_or_else(|| {
        app.path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("downloads")
    })
}

/// Get current download path from store
#[tauri::command]
pub fn get_download_path(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("settings.bin").map_err(|e| format!("Failed to open store: {}", e))?;
    
    Ok(store.get("downloadPath")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default())
}

/// Set download path in store
#[tauri::command]
pub fn set_download_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    
    // Validate that the path exists and is a directory
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("Directory does not exist".to_string());
    }
    if !p.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let store = app.store("settings.bin").map_err(|e| format!("Failed to open store: {}", e))?;
    
    store.set("downloadPath", serde_json::json!(path));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Parse progress from yt-dlp output (uses cached regex for performance)
fn parse_progress(line: &str) -> Option<f64> {
    // Match patterns like "[download]  45.2% of 10.24MiB"
    PROGRESS_REGEX
        .captures(line)
        .and_then(|caps| caps.get(1))
        .and_then(|m| m.as_str().parse::<f64>().ok())
}

/// Start download command
#[tauri::command]
pub async fn start_download(
    url: String,
    format: AudioFormat,
    app: tauri::AppHandle,
) -> Result<DownloadResult, DownloadError> {
    // Validate URL
    validate_url(&url)?;

    // Check safety gate
    let gate_status = safety::should_allow_download(&app);
    if matches!(gate_status, safety::GateStatus::Locked) {
        return Err(DownloadError::GateLocked);
    }

    #[cfg(target_os = "android")]
    {
        // Android: Use the ytdlp plugin which handles progress internally
        let response = app.ytdlp().download(plugin_models::DownloadRequest {
            url: url.clone(),
            format: Some(format.as_str().to_string()),
            quality: Some("0".to_string()), // Best
            output_dir: None, // Default to Music/Downloads
        }).map_err(|e| DownloadError::DownloadFailed(e.to_string()))?;

        if !response.success {
            return Err(DownloadError::DownloadFailed(response.output.unwrap_or_else(|| "Unknown error".to_string())));
        }

        // Return result
        Ok(DownloadResult {
            title: "Download Started (Android)".to_string(), // Real info comes from get_video_info
            artist: None,
            album: None,
            duration: None,
            thumbnail_path: None,
            output_path: response.output.unwrap_or_default(),
        })
    }

    #[cfg(not(target_os = "android"))]
    {
        // Load anti-ban config and apply random delay
        let anti_ban_config = crate::anti_ban::load_config(&app);
        crate::anti_ban::apply_random_delay(&anti_ban_config).await;

        // Emit log about delay
        if anti_ban_config.enable_delays {
            let _ = app.emit(
                "download-log",
                LogPayload {
                    level: "info".to_string(),
                    message: "Applied random delay for IP protection".to_string(),
                },
            );
        }

        // Get sidecar path
        let yt_dlp_path = get_sidecar_path(&app, SidecarType::YtDlp)
            .map_err(|e| DownloadError::SidecarError(e.to_string()))?;

        // Get download directory
        let download_dir = get_download_dir(&app);
        std::fs::create_dir_all(&download_dir).ok();

        // Build output template
        let output_template = download_dir
            .join("%(title)s.%(ext)s")
            .to_string_lossy()
            .to_string();

        // Emit log
        let _ = app.emit(
            "download-log",
            LogPayload {
                level: "info".to_string(),
                message: format!("Starting download: {}", url),
            },
        );

        // Build command arguments
        let mut args: Vec<String> = vec![
            "--extract-audio".to_string(),
            "--audio-format".to_string(),
            format.as_str().to_string(),
            "--output".to_string(),
            output_template.clone(),
            "--no-playlist".to_string(),  // Single video only
            "--newline".to_string(),      // Progress on new lines
            "--no-colors".to_string(),    // Clean output for parsing
        ];

        // Add quality arguments
        for arg in format.quality_args() {
            args.push(arg.to_string());
        }

        // Add proxy arguments
        let proxy_config = crate::proxy::load_proxy_config(&app);
        if proxy_config.is_enabled() {
            args.extend(proxy_config.to_ytdlp_args());
            let _ = app.emit(
                "download-log",
                LogPayload {
                    level: "info".to_string(),
                    message: format!("Using proxy: {}:{}", proxy_config.host, proxy_config.port),
                },
            );
        }

        // Add User-Agent arguments
        let anti_ban_config = crate::anti_ban::load_config(&app);
        if anti_ban_config.rotate_user_agent {
            args.extend(anti_ban_config.to_ytdlp_args());
            let _ = app.emit(
                "download-log",
                LogPayload {
                    level: "info".to_string(),
                    message: "Using rotated User-Agent".to_string(),
                },
            );
        }

        // Add ffmpeg location (our bundled ffmpeg)
        if let Ok(ffmpeg_path) = get_sidecar_path(&app, SidecarType::Ffmpeg) {
            if let Some(bin_dir) = ffmpeg_path.parent() {
                let bin_dir_str = bin_dir.to_string_lossy().to_string();
                let _ = app.emit(
                    "download-log",
                    LogPayload {
                        level: "info".to_string(),
                        message: format!("FFmpeg location: {} (exists: {})", bin_dir_str, ffmpeg_path.exists()),
                    },
                );
                args.push("--ffmpeg-location".to_string());
                args.push(bin_dir_str);
            }
        }

        // Add URL
        args.push(url.clone());

        // Execute command using shell plugin with STREAMING output for real-time progress
        use tauri_plugin_shell::ShellExt;
        let shell = app.shell();
        let (mut rx, _child) = shell
            .command(yt_dlp_path.to_string_lossy().to_string())
            .args(&args)
            .spawn()
            .map_err(|e| DownloadError::DownloadFailed(e.to_string()))?;

        // Collect output while streaming progress updates in real-time
        let mut stdout_buffer = String::new();
        let mut stderr_buffer = String::new();
        let mut last_progress: f64 = 0.0;

        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    stdout_buffer.push_str(&line);
                    
                    // Emit progress updates in real-time
                    if let Some(progress) = parse_progress(&line) {
                        // Only emit if progress changed significantly (avoid spam)
                        if (progress - last_progress).abs() >= 0.5 || progress >= 99.0 {
                            last_progress = progress;
                            let _ = app.emit(
                                "download-progress",
                                ProgressPayload {
                                    progress,
                                    status: format!("Downloading: {:.1}%", progress),
                                },
                            );
                        }
                    }
                }
                CommandEvent::Stderr(line_bytes) => {
                    stderr_buffer.push_str(&String::from_utf8_lossy(&line_bytes));
                }
                CommandEvent::Terminated(status) => {
                    // Exit code 0 = success, anything else = failure
                    let is_success = status.code == Some(0);
                    if !is_success {
                        let error_msg = if stderr_buffer.is_empty() {
                            format!("Process exited with code {:?}", status.code)
                        } else {
                            stderr_buffer.lines().last().unwrap_or("Download failed").to_string()
                        };
                        return Err(DownloadError::DownloadFailed(error_msg));
                    }
                    break;
                }
                _ => {}
            }
        }

        let stdout = stdout_buffer;

        // Record successful download
        let _ = safety::record_download(&app);

        // Emit completion
        let _ = app.emit(
            "download-progress",
            ProgressPayload {
                progress: 100.0,
                status: "Complete!".to_string(),
            },
        );

        // Extract title from output (simplified parsing)
        let title = extract_title(&stdout).unwrap_or_else(|| "Unknown".to_string());

        // Determine output path
        let output_path = download_dir
            .join(format!("{}.{}", sanitize_filename(&title), format.as_str()))
            .to_string_lossy()
            .to_string();

        Ok(DownloadResult {
            title,
            artist: None, // TODO: Extract from metadata
            album: None,
            duration: None,
            thumbnail_path: None,
            output_path,
        })
    }
}

/// Extract title from yt-dlp output
fn extract_title(output: &str) -> Option<String> {
    // Look for "[download] Destination:" line
    for line in output.lines() {
        if line.contains("[download] Destination:") {
            return line
                .split("Destination:")
                .nth(1)
                .map(|s| s.trim().to_string());
        }
    }

    // Fallback: look for title in info lines
    for line in output.lines() {
        if line.contains("[info]") && !line.contains("http") {
            return Some(
                line.replace("[info]", "")
                    .trim()
                    .split('.')
                    .next()
                    .unwrap_or("Unknown")
                    .to_string(),
            );
        }
    }

    None
}

/// Basic filename sanitization
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}

/// yt-dlp JSON output structure
#[derive(Debug, Deserialize)]
struct YtDlpInfo {
    title: String,
    uploader: Option<String>,
    album: Option<String>,
    duration: Option<f64>,
    thumbnail: Option<String>,
}

/// Fetch video metadata without downloading
#[tauri::command]
pub async fn get_video_info(
    url: String,
    app: tauri::AppHandle,
) -> Result<DownloadResult, DownloadError> {
    // Validate URL
    validate_url(&url)?;

    #[cfg(target_os = "android")]
    {
        let response = app.ytdlp().extract_info(plugin_models::ExtractInfoRequest {
            url: url.clone(),
        }).map_err(|e| DownloadError::DownloadFailed(e.to_string()))?;

        return Ok(DownloadResult {
            title: response.title,
            artist: response.uploader,
            album: None,
            duration: response.duration.map(|d| d as u64),
            thumbnail_path: response.thumbnail,
            output_path: String::new(),
        });
    }

    #[cfg(not(target_os = "android"))]
    {
        // Get sidecar path
        let yt_dlp_path = get_sidecar_path(&app, SidecarType::YtDlp)
            .map_err(|e| DownloadError::SidecarError(e.to_string()))?;

        // Build command arguments for metadata only
        let mut args = vec![
            "--dump-json".to_string(),
            "--skip-download".to_string(),
            url.clone(),
        ];

        // Add proxy arguments if enabled
        let proxy_config = crate::proxy::load_proxy_config(&app);
        if proxy_config.is_enabled() {
            args.extend(proxy_config.to_ytdlp_args());
        }

        // Spawn command
        use tauri_plugin_shell::ShellExt;
        let (mut rx, _child) = app
            .shell()
            .sidecar(yt_dlp_path.to_string_lossy().to_string())
            .map_err(|e| DownloadError::SidecarError(e.to_string()))?
            .args(args)
            .spawn()
            .map_err(|e| DownloadError::SidecarError(e.to_string()))?;

        let mut stdout_buffer = String::new();

        // Collect stdout
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    stdout_buffer.push_str(&String::from_utf8_lossy(&line_bytes));
                }
                CommandEvent::Terminated(_) => break,
                _ => {}
            }
        }

        // Parse JSON
        let info: YtDlpInfo = serde_json::from_str(&stdout_buffer)
            .map_err(|e| DownloadError::DownloadFailed(format!("Failed to parse metadata: {}", e)))?;

        Ok(DownloadResult {
            title: info.title,
            artist: info.uploader,
            album: info.album,
            duration: info.duration.map(|d| d as u64),
            thumbnail_path: info.thumbnail,
            output_path: String::new(), // Not known yet
        })
    }
}

/// Get current download count
#[tauri::command]
pub fn get_download_count(app: tauri::AppHandle) -> u32 {
    safety::get_download_count(&app)
}

/// Set safety gate bypass
#[tauri::command]
pub fn set_gate_bypass(bypass: bool, app: tauri::AppHandle) -> Result<(), String> {
    safety::set_bypass(&app, bypass)
}

/// Get proxy configuration
#[tauri::command]
pub fn get_proxy_config(app: tauri::AppHandle) -> proxy::ProxyConfig {
    proxy::load_proxy_config(&app)
}

/// Set proxy configuration
#[tauri::command]
pub fn set_proxy_config(config: proxy::ProxyConfig, app: tauri::AppHandle) -> Result<(), String> {
    proxy::save_proxy_config(&app, &config)
}

/// Import proxies from text content
#[tauri::command]
pub fn import_proxies(content: String) -> Vec<proxy::ProxyConfig> {
    proxy::parse_proxy_list(&content)
}

/// Get anti-ban configuration
#[tauri::command]
pub fn get_anti_ban_config(app: tauri::AppHandle) -> crate::anti_ban::AntiBanConfig {
    crate::anti_ban::load_config(&app)
}

/// Set anti-ban configuration
#[tauri::command]
pub fn set_anti_ban_config(config: crate::anti_ban::AntiBanConfig, app: tauri::AppHandle) -> Result<(), String> {
    crate::anti_ban::save_config(&app, &config)
}
