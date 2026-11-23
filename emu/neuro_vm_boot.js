/**
 * NEURO-OS Genesis — WebAssembly x86_64 Live Demo Bootloader
 * Uses v64 (64-bit v86 fork) — real x86_64 Long Mode emulation.
 */
import { V86 } from "./libv86.mjs";

const statusText    = document.getElementById("status-text");
const statusPct     = document.getElementById("status-pct");
const progressFill  = document.getElementById("progress-fill");
const btnFullscreen = document.getElementById("btn-fullscreen");
const btnReboot     = document.getElementById("btn-reboot");
const viewport      = document.getElementById("vm-viewport");

let emulatorInstance = null;

function setProgress(pct, msg) {
  const c = Math.max(0, Math.min(100, Math.round(pct)));
  if (progressFill) progressFill.style.width = c + "%";
  if (statusPct)    statusPct.textContent = c + "%";
  if (statusText && msg) statusText.textContent = msg;
}

function showError(msg) {
  const screen = document.getElementById("screen_container");
  if (!screen) return;
  if (window.location.protocol === "file:") {
    screen.innerHTML = `
      <div style="padding:32px 24px;text-align:center;color:#e8f4ff;font-family:system-ui">
        <div style="font-size:3rem;margin-bottom:14px">🛡️</div>
        <h2 style="color:#00e5ff;font-size:1.3rem">Protocolo Local Bloqueado (file://)</h2>
        <p style="color:#9ac2e6;font-size:.9rem;line-height:1.6">
          El navegador bloquea <code>fetch()</code> desde <code>file://</code>.<br>
          Abre desde un servidor HTTP o desde GitHub Pages.
        </p>
        <div style="margin-top:18px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <a href="http://localhost:8000/index.html"
             style="padding:10px 18px;border-radius:6px;background:rgba(0,255,136,.2);border:1px solid #00ff88;color:#00ff88;text-decoration:none;font-weight:600">
             Abrir en localhost:8000
          </a>
          <a href="https://cyberenigma-lgtm.github.io/neuro-os-live-demo/"
             style="padding:10px 18px;border-radius:6px;background:#0e1d36;border:1px solid rgba(0,229,255,.4);color:#e8f4ff;text-decoration:none;font-weight:600">
             Ver en GitHub Pages
          </a>
        </div>
      </div>`;
  }
}

async function fetchIsoWithProgress(url) {
  setProgress(2, "Downloading " + url + " (~14.6 MB)…");
  const response = await fetch(url);
  if (!response.ok) throw new Error("HTTP " + response.status + " fetching " + url);

  const contentLength = parseInt(response.headers.get("Content-Length") || "15390720", 10);
  if (!response.body) {
    const ab = await response.arrayBuffer();
    setProgress(97, "ISO loaded (" + (ab.byteLength / (1024 * 1024)).toFixed(1) + " MB). Starting VM…");
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
    setProgress(pct,
      "Downloading Neuro-OS-Live-Demo.iso: " +
      (received / (1024 * 1024)).toFixed(1) + " / " +
      (contentLength / (1024 * 1024)).toFixed(1) + " MB"
    );
  }
  const full = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { full.set(c, offset); offset += c.byteLength; }
  setProgress(98, "ISO verified (" + (received / (1024 * 1024)).toFixed(1) + " MB). Booting x86_64 VM…");
  return full.buffer;
}

async function startNeuroVM() {
  try {
    if (emulatorInstance) {
      if (typeof emulatorInstance.destroy === "function") emulatorInstance.destroy();
      emulatorInstance = null;
    }

    const isoBuffer = await fetchIsoWithProgress("Neuro-OS-Live-Demo.iso");

    emulatorInstance = new V86({
      wasm_path:             "emu/v86.wasm",
      graphics_adapter:      "bochs_vga",
      graphics_adapter_path: "emu/v86-bochs-vga.js",
      screen_container:      document.getElementById("screen_container"),
      memory_size:    512 * 1024 * 1024,
      vram_size:       16 * 1024 * 1024,
      bios:     { url: "emu/seabios.bin" },
      vga_bios: { url: "emu/vgabios.bin" },
      cdrom:    { buffer: isoBuffer },
      net_device:      { type: "none" },
      disable_speaker: true,
      autostart: true,
    });

    // ── Diagnostic event listeners ──────────────────────────────
    // COM1 serial output (NEURO-OS writes panics + debug here)
    const serialLog = document.getElementById("serial-log");
    let serialBuf = "";
    emulatorInstance.add_listener("serial0-output-byte", function(byte) {
      const ch = String.fromCharCode(byte);
      serialBuf += ch;
      if (ch === "\n" || serialBuf.length > 200) {
        if (serialLog) {
          serialLog.textContent += serialBuf;
          serialLog.scrollTop = serialLog.scrollHeight;
        }
        console.log("[COM1]", serialBuf.replace(/\n/g,""));
        serialBuf = "";
      }
    });

    // Screen mode changes — tells us if the VBE framebuffer was activated
    emulatorInstance.add_listener("screen-set-size", function(w, h, bpp) {
      const msg = "Screen mode: " + w + "×" + h + " " + bpp + "bpp";
      setProgress(100, msg);
      console.log("[VBE]", msg);
      if (serialLog) serialLog.textContent += "\n[VBE] " + msg + "\n";
    });

    // Emulator errors
    emulatorInstance.add_listener("emulator-error", function(err) {
      console.error("[EMU ERROR]", err);
      setProgress(100, "Emulator error: " + err.message);
      if (serialLog) serialLog.textContent += "\n[ERROR] " + err.message + "\n";
    });

    emulatorInstance.add_listener("emulator-started", function() {
      console.log("[EMU] Started OK");
    });

    setProgress(100, "NEURO-OS Live Demo Running [512 MB RAM | VBE Linear Framebuffer | x86_64]");

  } catch (err) {
    setProgress(100, "Notice: " + err.message + " (Run via HTTP server or GitHub Pages to stream ISO)");
    showError(err.message);
  }
}

// Fullscreen
if (btnFullscreen && viewport) {
  btnFullscreen.addEventListener("click", () => {
    const el = document.getElementById("screen_container");
    if (el && el.requestFullscreen) el.requestFullscreen();
    else if (viewport.requestFullscreen) viewport.requestFullscreen();
  });
}

// Reboot
if (btnReboot) {
  btnReboot.addEventListener("click", () => {
    if (emulatorInstance && typeof emulatorInstance.restart === "function") {
      emulatorInstance.restart();
    } else {
      startNeuroVM();
    }
  });
}

// Auto-boot on page load
startNeuroVM();
