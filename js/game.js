'use strict';
/* La partida: tanque, bandidos, armas, objetos y calendario del stage.
   Simulación propia (sin motor de física): todo son objetos con x,y y un sprite reciclado. */

class Joystick {
  constructor(scene) {
    this.scene = scene; this.vec = new Phaser.Math.Vector2(); this.id = null; this.max = 62;
    this.base = scene.add.circle(0, 0, this.max, 0xffffff, 0.12).setStrokeStyle(3, 0xffffff, 0.35)
      .setScrollFactor(0).setDepth(UI_DEPTH).setVisible(false);
    this.knob = scene.add.circle(0, 0, 28, 0xffffff, 0.45).setScrollFactor(0).setDepth(UI_DEPTH + 1).setVisible(false);
    scene.input.on('pointerdown', (p, over) => {
      SFX.unlock();
      if (this.id !== null || scene.uiBlocked || scene.paused || scene.over || over.length > 0) return;
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

const CELL = 64;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) { this.stageIdx = (data.stage || 1) - 1; }

  create() {
    const st = this.st = STAGES[this.stageIdx];
    this.base = computeStats();
    this.now = 0; this.gt = 0; this.kills = 0; this.coinsRun = 0; this.jocRun = 0; this.dmgDone = 0;
    this.level = 1; this.xp = 0; this.pendingLevels = 0; this.rerolls = 1; this.revives = 1;
    this.paused = false; this.uiBlocked = false; this.over = false; this.timerStopped = false;
    this.actives = { canon: 1 }; this.passives = {}; this.primes = {};
    this.enemies = []; this.bigs = []; this.bullets = []; this.ebullets = []; this.gems = []; this.drops = [];
    this.hazards = []; this.rockets = []; this.fx = []; this.queue = []; this.nums = [];
    this.dogs = []; this.soldiers = []; this.yinas = []; this.machetes = []; this.agent = null; this.aura = null;
    this.pool = {}; this.hash = new Map(); this.hashKeys = [];
    this.evIdx = 0; this.spawnAcc = 0; this.hordeUntil = 0; this.final = null; this.boss = null; this.mobCount = 0;
    this.crateAt = evSec(0.25); this.crates = 0; this.propCells = new Map(); this.propAt = 0;
    this.wt = { canon: 0.5, cohetes: 1, cam: 0.5, bloq: 0, form: 0, mach: 0 };

    this.ground = this.add.tileSprite(0, 0, W, H, st.ground).setOrigin(0).setScrollFactor(0).setDepth(-1e6);
    const skin = SKINS.find(s => s.id === SAVE.skin) || SKINS[0];
    this.p = { x: 0, y: 0, r: 24, hp: 1, maxHp: 1, inv: 0, ang: -Math.PI / 2, tur: -Math.PI / 2, hurtAt: 0 };
    this.pShadow = this.add.image(0, 0, 'shadow').setScale(1.7, 1.6);
    this.hull = this.add.image(0, 0, 'tank_hull').setTint(skin.tint);
    this.turret = this.add.image(0, 0, 'tank_turret').setOrigin(0.25, 0.5).setTint(skin.tint);
    this.skinTint = skin.tint;
    this.hpBg = this.add.rectangle(0, 0, 62, 9, 0x111111);
    this.hpFill = this.add.rectangle(0, 0, 58, 5, 0x22c55e).setOrigin(0, 0.5);
    this.maitro = this.add.image(0, 0, 'a_maitro').setVisible(false);
    this.maitroActor = { spr: this.maitro, x: 0, y: 0 };
    this.maitroUntil = 0;

    this.recalc(); this.p.hp = this.p.maxHp;
    this.joy = new Joystick(this);
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') : null;
    this.buildHud();
    this.syncWeapons();
    this.updateProps(true);
    this.say(`${st.name.toUpperCase()}`, '#fde047', 2.2);
    if (BOT) window.BOTLOG = [`stage ${st.id} dur ${STAGE_SECONDS}s speed ${SIM_SPEED}`];
    this.botLogAt = 0;
  }

  /* ---------------- utilidades ---------------- */
  vm() { return this.gt / STAGE_SECONDS * 15; }                 // "minuto virtual" 0..15
  hpMult() { const v = this.vm(); return this.st.hp * (1 + 0.22 * v + 0.012 * v * v * v); }
  dmgMult() { return this.st.dmg * (1 + 0.05 * this.vm()); }
  after(sec, fn) { this.queue.push({ at: this.now + sec, fn }); }
  img(key, x, y) {
    const a = this.pool[key]; let s = a && a.pop();
    if (s) s.setActive(true).setVisible(true).setPosition(x, y).setTexture(key);
    else s = this.add.image(x, y, key);
    s.poolKey = key;
    return s.setScale(1).setAlpha(1).setRotation(0).clearTint().setFlip(false, false).setOrigin(0.5).setBlendMode(0);
  }
  free(s) { if (!s) return; s.setVisible(false).setActive(false); (this.pool[s.poolKey] || (this.pool[s.poolKey] = [])).push(s); }
  recalc() {
    const P = this.passives, b = this.base;
    this.S = {
      dmg: b.dmgMult * (1 + 0.10 * (P.municion || 0)), area: 1 + 0.10 * (P.polvora || 0),
      spd: b.speed * (1 + 0.08 * (P.concentrado || 0)), cd: 1 - 0.07 * (P.silbato || 0),
      proj: 1 + 0.12 * (P.radio || 0), xp: 1 + 0.10 * (P.cafe || 0),
      maxHp: b.maxHp + 20 * (P.atol || 0), regen: 0.35 * (P.atol || 0), crit: 0.05 + 0.08 * (P.piedra || 0), magnet: b.magnet,
    };
    const old = this.p.maxHp; this.p.maxHp = this.S.maxHp;
    if (this.S.maxHp > old) this.p.hp += this.S.maxHp - old;
  }
  wdmg(id) {
    const w = W_STATS[id], l = this.actives[id];
    return w.dmg * (this.primes[id] ? w.pMul : w.mul[l - 1]) * this.S.dmg;
  }
  view() { const c = this.cameras.main; return { x: c.scrollX, y: c.scrollY, r: c.scrollX + W, b: c.scrollY + H }; }

  /* ---------------- bucle ---------------- */
  update(time, delta) {
    if (this.paused || this.uiBlocked || this.over) { if (BOT) this.botUi(); return; }
    const dt = Math.min(delta, 50) / 1000;
    for (let i = 0; i < SIM_SPEED; i++) { this.step(dt); if (this.uiBlocked || this.over) break; }
    this.draw();
  }

  step(dt) {
    this.now += dt;
    if (!this.timerStopped) this.gt += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].at <= this.now) { const q = this.queue[i]; this.queue.splice(i, 1); q.fn(); }
    this.movePlayer(dt);
    this.buildHash();
    this.timeline(dt);
    this.updateEnemies(dt);
    this.updateWeapons(dt);
    this.updateBullets(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    ActorMotion.update(this, dt);
    const p = this.p;
    if (this.S.regen && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + this.S.regen * dt);
    if (this.pendingLevels > 0 && !this.uiBlocked && !this.over) { this.pendingLevels--; this.openLevelUp(); }
    if (BOT && this.now >= this.botLogAt) {
      this.botLogAt = this.now + STAGE_SECONDS / 15;
      window.BOTLOG.push(`t=${fmtTime(this.gt)} vm=${this.vm().toFixed(1)} lvl=${this.level} hp=${Math.round(p.hp)}/${Math.round(p.maxHp)} mobs=${this.enemies.length} kills=${this.kills} dps=${Math.round(this.dmgDone / (STAGE_SECONDS / 15))} gems=${this.gems.length} boss=${this.boss ? Math.round(this.boss.hp) : '-'}`);
      this.dmgDone = 0;
    }
  }

  movePlayer(dt) {
    const p = this.p; let vx = this.joy.vec.x, vy = this.joy.vec.y;
    const k = this.keys;
    if (k) {
      if (k.A.isDown || k.LEFT.isDown) vx = -1; if (k.D.isDown || k.RIGHT.isDown) vx = 1;
      if (k.W.isDown || k.UP.isDown) vy = -1; if (k.S.isDown || k.DOWN.isDown) vy = 1;
    }
    if (BOT) { const b = this.botMove(); vx = b.x; vy = b.y; }
    const len = Math.hypot(vx, vy);
    p.moving = len > 0.12;
    if (p.moving) p.drivePhase = (p.drivePhase || 0) + this.S.spd * Math.min(1, len) * dt / 5;
    if (len > 0.12) {
      const m = Math.min(1, len) / len;
      p.x += vx * m * this.S.spd * dt; p.y += vy * m * this.S.spd * dt;
      p.ang = Phaser.Math.Angle.RotateTo(p.ang, Math.atan2(vy, vx), 7 * dt);
    }
    if (this.final) {
      const f = this.final;
      p.x = Phaser.Math.Clamp(p.x, f.cx - W / 2 + 40, f.cx + W / 2 - 40);
      p.y = Phaser.Math.Clamp(p.y, f.cy + f.top, f.cy + H / 2 - 50);
    }
  }

  buildHash() {
    const h = this.hash;
    if (h.size > 4000) { h.clear(); this.hashKeys.length = 0; }
    for (const k of this.hashKeys) h.get(k).length = 0;
    this.hashKeys.length = 0;
    for (const e of this.enemies) {
      if (e.big) continue;
      const k = (Math.floor(e.x / CELL) + 20000) * 40000 + Math.floor(e.y / CELL) + 20000;
      let a = h.get(k); if (!a) { a = []; h.set(k, a); }
      if (a.length === 0) this.hashKeys.push(k);
      a.push(e); e.cell = a;
    }
  }
  // Llama cb(e) por cada bandido cuyo cuerpo toca el círculo.
  query(x, y, r, cb) {
    const R = r + 36, x0 = Math.floor((x - R) / CELL), x1 = Math.floor((x + R) / CELL), y0 = Math.floor((y - R) / CELL), y1 = Math.floor((y + R) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.hash.get((cx + 20000) * 40000 + cy + 20000);
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const e = a[i]; if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) cb(e);
      }
    }
    for (const e of this.bigs) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy <= rr * rr) cb(e);
    }
  }
  nearest(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /* ---------------- calendario del stage ---------------- */
  timeline(dt) {
    while (this.evIdx < EVENTS.length && this.gt >= evSec(EVENTS[this.evIdx].at)) this.fireEvent(EVENTS[this.evIdx++]);
    if (this.now >= this.crateAt && !this.final) { this.crateAt = this.now + evSec(0.4); this.spawnCrate(); }
    if (this.final) return;
    const vm = this.vm(), horde = this.now < this.hordeUntil;
    // Arranque con más bandidos (más café = más niveles pronto) sin tocar el final del stage.
    const cap = Math.min(280, 70 + vm * 15) * (horde ? 1.3 : 1);
    this.spawnAcc += (2.6 + vm * 0.8 + vm * vm * 0.02) * (horde ? 2.5 : 1) * dt;
    while (this.spawnAcc >= 1) { this.spawnAcc--; if (this.mobCount < cap) { const s = this.edgePoint(); this.spawnMob(this.rollType(), s.x, s.y); } }
  }
  rollType() {
    const vm = this.vm(), opts = this.st.roster.filter(r => vm >= r[1]);
    let t = Math.random() * opts.reduce((s, r) => s + r[2], 0);
    for (const r of opts) { t -= r[2]; if (t <= 0) return r[0]; }
    return opts[0][0];
  }
  edgePoint(extra = 70) {
    const v = this.view(), side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: rnd(v.x - extra, v.r + extra), y: v.y - extra };
    if (side === 1) return { x: rnd(v.x - extra, v.r + extra), y: v.b + extra };
    if (side === 2) return { x: v.x - extra, y: rnd(v.y - extra, v.b + extra) };
    return { x: v.r + extra, y: rnd(v.y - extra, v.b + extra) };
  }
  fireEvent(ev) {
    if (ev.kind === 'elite') {
      const s = this.edgePoint(); this.spawnMob(pick(['thug', 'brute', 'thug']), s.x, s.y, true);
      this.say('¡Viene un cabecilla con cofre!', '#fde047', 1.8);
    } else if (ev.kind === 'horde') {
      this.hordeUntil = this.now + evSec(0.33);
      this.say('¡OLEADA GRANDE!', '#f87171', 2.4); SFX.play('warn');
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; this.spawnMob(this.rollType(), this.p.x + Math.cos(a) * 560, this.p.y + Math.sin(a) * 620); }
    } else if (ev.kind === 'stampede') {
      this.say('¡Los motorizados!', '#f87171', 1.8); SFX.play('warn');
      for (let k = 0; k < 3; k++) this.after(k * 1.6, () => this.bikerLine());
    } else if (ev.kind === 'mini') {
      this.spawnBig(MINIS[this.st.minis[ev.slot]], false, ev.slot);
    } else if (ev.kind === 'boss') this.startFinal();
  }
  bikerLine() {
    if (this.final || this.over) return;
    const v = this.view(), horiz = Math.random() < 0.5, dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < 7; i++) {
      const e = horiz ? this.spawnMob('biker', dir > 0 ? v.x - 60 - i * 26 : v.r + 60 + i * 26, this.p.y + (i - 3) * 70)
        : this.spawnMob('biker', this.p.x + (i - 3) * 62, dir > 0 ? v.y - 60 - i * 26 : v.b + 60 + i * 26);
      e.vx = horiz ? dir * e.spd : 0; e.vy = horiz ? 0 : dir * e.spd;
    }
  }

  /* ---------------- bandidos ---------------- */
  spawnMob(type, x, y, elite = false) {
    const d = ENEMIES[type], spr = this.img(d.tex, x, y);
    const e = { d, ai: d.ai, x, y, r: d.r, hp: d.hp * this.hpMult(), spd: d.spd * rnd(0.9, 1.1), dmg: d.dmg * this.dmgMult(),
      xp: d.xp, cdAt: this.now + rnd(0.8, (d.cd || 2)), hit: {}, kx: 0, ky: 0, flash: 0, spr, ph: Math.random() * 6, half: spr.height / 2 };
    if (elite) {
      e.elite = true; e.hp *= 16; e.r *= 1.45; e.xp = 25; e.dmg *= 1.5; e.tint = 0xffe08a; e.ai = 'melee';
      spr.setScale(1.55).setTint(e.tint); e.half *= 1.55;
    }
    e.maxHp = e.hp; this.enemies.push(e); this.mobCount++;
    return e;
  }
  spawnBig(def, isBoss, slot = 0) {
    const s = this.edgePoint(40), scale = isBoss ? 1 : 1;
    const hp = isBoss ? def.hp : def.hp * this.st.hp * (slot ? 6 : 1);
    const e = { d: def, big: true, boss: isBoss, ai: isBoss ? def.id : def.ai, x: s.x, y: s.y, r: def.r, hp, maxHp: hp, spd: def.spd,
      dmg: def.dmg * (isBoss ? 1 : this.dmgMult()), xp: 25, hit: {}, kx: 0, ky: 0, flash: 0, ph: 0, t1: this.now + 2, t2: this.now + 5, t3: this.now + 8, t4: 0, mode: 'walk', a: 0,
      spr: this.img(def.tex, s.x, s.y).setScale(scale), sh: this.img('shadow', s.x, s.y).setScale(def.r / 22, def.r / 26) };
    e.half = e.spr.height / 2;
    this.enemies.push(e); this.bigs.push(e); this.boss = e;
    this.say(`¡${def.name.toUpperCase()}!`, '#f87171', 2.4); SFX.play('warn');
    this.showBossBar(def.name);
    return e;
  }
  startFinal() {
    const st = this.st, p = this.p;
    this.timerStopped = true; this.finalAt = this.now;
    for (const e of this.enemies) if (!e.big) { this.puff(e.x, e.y, 0xffffff, 3); this.dropGem(e); this.removeEnemy(e); }
    this.enemies = this.enemies.filter(e => !e.dead);
    this.collectAll();
    for (const b of this.ebullets) this.free(b.spr); this.ebullets.length = 0;
    for (const h of this.hazards) { this.free(h.ring); this.free(h.disc); } this.hazards.length = 0;
    this.propCells.forEach(s => this.free(s)); this.propCells.clear();
    const patron = st.boss.id === 'patron';
    this.final = { cx: p.x, cy: p.y, top: patron ? 20 : -H / 2 + 150 };
    if (patron) p.y += 180;
    // Cerca amarilla en el borde de la pantalla: de aquí no sale nadie.
    this.fence = [
      this.add.tileSprite(W / 2, 126, W, 16, 'fence'), this.add.tileSprite(W / 2, H - 8, W, 16, 'fence'),
      this.add.tileSprite(8, H / 2 + 60, H - 120, 16, 'fence').setAngle(90), this.add.tileSprite(W - 8, H / 2 + 60, H - 120, 16, 'fence').setAngle(90),
    ];
    this.fence.forEach(f => f.setScrollFactor(0).setDepth(UI_DEPTH - 5));
    const b = this.spawnBig(st.boss, true);
    b.hp = b.maxHp = st.boss.hp * (QS.has('bosshp') ? parseFloat(QS.get('bosshp')) : 1);
    if (patron) {
      const f = this.final;
      this.mansion = this.add.image(f.cx, f.cy - 392, 'mansion').setOrigin(0.5, 0).setDepth(f.cy - 45);
      b.x = f.cx; b.y = f.cy - 262; b.spr.setScale(0.74).setDepth(f.cy - 44); b.fixed = true; b.half = 0;
      this.free(b.sh); b.sh = null;
      this.say('¡EL PATRÓN DISPARA DESDE SU MANSIÓN!', '#f87171', 3);
    } else { b.x = this.final.cx; b.y = this.final.cy - H / 2 + 60; }
  }

  removeEnemy(e) {
    e.dead = true; this.free(e.spr); this.free(e.sh); this.free(e.aimSpr); e.aimSpr = null;
    if (!e.big) this.mobCount--;
  }
  dropGem(e) {
    if (this.gems.length > 330) { const g = pick(this.gems); g.val += e.xp; if (g.val >= 5 && g.spr.texture.key === 'xp1') g.spr.setTexture('xp5'); return; }
    const tex = e.xp >= 25 ? 'xp25' : e.xp >= 5 ? 'xp5' : 'xp1';
    this.gems.push({ kind: 'xp', val: e.xp, x: e.x, y: e.y, spr: this.img(tex, e.x, e.y).setDepth(-900) });
  }
  kill(e) {
    if (e.dead) return;
    this.kills++;
    ActorMotion.death(this, e);
    if (e.big || e.ai === 'line') this.blastFx(e.x, e.y, e.big ? 90 : 42, 0xffb347);
    this.puff(e.x, e.y, 0xfff1c1, e.big ? 16 : 4);
    this.dropGem(e);
    const luck = this.base.luck;
    if (Math.random() < 0.03 * luck) this.gems.push({ kind: 'coin', val: 1 + Math.floor(this.vm() / 5), x: e.x + 8, y: e.y + 6, spr: this.img('coin', e.x + 8, e.y + 6).setDepth(-899) });
    const r = Math.random();
    if (r < 0.003) this.dropItem('pupusa', e.x, e.y); else if (r < 0.0042) this.dropItem('cobrador', e.x, e.y); else if (r < 0.005) this.dropItem('mortero', e.x, e.y);
    if (e.elite || (e.big && !e.boss)) this.drops.push({ kind: 'chest', x: e.x, y: e.y, spr: this.img('p_chestgold', e.x, e.y).setDepth(e.y) });
    if (e.big && !e.boss) { this.jocRun++; this.coinsRun += 15; }
    const boss = e.boss; if (e === this.boss) { this.boss = null; this.hideBossBar(); }
    this.removeEnemy(e);
    if (e.big) { this.bigs = this.bigs.filter(b => b !== e); SFX.play('boom'); this.cameras.main.shake(250, 0.008); }
    if (boss) this.after(1.2, () => this.finish(true));
  }
  hurt(e, dmg) {
    if (e.dead) return;
    const crit = Math.random() < this.S.crit; if (crit) dmg *= 2;
    e.hp -= dmg; this.dmgDone += dmg;
    if (!e.flash) { if (e.big) e.spr.setTint(0xff9a8a); else e.spr.setTintFill(0xffffff); }
    e.flash = this.now + (e.big ? 0.09 : 0.05);
    this.num(e.x, e.y - e.half, dmg, crit);
    SFX.play('hit');
    if (e.hp <= 0) this.kill(e);
  }
  explode(x, y, r, dmg, color = 0xffb347, sfx = 'boom') {
    r *= this.S.area;
    this.query(x, y, r, e => this.hurt(e, dmg));
    this.blastFx(x, y, r, color); SFX.play(sfx);
  }

  updateEnemies(dt) {
    const p = this.p, now = this.now;
    const bloq = this.actives.bloqueador ? this.auraR : 0, slow = this.primes.bloqueador ? 0.65 : 0.8;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash && now > e.flash) { e.flash = 0; e.spr.clearTint(); if (e.tint) e.spr.setTint(e.tint); }
      let dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (e.big) { this.updateBig(e, dt, dx, dy, d); }
      else {
        let spd = e.spd; if (bloq && d < bloq + e.r) spd *= slow;
        const ux = dx / d, uy = dy / d;
        if (e.ai === 'line') {
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (d > 1100) { this.removeEnemy(e); continue; }
          e.spr.setFlipX(e.vx < 0);
        } else {
          let move = true;
          if (e.ai === 'ranged' || e.ai === 'lob') {
            const R = e.d.range; if (d < R * 0.85) move = false;
            if (d < R && now >= e.cdAt) this.mobShoot(e, dx, dy);
            if (e.aimAt) {
              move = false;
              if (!e.aimSpr) e.aimSpr = this.img('px', e.x, e.y).setTint(0xff3030).setAlpha(0.55).setDepth(-300);
              e.aimSpr.setPosition((e.x + p.x) / 2, (e.y + p.y) / 2).setRotation(Math.atan2(dy, dx)).setScale(d / 4, 0.5);
              if (now >= e.aimAt) { e.aimAt = 0; this.free(e.aimSpr); e.aimSpr = null; ActorMotion.attack(this, e, Math.atan2(dy, dx)); this.fireE(e.x, e.y, Math.atan2(dy, dx), e.d.bspd, e.d.shot * this.dmgMult()); }
            }
          } else if (e.ai === 'boom') {
            if (e.fuse) {
              move = false; e.spr.setTint((Math.floor(now * 14) % 2) ? 0xff5040 : 0xffffff);
              if (now >= e.fuse) { this.blastFx(e.x, e.y, 85, 0xff7a30); SFX.play('boom'); if (d < 85 + p.r) this.damagePlayer(e.d.shot * this.dmgMult()); this.kill(e); continue; }
            } else if (d < 62) e.fuse = now + 0.7;
          }
          if (move) { e.x += ux * spd * dt; e.y += uy * spd * dt; }
          // No se enciman: se empujan con los vecinos de su celda.
          const cell = e.cell;
          if (cell && cell.length > 1) for (let i = 0; i < cell.length; i++) {
            const o = cell[i]; if (o === e || o.dead) continue;
            const ox = e.x - o.x, oy = e.y - o.y, d2 = ox * ox + oy * oy, rr = (e.r + o.r) * 0.85;
            if (d2 < rr * rr && d2 > 0.01) { const od = Math.sqrt(d2), push = (rr - od) / od * 0.25; e.x += ox * push; e.y += oy * push; }
          }
          e.spr.setFlipX(dx < 0);
          // Quedó muy atrás: reaparece adelante, como en Survivor.io.
          if (d > 900 && !this.final) { const s = this.edgePoint(); e.x = s.x; e.y = s.y; }
        }
        if (e.kx || e.ky) { e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.86; e.ky *= 0.86; if (Math.abs(e.kx) + Math.abs(e.ky) < 4) e.kx = e.ky = 0; }
        // Contacto con el tanque
        const touch = e.r + p.r * 0.85;
        if (d < touch) {
          if (e.dmg > 0 && now >= (e.swipeAt || 0)) {
            e.swipeAt = now + 0.65;
            ActorMotion.attack(this, e, Math.atan2(dy, dx), true);
          }
          if (e.dmg > 0 && now >= p.inv) this.damagePlayer(e.dmg);
          if (e.ai !== 'line') { e.x = p.x - (dx / d) * touch; e.y = p.y - (dy / d) * touch; }
        }
        e.spr.setPosition(e.x, e.y + Math.sin(now * 9 + e.ph) * 1.5).setDepth(e.y + e.half);
        e.spr.rotation = Math.sin(now * 7 + e.ph) * 0.07;
      }
    }
    if (this.enemies.length && this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
  }
  mobShoot(e, dx, dy) {
    const d = e.d, ang = Math.atan2(dy, dx);
    e.cdAt = this.now + d.cd * rnd(0.85, 1.15);
    if (e.ai === 'lob') { ActorMotion.attack(this, e, ang, true); this.hazard(this.p.x, this.p.y, 58, 1.0, 2.6, d.shot * this.dmgMult(), 'fire'); return; }
    if (d.aim) { e.aimAt = this.now + d.aim; return; }
    const n = d.burst || 1;
    for (let i = 0; i < n; i++) this.after(i * 0.14, () => { if (!e.dead) { ActorMotion.attack(this, e, ang); this.fireE(e.x, e.y, ang + rnd(-0.06, 0.06), d.bspd, d.shot * this.dmgMult()); } });
  }
  fireE(x, y, ang, speed, dmg, tex = 'ebullet') {
    if (this.ebullets.length > 260) return;
    ActorMotion.muzzle(this, x + Math.cos(ang) * 20, y + Math.sin(ang) * 20, ang, 0.65);
    this.ebullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, die: this.now + 5, spr: this.img(tex, x, y).setDepth(UI_DEPTH - 20) });
  }
  hazard(x, y, r, arm, dur, dmg, kind) {
    const ring = this.img('ring', x, y).setScale(r / 60).setTint(0xff4030).setDepth(-500).setAlpha(0.9);
    const disc = this.img('disc', x, y).setScale(0.01).setTint(kind === 'fire' ? 0xff7a1a : 0xff3020).setAlpha(0.3).setDepth(-501);
    this.hazards.push({ x, y, r, t0: this.now, armAt: this.now + arm, endAt: this.now + arm + dur, dmg, kind, ring, disc, tick: 0 });
  }

  /* Jefes y mini jefes */
  updateBig(e, dt, dx, dy, d) {
    const p = this.p, now = this.now, ux = dx / d, uy = dy / d, ang = Math.atan2(dy, dx);
    const rage = e.boss && e.hp < e.maxHp * 0.5 ? 0.68 : 1;
    const bd = e.dmg * 0.5;
    const fan = (n, spread, speed, a0 = ang) => { ActorMotion.attack(this, e, a0); for (let i = 0; i < n; i++) this.fireE(e.x, e.y, a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), speed, bd); };
    const ring = (n, speed, off = 0) => { ActorMotion.attack(this, e, ang); for (let i = 0; i < n; i++) this.fireE(e.x, e.y, off + i / n * TAU, speed, bd); };
    const summon = (type, n, x = e.x, y = e.y) => { ActorMotion.attack(this, e, ang, true); for (let i = 0; i < n; i++) this.spawnMob(type, x + rnd(-70, 70), y + rnd(-30, 60)); };
    const charge = (cd, speed = 430) => {
      if (e.mode === 'walk' && now >= e.t2) { ActorMotion.attack(this, e, ang, true); e.mode = 'aim'; e.t4 = now + 0.8; e.cx = ux; e.cy = uy; }
      else if (e.mode === 'aim') { e.spr.setTint((Math.floor(now * 12) % 2) ? 0xff6050 : 0xffffff); if (now >= e.t4) { e.mode = 'dash'; e.t4 = now + 0.65; e.cx = ux; e.cy = uy; e.spr.clearTint(); } }
      else if (e.mode === 'dash') { e.x += e.cx * speed * dt; e.y += e.cy * speed * dt; if (now >= e.t4) { e.mode = 'walk'; e.t2 = now + cd * rage; return true; } }
      return false;
    };
    const walk = () => { if (e.mode === 'walk' && d > e.r + 10) { e.x += ux * e.spd * dt; e.y += uy * e.spd * dt; } };

    if (e.ai === 'charge') { walk(); charge(4.5); }
    else if (e.ai === 'chargespray') { walk(); if (charge(5.5, 380)) fan(7, 1.3, 190); if (now >= e.t1 && e.mode === 'walk') { e.t1 = now + 2.4; fan(3, 0.4, 210); } }
    else if (e.ai === 'spray') { walk(); if (now >= e.t1) { e.t1 = now + 3; for (let k = 0; k < 3; k++) this.after(k * 0.22, () => { if (!e.dead) fan(6, 0.9, 200, Math.atan2(p.y - e.y, p.x - e.x)); }); } }
    else if (e.ai === 'rider') {
      e.a = Phaser.Math.Angle.RotateTo(e.a || ang, ang, 1.5 * dt);
      e.x += Math.cos(e.a) * e.spd * dt; e.y += Math.sin(e.a) * e.spd * dt;
      if (now >= e.t1) { e.t1 = now + 3.5; ring(8, 170, e.a); }
    } else if (e.ai === 'tiburon') {
      walk(); charge(6.5, 460);
      if (now >= e.t1 && e.mode === 'walk') { e.t1 = now + 2.6 * rage; fan(3, 0.35, 300); }
      if (now >= e.t3) { e.t3 = now + 11 * rage; summon('runner', 6); if (rage < 1) ring(14, 180); }
    } else if (e.ai === 'gallo') {
      walk();
      if (now >= e.t1) { e.t1 = now + 0.13; const on = (now % 5.5) < 3; if (on) { ActorMotion.attack(this, e, e.a); e.a += 0.33; this.fireE(e.x, e.y, e.a, 185, bd); this.fireE(e.x, e.y, e.a + Math.PI, 185, bd); } }
      if (now >= e.t2) { e.t2 = now + 7 * rage; ring(rage < 1 ? 24 : 18, 160, rnd(0, 1)); }
      if (now >= e.t3) { e.t3 = now + 12 * rage; summon('knives', 5); }
    } else if (e.ai === 'patron') {
      if (now >= e.t1) {
        ActorMotion.attack(this, e, ang, true);
        e.t1 = now + 2.4 * rage;
        const n = rage < 1 ? 4 : 3;
        for (let i = 0; i < n; i++) {
          const tx = i === 0 ? p.x : Phaser.Math.Clamp(p.x + rnd(-170, 170), this.final.cx - 230, this.final.cx + 230);
          const ty = i === 0 ? p.y : Phaser.Math.Clamp(p.y + rnd(-170, 170), this.final.cy + 30, this.final.cy + 420);
          this.hazard(tx, ty, 68, 1.1, 0, e.dmg, 'blast');
          this.rockets.push({ enemy: true, sx: e.x - 60, sy: e.y - 40, tx, ty, t: 0, dur: 1.1, spr: this.img('fireball', e.x, e.y).setDepth(UI_DEPTH - 30) });
        }
      }
      if (now >= e.t2) { e.t2 = now + 3.6 * rage; fan(9, 1.5, 190); }
      if (now >= e.t3) { e.t3 = now + 10 * rage; summon('guard', 4, this.final.cx, this.final.cy - 20); if (rage < 1) ring(16, 150); }
    }
    if (!e.fixed) {
      if (this.final) { e.x = Phaser.Math.Clamp(e.x, this.final.cx - W / 2 + 50, this.final.cx + W / 2 - 50); e.y = Phaser.Math.Clamp(e.y, this.final.cy - H / 2 + 170, this.final.cy + H / 2 - 60); }
      const touch = e.r + p.r * 0.8;
      if (d < touch && now >= (e.swipeAt || 0)) { e.swipeAt = now + 0.7; ActorMotion.attack(this, e, ang, true); }
      if (d < touch && now >= p.inv) this.damagePlayer(e.dmg);
      e.spr.setFlipX(e.boss ? false : dx < 0);
      e.spr.setPosition(e.x, e.y + Math.sin(now * 5) * 2).setDepth(e.y + e.half);
      if (e.sh) e.sh.setPosition(e.x, e.y + e.half - 6).setDepth(e.y + e.half - 1);
    } else e.spr.setPosition(e.x, e.y + Math.sin(now * 3) * 2);
  }

  damagePlayer(dmg, isBullet = false) {
    const p = this.p;
    if (this.over || GOD) return;
    if (isBullet && this.actives.bloqueador) dmg *= 1 - W_STATS.bloqueador.cut[this.actives.bloqueador - 1];
    p.hp -= dmg; this.minHp = Math.min(this.minHp ?? 1, p.hp / p.maxHp); p.inv = this.now + 0.5; p.hurtAt = this.now + 0.12;
    this.hull.setTintFill(0xff5a4a); this.turret.setTintFill(0xff5a4a);
    SFX.play('hurt'); this.cameras.main.shake(90, 0.005);
    if (p.hp <= 0) { p.hp = 0; this.finish(false); }
  }

  /* ---------------- armas ---------------- */
  // Crea o quita aliados y sprites para que coincidan con los niveles actuales.
  syncWeapons() {
    const A = this.actives, P = this.primes;
    const fit = (arr, n, make) => { while (arr.length < n) arr.push(make(arr.length)); while (arr.length > n) { const o = arr.pop(); this.free(o.spr); } };
    fit(this.dogs, A.kaisers ? (P.kaisers ? 6 : W_STATS.kaisers.n[A.kaisers - 1]) : 0,
      i => ({ x: this.p.x, y: this.p.y, mode: 'idle', cd: 0, target: null, slot: i, spr: this.img('a_dog', this.p.x, this.p.y) }));
    fit(this.soldiers, A.fuerzas ? 3 : 0, i => ({ x: this.p.x, y: this.p.y, cd: this.now + 0.4 * i, spr: this.img('a_soldier', this.p.x, this.p.y) }));
    fit(this.yinas, A.yina ? (P.yina ? 4 : W_STATS.yina.n[A.yina - 1]) : 0, i => {
      const a = rnd(0, TAU); return { x: this.p.x, y: this.p.y, vx: Math.cos(a), vy: Math.sin(a), spr: this.img('w_yina', this.p.x, this.p.y) };
    });
    fit(this.machetes, A.machete ? (P.machete ? 6 : W_STATS.machete.n[A.machete - 1]) : 0, () => ({ spr: this.img('w_machete', this.p.x, this.p.y) }));
    if (A.cam && !this.agent) this.agent = { x: this.p.x - 40, y: this.p.y + 30, spr: this.img('a_cam', this.p.x, this.p.y) };
    if (A.bloqueador) {
      if (!this.aura) this.aura = this.img('disc', this.p.x, this.p.y).setTint(0xffe066).setAlpha(0.2).setDepth(-400);
      this.auraR = (P.bloqueador ? 150 : W_STATS.bloqueador.r[A.bloqueador - 1]) * this.S.area;
    }
    if (P.canon) this.turret.setTint(0xffb070);
  }
  shoot(x, y, ang, o) {
    ActorMotion.muzzle(this, x + Math.cos(ang) * 10, y + Math.sin(ang) * 10, ang, o.tex === 'w_shell' || o.tex === 'fireball' ? 1.15 : 0.6);
    const sp = (o.speed || 520) * this.S.proj;
    const spr = this.img(o.tex || 'bullet', x, y).setRotation(ang).setScale(o.scale || 1).setDepth(UI_DEPTH - 40);
    if (o.tint) spr.setTint(o.tint);
    this.bullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: o.dmg, r: o.r || 7, pierce: o.pierce || 0, aoe: o.aoe || 0, sfx: o.sfx, boomEnd: !!o.boomEnd, die: this.now + (o.life || 1), spr, seen: null });
  }

  updateWeapons(dt) {
    const p = this.p, now = this.now, A = this.actives, P = this.primes, S = this.S, wt = this.wt;

    // Cañón
    const tgt = this.nearest(p.x, p.y, 470);
    if (tgt) p.tur = Phaser.Math.Angle.RotateTo(p.tur, Math.atan2(tgt.y - p.y, tgt.x - p.x), 12 * dt);
    if (now >= wt.canon && tgt) {
      const w = W_STATS.canon, l = A.canon, shots = P.canon ? 3 : w.shots[l - 1];
      wt.canon = now + w.cd * w.cdMul[l - 1] * S.cd;
      // El obús nunca atraviesa: revienta al primer bandido que toca o al llegar a donde apuntó.
      for (let i = 0; i < shots; i++) this.after(i * 0.11, () => {
        const a = this.p.tur, mx = this.p.x + Math.cos(a) * 58, my = this.p.y + Math.sin(a) * 58;
        const t = tgt.dead ? this.nearest(this.p.x, this.p.y, 470) || tgt : tgt;
        const dist = Math.max(30, Math.hypot(t.x - mx, t.y - my));
        this.p.shotAt = this.now;
        if (P.canon) this.shoot(mx, my, a, { dmg: this.wdmg('canon'), tex: 'fireball', scale: 0.6, aoe: w.pAoe, r: 10, speed: 480, life: dist / (480 * this.S.proj), boomEnd: true });
        else this.shoot(mx, my, a, { dmg: this.wdmg('canon'), tex: 'w_shell', speed: 560, aoe: w.aoe[l - 1], r: 9, sfx: 'hit', life: dist / (560 * this.S.proj), boomEnd: true });
        SFX.play('shot');
      });
    }

    // Cohetes de vara: el maitro bombardea bandidos al azar
    if (A.cohetes && now >= wt.cohetes) {
      const w = W_STATS.cohetes, n = P.cohetes ? 10 : w.n[A.cohetes - 1];
      const near = this.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < W / 2 + 20 && Math.abs(e.y - p.y) < H / 2 + 20);
      if (!near.length) wt.cohetes = now + 0.5;
      else {
        wt.cohetes = now + (P.cohetes ? 3.4 : w.cd) * S.cd;
        this.maitroUntil = now + 1.1;
        for (let i = 0; i < n; i++) this.after(i * 0.09, () => {
          const t = pick(near), tx = t.dead ? t.x + rnd(-30, 30) : t.x, ty = t.y;
          ActorMotion.attack(this, this.maitroActor, Math.atan2(ty - this.p.y, tx - this.p.x), true);
          this.rockets.push({ sx: this.p.x - 44, sy: this.p.y - 20, tx, ty, t: 0, dur: 0.75, dmg: this.wdmg('cohetes'), aoe: P.cohetes ? 82 : w.aoe, spr: this.img('w_rocket', this.p.x, this.p.y).setDepth(UI_DEPTH - 30) });
        });
      }
    }
    this.maitro.setVisible(now < this.maitroUntil);
    if (this.maitro.visible) this.maitro.setPosition(p.x - 52, p.y - 6).setDepth(p.y + 20);

    // Agente del KAM
    if (this.agent) {
      const g = this.agent, w = W_STATS.cam, l = A.cam;
      g.x += (p.x - 46 - g.x) * Math.min(1, 6 * dt); g.y += (p.y + 36 - g.y) * Math.min(1, 6 * dt);
      const t = this.nearest(g.x, g.y, 380);
      if (t) g.spr.setFlipX(t.x < g.x);
      if (t && now >= wt.cam) {
        ActorMotion.attack(this, g, Math.atan2(t.y - g.y, t.x - g.x));
        wt.cam = now + (P.cam ? 0.55 : w.cd[l - 1]) * S.cd;
        const a = Math.atan2(t.y - g.y, t.x - g.x), dmg = this.wdmg('cam');
        if (P.cam) for (let i = 0; i < 5; i++) this.shoot(g.x, g.y, a + (i - 2) * 0.14, { dmg, pierce: 3, tint: 0x9fd0ff, life: 0.7 });
        else for (let i = 0; i < w.shots[l - 1]; i++) this.shoot(g.x, g.y, a + (i ? 0.1 : 0), { dmg, tint: 0x9fd0ff });
      }
      g.spr.setPosition(g.x, g.y + Math.sin(now * 9) * 1.5).setDepth(g.y + 27);
    }

    // Fuerzas especiales: 3 soldados alrededor del tanque
    if (this.soldiers.length) {
      const w = W_STATS.fuerzas, l = A.fuerzas; wt.form += dt * 0.5;
      this.soldiers.forEach((s, i) => {
        const a = wt.form + i * TAU / 3;
        s.x += (p.x + Math.cos(a) * 68 - s.x) * Math.min(1, 7 * dt); s.y += (p.y + Math.sin(a) * 62 - s.y) * Math.min(1, 7 * dt);
        const t = this.nearest(s.x + Math.cos(a) * 120, s.y + Math.sin(a) * 120, 400);
        if (t) s.spr.setFlipX(t.x < s.x);
        if (t && now >= s.cd) {
          s.cd = now + (P.fuerzas ? 1.1 : w.cd) * S.cd;
          const burst = P.fuerzas ? 6 : w.burst[l - 1], dmg = this.wdmg('fuerzas');
          for (let j = 0; j < burst; j++) this.after(j * 0.08, () => {
            if (t.dead && !this.nearest(s.x, s.y, 400)) return;
            const tt = t.dead ? this.nearest(s.x, s.y, 400) : t, an = Math.atan2(tt.y - s.y, tt.x - s.x) + rnd(-0.05, 0.05);
            ActorMotion.attack(this, s, an);
            this.shoot(s.x, s.y, an, P.fuerzas ? { dmg, pierce: 2, aoe: 30, tint: 0xff9a4a } : { dmg, tint: 0xc8ff8a });
          });
        }
        s.spr.setPosition(s.x, s.y + Math.sin(now * 9 + i) * 1.5).setDepth(s.y + 26);
      });
    }

    // Káisers: chuchos que embisten a quien se acerque al tanque
    if (this.dogs.length) {
      const dmg = this.wdmg('kaisers'), sp = (P.kaisers ? 470 : 360) * S.proj, n = this.dogs.length;
      this.dogs.forEach((g, i) => {
        if (g.mode === 'idle') {
          const a = now * 1.2 + i * TAU / n, hx = p.x + Math.cos(a) * 58, hy = p.y + Math.sin(a) * 52;
          const dx = hx - g.x, dy = hy - g.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(d, sp * dt);
          g.x += dx / d * mv; g.y += dy / d * mv; g.spr.setFlipX(dx < 0);
          if (now >= g.cd) { const t = this.nearest(p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90, 230); if (t) { g.target = t; g.mode = 'atk'; } }
        } else {
          const t = g.target;
          if (!t || t.dead || Math.hypot(t.x - p.x, t.y - p.y) > 330) { g.mode = 'idle'; g.target = null; }
          else {
            const dx = t.x - g.x, dy = t.y - g.y, d = Math.hypot(dx, dy) || 1; g.spr.setFlipX(dx < 0);
            if (d < t.r + 14) {
              ActorMotion.attack(this, g, Math.atan2(dy, dx), true);
              if (P.kaisers) this.explode(t.x, t.y, 52, dmg, 0xfff0b0); else { this.hurt(t, dmg); if (!t.big && !t.dead) { t.kx = dx / d * 240; t.ky = dy / d * 240; } }
              g.mode = 'idle'; g.target = null; g.cd = now + (P.kaisers ? 0.25 : 0.5) * S.cd;
            } else { g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; }
          }
        }
        g.spr.setPosition(g.x, g.y + Math.abs(Math.sin(now * 14 + i)) * -3).setDepth(g.y + 18);
      });
    }

    // Yina: rebota por toda la pantalla
    if (this.yinas.length) {
      const v = this.view(), w = W_STATS.yina, big = P.yina ? 1.8 : 1, sp = (P.yina ? 430 : w.speed) * S.proj, dmg = this.wdmg('yina'), rad = 22 * big * S.area;
      for (const y of this.yinas) {
        y.x += y.vx * sp * dt; y.y += y.vy * sp * dt;
        if (y.x < v.x + 20) { y.x = v.x + 20; y.vx = Math.abs(y.vx); } else if (y.x > v.r - 20) { y.x = v.r - 20; y.vx = -Math.abs(y.vx); }
        if (y.y < v.y + 130) { y.y = v.y + 130; y.vy = Math.abs(y.vy); } else if (y.y > v.b - 20) { y.y = v.b - 20; y.vy = -Math.abs(y.vy); }
        this.query(y.x, y.y, rad, e => { if (!(e.hit.y > now)) { e.hit.y = now + 0.35; this.hurt(e, dmg); } });
        y.spr.setPosition(y.x, y.y).setScale(big).setDepth(UI_DEPTH - 35); y.spr.rotation += 14 * dt;
      }
    }

    // Bloqueador: brillo que quema y frena
    if (this.aura) {
      const R = this.auraR;
      this.aura.setPosition(p.x, p.y).setScale(R / 64 * (1 + Math.sin(now * 4) * 0.03));
      if (now >= wt.bloq) { wt.bloq = now + 0.5; const dmg = this.wdmg('bloqueador'); this.query(p.x, p.y, R, e => this.hurt(e, dmg)); }
    }

    // Machete oxidado: gira alrededor del tanque (el Corvo Dorado nunca descansa)
    if (this.machetes.length) {
      const n = this.machetes.length, on = P.machete || (now % 6.5) < 4.2, R = (P.machete ? 112 : 96) * S.area, dmg = this.wdmg('machete');
      wt.mach += dt * (P.machete ? 4.4 : 3.6);
      this.machetes.forEach((m, i) => {
        const a = wt.mach + i * TAU / n, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
        m.spr.setVisible(on).setPosition(x, y).setRotation(a + 1.2).setDepth(UI_DEPTH - 36);
        if (P.machete) m.spr.setTint(0xffd75a);
        if (on) this.query(x, y, 24, e => { if (!(e.hit.m > now)) { e.hit.m = now + 0.4; this.hurt(e, dmg); if (!e.big && !e.dead) { e.kx = Math.cos(a) * 160; e.ky = Math.sin(a) * 160; } } });
      });
    }
  }

  updateBullets(dt) {
    const now = this.now, p = this.p;
    // Balas propias
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.spr.setPosition(b.x, b.y);
      let gone = now >= b.die, hitOne = null;
      if (!gone) this.query(b.x, b.y, b.r, e => { if (!hitOne && !(b.seen && b.seen.includes(e))) hitOne = e; });
      if (hitOne) {
        if (b.aoe) this.explode(b.x, b.y, b.aoe, b.dmg, undefined, b.sfx); else this.hurt(hitOne, b.dmg);
        if (b.pierce > 0) { b.pierce--; (b.seen || (b.seen = [])).push(hitOne); } else gone = true;
      } else if (gone && b.boomEnd) this.explode(b.x, b.y, b.aoe, b.dmg, undefined, b.sfx);
      if (gone) { this.free(b.spr); this.bullets.splice(i, 1); }
    }
    // Cohetes (propios y del patrón): vuelan en arco y revientan al caer
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i]; r.t += dt / r.dur;
      const t = Math.min(1, r.t), x = r.sx + (r.tx - r.sx) * t, y = r.sy + (r.ty - r.sy) * t - Math.sin(Math.PI * t) * 130;
      r.spr.setRotation(Math.atan2(y - r.spr.y, x - r.spr.x)).setPosition(x, y);
      if (t >= 1) { if (!r.enemy) this.explode(r.tx, r.ty, r.aoe, r.dmg, 0xff8040); this.free(r.spr); this.rockets.splice(i, 1); }
    }
    // Balas enemigas
    const kill = this.primes.bloqueador ? this.auraR : 0;
    for (let i = this.ebullets.length - 1; i >= 0; i--) {
      const b = this.ebullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.spr.setPosition(b.x, b.y);
      const dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy;
      let gone = now >= b.die;
      if (kill && d2 < kill * kill) { gone = true; this.puff(b.x, b.y, 0xffe066, 2); }
      else if (d2 < (p.r * 0.8) * (p.r * 0.8)) { gone = true; if (now >= p.inv - 0.25) this.damagePlayer(b.dmg, true); }
      if (gone) { this.free(b.spr); this.ebullets.splice(i, 1); }
    }
    // Chispas y números
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i], t = (now - f.t0) / f.dur;
      if (t >= 1) { this.free(f.spr); this.fx.splice(i, 1); continue; }
      if (ActorMotion.updateFx(f, t, dt)) continue;
      if (f.blast) f.spr.setScale(f.s0 + (f.s1 - f.s0) * t).setAlpha(0.55 * (1 - t));
      else { f.spr.x += f.vx * dt; f.spr.y += f.vy * dt; f.spr.setAlpha(1 - t); }
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i], t = (now - n.t0) / 0.55;
      if (t >= 1) { n.txt.setVisible(false); (this.numPool || (this.numPool = [])).push(n.txt); this.nums.splice(i, 1); }
      else n.txt.setPosition(n.x, n.y - t * 26).setAlpha(1 - t * t);
    }
  }
  puff(x, y, color, n) {
    n = Math.min(n, Math.max(0, 220 - this.fx.length));
    for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(40, 130); this.fx.push({ spr: this.img('px', x, y).setTint(color).setDepth(UI_DEPTH - 45), vx: Math.cos(a) * s, vy: Math.sin(a) * s, t0: this.now, dur: rnd(0.25, 0.5) }); }
  }
  blastFx(x, y, r, color) {
    if (this.fx.length > 205) return;
    this.fx.push({ kind: 'shock', spr: this.img('ring', x, y).setTint(color).setDepth(UI_DEPTH - 47), s0: r / 64 * 0.15, s1: r / 64 * 1.18, t0: this.now, dur: 0.4 });
    this.fx.push({ blast: true, spr: this.img('disc', x, y).setTint(0xfff1bd).setDepth(UI_DEPTH - 44), s0: r / 64 * 0.12, s1: r / 64 * 0.5, t0: this.now, dur: 0.12 });
    for (let i = 0; i < 3; i++) this.fx.push({ kind: 'smoke', spr: this.img('disc', x + rnd(-r * 0.2, r * 0.2), y + rnd(-r * 0.2, r * 0.2)).setTint(0x544638).setDepth(UI_DEPTH - 48), s0: r / 64 * 0.1, s1: r / 64 * 0.45, t0: this.now, dur: 0.55 + i * 0.08 });
    this.fx.push({ blast: true, spr: this.img('disc', x, y).setTint(color).setDepth(UI_DEPTH - 46).setScale(0.1), s0: r / 64 * 0.3, s1: r / 64, t0: this.now, dur: 0.28 });
    this.puff(x, y, 0xfff0a0, 5);
  }
  num(x, y, dmg, crit) {
    if (this.nums.length >= 26 || (this.numAt > this.now && !crit)) return;
    this.numAt = this.now + 0.035;
    let t = this.numPool && this.numPool.pop();
    if (!t) t = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#111111', strokeThickness: 4 }).setOrigin(0.5).setDepth(UI_DEPTH - 10);
    t.setText(String(Math.max(1, Math.round(dmg)))).setColor(crit ? '#fde047' : '#ffffff').setScale(crit ? 1.35 : 1).setVisible(true).setAlpha(1);
    this.nums.push({ txt: t, x: x + rnd(-8, 8), y, t0: this.now });
  }

  updateHazards(dt) {
    const now = this.now, p = this.p;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i], armed = now >= h.armAt, inside = Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.5;
      if (!armed) { const t = (now - h.t0) / (h.armAt - h.t0); h.disc.setScale(h.r / 64 * t); continue; }
      if (h.kind === 'blast') {
        this.blastFx(h.x, h.y, h.r, 0xff5030); SFX.play('boom'); if (inside) this.damagePlayer(h.dmg);
        this.free(h.ring); this.free(h.disc); this.hazards.splice(i, 1); continue;
      }
      h.ring.setAlpha(0.5); h.disc.setScale(h.r / 64).setAlpha(0.32 + Math.sin(now * 16) * 0.08);
      if (inside && now >= h.tick) { h.tick = now + 0.5; this.damagePlayer(h.dmg); }
      if (Math.random() < 0.3) this.puff(h.x + rnd(-h.r, h.r) * 0.6, h.y + rnd(-h.r, h.r) * 0.6, 0xffb030, 1);
      if (now >= h.endAt) { this.free(h.ring); this.free(h.disc); this.hazards.splice(i, 1); }
    }
  }

  /* ---------------- objetos del mapa ---------------- */
  spawnCrate() {
    if (this.crates >= 5) return;
    const a = rnd(0, TAU), d = rnd(360, 560), x = this.p.x + Math.cos(a) * d, y = this.p.y + Math.sin(a) * d;
    this.drops.push({ kind: 'crate', x, y, spr: this.img('p_crate', x, y).setDepth(y + 20) }); this.crates++;
  }
  dropItem(kind, x, y) { this.drops.push({ kind, x, y, spr: this.img(ITEMS[kind].tex, x, y).setDepth(y + 10) }); }
  collectAll() { for (const g of this.gems) g.pull = 2; }
  updatePickups(dt) {
    const p = this.p, now = this.now, mag = this.S.magnet;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (!g.pull && d < mag) g.pull = 1;
      if (g.pull) {
        const sp = (g.pull === 2 ? 900 : 430) * dt;
        if (d < 22 + sp) {
          if (g.kind === 'xp') this.gainXp(g.val); else this.coinsRun += g.val;
          SFX.play('pick'); this.free(g.spr); this.gems.splice(i, 1); continue;
        }
        g.x += dx / d * sp; g.y += dy / d * sp; g.spr.setPosition(g.x, g.y);
      }
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const o = this.drops[i], d = Math.hypot(p.x - o.x, p.y - o.y);
      if (o.kind !== 'chest' && d > 1500) { if (o.kind === 'crate') this.crates--; this.free(o.spr); this.drops.splice(i, 1); continue; }
      if (o.kind !== 'crate') o.spr.y = o.y + Math.sin(now * 4 + o.x) * 3;
      if (d > p.r + 22) continue;
      this.free(o.spr); this.drops.splice(i, 1);
      if (o.kind === 'crate') {
        this.crates--; this.puff(o.x, o.y, 0xb07a3a, 8); SFX.play('hit');
        const r = Math.random();
        if (r < 0.42) this.dropItem('pupusa', o.x, o.y + 4); else if (r < 0.68) this.dropItem('cobrador', o.x, o.y + 4); else if (r < 0.84) this.dropItem('mortero', o.x, o.y + 4);
        else for (let k = 0; k < 5; k++) this.gems.push({ kind: 'coin', val: 2, x: o.x + rnd(-24, 24), y: o.y + rnd(-24, 24), spr: this.img('coin', o.x, o.y).setDepth(-899) });
      } else if (o.kind === 'chest') { this.openChest(); }
      else if (o.kind === 'pupusa') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); this.say('+30% de vida', '#86efac', 1); SFX.play('level'); }
      else if (o.kind === 'cobrador') { this.collectAll(); this.say('¡Pasaje, pasaje! Todo recogido', '#fde047', 1.4); SFX.play('level'); }
      else if (o.kind === 'mortero') {
        this.say('¡MORTERO NÚMERO 5!', '#fb923c', 1.4); this.cameras.main.flash(250, 255, 240, 200); this.cameras.main.shake(300, 0.012); SFX.play('boom');
        const v = this.view();
        for (const e of this.enemies.slice()) {
          if (e.dead || e.x < v.x - 40 || e.x > v.r + 40 || e.y < v.y - 40 || e.y > v.b + 40) continue;
          if (e.big) this.hurt(e, e.maxHp * (e.boss ? 0.04 : 0.15)); else this.kill(e);
        }
      }
    }
  }
  gainXp(v) {
    this.xp += v * this.S.xp;
    while (this.xp >= xpNeed(this.level)) { this.xp -= xpNeed(this.level); this.level++; this.pendingLevels++; }
  }

  /* ---------------- escenografía: celdas que aparecen según por dónde vas ---------------- */
  updateProps(force) {
    if (this.final || (!force && this.now < this.propAt)) return;
    this.propAt = this.now + 0.3;
    const SZ = 300, v = this.view(), x0 = Math.floor((v.x - 200) / SZ), x1 = Math.floor((v.r + 200) / SZ), y0 = Math.floor((v.y - 200) / SZ), y1 = Math.floor((v.b + 260) / SZ);
    this.propCells.forEach((s, k) => { if (s.cx < x0 - 1 || s.cx > x1 + 1 || s.cy < y0 - 1 || s.cy > y1 + 1) { this.free(s); this.propCells.delete(k); } });
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const k = cx + ':' + cy; if (this.propCells.has(k)) continue;
      let h = (cx * 73856093) ^ (cy * 19349663) ^ (this.st.id * 83492791); h = (h ^ (h >>> 13)) * 1274126177; h = (h ^ (h >>> 16)) >>> 0;
      if (h % 100 >= 46 || (Math.abs(cx) < 1 && Math.abs(cy) < 1)) continue;
      const key = this.st.props[(h >>> 8) % this.st.props.length];
      const x = cx * SZ + 40 + ((h >>> 12) % 220), y = cy * SZ + 60 + ((h >>> 20) % 220);
      const s = this.img(key, x, y).setOrigin(0.5, 1).setDepth(y - 6).setFlipX(((h >>> 5) & 1) === 1);
      s.cx = cx; s.cy = cy; this.propCells.set(k, s);
    }
  }

  /* ---------------- dibujo de cada cuadro ---------------- */
  draw() {
    const p = this.p, cam = this.cameras.main, now = this.now;
    if (this.final) cam.setScroll(Math.round(this.final.cx - W / 2), Math.round(this.final.cy - H / 2));
    else cam.setScroll(Math.round(p.x - W / 2), Math.round(p.y - H / 2 - 20));
    this.ground.tilePositionX = cam.scrollX; this.ground.tilePositionY = cam.scrollY;
    if (p.hurtAt && now > p.hurtAt) { p.hurtAt = 0; this.hull.setTint(this.skinTint); this.turret.setTint(this.primes.canon ? 0xffb070 : this.skinTint); }
    this.pShadow.setPosition(p.x, p.y + 6).setDepth(p.y - 2);
    const rumble = p.moving ? Math.sin(p.drivePhase || 0) * 0.65 : 0;
    const shotAge = now - (p.shotAt ?? -10);
    const recoil = shotAge >= 0 && shotAge < 0.18 ? Math.sin(shotAge / 0.18 * Math.PI) * 5 : 0;
    this.hull.setPosition(p.x, p.y + rumble).setRotation(p.ang + (p.moving ? Math.sin((p.drivePhase || 0) * 0.7) * 0.008 : 0)).setDepth(p.y);
    this.turret.setPosition(p.x - Math.cos(p.tur) * recoil, p.y + rumble - Math.sin(p.tur) * recoil).setRotation(p.tur).setDepth(p.y + 1);
    this.hpBg.setPosition(p.x, p.y + 48).setDepth(p.y + 60);
    const f = Math.max(0, p.hp / p.maxHp);
    this.hpFill.setPosition(p.x - 29, p.y + 48).setDepth(p.y + 61).setScale(f, 1).setFillStyle(f > 0.5 ? 0x22c55e : f > 0.25 ? 0xfacc15 : 0xef4444);
    this.updateProps(false);
    this.drawHud();
  }

  /* ---------------- piloto automático para pruebas (?bot=1) ---------------- */
  botMove() {
    const p = this.p; let x = 0, y = 0;
    for (const e of this.enemies) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy; if (d2 < 150 * 150 && d2 > 1) { const k = (e.big ? 5 : 1) / d2; x += dx * k * 60; y += dy * k * 60; } }
    for (const b of this.ebullets) { const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy; if (d2 < 110 * 110 && d2 > 1) { x += dx / d2 * 50; y += dy / d2 * 50; } }
    for (const h of this.hazards) { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < h.r + 50) { x += dx / d * 4; y += dy / d * 4; } }
    let best = null, bd = 420 * 420;
    for (const o of this.drops) { const d2 = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d2 < bd) { bd = d2; best = o; } }
    if (!best) { bd = 320 * 320; for (let i = 0; i < this.gems.length; i++) { const o = this.gems[i], d2 = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d2 < bd) { bd = d2; best = o; } } }
    if (best) { const d = Math.sqrt(bd) || 1; x += (best.x - p.x) / d * 1.1; y += (best.y - p.y) / d * 1.1; }
    if (this.final) { x += (this.final.cx - p.x) / 300; y += (this.final.cy + 200 - p.y) / 300; }
    else { x += Math.cos(this.now * 0.25) * 0.25; y += Math.sin(this.now * 0.25) * 0.25; }
    const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l };
  }
}
