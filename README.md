# ⚙️ MODEL SHIFTER

> **A 6-speed gated H-pattern stick-shift desktop widget for switching live AI coding models across OpenCode Desktop, Ollama, and Claude Code.**

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-ffb340?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-Desktop%20Widget-1b1d24?style=flat-square&logo=electron&logoColor=ffb340)
![Targets](https://img.shields.io/badge/Controls-OpenCode%20%7C%20Ollama%20%7C%20Claude%20Code-ff6b4a?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)

**Model Shifter** brings a physical, tactile **6-speed gated manual transmission** (`1`–`5`, `R`, and `N`) to your desktop so you can downshift to fast, lightweight models for quick edits or upshift to redline reasoning models for deep architecture and debugging — mid-conversation and without touching config menus.

---

## ✨ Key Features

- 🕹️ **Physical Gated H-Pattern Stick Shifter**
  - Drag the 3D shift knob through the brushed-aluminum H-gate channels (`1`, `2`, `3`, `4`, `5`, `R`, or center `N` Neutral), click any engraved gear label, or shift from anywhere using keyboard shortcuts.
- 🏎️ **Live Analog Token/s Tachometer (`0`–`8,000 RPM`)**
  - Custom SVG gauge with amber glow and a `6,500–8,000 RPM` redline zone that revs dynamically when shifting gears and pulses in real time as tokens stream back from OpenCode or Ollama.
- ⚡ **Zero-Restart Live OpenCode Desktop Plugin (`model-shift.mjs`)**
  - Automatically installs and registers a live OpenCode plugin (`~/.config/opencode/plugins/model-shift.mjs`) that hooks into OpenCode's `"chat.message"` pipeline. Shifting the stick lever switches OpenCode Desktop's active model on your **very next message** in `< 1ms` without restarting OpenCode.
  - Includes automatic store-corruption self-healing (`repairOpenCodeStoreIfCorrupt`) and a Free-Tier Zen `User-Agent` compatibility fix for OpenCode Desktop.
- 🦙 **Local Ollama Auto-Discovery, VRAM Pre-Warming & Port `11435` Live Router**
  - Automatically scans `http://127.0.0.1:11434/api/tags` (or `ollama list`), pre-warms the selected gear's model in VRAM (`keep_alive: "30m"`), unloads models when shifted into **Neutral (`N`)** (`keep_alive: 0`), and runs a live OpenAI/Ollama-compatible router proxy on `http://127.0.0.1:11435` that dynamically routes requests to whichever gear the stick is currently in.
- 🛠️ **Expandable Garage Drawer (`💬 AI Chat`, `>_ Shell`, & `⚙ Models`)**
  - Click **`>`** on the OLED screen to slide out the built-in Garage drawer:
    - **`💬 AI Chat`**: Chat directly with the active gear's model (via OpenCode's live sidecar or local Ollama).
    - **`>_ Shell`**: Persistent per-gear PowerShell/Bash sessions (`gearshift:1.0` – `gearshift:5.0`).
    - **`⚙ Models`**: Customize every gear's OpenCode model, local Ollama model tag, and display label.
- 🔊 **Synthesized Mechanical Audio FX**
  - Built-in Web Audio API mechanical gate clack, sub-bass thump, and 5th-gear redline turbine whine (toggleable via `♪`).

---

## ⚙️ Default 6-Speed Gear Transmission

Switch between **`⚡ OPENCODE`**, **`🦙 OLLAMA`**, and **`⚡ CLAUDE`** modes at any time using the top bezel pill:

| Gear | Position | `⚡ OPENCODE` (Free Zen Models) | `🦙 OLLAMA` (Local Models) | `⚡ CLAUDE` (Claude Code) | Typical Use Case |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`1`** | Top-Left | `opencode/mimo-v2.6-flash-free` | `llama3.2:3b` | `haiku` | Rapid-fire questions & quick syntax fixes |
| **`2`** | Bottom-Left | `opencode/ling-3.1-flash-free` | `qwen2.5-coder:7b` | `sonnet` | Daily-driver coding & fast edits |
| **`3`** | Top-Center | `opencode/big-pickle` | `deepseek-r1:8b` | `sonnet[1m]` | Balanced reasoning & multi-step agent tasks |
| **`4`** | Bottom-Center | `opencode/nemotron-3.5-lightning-free` | `qwen2.5-coder:14b` | `opus` | Heavy multi-file architecture & debugging |
| **`5`** | Top-Right *(Redline)* | `opencode/nemotron-3-ultra-free` | `deepseek-r1:32b` | `fable` | Max-compute deep reasoning & hard bugs |
| **`R`** | Bottom-Right | `opencode/longcat-2.5-preview-free` | `llama3.1:8b` | `default` | Reverse / high-throughput fallback model |
| **`N`** | Center Slot | *Neutral (Idle)* | *Unloads VRAM (`keep_alive: 0`)* | *Neutral* | Idle / free local GPU memory |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/nnickahh/model-shifter.git
cd model-shifter
npm install
```

### 2. Launch the Desktop Widget

```bash
npm start
```

*(On Windows, you can also double-click [`Launch-ModelShift.bat`](./Launch-ModelShift.bat).)*

---

## 🎮 How to Use

### Workflow A — With OpenCode Desktop (Recommended)
1. Open **Model Shifter** (`npm start`) and **OpenCode Desktop** (or click **`+`** on the shifter's OLED bar to launch OpenCode Desktop).
2. Keep **Model Shifter** compact and pinned (`📌`) in the corner of your screen.
3. Drag the stick knob into any gear (`1`–`5` or `R`) and type your prompt in **OpenCode Desktop** — your message is automatically routed to that gear's model in real time, and the tachometer revs as tokens stream back.

### Workflow B — Built-In Garage Chat (`>` Button)
1. Click the **`>`** button on the shifter's OLED bar to expand the **Garage Drawer**.
2. Make sure **`💬 AI Chat`** is selected in the top toolbar.
3. Type any question or coding prompt at the bottom and press **Enter** to chat directly with the active gear's model.

### Workflow C — Local Ollama Models (`🦙 OLLAMA` Mode)
1. Click the mode button on the top bezel until it shows **`🦙 OLLAMA`**.
2. Open the Garage (`>`) → click **`⚙ Models`** → click **`🦙 Auto-Map Local Ollama`** to automatically assign your installed local Ollama models fromsmallest/fastest (Gear `1`) to largest/smartest (Gear `5`).
3. Point any OpenAI- or Ollama-compatible tool at **`http://127.0.0.1:11435`** (`http://127.0.0.1:11435/v1`) and shifting gears will dynamically switch the underlying local model in real time.

---

## ⌨️ Controls & Shortcuts

| Shortcut / Control | Action |
| :--- | :--- |
| **Drag Knob / Click Gear** | Shift through the H-gate (`1`, `2`, `3`, `4`, `5`, `R`, or center `N`) |
| **`1` – `5`, `R`, `N`** *(when focused)* | Instant shift to Gear `1`–`5`, `R`, or `N` |
| **`Alt + Shift + 1..5 / R / N`** | **Global hotkey** — shift gears from anywhere in Windows without leaving your IDE |
| **`>`** *(OLED button)* | Open / close the built-in AI Chat & Terminal Garage drawer |
| **`↻`** *(OLED button)* | Re-sync OpenCode/Claude configs & re-scan local Ollama models |
| **`+`** *(OLED button)* | Launch / focus OpenCode Desktop synced to the current gear |
| **`×`** *(OLED button)* | Shift to Neutral (`N`) & unload active Ollama model from VRAM |
| **`⌨`** *(Top bezel)* | Toggle auto-typing `/model <gear>` into an active terminal window on shift |
| **`♪`** *(Top bezel)* | Toggle mechanical shifter & redline sound effects |
| **`📌`** *(Top bezel)* | Toggle Always-on-Top window pin |

---

## 📁 Project Structure

```text
model-shifter/
├── main.js                 # Electron main process, live OpenCode plugin installer, sidecar bridge & port 11435 router
├── preload.js              # Context-isolated IPC bridge (window.modelShiftAPI)
├── server.js               # Optional standalone browser preview server (npm run web)
├── Launch-ModelShift.bat   # One-click Windows launcher
└── renderer/
    ├── index.html          # Carbon-fiber chassis, SVG tachometer, H-gate stage & Garage drawer markup
    ├── style.css           # Carbon weave textures, recessed well shadows, brushed aluminum plate & OLED styling
    └── app.js              # H-gate drag physics, tachometer needle animation, WebAudio synth & Garage UI
```

---

## 📄 License

MIT
