# YouTube Download Universal

<img src="src-tauri/icons/icon.png" align="right" alt="YouTube Download Universal logo" width="120" height="120">

YouTube Download Universal es una herramienta sencilla y rápida para bajar audio de YouTube en formato MP3 y FLAC con la mejor calidad posible.

* **Privacidad total.** Sin telemetría ni servidores intermediarios. La comunicación es directa entre tu equipo y los servidores de contenido.
* **Seguridad (Safety Gate).** Límite inteligente de 50 descargas diarias para proteger tu IP. Soporte para proxies si necesitas más.
* **Formatos de alta fidelidad.** Extracción directa a MP3 (320kbps) y FLAC sin pérdida de calidad.
* **Estética Retro-Terminal.** Interfaz minimalista inspirada en la consola, optimizada con modo claro y oscuro.

## Demostración

<p align="center">
  <video src="https://github.com/Zolenn/YouTube-Download-Universal/raw/main/docs/preview.mp4" width="100%" controls autoplay loop muted></video>
</p>

## Cómo funciona

Al abrir la aplicación por primera vez, se configuran automáticamente los motores necesarios (`yt-dlp` y `ffmpeg`). Estos se encargan de la comunicación con las plataformas y del procesamiento del audio de forma 100% local en tu dispositivo.

## Uso básico

1. Copia un enlace de YouTube.
2. Pégalo en la aplicación.
3. Pulsa Enter.

Tus archivos aparecerán directamente en la carpeta **Música** de tu sistema.

<details>
<summary><b>Instrucciones de instalación</b></summary>

Soporte actual para Windows y Linux. macOS en desarrollo.

1. Descarga el ejecutable en [Releases](https://github.com/YOUR_USERNAME/youtube-download-universal/releases).
2. Ejecuta el instalador.
3. El primer inicio configurará automáticamente las herramientas necesarias.
</details>

<details>
<summary><b>Desarrollo y compilación técnica</b></summary>

Para compilar el proyecto manualmente:

1. Instala Node.js y Rust.
2. Clona el repositorio.
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Ejecuta:
   ```bash
   npm run tauri dev
   ```
</details>

## Detalles técnicos

<p align="left">
  <img src="https://skillicons.dev/icons?i=rust,tauri,react,ts,tailwind,framer" alt="Tecnologías" />
</p>

* **Backend:** Rust + Tauri v2.
* **Frontend:** React 19 + TypeScript + Tailwind CSS 4.

## Apoyo al proyecto

Si te sirve la herramienta y quieres apoyarme con mi meta para el carnet de conducir (300€), puedes hacerlo aquí:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/zolen)

---
@zolen • (ﾉ◕ヮ◕)ﾉ*:・ﾟ✧
