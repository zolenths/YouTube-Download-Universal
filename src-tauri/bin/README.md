# Sidecar Binaries

This directory contains the platform-specific binaries for `yt-dlp` and `ffmpeg`.

## ⚠️ Important

These binaries are **NOT included** in the repository. You must download them separately from their official sources.

## Required Binaries

For each platform, you need the following files with exact naming:

### Windows (x86_64)
- `yt-dlp-x86_64-pc-windows-msvc.exe`
- `ffmpeg-x86_64-pc-windows-msvc.exe`

### Linux (x86_64)
- `yt-dlp-x86_64-unknown-linux-gnu`
- `ffmpeg-x86_64-unknown-linux-gnu`

### Linux (ARM64)
- `yt-dlp-aarch64-unknown-linux-gnu`
- `ffmpeg-aarch64-unknown-linux-gnu`

### macOS (x86_64)
- `yt-dlp-x86_64-apple-darwin`
- `ffmpeg-x86_64-apple-darwin`

### macOS (ARM64 / Apple Silicon)
- `yt-dlp-aarch64-apple-darwin`
- `ffmpeg-aarch64-apple-darwin`

## Download Links

### yt-dlp
- Official releases: https://github.com/yt-dlp/yt-dlp/releases
- Download the appropriate binary for your platform
- Rename it according to the naming convention above

### ffmpeg
- Official builds: https://ffmpeg.org/download.html
- Windows: https://github.com/BtbN/FFmpeg-Builds/releases
- Linux: Use your package manager or static builds
- macOS: Use Homebrew (`brew install ffmpeg`) or static builds

## Making Binaries Executable

On Linux and macOS, make the binaries executable:

```bash
chmod +x yt-dlp-*
chmod +x ffmpeg-*
```

## Note

The application checks for these binaries at runtime. If they're missing, you'll see an error message in the terminal output.
