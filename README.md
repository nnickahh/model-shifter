# ⚙️ model-shifter

> a 6-speed gated h-pattern stick-shift desktop widget for switching live ai coding models across opencode desktop, ollama, and claude code.

![platform](https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-ffb340?style=flat-square)
![electron](https://img.shields.io/badge/electron-desktop%20widget-1b1d24?style=flat-square&logo=electron&logoColor=ffb340)
![targets](https://img.shields.io/badge/controls-opencode%20%7C%20ollama%20%7C%20claude%20code-ff6b4a?style=flat-square)
![license](https://img.shields.io/badge/license-mit-brightgreen?style=flat-square)

**model-shifter** brings a physical, tactile **6-speed gated manual transmission** (`1`–`5`, `r`, and `n`) to your desktop so you can downshift to fast, lightweight models for quick edits or upshift to redline reasoning models for deep architecture and debugging — mid-conversation and without touching config menus.

---

## ✨ features

- 🕹️ **physical gated h-pattern stick shifter**
  - drag the 3d shift knob through the brushed-aluminum h-gate channels (`1`, `2`, `3`, `4`, `5`, `r`, or center `n` neutral), click any engraved gear label, or shift from anywhere using keyboard shortcuts.
- 🏎️ **live analog token/s tachometer (`0`–`8,000 rpm`)**
  - custom svg gauge with amber glow and a `6,500–8,000 rpm` redline zone that revs dynamically when shifting gears and pulses in real time as tokens stream back from opencode or ollama.
- ⚡ **zero-restart live opencode desktop plugin (`model-shift.mjs`)**
  - automatically installs and registers a live opencode plugin (`~/.config/opencode/plugins/model-shift.mjs`) that hooks into opencode's `"chat.message"` pipeline. shifting the stick lever switches opencode desktop's active model on your **very next message** in `< 1ms` without restarting opencode.
- 🦙 **local ollama auto-discovery, vram pre-warming & port `11435` live router**
  - automatically scans `http://127.0.0.1:11434/api/tags` (or `ollama list`), pre-warms the selected gear's model in vram (`keep_alive: "30m"`), unloads models when shifted into **neutral (`n`)** (`keep_alive: 0`), and runs a live openai/ollama-compatible router proxy on `http://127.0.0.1:11435` that dynamically routes requests to whichever gear the stick is currently in.
- 🛠️ **expandable garage drawer (`💬 ai chat`, `>_ shell`, & `⚙ models`)**
  - click **`>`** on the oled screen to slide out the built-in garage drawer:
    - **`💬 ai chat`**: chat directly with the active gear's model (via opencode's live sidecar or local ollama).
    - **`>_ shell`**: persistent per-gear powershell/bash sessions (`gearshift:1.0` – `gearshift:5.0`).
    - **`⚙ models`**: customize every gear's opencode model, local ollama model tag, and display label.
- 🔊 **synthesized mechanical audio fx**
  - built-in web audio api mechanical gate clack, sub-bass thump, and 5th-gear redline turbine whine (toggleable via `♪`).

---

## ⚙️ default 6-speed gear transmission

switch between **`⚡ opencode`**, **`🦙 ollama`**, and **`⚡ claude`** modes at any time using the top bezel pill:

| gear | position | `⚡ opencode` (free zen models) | `🦙 ollama` (local models) | `⚡ claude` (claude code) | typical use case |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`1`** | top-left | `opencode/mimo-v2.6-flash-free` | `llama3.2:3b` | `haiku` | rapid-fire questions & quick syntax fixes |
| **`2`** | bottom-left | `opencode/ling-3.1-flash-free` | `qwen2.5-coder:7b` | `sonnet` | daily-driver coding & fast edits |
| **`3`** | top-center | `opencode/big-pickle` | `deepseek-r1:8b` | `sonnet[1m]` | balanced reasoning & multi-step agent tasks |
| **`4`** | bottom-center | `opencode/nemotron-3.5-lightning-free` | `qwen2.5-coder:14b` | `opus` | heavy multi-file architecture & debugging |
| **`5`** | top-right *(redline)* | `opencode/nemotron-3-ultra-free` | `deepseek-r1:32b` | `fable` | max-compute deep reasoning & hard bugs |
| **`r`** | bottom-right | `opencode/longcat-2.5-preview-free` | `llama3.1:8b` | `default` | reverse / high-throughput fallback model |
| **`n`** | center slot | *neutral (idle)* | *unloads vram (`keep_alive: 0`)* | *neutral* | idle / free local gpu memory |

---

## 🚀 quick start

### 1. clone & install

```bash
git clone https://github.com/nnickahh/model-shifter.git
cd model-shifter
npm install
```

### 2. launch the desktop widget

```bash
npm start
```

*(on windows, you can also double-click [`Launch-ModelShift.bat`](./Launch-ModelShift.bat).)*

---

## 🎮 how to use

### workflow a — with opencode desktop (recommended)
1. open **model-shifter** (`npm start`) and **opencode desktop** (or click **`+`** on the shifter's oled bar to launch opencode desktop).
2. keep **model-shifter** compact and pinned (`📌`) in the corner of your screen.
3. drag the stick knob into any gear (`1`–`5` or `r`) and type your prompt in **opencode desktop** — your message is automatically routed to that gear's model in real time, and the tachometer revs as tokens stream back.

### workflow b — built-in garage chat (`>` button)
1. click the **`>`** button on the shifter's oled bar to expand the **garage drawer**.
2. make sure **`💬 ai chat`** is selected in the top toolbar.
3. type any question or coding prompt at the bottom and press **enter** to chat directly with the active gear's model.

### workflow c — local ollama models (`🦙 ollama` mode)
1. click the mode button on the top bezel until it shows **`🦙 ollama`**.
2. open the garage (`>`) → click **`⚙ models`** → click **`🦙 auto-map local ollama`** to automatically assign your installed local ollama models from smallest/fastest (gear `1`) to largest/smartest (gear `5`).
3. point any openai- or ollama-compatible tool at **`http://127.0.0.1:11435`** (`http://127.0.0.1:11435/v1`) and shifting gears will dynamically switch the underlying local model in real time.

---

## ⌨️ controls & shortcuts

| shortcut / control | action |
| :--- | :--- |
| **drag knob / click gear** | shift through the h-gate (`1`, `2`, `3`, `4`, `5`, `r`, or center `n`) |
| **`1` – `5`, `r`, `n`** *(when focused)* | instant shift to gear `1`–`5`, `r`, or `n` |
| **`alt + shift + 1..5 / r / n`** | **global hotkey** — shift gears from anywhere in windows without leaving your ide |
| **`>`** *(oled button)* | open / close the built-in ai chat & terminal garage drawer |
| **`↻`** *(oled button)* | re-sync opencode/claude configs & re-scan local ollama models |
| **`+`** *(oled button)* | launch / focus opencode desktop synced to the current gear |
| **`×`** *(oled button)* | shift to neutral (`n`) & unload active ollama model from vram |
| **`⌨`** *(top bezel)* | toggle auto-typing `/model <gear>` into an active terminal window on shift |
| **`♪`** *(top bezel)* | toggle mechanical shifter & redline sound effects |
| **`📌`** *(top bezel)* | toggle always-on-top window pin |

---

## 📁 project structure

```text
model-shifter/
├── main.js                 # electron main process, live opencode plugin installer, sidecar bridge & port 11435 router
├── preload.js              # context-isolated ipc bridge (window.modelShiftAPI)
├── server.js               # optional standalone browser preview server (npm run web)
├── Launch-ModelShift.bat   # one-click windows launcher
└── renderer/
    ├── index.html          # carbon-fiber chassis, svg tachometer, h-gate stage & garage drawer markup
    ├── style.css           # carbon weave textures, recessed well shadows, brushed aluminum plate & oled styling
    └── app.js              # h-gate drag physics, tachometer needle animation, webaudio synth & garage ui
```

---

## 📄 license

mit
