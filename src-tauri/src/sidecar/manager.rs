//! Sidecar management for yt-dlp and ffmpeg binaries
//! Handles detection, validation, and execution of external tools

use std::path::PathBuf;
use tauri::{Manager, Emitter};
use thiserror::Error;
use futures_util::StreamExt;
use std::io::Write;

/// Errors that can occur during sidecar operations
#[derive(Debug, Error, serde::Serialize)]
pub enum SidecarError {
    #[error("Sidecar binary not found: {0}")]
    NotFound(String),

    #[error("Failed to execute sidecar: {0}")]
    ExecutionFailed(String),

    #[error("Unsupported platform: {0}")]
    UnsupportedPlatform(String),

    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("IO error: {0}")]
    IoError(String),
}

/// Sidecar binary type
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum SidecarType {
    YtDlp,
    Ffmpeg,
}

impl SidecarType {
    /// Get the base name of the sidecar binary
    pub fn base_name(&self) -> &'static str {
        match self {
            SidecarType::YtDlp => "yt-dlp",
            SidecarType::Ffmpeg => "ffmpeg",
        }
    }

    /// Get the download URL for the binary
    pub fn download_url(&self) -> Result<&'static str, SidecarError> {
        match self {
            SidecarType::YtDlp => {
                #[cfg(target_os = "windows")]
                return Ok("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe");
                #[cfg(target_os = "linux")]
                return Ok("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp");
                #[cfg(target_os = "macos")]
                return Ok("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos");
                
                #[allow(unreachable_code)]
                Err(SidecarError::UnsupportedPlatform("Unsupported OS for yt-dlp".into()))
            },
            SidecarType::Ffmpeg => {
                // Using BtbN's static builds for Windows and gyan.dev for macOS
                #[cfg(target_os = "windows")]
                return Ok("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip");
                #[cfg(target_os = "linux")]
                return Ok("https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz");
                #[cfg(target_os = "macos")]
                return Ok("https://evermeet.cx/ffmpeg/getrelease/zip");
                
                #[allow(unreachable_code)]
                Err(SidecarError::UnsupportedPlatform("Unsupported OS for ffmpeg".into()))
            }
        }
    }
}

/// Get the current platform target triple
pub fn get_target_triple() -> Result<String, SidecarError> {
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return Ok("x86_64-pc-windows-msvc".to_string());

    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return Ok("x86_64-unknown-linux-gnu".to_string());

    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return Ok("aarch64-unknown-linux-gnu".to_string());

    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return Ok("x86_64-apple-darwin".to_string());

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return Ok("aarch64-apple-darwin".to_string());

    #[allow(unreachable_code)]
    Err(SidecarError::UnsupportedPlatform(
        "Unknown platform".to_string(),
    ))
}

/// Get the full sidecar binary name
/// For yt-dlp: uses platform suffix (yt-dlp-x86_64-pc-windows-msvc.exe)
/// For ffmpeg: uses simple name (ffmpeg.exe) as expected by yt-dlp
pub fn get_sidecar_name(sidecar_type: SidecarType) -> Result<String, SidecarError> {
    match sidecar_type {
        SidecarType::YtDlp => {
            let target = get_target_triple()?;
            let base = sidecar_type.base_name();
            #[cfg(target_os = "windows")]
            return Ok(format!("{}-{}.exe", base, target));
            #[cfg(not(target_os = "windows"))]
            return Ok(format!("{}-{}", base, target));
        }
        SidecarType::Ffmpeg => {
            // FFmpeg uses simple names that yt-dlp expects
            #[cfg(target_os = "windows")]
            return Ok("ffmpeg.exe".to_string());
            #[cfg(not(target_os = "windows"))]
            return Ok("ffmpeg".to_string());
        }
    }
}

/// Get the path where sidecars should be stored
/// Priority: app_data_dir/bin (where we download) > resource_dir/bin (bundled)
pub fn get_sidecar_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    sidecar_type: SidecarType,
) -> Result<PathBuf, SidecarError> {
    let sidecar_name = get_sidecar_name(sidecar_type)?;

    // First check app_data_dir (where we download sidecars to)
    if let Ok(app_data) = app.path().app_data_dir() {
        let app_data_path = app_data.join("bin").join(&sidecar_name);
        if app_data_path.exists() {
            return Ok(app_data_path);
        }
    }

    // Fallback to resource_dir (for bundled binaries)
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| SidecarError::NotFound(format!("Resource dir not found: {}", e)))?;

    let sidecar_path = resource_path.join("bin").join(&sidecar_name);
    
    // Return the path even if it doesn't exist (for download target)
    // But prefer app_data_dir for consistency with where we download to
    if sidecar_path.exists() {
        return Ok(sidecar_path);
    }
    
    // Return app_data_dir path as the default location for new downloads
    let default_path = app.path()
        .app_data_dir()
        .unwrap_or_else(|_| resource_path)
        .join("bin")
        .join(&sidecar_name);
    
    Ok(default_path)
}

/// Check if a sidecar is available and executable
pub fn is_sidecar_available<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    sidecar_type: SidecarType,
) -> bool {
    get_sidecar_path(app, sidecar_type)
        .map(|p| p.exists())
        .unwrap_or(false)
}

/// Download a sidecar binary with progress reporting
/// 
/// Uses a shared HTTP client from AppState for connection pooling
pub async fn download_binary<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    sidecar_type: SidecarType,
    client: &reqwest::Client,
) -> Result<(), SidecarError> {
    let url = sidecar_type.download_url()?;
    let path = get_sidecar_path(app, sidecar_type)?;
    
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| SidecarError::IoError(e.to_string()))?;
    }

    let response = client.get(url).send().await.map_err(|e| SidecarError::DownloadFailed(e.to_string()))?;
    
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut file = std::fs::File::create(&path).map_err(|e| SidecarError::IoError(e.to_string()))?;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| SidecarError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk).map_err(|e| SidecarError::IoError(e.to_string()))?;
        
        downloaded += chunk.len() as u64;
        
        // Emit progress if possible
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64) * 100.0;
            let _ = app.emit("setup-progress", serde_json::json!({
                "type": sidecar_type,
                "progress": progress,
                "status": format!("Downloading {}: {:.1}%", sidecar_type.base_name(), progress)
            }));
        }
    }

    // Set executable permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&path).map_err(|e| SidecarError::IoError(e.to_string()))?.permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&path, perms).map_err(|e| SidecarError::IoError(e.to_string()))?;
    }

    Ok(())
}

/// Download and extract FFmpeg binaries from archive
/// 
/// FFmpeg is distributed as a ZIP/TAR archive containing multiple binaries.
/// We extract only ffmpeg and ffprobe executables.
pub async fn download_ffmpeg<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    client: &reqwest::Client,
) -> Result<(), SidecarError> {
    let url = SidecarType::Ffmpeg.download_url()?;
    
    // Get the bin directory path
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| SidecarError::NotFound(format!("Resource dir not found: {}", e)))?;
    
    let bin_dir = app.path()
        .app_data_dir()
        .unwrap_or_else(|_| resource_path.clone())
        .join("bin");
    
    std::fs::create_dir_all(&bin_dir).map_err(|e| SidecarError::IoError(e.to_string()))?;
    
    // Emit starting status
    let _ = app.emit("setup-progress", serde_json::json!({
        "type": "ffmpeg",
        "progress": 0.0,
        "status": "Downloading ffmpeg..."
    }));

    // Download to temp file
    let response = client.get(url).send().await.map_err(|e| SidecarError::DownloadFailed(e.to_string()))?;
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    
    let temp_path = std::env::temp_dir().join("ffmpeg_download.zip");
    let mut file = std::fs::File::create(&temp_path).map_err(|e| SidecarError::IoError(e.to_string()))?;
    
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| SidecarError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk).map_err(|e| SidecarError::IoError(e.to_string()))?;
        
        downloaded += chunk.len() as u64;
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64) * 50.0; // 0-50% for download
            let _ = app.emit("setup-progress", serde_json::json!({
                "type": "ffmpeg",
                "progress": progress,
                "status": format!("Downloading ffmpeg: {:.1}%", progress * 2.0)
            }));
        }
    }
    drop(file);
    
    // Emit extraction status
    let _ = app.emit("setup-progress", serde_json::json!({
        "type": "ffmpeg",
        "progress": 50.0,
        "status": "Extracting ffmpeg..."
    }));
    
    // Extract from zip (Windows and macOS use zip format)
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        let file = std::fs::File::open(&temp_path).map_err(|e| SidecarError::IoError(e.to_string()))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| SidecarError::IoError(e.to_string()))?;
        
        let target = get_target_triple()?;
        
        // Find and extract ffmpeg and ffprobe
        let binaries_to_extract = if cfg!(target_os = "windows") {
            vec!["ffmpeg.exe", "ffprobe.exe"]
        } else {
            vec!["ffmpeg", "ffprobe"]
        };
        
        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| SidecarError::IoError(e.to_string()))?;
            let entry_name = entry.name().to_string();
            
            for binary in &binaries_to_extract {
                if entry_name.ends_with(binary) {
                    // Save with simple name that yt-dlp expects (ffmpeg.exe, ffprobe.exe)
                    let dest_path = bin_dir.join(binary);
                    let mut dest_file = std::fs::File::create(&dest_path)
                        .map_err(|e| SidecarError::IoError(e.to_string()))?;
                    
                    std::io::copy(&mut entry, &mut dest_file)
                        .map_err(|e| SidecarError::IoError(e.to_string()))?;
                    
                    // Set executable permissions on Unix
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let mut perms = std::fs::metadata(&dest_path)
                            .map_err(|e| SidecarError::IoError(e.to_string()))?
                            .permissions();
                        perms.set_mode(0o755);
                        std::fs::set_permissions(&dest_path, perms)
                            .map_err(|e| SidecarError::IoError(e.to_string()))?;
                    }
                    
                    break;
                }
            }
        }
    }
    
    // Linux uses tar.xz - for now emit an error asking user to install manually
    #[cfg(target_os = "linux")]
    {
        // TODO: Add tar.xz extraction support
        return Err(SidecarError::UnsupportedPlatform(
            "Linux ffmpeg auto-install not yet supported. Please install ffmpeg via your package manager: sudo apt install ffmpeg".into()
        ));
    }
    
    // Clean up temp file
    let _ = std::fs::remove_file(&temp_path);
    
    // Emit completion
    let _ = app.emit("setup-progress", serde_json::json!({
        "type": "ffmpeg",
        "progress": 100.0,
        "status": "FFmpeg installed!"
    }));
    
    Ok(())
}
