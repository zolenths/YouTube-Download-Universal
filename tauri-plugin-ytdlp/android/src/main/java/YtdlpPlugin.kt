package com.sushi.ytdlp

import android.app.Activity
import android.os.Environment
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Channel

import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import com.yausername.youtubedl_android.mapper.VideoInfo

import kotlinx.coroutines.*
import java.io.File

private const val TAG = "YtdlpPlugin"

@InvokeArg
class DownloadArgs {
    var url: String = ""
    var format: String = "mp3"  // mp3, m4a, opus
    var quality: String = "192"  // audio quality
    var outputDir: String? = null
    var onProgress: Channel? = null
}

@InvokeArg
class ExtractInfoArgs {
    var url: String = ""
}

@InvokeArg
class UpdateArgs {
    var channel: String = "stable"  // stable, nightly
}

@TauriPlugin
class YtdlpPlugin(private val activity: Activity) : Plugin(activity) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    @Volatile
    private var isInitialized = false
    private val initLock = Object()

    override fun load(webView: android.webkit.WebView) {
        super.load(webView)
        // Initialize synchronously to avoid race conditions
        initYtdlpSync()
    }

    private fun initYtdlpSync() {
        if (isInitialized) return
        
        synchronized(initLock) {
            if (isInitialized) return
            try {
                // Run synchronously on current thread
                kotlinx.coroutines.runBlocking {
                    YoutubeDL.getInstance().init(activity.application)
                }
                Log.i(TAG, "YoutubeDL initialized successfully")
                isInitialized = true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize YoutubeDL: ${e.message}")
            }
        }
    }
    
    private fun ensureInitialized() {
        if (!isInitialized) {
            initYtdlpSync()
        }
        if (!isInitialized) {
            throw IllegalStateException("YoutubeDL not initialized")
        }
    }

    @Command
    fun extractInfo(invoke: Invoke) {
        val args = invoke.parseArgs(ExtractInfoArgs::class.java)
        
        scope.launch {
            try {
                ensureInitialized()
                val request = YoutubeDLRequest(args.url)
                request.addOption("--dump-json")
                request.addOption("--no-download")
                
                val result = YoutubeDL.getInstance().getInfo(args.url)
                
                val ret = JSObject()
                ret.put("title", result.title ?: "Unknown")
                ret.put("duration", (result.duration ?: 0).toInt())
                ret.put("uploader", result.uploader ?: "Unknown")
                ret.put("thumbnail", result.thumbnail ?: "")
                ret.put("url", args.url)
                
                withContext(Dispatchers.Main) {
                    invoke.resolve(ret)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Extract info failed: ${e.message}")
                withContext(Dispatchers.Main) {
                    invoke.reject("Failed to extract info: ${e.message}")
                }
            }
        }
    }

    @Command
    fun download(invoke: Invoke) {
        val args = invoke.parseArgs(DownloadArgs::class.java)
        val progressChannel = args.onProgress
        
        scope.launch {
            try {
                ensureInitialized()
                // Determine output directory
                val outputDir = if (args.outputDir != null) {
                    File(args.outputDir!!)
                } else {
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)
                }
                
                if (!outputDir.exists()) {
                    outputDir.mkdirs()
                }

                val request = YoutubeDLRequest(args.url)
                
                // Audio extraction options
                request.addOption("-x")  // Extract audio
                request.addOption("--audio-format", args.format)
                request.addOption("--audio-quality", args.quality)
                
                // Output template
                request.addOption("-o", "${outputDir.absolutePath}/%(title)s.%(ext)s")
                
                // Embed metadata
                request.addOption("--embed-thumbnail")
                request.addOption("--add-metadata")
                
                // Progress callback
                val response = YoutubeDL.getInstance().execute(request) { progress, etaInSeconds, line ->
                    val progressObj = JSObject()
                    progressObj.put("progress", progress)
                    progressObj.put("eta", etaInSeconds)
                    progressObj.put("line", line)
                    progressChannel?.send(progressObj)
                }
                
                val ret = JSObject()
                ret.put("success", true)
                ret.put("output", response.out)
                ret.put("exitCode", response.exitCode)
                
                withContext(Dispatchers.Main) {
                    invoke.resolve(ret)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Download failed: ${e.message}")
                withContext(Dispatchers.Main) {
                    invoke.reject("Download failed: ${e.message}")
                }
            }
        }
    }

    @Command
    fun updateYtdlp(invoke: Invoke) {
        val args = invoke.parseArgs(UpdateArgs::class.java)
        
        scope.launch {
            try {
                val status = when (args.channel) {
                    "nightly" -> YoutubeDL.getInstance().updateYoutubeDL(
                        activity.application,
                        YoutubeDL.UpdateChannel.NIGHTLY
                    )
                    else -> YoutubeDL.getInstance().updateYoutubeDL(
                        activity.application,
                        YoutubeDL.UpdateChannel.STABLE
                    )
                }
                
                val ret = JSObject()
                ret.put("updated", status == YoutubeDL.UpdateStatus.DONE)
                ret.put("status", status?.name ?: "UNKNOWN")
                
                withContext(Dispatchers.Main) {
                    invoke.resolve(ret)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Update failed: ${e.message}")
                withContext(Dispatchers.Main) {
                    invoke.reject("Update failed: ${e.message}")
                }
            }
        }
    }
    
    @Command
    fun getVersion(invoke: Invoke) {
        scope.launch {
            try {
                val version = YoutubeDL.getInstance().version(activity.application)
                
                val ret = JSObject()
                ret.put("version", version ?: "unknown")
                
                withContext(Dispatchers.Main) {
                    invoke.resolve(ret)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    invoke.reject("Failed to get version: ${e.message}")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
