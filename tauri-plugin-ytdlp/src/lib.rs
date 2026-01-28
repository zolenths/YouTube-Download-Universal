use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
pub mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Ytdlp;
#[cfg(mobile)]
use mobile::Ytdlp;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the ytdlp APIs.
pub trait YtdlpExt<R: Runtime> {
  fn ytdlp(&self) -> &Ytdlp<R>;
}

impl<R: Runtime, T: Manager<R>> crate::YtdlpExt<R> for T {
  fn ytdlp(&self) -> &Ytdlp<R> {
    self.state::<Ytdlp<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("ytdlp")
        .invoke_handler(tauri::generate_handler![
            commands::download,
            commands::extract_info,
            commands::update_ytdlp,
            commands::get_version
        ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let ytdlp = mobile::init(app, api)?;
      #[cfg(desktop)]
      let ytdlp = desktop::init(app, api)?;
      app.manage(ytdlp);
      Ok(())
    })
    .build()
}
