'use strict';
/* =====================================================================
   GENERAL TANQUE — prototipo v0.1
   Nombres, divisas y textos se cambian aquí arriba sin tocar el resto.
   ===================================================================== */
const GAME_TITLE = 'GENERAL TANQUE';
const CAMPAIGN_NAME = 'Operación Caribe';
const GANG_NAME = 'La Banda del Tiburón';
const COIN_NAME = 'Bitcolones';
const PREMIUM_NAME = 'Pupusas';
const LEVELS_PER_CAMPAIGN = 8;
const WAVES_PER_LEVEL = 5;

const W = 540, H = 960, WORLD = 1800;
const FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';
const SAVE_KEY = 'general_tanque_save_v1';

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

const ENEMY_TYPES = {
  sicario: { tex: 'e_sicario', size: 32, hp: 20, speed: 85,  dmg: 10, r: 13, coin: 1, color: 0xb91c1c },
  rapido:  { tex: 'e_rapido',  size: 26, hp: 12, speed: 155, dmg: 6,  r: 10, coin: 1, color: 0xf59e0b },
  pesado:  { tex: 'e_pesado',  size: 44, hp: 80, speed: 52,  dmg: 20, r: 19, coin: 3, color: 0x4b5563 },
  tirador: { tex: 'e_tirador', size: 32, hp: 24, speed: 72,  dmg: 8,  r: 13, coin: 2, color: 0x7c3aed, shooter: true },
};

const INTRO = [
  { who: 'presi',   name: 'EL PRESI',   text: 'Mi General, lo mandé a llamar porque en el Caribe ' + GANG_NAME + ' tiene a todo mundo aterrado.' },
  { who: 'general', name: 'EL GENERAL', text: '¿Y por qué yo, Presi?' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Porque usted es el único que sabe manejar el tanque... y no se queja del aire acondicionado.' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Cada bandido que caiga suelta ' + COIN_NAME.toLowerCase() + '. Con eso me mejora el tanque.' },
  { who: 'general', name: 'EL GENERAL', text: '¿Y las pupusas?' },
  { who: 'presi',   name: 'EL PRESI',   text: 'Las pupusas solo las sueltan los jefes, General. Esas no se regalan.' },
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
    dmg: 10 * (1 + 0.2 * u.dmg),
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
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => { bg.setScale(0.96); t.setScale(0.96); });
    bg.on('pointerout', () => { bg.setScale(1); t.setScale(1); });
    bg.on('pointerup', () => { bg.setScale(1); t.setScale(1); onClick(); });
  }
  return c;
}

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
      // banderita azul-blanco-azul en la parte trasera
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

  // Bandidos vistos desde arriba, con pasamontañas (mirando a la derecha)
  Object.values(ENEMY_TYPES).forEach(t => {
    const s = t.size, c = s / 2;
    gen(t.tex, s, s, g => {
      g.fillStyle(0x000000, 0.25); g.fillEllipse(c + 2, c + 2, s * 0.6, s * 0.95);
      g.fillStyle(t.color); g.fillEllipse(c, c, s * 0.55, s * 0.95);
      if (t.tex === 'e_pesado') { g.fillStyle(0x1f2937); g.fillRect(c - s * 0.16, c - s * 0.36, s * 0.32, s * 0.72); }
      if (t.shooter) { g.fillStyle(0x222222); g.fillRect(c, c + s * 0.16, s * 0.5, s * 0.12); }
      g.fillStyle(0x1a1a1a); g.fillCircle(c, c, s * 0.24);
      g.fillStyle(0xbdbdbd); g.fillRect(c + s * 0.08, c - s * 0.12, s * 0.09, s * 0.24);
    });
  });

  const drawBoss = (key, s, body, accent) => gen(key, s, s, g => {
    const c = s / 2;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(c + 4, c + 4, s * 0.62, s * 0.98);
    g.fillStyle(body); g.fillEllipse(c, c, s * 0.6, s * 0.96);
    g.fillStyle(0x222222); g.fillRect(c, c - s * 0.36, s * 0.42, s * 0.1); g.fillRect(c, c + s * 0.26, s * 0.42, s * 0.1);
    g.lineStyle(Math.max(4, s * 0.05), accent); g.strokeCircle(c, c, s * 0.28);
    g.fillStyle(0x2b2b2b); g.fillCircle(c, c, s * 0.22);
    g.fillStyle(0x9ca3af); g.fillTriangle(c - s * 0.2, c, c + s * 0.12, c - s * 0.06, c + s * 0.12, c + s * 0.06); // aleta de tiburón
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
    g.fillStyle(0x4d7c0f); g.fillCircle(16, 15, 1.5); g.fillCircle(10, 13, 1.2); // loroco
  });

  // Retratos para la historia
  gen('presi', 160, 160, g => {
    g.fillStyle(0x1e3a8a); g.fillCircle(80, 80, 80);
    g.fillStyle(0x2b1d14); g.fillEllipse(80, 108, 104, 92);           // barba
    g.fillStyle(0xd8a47f); g.fillCircle(80, 82, 42);                 // cara
    g.fillStyle(0x2b1d14); g.fillEllipse(80, 112, 70, 40);           // barba inferior
    g.fillStyle(0xd8a47f); g.fillEllipse(80, 98, 40, 16);            // labio
    g.fillStyle(0x2b1d14); g.fillRoundedRect(62, 92, 36, 8, 4);      // bigote
    g.fillStyle(0x111111); g.fillCircle(66, 76, 4); g.fillCircle(94, 76, 4);
    g.fillStyle(0x111111); g.fillEllipse(80, 48, 96, 40);            // gorra
    g.fillRect(70, 22, 20, 16);                                       // visera hacia atrás
    g.fillStyle(0xffffff); g.fillRect(74, 44, 12, 6);
  });
  gen('general', 160, 160, g => {
    g.fillStyle(0x3f6212); g.fillCircle(80, 80, 80);
    g.fillStyle(0xc68d5d); g.fillCircle(80, 90, 44);
    g.fillStyle(0x4b5320); g.fillEllipse(80, 58, 112, 66);           // casco
    g.fillStyle(0x343a16); g.fillRect(26, 64, 108, 8);
    g.fillStyle(0xfacc15); g.fillCircle(62, 46, 5); g.fillCircle(80, 42, 5); g.fillCircle(98, 46, 5);
    g.fillStyle(0x111111); g.fillCircle(66, 88, 4); g.fillCircle(94, 88, 4);
    g.fillStyle(0x222222); g.fillRoundedRect(58, 104, 44, 10, 5);    // bigote
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

    this.add.text(16, H - 24, 'Prototipo v0.1', { fontFamily: FONT, fontSize: '14px', color: '#6b7a5a' }).setOrigin(0, 0.5);
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
      if (this.id !== null || scene.uiBlocked || over.length > 0) return;
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
    this.boss = null; this.banked = false; this.uiBlocked = false;
    this.runCoins = 0; this.runPupusas = 0; this.kills = 0;
    this.fireReady = 0; this.invulnUntil = 0;

    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.drawGround();

    this.player = this.physics.add.image(WORLD / 2, WORLD / 2, 'tank_' + SAVE.skin).setDepth(10).setAngle(-90);
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(23, 7, 0);
    this.player.body.pushable = false;
    this.turret = this.add.image(this.player.x, this.player.y, 'turret_' + SAVE.skin).setOrigin(13 / 54, 0.5).setDepth(11).setAngle(-90);
    this.hp = this.stats.maxHp;

    this.cameras.main.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.coins = this.add.group();

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b, e));
    this.physics.add.collider(this.player, this.enemies, (p, e) => this.touchEnemy(e));
    this.physics.add.overlap(this.player, this.enemyBullets, (p, b) => {
      if (!b.active) return; b.destroy(); this.damagePlayer(8 * Math.sqrt(this.mult));
    });
    this.physics.add.collider(this.enemies, this.enemies);

    this.joy = new Joystick(this);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    }
    this.buildHud();
    this.banner(`NIVEL ${this.level}`, '#fde047');
    this.time.delayedCall(1300, () => this.startWave(1));
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
        g.fillStyle(0x7c4a1e); g.fillRect(x - 18, y - 18, 36, 36);
        g.lineStyle(3, 0x5a3412); g.strokeRect(x - 18, y - 18, 36, 36); g.lineBetween(x - 18, y - 18, x + 18, y + 18);
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

  /* ---------- HUD ---------- */
  buildHud() {
    const d = 900, fix = o => o.setScrollFactor(0).setDepth(d);
    fix(this.add.rectangle(W / 2, 40, W, 80, 0x000000, 0.55));
    fix(this.add.text(16, 10, 'BLINDAJE', { fontFamily: FONT, fontSize: '13px', color: '#d1fae5' }));
    fix(this.add.rectangle(16, 38, 210, 18, 0x3f3f46).setOrigin(0, 0.5));
    this.hpBar = fix(this.add.rectangle(16, 38, 210, 18, 0x22c55e).setOrigin(0, 0.5));
    this.waveText = fix(this.add.text(16, 64, '', { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5));
    fix(this.add.image(W - 140, 24, 'coin'));
    this.coinText = fix(txt(this, W - 124, 24, '0', 22, '#fde047').setOrigin(0, 0.5));
    fix(this.add.image(W - 140, 58, 'pupusa').setScale(0.8));
    this.pupText = fix(txt(this, W - 124, 58, '0', 22, '#fde68a').setOrigin(0, 0.5));

    this.bossBox = this.add.container(0, 0).setDepth(d);
    const bName = txt(this, W / 2, 98, this.isFinal ? 'EL TIBURÓN · JEFE FINAL' : 'CABECILLA DE LA BANDA', 18, '#fca5a5');
    const bBg = this.add.rectangle(W / 2, 124, 480, 20, 0x3f3f46).setStrokeStyle(3, 0x111111);
    this.bossBar = this.add.rectangle(W / 2 - 240, 124, 480, 20, 0xef4444).setOrigin(0, 0.5);
    this.bossBox.add([bName, bBg, this.bossBar]).setScrollFactor(0, 0, true).setVisible(false);

    this.bannerText = txt(this, W / 2, H * 0.32, '', 46, '#fde047').setScrollFactor(0).setDepth(d + 5).setAlpha(0);
    this.updateHud();
  }
  updateHud() {
    const r = Phaser.Math.Clamp(this.hp / this.stats.maxHp, 0, 1);
    this.hpBar.setScale(r, 1).setFillStyle(r < 0.3 ? 0xef4444 : r < 0.6 ? 0xf59e0b : 0x22c55e);
    this.waveText.setText(this.state === 'boss' || this.state === 'won'
      ? `Nivel ${this.level}/${LEVELS_PER_CAMPAIGN} · JEFE`
      : `Nivel ${this.level}/${LEVELS_PER_CAMPAIGN} · Oleada ${this.wave}/${WAVES_PER_LEVEL}`);
    this.coinText.setText(String(this.runCoins));
    this.pupText.setText(String(this.runPupusas));
    if (this.boss && this.boss.active) this.bossBar.setScale(Phaser.Math.Clamp(this.boss.hp / this.boss.maxHp, 0, 1), 1);
  }
  banner(text, color = '#fde047') {
    const b = this.bannerText;
    this.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: b, alpha: 0, delay: 1300, duration: 400 });
  }

  /* ---------- oleadas ---------- */
  buildWave(n) {
    const L = this.level, list = [];
    const add = (type, k) => { for (let i = 0; i < k; i++) list.push(type); };
    add('sicario', 8 + n * 4 + (L - 1) * 3);
    if (n >= 2) add('rapido', 2 + n + L);
    if (n >= 3) add('pesado', n - 1 + Math.floor(L / 2));
    if (n >= 4 || L >= 3) add('tirador', Math.max(1, n - 2 + L));
    return Phaser.Utils.Array.Shuffle(list);
  }
  startWave(n) {
    if (this.state === 'dead') return;
    this.wave = n; this.state = 'wave'; this.queue = this.buildWave(n);
    this.banner(`OLEADA ${n}/${WAVES_PER_LEVEL}`);
    this.updateHud();
    this.spawnTimer = this.time.addEvent({ delay: Math.max(260, 720 - n * 60 - this.level * 20), loop: true, callback: () => {
      if (this.state !== 'wave') return;
      const k = Math.min(this.queue.length, n >= 3 ? 2 : 1);
      for (let i = 0; i < k; i++) { const p = this.spawnPoint(); this.spawnEnemy(this.queue.pop(), p.x, p.y); }
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
    e.nextHit = 0; e.nextShot = this.time.now + 1200 + Math.random() * 1200;
    return e;
  }
  waveCleared() {
    this.state = 'between';
    this.hp = Math.min(this.stats.maxHp, this.hp + this.stats.maxHp * 0.15);
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
      b.isBoss = true; b.kind = 'boss'; b.t = { dmg: 25, coin: 0, color: 0xfacc15 };
      b.hp = b.maxHp = 600 * this.mult * (this.isFinal ? 2.2 : 1);
      b.nextHit = 0; b.nextBurst = this.time.now + 2200; b.nextSummon = this.time.now + 4500;
      this.boss = b; this.bossBox.setVisible(true); this.updateHud();
    });
  }
  updateBoss(time) {
    const b = this.boss, enraged = b.hp < b.maxHp * 0.5;
    const ang = Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y);
    b.rotation = ang;
    this.physics.velocityFromRotation(ang, enraged ? 95 : 60, b.body.velocity);
    if (time > b.nextBurst) {
      const n = enraged ? 18 : 12, off = Math.random() * Math.PI;
      for (let i = 0; i < n; i++) this.fireEnemyBullet(b.x, b.y, off + i * Math.PI * 2 / n, enraged ? 230 : 190);
      b.nextBurst = time + (enraged ? 1500 : 2300);
    }
    if (time > b.nextSummon) {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnEnemy(enraged && i === 0 ? 'pesado' : 'sicario', b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80);
      }
      b.nextSummon = time + 6500;
    }
  }
  bossDefeated(b) {
    this.state = 'won'; this.boss = null; this.bossBox.setVisible(false);
    this.cameras.main.shake(600, 0.01); this.cameras.main.flash(300, 255, 255, 255);
    this.burst(b.x, b.y, 0xfacc15, 40);
    this.enemies.getChildren().slice().forEach(e => { if (e === b) return; this.burst(e.x, e.y, e.t.color, 8); e.destroy(); });
    this.enemyBullets.clear(true, true);
    for (let i = 0; i < 25; i++) this.dropCoin(b.x, b.y, 'coin', 120);
    const pups = this.isFinal ? 5 : 1 + (Math.random() < 0.3 ? 1 : 0);
    for (let i = 0; i < pups; i++) this.dropCoin(b.x, b.y, 'pupusa', 90);
    this.banner(this.isFinal ? '¡CAMPAÑA\nCOMPLETADA!' : '¡JEFE\nDERROTADO!', '#fde047');
    this.time.delayedCall(700, () => this.coins.getChildren().forEach(c => { c.homing = true; }));
    this.time.delayedCall(2600, () => this.showVictory());
  }

  /* ---------- combate ---------- */
  nearestEnemy(range) {
    let best = null, bestD = range * range;
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      const dx = e.x - this.player.x, dy = e.y - this.player.y, d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  fire(ang) {
    const x = this.player.x + Math.cos(ang) * 40, y = this.player.y + Math.sin(ang) * 40;
    const b = this.bullets.create(x, y, 'bullet').setDepth(9);
    b.rotation = ang; b.dmg = this.stats.dmg; b.die = this.time.now + 900;
    this.physics.velocityFromRotation(ang, 640, b.body.velocity);
    const flash = this.add.image(x, y, 'spark').setTint(0xffe066).setScale(2.4).setDepth(12);
    this.tweens.add({ targets: flash, alpha: 0, scale: 0.5, duration: 90, onComplete: () => flash.destroy() });
  }
  fireEnemyBullet(x, y, ang, speed) {
    const b = this.enemyBullets.create(x, y, 'ebullet').setDepth(9);
    b.body.setCircle(6, 1, 1); b.die = this.time.now + 3500;
    this.physics.velocityFromRotation(ang, speed, b.body.velocity);
  }
  hitEnemy(b, e) {
    if (!b.active || !e.active) return;
    b.destroy();
    e.hp -= b.dmg;
    this.burst(b.x, b.y, 0xffe066, 3);
    e.setTintFill(0xffffff);
    this.time.delayedCall(60, () => { if (e.active) e.clearTint(); });
    if (e.isBoss) this.updateHud();
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    this.kills++;
    this.burst(e.x, e.y, e.t.color, e.isBoss ? 30 : 10);
    if (e.isBoss) { this.bossDefeated(e); e.destroy(); return; }
    for (let i = 0; i < e.t.coin; i++) if (Math.random() < 0.8) this.dropCoin(e.x, e.y, 'coin', 0);
    e.destroy();
  }
  touchEnemy(e) {
    const now = this.time.now;
    if (now < e.nextHit) return;
    e.nextHit = now + 700;
    this.damagePlayer(e.t.dmg * (e.isBoss ? 1 : 1 + 0.15 * (this.level - 1)));
  }
  damagePlayer(amount) {
    if (this.state === 'dead' || this.state === 'won') return;
    const now = this.time.now;
    if (now < this.invulnUntil) return;
    this.invulnUntil = now + 250;
    this.hp -= amount;
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

  /* ---------- monedas ---------- */
  dropCoin(x, y, kind, spread) {
    const c = this.add.image(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), kind).setDepth(5).setScale(0);
    c.kind = kind; this.coins.add(c);
    this.tweens.add({ targets: c, scale: 1, duration: 160, ease: 'Back.out' });
    if (spread > 0) {
      const a = Math.random() * Math.PI * 2, d = Phaser.Math.Between(20, spread);
      this.tweens.add({ targets: c, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, duration: 420, ease: 'Cubic.out' });
    }
  }
  collect(c) {
    if (!c.active) return;
    if (c.kind === 'pupusa') { this.runPupusas++; this.popText(this.pupText); }
    else { this.runCoins++; this.popText(this.coinText); }
    c.destroy(); this.updateHud();
  }
  popText(t) { t.setScale(1.35); this.tweens.add({ targets: t, scale: 1, duration: 140 }); }
  updateCoins(delta) {
    const px = this.player.x, py = this.player.y, mag = this.stats.magnet;
    for (const c of this.coins.getChildren().slice()) {
      const d = Phaser.Math.Distance.Between(c.x, c.y, px, py);
      if (d < mag) c.homing = true;
      if (c.homing) {
        c.spd = (c.spd || 220) + delta * 0.9;
        const a = Phaser.Math.Angle.Between(c.x, c.y, px, py), step = c.spd * delta / 1000;
        c.x += Math.cos(a) * step; c.y += Math.sin(a) * step;
      }
      if (d < 26) this.collect(c);
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
    txt(this, W / 2, top + 165, body, 22, '#ffffff', { lineSpacing: 8, strokeThickness: 0 }).setScrollFactor(0).setDepth(d + 2);
    buttons.forEach((b, i) => button(this, W / 2, top + 290 + i * 92, 380, 72, b.label, b.cb,
      { depth: d + 3, color: b.color, size: 24 }));
  }
  showVictory() {
    this.coins.getChildren().slice().forEach(c => this.collect(c));
    this.bank();
    SAVE.level = Math.max(SAVE.level, Math.min(this.level + 1, LEVELS_PER_CAMPAIGN + 1));
    writeSave();
    const body = `+${this.runCoins} ${COIN_NAME}\n+${this.runPupusas} ${PREMIUM_NAME}\n${this.kills} bandidos derribados`;
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
  update(_t, delta) {
    if (this.state === 'dead') return;
    const now = this.time.now;

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

    // torreta automática
    const target = this.state === 'won' ? null : this.nearestEnemy(390);
    if (target) {
      const desired = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
      this.turret.rotation = Phaser.Math.Angle.RotateTo(this.turret.rotation, desired, 0.2);
      if (now > this.fireReady && Math.abs(Phaser.Math.Angle.Wrap(desired - this.turret.rotation)) < 0.3) {
        this.fire(this.turret.rotation);
        this.fireReady = now + this.stats.fireDelay;
      }
    } else {
      this.turret.rotation = Phaser.Math.Angle.RotateTo(this.turret.rotation, this.player.rotation, 0.08);
    }

    // enemigos
    const px = this.player.x, py = this.player.y;
    for (const e of this.enemies.getChildren()) {
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

    if (this.state === 'wave' && this.queue.length === 0 && this.enemies.countActive(true) === 0) this.waveCleared();
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
