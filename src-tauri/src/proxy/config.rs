//! Proxy configuration and management
//! Supports HTTP and SOCKS5 proxy types

use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "proxy_config.json";

/// Proxy protocol type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    #[default]
    None,
    Http,
    Socks5,
}

/// Proxy authentication credentials
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyAuth {
    pub username: String,
    pub password: String,
}

impl ProxyAuth {
    pub fn is_empty(&self) -> bool {
        self.username.is_empty() && self.password.is_empty()
    }
}

/// Complete proxy configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProxyConfig {
    pub proxy_type: ProxyType,
    pub host: String,
    pub port: u16,
    pub auth: Option<ProxyAuth>,
}

impl ProxyConfig {
    /// Check if proxy is enabled
    pub fn is_enabled(&self) -> bool {
        self.proxy_type != ProxyType::None && !self.host.is_empty() && self.port > 0
    }

    /// Build proxy URL string
    pub fn to_url(&self) -> Option<String> {
        if !self.is_enabled() {
            return None;
        }

        let protocol = match self.proxy_type {
            ProxyType::None => return None,
            ProxyType::Http => "http",
            ProxyType::Socks5 => "socks5",
        };

        let auth_part = match &self.auth {
            Some(auth) if !auth.is_empty() => {
                format!("{}:{}@", auth.username, auth.password)
            }
            _ => String::new(),
        };

        Some(format!("{}://{}{}:{}", protocol, auth_part, self.host, self.port))
    }

    /// Build yt-dlp proxy arguments
    pub fn to_ytdlp_args(&self) -> Vec<String> {
        match self.to_url() {
            Some(url) => vec!["--proxy".to_string(), url],
            None => vec![],
        }
    }
}

/// Parse proxy list from text (one per line: host:port or protocol://host:port)
pub fn parse_proxy_list(content: &str) -> Vec<ProxyConfig> {
    content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }

            // Try parsing with protocol prefix
            if line.starts_with("http://") || line.starts_with("socks5://") {
                return parse_proxy_url(line);
            }

            // Default to HTTP if no protocol specified
            parse_host_port(line, ProxyType::Http)
        })
        .collect()
}

/// Parse a full proxy URL
fn parse_proxy_url(url: &str) -> Option<ProxyConfig> {
    let (proxy_type, rest) = if url.starts_with("socks5://") {
        (ProxyType::Socks5, url.strip_prefix("socks5://")?)
    } else if url.starts_with("http://") {
        (ProxyType::Http, url.strip_prefix("http://")?)
    } else {
        return None;
    };

    // Check for authentication
    if let Some((auth_part, host_part)) = rest.split_once('@') {
        let (username, password) = auth_part.split_once(':')?;
        let (host, port_str) = host_part.rsplit_once(':')?;
        let port = port_str.parse().ok()?;

        Some(ProxyConfig {
            proxy_type,
            host: host.to_string(),
            port,
            auth: Some(ProxyAuth {
                username: username.to_string(),
                password: password.to_string(),
            }),
        })
    } else {
        parse_host_port(rest, proxy_type)
    }
}

/// Parse host:port format
fn parse_host_port(s: &str, proxy_type: ProxyType) -> Option<ProxyConfig> {
    let (host, port_str) = s.rsplit_once(':')?;
    let port = port_str.parse().ok()?;

    Some(ProxyConfig {
        proxy_type,
        host: host.to_string(),
        port,
        auth: None,
    })
}

/// Load proxy config from store
pub fn load_proxy_config<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> ProxyConfig {
    let store = match app.store(STORE_PATH) {
        Ok(s) => s,
        Err(_) => return ProxyConfig::default(),
    };

    store
        .get("proxy")
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default()
}

/// Save proxy config to store
pub fn save_proxy_config<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    config: &ProxyConfig,
) -> Result<(), String> {
    let store = app
        .store(STORE_PATH)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(
        "proxy",
        serde_json::to_value(config).map_err(|e| format!("Serialization error: {}", e))?,
    );

    store.save().map_err(|e| format!("Save error: {}", e))?;

    Ok(())
}
