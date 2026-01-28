use serde::{Deserialize, Serialize};

// Download request/response
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub url: String,
    pub format: Option<String>,      // mp3, m4a, opus
    pub quality: Option<String>,     // audio quality
    pub output_dir: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResponse {
    pub success: bool,
    pub output: Option<String>,
    pub exit_code: Option<i32>,
}

// Extract info request/response
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractInfoRequest {
    pub url: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractInfoResponse {
    pub title: String,
    pub duration: Option<i64>,
    pub uploader: Option<String>,
    pub thumbnail: Option<String>,
    pub url: String,
}

// Update request/response
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequest {
    pub channel: Option<String>,  // stable or nightly
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResponse {
    pub updated: bool,
    pub status: String,
}

// Version response
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionResponse {
    pub version: String,
}

// Progress event
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub progress: f32,
    pub eta: Option<i64>,
    pub line: Option<String>,
}
