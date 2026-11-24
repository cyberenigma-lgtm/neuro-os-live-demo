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
      graphics_adapter_path: "emu/v86-bochs-vga.js?v=13",
      screen_container:      document.getElementById("screen_container"),
      memory_size:    1024 * 1024 * 1024,
      vram_size:        16 * 1024 * 1024,
      bios:     { url: "emu/seabios.bin" },
      vga_bios: { url: "emu/vgabios.bin" },
      cdrom:    { buffer: isoBuffer },
      net_device:      { type: "none" },
      disable_speaker: true,
      autostart: true,
    });
    window.emulatorInstance = emulatorInstance;

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

    // Screen mode changes — v64 passes [w, h, bpp] as array in first arg
    emulatorInstance.add_listener("screen-set-size", function(data) {
      const w   = Array.isArray(data) ? data[0] : data;
      const h   = Array.isArray(data) ? data[1] : arguments[1];
      const bpp = Array.isArray(data) ? data[2] : arguments[2];
      const msg = "Screen mode: " + w + "×" + h + " " + bpp + "bpp — VBE active ✅";
      setProgress(100, msg);
      console.log("[VBE]", msg);
      if (serialLog) serialLog.textContent += "\n[VBE] " + msg + "\n";

      // If graphical mode, hide text div and show canvas
      if (bpp > 0 || w >= 640) {
        const textDiv = document.querySelector("#screen_container > div");
        const canvas = document.querySelector("#screen_container > canvas");
        if (textDiv) textDiv.style.display = "none";
        if (canvas) canvas.style.display = "block";
      }
    });

    // Emulator errors
    emulatorInstance.add_listener("emulator-error", function(err) {
      console.error("[EMU ERROR]", err);
      setProgress(100, "Emulator error: " + err.message);
      if (serialLog) serialLog.textContent += "\n[ERROR] " + err.message + "\n";
    });

    emulatorInstance.add_listener("emulator-started", function() {
      console.log("[EMU] Started OK");
      setInterval(() => {
        if (!emulatorInstance || !emulatorInstance.v86) return;
        const cpu = emulatorInstance.v86.cpu;
        if (!cpu) return;
        const rip = (cpu.instruction_pointer && cpu.instruction_pointer[0]) ? cpu.instruction_pointer[0].toString(16) : "?";
        const ic = (cpu.instruction_counter && cpu.instruction_counter[0]) ? cpu.instruction_counter[0] : 0;
        let rdi = "?", rsi = "?", cr3 = "?";
        try {
          if (cpu.reg32) {
            const rdi_lo = cpu.reg32[7] >>> 0;
            const rsi_lo = cpu.reg32[6] >>> 0;
            const rdi_hi = cpu.x64_gpr_hi ? (cpu.x64_gpr_hi[7] >>> 0) : 0;
            const rsi_hi = cpu.x64_gpr_hi ? (cpu.x64_gpr_hi[6] >>> 0) : 0;
            rdi = "0x" + (rdi_hi ? rdi_hi.toString(16) : "") + rdi_lo.toString(16).padStart(8, "0");
            rsi = "0x" + (rsi_hi ? rsi_hi.toString(16) : "") + rsi_lo.toString(16).padStart(8, "0");
          }
          if (cpu.cr && cpu.cr[3]) cr3 = "0x" + (cpu.cr[3] >>> 0).toString(16);
        } catch(e) {}
        const canvas = document.querySelector("#screen_container canvas");
        let pxInfo = "no-canvas";
        if (canvas && canvas.width && canvas.height) {
          try {
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            const p_top = ctx.getImageData(640, 26, 1, 1).data;
            const p_mid = ctx.getImageData(640, 360, 1, 1).data;
            const p_bot = ctx.getImageData(640, 700, 1, 1).data;
            pxInfo = `top(${p_top[0]},${p_top[1]},${p_top[2]}) mid(${p_mid[0]},${p_mid[1]},${p_mid[2]}) bot(${p_bot[0]},${p_bot[1]},${p_bot[2]})`;
          } catch(e) { pxInfo = e.message; }
        }
        console.log(`[CPU-HEARTBEAT] RIP=0x${rip} RDI=${rdi} RSI=${rsi} CR3=${cr3} | Canvas: ${pxInfo}`);
      }, 3000);
    });

    setProgress(100, "NEURO-OS Live Demo Running [1024 MB RAM | VBE Linear Framebuffer | x86_64]");

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
