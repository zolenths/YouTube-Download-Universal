//! YouTube Download Universal
//! Ultra-lightweight desktop tool with Retro-Terminal Cute aesthetic

mod anti_ban;
mod commands;
mod proxy;
mod safety;
mod sidecar;
mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Initialize plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        // yt-dlp plugin for Android (uses youtubedl-android library)
        .plugin(tauri_plugin_ytdlp::init())
        // Register shared app state (HTTP client with connection pooling)
        .manage(AppState::new())
        // Register commands
        .invoke_handler(tauri::generate_handler![
            commands::start_download,
            commands::get_video_info,
            commands::get_download_count,
            commands::set_gate_bypass,
            commands::get_proxy_config,
            commands::set_proxy_config,
            commands::import_proxies,
            commands::get_anti_ban_config,
            commands::set_anti_ban_config,
            commands::check_sidecar_status,
            commands::install_sidecar,
            commands::get_download_path,
            commands::set_download_path,
        ])
        // Setup hook for window customization (desktop only)
        .setup(|app| {
            #[cfg(desktop)]
            {
                // Get main window (desktop only)
                if let Some(window) = app.get_webview_window("main") {
                    // Set window properties
                    let _ = window.set_title("YouTube Download Universal");

                    // Enable transparency for glassmorphism on macOS
                    #[cfg(target_os = "macos")]
                    {
                        use tauri::TitleBarStyle;
                        let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
                    }
                }
            }
            
            // Mobile setup - nothing special needed, UI handles it
            #[cfg(mobile)]
            {
                let _ = app; // suppress unused warning
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
