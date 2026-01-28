# YouTube Download Universal

<img src="src-tauri/icons/icon.png" align="right" alt="YouTube Download Universal logo" width="120" height="120">

YouTube Download Universal is a simple and fast tool to download audio from YouTube in MP3 and FLAC format with the best possible quality.

* **Total Privacy.** No telemetry or intermediate servers. Communication is direct between your device and the content providers.
* **Safety Gate.** Intelligent limit of 50 daily downloads to protect your IP. Proxy support if you need more.
* **High-Fidelity Formats.** Direct extraction to MP3 (320kbps) and FLAC without quality loss.
* **Retro-Terminal Aesthetic.** Minimalist console-inspired interface, optimized with light and dark modes.

## Demo

<p align="center">
  <video src="https://github.com/Zolenn/YouTube-Download-Universal/blob/main/docs/preview.mp4?raw=true" width="100%" muted autoplay loop controls playsinline>
  </video>
</p>

## How it works

When opening the application for the first time, the necessary engines (`yt-dlp` and `ffmpeg`) are automatically configured. These handle communication with platforms and audio processing 100% locally on your device.

## Basic Usage

1. Copy a YouTube link.
2. Paste it into the application.
3. Press Enter.

Your files will appear directly in your system's **Music** folder.

<details>
<summary><b>Installation Instructions</b></summary>

Current support for Windows and Linux. macOS in development.

1. Download the executable from [Releases](https://github.com/YOUR_USERNAME/youtube-download-universal/releases).
2. Run the installer.
3. The first launch will automatically configure the necessary tools.
</details>

<details>
<summary><b>Development and Technical Build</b></summary>

To build the project manually:

1. Install Node.js and Rust.
2. Clone the repository.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run:
   ```bash
   npm run tauri dev
   ```
</details>

## Technical Details

<p align="left">
  <img src="https://skillicons.dev/icons?i=rust,tauri,react,ts,tailwind,framer" alt="Technologies" />
</p>

* **Backend:** Rust + Tauri v2.
* **Frontend:** React 19 + TypeScript + Tailwind CSS 4.

## Support the Project

If you find the tool useful and want to support me with my goal for my driving license (300€), you can do so here:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zolen)

---
@zolen • (ﾉ◕ヮ◕)ﾉ*:・ﾟ✧
