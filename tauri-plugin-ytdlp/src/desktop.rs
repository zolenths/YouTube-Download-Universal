use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Ytdlp<R>> {
    Ok(Ytdlp(app.clone()))
}

/// Access to the ytdlp APIs (desktop stub - not used, uses native binaries instead)
pub struct Ytdlp<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Ytdlp<R> {
    // Desktop doesn't use these - it uses native yt-dlp binary
    // These are stubs to satisfy the trait requirements
    
    pub fn download(&self, _payload: DownloadRequest) -> crate::Result<DownloadResponse> {
        // On desktop, we use the native yt-dlp binary, not this plugin
        Ok(DownloadResponse {
            success: false,
            output: Some("Use native yt-dlp on desktop".to_string()),
            exit_code: Some(-1),
        })
    }

    pub fn extract_info(&self, _payload: ExtractInfoRequest) -> crate::Result<ExtractInfoResponse> {
        Ok(ExtractInfoResponse {
            title: "Not implemented on desktop".to_string(),
            duration: None,
            uploader: None,
            thumbnail: None,
            url: String::new(),
        })
    }

    pub fn update_ytdlp(&self, _payload: UpdateRequest) -> crate::Result<UpdateResponse> {
        Ok(UpdateResponse {
            updated: false,
            status: "Not implemented on desktop".to_string(),
        })
    }

    pub fn get_version(&self) -> crate::Result<VersionResponse> {
        Ok(VersionResponse {
            version: "native".to_string(),
        })
    }
}
