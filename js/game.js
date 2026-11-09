'use strict';
/* =====================================================================
   GENERAL TANQUE — prototipo v0.2
   Nombres, divisas, armas y textos se cambian aquí arriba sin tocar el resto.
   ===================================================================== */
const GAME_TITLE = 'GENERAL TANQUE';
const VERSION = 'v0.2';
const CAMPAIGN_NAME = 'Operación Caribe';
const GANG_NAME = 'La Banda del Tiburón';
const COIN_NAME = 'Bitcolones';
const PREMIUM_NAME = 'Pupusas';
const LEVELS_PER_CAMPAIGN = 8;
const WAVES_PER_LEVEL = 5;
const MAX_ACTIVE_SLOTS = 4;   // armas por partida (incluye el cañón)
const MAX_PASSIVE_SLOTS = 4;  // pasivas por partida
const MAX_SKILL_LVL = 5;

const W = 540, H = 960, WORLD = 1800;
const FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';
const SAVE_KEY = 'general_tanque_save_v1';

/* ---- Mejoras permanentes del taller (se pagan con bitcolones) ---- */
const UPGRADES = [
  { id: 'dmg',    name: 'Cañón',    desc: '+20% de daño',            base: 20, max: 10 },
  { id: 'rate',   name: 'Recarga',  desc: '+12% de disparos',        base: 25, max: 10 },
  { id: 'hp',     name: 'Blindaje', desc: '+25 de vida',             base: 20, max: 10 },
  { id: 'speed',  name: 'Orugas',   desc: '+8% de velocidad',        base: 15, max: 8  },
  { id: 'magnet', name: 'Imán',     desc: '+30% radio para recoger', base: 10, max: 6  },
];

const SKINS = [
  { id: 'olivo',  name: 'Verde Olivo',   cost: 0, hull: 0x4b5320, dark: 0x343a16, turret: 0x5d6728 },
  { id: 'azul',   name: 'Azul y Blanco', cost: 3, hull: 0x1e4fa8, dark: 0x163a7a, turret: 0xe8eef8 },
  { id: 'dorado', name: 'Tanque de Oro', cost: 8, hull: 0xc99a1a, dark: 0x8a6a10, turret: 0xf2c94c },
];

/* ---- Armas dentro de la partida. Evolucionan en nivel 5 + su pasiva pareja ---- */
const ACTIVES = {
  canon:    { name: 'Cañón del Tanque',    icon: 'turret', pair: 'municion', evo: 'Cañón Izalco',
    lv: ['Dispara al enemigo más cercano', '+25% de daño', 'Dispara 2 balas', '+25% de daño y dispara más rápido', 'Dispara 3 balas'],
    evoDesc: 'Balas de lava que explotan al pegar' },
  ladrillo: { name: 'Ladrillos',           icon: 'brick', pair: 'casco', evo: 'Lluvia de Bloques',
    lv: ['Lanza ladrillos al aire que caen aplastando', '+30% de daño', 'Lanza 2 ladrillos', '+25% de daño', 'Lanza 3 ladrillos'],
    evoDesc: '5 bloques de concreto gigantes a la vez' },
  chancla:  { name: 'Chancla Voladora',    icon: 'chancla', pair: 'punteria', evo: 'Chancla Teledirigida',
    lv: ['Va y regresa pegándole a todos', '+30% de daño', '2 chanclas', '+25% de daño y más alcance', '3 chanclas'],
    evoDesc: '4 chanclas gigantes en todas direcciones' },
  chile:    { name: 'Frasco de Chile',     icon: 'jar', pair: 'salsa', evo: 'Erupción de Chiltepe',
    lv: ['Revienta y deja un charco que quema', '+25% de daño', '2 frascos', 'Charco más grande', '3 frascos'],
    evoDesc: '5 charcos enormes que duran más' },
  cohetes:  { name: 'Cohetes de Feria',    icon: 'rocket', pair: 'cafe', evo: 'Castillo de Pólvora',
    lv: ['Cohete que persigue y explota', '2 cohetes', '+30% de daño', '3 cohetes', '4 cohetes'],
    evoDesc: '8 cohetes con explosión grande' },
  machetes: { name: 'Machetes Giratorios', icon: 'machete', pair: 'atol', evo: 'Remolino de Machetes',
    lv: ['2 machetes giran a tu alrededor', '+30% de daño', '3 machetes', '+25% de daño', '4 machetes'],
    evoDesc: '6 machetes que nunca paran' },
};
const W_STATS = {
  canon:    { shots: [1, 1, 2, 2, 3], dmg: [1, 1.25, 1.25, 1.55, 1.55], rate: [1, 1, 1, 0.85, 0.85] },
  ladrillo: { n: [1, 1, 2, 2, 3], dmg: [1, 1.3, 1.3, 1.6, 1.6] },
  chancla:  { n: [1, 1, 2, 2, 3], dmg: [1, 1.3, 1.3, 1.6, 1.6], dist: [1, 1, 1, 1.2, 1.2] },
  chile:    { n: [1, 1, 2, 2, 3], dmg: [1, 1.25, 1.25, 1.25, 1.4], r: [1, 1, 1, 1.3, 1.3] },
  cohetes:  { n: [1, 2, 2, 3, 4], dmg: [1, 1, 1.3, 1.3, 1.3] },
  machetes: { n: [2, 2, 3, 3, 4], dmg: [1, 1.3, 1.3, 1.6, 1.6] },
};
const PASSIVES = {
  municion: { name: 'Munición Reforzada', icon: 'ic_municion', desc: '+10% de daño' },
  casco:    { name: 'Casco de Obrero',    icon: 'ic_casco',    desc: '-7% de daño recibido' },
  punteria: { name: 'Puntería de Mamá',   icon: 'ic_punteria', desc: '+12% velocidad y alcance de lo que lanzás' },
  salsa:    { name: 'Salsa Picante',      icon: 'ic_salsa',    desc: '+12% de área' },
  cafe:     { name: 'Café de Altura',     icon: 'ic_cafe',     desc: '-8% de recarga de armas' },
  atol:     { name: 'Atol de Elote',      icon: 'ic_atol',     desc: '+20 de vida máx. y regenera vida' },
};
const pairOf = pid => Object.keys(ACTIVES).find(a => ACTIVES[a].pair === pid);

const ENEMY_TYPES = {
  sicario: { tex: 'e_sicario', size: 32, hp: 20,  speed: 85,  dmg: 10, r: 13, xp: 1,  coin: 1, color: 0xb91c1c },
  rapido:  { tex: 'e_rapido',  size: 26, hp: 12,  speed: 155, dmg: 6,  r: 10, xp: 1,  coin: 1, color: 0xf59e0b },
  pesado:  { tex: 'e_pesado',  size: 44, hp: 80,  speed: 52,  dmg: 20, r: 19, xp: 5,  coin: 3, color: 0x4b5563 },
  tirador: { tex: 'e_tirador', size: 32, hp: 24,  speed: 72,  dmg: 8,  r: 13, xp: 2,  coin: 2, color: 0x7c3aed, shooter: true },
  elite:   { tex: 'e_elite',   size: 54, hp: 280, speed: 72,  dmg: 22, r: 23, xp: 20, coin: 6, color: 0x1f2937, elite: true },
};
const xpNeed = l => Math.floor(5 + l * 2.2 + l * l * 0.15);

const INTRO = [
  { who: 'presi',   name: 'EL PRESI',   text: 'Mi General, lo mandé a llamar porque en el Caribe ' + GANG_NAME + ' tiene a todo mundo aterrado.' },
  { who: 'general', name: 'EL GENERAL', text: '¿Y por qué yo, Presi?' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Porque usted es el único que sabe manejar el tanque... y no se queja del aire acondicionado.' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Los bandidos sueltan granos de café. Junte café y el tanque se va poniendo más bravo.' },
  { who: 'general', name: 'EL GENERAL', text: '¿Y con qué les doy, Presi?' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Con lo que haya: ladrillos, chanclas, chile, cohetes... ¡hasta machetes!' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Y los ' + COIN_NAME.toLowerCase() + ' guárdelos para el taller. Las pupusas solo las sueltan los jefes.' },
  { who: 'general', name: 'EL GENERAL', text: 'A la orden. ¡Arranquen el tanque, muchachos!' },
];

/* ---------------- Guardado (localStorage con respaldo en memoria) ---------------- */
function defaultSave() {
  return { coins: 0, pupusas: 0, level: 1, introSeen: false,
    up: { dmg: 0, rate: 0, hp: 0, speed: 0, magnet: 0 }, skins: ['olivo'], skin: 'olivo' };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaultSave();
      return Object.assign(d, s, { up: Object.assign(d.up, s.up || {}) });
    }
  } catch (e) { /* sin almacenamiento: se juega igual */ }
  return defaultSave();
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
let SAVE = loadSave();

function computeStats() {
  const u = SAVE.up;
  return {
    dmgMult: 1 + 0.2 * u.dmg,
    fireDelay: 420 / (1 + 0.12 * u.rate),
    maxHp: 100 + 25 * u.hp,
    speed: 170 * (1 + 0.08 * u.speed),
    magnet: 80 * (1 + 0.3 * u.magnet),
  };
}
const upgradeCost = (u, lvl) => Math.round(u.base * Math.pow(1.6, lvl));
const playableLevel = () => Math.min(SAVE.level, LEVELS_PER_CAMPAIGN);

/* ---------------- Utilidades de UI ---------------- */
function txt(scene, x, y, str, size, color = '#ffffff', extra = {}) {
  return scene.add.text(x, y, str, Object.assign({
    fontFamily: FONT, fontSize: size + 'px', color, stroke: '#111111',
    strokeThickness: Math.max(2, Math.round(size / 7)), align: 'center',
  }, extra)).setOrigin(0.5);
}

// Botón que solo se activa si el dedo se apoyó Y se levantó sobre él (evita toques accidentales)
function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const depth = opts.depth ?? 2000;
  const c = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.rectangle(0, 6, w, h, 0x000000, 0.4);
  const bg = scene.add.rectangle(0, 0, w, h, opts.disabled ? 0x6b7280 : (opts.color ?? 0xf59e0b)).setStrokeStyle(4, 0x111111);
  const t = scene.add.text(0, 0, label, { fontFamily: FONT, fontSize: (opts.size || 26) + 'px',
    color: opts.disabled ? '#d1d5db' : (opts.textColor || '#111111'), align: 'center' }).setOrigin(0.5);
  c.add([shadow, bg, t]);
  c.setScrollFactor(0, 0, true);
  if (!opts.disabled) {
    let pressed = false;
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => { pressed = true; bg.setScale(0.96); t.setScale(0.96); });
    bg.on('pointerout', () => { pressed = false; bg.setScale(1); t.setScale(1); });
    bg.on('pointerup', () => { bg.setScale(1); t.setScale(1); if (!pressed) return; pressed = false; onClick(); });
  }
  return c;
}
function fitIcon(img, size) { img.setScale(size / Math.max(img.width, img.height)); return img; }
const skillIcon = id => (id === 'canon' ? 'turret_' + SAVE.skin : (ACTIVES[id] ? ACTIVES[id].icon : PASSIVES[id].icon));

/* ---------------- Texturas (todo dibujado con código, sin assets) ---------------- */
function makeTextures(scene) {
  const g = scene.make.graphics({ add: false });
  const gen = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };

  SKINS.forEach(sk => {
    gen('tank_' + sk.id, 60, 46, g => {
      g.fillStyle(0x1f1f1f); g.fillRoundedRect(0, 0, 60, 13, 4); g.fillRoundedRect(0, 33, 60, 13, 4);
      g.fillStyle(0x3a3a3a);
      for (let x = 4; x < 58; x += 8) { g.fillRect(x, 2, 3, 9); g.fillRect(x, 35, 3, 9); }
      g.fillStyle(sk.dark); g.fillRoundedRect(3, 7, 54, 32, 7);
      g.fillStyle(sk.hull); g.fillRoundedRect(6, 9, 48, 28, 6);
      g.fillStyle(0x0047ab); g.fillRect(9, 15, 4, 16);
      g.fillStyle(0xffffff); g.fillRect(13, 15, 4, 16);
      g.fillStyle(0x0047ab); g.fillRect(17, 15, 4, 16);
    });
    gen('turret_' + sk.id, 54, 26, g => {
      g.fillStyle(0x222222); g.fillRect(14, 9, 40, 8);
      g.fillStyle(sk.turret); g.fillRect(14, 10, 38, 6);
      g.fillStyle(0x222222); g.fillCircle(13, 13, 13);
      g.fillStyle(sk.turret); g.fillCircle(13, 13, 11);
      g.fillStyle(0x000000, 0.25); g.fillCircle(10, 10, 4);
    });
  });

  gen('bullet', 16, 8, g => { g.fillStyle(0xfff3a0); g.fillRoundedRect(0, 0, 16, 8, 4); g.fillStyle(0xffc21a); g.fillRoundedRect(0, 1, 10, 6, 3); });
  gen('ebullet', 14, 14, g => { g.fillStyle(0xff3b1f); g.fillCircle(7, 7, 7); g.fillStyle(0xffd0a0); g.fillCircle(7, 7, 3); });
  gen('spark', 8, 8, g => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); });

  // Armas
  gen('brick', 28, 14, g => {
    g.fillStyle(0x7f2d12); g.fillRoundedRect(0, 0, 28, 14, 2);
    g.fillStyle(0xc2410c); g.fillRoundedRect(1, 1, 26, 12, 2);
    g.fillStyle(0x7f2d12); g.fillCircle(7, 7, 2.5); g.fillCircle(14, 7, 2.5); g.fillCircle(21, 7, 2.5);
  });
  gen('chancla', 32, 16, g => {
    g.fillStyle(0x1e3a8a); g.fillEllipse(16, 8, 32, 15);
    g.fillStyle(0x3b82f6); g.fillEllipse(16, 8, 28, 11);
    g.lineStyle(3, 0xfacc15); g.lineBetween(22, 8, 9, 2); g.lineBetween(22, 8, 9, 14);
  });
  gen('jar', 18, 24, g => {
    g.fillStyle(0x6b7280); g.fillRect(4, 0, 10, 5);
    g.fillStyle(0xdc2626); g.fillRoundedRect(1, 5, 16, 19, 4);
    g.fillStyle(0xfca5a5, 0.6); g.fillRect(4, 8, 3, 12);
    g.fillStyle(0x16a34a); g.fillRect(9, 12, 5, 3);
  });
  gen('firezone', 128, 128, g => {
    for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xf97316 : 0xdc2626, 0.12 + i * 0.05); g.fillCircle(64, 64, 64 - i * 7); }
    g.fillStyle(0xfde047, 0.7);
    [[40, 50], [80, 44], [60, 80], [88, 78], [46, 86], [70, 60]].forEach(([x, y]) => g.fillCircle(x, y, 3));
  });
  gen('rocket', 24, 10, g => {
    g.fillStyle(0xdc2626); g.fillRoundedRect(2, 2, 16, 6, 2);
    g.fillStyle(0xffffff); g.fillTriangle(18, 1, 24, 5, 18, 9);
    g.fillStyle(0xfacc15); g.fillRect(0, 3, 4, 4);
    g.fillStyle(0x16a34a); g.fillRect(8, 2, 3, 6);
  });
  gen('machete', 46, 12, g => {
    g.fillStyle(0x78350f); g.fillRoundedRect(0, 3, 12, 6, 2);
    g.fillStyle(0x9ca3af); g.fillRect(12, 2, 28, 8); g.fillTriangle(40, 2, 46, 10, 40, 10);
    g.fillStyle(0xf3f4f6); g.fillRect(12, 2, 30, 2);
  });

  // Íconos de pasivas (32x32)
  gen('ic_municion', 32, 32, g => {
    g.fillStyle(0xb45309); g.fillRect(8, 12, 6, 17); g.fillRect(18, 12, 6, 17);
    g.fillStyle(0xfacc15); g.fillTriangle(8, 12, 11, 3, 14, 12); g.fillTriangle(18, 12, 21, 3, 24, 12);
  });
  gen('ic_casco', 32, 32, g => {
    g.fillStyle(0xfacc15); g.beginPath(); g.arc(16, 21, 13, Math.PI, 0, false); g.closePath(); g.fillPath();
    g.fillStyle(0xca8a04); g.fillRect(1, 20, 30, 5);
    g.fillStyle(0xfde68a); g.fillRect(14, 9, 4, 11);
  });
  gen('ic_punteria', 32, 32, g => {
    g.fillStyle(0xdc2626); g.fillCircle(16, 16, 15); g.fillStyle(0xffffff); g.fillCircle(16, 16, 11);
    g.fillStyle(0xdc2626); g.fillCircle(16, 16, 7); g.fillStyle(0xffffff); g.fillCircle(16, 16, 3);
  });
  gen('ic_salsa', 32, 32, g => {
    g.fillStyle(0xb91c1c); g.fillRoundedRect(10, 9, 12, 22, 3); g.fillRect(13, 3, 6, 7);
    g.fillStyle(0xfacc15); g.fillRect(12, 1, 8, 3);
    g.fillStyle(0xffffff); g.fillRect(11, 16, 10, 6);
  });
  gen('ic_cafe', 32, 32, g => {
    g.fillStyle(0xffffff); g.fillRoundedRect(4, 12, 19, 17, 4);
    g.lineStyle(3, 0xffffff); g.strokeCircle(25, 19, 4);
    g.fillStyle(0x5b3a1e); g.fillEllipse(13.5, 13, 17, 5);
    g.lineStyle(2, 0xd1d5db); g.lineBetween(10, 9, 12, 2); g.lineBetween(17, 9, 19, 2);
  });
  gen('ic_atol', 32, 32, g => {
    g.fillStyle(0x92400e); g.fillEllipse(16, 21, 30, 18);
    g.fillStyle(0xfde047); g.fillEllipse(16, 16, 26, 9);
    g.fillStyle(0xeab308); g.fillCircle(11, 16, 1.5); g.fillCircle(17, 15, 1.5); g.fillCircle(22, 17, 1.5);
  });

  // Granos de café (experiencia)
  gen('xp1', 12, 14, g => { g.fillStyle(0x15803d); g.fillEllipse(6, 7, 11, 13); g.lineStyle(1.5, 0x052e16); g.lineBetween(6, 2, 6, 12); });
  gen('xp5', 16, 18, g => {
    g.fillStyle(0xb91c1c); g.fillEllipse(8, 9, 15, 17); g.lineStyle(2, 0x5f0f0f); g.lineBetween(8, 3, 8, 15);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(5, 5, 2);
  });
  gen('xp20', 22, 24, g => {
    g.fillStyle(0x5b3a1e); g.fillEllipse(11, 12, 21, 23); g.lineStyle(2, 0x2b1a0e); g.lineBetween(11, 3, 11, 21);
    g.fillStyle(0xfacc15, 0.8); g.fillCircle(6, 6, 2.5);
  });

  // Objetos del mapa
  gen('tamal', 30, 22, g => {
    g.fillStyle(0x166534); g.fillRoundedRect(0, 2, 30, 18, 4);
    g.fillStyle(0x22c55e); g.fillRoundedRect(3, 4, 24, 14, 3);
    g.fillStyle(0xfde68a); g.fillRoundedRect(8, 6, 14, 10, 3);
    g.fillStyle(0x854d0e); g.fillRect(14, 2, 2, 18);
  });
  gen('iman', 28, 28, g => {
    g.lineStyle(7, 0xdc2626); g.beginPath(); g.arc(14, 15, 9, 0, Math.PI, false); g.strokePath();
    g.lineBetween(5, 15, 5, 6); g.lineBetween(23, 15, 23, 6);
    g.fillStyle(0xe5e7eb); g.fillRect(1, 1, 8, 6); g.fillRect(19, 1, 8, 6);
  });
  gen('bomba', 28, 28, g => {
    g.fillStyle(0x111111); g.fillCircle(13, 16, 11); g.fillStyle(0x4b4b4b); g.fillCircle(9, 12, 3);
    g.lineStyle(3, 0x92400e); g.lineBetween(19, 8, 24, 3);
    g.fillStyle(0xfacc15); g.fillCircle(25, 3, 3);
  });
  gen('cofre', 34, 28, g => {
    g.fillStyle(0x78350f); g.fillRoundedRect(0, 4, 34, 24, 4);
    g.fillStyle(0xfacc15); g.fillRoundedRect(2, 6, 30, 8, 3); g.fillRect(0, 14, 34, 3);
    g.fillStyle(0xfde047); g.fillRect(14, 12, 6, 9); g.fillStyle(0x78350f); g.fillRect(16, 15, 2, 4);
  });
  gen('caja', 40, 40, g => {
    g.fillStyle(0x5a3412); g.fillRect(0, 0, 40, 40);
    g.fillStyle(0x9a6a33); g.fillRect(3, 3, 34, 34);
    g.lineStyle(4, 0x5a3412); g.lineBetween(4, 4, 36, 36); g.lineBetween(36, 4, 4, 36);
  });

  // Bandidos vistos desde arriba, con pasamontañas (mirando a la derecha)
  Object.values(ENEMY_TYPES).forEach(t => {
    const s = t.size, c = s / 2;
    gen(t.tex, s, s, g => {
      g.fillStyle(0x000000, 0.25); g.fillEllipse(c + 2, c + 2, s * 0.6, s * 0.95);
      g.fillStyle(t.color); g.fillEllipse(c, c, s * 0.55, s * 0.95);
      if (t.tex === 'e_pesado') { g.fillStyle(0x1f2937); g.fillRect(c - s * 0.16, c - s * 0.36, s * 0.32, s * 0.72); }
      if (t.shooter || t.elite) { g.fillStyle(0x222222); g.fillRect(c, c + s * 0.16, s * 0.5, s * 0.12); }
      if (t.elite) { g.lineStyle(3, 0xfacc15); g.strokeCircle(c, c, s * 0.3); }
      g.fillStyle(0x1a1a1a); g.fillCircle(c, c, s * 0.24);
      g.fillStyle(t.elite ? 0xfacc15 : 0xbdbdbd); g.fillRect(c + s * 0.08, c - s * 0.12, s * 0.09, s * 0.24);
    });
  });

  const drawBoss = (key, s, body, accent) => gen(key, s, s, g => {
    const c = s / 2;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(c + 4, c + 4, s * 0.62, s * 0.98);
    g.fillStyle(body); g.fillEllipse(c, c, s * 0.6, s * 0.96);
    g.fillStyle(0x222222); g.fillRect(c, c - s * 0.36, s * 0.42, s * 0.1); g.fillRect(c, c + s * 0.26, s * 0.42, s * 0.1);
    g.lineStyle(Math.max(4, s * 0.05), accent); g.strokeCircle(c, c, s * 0.28);
    g.fillStyle(0x2b2b2b); g.fillCircle(c, c, s * 0.22);
    g.fillStyle(0x9ca3af); g.fillTriangle(c - s * 0.2, c, c + s * 0.12, c - s * 0.06, c + s * 0.12, c + s * 0.06);
    g.fillStyle(accent); g.fillRect(c + s * 0.1, c - s * 0.1, s * 0.07, s * 0.2);
  });
  drawBoss('boss', 100, 0x111827, 0xfacc15);
  drawBoss('boss_final', 130, 0x7f1d1d, 0xfde047);

  gen('coin', 20, 20, g => {
    g.fillStyle(0xb45309); g.fillCircle(10, 10, 10);
    g.fillStyle(0xfacc15); g.fillCircle(10, 10, 8);
    g.fillStyle(0xb45309); g.fillRect(8, 5, 2, 10); g.fillRect(8, 5, 5, 2); g.fillRect(8, 9, 5, 2); g.fillRect(8, 13, 5, 2);
    g.fillStyle(0xffffff, 0.5); g.fillCircle(6, 6, 2);
  });
  gen('pupusa', 28, 28, g => {
    g.fillStyle(0xa0682a); g.fillCircle(14, 14, 14);
    g.fillStyle(0xf3d9a4); g.fillCircle(14, 14, 12);
    g.fillStyle(0x9a5b22);
    [[9, 9, 2.5], [18, 11, 2], [12, 18, 3], [19, 19, 2], [7, 15, 1.5], [15, 6, 1.5]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    g.fillStyle(0x4d7c0f); g.fillCircle(16, 15, 1.5); g.fillCircle(10, 13, 1.2);
  });

  // Retratos para la historia
  gen('presi', 160, 160, g => {
    g.fillStyle(0x1e3a8a); g.fillCircle(80, 80, 80);
    g.fillStyle(0x2b1d14); g.fillEllipse(80, 108, 104, 92);
    g.fillStyle(0xd8a47f); g.fillCircle(80, 82, 42);
    g.fillStyle(0x2b1d14); g.fillEllipse(80, 112, 70, 40);
    g.fillStyle(0xd8a47f); g.fillEllipse(80, 98, 40, 16);
    g.fillStyle(0x2b1d14); g.fillRoundedRect(62, 92, 36, 8, 4);
    g.fillStyle(0x111111); g.fillCircle(66, 76, 4); g.fillCircle(94, 76, 4);
    g.fillStyle(0x111111); g.fillEllipse(80, 48, 96, 40);
    g.fillRect(70, 22, 20, 16);
    g.fillStyle(0xffffff); g.fillRect(74, 44, 12, 6);
  });
  gen('general', 160, 160, g => {
    g.fillStyle(0x3f6212); g.fillCircle(80, 80, 80);
    g.fillStyle(0xc68d5d); g.fillCircle(80, 90, 44);
    g.fillStyle(0x4b5320); g.fillEllipse(80, 58, 112, 66);
    g.fillStyle(0x343a16); g.fillRect(26, 64, 108, 8);
    g.fillStyle(0xfacc15); g.fillCircle(62, 46, 5); g.fillCircle(80, 42, 5); g.fillCircle(98, 46, 5);
    g.fillStyle(0x111111); g.fillCircle(66, 88, 4); g.fillCircle(94, 88, 4);
    g.fillStyle(0x222222); g.fillRoundedRect(58, 104, 44, 10, 5);
  });

  g.destroy();
}

/* =========================== ESCENAS =========================== */
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() { makeTextures(this); this.scene.start('Menu'); }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a2e12);
    this.add.rectangle(W / 2, 205, W, 70, 0x0047ab);
    this.add.rectangle(W / 2, 275, W, 70, 0xffffff);
    this.add.rectangle(W / 2, 345, W, 70, 0x0047ab);
    const [w1, ...rest] = GAME_TITLE.split(' ');
    txt(this, W / 2, 120, w1, 64, '#fde047');
    txt(this, W / 2, 275, rest.join(' '), 96, '#fde047');
    txt(this, W / 2, 415, `CAMPAÑA 1 · ${CAMPAIGN_NAME.toUpperCase()}`, 22, '#d9f99d');

    const tank = this.add.image(W / 2, 505, 'tank_' + SAVE.skin).setScale(2.2).setAngle(-90);
    const tur = this.add.image(W / 2, 505, 'turret_' + SAVE.skin).setOrigin(13 / 54, 0.5).setScale(2.2).setAngle(-90);
    this.tweens.add({ targets: tur, angle: { from: -130, to: -50 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: [tank, tur], y: 498, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.image(W / 2 - 110, 600, 'coin').setScale(1.3);
    txt(this, W / 2 - 92, 600, String(SAVE.coins), 26, '#fde047').setOrigin(0, 0.5);
    this.add.image(W / 2 + 60, 600, 'pupusa').setScale(1.1);
    txt(this, W / 2 + 82, 600, String(SAVE.pupusas), 26, '#fde68a').setOrigin(0, 0.5);

    const done = SAVE.level > LEVELS_PER_CAMPAIGN;
    const playLabel = done ? 'REPETIR JEFE FINAL' : `JUGAR · NIVEL ${SAVE.level}/${LEVELS_PER_CAMPAIGN}`;
    button(this, W / 2, 685, 400, 80, playLabel, () => {
      if (!SAVE.introSeen) this.scene.start('Intro');
      else this.scene.start('Game', { level: playableLevel() });
    }, { size: 28 });
    button(this, W / 2, 785, 400, 70, 'TALLER Y SKINS', () => this.scene.start('Shop'), { color: 0x84cc16 });
    button(this, W / 2, 870, 400, 60, 'VER HISTORIA', () => this.scene.start('Intro'), { color: 0xe5e7eb, size: 22 });

    this.add.text(16, H - 24, 'Prototipo ' + VERSION, { fontFamily: FONT, fontSize: '14px', color: '#6b7a5a' }).setOrigin(0, 0.5);
    const reset = this.add.text(W - 16, H - 24, 'Borrar progreso', { fontFamily: FONT, fontSize: '14px', color: '#6b7a5a' })
      .setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    let armed = false;
    reset.on('pointerup', () => {
      if (!armed) { armed = true; reset.setText('¿Seguro? Toca otra vez').setColor('#f87171'); return; }
      SAVE = defaultSave(); writeSave(); this.scene.restart();
    });
  }
}

class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }
  create() {
    this.add.rectangle(W / 2, H * 0.3, W, H * 0.6, 0x0c4a6e);
    this.add.rectangle(W / 2, H * 0.8, W, H * 0.4, 0xcdb27a);
    txt(this, W / 2, 110, 'CAMPAÑA 1', 30, '#bae6fd');
    txt(this, W / 2, 165, CAMPAIGN_NAME.toUpperCase(), 44, '#fde047');

    this.panel = this.add.rectangle(W / 2, 790, 500, 290, 0x1c1917, 0.94).setStrokeStyle(5, 0xf59e0b);
    this.portrait = this.add.image(130, 545, 'presi').setScale(1.35);
    this.nameT = this.add.text(40, 668, '', { fontFamily: FONT, fontSize: '22px', color: '#f59e0b' });
    this.bodyT = this.add.text(40, 708, '', { fontFamily: FONT, fontSize: '25px', color: '#ffffff',
      wordWrap: { width: 460 }, lineSpacing: 6 });
    const hint = this.add.text(W - 40, 910, 'Toca para seguir ▸', { fontFamily: FONT, fontSize: '16px', color: '#a8a29e' }).setOrigin(1, 0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    button(this, W - 80, 40, 120, 48, 'SALTAR', () => this.finish(), { size: 18, color: 0xe5e7eb });

    this.i = 0; this.leaving = false; this.show();
    this.input.on('pointerdown', (p, over) => { if (over.length === 0) this.next(); });
  }
  show() {
    const l = INTRO[this.i];
    const left = l.who === 'presi';
    this.portrait.setTexture(l.who).setX(left ? 130 : W - 130);
    this.portrait.setScale(1.2); this.tweens.add({ targets: this.portrait, scale: 1.35, duration: 180, ease: 'Back.out' });
    this.nameT.setText(l.name);
    this.bodyT.setText(l.text);
  }
  next() {
    if (this.leaving) return;
    this.i++;
    if (this.i >= INTRO.length) this.finish(); else this.show();
  }
  finish() {
    if (this.leaving) return;
    this.leaving = true;
    SAVE.introSeen = true; writeSave();
    this.scene.start('Game', { level: playableLevel() });
  }
}

class Joystick {
  constructor(scene) {
    this.scene = scene; this.vec = new Phaser.Math.Vector2(); this.id = null; this.max = 62;
    this.base = scene.add.circle(0, 0, this.max, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.35)
      .setScrollFactor(0).setDepth(1000).setVisible(false);
    this.knob = scene.add.circle(0, 0, 28, 0xffffff, 0.45).setScrollFactor(0).setDepth(1001).setVisible(false);
    scene.input.on('pointerdown', (p, over) => {
      if (this.id !== null || scene.uiBlocked || scene.paused || over.length > 0) return;
      this.id = p.id; this.bx = p.x; this.by = p.y; this.vec.set(0, 0);
      this.base.setPosition(p.x, p.y).setVisible(true); this.knob.setPosition(p.x, p.y).setVisible(true);
    });
    scene.input.on('pointermove', p => {
      if (p.id !== this.id) return;
      let dx = p.x - this.bx, dy = p.y - this.by; const len = Math.hypot(dx, dy);
      if (len > this.max) { dx = dx / len * this.max; dy = dy / len * this.max; }
      this.knob.setPosition(this.bx + dx, this.by + dy); this.vec.set(dx / this.max, dy / this.max);
    });
    const end = p => { if (p.id === this.id) this.reset(); };
    scene.input.on('pointerup', end); scene.input.on('pointerupoutside', end);
  }
  reset() { this.id = null; this.vec.set(0, 0); this.base.setVisible(false); this.knob.setVisible(false); }
}

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.level = data.level || 1; }

  create() {
    // estado (se reinicia en cada partida: la escena se reutiliza)
    this.stats = computeStats();
    this.mult = 1 + 0.35 * (this.level - 1);
    this.isFinal = this.level === LEVELS_PER_CAMPAIGN;
    this.state = 'between'; this.wave = 0; this.queue = []; this.spawnTimer = null;
    this.boss = null; this.banked = false; this.uiBlocked = false; this.paused = false;
    this.time.paused = false; this.tweens.resumeAll();
    this.runCoins = 0; this.runPupusas = 0; this.kills = 0;
    this.gt = 0; this.fireReady = 0; this.invulnUntil = 0;
    // progreso dentro de la partida
    this.skills = { canon: 1 }; this.passives = {}; this.evolved = {};
    this.plevel = 1; this.xp = 0; this.need = xpNeed(1);
    this.pendingLv = 0; this.pendingChest = 0; this.rerolls = 1;
    this.wcd = {}; this.projs = []; this.machs = []; this.machAng = 0; this.machOn = true; this.machCycle = 0;
    this.machHits = { hits: new Map() };
    this.enemyList = []; this.nextCrate = 15000; this.modal = [];
    this.recalc();

    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.drawGround();

    this.player = this.physics.add.image(WORLD / 2, WORLD / 2, 'tank_' + SAVE.skin).setDepth(10).setAngle(-90);
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(23, 7, 0);
    this.player.body.pushable = false;
    this.turret = this.add.image(this.player.x, this.player.y, 'turret_' + SAVE.skin).setOrigin(13 / 54, 0.5).setDepth(11).setAngle(-90);
    this.hp = this.maxHp;

    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.crates = this.physics.add.staticGroup();
    this.coins = this.add.group();

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.bulletHit(b, e));
    this.physics.add.collider(this.player, this.enemies, (p, e) => this.touchEnemy(e));
    this.physics.add.overlap(this.player, this.enemyBullets, (p, b) => {
      if (!b.active) return; b.destroy(); this.damagePlayer(8 * Math.sqrt(this.mult));
    });
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.player, this.crates, (p, c) => this.breakCrate(c));
    this.physics.add.overlap(this.bullets, this.crates, (b, c) => { if (b.active) b.destroy(); this.breakCrate(c); });

    for (let i = 0; i < 10; i++) {
      let x, y;
      do { x = Phaser.Math.Between(80, WORLD - 80); y = Phaser.Math.Between(80, WORLD - 80); }
      while (Math.abs(x - WORLD / 2) < 180 && Math.abs(y - WORLD / 2) < 180);
      this.spawnCrate(x, y);
    }

    this.joy = new Joystick(this);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    }
    this.buildHud();
    this.banner(`NIVEL ${this.level}`, '#fde047');
    this.time.delayedCall(1300, () => this.startWave(1));
  }

  // Modificadores de las pasivas + taller
  recalc() {
    const p = this.passives;
    this.m = {
      dmg: this.stats.dmgMult * (1 + 0.1 * (p.municion || 0)),
      armor: 1 - 0.07 * (p.casco || 0),
      spd: 1 + 0.12 * (p.punteria || 0),
      area: 1 + 0.12 * (p.salsa || 0),
      cd: 1 - 0.08 * (p.cafe || 0),
      regen: 0.6 * (p.atol || 0),
    };
    this.maxHp = this.stats.maxHp + 20 * (p.atol || 0);
  }

  /* ---------- mapa ---------- */
  drawGround() {
    const rnd = new Phaser.Math.RandomDataGenerator(['caribe' + this.level]);
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xcdb27a); g.fillRect(0, 0, WORLD, WORLD);
    for (let x = 0; x < WORLD; x += 90) for (let y = 0; y < WORLD; y += 90) {
      if (rnd.between(0, 2) === 0) { g.fillStyle(0xc4a56b); g.fillRect(x, y, 90, 90); }
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle(rnd.pick([0x8a9a4b, 0x7d8f3f, 0x9aab5a]));
      g.fillEllipse(rnd.between(0, WORLD), rnd.between(0, WORLD), rnd.between(80, 260), rnd.between(60, 180));
    }
    g.fillStyle(0x8b7d6b); g.fillRect(0, WORLD / 2 - 50, WORLD, 100); g.fillRect(WORLD / 2 - 50, 0, 100, WORLD);
    g.fillStyle(0xe5d9b6);
    for (let p = 0; p < WORLD; p += 80) { g.fillRect(p, WORLD / 2 - 4, 40, 8); g.fillRect(WORLD / 2 - 4, p, 8, 40); }
    for (let i = 0; i < 50; i++) {
      const x = rnd.between(60, WORLD - 60), y = rnd.between(60, WORLD - 60);
      if (Math.abs(x - WORLD / 2) < 220 && Math.abs(y - WORLD / 2) < 220) continue;
      const t = rnd.between(0, 2);
      if (t === 0) {
        g.fillStyle(0x6b6b6b); g.fillEllipse(x, y, 46, 34); g.fillStyle(0x8a8a8a); g.fillEllipse(x - 5, y - 5, 30, 20);
      } else if (t === 1) {
        g.fillStyle(0x1f6f8b); g.fillCircle(x, y, 15); g.lineStyle(3, 0x134e63); g.strokeCircle(x, y, 15);
      } else {
        g.fillStyle(0x000000, 0.15); g.fillCircle(x + 10, y + 10, 40);
        g.fillStyle(0x2f7d32);
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.fillEllipse(x + Math.cos(a) * 22, y + Math.sin(a) * 22, 40, 22); }
        g.fillStyle(0x6d4c2a); g.fillCircle(x, y, 8);
      }
    }
    g.fillStyle(0x9c8a5a);
    for (let p = 0; p < WORLD; p += 40) {
      g.fillRoundedRect(p, 0, 38, 22, 8); g.fillRoundedRect(p, WORLD - 22, 38, 22, 8);
      g.fillRoundedRect(0, p, 22, 38, 8); g.fillRoundedRect(WORLD - 22, p, 22, 38, 8);
    }
    if (this.textures.exists('ground')) this.textures.remove('ground');
    g.generateTexture('ground', WORLD, WORLD); g.destroy();
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(0);
  }
  spawnCrate(x, y) {
    const c = this.crates.create(x, y, 'caja').setDepth(6);
    c.refreshBody();
  }
  breakCrate(c) {
    if (!c.active) return;
    this.burst(c.x, c.y, 0x9a6a33, 10);
    const r = Math.random();
    if (r < 0.4) this.dropItem(c.x, c.y, 'tamal');
    else if (r < 0.65) this.dropItem(c.x, c.y, 'iman');
    else if (r < 0.85) this.dropItem(c.x, c.y, 'bomba');
    else for (let i = 0; i < 6; i++) this.dropItem(c.x, c.y, 'coin', 50);
    c.destroy();
  }

  /* ---------- HUD ---------- */
  buildHud() {
    const d = 900, fix = o => o.setScrollFactor(0).setDepth(d);
    fix(this.add.rectangle(W / 2, 40, W, 80, 0x000000, 0.55));
    fix(this.add.text(16, 10, 'BLINDAJE', { fontFamily: FONT, fontSize: '13px', color: '#d1fae5' }));
    fix(this.add.rectangle(16, 38, 200, 18, 0x3f3f46).setOrigin(0, 0.5));
    this.hpBar = fix(this.add.rectangle(16, 38, 200, 18, 0x22c55e).setOrigin(0, 0.5));
    this.waveText = fix(this.add.text(16, 64, '', { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5));
    fix(this.add.image(W - 190, 24, 'coin'));
    this.coinText = fix(txt(this, W - 174, 24, '0', 22, '#fde047').setOrigin(0, 0.5));
    fix(this.add.image(W - 190, 58, 'pupusa').setScale(0.8));
    this.pupText = fix(txt(this, W - 174, 58, '0', 22, '#fde68a').setOrigin(0, 0.5));
    button(this, W - 38, 40, 54, 54, 'II', () => this.showPause(), { depth: d + 1, size: 22, color: 0xe5e7eb });

    // barra de experiencia (granos de café)
    fix(this.add.rectangle(W / 2, 90, W - 20, 14, 0x1e293b).setStrokeStyle(2, 0x111111));
    this.xpBar = fix(this.add.rectangle(10, 90, W - 20, 14, 0x38bdf8).setOrigin(0, 0.5));
    this.lvText = fix(txt(this, W / 2, 90, 'Nv 1', 13, '#ffffff'));
    this.skillIcons = [];

    this.bossBox = this.add.container(0, 0).setDepth(d);
    const bName = txt(this, W / 2, 140, this.isFinal ? 'EL TIBURÓN · JEFE FINAL' : 'CABECILLA DE LA BANDA', 18, '#fca5a5');
    const bBg = this.add.rectangle(W / 2, 164, 480, 20, 0x3f3f46).setStrokeStyle(3, 0x111111);
    this.bossBar = this.add.rectangle(W / 2 - 240, 164, 480, 20, 0xef4444).setOrigin(0, 0.5);
    this.bossBox.add([bName, bBg, this.bossBar]).setScrollFactor(0, 0, true).setVisible(false);

    this.bannerText = txt(this, W / 2, H * 0.32, '', 46, '#fde047').setScrollFactor(0).setDepth(d + 5).setAlpha(0);
    this.refreshSkillIcons();
    this.updateHud();
  }
  refreshSkillIcons() {
    this.skillIcons.forEach(o => o.destroy());
    this.skillIcons = [];
    const ids = [...Object.keys(this.skills), ...Object.keys(this.passives)];
    ids.forEach((id, i) => {
      const x = 26 + i * 36 + (i >= Object.keys(this.skills).length ? 12 : 0), y = 116;
      const isAct = !!ACTIVES[id], lv = isAct ? this.skills[id] : this.passives[id];
      const evo = isAct && this.evolved[id];
      const bg = this.add.rectangle(x, y, 32, 32, 0x000000, 0.5).setStrokeStyle(2, evo ? 0xfacc15 : (isAct ? 0xf59e0b : 0x38bdf8));
      const ic = fitIcon(this.add.image(x, y, skillIcon(id)), 24);
      const t = this.add.text(x + 15, y + 15, evo ? '★' : String(lv), { fontFamily: FONT, fontSize: '12px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3 }).setOrigin(1, 1);
      [bg, ic, t].forEach(o => { o.setScrollFactor(0).setDepth(901); this.skillIcons.push(o); });
    });
  }
  updateHud() {
    const r = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.hpBar.setScale(r, 1).setFillStyle(r < 0.3 ? 0xef4444 : r < 0.6 ? 0xf59e0b : 0x22c55e);
    this.waveText.setText(this.state === 'boss' || this.state === 'won'
      ? `Nivel ${this.level}/${LEVELS_PER_CAMPAIGN} · JEFE`
      : `Nivel ${this.level}/${LEVELS_PER_CAMPAIGN} · Oleada ${this.wave}/${WAVES_PER_LEVEL}`);
    this.coinText.setText(String(this.runCoins));
    this.pupText.setText(String(this.runPupusas));
    this.xpBar.setScale(Phaser.Math.Clamp(this.xp / this.need, 0, 1), 1);
    this.lvText.setText('Nv ' + this.plevel);
    if (this.boss && this.boss.active) this.bossBar.setScale(Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1), 1);
  }
  banner(text, color = '#fde047') {
    const b = this.bannerText;
    this.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: b, alpha: 0, delay: 1300, duration: 400 });
  }

  /* ---------- pausa, subir de nivel y cofres ---------- */
  pauseGame() {
    if (this.paused) return;
    this.paused = true; this.joy.reset();
    this.physics.pause(); this.time.paused = true; this.tweens.pauseAll();
  }
  resumeGame() {
    if (!this.paused) return;
    this.paused = false;
    this.physics.resume(); this.time.paused = false; this.tweens.resumeAll();
  }
  clearModal() { this.modal.forEach(o => o.destroy()); this.modal = []; }
  M(o, depth = 3500) { o.setScrollFactor(0).setDepth(depth); this.modal.push(o); return o; }
  nextModal() {
    if (this.state === 'dead' || this.state === 'won') { this.pendingLv = 0; this.pendingChest = 0; this.resumeGame(); return; }
    if (this.pendingLv > 0) { this.showLevelUp(); return; }
    if (this.pendingChest > 0) { this.showChest(); return; }
    this.resumeGame();
  }
  gainXp(v) {
    if (this.state === 'dead' || this.state === 'won') return;
    this.xp += v;
    while (this.xp >= this.need) { this.xp -= this.need; this.plevel++; this.need = xpNeed(this.plevel); this.pendingLv++; }
    this.updateHud();
    if (this.pendingLv > 0 && !this.paused) this.nextModal();
  }
  buildOffers() {
    const S = this.skills, P = this.passives, E = this.evolved, evo = [], pool = [];
    const nAct = Object.keys(S).length, nPas = Object.keys(P).length;
    for (const id in ACTIVES) {
      const lv = S[id] || 0;
      if (lv === MAX_SKILL_LVL && !E[id] && P[ACTIVES[id].pair]) evo.push({ type: 'evo', id });
      else if (lv > 0 && lv < MAX_SKILL_LVL) pool.push({ type: 'act', id });
      else if (lv === 0 && nAct < MAX_ACTIVE_SLOTS) pool.push({ type: 'act', id });
    }
    for (const id in PASSIVES) {
      const lv = P[id] || 0;
      if ((lv > 0 && lv < MAX_SKILL_LVL) || (lv === 0 && nPas < MAX_PASSIVE_SLOTS)) pool.push({ type: 'pas', id });
    }
    Phaser.Utils.Array.Shuffle(pool);
    const out = evo.length ? [evo[0]] : [];
    while (out.length < 3 && pool.length) out.push(pool.pop());
    if (out.length < 3) out.push({ type: 'heal' });
    if (out.length < 3) out.push({ type: 'gold' });
    return out;
  }
  describe(o) {
    if (o.type === 'evo') {
      const a = ACTIVES[o.id];
      return { icon: skillIcon(o.id), title: a.evo, tag: '¡EVOLUCIÓN!', desc: a.evoDesc, hint: `${a.name} + ${PASSIVES[a.pair].name}`, gold: true };
    }
    if (o.type === 'act') {
      const a = ACTIVES[o.id], lv = this.skills[o.id] || 0;
      return { icon: skillIcon(o.id), title: a.name, tag: lv === 0 ? 'NUEVA' : `Nv ${lv + 1}`, lv, desc: a.lv[lv],
        hint: `Evoluciona con: ${PASSIVES[a.pair].name}` };
    }
    if (o.type === 'pas') {
      const p = PASSIVES[o.id], lv = this.passives[o.id] || 0;
      return { icon: p.icon, title: p.name, tag: lv === 0 ? 'NUEVA' : `Nv ${lv + 1}`, lv, desc: p.desc,
        hint: `Hace evolucionar: ${ACTIVES[pairOf(o.id)].name}` };
    }
    if (o.type === 'heal') return { icon: 'tamal', title: 'Tamal de Elote', tag: '', desc: 'Recupera 30% de blindaje', hint: '' };
    return { icon: 'coin', title: 'Bolsa de ' + COIN_NAME, tag: '', desc: '+15 ' + COIN_NAME.toLowerCase(), hint: '' };
  }
  applyOffer(o) {
    if (o.type === 'act') {
      const first = !this.skills[o.id];
      this.skills[o.id] = (this.skills[o.id] || 0) + 1;
      if (first) this.wcd[o.id] = this.gt + 400;
      if (o.id === 'machetes') this.syncMachetes();
    } else if (o.type === 'pas') {
      this.passives[o.id] = (this.passives[o.id] || 0) + 1;
      const oldMax = this.maxHp; this.recalc(); this.hp += Math.max(0, this.maxHp - oldMax);
    } else if (o.type === 'evo') {
      this.evolved[o.id] = true;
      if (o.id === 'machetes') this.syncMachetes();
      this.cameras.main.flash(250, 255, 220, 120);
      this.banner('¡EVOLUCIÓN!\n' + ACTIVES[o.id].evo.toUpperCase(), '#fde047');
    } else if (o.type === 'heal') {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
    } else {
      this.runCoins += 15;
    }
    this.refreshSkillIcons(); this.updateHud();
  }
  showLevelUp() {
    this.pauseGame(); this.clearModal();
    const offers = this.buildOffers(), openedAt = performance.now();
    let chosen = false;
    this.M(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    this.M(txt(this, W / 2, 175, '¡SUBISTE DE NIVEL!', 38, '#fde047'));
    this.M(txt(this, W / 2, 222, `Nivel ${this.plevel - this.pendingLv + 1} · Elegí una mejora`, 20, '#ffffff'));
    offers.forEach((o, i) => {
      const d = this.describe(o), y = 335 + i * 168;
      const card = this.M(this.add.rectangle(W / 2, y, 490, 150, d.gold ? 0x713f12 : 0x1c1917)
        .setStrokeStyle(5, d.gold ? 0xfacc15 : 0xf59e0b).setInteractive({ useHandCursor: true }));
      this.M(this.add.rectangle(88, y, 92, 92, 0x000000, 0.35), 3501);
      this.M(fitIcon(this.add.image(88, y, d.icon), 64), 3502);
      this.M(this.add.text(150, y - 52, d.title, { fontFamily: FONT, fontSize: '22px', color: d.gold ? '#fde047' : '#ffffff' }), 3501);
      if (d.tag) this.M(this.add.text(W - 32, y - 50, d.tag, { fontFamily: FONT, fontSize: '15px',
        color: d.tag === 'NUEVA' ? '#86efac' : '#fde047' }).setOrigin(1, 0), 3501);
      this.M(this.add.text(150, y - 18, d.desc, { fontFamily: FONT, fontSize: '17px', color: '#e7e5e4', wordWrap: { width: 330 } }), 3501);
      if (d.hint) this.M(this.add.text(150, y + 40, d.hint, { fontFamily: FONT, fontSize: '12px', color: '#a8a29e', wordWrap: { width: 330 } }), 3501);
      if (d.lv !== undefined) for (let k = 0; k < MAX_SKILL_LVL; k++) {
        this.M(this.add.rectangle(156 + k * 18, y + 30, 13, 8, k < d.lv ? 0xf59e0b : (k === d.lv ? 0xfde047 : 0x44403c)), 3501);
      }
      let pressed = false;
      card.on('pointerdown', () => { pressed = true; card.setScale(0.98); });
      card.on('pointerout', () => { pressed = false; card.setScale(1); });
      card.on('pointerup', () => {
        card.setScale(1);
        if (!pressed || chosen || performance.now() - openedAt < 350) return;
        chosen = true; this.clearModal(); this.applyOffer(o); this.pendingLv--; this.nextModal();
      });
    });
    if (this.rerolls > 0) {
      this.modal.push(button(this, W / 2, 870, 330, 58, `CAMBIAR OPCIONES (${this.rerolls})`, () => {
        if (chosen) return; chosen = true; this.rerolls--; this.showLevelUp();
      }, { depth: 3503, size: 18, color: 0xe5e7eb }));
    }
  }
  showChest() {
    this.pauseGame(); this.clearModal();
    // prioridad: evolución disponible > subir un arma/pasiva > bitcolones
    const S = this.skills, P = this.passives;
    let o = null;
    for (const id in ACTIVES) if (S[id] === MAX_SKILL_LVL && !this.evolved[id] && P[ACTIVES[id].pair]) { o = { type: 'evo', id }; break; }
    if (!o) {
      const pool = [];
      for (const id in S) if (S[id] < MAX_SKILL_LVL && !this.evolved[id]) pool.push({ type: 'act', id });
      for (const id in P) if (P[id] < MAX_SKILL_LVL) pool.push({ type: 'pas', id });
      o = pool.length ? Phaser.Utils.Array.GetRandom(pool) : { type: 'gold' };
    }
    const d = this.describe(o);
    this.applyOffer(o);
    const openedAt = performance.now();
    this.M(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    this.M(this.add.rectangle(W / 2, H / 2, 450, 470, d.gold ? 0x713f12 : 0x1c1917).setStrokeStyle(6, 0xfacc15));
    this.M(txt(this, W / 2, H / 2 - 190, '¡COFRE DORADO!', 36, '#fde047'));
    this.M(fitIcon(this.add.image(W / 2, H / 2 - 90, d.icon), 96), 3501);
    this.M(txt(this, W / 2, H / 2 + 10, (d.tag ? d.tag + '\n' : '') + d.title, 24, '#ffffff'), 3501);
    this.M(this.add.text(W / 2, H / 2 + 75, d.desc, { fontFamily: FONT, fontSize: '18px', color: '#e7e5e4', align: 'center',
      wordWrap: { width: 380 } }).setOrigin(0.5, 0), 3501);
    this.modal.push(button(this, W / 2, H / 2 + 175, 260, 64, '¡VA PUES!', () => {
      if (performance.now() - openedAt < 350) return;
      this.clearModal(); this.pendingChest--; this.nextModal();
    }, { depth: 3503, size: 24 }));
  }
  showPause() {
    if (this.paused || this.state === 'dead' || this.state === 'won') return;
    this.pauseGame(); this.clearModal();
    this.M(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    this.M(this.add.rectangle(W / 2, H / 2, 450, 420, 0x1c1917).setStrokeStyle(6, 0xf59e0b));
    this.M(txt(this, W / 2, H / 2 - 160, 'PAUSA', 40, '#fde047'));
    const names = Object.keys(this.skills).map(id => (this.evolved[id] ? ACTIVES[id].evo : ACTIVES[id].name) + ' ' + this.skills[id])
      .concat(Object.keys(this.passives).map(id => PASSIVES[id].name + ' ' + this.passives[id]));
    this.M(this.add.text(W / 2, H / 2 - 110, names.join('\n'), { fontFamily: FONT, fontSize: '15px', color: '#e7e5e4',
      align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0), 3501);
    this.modal.push(button(this, W / 2, H / 2 + 100, 300, 64, 'CONTINUAR', () => { this.clearModal(); this.nextModal(); }, { depth: 3503 }));
    this.modal.push(button(this, W / 2, H / 2 + 178, 300, 56, 'SALIR AL MENÚ', () => { this.bank(); this.scene.start('Menu'); },
      { depth: 3503, size: 20, color: 0xe5e7eb }));
  }

  /* ---------- oleadas ---------- */
  buildWave(n) {
    const L = this.level, list = [];
    const add = (type, k) => { for (let i = 0; i < k; i++) list.push(type); };
    add('sicario', 12 + n * 6 + (L - 1) * 4);
    if (n >= 2) add('rapido', 4 + n * 2 + L);
    if (n >= 3) add('pesado', n + Math.floor(L / 2));
    if (n >= 4 || L >= 3) add('tirador', Math.max(2, n - 1 + L));
    if (n === 2 || n === 4) add('elite', 1);
    return Phaser.Utils.Array.Shuffle(list);
  }
  startWave(n) {
    if (this.state === 'dead') return;
    this.wave = n; this.state = 'wave'; this.queue = this.buildWave(n);
    this.banner(`OLEADA ${n}/${WAVES_PER_LEVEL}`);
    this.updateHud();
    this.spawnTimer = this.time.addEvent({ delay: Math.max(260, 620 - n * 50 - this.level * 20), loop: true, callback: () => {
      if (this.state !== 'wave' || this.enemies.countActive(true) > 130) return;
      const k = Math.min(this.queue.length, n >= 3 ? 3 : 2);
      for (let i = 0; i < k; i++) {
        const p = this.spawnPoint(), kind = this.queue.pop();
        this.spawnEnemy(kind, p.x, p.y);
        if (kind === 'elite') this.banner('¡LLEGÓ UN ÉLITE!\nsuelta cofre dorado', '#fbbf24');
      }
      if (this.queue.length === 0) { this.spawnTimer.remove(); this.spawnTimer = null; }
    } });
  }
  spawnPoint() {
    const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(600, 720);
    return {
      x: Phaser.Math.Clamp(this.player.x + Math.cos(a) * d, 40, WORLD - 40),
      y: Phaser.Math.Clamp(this.player.y + Math.sin(a) * d, 40, WORLD - 40),
    };
  }
  spawnEnemy(kind, x, y) {
    const t = ENEMY_TYPES[kind];
    const e = this.enemies.create(x, y, t.tex).setDepth(8);
    e.body.setCircle(t.r, t.size / 2 - t.r, t.size / 2 - t.r);
    e.kind = kind; e.t = t; e.hp = e.maxHp = t.hp * this.mult;
    e.nextHit = 0; e.nextShot = this.gt + 1200 + Math.random() * 1200;
    return e;
  }
  waveCleared() {
    this.state = 'between';
    this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15);
    this.updateHud();
    if (this.wave < WAVES_PER_LEVEL) {
      this.banner('¡OLEADA SUPERADA!\n+15% blindaje', '#86efac');
      this.time.delayedCall(2000, () => this.startWave(this.wave + 1));
    } else {
      this.banner('¡OLEADAS LIMPIAS!', '#86efac');
      this.time.delayedCall(1800, () => this.startBoss());
    }
  }

  /* ---------- jefe ---------- */
  startBoss() {
    if (this.state === 'dead') return;
    this.state = 'boss'; this.updateHud();
    this.banner(this.isFinal ? '¡JEFE FINAL!\nEL TIBURÓN' : '¡SE ACERCA\nEL CABECILLA!', '#ff6b6b');
    this.cameras.main.shake(400, 0.006);
    this.time.delayedCall(1200, () => {
      if (this.state !== 'boss') return;
      const p = this.spawnPoint(), size = this.isFinal ? 130 : 100, r = size * 0.4;
      const b = this.enemies.create(p.x, p.y, this.isFinal ? 'boss_final' : 'boss').setDepth(9);
      b.body.setCircle(r, size / 2 - r, size / 2 - r);
      b.body.pushable = false;
      b.isBoss = true; b.kind = 'boss'; b.t = { dmg: 25, coin: 0, xp: 0, r, color: 0xfacc15 };
      b.hp = b.maxHp = 900 * this.mult * (this.isFinal ? 2.2 : 1);
      b.nextHit = 0; b.nextBurst = this.gt + 2200; b.nextSummon = this.gt + 4500;
      this.boss = b; this.bossBox.setVisible(true); this.updateHud();
    });
  }
  updateBoss(now) {
    const b = this.boss, enraged = b.hp < b.maxHp * 0.5;
    const ang = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
    b.rotation = ang;
    this.physics.velocityFromRotation(ang, enraged ? 95 : 60, b.body.velocity);
    if (now > b.nextBurst) {
      const n = enraged ? 18 : 12, off = Math.random() * Math.PI;
      for (let i = 0; i < n; i++) this.fireEnemyBullet(b.x, b.y, off + i * Math.PI * 2 / n, enraged ? 230 : 190);
      b.nextBurst = now + (enraged ? 1500 : 2300);
    }
    if (now > b.nextSummon) {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnEnemy(enraged && i === 0 ? 'pesado' : 'sicario', b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80);
      }
      b.nextSummon = now + 6500;
    }
  }
  bossDefeated(b) {
    this.state = 'won'; this.boss = null; this.bossBox.setVisible(false);
    this.cameras.main.shake(600, 0.01); this.cameras.main.flash(300, 255, 255, 255);
    this.burst(b.x, b.y, 0xfacc15, 40);
    this.enemies.getChildren().slice().forEach(e => { if (e === b) return; this.burst(e.x, e.y, e.t.color, 6); e.destroy(); });
    this.enemyBullets.clear(true, true);
    for (let i = 0; i < 25; i++) this.dropItem(b.x, b.y, 'coin', 120);
    const pups = this.isFinal ? 5 : 1 + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < pups; i++) this.dropItem(b.x, b.y, 'pupusa', 90);
    this.banner(this.isFinal ? '¡CAMPAÑA\nCOMPLETADA!' : '¡JEFE\nDERROTADO!', '#fde047');
    this.time.delayedCall(700, () => this.coins.getChildren().forEach(c => { c.homing = true; }));
    this.time.delayedCall(2600, () => this.showVictory());
  }

  /* ---------- daño ---------- */
  damageEnemy(e, dmg) {
    if (!e.active) return;
    e.hp -= dmg;
    if (!e.flashing) {
      e.flashing = true; e.setTintFill(0xffffff);
      this.time.delayedCall(60, () => { if (e.active) { e.clearTint(); e.flashing = false; } });
    }
    if (e.isBoss) this.updateHud();
    if (e.hp <= 0) this.killEnemy(e);
  }
  // golpea a todos los enemigos dentro del radio; con proj.hits evita pegarle al mismo muy seguido (cd<0 = una sola vez)
  hitScan(x, y, r, dmg, proj, cd) {
    const now = this.gt;
    for (const e of this.enemyList) {
      if (!e.active) continue;
      const rr = r + e.t.r, dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (proj) {
        const last = proj.hits.get(e);
        if (last !== undefined && (cd < 0 || now - last < cd)) continue;
        proj.hits.set(e, now);
      }
      this.damageEnemy(e, dmg);
    }
  }
  explode(x, y, r, dmg) {
    const c = this.add.circle(x, y, r, 0xf97316, 0.55).setDepth(12).setScale(0.3);
    this.tweens.add({ targets: c, scale: 1, alpha: 0, duration: 260, onComplete: () => c.destroy() });
    this.burst(x, y, 0xfde047, 6);
    this.hitScan(x, y, r, dmg, null, 0);
  }
  killEnemy(e) {
    this.kills++;
    this.burst(e.x, e.y, e.t.color, e.isBoss ? 30 : 6);
    if (e.isBoss) { this.bossDefeated(e); e.destroy(); return; }
    const t = e.t;
    if (t.xp >= 20) this.dropItem(e.x, e.y, 'xp20');
    else if (t.xp >= 5) this.dropItem(e.x, e.y, 'xp5');
    else for (let i = 0; i < t.xp; i++) this.dropItem(e.x, e.y, 'xp1');
    for (let i = 0; i < t.coin; i++) if (Math.random() < 0.35) this.dropItem(e.x, e.y, 'coin');
    if (t.elite) { this.dropItem(e.x, e.y, 'cofre', 30); for (let i = 0; i < 5; i++) this.dropItem(e.x, e.y, 'coin', 60); }
    const r = Math.random();
    if (r < 0.012) this.dropItem(e.x, e.y, 'tamal');
    else if (r < 0.018) this.dropItem(e.x, e.y, 'iman');
    else if (r < 0.022) this.dropItem(e.x, e.y, 'bomba');
    e.destroy();
  }
  touchEnemy(e) {
    if (this.gt < e.nextHit) return;
    e.nextHit = this.gt + 700;
    this.damagePlayer(e.t.dmg * (e.isBoss ? 1 : 1 + 0.15 * (this.level - 1)));
  }
  damagePlayer(amount) {
    if (this.state === 'dead' || this.state === 'won' || this.paused) return;
    if (this.gt < this.invulnUntil) return;
    this.invulnUntil = this.gt + 250;
    this.hp -= amount * this.m.armor;
    this.player.setTint(0xff6b6b); this.turret.setTint(0xff6b6b);
    this.time.delayedCall(120, () => { this.player.clearTint(); this.turret.clearTint(); });
    this.cameras.main.shake(90, 0.004);
    this.updateHud();
    if (this.hp <= 0) this.gameOver();
  }
  burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = this.add.image(x, y, 'spark').setTint(color).setDepth(12).setScale(Phaser.Math.FloatBetween(0.6, 1.5));
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(18, 60);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.2,
        duration: Phaser.Math.Between(250, 450), onComplete: () => s.destroy() });
    }
  }
  nearestEnemy(range) {
    let best = null, bestD = range * range;
    for (const e of this.enemyList) {
      if (!e.active) continue;
      const dx = e.x - this.player.x, dy = e.y - this.player.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  randomEnemy(range) {
    const r2 = range * range, list = [];
    for (const e of this.enemyList) {
      if (!e.active) continue;
      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      if (dx * dx + dy * dy < r2) list.push(e);
    }
    return list.length ? Phaser.Utils.Array.GetRandom(list) : null;
  }

  /* ---------- armas ---------- */
  fireCannon(ang) {
    const lv = this.skills.canon, ev = this.evolved.canon, st = W_STATS.canon;
    const shots = ev ? 3 : st.shots[lv - 1], dmg = 10 * this.m.dmg * st.dmg[lv - 1] * (ev ? 1.3 : 1);
    for (let i = 0; i < shots; i++) {
      const a = ang + (i - (shots - 1) / 2) * 0.16;
      const x = this.player.x + Math.cos(a) * 40, y = this.player.y + Math.sin(a) * 40;
      const b = this.bullets.create(x, y, 'bullet').setDepth(9);
      b.rotation = a; b.dmg = dmg; b.die = this.gt + 900; b.boom = ev;
      if (ev) b.setTint(0xff7b00).setScale(1.4);
      this.physics.velocityFromRotation(a, 640, b.body.velocity);
    }
    const fx = this.player.x + Math.cos(ang) * 40, fy = this.player.y + Math.sin(ang) * 40;
    const flash = this.add.image(fx, fy, 'spark').setTint(0xffe066).setScale(2.4).setDepth(12);
    this.tweens.add({ targets: flash, alpha: 0, scale: 0.5, duration: 90, onComplete: () => flash.destroy() });
  }
  bulletHit(b, e) {
    if (!b.active || !e.active) return;
    b.destroy();
    this.burst(b.x, b.y, 0xffe066, 2);
    if (b.boom) this.explode(b.x, b.y, 42 * this.m.area, b.dmg * 0.6);
    this.damageEnemy(e, b.dmg);
  }
  throwBrick(ev, dmg) {
    const spr = this.add.image(this.player.x, this.player.y, 'brick').setDepth(13).setScale(ev ? 2 : 1.1);
    if (ev) spr.setTint(0xb8b8b8);
    const p = { spr, hits: new Map(), dmg, r: (ev ? 22 : 11) * this.m.area,
      vx: Phaser.Math.Between(-180, 180) * this.m.spd, vy: -Phaser.Math.Between(480, 600) * this.m.spd,
      spin: Phaser.Math.FloatBetween(-12, 12), die: this.gt + 1700 };
    p.step = (p, now, dt) => {
      p.vy += 950 * dt; p.spr.x += p.vx * dt; p.spr.y += p.vy * dt; p.spr.rotation += p.spin * dt;
      this.hitScan(p.spr.x, p.spr.y, p.r, p.dmg, p, -1);
      return now < p.die;
    };
    this.projs.push(p);
  }
  throwChancla(ev, dmg, ang, distF) {
    const sp = 430 * this.m.spd * (ev ? 1.1 : 1);
    const spr = this.add.image(this.player.x, this.player.y, 'chancla').setDepth(13).setScale(ev ? 1.9 : 1.15);
    const p = { spr, hits: new Map(), dmg, sp, out: true, travelled: 0, dist: (ev ? 330 : 240) * this.m.spd * distF,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: (ev ? 24 : 15) * this.m.area, die: this.gt + 4000 };
    p.step = (p, now, dt) => {
      p.spr.rotation += 15 * dt;
      if (p.out) {
        p.spr.x += p.vx * dt; p.spr.y += p.vy * dt; p.travelled += p.sp * dt;
        if (p.travelled >= p.dist) p.out = false;
      } else {
        const a = Phaser.Math.Angle.Between(p.spr.x, p.spr.y, this.player.x, this.player.y);
        p.spr.x += Math.cos(a) * p.sp * 1.2 * dt; p.spr.y += Math.sin(a) * p.sp * 1.2 * dt;
        if (Phaser.Math.Distance.Between(p.spr.x, p.spr.y, this.player.x, this.player.y) < 26) return false;
      }
      this.hitScan(p.spr.x, p.spr.y, p.r, p.dmg, p, 350);
      return now < p.die;
    };
    this.projs.push(p);
  }
  throwJar(ev, dps, radius, dur) {
    const t = this.randomEnemy(380);
    const tx = t ? t.x : this.player.x + Phaser.Math.Between(-180, 180);
    const ty = t ? t.y : this.player.y + Phaser.Math.Between(-180, 180);
    const spr = this.add.image(this.player.x, this.player.y, 'jar').setDepth(13);
    this.tweens.add({ targets: spr, scale: 1.8, duration: 250, yoyo: true });
    this.tweens.add({ targets: spr, x: tx, y: ty, angle: 360, duration: 500, onComplete: () => {
      spr.destroy();
      if (this.state === 'dead') return;
      this.burst(tx, ty, 0xdc2626, 6);
      const z = this.add.image(tx, ty, 'firezone').setDepth(4).setDisplaySize(radius * 2, radius * 2);
      if (ev) z.setTint(0xffb020);
      const p = { spr: z, die: this.gt + dur, next: 0 };
      p.step = (p, now) => {
        if (now >= p.next) { p.next = now + 300; this.hitScan(tx, ty, radius, dps * 0.3, null, 0); }
        p.spr.setAlpha(now > p.die - 300 ? Math.max(0, (p.die - now) / 300) : 0.75 + 0.2 * Math.sin(now / 90));
        return now < p.die;
      };
      this.projs.push(p);
    } });
  }
  launchRocket(ev, dmg, rad) {
    const spr = this.add.image(this.player.x, this.player.y, 'rocket').setDepth(13).setScale(ev ? 1.4 : 1);
    const p = { spr, ang: Math.random() * Math.PI * 2, sp: 240 * this.m.spd, target: this.randomEnemy(480),
      die: this.gt + 2600, trail: 0 };
    p.step = (p, now, dt) => {
      if (!p.target || !p.target.active) p.target = this.randomEnemy(480);
      if (p.target) p.ang = Phaser.Math.Angle.RotateTo(p.ang, Phaser.Math.Angle.Between(p.spr.x, p.spr.y, p.target.x, p.target.y), 6 * dt);
      p.sp = Math.min(p.sp + 520 * dt, 540 * this.m.spd);
      p.spr.x += Math.cos(p.ang) * p.sp * dt; p.spr.y += Math.sin(p.ang) * p.sp * dt; p.spr.rotation = p.ang;
      if (now > p.trail) {
        p.trail = now + 60;
        const s = this.add.image(p.spr.x, p.spr.y, 'spark').setTint(Phaser.Utils.Array.GetRandom([0xfde047, 0xf472b6, 0x60a5fa])).setDepth(12);
        this.tweens.add({ targets: s, alpha: 0, scale: 0.2, duration: 300, onComplete: () => s.destroy() });
      }
      const hit = p.target && Phaser.Math.Distance.Between(p.spr.x, p.spr.y, p.target.x, p.target.y) < p.target.t.r + 10;
      if (hit || now > p.die) { this.explode(p.spr.x, p.spr.y, rad, dmg); return false; }
      return true;
    };
    this.projs.push(p);
  }
  syncMachetes() {
    const L = this.skills.machetes;
    if (!L) return;
    const n = this.evolved.machetes ? 6 : W_STATS.machetes.n[L - 1];
    while (this.machs.length < n) this.machs.push(this.add.image(this.player.x, this.player.y, 'machete').setDepth(12));
    while (this.machs.length > n) this.machs.pop().destroy();
  }
  updateMachetes(now, dt) {
    const L = this.skills.machetes;
    if (!L) return;
    const ev = this.evolved.machetes;
    if (ev) this.machOn = true;
    else if (now >= this.machCycle) { this.machOn = !this.machOn; this.machCycle = now + (this.machOn ? 4000 : 2500 * this.m.cd); }
    const n = this.machs.length, r = (ev ? 100 : 78) * this.m.area, sc = ev ? 1.4 : 1;
    const dmg = (ev ? 26 : 12) * this.m.dmg * W_STATS.machetes.dmg[L - 1];
    this.machAng += (ev ? 4.5 : 3.2) * this.m.spd * dt;
    this.machs.forEach((s, i) => {
      s.setVisible(this.machOn);
      if (!this.machOn) return;
      const a = this.machAng + i * Math.PI * 2 / n;
      s.setPosition(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r).setRotation(a).setScale(sc);
      this.hitScan(s.x, s.y, 16 * sc, dmg, this.machHits, 400);
    });
  }
  updateWeapons(now, dt) {
    const S = this.skills, E = this.evolved, m = this.m, ready = id => S[id] && now >= (this.wcd[id] || 0);
    if (ready('ladrillo')) {
      const lv = S.ladrillo, ev = E.ladrillo, n = ev ? 5 : W_STATS.ladrillo.n[lv - 1];
      const dmg = 25 * m.dmg * W_STATS.ladrillo.dmg[lv - 1] * (ev ? 2.2 : 1);
      for (let i = 0; i < n; i++) this.throwBrick(ev, dmg);
      this.wcd.ladrillo = now + (ev ? 1400 : 1800) * m.cd;
    }
    if (ready('chancla')) {
      const lv = S.chancla, ev = E.chancla, n = ev ? 4 : W_STATS.chancla.n[lv - 1];
      const dmg = 14 * m.dmg * W_STATS.chancla.dmg[lv - 1] * (ev ? 2 : 1);
      const t = this.nearestEnemy(500);
      const base = t ? Phaser.Math.Angle.Between(this.player.x, this.player.y, t.x, t.y) : Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = ev ? base + i * Math.PI / 2 : base + (i - (n - 1) / 2) * 0.5;
        this.throwChancla(ev, dmg, a, W_STATS.chancla.dist[lv - 1]);
      }
      this.wcd.chancla = now + (ev ? 1600 : 2200) * m.cd;
    }
    if (ready('chile')) {
      const lv = S.chile, ev = E.chile, n = ev ? 5 : W_STATS.chile.n[lv - 1];
      const dps = 18 * m.dmg * W_STATS.chile.dmg[lv - 1] * (ev ? 2.2 : 1);
      const radius = (ev ? 80 : 50) * m.area * W_STATS.chile.r[lv - 1];
      for (let i = 0; i < n; i++) this.time.delayedCall(i * 120, () => this.throwJar(ev, dps, radius, ev ? 4000 : 2500));
      this.wcd.chile = now + (ev ? 2200 : 2600) * m.cd;
    }
    if (ready('cohetes')) {
      const lv = S.cohetes, ev = E.cohetes, n = ev ? 8 : W_STATS.cohetes.n[lv - 1];
      const dmg = 22 * m.dmg * W_STATS.cohetes.dmg[lv - 1] * (ev ? 1.8 : 1);
      for (let i = 0; i < n; i++) this.launchRocket(ev, dmg, (ev ? 70 : 45) * m.area);
      this.wcd.cohetes = now + (ev ? 1500 : 2000) * m.cd;
    }
    this.updateMachetes(now, dt);
  }

  /* ---------- objetos del suelo ---------- */
  dropItem(x, y, kind, spread = 0) {
    if (kind.startsWith('xp') && this.coins.getLength() > 260) { this.gainXp(kind === 'xp20' ? 20 : kind === 'xp5' ? 5 : 1); return; }
    const c = this.add.image(x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10), kind).setDepth(5).setScale(0);
    c.kind = kind; this.coins.add(c);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.out' });
    if (spread > 0) {
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(20, spread);
      this.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, duration: 420, ease: 'Cubic.out' });
    }
  }
  collect(c) {
    if (!c.active) return;
    const k = c.kind;
    c.destroy();
    if (k === 'coin') { this.runCoins++; this.popText(this.coinText); }
    else if (k === 'pupusa') { this.runPupusas++; this.popText(this.pupText); }
    else if (k === 'xp1') this.gainXp(1);
    else if (k === 'xp5') this.gainXp(5);
    else if (k === 'xp20') this.gainXp(20);
    else if (k === 'tamal') {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
      this.floatText('+30% blindaje', '#86efac');
    } else if (k === 'iman') {
      this.coins.getChildren().forEach(o => { if (o.kind === 'coin' || o.kind.startsWith('xp')) o.homing = true; });
      this.floatText('¡IMÁN!', '#fca5a5');
    } else if (k === 'bomba') {
      const v = this.cameras.main.worldView;
      this.cameras.main.flash(250, 255, 240, 200); this.cameras.main.shake(300, 0.01);
      this.enemyList.forEach(e => {
        if (!e.active || !v.contains(e.x, e.y)) return;
        if (e.isBoss) this.damageEnemy(e, e.maxHp * 0.08); else this.damageEnemy(e, 99999);
      });
      this.floatText('¡BOMBA!', '#fde047');
    } else if (k === 'cofre') {
      this.pendingChest++;
      if (!this.paused) this.nextModal();
    }
    this.updateHud();
  }
  floatText(str, color) {
    const t = txt(this, this.player.x, this.player.y - 50, str, 22, color).setDepth(14);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }
  popText(t) { t.setScale(1.35); this.tweens.add({ targets: t, scale: 1, duration: 140 }); }
  updateCoins(delta) {
    const px = this.player.x, py = this.player.y, mag = this.stats.magnet;
    for (const c of this.coins.getChildren().slice()) {
      if (!c.active) continue;
      const d = Phaser.Math.Distance.Between(c.x, c.y, px, py);
      const magnetic = c.kind === 'coin' || c.kind === 'pupusa' || c.kind.startsWith('xp');
      if (magnetic && d < mag) c.homing = true;
      if (c.homing) {
        c.spd = (c.spd || 240) + delta * 1.2;
        const a = Phaser.Math.Angle.Between(c.x, c.y, px, py), step = c.spd * delta / 1000;
        c.x += Math.cos(a) * step; c.y += Math.sin(a) * step;
      }
      if (d < (magnetic ? 26 : 36)) this.collect(c);
      if (this.paused) break;
    }
  }

  /* ---------- fin de partida ---------- */
  bank() {
    if (this.banked) return;
    this.banked = true;
    SAVE.coins += this.runCoins; SAVE.pupusas += this.runPupusas; writeSave();
  }
  overlay(title, body, buttons) {
    this.uiBlocked = true; this.joy.reset();
    const d = 3000;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setScrollFactor(0).setDepth(d).setInteractive();
    const ph = 300 + buttons.length * 92;
    this.add.rectangle(W / 2, H / 2, 470, ph, 0x1c1917).setStrokeStyle(6, 0xf59e0b).setScrollFactor(0).setDepth(d + 1);
    const top = H / 2 - ph / 2;
    txt(this, W / 2, top + 60, title, 34, '#fde047').setScrollFactor(0).setDepth(d + 2);
    txt(this, W / 2, top + 165, body, 21, '#ffffff', { lineSpacing: 8, strokeThickness: 0 }).setScrollFactor(0).setDepth(d + 2);
    buttons.forEach((b, i) => button(this, W / 2, top + 290 + i * 92, 380, 72, b.label, b.cb,
      { depth: d + 3, color: b.color, size: 24 }));
  }
  showVictory() {
    this.coins.getChildren().slice().forEach(c => { if (c.kind === 'coin' || c.kind === 'pupusa') this.collect(c); });
    this.bank();
    SAVE.level = Math.max(SAVE.level, Math.min(this.level + 1, LEVELS_PER_CAMPAIGN + 1));
    writeSave();
    const body = `+${this.runCoins} ${COIN_NAME}\n+${this.runPupusas} ${PREMIUM_NAME}\n${this.kills} bandidos · Nivel ${this.plevel}`;
    if (this.isFinal) {
      this.overlay('¡CAMPAÑA 1\nCOMPLETADA!', body + '\n\nPróximamente: el Presidente\ndel Norte lo manda a llamar...', [
        { label: 'TALLER Y SKINS', cb: () => this.scene.start('Shop'), color: 0x84cc16 },
        { label: 'MENÚ', cb: () => this.scene.start('Menu'), color: 0xe5e7eb },
      ]);
    } else {
      this.overlay(`¡NIVEL ${this.level}\nSUPERADO!`, body, [
        { label: `NIVEL ${this.level + 1} ▶`, cb: () => this.scene.start('Game', { level: this.level + 1 }) },
        { label: 'MEJORAR TANQUE', cb: () => this.scene.start('Shop'), color: 0x84cc16 },
      ]);
    }
  }
  gameOver() {
    this.state = 'dead';
    this.physics.pause();
    if (this.spawnTimer) { this.spawnTimer.remove(); this.spawnTimer = null; }
    this.burst(this.player.x, this.player.y, 0xff9900, 34);
    this.player.setVisible(false); this.turret.setVisible(false);
    this.machs.forEach(s => s.setVisible(false));
    this.cameras.main.shake(500, 0.012);
    this.bank();
    const where = this.boss ? 'Caíste peleando con el jefe' : `Llegaste a la oleada ${this.wave}/${WAVES_PER_LEVEL}`;
    this.time.delayedCall(1100, () => this.overlay('¡TE DERRIBARON!',
      `${where}\n+${this.runCoins} ${COIN_NAME} (se guardan)\n\nMejore el tanque y vuelva, General.`, [
        { label: 'MEJORAR TANQUE', cb: () => this.scene.start('Shop'), color: 0x84cc16 },
        { label: 'REINTENTAR', cb: () => this.scene.restart({ level: this.level }) },
        { label: 'MENÚ', cb: () => this.scene.start('Menu'), color: 0xe5e7eb },
      ]));
  }

  /* ---------- bucle ---------- */
  update(_t, rawDelta) {
    if (this.state === 'dead' || this.paused) return;
    const delta = Math.min(rawDelta, 50), dt = delta / 1000;
    this.gt += delta;
    const now = this.gt;
    this.enemyList = this.enemies.getChildren().slice();

    // movimiento del tanque
    let vx = this.joy.vec.x, vy = this.joy.vec.y;
    if (this.keys) {
      const k = this.keys, w = this.wasd;
      const kx = (k.right.isDown || w.D.isDown ? 1 : 0) - (k.left.isDown || w.A.isDown ? 1 : 0);
      const ky = (k.down.isDown || w.S.isDown ? 1 : 0) - (k.up.isDown || w.W.isDown ? 1 : 0);
      if (kx || ky) { vx = kx; vy = ky; }
    }
    const len = Math.hypot(vx, vy);
    if (len > 0.15) {
      const sp = this.stats.speed * Math.min(1, len);
      this.player.body.setVelocity(vx / len * sp, vy / len * sp);
      this.player.rotation = Phaser.Math.Angle.RotateTo(this.player.rotation, Math.atan2(vy, vx), 0.15);
    } else {
      this.player.body.setVelocity(0, 0);
    }
    this.turret.setPosition(this.player.x, this.player.y);
    if (this.m.regen && this.hp < this.maxHp && this.state !== 'won') {
      this.hp = Math.min(this.maxHp, this.hp + this.m.regen * dt);
      if (Math.floor(now / 500) !== Math.floor((now - delta) / 500)) this.updateHud();
    }

    // cañón con apuntado automático
    const target = this.state === 'won' ? null : this.nearestEnemy(390);
    if (target) {
      const desired = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
      this.turret.rotation = Phaser.Math.Angle.RotateTo(this.turret.rotation, desired, 0.2);
      if (now > this.fireReady && Math.abs(Phaser.Math.Angle.Wrap(desired - this.turret.rotation)) < 0.3) {
        this.fireCannon(this.turret.rotation);
        const lv = this.skills.canon;
        this.fireReady = now + this.stats.fireDelay * this.m.cd * W_STATS.canon.rate[lv - 1] * (this.evolved.canon ? 0.8 : 1);
      }
    } else {
      this.turret.rotation = Phaser.Math.Angle.RotateTo(this.turret.rotation, this.player.rotation, 0.08);
    }

    // demás armas
    if (this.state !== 'won') this.updateWeapons(now, dt);
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      if (!p.step(p, now, dt)) { p.spr.destroy(); this.projs.splice(i, 1); }
    }

    // enemigos
    const px = this.player.x, py = this.player.y;
    for (const e of this.enemyList) {
      if (!e.active || e.isBoss) continue;
      const ang = Phaser.Math.Angle.Between(e.x, e.y, px, py);
      e.rotation = ang;
      let sp = e.t.speed;
      if (e.t.shooter && Phaser.Math.Distance.Between(e.x, e.y, px, py) < 260) {
        sp = 0;
        if (now > e.nextShot) { this.fireEnemyBullet(e.x, e.y, ang, 230); e.nextShot = now + 1900; }
      }
      this.physics.velocityFromRotation(ang, sp, e.body.velocity);
    }
    if (this.boss && this.boss.active) this.updateBoss(now);

    for (const b of this.bullets.getChildren().slice()) if (now > b.die) b.destroy();
    for (const b of this.enemyBullets.getChildren().slice()) if (now > b.die) b.destroy();
    this.updateCoins(delta);

    // nuevas cajas de suministros
    if (now > this.nextCrate) {
      this.nextCrate = now + 15000;
      if (this.crates.countActive(true) < 10) {
        const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(350, 650);
        this.spawnCrate(Phaser.Math.Clamp(px + Math.cos(a) * d, 60, WORLD - 60), Phaser.Math.Clamp(py + Math.sin(a) * d, 60, WORLD - 60));
      }
    }

    if (this.state === 'wave' && this.queue.length === 0 && this.enemies.countActive(true) === 0) this.waveCleared();
  }
  fireEnemyBullet(x, y, ang, speed) {
    const b = this.enemyBullets.create(x, y, 'ebullet').setDepth(9);
    b.body.setCircle(6, 1, 1); b.die = this.gt + 3500;
    this.physics.velocityFromRotation(ang, speed, b.body.velocity);
  }
}

class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1c1917);
    txt(this, W / 2, 55, 'TALLER DEL TANQUE', 38, '#fde047');
    this.add.image(W / 2 - 110, 112, 'coin').setScale(1.3);
    txt(this, W / 2 - 92, 112, String(SAVE.coins), 26, '#fde047').setOrigin(0, 0.5);
    this.add.image(W / 2 + 60, 112, 'pupusa').setScale(1.1);
    txt(this, W / 2 + 82, 112, String(SAVE.pupusas), 26, '#fde68a').setOrigin(0, 0.5);

    UPGRADES.forEach((u, i) => {
      const y = 200 + i * 90, lvl = SAVE.up[u.id], maxed = lvl >= u.max, cost = upgradeCost(u, lvl);
      this.add.rectangle(W / 2, y, 510, 80, 0x292524).setStrokeStyle(3, 0x44403c);
      this.add.text(30, y - 22, u.name.toUpperCase(), { fontFamily: FONT, fontSize: '22px', color: '#ffffff' });
      this.add.text(30, y + 8, u.desc, { fontFamily: FONT, fontSize: '14px', color: '#a8a29e' });
      for (let k = 0; k < u.max; k++) this.add.rectangle(212 + k * 11, y - 10, 8, 14, k < lvl ? 0x84cc16 : 0x44403c);
      const label = maxed ? 'MÁXIMO' : `${cost}`;
      const btn = button(this, W - 90, y, 150, 56, label, () => {
        SAVE.coins -= cost; SAVE.up[u.id]++; writeSave(); this.scene.restart();
      }, { depth: 10, size: 22, disabled: maxed || SAVE.coins < cost });
      if (!maxed) btn.add(this.add.image(-50, 0, 'coin'));
    });

    txt(this, W / 2, 668, `SKINS · SE PAGAN CON ${PREMIUM_NAME.toUpperCase()}`, 20, '#fde68a');
    SKINS.forEach((sk, i) => {
      const x = 95 + i * 175, y = 765;
      const owned = SAVE.skins.includes(sk.id), using = SAVE.skin === sk.id;
      this.add.rectangle(x, y, 160, 150, 0x292524).setStrokeStyle(4, using ? 0xfacc15 : 0x44403c);
      this.add.image(x, y - 38, 'tank_' + sk.id).setScale(1.2);
      this.add.image(x, y - 38, 'turret_' + sk.id).setOrigin(13 / 54, 0.5).setScale(1.2);
      this.add.text(x, y + 6, sk.name, { fontFamily: FONT, fontSize: '14px', color: '#e7e5e4' }).setOrigin(0.5);
      let label, cb, disabled = false;
      if (using) { label = 'EN USO'; disabled = true; }
      else if (owned) { label = 'USAR'; cb = () => { SAVE.skin = sk.id; writeSave(); this.scene.restart(); }; }
      else {
        label = `${sk.cost}`; disabled = SAVE.pupusas < sk.cost;
        cb = () => { SAVE.pupusas -= sk.cost; SAVE.skins.push(sk.id); SAVE.skin = sk.id; writeSave(); this.scene.restart(); };
      }
      const btn = button(this, x, y + 46, 130, 44, label, cb || (() => {}), { depth: 10, size: 18, disabled, color: 0xfde68a });
      if (!owned) btn.add(this.add.image(-34, 0, 'pupusa').setScale(0.7));
    });

    const done = SAVE.level > LEVELS_PER_CAMPAIGN;
    button(this, 150, 895, 250, 70, done ? 'JEFE FINAL' : `NIVEL ${SAVE.level} ▶`,
      () => this.scene.start('Game', { level: playableLevel() }), { depth: 10, size: 24 });
    button(this, 400, 895, 220, 70, 'MENÚ', () => this.scene.start('Menu'), { depth: 10, size: 24, color: 0xe5e7eb });
  }
}

window.GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0f0a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, IntroScene, GameScene, ShopScene],
});
