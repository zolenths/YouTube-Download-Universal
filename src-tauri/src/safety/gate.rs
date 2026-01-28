//! Safety Gate logic for download limits and IP protection

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "safety_gate.json";
/// Maximum downloads per day before strict locking. 
/// 40 is a safe threshold for most residential IPs to avoid YouTube 429 rate-limiting.
const DAILY_LIMIT: u32 = 40;
/// Threshold to start warning the user about potential IP rate-limiting.
/// 25 allows for a safe "warm-up" period before reaching the strict limit.
const WARNING_THRESHOLD: u32 = 25;

/// Safety gate status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GateStatus {
    /// Under threshold, safe to proceed
    Open,
    /// Approaching limit, show warning
    Warning,
    /// At or over limit
    Locked,
}

/// Persistent safety gate data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SafetyGateData {
    /// Number of downloads today
    pub daily_count: u32,
    /// Date of the count (for daily reset)
    pub count_date: Option<String>,
    /// Whether user has bypassed the warning
    pub bypass_enabled: bool,
}

impl SafetyGateData {
    /// Get today's date as string
    fn today_string() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    /// Check if the stored date is today
    fn is_today(&self) -> bool {
        self.count_date
            .as_ref()
            .map(|date| date == &Self::today_string())
            .unwrap_or(false)
    }

    /// Reset count if it's a new day
    pub fn check_daily_reset(&mut self) {
        if !self.is_today() {
            self.daily_count = 0;
            self.count_date = Some(Self::today_string());
            self.bypass_enabled = false;
        }
    }

    /// Increment the download counter
    pub fn increment(&mut self) {
        self.check_daily_reset();
        self.daily_count += 1;
    }

    /// Get the current gate status
    pub fn get_status(&self) -> GateStatus {
        if self.daily_count >= DAILY_LIMIT && !self.bypass_enabled {
            GateStatus::Locked
        } else if self.daily_count >= WARNING_THRESHOLD && !self.bypass_enabled {
            GateStatus::Warning
        } else {
            GateStatus::Open
        }
    }
}

/// Load safety gate data from store
pub fn load_gate_data<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> SafetyGateData {
    let store = match app.store(STORE_PATH) {
        Ok(s) => s,
        Err(_) => return SafetyGateData::default(),
    };

    let mut data: SafetyGateData = store
        .get("safety_gate")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();

    // Check for daily reset
    data.check_daily_reset();
    data
}

/// Save safety gate data to store
pub fn save_gate_data<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    data: &SafetyGateData,
) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(
        "safety_gate",
        serde_json::to_value(data).map_err(|e| format!("Serialization error: {}", e))?,
    );

    store.save().map_err(|e| format!("Save error: {}", e))?;

    Ok(())
}

/// Get current download count
pub fn get_download_count<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> u32 {
    let data = load_gate_data(app);
    data.daily_count
}

/// Check if download should proceed
pub fn should_allow_download<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> GateStatus {
    let data = load_gate_data(app);
    data.get_status()
}

/// Record a successful download
pub fn record_download<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<u32, String> {
    let mut data = load_gate_data(app);
    data.increment();
    save_gate_data(app, &data)?;
    Ok(data.daily_count)
}

/// Set bypass mode
pub fn set_bypass<R: tauri::Runtime>(app: &tauri::AppHandle<R>, enabled: bool) -> Result<(), String> {
    let mut data = load_gate_data(app);
    data.bypass_enabled = enabled;
    save_gate_data(app, &data)
}
