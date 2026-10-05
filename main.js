const { app, BrowserWindow, ipcMain, dialog, globalShortcut, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const { spawn, exec } = require('child_process');
const { pathToFileURL } = require('url');

let mainWindow = null;
let isAlwaysOnTop = true;
let isGarageOpen = false;
let autoSendKeys = false;
let projectDir = process.cwd();

// Persistent per-gear shell processes
const gearSessions = new Map();
const wtTabIndexByGear = new Map();
const opencodeChatSessionByGear = new Map();
let wtTabCounter = 0;

const CONFIG_PATH = path.join(app.getPath('userData'), 'model-shift-v4-config.json');
const OPENCODE_DIR = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_CONFIG_PATH = path.join(OPENCODE_DIR, 'opencode.jsonc');
const OPENCODE_ACTIVE_GEAR_PATH = path.join(OPENCODE_DIR, 'model-shift-active.json');
const OPENCODE_SIDECAR_INFO_PATH = path.join(OPENCODE_DIR, 'model-shift-sidecar.json');
const OPENCODE_PLUGIN_DIR = path.join(OPENCODE_DIR, 'plugins');
const OPENCODE_PLUGIN_PATH = path.join(OPENCODE_PLUGIN_DIR, 'model-shift.mjs');
const OPENCODE_ROAMING_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'ai.opencode.desktop');
const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const OPENCODE_EXE_PATH = path.join(os.homedir(), 'AppData', 'Local', 'Programs', '@opencode-aidesktop', 'OpenCode.exe');

const PRESETS = {
  opencode: {
    '1': {
      gear: '1',
      col: 0,
      row: 0,
      shortLabel: 'MIMO V2.6',
      model: 'MIMO V2.6 FLASH',
      ollamaModel: 'llama3.2:3b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'mimo-v2.6-flash-free',
      opencodeModel: 'opencode/mimo-v2.6-flash-free',
      claudeModel: 'haiku',
      cmd: '/model mimo-v2.6-flash-free',
      launchCmd: 'opencode --model opencode/mimo-v2.6-flash-free',
      color: '#ffb340',
      rpm: 3400,
      dot: [8, 13],
      desc: '1st Gear · Ultra-fast lightweight OpenCode Zen model (Free)'
    },
    '2': {
      gear: '2',
      col: 0,
      row: 1,
      shortLabel: 'LING 3.1',
      model: 'LING 3.1 FLASH',
      ollamaModel: 'qwen2.5-coder:7b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'ling-3.1-flash-free',
      opencodeModel: 'opencode/ling-3.1-flash-free',
      claudeModel: 'sonnet',
      cmd: '/model ling-3.1-flash-free',
      launchCmd: 'opencode --model opencode/ling-3.1-flash-free',
      color: '#ffb340',
      rpm: 4300,
      dot: [8, 33],
      desc: '2nd Gear · Daily driver coding & fast edits (Free)'
    },
    '3': {
      gear: '3',
      col: 1,
      row: 0,
      shortLabel: 'BIG PICKLE',
      model: 'BIG PICKLE',
      ollamaModel: 'deepseek-r1:8b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'big-pickle',
      opencodeModel: 'opencode/big-pickle',
      claudeModel: 'sonnet[1m]',
      cmd: '/model big-pickle',
      launchCmd: 'opencode --model opencode/big-pickle',
      color: '#ffb340',
      rpm: 5100,
      dot: [20, 13],
      desc: '3rd Gear · Balanced reasoning & agent workflows (Free)'
    },
    '4': {
      gear: '4',
      col: 1,
      row: 1,
      shortLabel: 'NEMOTRON 3.5',
      model: 'NEMOTRON 3.5',
      ollamaModel: 'qwen2.5-coder:14b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'nemotron-3.5-lightning-free',
      opencodeModel: 'opencode/nemotron-3.5-lightning-free',
      claudeModel: 'opus',
      cmd: '/model nemotron-3.5-lightning-free',
      launchCmd: 'opencode --model opencode/nemotron-3.5-lightning-free',
      color: '#ffb340',
      rpm: 5900,
      dot: [20, 33],
      desc: '4th Gear · Heavy multi-file architecture & debugging (Free)'
    },
    '5': {
      gear: '5',
      col: 2,
      row: 0,
      shortLabel: 'NEMO ULTRA',
      model: 'NEMOTRON 3 ULTRA',
      ollamaModel: 'deepseek-r1:32b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'nemotron-3-ultra-free',
      opencodeModel: 'opencode/nemotron-3-ultra-free',
      claudeModel: 'fable',
      cmd: '/model nemotron-3-ultra-free',
      launchCmd: 'opencode --model opencode/nemotron-3-ultra-free',
      color: '#ff6b4a',
      rpm: 7100,
      dot: [32, 13],
      desc: '5th Gear · Max compute redline reasoning model (Free)'
    },
    R: {
      gear: 'R',
      col: 2,
      row: 1,
      shortLabel: 'LONGCAT 2.5',
      model: 'LONGCAT 2.5',
      ollamaModel: 'llama3.1:8b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'longcat-2.5-preview-free',
      opencodeModel: 'opencode/longcat-2.5-preview-free',
      claudeModel: 'default',
      cmd: '/model longcat-2.5-preview-free',
      launchCmd: 'opencode --model opencode/longcat-2.5-preview-free',
      color: '#e0e3ea',
      rpm: 3200,
      dot: [32, 33],
      desc: 'Reverse · High-throughput fallback model (Free)'
    }
  },
  ollama: {
    '1': {
      gear: '1',
      col: 0,
      row: 0,
      shortLabel: 'LLAMA 3.2',
      model: 'LLAMA3.2:3B',
      ollamaModel: 'llama3.2:3b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'llama3.2:3b',
      opencodeModel: 'ollama/llama3.2:3b',
      claudeModel: 'llama3.2:3b',
      cmd: '/model llama3.2:3b',
      launchCmd: 'ollama run llama3.2:3b',
      color: '#ffb340',
      rpm: 3400,
      dot: [8, 13],
      desc: '1st Gear · Ultra-fast lightweight local model (3B)'
    },
    '2': {
      gear: '2',
      col: 0,
      row: 1,
      shortLabel: 'QWEN 7B',
      model: 'QWEN2.5-CODER:7B',
      ollamaModel: 'qwen2.5-coder:7b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'qwen2.5-coder:7b',
      opencodeModel: 'ollama/qwen2.5-coder:7b',
      claudeModel: 'qwen2.5-coder:7b',
      cmd: '/model qwen2.5-coder:7b',
      launchCmd: 'ollama run qwen2.5-coder:7b',
      color: '#ffb340',
      rpm: 4300,
      dot: [8, 33],
      desc: '2nd Gear · Daily driver coding & completions (7B)'
    },
    '3': {
      gear: '3',
      col: 1,
      row: 0,
      shortLabel: 'DEEPSEEK 8B',
      model: 'DEEPSEEK-R1:8B',
      ollamaModel: 'deepseek-r1:8b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'deepseek-r1:8b',
      opencodeModel: 'ollama/deepseek-r1:8b',
      claudeModel: 'deepseek-r1:8b',
      cmd: '/model deepseek-r1:8b',
      launchCmd: 'ollama run deepseek-r1:8b',
      color: '#ffb340',
      rpm: 5100,
      dot: [20, 13],
      desc: '3rd Gear · Chain-of-thought reasoning model (8B)'
    },
    '4': {
      gear: '4',
      col: 1,
      row: 1,
      shortLabel: 'CODER 14B',
      model: 'QWEN2.5-CODER:14B',
      ollamaModel: 'qwen2.5-coder:14b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'qwen2.5-coder:14b',
      opencodeModel: 'ollama/qwen2.5-coder:14b',
      claudeModel: 'qwen2.5-coder:14b',
      cmd: '/model qwen2.5-coder:14b',
      launchCmd: 'ollama run qwen2.5-coder:14b',
      color: '#ffb340',
      rpm: 5900,
      dot: [20, 33],
      desc: '4th Gear · Heavy multi-file architecture & debugging (14B)'
    },
    '5': {
      gear: '5',
      col: 2,
      row: 0,
      shortLabel: 'R1 32B',
      model: 'DEEPSEEK-R1:32B',
      ollamaModel: 'deepseek-r1:32b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'deepseek-r1:32b',
      opencodeModel: 'ollama/deepseek-r1:32b',
      claudeModel: 'deepseek-r1:32b',
      cmd: '/model deepseek-r1:32b',
      launchCmd: 'ollama run deepseek-r1:32b',
      color: '#ff6b4a',
      rpm: 7100,
      dot: [32, 13],
      desc: '5th Gear · Max compute redline reasoning model (32B)'
    },
    R: {
      gear: 'R',
      col: 2,
      row: 1,
      shortLabel: 'DEFAULT',
      model: 'LLAMA3.1:8B',
      ollamaModel: 'llama3.1:8b',
      opencodeProvider: 'ollama',
      opencodeModelId: 'llama3.1:8b',
      opencodeModel: 'ollama/llama3.1:8b',
      claudeModel: 'llama3.1:8b',
      cmd: '/model llama3.1:8b',
      launchCmd: 'ollama run llama3.1:8b',
      color: '#e0e3ea',
      rpm: 3200,
      dot: [32, 33],
      desc: 'Reverse · General fallback local model'
    }
  },
  claude: {
    '1': {
      gear: '1',
      col: 0,
      row: 0,
      shortLabel: 'HAIKU',
      model: 'HAIKU 4.5',
      ollamaModel: 'llama3.2:3b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'mimo-v2.6-flash-free',
      opencodeModel: 'anthropic/claude-haiku-4-5',
      claudeModel: 'haiku',
      cmd: '/model haiku',
      launchCmd: 'claude --model haiku',
      color: '#ffb340',
      rpm: 3500,
      dot: [8, 13],
      desc: '1st Gear · Rapid-fire tasks & quick edits'
    },
    '2': {
      gear: '2',
      col: 0,
      row: 1,
      shortLabel: 'SONNET',
      model: 'SONNET 5',
      ollamaModel: 'qwen2.5-coder:7b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'ling-3.1-flash-free',
      opencodeModel: 'anthropic/claude-sonnet-4-5',
      claudeModel: 'sonnet',
      cmd: '/model sonnet',
      launchCmd: 'claude --model sonnet',
      color: '#ffb340',
      rpm: 4400,
      dot: [8, 33],
      desc: '2nd Gear · Standard coding workflows'
    },
    '3': {
      gear: '3',
      col: 1,
      row: 0,
      shortLabel: 'SONNET 1M',
      model: 'SONNET 5 [1M]',
      ollamaModel: 'deepseek-r1:8b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'big-pickle',
      opencodeModel: 'anthropic/claude-sonnet-4-5',
      claudeModel: 'sonnet[1m]',
      cmd: '/model sonnet[1m]',
      launchCmd: 'claude --model sonnet[1m]',
      color: '#ffb340',
      rpm: 5100,
      dot: [20, 13],
      desc: '3rd Gear · Large 1M context window session'
    },
    '4': {
      gear: '4',
      col: 1,
      row: 1,
      shortLabel: 'OPUS',
      model: 'OPUS 4.8',
      ollamaModel: 'qwen2.5-coder:14b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'nemotron-3.5-lightning-free',
      opencodeModel: 'anthropic/claude-opus-4-5',
      claudeModel: 'opus',
      cmd: '/model opus',
      launchCmd: 'claude --model opus',
      color: '#ffb340',
      rpm: 5900,
      dot: [20, 33],
      desc: '4th Gear · Heavy-hitting complex engineering'
    },
    '5': {
      gear: '5',
      col: 2,
      row: 0,
      shortLabel: 'FABLE',
      model: 'FABLE 5',
      ollamaModel: 'deepseek-r1:32b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'nemotron-3-ultra-free',
      opencodeModel: 'openai/gpt-5',
      claudeModel: 'fable',
      cmd: '/model fable',
      launchCmd: 'claude --model fable',
      color: '#ff6b4a',
      rpm: 7100,
      dot: [32, 13],
      desc: '5th Gear · Redline deep research & refactor'
    },
    R: {
      gear: 'R',
      col: 2,
      row: 1,
      shortLabel: 'DEFAULT',
      model: 'DEFAULT',
      ollamaModel: 'llama3.1:8b',
      opencodeProvider: 'opencode',
      opencodeModelId: 'longcat-2.5-preview-free',
      opencodeModel: 'anthropic/claude-sonnet-4-5',
      claudeModel: 'default',
      cmd: '/model default',
      launchCmd: 'claude',
      color: '#e0e3ea',
      rpm: 3200,
      dot: [32, 33],
      desc: 'Reverse · Reset to default model'
    }
  }
};

let appConfig = {
  mode: 'opencode',
  ollamaHost: 'http://127.0.0.1:11434',
  proxyPort: 11435,
  activeGear: '4',
  projectDir: process.cwd(),
  gearsByMode: JSON.parse(JSON.stringify(PRESETS))
};

// ============================================================================
// AUTOMATIC OPENCODE DESKTOP STORE REPAIR + LIVE PLUGIN INSTALLER
// Prevents OpenCode Desktop white-screen crashes caused by corrupted .dat files
// and installs ~/.config/opencode/plugins/model-shift.mjs so shifting gears
// switches OpenCode Desktop's active model in real time!
// ============================================================================
function repairOpenCodeStoreIfCorrupt() {
  try {
    if (!fs.existsSync(OPENCODE_ROAMING_DIR)) return;
    const files = fs.readdirSync(OPENCODE_ROAMING_DIR).filter((f) => f.endsWith('.dat'));
    for (const file of files) {
      const fullPath = path.join(OPENCODE_ROAMING_DIR, file);
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        JSON.parse(raw);
      } catch (_) {
        try {
          fs.copyFileSync(fullPath, `${fullPath}.bak`);
        } catch (_) {}
        fs.writeFileSync(fullPath, '{}', 'utf8');
      }
    }
  } catch (err) {
    console.error('Failed to check/repair OpenCode store:', err);
  }
}

function installOpenCodeLivePlugin() {
  try {
    if (!fs.existsSync(OPENCODE_PLUGIN_DIR)) {
      fs.mkdirSync(OPENCODE_PLUGIN_DIR, { recursive: true });
    }
    const activeStateFile = OPENCODE_ACTIVE_GEAR_PATH.replace(/\\/g, '/');
    const sidecarInfoFile = OPENCODE_SIDECAR_INFO_PATH.replace(/\\/g, '/');
    const proxyPort = appConfig.proxyPort || 11435;

    const pluginCode = `import fs from "node:fs";

const ACTIVE_GEAR_FILE = "${activeStateFile}";
const SIDECAR_INFO_FILE = "${sidecarInfoFile}";
const ROUTER_URL = "http://127.0.0.1:${proxyPort}";
const OFFICIAL_UA = "opencode/1.18.34";

// Patch globalThis.fetch inside the OpenCode sidecar so "opencode/local" in Desktop v1.16.2
// is automatically upgraded to a valid release semver User-Agent for OpenCode Zen Free Tier.
if (!globalThis.__modelShiftFetchPatched && typeof globalThis.fetch === "function") {
  globalThis.__modelShiftFetchPatched = true;
  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    try {
      const urlStr = typeof input === "string" ? input : (input?.url || String(input));
      if (urlStr.includes("opencode.ai/zen")) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        const curUa = headers.get("user-agent") || "";
        if (!curUa || curUa.includes("opencode/local") || curUa.includes("opencode/0.")) {
          headers.set("User-Agent", curUa ? curUa.replace(/opencode\\/[^\\s]+/i, OFFICIAL_UA) : OFFICIAL_UA);
        }
        init = { ...(init || {}), headers };
      }
    } catch {}
    return origFetch(input, init);
  };
}

export default async ({ project, directory, serverUrl }) => {
  const publishSidecarInfo = () => {
    try {
      const urlStr = serverUrl ? (typeof serverUrl === "string" ? serverUrl : serverUrl.href) : "";
      const info = {
        url: urlStr ? urlStr.replace(/\\/$/, "") : "",
        username: process.env.OPENCODE_SERVER_USERNAME || "opencode",
        password: process.env.OPENCODE_SERVER_PASSWORD || "",
        directory: directory || "",
        pid: process.pid,
        updatedAt: Date.now()
      };
      if (info.url) {
        fs.writeFileSync(SIDECAR_INFO_FILE, JSON.stringify(info, null, 2), "utf8");
        fetch(ROUTER_URL + "/__modelshift/sidecar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(info)
        }).catch(() => {});
      }
    } catch {}
  };

  publishSidecarInfo();
  setTimeout(publishSidecarInfo, 1500);
  setTimeout(publishSidecarInfo, 4000);

  return {
    "chat.headers": async (input, output) => {
      try {
        if (output && output.headers) {
          output.headers["User-Agent"] = OFFICIAL_UA;
        }
      } catch {}
    },
    "chat.message": async (input, output) => {
      try {
        publishSidecarInfo();
        if (!fs.existsSync(ACTIVE_GEAR_FILE)) return;
        const state = JSON.parse(fs.readFileSync(ACTIVE_GEAR_FILE, "utf8"));
        if (!state || !state.active || state.gear === "N") return;

        if (state.providerID && state.modelID && output && output.message) {
          output.message.model = {
            providerID: state.providerID,
            modelID: state.modelID
          };
          fetch(ROUTER_URL + "/__modelshift/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gear: state.gear,
              model: state.providerID + "/" + state.modelID,
              source: "OpenCode Desktop"
            })
          }).catch(() => {});
        }
      } catch {}
    },
    event: async ({ event }) => {
      try {
        if (!event) return;
        if (event.type === "message.part.updated" || event.type === "message.updated") {
          fetch(ROUTER_URL + "/__modelshift/pulse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bytes: 48 })
          }).catch(() => {});
        }
      } catch {}
    }
  };
};
`;
    fs.writeFileSync(OPENCODE_PLUGIN_PATH, pluginCode, 'utf8');
  } catch (err) {
    console.error('Failed to write OpenCode live plugin:', err);
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      appConfig = {
        ...appConfig,
        ...saved,
        gearsByMode: {
          opencode: { ...PRESETS.opencode, ...((saved.gearsByMode && saved.gearsByMode.opencode) || {}) },
          ollama: { ...PRESETS.ollama, ...((saved.gearsByMode && saved.gearsByMode.ollama) || {}) },
          claude: { ...PRESETS.claude, ...((saved.gearsByMode && saved.gearsByMode.claude) || {}) }
        }
      };
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  projectDir = appConfig.projectDir || os.homedir();
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

function getCurrentGears() {
  return appConfig.gearsByMode[appConfig.mode] || appConfig.gearsByMode.opencode;
}

function resolveOpenCodeTargetForGear(gearData) {
  if (appConfig.mode === 'ollama') {
    const tag = gearData.ollamaModel || 'llama3.2:3b';
    return { providerID: 'ollama', modelID: tag, full: `ollama/${tag}` };
  }
  if (appConfig.mode === 'opencode') {
    const pId = gearData.opencodeProvider || 'opencode';
    const mId = gearData.opencodeModelId || (gearData.opencodeModel ? gearData.opencodeModel.split('/')[1] : 'big-pickle');
    return { providerID: pId, modelID: mId, full: `${pId}/${mId}` };
  }
  // claude mode: map to opencode built-in free model if anthropic isn't connected, or use opencodeModelId
  const pId = gearData.opencodeProvider || 'opencode';
  const mId = gearData.opencodeModelId || 'big-pickle';
  return { providerID: pId, modelID: mId, full: `${pId}/${mId}` };
}

// ============================================================================
// REAL-TIME OPENCODE & CLAUDE CODE CONFIG SYNC + LIVE SIDECAR PATCH
// ============================================================================
let lastKnownSidecar = null;

function getLiveSidecarInfo() {
  if (lastKnownSidecar && lastKnownSidecar.url) {
    return lastKnownSidecar;
  }
  try {
    if (fs.existsSync(OPENCODE_SIDECAR_INFO_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(OPENCODE_SIDECAR_INFO_PATH, 'utf8'));
      if (parsed && parsed.url) {
        lastKnownSidecar = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

function sidecarRequest(endpoint, method = 'GET', bodyObj = null, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const info = getLiveSidecarInfo();
    if (!info || !info.url) {
      return reject(new Error('OpenCode Desktop sidecar not connected yet'));
    }
    try {
      const url = new URL(endpoint, info.url);
      const headers = { 'Content-Type': 'application/json' };
      if (info.password) {
        const auth = Buffer.from(`${info.username || 'opencode'}:${info.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }
      if (projectDir) {
        headers['x-opencode-directory'] = encodeURIComponent(projectDir);
      }
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method,
          headers,
          timeout: timeoutMs
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => {
            raw += c;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tach-pulse', { bytes: c.length });
            }
          });
          res.on('end', () => {
            try {
              resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(raw) });
            } catch (_) {
              resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: raw });
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Sidecar request timeout'));
      });
      if (bodyObj) req.write(JSON.stringify(bodyObj));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function syncOpenCodeAndClaudeConfigs(gearKey, gearData) {
  const syncedTargets = [];
  const ocTarget = resolveOpenCodeTargetForGear(gearData);

  // 1. Write model-shift-active.json so the OpenCode plugin switches models in < 1ms on the next prompt!
  try {
    if (!fs.existsSync(OPENCODE_DIR)) {
      fs.mkdirSync(OPENCODE_DIR, { recursive: true });
    }
    fs.writeFileSync(
      OPENCODE_ACTIVE_GEAR_PATH,
      JSON.stringify(
        {
          active: gearKey !== 'N',
          gear: gearKey,
          mode: appConfig.mode,
          providerID: ocTarget.providerID,
          modelID: ocTarget.modelID,
          fullModel: ocTarget.full,
          label: gearData.model,
          updatedAt: Date.now()
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to write active gear state:', err);
  }

  // 2. Sync OpenCode config: ~/.config/opencode/opencode.jsonc
  try {
    installOpenCodeLivePlugin();

    let existingOpencode = { $schema: 'https://opencode.ai/config.json' };
    if (fs.existsSync(OPENCODE_CONFIG_PATH)) {
      const raw = fs.readFileSync(OPENCODE_CONFIG_PATH, 'utf8');
      const stripped = raw.replace(/^\s*\/\/.*$/gm, '');
      try {
        existingOpencode = JSON.parse(stripped);
      } catch (_) {}
    }

    const ollamaGears = appConfig.gearsByMode.ollama;
    const ollamaModelsMap = {
      gearshift: {
        name: `⚡ Model Shift Active Gear (Currently Gear ${gearKey}: ${gearData.model})`
      }
    };
    Object.values(ollamaGears).forEach((g) => {
      if (g.ollamaModel) {
        ollamaModelsMap[g.ollamaModel] = {
          name: `Gear ${g.gear} · ${g.model}`
        };
      }
    });

    existingOpencode.model = ocTarget.full;

    // Ensure our live OpenCode plugin is registered
    const pluginFileUrl = pathToFileURL(OPENCODE_PLUGIN_PATH).href;
    const currentPlugins = Array.isArray(existingOpencode.plugin) ? existingOpencode.plugin : [];
    if (!currentPlugins.includes(pluginFileUrl)) {
      existingOpencode.plugin = [
        ...currentPlugins.filter((p) => !String(p).includes('model-shift.')),
        pluginFileUrl
      ];
    }

    existingOpencode.provider = existingOpencode.provider || {};
    existingOpencode.provider.ollama = {
      npm: '@ai-sdk/openai-compatible',
      name: 'Ollama (Model Shift Live Router)',
      options: {
        baseURL: `http://127.0.0.1:${appConfig.proxyPort}/v1`
      },
      models: {
        ...((existingOpencode.provider.ollama && existingOpencode.provider.ollama.models) || {}),
        ...ollamaModelsMap
      }
    };

    fs.writeFileSync(OPENCODE_CONFIG_PATH, JSON.stringify(existingOpencode, null, 2), 'utf8');

    // Also update OpenCode Desktop workspace model-selection .dat files so sessions default to this gear
    if (fs.existsSync(OPENCODE_ROAMING_DIR)) {
      const datFiles = fs
        .readdirSync(OPENCODE_ROAMING_DIR)
        .filter((f) => f.startsWith('opencode.workspace.') && f.endsWith('.dat'));
      for (const df of datFiles) {
        const dfPath = path.join(OPENCODE_ROAMING_DIR, df);
        try {
          const parsedDat = JSON.parse(fs.readFileSync(dfPath, 'utf8'));
          if (parsedDat['workspace:model-selection']) {
            const ms = JSON.parse(parsedDat['workspace:model-selection']);
            if (ms && ms.session && typeof ms.session === 'object') {
              for (const sId of Object.keys(ms.session)) {
                ms.session[sId] = {
                  ...(ms.session[sId] || { agent: 'build' }),
                  model: {
                    providerID: ocTarget.providerID,
                    modelID: ocTarget.modelID
                  }
                };
              }
              parsedDat['workspace:model-selection'] = JSON.stringify(ms);
              fs.writeFileSync(dfPath, JSON.stringify(parsedDat), 'utf8');
            }
          }
        } catch (_) {}
      }
    }

    // Also patch the live running OpenCode sidecar if connected
    sidecarRequest('/global/config', 'PATCH', { model: ocTarget.full }).catch(() => {});

    syncedTargets.push('OpenCode');
  } catch (err) {
    console.error('Failed to sync OpenCode config:', err);
  }

  // 3. Sync Claude Code settings: ~/.claude/settings.json
  try {
    const claudeDir = path.dirname(CLAUDE_SETTINGS_PATH);
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }
    let existingClaude = {};
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      try {
        existingClaude = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf8'));
      } catch (_) {}
    }

    if (appConfig.mode === 'ollama') {
      existingClaude.model = gearData.ollamaModel || 'llama3.2:3b';
    } else {
      const cModel = gearData.claudeModel || gearData.cmd.replace('/model ', '').trim();
      if (cModel === 'default') {
        delete existingClaude.model;
      } else {
        existingClaude.model = cModel;
      }
    }

    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(existingClaude, null, 2), 'utf8');
    syncedTargets.push('Claude');
  } catch (err) {
    console.error('Failed to sync Claude config:', err);
  }

  return syncedTargets;
}

// Inject `/model <name>` + Enter into an open Terminal / Claude / OpenCode window on Windows
function injectModelCommandToActiveTerminal(cmdString) {
  if (process.platform !== 'win32' || !cmdString) return;
  const safeCmd = cmdString.replace(/'/g, "''");
  const psScript = `
    Add-Type -AssemblyName Microsoft.VisualBasic
    Add-Type -AssemblyName System.Windows.Forms
    $targets = @('WindowsTerminal', 'powershell', 'cmd')
    foreach ($t in $targets) {
      $procs = Get-Process -Name $t -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
      if ($procs) {
        [Microsoft.VisualBasic.Interaction]::AppActivate($procs[0].Id)
        Start-Sleep -Milliseconds 90
        [System.Windows.Forms.SendKeys]::SendWait('${safeCmd}{ENTER}')
        break
      }
    }
  `;
  spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref();
}

// ============================================================================
// OLLAMA API CLIENT & LIVE ROUTER PROXY (PORT 11435)
// ============================================================================
function ollamaRequest(endpoint, method = 'GET', bodyObj = null, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint, appConfig.ollamaHost);
      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname + url.search,
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: timeoutMs
      };
      const req = http.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(raw) });
          } catch (_) {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: raw });
          }
        });
      });
      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      if (bodyObj) req.write(JSON.stringify(bodyObj));
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function discoverOllamaModels() {
  const models = [];
  let online = false;
  let runningModels = [];

  try {
    const tagsRes = await ollamaRequest('/api/tags', 'GET', null, 2000);
    if (tagsRes.ok && tagsRes.data && Array.isArray(tagsRes.data.models)) {
      online = true;
      for (const m of tagsRes.data.models) {
        models.push({
          name: m.name,
          size: m.size || 0,
          parameterSize: (m.details && m.details.parameter_size) || '',
          family: (m.details && m.details.family) || ''
        });
      }
    }
    const psRes = await ollamaRequest('/api/ps', 'GET', null, 1500);
    if (psRes.ok && psRes.data && Array.isArray(psRes.data.models)) {
      runningModels = psRes.data.models.map((m) => m.name);
    }
  } catch (_) {
    await new Promise((resolve) => {
      exec('ollama list', { timeout: 2000 }, (err, stdout) => {
        if (!err && stdout) {
          const lines = stdout.trim().split(/\r?\n/).slice(1);
          lines.forEach((line) => {
            const parts = line.trim().split(/\s+/);
            if (parts[0]) models.push({ name: parts[0], size: 0, parameterSize: '', family: '' });
          });
          if (models.length > 0) online = true;
        }
        resolve();
      });
    });
  }

  return {
    online,
    models,
    runningModels,
    host: appConfig.ollamaHost,
    proxyPort: appConfig.proxyPort,
    opencodeConnected: Boolean(getLiveSidecarInfo())
  };
}

async function warmOllamaModel(modelName, keepAlive = '30m') {
  try {
    const res = await ollamaRequest(
      '/api/generate',
      'POST',
      {
        model: modelName,
        prompt: '',
        keep_alive: keepAlive
      },
      8000
    );
    return res.ok;
  } catch (_) {
    return false;
  }
}

let proxyServer = null;
function startOllamaGearshiftProxy() {
  try {
    proxyServer = http.createServer((clientReq, clientRes) => {
      clientRes.setHeader('Access-Control-Allow-Origin', '*');
      clientRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      clientRes.setHeader('Access-Control-Allow-Headers', '*');
      if (clientReq.method === 'OPTIONS') {
        clientRes.writeHead(200);
        clientRes.end();
        return;
      }

      const chunks = [];
      clientReq.on('data', (c) => chunks.push(c));
      clientReq.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');

        // Internal endpoints called by ~/.config/opencode/plugins/model-shift.mjs
        if (clientReq.url.startsWith('/__modelshift/')) {
          try {
            const payload = rawBody ? JSON.parse(rawBody) : {};
            if (clientReq.url === '/__modelshift/sidecar' && payload.url) {
              lastKnownSidecar = payload;
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('opencode-sidecar-ready', payload);
              }
            } else if (clientReq.url === '/__modelshift/activity') {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('proxy-activity', payload);
              }
            } else if (clientReq.url === '/__modelshift/pulse') {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tach-pulse', { bytes: payload.bytes || 40 });
              }
            } else if (clientReq.url === '/__modelshift/replace') {
              clientRes.writeHead(200, { 'Content-Type': 'application/json' });
              clientRes.end(JSON.stringify({ ok: true }));
              setTimeout(() => app.quit(), 40);
              return;
            }
          } catch (_) {}
          clientRes.writeHead(200, { 'Content-Type': 'application/json' });
          clientRes.end(JSON.stringify({ ok: true }));
          return;
        }

        let modifiedBody = rawBody;
        const gears = getCurrentGears();
        const activeGearObj = gears[appConfig.activeGear] || gears['1'];
        const targetModel = activeGearObj ? activeGearObj.ollamaModel : 'llama3.2:3b';

        if (rawBody && (clientReq.url.includes('/api/') || clientReq.url.includes('/v1/'))) {
          try {
            const parsed = JSON.parse(rawBody);
            parsed.model = targetModel;
            modifiedBody = JSON.stringify(parsed);

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('proxy-activity', {
                gear: appConfig.activeGear,
                model: targetModel,
                endpoint: clientReq.url
              });
            }
          } catch (_) {}
        }

        const targetUrl = new URL(clientReq.url, appConfig.ollamaHost);
        const headers = { ...clientReq.headers, host: `${targetUrl.hostname}:${targetUrl.port || 11434}` };
        if (modifiedBody) {
          headers['content-length'] = Buffer.byteLength(modifiedBody);
        }

        const proxyReq = http.request(
          {
            hostname: targetUrl.hostname,
            port: targetUrl.port || 11434,
            path: targetUrl.pathname + targetUrl.search,
            method: clientReq.method,
            headers
          },
          (proxyRes) => {
            clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.on('data', (chunk) => {
              clientRes.write(chunk);
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tach-pulse', { bytes: chunk.length });
              }
            });
            proxyRes.on('end', () => clientRes.end());
          }
        );

        proxyReq.on('error', (err) => {
          clientRes.writeHead(502, { 'Content-Type': 'application/json' });
          clientRes.end(JSON.stringify({ error: `Ollama daemon unreachable at ${appConfig.ollamaHost}: ${err.message}` }));
        });

        if (modifiedBody) proxyReq.write(modifiedBody);
        proxyReq.end();
      });
    });

    proxyServer.on('error', () => {});
    proxyServer.listen(appConfig.proxyPort, '127.0.0.1');
  } catch (_) {}
}

// ============================================================================
// WINDOW & GARAGE PROCESS MANAGEMENT
// ============================================================================
function createWindow() {
  repairOpenCodeStoreIfCorrupt();
  loadConfig();
  installOpenCodeLivePlugin();
  startOllamaGearshiftProxy();

  const gears = getCurrentGears();
  if (gears[appConfig.activeGear]) {
    syncOpenCodeAndClaudeConfigs(appConfig.activeGear, gears[appConfig.activeGear]);
  }

  mainWindow = new BrowserWindow({
    width: 346,
    height: 625,
    minWidth: 346,
    minHeight: 615,
    frame: false,
    transparent: true,
    alwaysOnTop: isAlwaysOnTop,
    resizable: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const keys = ['1', '2', '3', '4', '5', 'R', 'N'];
  keys.forEach((k) => {
    try {
      globalShortcut.register(`Alt+Shift+${k}`, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('global-shift', k);
        }
      });
    } catch (_) {}
  });
}

function ensureGearSession(gearKey, gearData) {
  if (gearSessions.has(gearKey)) {
    const existing = gearSessions.get(gearKey);
    if (!existing.killed) return existing;
  }

  const shellBin = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const shellArgs = process.platform === 'win32' ? ['-NoLogo', '-NoExit'] : [];

  const child = spawn(shellBin, shellArgs, {
    cwd: fs.existsSync(projectDir) ? projectDir : os.homedir(),
    env: {
      ...process.env,
      MODEL_SHIFT_GEAR: gearKey,
      MODEL_SHIFT_MODEL: gearData.model,
      OLLAMA_HOST: appConfig.ollamaHost,
      ANTHROPIC_BASE_URL: appConfig.mode === 'ollama' ? `http://127.0.0.1:${appConfig.proxyPort}` : undefined,
      ANTHROPIC_AUTH_TOKEN: appConfig.mode === 'ollama' ? 'ollama' : undefined,
      TERM: 'xterm-256color'
    },
    windowsHide: true
  });

  const sessionObj = {
    gear: gearKey,
    process: child,
    pid: child.pid,
    killed: false,
    logs: [],
    tokensUsed: 0
  };

  const pushLog = (text, stream = 'stdout') => {
    const clean = text.toString();
    sessionObj.logs.push({ time: Date.now(), stream, text: clean });
    if (sessionObj.logs.length > 400) sessionObj.logs.shift();
    const estTokens = Math.max(1, Math.round(clean.length / 3.5));
    sessionObj.tokensUsed += estTokens;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gear-output', {
        gear: gearKey,
        stream,
        text: clean,
        tokensUsed: sessionObj.tokensUsed,
        estTokensDelta: estTokens
      });
    }
  };

  const ocTarget = resolveOpenCodeTargetForGear(gearData);
  const banner =
    `[gearshift:${gearKey}.0] Persistent session ready (PID ${child.pid})\r\n` +
    `  Active Gear    : Gear ${gearKey} · ${gearData.model}\r\n` +
    `  OpenCode Sync  : ${ocTarget.full} (Live Plugin Active)\r\n` +
    `  Live Router    : http://127.0.0.1:${appConfig.proxyPort}\r\n` +
    `------------------------------------------------------------\r\n`;
  pushLog(banner, 'system');

  child.stdout.on('data', (data) => pushLog(data, 'stdout'));
  child.stderr.on('data', (data) => pushLog(data, 'stderr'));
  child.on('exit', (code) => {
    sessionObj.killed = true;
    pushLog(`\r\n[Session exited with code ${code}]\r\n`, 'system');
  });

  gearSessions.set(gearKey, sessionObj);
  return sessionObj;
}

// Ensure OpenCode Desktop is running and its sidecar is reachable for direct AI Chat
async function ensureOpenCodeSidecarReady() {
  let info = getLiveSidecarInfo();
  if (info && info.url) {
    try {
      const check = await sidecarRequest('/config', 'GET', null, 2000);
      if (check.ok) return info;
    } catch (_) {}
  }

  // If OpenCode.exe is installed, launch it if not running and wait briefly for sidecar registration
  if (fs.existsSync(OPENCODE_EXE_PATH)) {
    repairOpenCodeStoreIfCorrupt();
    installOpenCodeLivePlugin();
    const isRunning = await new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq OpenCode.exe" /NH', (err, stdout) => {
        resolve(!err && stdout && stdout.toLowerCase().includes('opencode.exe'));
      });
    });
    if (!isRunning) {
      spawn(OPENCODE_EXE_PATH, [], {
        cwd: fs.existsSync(projectDir) ? projectDir : os.homedir(),
        detached: true,
        stdio: 'ignore'
      }).unref();
    }

    for (let i = 0; i < 16; i++) {
      await new Promise((r) => setTimeout(r, 500));
      info = getLiveSidecarInfo();
      if (info && info.url) {
        try {
          const check = await sidecarRequest('/config', 'GET', null, 1500);
          if (check.ok) return info;
        } catch (_) {}
      }
    }
  }
  return null;
}

// Chat with the active gear's model via EITHER OpenCode's live sidecar OR local Ollama!
ipcMain.handle('ollama-chat-stream', async (_, { gear, prompt }) => {
  const gears = getCurrentGears();
  const gearData = gears[gear] || gears['1'];

  // 1. If in opencode mode (or if Ollama is offline and OpenCode is installed), chat via OpenCode sidecar!
  const tryOpenCodeChat = async () => {
    const ocTarget = resolveOpenCodeTargetForGear(gearData);
    const sidecar = await ensureOpenCodeSidecarReady();
    if (!sidecar) {
      return {
        ok: false,
        error: `OpenCode Desktop is still starting up. Click [+] on the shifter (or wait 2 seconds) and send your message again.`
      };
    }

    try {
      let sessionID = opencodeChatSessionByGear.get(gear);
      if (!sessionID) {
        const created = await sidecarRequest(
          '/session',
          'POST',
          { title: `Model Shift · Gear ${gear} (${gearData.model})` },
          8000
        );
        if (created.ok && created.data && created.data.id) {
          sessionID = created.data.id;
          opencodeChatSessionByGear.set(gear, sessionID);
        }
      }
      if (!sessionID) {
        return { ok: false, error: 'Could not create OpenCode chat session.' };
      }

      const msgRes = await sidecarRequest(
        `/session/${sessionID}/message`,
        'POST',
        {
          model: {
            providerID: ocTarget.providerID,
            modelID: ocTarget.modelID
          },
          parts: [{ type: 'text', text: prompt }]
        },
        45000
      );

      if (!msgRes.ok) {
        return {
          ok: false,
          error: `OpenCode returned status ${msgRes.status}: ${typeof msgRes.data === 'string' ? msgRes.data : JSON.stringify(msgRes.data)}`
        };
      }

      if (msgRes.data && msgRes.data.info && msgRes.data.info.error) {
        const errObj = msgRes.data.info.error;
        const errMsg = (errObj.data && errObj.data.message) || errObj.message || JSON.stringify(errObj);
        return {
          ok: false,
          error: `OpenCode (${ocTarget.full}): ${errMsg}`
        };
      }

      // Extract assistant text from parts
      let replyText = '';
      if (msgRes.data && Array.isArray(msgRes.data.parts)) {
        replyText = msgRes.data.parts
          .filter((p) => p.type === 'text' && !p.synthetic)
          .map((p) => p.text)
          .join('\n');
        if (!replyText) {
          replyText = msgRes.data.parts
            .filter((p) => p.type === 'reasoning' && p.text)
            .map((p) => p.text)
            .join('\n');
        }
      } else if (msgRes.data && typeof msgRes.data === 'object') {
        replyText = JSON.stringify(msgRes.data);
      }

      if (!replyText) {
        // Fetch latest message from session if parts weren't inline
        const hist = await sidecarRequest(`/session/${sessionID}/message?limit=2`, 'GET', null, 5000);
        if (hist.ok && Array.isArray(hist.data)) {
          const lastAsst = [...hist.data].reverse().find((m) => m.info && m.info.role === 'assistant');
          if (lastAsst && Array.isArray(lastAsst.parts)) {
            replyText = lastAsst.parts
              .filter((p) => p.type === 'text')
              .map((p) => p.text)
              .join('\n');
          }
        }
      }

      if (replyText && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ollama-token', {
          gear,
          model: ocTarget.full,
          token: replyText,
          done: true
        });
      }
      return { ok: true, model: ocTarget.full };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  if (appConfig.mode === 'opencode') {
    return await tryOpenCodeChat();
  }

  // 2. Otherwise try local Ollama first, and fall back to OpenCode if Ollama isn't running!
  const modelName = gearData.ollamaModel || 'llama3.2:3b';
  const ollamaResult = await new Promise((resolve) => {
    try {
      const url = new URL('/api/generate', appConfig.ollamaHost);
      const body = JSON.stringify({
        model: modelName,
        prompt,
        stream: true
      });

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        },
        (res) => {
          if (res.statusCode >= 400) {
            let errBody = '';
            res.on('data', (c) => (errBody += c));
            res.on('end', () => {
              resolve({ ok: false, error: `Ollama returned ${res.statusCode}: ${errBody}` });
            });
            return;
          }

          res.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const msg = JSON.parse(line);
                if (msg.response && mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('ollama-token', {
                    gear,
                    model: modelName,
                    token: msg.response,
                    done: !!msg.done,
                    evalCount: msg.eval_count,
                    evalDuration: msg.eval_duration
                  });
                }
              } catch (_) {}
            }
          });

          res.on('end', () => resolve({ ok: true, model: modelName }));
        }
      );

      req.on('error', (err) => {
        resolve({
          ok: false,
          connectionRefused: true,
          error: `Ollama is not running at ${appConfig.ollamaHost} (${err.message}).`
        });
      });

      req.write(body);
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });

  if (!ollamaResult.ok && ollamaResult.connectionRefused && fs.existsSync(OPENCODE_EXE_PATH)) {
    return await tryOpenCodeChat();
  }
  return ollamaResult;
});

ipcMain.handle('get-init-state', async () => {
  const ollamaStatus = await discoverOllamaModels();
  return {
    mode: appConfig.mode,
    projectDir,
    isAlwaysOnTop,
    isGarageOpen,
    autoSendKeys,
    hasOpenCodeExe: fs.existsSync(OPENCODE_EXE_PATH),
    gears: getCurrentGears(),
    allPresets: appConfig.gearsByMode,
    ollamaStatus,
    proxyPort: appConfig.proxyPort
  };
});

ipcMain.handle('toggle-auto-send-keys', () => {
  autoSendKeys = !autoSendKeys;
  return autoSendKeys;
});

ipcMain.handle('set-mode', (_, mode) => {
  if (mode === 'opencode' || mode === 'ollama' || mode === 'claude') {
    appConfig.mode = mode;
    saveConfig();
    const gears = getCurrentGears();
    if (gears[appConfig.activeGear]) {
      syncOpenCodeAndClaudeConfigs(appConfig.activeGear, gears[appConfig.activeGear]);
    }
  }
  return {
    mode: appConfig.mode,
    gears: getCurrentGears()
  };
});

ipcMain.handle('discover-ollama', async (_, autoMap = false) => {
  const status = await discoverOllamaModels();
  if (autoMap && status.models.length > 0) {
    const sorted = [...status.models].sort((a, b) => (a.size || 0) - (b.size || 0));
    const slotKeys = ['1', '2', '3', '4', '5', 'R'];
    slotKeys.forEach((gKey, idx) => {
      const m = sorted[idx % sorted.length];
      if (m) {
        const short = m.name.split(':')[0].toUpperCase().slice(0, 11);
        appConfig.gearsByMode.ollama[gKey] = {
          ...appConfig.gearsByMode.ollama[gKey],
          shortLabel: short,
          model: m.name.toUpperCase(),
          ollamaModel: m.name,
          opencodeProvider: 'ollama',
          opencodeModelId: m.name,
          opencodeModel: `ollama/${m.name}`,
          claudeModel: m.name,
          cmd: `/model ${m.name}`,
          launchCmd: `ollama run ${m.name}`
        };
      }
    });
    saveConfig();
  }
  const gears = getCurrentGears();
  if (gears[appConfig.activeGear]) {
    syncOpenCodeAndClaudeConfigs(appConfig.activeGear, gears[appConfig.activeGear]);
  }
  return {
    ollamaStatus: status,
    gears: getCurrentGears()
  };
});

ipcMain.handle('unload-ollama-model', async (_, { gear }) => {
  const gears = getCurrentGears();
  const g = gears[gear];
  if (!g) return false;
  return await warmOllamaModel(g.ollamaModel || g.model.toLowerCase(), 0);
});

ipcMain.handle('toggle-always-on-top', () => {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop);
  return isAlwaysOnTop;
});

ipcMain.handle('toggle-garage', (_, forceState) => {
  isGarageOpen = typeof forceState === 'boolean' ? forceState : !isGarageOpen;
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    const targetWidth = isGarageOpen ? 920 : 346;
    mainWindow.setBounds(
      {
        x: bounds.x,
        y: bounds.y,
        width: targetWidth,
        height: Math.max(bounds.height, 625)
      },
      true
    );
  }
  return isGarageOpen;
});

ipcMain.handle('pick-directory', async () => {
  if (!mainWindow) return projectDir;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Project Directory',
    defaultPath: projectDir,
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths && result.filePaths[0]) {
    projectDir = result.filePaths[0];
    appConfig.projectDir = projectDir;
    saveConfig();
    for (const [, sess] of gearSessions.entries()) {
      if (!sess.killed && sess.process.stdin.writable) {
        sess.process.stdin.write(`Set-Location -LiteralPath "${projectDir}"\r\n`);
      }
    }
  }
  return projectDir;
});

ipcMain.handle('shift-gear', async (_, { gear, effort, autoCopy, launchWT }) => {
  appConfig.activeGear = gear;
  if (gear === 'N') {
    try {
      fs.writeFileSync(OPENCODE_ACTIVE_GEAR_PATH, JSON.stringify({ active: false, gear: 'N' }, null, 2), 'utf8');
    } catch (_) {}
    return { status: 'neutral', gear: 'N' };
  }
  const gears = getCurrentGears();
  const gearData = gears[gear];
  if (!gearData) return { status: 'error' };

  const session = ensureGearSession(gear, gearData, effort);

  // Sync OpenCode (plugin state + opencode.jsonc + live sidecar) & Claude (~/.claude/settings.json)
  const syncedTargets = syncOpenCodeAndClaudeConfigs(gear, gearData);

  if (autoCopy) {
    clipboard.writeText(gearData.cmd);
  }

  if (autoSendKeys) {
    injectModelCommandToActiveTerminal(gearData.cmd);
  }

  if (appConfig.mode === 'ollama' && gearData.ollamaModel) {
    warmOllamaModel(gearData.ollamaModel, '30m').catch(() => {});
  }

  if (launchWT && process.platform === 'win32') {
    openOrFocusWindowsTerminalTab(gear, gearData, effort);
  }

  return {
    status: 'shifted',
    gear,
    pid: session.pid,
    logs: session.logs,
    copiedCmd: gearData.cmd,
    syncedTargets
  };
});

ipcMain.handle('launch-opencode-app', () => {
  try {
    repairOpenCodeStoreIfCorrupt();
    installOpenCodeLivePlugin();
    const gears = getCurrentGears();
    const g = gears[appConfig.activeGear] || gears['4'];
    syncOpenCodeAndClaudeConfigs(appConfig.activeGear, g);

    if (fs.existsSync(OPENCODE_EXE_PATH)) {
      spawn(OPENCODE_EXE_PATH, [], {
        cwd: fs.existsSync(projectDir) ? projectDir : os.homedir(),
        detached: true,
        stdio: 'ignore'
      }).unref();
      return { ok: true, target: 'OpenCode Desktop' };
    }
    openOrFocusWindowsTerminalTab(appConfig.activeGear, g, 'HIGH');
    return { ok: true, target: 'Windows Terminal' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function openOrFocusWindowsTerminalTab(gear, gearData) {
  try {
    const cwd = fs.existsSync(projectDir) ? projectDir : os.homedir();
    if (wtTabIndexByGear.has(gear)) {
      const tabIdx = wtTabIndexByGear.get(gear);
      spawn('wt.exe', ['-w', 'model-shift', 'focus-tab', '-t', String(tabIdx)], {
        cwd,
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else {
      const tabIdx = wtTabCounter++;
      wtTabIndexByGear.set(gear, tabIdx);
      const title = `gearshift:${gear}.0 · ${gearData.model}`;
      const startupMsg = `Write-Host '=== MODEL SHIFT [gearshift:${gear}.0] ${gearData.model} ===' -ForegroundColor Yellow; Write-Host 'Synced to OpenCode & Claude: ${gearData.cmd}' -ForegroundColor Cyan`;
      spawn(
        'wt.exe',
        [
          '-w',
          'model-shift',
          'new-tab',
          '--title',
          title,
          '-d',
          cwd,
          'powershell.exe',
          '-NoExit',
          '-Command',
          startupMsg
        ],
        {
          cwd,
          detached: true,
          stdio: 'ignore'
        }
      ).unref();
    }
    return true;
  } catch (err) {
    console.error('Failed to launch Windows Terminal:', err);
    return false;
  }
}

ipcMain.handle('open-wt-tab', (_, { gear, effort }) => {
  const gears = getCurrentGears();
  const gearData = gears[gear];
  if (!gearData) return false;
  return openOrFocusWindowsTerminalTab(gear, gearData, effort || 'HIGH');
});

ipcMain.handle('send-terminal-input', (_, { gear, input }) => {
  const gears = getCurrentGears();
  const gearData = gears[gear];
  if (!gearData) return false;
  const session = ensureGearSession(gear, gearData);
  if (session && !session.killed && session.process.stdin.writable) {
    session.process.stdin.write(input + '\r\n');
    return true;
  }
  return false;
});

ipcMain.handle('launch-agent-in-garage', (_, { gear, effort }) => {
  const gears = getCurrentGears();
  const gearData = gears[gear];
  if (!gearData) return false;
  syncOpenCodeAndClaudeConfigs(gear, gearData);

  if (fs.existsSync(OPENCODE_EXE_PATH) && appConfig.mode === 'opencode') {
    repairOpenCodeStoreIfCorrupt();
    spawn(OPENCODE_EXE_PATH, [], {
      cwd: fs.existsSync(projectDir) ? projectDir : os.homedir(),
      detached: true,
      stdio: 'ignore'
    }).unref();
    return { launched: 'OpenCode Desktop', model: gearData.model };
  }

  const session = ensureGearSession(gear, gearData, effort);
  if (session && !session.killed && session.process.stdin.writable) {
    const binName = gearData.launchCmd.trim().split(/\s+/)[0];
    const safeCmd = gearData.launchCmd;
    const psCheckAndRun =
      `if (Get-Command "${binName}" -ErrorAction SilentlyContinue) { ` +
      `Write-Host ">> Launching [${gearData.model}]: ${safeCmd}" -ForegroundColor Yellow; ${safeCmd} ` +
      `} elseif (Test-Path "${OPENCODE_EXE_PATH}") { ` +
      `Write-Host ">> '${binName}' CLI not in PATH — launching OpenCode Desktop synced to Gear ${gear} (${gearData.model})!" -ForegroundColor Cyan; Start-Process "${OPENCODE_EXE_PATH}" ` +
      `} else { ` +
      `Write-Host ">> '${binName}' CLI is not installed yet. OpenCode & Claude configs are synced to ${gearData.model}." -ForegroundColor Cyan ` +
      `}\r\n`;
    session.process.stdin.write(psCheckAndRun);
    return { launched: 'Shell', model: gearData.model };
  }
  return false;
});

ipcMain.handle('update-gear-config', (_, { gears, ollamaHost }) => {
  if (ollamaHost) appConfig.ollamaHost = ollamaHost;
  appConfig.gearsByMode[appConfig.mode] = {
    ...appConfig.gearsByMode[appConfig.mode],
    ...gears
  };
  saveConfig();
  const current = getCurrentGears();
  if (current[appConfig.activeGear]) {
    syncOpenCodeAndClaudeConfigs(appConfig.activeGear, current[appConfig.activeGear]);
  }
  return current;
});

ipcMain.handle('reset-gear-config', () => {
  appConfig.gearsByMode[appConfig.mode] = JSON.parse(JSON.stringify(PRESETS[appConfig.mode]));
  saveConfig();
  return getCurrentGears();
});

ipcMain.handle('window-control', (_, action) => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'close') mainWindow.close();
});

// Prevent Chromium disk_cache (0x5) and process_singleton_win.cc (0x20) lockfile errors on Windows
// by giving each run its own isolated Chromium sessionData directory while keeping user config in userData.
try {
  app.setPath('sessionData', path.join(os.tmpdir(), `model-shift-session-${process.pid}`));
} catch (_) {}
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

function closePreviousInstanceIfRunning() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: appConfig.proxyPort || 11435,
        path: '/__modelshift/replace',
        method: 'POST',
        timeout: 350
      },
      () => setTimeout(resolve, 120)
    );
    req.on('error', () => resolve());
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });
    req.end();
  });
}

app.whenReady().then(async () => {
  await closePreviousInstanceIfRunning();
  createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (proxyServer) {
    try {
      proxyServer.close();
    } catch (_) {}
  }
  for (const [, sess] of gearSessions.entries()) {
    try {
      sess.process.kill();
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  app.quit();
});


