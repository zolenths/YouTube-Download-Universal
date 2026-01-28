use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::Result;
use crate::YtdlpExt;

#[command]
pub(crate) async fn download<R: Runtime>(
    app: AppHandle<R>,
    payload: DownloadRequest,
) -> Result<DownloadResponse> {
    app.ytdlp().download(payload)
}

#[command]
pub(crate) async fn extract_info<R: Runtime>(
    app: AppHandle<R>,
    payload: ExtractInfoRequest,
) -> Result<ExtractInfoResponse> {
    app.ytdlp().extract_info(payload)
}

#[command]
pub(crate) async fn update_ytdlp<R: Runtime>(
    app: AppHandle<R>,
    payload: UpdateRequest,
) -> Result<UpdateResponse> {
    app.ytdlp().update_ytdlp(payload)
}

#[command]
pub(crate) async fn get_version<R: Runtime>(
    app: AppHandle<R>,
) -> Result<VersionResponse> {
    app.ytdlp().get_version()
}
