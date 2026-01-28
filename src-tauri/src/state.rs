//! Application state management
//! Shared resources following Tauri's State pattern

use reqwest::Client;

/// Global application state accessible from commands via `tauri::State`
/// 
/// Following Tauri architecture best practices, shared resources like
/// HTTP clients should be managed through app state to enable:
/// - Connection pooling
/// - Resource reuse across commands
/// - Proper lifecycle management
pub struct AppState {
    /// Shared HTTP client with connection pooling
    pub http_client: Client,
}

impl AppState {
    /// Create a new AppState with optimized HTTP client settings
    pub fn new() -> Self {
        let http_client = Client::builder()
            // Keep 5 idle connections per host for reuse
            .pool_max_idle_per_host(5)
            // 5 minute timeout for large file downloads (ffmpeg is ~80MB)
            .timeout(std::time::Duration::from_secs(300))
            // User-Agent required for GitHub downloads
            .user_agent("youtube-download-universal/1.0")
            // Build the client
            .build()
            .expect("Failed to create HTTP client");

        Self { http_client }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
