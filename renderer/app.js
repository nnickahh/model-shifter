// Model Shift v3 - Video-Accurate Carbon Chassis + Live OpenCode, Ollama & Claude Controller

const DEFAULT_OPENCODE_GEARS = {
  '1': { gear: '1', col: 0, row: 0, shortLabel: 'MIMO V2.6', model: 'MIMO V2.6 FLASH', opencodeModelId: 'mimo-v2.6-flash-free', ollamaModel: 'llama3.2:3b', cmd: '/model mimo-v2.6-flash-free', launchCmd: 'opencode --model opencode/mimo-v2.6-flash-free', color: '#ffb340', rpm: 3400, dot: [8, 13], desc: '1st Gear · Ultra-fast lightweight OpenCode Zen model (Free)' },
  '2': { gear: '2', col: 0, row: 1, shortLabel: 'LING 3.1', model: 'LING 3.1 FLASH', opencodeModelId: 'ling-3.1-flash-free', ollamaModel: 'qwen2.5-coder:7b', cmd: '/model ling-3.1-flash-free', launchCmd: 'opencode --model opencode/ling-3.1-flash-free', color: '#ffb340', rpm: 4300, dot: [8, 33], desc: '2nd Gear · Daily driver coding & fast edits (Free)' },
  '3': { gear: '3', col: 1, row: 0, shortLabel: 'BIG PICKLE', model: 'BIG PICKLE', opencodeModelId: 'big-pickle', ollamaModel: 'deepseek-r1:8b', cmd: '/model big-pickle', launchCmd: 'opencode --model opencode/big-pickle', color: '#ffb340', rpm: 5100, dot: [20, 13], desc: '3rd Gear · Balanced reasoning & agent workflows (Free)' },
  '4': { gear: '4', col: 1, row: 1, shortLabel: 'NEMOTRON 3.5', model: 'NEMOTRON 3.5', opencodeModelId: 'nemotron-3.5-lightning-free', ollamaModel: 'qwen2.5-coder:14b', cmd: '/model nemotron-3.5-lightning-free', launchCmd: 'opencode --model opencode/nemotron-3.5-lightning-free', color: '#ffb340', rpm: 5900, dot: [20, 33], desc: '4th Gear · Heavy multi-file architecture & debugging (Free)' },
  '5': { gear: '5', col: 2, row: 0, shortLabel: 'NEMO ULTRA', model: 'NEMOTRON 3 ULTRA', opencodeModelId: 'nemotron-3-ultra-free', ollamaModel: 'deepseek-r1:32b', cmd: '/model nemotron-3-ultra-free', launchCmd: 'opencode --model opencode/nemotron-3-ultra-free', color: '#ff6b4a', rpm: 7100, dot: [32, 13], desc: '5th Gear · Max compute redline reasoning model (Free)' },
  R:   { gear: 'R', col: 2, row: 1, shortLabel: 'LONGCAT 2.5', model: 'LONGCAT 2.5', opencodeModelId: 'longcat-2.5-preview-free', ollamaModel: 'llama3.1:8b', cmd: '/model longcat-2.5-preview-free', launchCmd: 'opencode --model opencode/longcat-2.5-preview-free', color: '#e0e3ea', rpm: 3200, dot: [32, 33], desc: 'Reverse · High-throughput fallback model (Free)' }
};

let G = { ...DEFAULT_OPENCODE_GEARS };
let currentMode = 'opencode'; // 'opencode' | 'ollama' | 'claude'
let ollamaStatus = { online: false, models: [], runningModels: [], host: 'http://127.0.0.1:11434', proxyPort: 11435, opencodeConnected: false };

// H-Gate Stage geometry (220x220 stage, 204x204 plate centered at 110,110)
const COL_X = [48, 110, 172];
const ROW_Y = [48, 172];
const NEUTRAL_Y = 110;
const TOP_ROW_GEARS = ['1', '3', '5'];
const BOT_ROW_GEARS = ['2', '4', 'R'];

// State
let currentGear = '4';
let knobPos = { x: 110, y: 172 };
let soundEnabled = true;
let isPinned = true;
let isGarageOpen = false;
let activeGarageTab = '4';
let garageSubMode = 'chat'; // 'chat' (AI Chat via OpenCode/Ollama) | 'shell' (PowerShell)

// Per-gear logs
const gearChatLogs = { '1': [], '2': [], '3': [], '4': [], '5': [], R: [] };
const gearShellLogs = { '1': [], '2': [], '3': [], '4': [], '5': [], R: [] };
const warmGears = new Set(['4']);
const cmdHistory = [];
let historyIdx = -1;

// DOM Elements
const knobEl = document.getElementById('knob');
const dotEl = document.getElementById('dot');
const numEl = document.getElementById('num');
const mdlEl = document.getElementById('mdl');
const cmdEl = document.getElementById('cmd');
const needleEl = document.getElementById('needle');
const gateStageEl = document.getElementById('gateStage');
const sessionLabelEl = document.getElementById('sessionLabel');
const ollamaStatusDotEl = document.getElementById('ollamaStatusDot');
const btnModeEl = document.getElementById('btnMode');

// Hardware Square Buttons inside OLED
const btnHwAttach = document.getElementById('btnHwAttach');
const btnHwSync = document.getElementById('btnHwSync');
const btnHwNewTab = document.getElementById('btnHwNewTab');
const btnHwStop = document.getElementById('btnHwStop');

// Garage DOM Elements
const terminalPaneEl = document.getElementById('terminalPane');
const configPaneEl = document.getElementById('configPane');
const terminalOutputEl = document.getElementById('terminalOutput');
const terminalFormEl = document.getElementById('terminalForm');
const terminalInputEl = document.getElementById('terminalInput');
const promptChevronEl = document.getElementById('promptChevron');
const gtBadgeEl = document.getElementById('gtBadge');
const gtDescEl = document.getElementById('gtDesc');
const cfgGridEl = document.getElementById('cfgGrid');
const ollamaDiscoverStatusEl = document.getElementById('ollamaDiscoverStatus');
const btnSubChat = document.getElementById('btnSubChat');
const btnSubShell = document.getElementById('btnSubShell');

function formatModeLabel(mode) {
  if (mode === 'opencode') return '⚡ OPENCODE';
  if (mode === 'ollama') return '🦙 OLLAMA';
  return '⚡ CLAUDE';
}

function getActiveModelTag(gInfo) {
  if (!gInfo) return 'big-pickle';
  if (currentMode === 'ollama') return gInfo.ollamaModel || gInfo.model;
  if (currentMode === 'opencode') return gInfo.opencodeModelId || gInfo.model;
  return gInfo.claudeModel || gInfo.opencodeModelId || gInfo.model;
}

// ============================================================================
// 1. ANALOG SVG TACHOMETER INITIALIZATION & ANIMATION
// ============================================================================
const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const rpmToAngle = (rpm) => -80 + (clamp(rpm, 0, 8000) / 8000) * 160;
const polarToXY = (deg, radius) => {
  const rad = (deg * Math.PI) / 180;
  return [75 + radius * Math.sin(rad), 82 - radius * Math.cos(rad)];
};

(function initTachometerSVG() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const makeArcPath = (startAngle, endAngle, radius) => {
    const start = polarToXY(startAngle, radius);
    const end = polarToXY(endAngle, radius);
    return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} A ${radius} ${radius} 0 0 1 ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
  };

  document.getElementById('tachArc').setAttribute('d', makeArcPath(-80, 80, 56));
  document.getElementById('tachRedline').setAttribute('d', makeArcPath(rpmToAngle(6500), 80, 56));

  const ticksGroup = document.getElementById('tachTicks');
  const labelsGroup = document.getElementById('tachLabels');

  for (let i = 0; i <= 8; i++) {
    const angle = rpmToAngle(i * 1000);
    const inner = polarToXY(angle, 49);
    const outer = polarToXY(angle, 58);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', inner[0]);
    line.setAttribute('y1', inner[1]);
    line.setAttribute('x2', outer[0]);
    line.setAttribute('y2', outer[1]);
    ticksGroup.appendChild(line);

    if (i % 2 === 0) {
      const labelPos = polarToXY(angle, 40);
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', labelPos[0]);
      text.setAttribute('y', labelPos[1] + 3);
      text.textContent = i;
      labelsGroup.appendChild(text);
    }
  }
})();

let currentRPM = 0;
let targetRPM = 2200;
let revTimeout = null;

function animateTachometer(timestamp) {
  const jitter = Math.sin(timestamp / 280) * 55 + Math.sin(timestamp / 83) * 22;
  currentRPM += (targetRPM + jitter - currentRPM) * 0.08;
  needleEl.style.transform = `rotate(${rpmToAngle(currentRPM)}deg)`;
  requestAnimationFrame(animateTachometer);
}
requestAnimationFrame(animateTachometer);

function revTachometerForGear(gear) {
  const gearPeak = gear === 'N' ? 900 : (G[gear] && G[gear].rpm) || 4000;
  targetRPM = clamp(gearPeak, 800, 7900);
  clearTimeout(revTimeout);
  const cruiseRPM = gear === 'N' ? 850 : clamp(1600 + (gearPeak - 3000) * 0.35, 1300, 3400);
  revTimeout = setTimeout(() => {
    targetRPM = cruiseRPM;
  }, 850);
}

// ============================================================================
// 2. SYNTHESIZED WEB AUDIO FX (CLUNK & REDLINE REV)
// ============================================================================
let audioCtx = null;

function ensureAudio() {
  if (!soundEnabled) return null;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch (_) {
    return null;
  }
}

function playShiftClunk() {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(195, t);
    osc.frequency.exponentialRampToValueAtTime(66, t + 0.075);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch (_) {}
}

function playRedlineRev() {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t);
    osc.frequency.exponentialRampToValueAtTime(270, t + 0.22);
    osc.frequency.exponentialRampToValueAtTime(92, t + 0.65);
    filter.type = 'lowpass';
    filter.frequency.value = 840;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.72);
  } catch (_) {}
}

function spawnSparks(originX, originY) {
  const colors = ['#ffb340', '#ffd27d', '#ff6b4a', '#ffffff'];
  for (let i = 0; i < 20; i++) {
    const sp = document.createElement('div');
    sp.className = 'spark';
    sp.style.left = `${originX}px`;
    sp.style.top = `${originY}px`;
    sp.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 95;
    sp.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
    sp.style.setProperty('--sy', `${Math.sin(angle) * dist - 35}px`);
    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 800);
  }
}

// ============================================================================
// 3. SHIFTING LOGIC & H-GATE PHYSICS
// ============================================================================
function renderGearLabels() {
  ['1', '2', '3', '4', '5', 'R'].forEach((k) => {
    const g = G[k];
    if (!g) return;
    const lbl = document.getElementById(`lbl-${k}`);
    if (lbl) lbl.textContent = g.shortLabel || g.model;
    const tabLbl = document.getElementById(`tablbl-${k}`);
    if (tabLbl) tabLbl.textContent = g.shortLabel || g.model;
    const labBox = document.getElementById(`lab-${k}`);
    if (labBox) labBox.classList.toggle('active-gear', currentGear === k);
  });
}

async function shiftToNeutral(silent = false) {
  knobPos = { x: 110, y: NEUTRAL_Y };
  currentGear = 'N';
  knobEl.style.left = `${knobPos.x}px`;
  knobEl.style.top = `${knobPos.y}px`;

  numEl.textContent = 'N';
  mdlEl.textContent = 'NEUTRAL';
  sessionLabelEl.textContent = `gearshift:N · idle`;
  cmdEl.textContent = `neutral → standby`;

  dotEl.setAttribute('cx', 20);
  dotEl.setAttribute('cy', 23);

  revTachometerForGear('N');
  renderGearLabels();
  if (!silent) playShiftClunk();

  if (window.modelShiftAPI) {
    await window.modelShiftAPI.shiftGear({ gear: 'N' });
  }
}

async function shiftToGear(gearKey, silent = false) {
  if (gearKey === 'N') return shiftToNeutral(silent);
  const n = G[gearKey];
  if (!n) return;

  currentGear = gearKey;
  knobPos = { x: COL_X[n.col], y: ROW_Y[n.row] };
  knobEl.style.left = `${knobPos.x}px`;
  knobEl.style.top = `${knobPos.y}px`;

  dotEl.setAttribute('cx', n.dot[0]);
  dotEl.setAttribute('cy', n.dot[1]);
  dotEl.setAttribute('fill', '#ffb340');

  numEl.textContent = gearKey;
  mdlEl.textContent = n.model;

  const sessionTag = `gearshift:${gearKey}.0`;
  const modeSuffix = currentMode === 'opencode' ? 'opencode' : currentMode === 'ollama' ? '11435' : 'claude';
  sessionLabelEl.textContent = `${sessionTag} · ${modeSuffix}`;
  cmdEl.textContent = `${n.cmd} → ${sessionTag}`;

  numEl.classList.remove('pop');
  void numEl.offsetWidth;
  numEl.classList.add('pop');

  revTachometerForGear(gearKey);
  renderGearLabels();

  if (gearKey === '5') {
    document.body.classList.remove('redline');
    void document.body.offsetWidth;
    document.body.classList.add('redline');
    if (!silent) {
      playRedlineRev();
      const rect = knobEl.getBoundingClientRect();
      spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  } else {
    document.body.classList.remove('redline');
    if (!silent) playShiftClunk();
  }

  warmGears.add(gearKey);
  updateWarmIndicators();
  if (activeGarageTab !== 'CFG') {
    switchGarageTab(gearKey);
  }

  if (window.modelShiftAPI) {
    const res = await window.modelShiftAPI.shiftGear({
      gear: gearKey,
      effort: 'HIGH',
      autoCopy: true,
      launchWT: false
    });
    if (res && res.syncedTargets && res.syncedTargets.length) {
      cmdEl.textContent = `${n.cmd} → ${res.syncedTargets.join(' + ')}`;
    }
    if (res && res.logs && gearShellLogs[gearKey].length === 0) {
      gearShellLogs[gearKey] = res.logs.map((l) => ({ stream: l.stream, text: l.text }));
      if (activeGarageTab === gearKey && garageSubMode === 'shell') renderTerminalLogs();
    }
  }
}

// H-Pattern Gate Constraint Math
function nearestColIndex(xVal) {
  let bestIdx = 0;
  let bestDist = 1e9;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(COL_X[i] - xVal);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function constrainToHGate(targetX, targetY) {
  const neutralBand = 18;
  if (Math.abs(knobPos.y - NEUTRAL_Y) < neutralBand) {
    const clampedX = clamp(targetX, COL_X[0], COL_X[2]);
    const colIdx = nearestColIndex(clampedX);
    if (Math.abs(clampedX - COL_X[colIdx]) < 18 && Math.abs(targetY - NEUTRAL_Y) > 6) {
      return { x: COL_X[colIdx], y: clamp(targetY, ROW_Y[0], ROW_Y[1]) };
    }
    return { x: clampedX, y: NEUTRAL_Y };
  }
  const colIdx = nearestColIndex(knobPos.x);
  const clampedY = clamp(targetY, ROW_Y[0], ROW_Y[1]);
  if (Math.abs(clampedY - NEUTRAL_Y) < neutralBand) {
    return { x: clamp(targetX, COL_X[0], COL_X[2]), y: NEUTRAL_Y };
  }
  return { x: COL_X[colIdx], y: clampedY };
}

let isDraggingKnob = false;

knobEl.addEventListener('pointerdown', (e) => {
  isDraggingKnob = true;
  knobEl.style.transition = 'none';
  knobEl.setPointerCapture(e.pointerId);
});

knobEl.addEventListener('pointermove', (e) => {
  if (!isDraggingKnob) return;
  const rect = gateStageEl.getBoundingClientRect();
  knobPos = constrainToHGate(e.clientX - rect.left, e.clientY - rect.top);
  knobEl.style.left = `${knobPos.x}px`;
  knobEl.style.top = `${knobPos.y}px`;
});

function finishKnobDrag() {
  if (!isDraggingKnob) return;
  isDraggingKnob = false;
  knobEl.style.transition = 'left 0.36s cubic-bezier(0.3, 1.55, 0.5, 1), top 0.36s cubic-bezier(0.3, 1.55, 0.5, 1)';
  const colIdx = nearestColIndex(knobPos.x);
  const snapThreshold = 24;
  if (knobPos.y < NEUTRAL_Y - snapThreshold) {
    shiftToGear(TOP_ROW_GEARS[colIdx]);
  } else if (knobPos.y > NEUTRAL_Y + snapThreshold) {
    shiftToGear(BOT_ROW_GEARS[colIdx]);
  } else {
    shiftToNeutral();
  }
}

knobEl.addEventListener('pointerup', finishKnobDrag);
knobEl.addEventListener('pointercancel', finishKnobDrag);

document.querySelectorAll('.lab').forEach((el) => {
  el.addEventListener('click', () => shiftToGear(el.dataset.k));
});

document.getElementById('cmdRow').addEventListener('click', async () => {
  const g = G[currentGear];
  if (!g) return;
  try {
    await navigator.clipboard.writeText(g.cmd);
    cmdEl.textContent = `Copied: "${g.cmd}"`;
    setTimeout(() => {
      cmdEl.textContent = `${g.cmd} → OpenCode + Claude`;
    }, 1200);
  } catch (_) {}
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const k = e.key.toUpperCase();
  if (['1', '2', '3', '4', '5', 'R'].includes(k)) {
    e.preventDefault();
    shiftToGear(k);
  } else if (k === 'N' || k === '0' || e.key === 'Escape') {
    e.preventDefault();
    shiftToNeutral();
  }
});

// ============================================================================
// 4. OLED HARDWARE BUTTONS & TOP BEZEL CONTROLS
// ============================================================================
const btnAutoKeys = document.getElementById('btnAutoKeys');
const btnSound = document.getElementById('btnSound');
const btnPin = document.getElementById('btnPin');
const btnMin = document.getElementById('btnMin');
const btnClose = document.getElementById('btnClose');

if (btnAutoKeys) {
  btnAutoKeys.addEventListener('click', async () => {
    if (!window.modelShiftAPI) return;
    const enabled = await window.modelShiftAPI.toggleAutoSendKeys();
    btnAutoKeys.classList.toggle('active', enabled);
    cmdEl.textContent = enabled
      ? 'Auto-Type /model to active window: ON'
      : 'Auto-Type /model: OFF (Live Plugin active)';
  });
}

btnModeEl.addEventListener('click', async () => {
  const modes = ['opencode', 'ollama', 'claude'];
  const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
  if (window.modelShiftAPI) {
    const res = await window.modelShiftAPI.setMode(nextMode);
    currentMode = res.mode;
    G = res.gears;
  } else {
    currentMode = nextMode;
  }
  btnModeEl.textContent = formatModeLabel(currentMode);
  renderGearLabels();
  if (currentGear !== 'N') shiftToGear(currentGear, true);
  if (activeGarageTab === 'CFG') renderConfigEditor();
  else renderTerminalLogs();
});

btnSound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  btnSound.classList.toggle('active', soundEnabled);
  if (soundEnabled) playShiftClunk();
});

btnPin.addEventListener('click', async () => {
  if (window.modelShiftAPI) {
    isPinned = await window.modelShiftAPI.toggleAlwaysOnTop();
  } else {
    isPinned = !isPinned;
  }
  btnPin.classList.toggle('active', isPinned);
});

btnMin.addEventListener('click', () => {
  if (window.modelShiftAPI) window.modelShiftAPI.windowControl('minimize');
});

btnClose.addEventListener('click', () => {
  if (window.modelShiftAPI) window.modelShiftAPI.windowControl('close');
});

// [>] Attach / Open Garage Drawer
btnHwAttach.addEventListener('click', async () => {
  if (window.modelShiftAPI) {
    isGarageOpen = await window.modelShiftAPI.toggleGarage();
  } else {
    isGarageOpen = !isGarageOpen;
  }
  document.body.classList.toggle('garage-open', isGarageOpen);
  btnHwAttach.classList.toggle('active', isGarageOpen);
});

// [↻] Sync & Auto-Map Models
btnHwSync.addEventListener('click', async () => {
  if (!window.modelShiftAPI) return;
  cmdEl.textContent = 'Syncing OpenCode & scanning Ollama...';
  const res = await window.modelShiftAPI.discoverOllama(true);
  if (res) {
    ollamaStatus = res.ollamaStatus;
    G = res.gears;
    updateOllamaStatusUI();
    renderGearLabels();
    if (currentGear !== 'N') shiftToGear(currentGear, true);
    if (activeGarageTab === 'CFG') renderConfigEditor();
    const count = ollamaStatus.models.length;
    cmdEl.textContent = count > 0
      ? `Synced ${count} Ollama model(s) + OpenCode`
      : `Synced Gear ${currentGear} → OpenCode + Claude`;
  }
});

// [+] Launch OpenCode Desktop (or Windows Terminal) with Active Gear
btnHwNewTab.addEventListener('click', async () => {
  if (window.modelShiftAPI) {
    const res = await window.modelShiftAPI.launchOpenCodeApp();
    if (res && res.ok) {
      cmdEl.textContent = `Launched ${res.target} (Gear ${currentGear})`;
    }
  }
});

// [×] Unload Ollama Model / Shift to Neutral
btnHwStop.addEventListener('click', async () => {
  if (window.modelShiftAPI && currentGear !== 'N') {
    await window.modelShiftAPI.unloadOllamaModel({ gear: currentGear });
  }
  shiftToNeutral();
});

document.getElementById('sessionTarget').addEventListener('click', async () => {
  if (window.modelShiftAPI) {
    const dir = await window.modelShiftAPI.pickDirectory();
    if (dir) {
      cmdEl.textContent = `DIR → ${dir}`;
    }
  }
});

function updateOllamaStatusUI() {
  const isHealthy = Boolean(ollamaStatus.online || ollamaStatus.opencodeConnected || currentMode === 'opencode');
  ollamaStatusDotEl.classList.toggle('online', isHealthy);
  if (ollamaDiscoverStatusEl) {
    if (ollamaStatus.online) {
      ollamaDiscoverStatusEl.textContent = `● Local Ollama Online (${ollamaStatus.models.length} models) + Live OpenCode Plugin Active`;
    } else {
      ollamaDiscoverStatusEl.textContent = `● Live OpenCode Plugin Active (6 built-in free Zen models ready) · Local Ollama not running`;
    }
  }
}

function updateWarmIndicators() {
  ['1', '2', '3', '4', '5', 'R'].forEach((g) => {
    const dot = document.getElementById(`warm-${g}`);
    if (dot) dot.classList.toggle('live', warmGears.has(g));
  });
}

// ============================================================================
// 5. GARAGE DRAWER: DIRECT AI CHAT + SHELL TERMINAL + CONFIG
// ============================================================================
function setGarageSubMode(mode) {
  garageSubMode = mode;
  btnSubChat.classList.toggle('active', mode === 'chat');
  btnSubShell.classList.toggle('active', mode === 'shell');
  terminalInputEl.placeholder =
    mode === 'chat'
      ? "Ask this gear's AI model anything (e.g. 'can you see this?' or 'write a function')..."
      : 'Type a PowerShell command (e.g. dir, git status) or click 💬 AI Chat to talk to the AI...';
  renderTerminalLogs();
}

btnSubChat.addEventListener('click', () => setGarageSubMode('chat'));
btnSubShell.addEventListener('click', () => setGarageSubMode('shell'));

function switchGarageTab(tabId) {
  activeGarageTab = tabId;
  document.querySelectorAll('.g-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });

  if (tabId === 'CFG') {
    terminalPaneEl.classList.add('hidden');
    configPaneEl.classList.remove('hidden');
    renderConfigEditor();
  } else {
    configPaneEl.classList.add('hidden');
    terminalPaneEl.classList.remove('hidden');
    const gearInfo = G[tabId] || DEFAULT_OPENCODE_GEARS[tabId];
    gtBadgeEl.textContent = `GEAR ${tabId} · ${gearInfo.model}`;
    gtDescEl.textContent = `${gearInfo.desc}`;
    promptChevronEl.textContent = `G${tabId}❯`;
    renderTerminalLogs();
  }
}

document.querySelectorAll('.g-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    switchGarageTab(tab);
    if (tab !== 'CFG' && currentGear !== tab) {
      shiftToGear(tab);
    }
  });
});

function renderTerminalLogs() {
  if (activeGarageTab === 'CFG') return;
  const gInfo = G[activeGarageTab] || DEFAULT_OPENCODE_GEARS['4'];
  const activeTag = getActiveModelTag(gInfo);
  terminalOutputEl.innerHTML = '';

  if (garageSubMode === 'chat') {
    const logs = gearChatLogs[activeGarageTab] || [];
    if (logs.length === 0) {
      const intro = document.createElement('div');
      intro.className = 'log-system';
      intro.textContent =
        `[⚡ GEAR #${activeGarageTab} AI CHAT · ${gInfo.model} (${activeTag})]\n` +
        `• Type any question below (e.g. "can you see this?") to chat directly with Gear #${activeGarageTab}'s model!\n` +
        `• OpenCode Desktop Live Sync: Shifting the stick lever immediately switches OpenCode Desktop to "${activeTag}" on your very next message.\n`;
      terminalOutputEl.appendChild(intro);
      return;
    }
    const frag = document.createDocumentFragment();
    logs.forEach((entry) => {
      const div = document.createElement('span');
      div.className = entry.role === 'user' ? 'log-user' : entry.role === 'error' ? 'log-stderr' : 'log-ai';
      div.textContent = entry.text;
      frag.appendChild(div);
    });
    terminalOutputEl.appendChild(frag);
  } else {
    const logs = gearShellLogs[activeGarageTab] || [];
    if (logs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-system';
      empty.textContent = `[>_ POWERSHELL GEAR #${activeGarageTab}] Type a shell command, or click "💬 AI Chat" above to talk to ${gInfo.model}.\n`;
      terminalOutputEl.appendChild(empty);
      return;
    }
    const frag = document.createDocumentFragment();
    logs.forEach((entry) => {
      const span = document.createElement('span');
      if (entry.stream === 'system') span.className = 'log-system';
      else if (entry.stream === 'stderr') span.className = 'log-stderr';
      span.textContent = entry.text;
      frag.appendChild(span);
    });
    terminalOutputEl.appendChild(frag);
  }

  terminalOutputEl.scrollTop = terminalOutputEl.scrollHeight;
}

// Helper: detect if user accidentally typed a natural-language question while in >_ Shell mode
function looksLikeNaturalLanguageQuestion(input) {
  const trimmed = input.trim();
  if (trimmed.endsWith('?')) return true;
  if (/^(can you|what |how |why |who |hello|hi |hey |please |help |explain |write )/i.test(trimmed)) {
    return true;
  }
  return false;
}

terminalFormEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = terminalInputEl.value.trim();
  if (!text || activeGarageTab === 'CFG') return;
  cmdHistory.unshift(text);
  historyIdx = -1;
  terminalInputEl.value = '';

  const gKey = activeGarageTab;
  warmGears.add(gKey);
  updateWarmIndicators();

  // If user is on >_ Shell but typed a conversational question like "can you see this?", auto-switch to 💬 AI Chat!
  if (garageSubMode === 'shell' && looksLikeNaturalLanguageQuestion(text)) {
    setGarageSubMode('chat');
  }

  if (garageSubMode === 'chat' && window.modelShiftAPI) {
    const gInfo = G[gKey];
    const activeTag = getActiveModelTag(gInfo);
    gearChatLogs[gKey].push({ role: 'user', text: `\nYou ❯ ${text}\n` });
    const aiEntry = { role: 'ai', text: `${activeTag} ❯ ` };
    gearChatLogs[gKey].push(aiEntry);
    renderTerminalLogs();

    const res = await window.modelShiftAPI.ollamaChatStream({ gear: gKey, prompt: text });
    if (!res.ok) {
      gearChatLogs[gKey].push({
        role: 'error',
        text: `\n[Notice] ${res.error}\n`
      });
      renderTerminalLogs();
    } else {
      aiEntry.text += '\n';
      renderTerminalLogs();
    }
  } else if (window.modelShiftAPI) {
    await window.modelShiftAPI.sendTerminalInput({ gear: gKey, input: text });
  }
});

terminalInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && historyIdx + 1 < cmdHistory.length) {
    historyIdx++;
    terminalInputEl.value = cmdHistory[historyIdx];
  } else if (e.key === 'ArrowDown') {
    if (historyIdx > 0) {
      historyIdx--;
      terminalInputEl.value = cmdHistory[historyIdx];
    } else {
      historyIdx = -1;
      terminalInputEl.value = '';
    }
  }
});

document.getElementById('btnLaunchAgent').addEventListener('click', async () => {
  if (window.modelShiftAPI && activeGarageTab !== 'CFG') {
    const res = await window.modelShiftAPI.launchAgentInGarage({ gear: activeGarageTab, effort: 'HIGH' });
    if (res && res.launched === 'OpenCode Desktop') {
      cmdEl.textContent = `Launched OpenCode Desktop (${res.model})`;
    } else {
      setGarageSubMode('shell');
    }
  }
});

document.getElementById('btnOpenWT').addEventListener('click', async () => {
  if (window.modelShiftAPI && activeGarageTab !== 'CFG') {
    await window.modelShiftAPI.openWTTab({ gear: activeGarageTab, effort: 'HIGH' });
  }
});

document.getElementById('btnClearTerm').addEventListener('click', () => {
  if (activeGarageTab === 'CFG') return;
  if (garageSubMode === 'chat') gearChatLogs[activeGarageTab] = [];
  else gearShellLogs[activeGarageTab] = [];
  renderTerminalLogs();
});

const ACTIVE_OPENCODE_FREE_MODELS = [
  { id: 'mimo-v2.6-flash-free', short: 'MIMO V2.6', name: 'MIMO V2.6 FLASH' },
  { id: 'ling-3.1-flash-free', short: 'LING 3.1', name: 'LING 3.1 FLASH' },
  { id: 'big-pickle', short: 'BIG PICKLE', name: 'BIG PICKLE' },
  { id: 'nemotron-3.5-lightning-free', short: 'NEMOTRON 3.5', name: 'NEMOTRON 3.5' },
  { id: 'nemotron-3-ultra-free', short: 'NEMO ULTRA', name: 'NEMOTRON 3 ULTRA' },
  { id: 'longcat-2.5-preview-free', short: 'LONGCAT 2.5', name: 'LONGCAT 2.5' },
  { id: 'muse-spark-1.3-contributor-free', short: 'MUSE 1.3', name: 'MUSE SPARK 1.3' },
  { id: 'fledge-alpha-free', short: 'FLEDGE', name: 'FLEDGE ALPHA' },
  { id: 'space-bunny-free', short: 'SPACE BUNNY', name: 'SPACE BUNNY' },
  { id: 'ling-3.0-flash-fin-free', short: 'LING 3.0 FIN', name: 'LING 3.0 FIN' }
];

function renderConfigEditor() {
  updateOllamaStatusUI();
  cfgGridEl.innerHTML = '';
  const discoveredModels = (ollamaStatus && ollamaStatus.models) || [];

  ['1', '2', '3', '4', '5', 'R'].forEach((k) => {
    const g = G[k];
    const opencodeOptionsHtml =
      `<option value="">-- Pick Active OpenCode Free Model --</option>` +
      ACTIVE_OPENCODE_FREE_MODELS.map(
        (m) => `<option value="${m.id}" ${m.id === g.opencodeModelId ? 'selected' : ''}>${m.name} (${m.id})</option>`
      ).join('');

    const optionsHtml = discoveredModels.length
      ? `<option value="">-- Pick installed Ollama model --</option>` +
        discoveredModels
          .map((m) => `<option value="${m.name}" ${m.name === g.ollamaModel ? 'selected' : ''}>${m.name}</option>`)
          .join('')
      : '';

    const card = document.createElement('div');
    card.className = 'cfg-card';
    card.innerHTML = `
      <div class="cfg-card-top">
        <span>GEAR ${k}</span>
        <span>${g.shortLabel}</span>
      </div>
      <div class="cfg-field">
        <label>OpenCode Zen Free Models (Active)</label>
        <select data-opencode-select="${k}">${opencodeOptionsHtml}</select>
      </div>
      ${
        optionsHtml
          ? `<div class="cfg-field">
               <label>Installed Ollama Models</label>
               <select data-gear-select="${k}">${optionsHtml}</select>
             </div>`
          : ''
      }
      <div class="cfg-field">
        <label>Short Shifter Label</label>
        <input type="text" data-gear="${k}" data-field="shortLabel" value="${g.shortLabel}" />
      </div>
      <div class="cfg-field">
        <label>OLED Display Name</label>
        <input type="text" data-gear="${k}" data-field="model" value="${g.model}" />
      </div>
      <div class="cfg-field">
        <label>OpenCode Model ID (e.g. mimo-v2.6-flash-free, big-pickle)</label>
        <input type="text" data-gear="${k}" data-field="opencodeModelId" value="${g.opencodeModelId || ''}" />
      </div>
      <div class="cfg-field">
        <label>Ollama Model Tag (for Local Ollama Mode)</label>
        <input type="text" data-gear="${k}" data-field="ollamaModel" value="${g.ollamaModel || ''}" />
      </div>
      <div class="cfg-field">
        <label>CLI / Slash Command</label>
        <input type="text" data-gear="${k}" data-field="cmd" value="${g.cmd}" />
      </div>
    `;
    cfgGridEl.appendChild(card);
  });

  cfgGridEl.querySelectorAll('select[data-opencode-select]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const k = sel.dataset.opencodeSelect;
      const chosenId = sel.value;
      if (!chosenId) return;
      const found = ACTIVE_OPENCODE_FREE_MODELS.find((m) => m.id === chosenId);
      if (found) {
        cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="shortLabel"]`).value = found.short;
        cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="model"]`).value = found.name;
      }
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="opencodeModelId"]`).value = chosenId;
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="cmd"]`).value = `/model ${chosenId}`;
    });
  });

  cfgGridEl.querySelectorAll('select[data-gear-select]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const k = sel.dataset.gearSelect;
      const chosenTag = sel.value;
      if (!chosenTag) return;
      const short = chosenTag.split(':')[0].toUpperCase().slice(0, 11);
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="shortLabel"]`).value = short;
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="model"]`).value = chosenTag.toUpperCase();
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="ollamaModel"]`).value = chosenTag;
      cfgGridEl.querySelector(`input[data-gear="${k}"][data-field="cmd"]`).value = `/model ${chosenTag}`;
    });
  });
}

document.getElementById('btnAutoMapOllama').addEventListener('click', async () => {
  if (!window.modelShiftAPI) return;
  const res = await window.modelShiftAPI.discoverOllama(true);
  if (res) {
    ollamaStatus = res.ollamaStatus;
    G = res.gears;
    renderConfigEditor();
    renderGearLabels();
    if (currentGear !== 'N') shiftToGear(currentGear, true);
  }
});

document.getElementById('btnSaveCfg').addEventListener('click', async () => {
  cfgGridEl.querySelectorAll('input[data-gear]').forEach((inp) => {
    const gKey = inp.dataset.gear;
    const field = inp.dataset.field;
    if (G[gKey] && field) {
      G[gKey][field] = inp.value.trim();
      if (field === 'cmd') {
        G[gKey].launchCmd = inp.value.trim();
      }
      if (field === 'opencodeModelId' && inp.value.trim()) {
        G[gKey].opencodeModel = `opencode/${inp.value.trim()}`;
      }
    }
  });
  if (window.modelShiftAPI) {
    G = await window.modelShiftAPI.updateGearConfig({ gears: G });
  }
  renderGearLabels();
  if (currentGear !== 'N') shiftToGear(currentGear, true);
});

document.getElementById('btnResetCfg').addEventListener('click', async () => {
  if (window.modelShiftAPI) {
    G = await window.modelShiftAPI.resetGearConfig();
  }
  renderConfigEditor();
  renderGearLabels();
  if (currentGear !== 'N') shiftToGear(currentGear, true);
});

// ============================================================================
// 6. IPC LISTENERS & INIT
// ============================================================================
(async function initApp() {
  if (window.modelShiftAPI) {
    const state = await window.modelShiftAPI.getInitState();
    if (state) {
      currentMode = state.mode || 'opencode';
      btnModeEl.textContent = formatModeLabel(currentMode);
      isPinned = state.isAlwaysOnTop;
      btnPin.classList.toggle('active', isPinned);
      if (state.gears) G = state.gears;
      if (state.ollamaStatus) ollamaStatus = state.ollamaStatus;
      updateOllamaStatusUI();
    }

    window.modelShiftAPI.onGearOutput((data) => {
      const { gear, stream, text, estTokensDelta } = data;
      if (!gearShellLogs[gear]) gearShellLogs[gear] = [];
      gearShellLogs[gear].push({ stream, text });
      if (gearShellLogs[gear].length > 350) gearShellLogs[gear].shift();

      if (estTokensDelta) {
        targetRPM = clamp(targetRPM + estTokensDelta * 28, 1600, 7800);
      }
      if (activeGarageTab === gear && garageSubMode === 'shell') {
        renderTerminalLogs();
      }
    });

    window.modelShiftAPI.onOllamaToken((data) => {
      const { gear, token, evalCount, evalDuration } = data;
      const list = gearChatLogs[gear] || [];
      const last = list[list.length - 1];
      if (last && last.role === 'ai') {
        last.text += token;
      } else {
        list.push({ role: 'ai', text: token });
      }
      if (evalCount && evalDuration) {
        const tokPerSec = evalCount / (evalDuration / 1e9);
        targetRPM = clamp(tokPerSec * 100, 1800, 7900);
      } else {
        targetRPM = clamp(targetRPM + 350, 2600, 7600);
      }
      clearTimeout(revTimeout);
      revTimeout = setTimeout(() => {
        targetRPM = 1800;
      }, 750);

      if (activeGarageTab === gear && garageSubMode === 'chat') {
        renderTerminalLogs();
      }
    });

    window.modelShiftAPI.onProxyActivity((data) => {
      cmdEl.textContent = `Live → ${data.model} (Gear ${data.gear})`;
    });

    window.modelShiftAPI.onTachPulse((data) => {
      targetRPM = clamp(targetRPM + Math.min(450, (data.bytes || 40) * 3), 2200, 7800);
      clearTimeout(revTimeout);
      revTimeout = setTimeout(() => {
        targetRPM = 1800;
      }, 650);
    });

    window.modelShiftAPI.onGlobalShift((gearKey) => {
      shiftToGear(gearKey);
    });
  }

  renderGearLabels();
  shiftToGear('4', true);
})();
