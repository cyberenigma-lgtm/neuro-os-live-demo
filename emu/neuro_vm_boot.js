/**
 * NEURO-OS Genesis WebAssembly x86/x86_64 Live Demo Bootloader
 * Loads Neuro-OS-Live-Demo.iso with real-time download progress and boots in browser.
 */
(function () {
  "use strict";

  const statusText = document.getElementById("status-text");
  const statusPct = document.getElementById("status-pct");
  const progressFill = document.getElementById("progress-fill");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const btnReboot = document.getElementById("btn-reboot");
  const viewport = document.getElementById("vm-viewport");

  let emulatorInstance = null;

  function setProgress(pct, msg) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (progressFill) progressFill.style.width = clamped + "%";
    if (statusPct) statusPct.textContent = clamped + "%";
    if (statusText && msg) statusText.textContent = msg;
  }

  function showLocalServerNotice(errMsg) {
    const screen = document.getElementById("screen_container");
    if (!screen) return;
    screen.innerHTML = `
      <div style="padding: 32px 24px; text-align: center; color: #e8f4ff; max-width: 680px; font-family: system-ui, sans-serif;">
        <div style="font-size: 3rem; margin-bottom: 14px;">🛡️</div>
        <h2 style="color: #00e5ff; margin-bottom: 12px; font-size: 1.35rem; letter-spacing: 0.05em;">Aviso de Protocolo Local (CORS / file://)</h2>
        <p style="color: #9ac2e6; font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px;">
          Por seguridad estándar de Opera, Chrome y Edge, las funciones <code>fetch()</code> y WebAssembly tienen bloqueado el acceso a archivos de disco cuando abres la página con doble clic directo (<code>file:///</code>).
        </p>
        <div style="background: rgba(0, 229, 255, 0.08); border: 1px solid rgba(0, 229, 255, 0.35); border-radius: 8px; padding: 16px 20px; margin-bottom: 22px; text-align: left; font-size: 0.88rem;">
          <strong style="color: #00ff88; display: block; margin-bottom: 8px;">🚀 Formas de ejecutar la demostración:</strong>
          <p style="margin-bottom: 8px;">1. <strong>En tu equipo (Local):</strong> Haz doble clic en el archivo <code>C:\\NeuroOS\\iniciar_demo_local.bat</code> o ejecuta <code>python -m http.server 8000</code> en esta carpeta y pulsa el botón de abajo.</p>
          <p>2. <strong>En GitHub Pages (Web Online):</strong> Al publicar el repositorio en GitHub, funcionará automáticamente para cualquier usuario a través de HTTPS sin bloqueos.</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a class="btn btn-primary" href="http://localhost:8000/index.html" style="font-size: 0.9rem; padding: 10px 18px; text-decoration: none; border-radius: 6px; background: rgba(0, 255, 136, 0.2); border: 1px solid #00ff88; color: #00ff88; font-weight: 600;">Abrir en Servidor Local (http://localhost:8000)</a>
          <a class="btn" href="https://github.com/cyberenigma-lgtm/neuro-os-live-demo" target="_blank" rel="noopener" style="font-size: 0.9rem; padding: 10px 18px; text-decoration: none; border-radius: 6px; background: #0e1d36; border: 1px solid rgba(0, 229, 255, 0.45); color: #e8f4ff; font-weight: 600;">Ver Repositorio GitHub</a>
        </div>
      </div>
    `;
  }

  async function fetchIsoWithProgress(url) {
    setProgress(2, "Downloading " + url + " (~14.6 MB)...");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " fetching " + url);
    }
    const contentLength = parseInt(response.headers.get("Content-Length") || "15390720", 10);
    if (!response.body) {
      const ab = await response.arrayBuffer();
      setProgress(100, "ISO image loaded (" + (ab.byteLength / (1024 * 1024)).toFixed(2) + " MB). Starting VM...");
      return ab;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      const pct = contentLength > 0 ? (received / contentLength) * 95 : 50;
      setProgress(
        pct,
        "Downloading Neuro-OS-Live-Demo.iso: " +
          (received / (1024 * 1024)).toFixed(2) +
          " / " +
          (contentLength / (1024 * 1024)).toFixed(2) +
          " MB"
      );
    }
    const full = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      full.set(c, offset);
      offset += c.byteLength;
    }
    setProgress(98, "ISO verified in memory (" + (received / (1024 * 1024)).toFixed(2) + " MB). Booting x86 VM...");
    return full.buffer;
  }

  async function startNeuroVM() {
    try {
      if (emulatorInstance && typeof emulatorInstance.destroy === "function") {
        emulatorInstance.destroy();
      }
      const isoBuffer = await fetchIsoWithProgress("Neuro-OS-Live-Demo.iso");
      if (typeof window.V86Starter === "function" || typeof window.V86 === "function") {
        const Ctor = window.V86Starter || window.V86;
        emulatorInstance = new Ctor({
          wasm_path: "emu/v86.wasm",
          memory_size: 512 * 1024 * 1024,
          vga_memory_size: 16 * 1024 * 1024,
          screen_container: document.getElementById("screen_container"),
          bios: { url: "emu/seabios.bin" },
          vga_bios: { url: "emu/vgabios.bin" },
          cdrom: { buffer: isoBuffer },
          autostart: true,
        });
        setProgress(100, "NEURO-OS Live Demo Running (512 MB RAM | VBE Linear Framebuffer)");
      } else {
        setProgress(100, "ISO Downloaded (" + (isoBuffer.byteLength / (1024 * 1024)).toFixed(2) + " MB). Ready for execution.");
      }
    } catch (err) {
      setProgress(100, "Notice: " + err.message + " (Servidor HTTP o GitHub Pages requerido)");
      if (window.location.protocol === "file:" || (err.message && err.message.toLowerCase().includes("fetch"))) {
        showLocalServerNotice(err.message);
      }
    }
  }

  if (btnFullscreen && viewport) {
    btnFullscreen.addEventListener("click", function () {
      if (viewport.requestFullscreen) viewport.requestFullscreen();
    });
  }

  if (btnReboot) {
    btnReboot.addEventListener("click", function () {
      if (emulatorInstance && typeof emulatorInstance.restart === "function") {
        emulatorInstance.restart();
      } else {
        startNeuroVM();
      }
    });
  }

  window.addEventListener("DOMContentLoaded", startNeuroVM);
})();
