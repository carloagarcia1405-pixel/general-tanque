'use strict';
/* Guardado, estadísticas fuera de la partida, utilidades de interfaz y sonido. */

/* ---------------- Guardado (localStorage con respaldo en memoria) ---------------- */
function defaultSave() {
  return { coins: 0, jocotes: 0, stage: 1, cleared: [false, false, false], best: [0, 0, 0], introSeen: false,
    up: { dmg: 0, hp: 0, speed: 0, magnet: 0, luck: 0 }, skins: ['olivo'], skin: 'olivo',
    items: [{ id: 1, slot: 'canon', rar: 0, lvl: 1 }], equip: { canon: 1 }, nextId: 2, sfx: true };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaultSave();
      return Object.assign(d, s, { up: Object.assign(d.up, s.up || {}) });
    }
    // Quien venía del prototipo anterior conserva sus bitcolones.
    const old = JSON.parse(localStorage.getItem('general_tanque_save_v1') || 'null');
    if (old) { const d = defaultSave(); d.coins = old.coins | 0; return d; }
  } catch (e) { /* sin almacenamiento: se juega igual */ }
  return defaultSave();
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
let SAVE = loadSave();

const equippedItem = slot => SAVE.items.find(i => i.id === SAVE.equip[slot]);
function gearTotals() {
  let atk = 0, hp = 0;
  SLOTS.forEach(s => { const it = equippedItem(s.id); if (it) { if (s.stat === 'atk') atk += itemValue(it); else hp += itemValue(it); } });
  return { atk, hp };
}
function computeStats() {
  const u = SAVE.up, g = gearTotals();
  return {
    dmgMult: (1 + 0.06 * u.dmg) * (1 + g.atk / 100),
    maxHp: 100 + 12 * u.hp + g.hp,
    speed: 150 * (1 + 0.03 * u.speed),
    magnet: 95 * (1 + 0.15 * u.magnet),
    luck: 1 + 0.08 * u.luck,
  };
}
const upgradeCost = (u, lvl) => Math.round(u.base * Math.pow(1.55, lvl));
function addItem(slot, rar) {
  const it = { id: SAVE.nextId++, slot, rar, lvl: 1 };
  SAVE.items.push(it);
  if (!equippedItem(slot)) SAVE.equip[slot] = it.id;
  return it;
}
function rollItem(stageId, rng = Math.random) {
  const r = rng(), bonus = (stageId - 1) * 0.12;
  const rar = r < 0.03 + bonus * 0.3 ? 3 : r < 0.12 + bonus ? 2 : r < 0.42 + bonus ? 1 : 0;
  return addItem(SLOTS[Math.floor(rng() * SLOTS.length)].id, rar);
}

/* ---------------- Utilidades de UI ---------------- */
function txt(scene, x, y, str, size, color = '#ffffff', extra = {}) {
  return scene.add.text(x, y, str, Object.assign({
    fontFamily: FONT, fontSize: size + 'px', color, stroke: '#111111',
    strokeThickness: Math.max(3, Math.round(size / 6)), align: 'center',
  }, extra)).setOrigin(0.5);
}
function plain(scene, x, y, str, size, color = '#ffffff', extra = {}) {
  return scene.add.text(x, y, str, Object.assign({ fontFamily: FONT, fontSize: size + 'px', color }, extra));
}
// Panel estilo pixel art: borde oscuro, cuerpo y filo claro arriba.
function panel(scene, x, y, w, h, fill = 0x2a2018, edge = 0x0d0906, light = 0x4a3a2a) {
  const c = scene.add.container(x, y);
  c.add([scene.add.rectangle(0, 0, w, h, edge), scene.add.rectangle(0, 0, w - 8, h - 8, fill),
    scene.add.rectangle(0, -h / 2 + 7, w - 8, 6, light)]);
  return c;
}
// Botón que solo se activa si el dedo se apoyó Y se levantó sobre él.
// OJO: lo interactivo es el contenedor, no un hijo (Phaser calcula mal el toque sobre hijos
// de un contenedor fijo a pantalla cuando la cámara se movió).
function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const col = opts.disabled ? 0x6b7280 : (opts.color ?? 0xf59e0b);
  const dark = Phaser.Display.Color.ValueToColor(col).darken(35).color;
  const c = scene.add.container(x, y).setDepth(opts.depth ?? UI_DEPTH + 50);
  const t = scene.add.text(0, -3, label, { fontFamily: FONT, fontSize: (opts.size || 26) + 'px',
    color: opts.disabled ? '#d1d5db' : (opts.textColor || '#111111'), align: 'center' }).setOrigin(0.5);
  c.add([scene.add.rectangle(0, 0, w, h, 0x111111), scene.add.rectangle(0, 3, w - 8, h - 14, dark),
    scene.add.rectangle(0, -3, w - 8, h - 14, col), scene.add.rectangle(0, -h / 2 + 9, w - 16, 4, 0xffffff, 0.35), t]);
  c.label = t;
  c.setScrollFactor(0, 0, true);
  if (!opts.disabled) {
    let pressed = false;
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => { pressed = true; c.setScale(0.96); });
    c.on('pointerout', () => { pressed = false; c.setScale(1); });
    c.on('pointerup', () => { c.setScale(1); if (!pressed) return; pressed = false; SFX.play('click'); onClick(); });
  }
  return c;
}
function fitIcon(img, size) { img.setScale(size / Math.max(img.width, img.height)); return img; }
const fmtTime = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
// Tiempos del calendario: minutos de un stage de 15 -> segundos reales de esta partida.
const evSec = min => min * STAGE_SECONDS / 15;

// Barra de monedas reutilizada en los menús.
function currencyBar(scene, y = 34) {
  scene.add.rectangle(W / 2, y, W, 56, 0x0d0906, 0.85).setDepth(50);
  scene.add.image(34, y, 'ic_coin').setScale(0.5).setDepth(51);
  plain(scene, 58, y - 14, String(SAVE.coins), 22, '#fde047').setDepth(51);
  scene.add.image(W / 2 + 40, y, 'ic_jocote').setScale(0.5).setDepth(51);
  plain(scene, W / 2 + 64, y - 14, String(SAVE.jocotes), 22, '#fca5a5').setDepth(51);
}
// Pestañas de abajo, como en Survivor.io: Equipo | Batalla | Taller.
function tabBar(scene, active) {
  scene.add.rectangle(W / 2, H - 46, W, 92, 0x0d0906).setDepth(60);
  [['Equip', 'EQUIPO', 'eq_blindaje'], ['Menu', 'BATALLA', 'tank_hull'], ['Shop', 'TALLER', 'ic_municion']].forEach(([key, label, icon], i) => {
    const x = 90 + i * 180, on = key === active;
    const bg = scene.add.rectangle(x, H - 46, 172, 84, on ? 0xf59e0b : 0x2a2018).setStrokeStyle(4, 0x111111).setDepth(61);
    fitIcon(scene.add.image(x, H - 58, icon), 40).setDepth(62);
    scene.add.text(x, H - 22, label, { fontFamily: FONT, fontSize: '15px', color: on ? '#111111' : '#e7e5e4' }).setOrigin(0.5).setDepth(62);
    if (!on) bg.setInteractive({ useHandCursor: true }).on('pointerup', () => { SFX.play('click'); scene.scene.start(key); });
  });
}

/* ---------------- Sonido: efectos sintetizados, sin archivos ---------------- */
const SFX = {
  ctx: null, last: {},
  unlock() {
    if (this.ctx || BOT) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
  },
  play(name) {
    if (!this.ctx || !SAVE.sfx) return;
    const now = this.ctx.currentTime, d = SFX_DEFS[name];
    if (!d || (this.last[name] && now - this.last[name] < d.gap)) return;
    this.last[name] = now;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = d.type; o.frequency.setValueAtTime(d.f0, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, d.f1), now + d.dur);
    g.gain.setValueAtTime(d.vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + d.dur);
    o.connect(g).connect(this.ctx.destination); o.start(now); o.stop(now + d.dur + 0.02);
  },
};
const SFX_DEFS = {
  shot:    { type: 'square',   f0: 520, f1: 140, dur: 0.07, vol: 0.05, gap: 0.09 },
  hit:     { type: 'triangle', f0: 240, f1: 90,  dur: 0.05, vol: 0.05, gap: 0.06 },
  boom:    { type: 'sawtooth', f0: 160, f1: 35,  dur: 0.28, vol: 0.10, gap: 0.12 },
  pick:    { type: 'square',   f0: 880, f1: 1320, dur: 0.05, vol: 0.03, gap: 0.05 },
  level:   { type: 'square',   f0: 440, f1: 1760, dur: 0.35, vol: 0.07, gap: 0.3 },
  hurt:    { type: 'sawtooth', f0: 200, f1: 60,  dur: 0.16, vol: 0.09, gap: 0.2 },
  click:   { type: 'square',   f0: 660, f1: 880, dur: 0.05, vol: 0.05, gap: 0.05 },
  chest:   { type: 'triangle', f0: 520, f1: 2080, dur: 0.5, vol: 0.08, gap: 0.4 },
  warn:    { type: 'square',   f0: 300, f1: 300, dur: 0.25, vol: 0.06, gap: 0.3 },
};

/* ---------------- Texturas auxiliares dibujadas con código (efectos) ---------------- */
function makeFxTextures(scene) {
  const g = scene.make.graphics({ add: false });
  const gen = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };
  gen('px', 4, 4, g => { g.fillStyle(0xffffff); g.fillRect(0, 0, 4, 4); });
  gen('disc', 128, 128, g => { g.fillStyle(0xffffff); g.fillCircle(64, 64, 64); });
  gen('ring', 128, 128, g => { g.lineStyle(6, 0xffffff); g.strokeCircle(64, 64, 60); });
  gen('shadow', 64, 24, g => { g.fillStyle(0x000000, 0.35); g.fillEllipse(32, 12, 64, 24); });
  gen('bullet', 12, 6, g => { g.fillStyle(0x7a4a00); g.fillRect(0, 0, 12, 6); g.fillStyle(0xffe27a); g.fillRect(2, 1, 9, 4); g.fillStyle(0xffffff); g.fillRect(7, 2, 4, 2); });
  gen('fence', 32, 16, g => { g.fillStyle(0x111111); g.fillRect(0, 0, 32, 16); g.fillStyle(0xfacc15); g.fillRect(2, 2, 12, 12); g.fillRect(18, 2, 12, 12); });
  gen('arrow', 20, 20, g => { g.fillStyle(0x111111); g.fillTriangle(0, 0, 20, 10, 0, 20); g.fillStyle(0xfacc15); g.fillTriangle(3, 5, 14, 10, 3, 15); });
  g.destroy();
}
