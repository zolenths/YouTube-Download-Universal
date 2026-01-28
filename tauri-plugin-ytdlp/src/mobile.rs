use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_ytdlp);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Ytdlp<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("com.sushi.ytdlp", "YtdlpPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_ytdlp)?;
    Ok(Ytdlp(handle))
}

/// Access to the ytdlp APIs.
pub struct Ytdlp<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Ytdlp<R> {
    pub fn download(&self, payload: DownloadRequest) -> crate::Result<DownloadResponse> {
        self.0
            .run_mobile_plugin("download", payload)
            .map_err(Into::into)
    }

    pub fn extract_info(&self, payload: ExtractInfoRequest) -> crate::Result<ExtractInfoResponse> {
        self.0
            .run_mobile_plugin("extractInfo", payload)
            .map_err(Into::into)
    }

    pub fn update_ytdlp(&self, payload: UpdateRequest) -> crate::Result<UpdateResponse> {
        self.0
            .run_mobile_plugin("updateYtdlp", payload)
            .map_err(Into::into)
    }

    pub fn get_version(&self) -> crate::Result<VersionResponse> {
        self.0
            .run_mobile_plugin::<VersionResponse>("getVersion", ())
            .map_err(Into::into)
    }
}
