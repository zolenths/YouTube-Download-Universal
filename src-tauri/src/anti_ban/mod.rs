//! Anti-ban protection module
//! User-Agent rotation and request delays

use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "anti_ban_config.json";

/// Common browser User-Agent strings
const USER_AGENTS: &[&str] = &[
    // Chrome Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    // Chrome macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    // Chrome Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    // Firefox Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0",
    // Firefox macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
    // Firefox Linux
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    // Edge Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
    // Safari macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    // Opera
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
    // Brave
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Brave/120",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Brave/120",
];

/// Anti-ban configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AntiBanConfig {
    /// Enable User-Agent rotation
    pub rotate_user_agent: bool,
    /// Enable random delays between requests
    pub enable_delays: bool,
    /// Minimum delay in seconds
    pub min_delay_secs: u64,
    /// Maximum delay in seconds
    pub max_delay_secs: u64,
}

impl Default for AntiBanConfig {
    fn default() -> Self {
        Self {
            rotate_user_agent: true,
            enable_delays: true,
            min_delay_secs: 1,
            max_delay_secs: 5,
        }
    }
}

impl AntiBanConfig {
    /// Get a random User-Agent string
    pub fn get_random_user_agent(&self) -> &'static str {
        if !self.rotate_user_agent {
            return USER_AGENTS[0];
        }

        let mut rng = rand::rng();
        let idx = rng.random_range(0..USER_AGENTS.len());
        USER_AGENTS[idx]
    }

    /// Get a random delay duration
    pub fn get_random_delay(&self) -> std::time::Duration {
        if !self.enable_delays || self.min_delay_secs == 0 {
            return std::time::Duration::ZERO;
        }

        let mut rng = rand::rng();
        let secs = rng.random_range(self.min_delay_secs..=self.max_delay_secs);
        std::time::Duration::from_secs(secs)
    }

    /// Build yt-dlp User-Agent arguments
    pub fn to_ytdlp_args(&self) -> Vec<String> {
        if self.rotate_user_agent {
            vec![
                "--user-agent".to_string(),
                self.get_random_user_agent().to_string(),
            ]
        } else {
            vec![]
        }
    }
}

/// Apply random delay (async)
pub async fn apply_random_delay(config: &AntiBanConfig) {
    let delay = config.get_random_delay();
    if delay > std::time::Duration::ZERO {
        tokio::time::sleep(delay).await;
    }
}

/// Load anti-ban config from store
pub fn load_config<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> AntiBanConfig {
    let store = match app.store(STORE_PATH) {
        Ok(s) => s,
        Err(_) => return AntiBanConfig::default(),
    };

    store
        .get("anti_ban")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Save anti-ban config to store
pub fn save_config<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    config: &AntiBanConfig,
) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(
        "anti_ban",
        serde_json::to_value(config).map_err(|e| format!("Serialization error: {}", e))?,
    );

    store.save().map_err(|e| format!("Save error: {}", e))?;

    Ok(())
}
