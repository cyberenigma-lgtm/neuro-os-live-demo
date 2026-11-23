# 🧠 NEURO-OS Genesis — Pre-Alpha Live Demo (`x86_64` Bare-Metal)

[🇬🇧 English](#english) | [🇪🇸 Español](#español)

---

<a name="english"></a>
## 🇬🇧 English

> ⚠️ **Project Status: Very Early Stage (Pre-Alpha / Active Development)**  
> This repository hosts **only a compiled live demo build** for browser-based testing. The operating system is in a very early stage of construction, lacks many features, and is updated daily. Source code remains private/proprietary.

### What is NEURO-OS?
**NEURO-OS** is an experimental 64-bit (`x86_64`) *bare-metal* kernel written from scratch (~515 KB on disk) exploring a lightweight **multi-ABI capsule architecture** (Windows PE64, Linux ELF64, Android DEX, and macOS Mach-O) running directly over a custom microkernel without heavy virtual machines.

### What you can test in this early build
Although this is still a very basic foundation with many components under construction, this ISO image (`~14.6 MB`) already demonstrates:
- **Fast Bare-Metal Boot:** Custom 64-bit kernel with per-process `CR3` page-table isolation.
- **Experimental Graphical Environment:** Custom 2D/3D software compositor with basic window management and interactive desktop.
- **VFS Explorer & Terminal:** Basic file navigation and isolated Ring-3 (`CPL=3`) user-mode binary execution.

### What is still missing (Work in Progress)
This project is far from a finished product. Current work focuses on:
- Full compatibility with complex desktop GUI toolkits (GTK3 / advanced Win32).
- Hardware-accelerated 3D graphics (`VirtIO-GPU` / Vulkan) and broader physical hardware drivers.
- General stability and support for heavy commercial applications.

### 🤝 Want to help or test it?
This is an independent project in active evolution. If you are passionate about OS development, binary loaders (`ELF`/`PE`), device drivers, or graphics engines and want to share feedback, report bugs, or collaborate:
- **Try the live browser demo** directly via the GitHub Pages link in this repository.
- **Open an Issue** with your feedback, ideas, or collaboration proposals.

*All rights reserved — Architecture & development by **JMMC**.*

---

<a name="español"></a>
## 🇪🇸 Español

> ⚠️ **Estado del proyecto: Fase Muy Temprana (Pre-Alpha / Desarrollo Activo)**  
> Este repositorio aloja **únicamente una compilación de demostración en vivo** para pruebas desde el navegador. El sistema operativo está en una fase muy inicial de construcción, aún le faltan muchas funciones y se actualiza constantemente. El código fuente es privado/propietario.

### ¿Qué es NEURO-OS?
**NEURO-OS** es un núcleo experimental *bare-metal* de 64 bits (`x86_64`) escrito desde cero (~515 KB en disco) que explora una arquitectura de **cápsulas ligeras multi-ABI** (Windows PE64, Linux ELF64, Android DEX y macOS Mach-O) ejecutándose sobre un microkernel propio sin virtualización pesada.

### Qué puedes probar en esta compilación temprana
Aunque todavía es una base muy inicial con muchas piezas en construcción, en esta imagen ISO (`~14,6 MB`) ya puedes probar:
- **Arranque Bare-Metal en segundos:** Núcleo propio de 64 bits con aislamiento de tablas de páginas `CR3` por proceso.
- **Entorno Gráfico Experimental:** Compositor 2D/3D propio por software con gestión básica de ventanas y escritorio interactivo.
- **Explorador VFS y Terminal:** Navegación básica de archivos y ejecución aislada de binarios en modo usuario (`Ring-3` / `CPL=3`).

### Qué falta aún (En desarrollo)
El sistema está lejos de ser un producto terminado; actualmente estamos trabajando en:
- Compatibilidad completa con interfaces gráficas complejas (GTK3 / Win32 avanzado).
- Aceleración 3D por hardware (`VirtIO-GPU` / Vulkan) y mayor soporte de drivers físicos.
- Estabilización general y soporte para aplicaciones comerciales pesadas.

### 🤝 ¿Quieres colaborar o probarlo?
Este es un proyecto independiente en plena evolución. Si te apasiona el desarrollo de sistemas operativos, cargadores binarios (`ELF`/`PE`), drivers o motores gráficos y te gustaría aportar ideas, reportar fallos o colaborar en el desarrollo:
- **Prueba la demo en vivo** directamente desde el enlace de GitHub Pages de este repositorio.
- **Abre un Issue** en este repositorio con tus comentarios, ideas o propuestas de colaboración.

*Todos los derechos reservados — Arquitectura y desarrollo por **JMMC**.*
