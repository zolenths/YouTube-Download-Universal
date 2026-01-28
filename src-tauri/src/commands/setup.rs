use crate::sidecar::manager::{self, SidecarType};
use crate::state::AppState;
use serde::Serialize;

/// Status of all required sidecars
#[derive(Debug, Clone, Serialize)]
pub struct SidecarStatus {
    pub yt_dlp: bool,
    pub ffmpeg: bool,
}

#[tauri::command]
pub async fn check_sidecar_status(app: tauri::AppHandle) -> SidecarStatus {
    #[cfg(target_os = "android")]
    {
        return SidecarStatus {
            yt_dlp: true,
            ffmpeg: true,
        };
    }

    #[cfg(not(target_os = "android"))]
    SidecarStatus {
        yt_dlp: manager::is_sidecar_available(&app, SidecarType::YtDlp),
        ffmpeg: manager::is_sidecar_available(&app, SidecarType::Ffmpeg),
    }
}

#[tauri::command]
pub async fn install_sidecar(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // Download yt-dlp first
    manager::download_binary(&app, SidecarType::YtDlp, &state.http_client)
        .await
        .map_err(|e| e.to_string())?;
    
    // Then download and extract ffmpeg
    manager::download_ffmpeg(&app, &state.http_client)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}
