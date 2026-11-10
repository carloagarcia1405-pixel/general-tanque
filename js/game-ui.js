'use strict';
/* Interfaz dentro de la partida: marcador, subir de nivel, cofres, pausa y final. */
Object.assign(GameScene.prototype, {

  buildHud() {
    const D = UI_DEPTH + 10, fix = o => o.setScrollFactor(0).setDepth(D);
    fix(this.add.rectangle(W / 2, 13, W, 26, 0x111111));
    this.xpFill = fix(this.add.rectangle(3, 13, W - 6, 18, 0x38bdf8).setOrigin(0, 0.5)).setDepth(D + 1);
    this.lvlT = fix(txt(this, W / 2, 13, 'Nv 1', 16)).setDepth(D + 2);
    this.timeT = fix(txt(this, W / 2, 58, '00:00', 32));
    this.killT = fix(plain(this, 14, 36, 'Bajas 0', 18, '#ffffff', { stroke: '#111111', strokeThickness: 4 }));
    fix(this.add.image(24, 80, 'coin'));
    this.coinT = fix(plain(this, 40, 67, '0', 18, '#fde047', { stroke: '#111111', strokeThickness: 4 }));
    this.pauseBtn = button(this, W - 38, 62, 56, 56, 'II', () => this.openPause(), { size: 24, color: 0xe5e7eb, depth: D + 3 });
    this.bossBox = this.add.container(W / 2, 106).setScrollFactor(0).setDepth(D + 2).setVisible(false);
    this.bossFill = this.add.rectangle(-198, 0, 396, 12, 0xef4444).setOrigin(0, 0.5);
    this.bossName = this.add.text(0, -2, '', { fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#111111', strokeThickness: 4 }).setOrigin(0.5);
    this.bossBox.add([this.add.rectangle(0, 0, 404, 20, 0x111111), this.add.rectangle(0, 0, 396, 12, 0x3f1010), this.bossFill, this.bossName]);
    this.bossBox.setScrollFactor(0, 0, true);
    this.bannerT = fix(txt(this, W / 2, 220, '', 30, '#fde047', { wordWrap: { width: 500 } })).setAlpha(0).setDepth(D + 4);
    this.bannerUntil = 0; this.hudCache = {};
    this.ov = [];
  },
  say(text, color = '#fde047', dur = 1.6) { this.bannerT.setText(text).setColor(color).setAlpha(1); this.bannerUntil = this.now + dur; },
  showBossBar(name) { this.bossName.setText(name.toUpperCase()); this.bossBox.setVisible(true); },
  hideBossBar() { this.bossBox.setVisible(false); },
  drawHud() {
    const c = this.hudCache, set = (k, v, fn) => { if (c[k] !== v) { c[k] = v; fn(v); } };
    this.xpFill.setScale(Math.min(1, this.xp / xpNeed(this.level)), 1);
    set('lvl', this.level, v => this.lvlT.setText('Nv ' + v));
    set('time', this.final ? -1 : Math.floor(this.gt), v => this.timeT.setText(v < 0 ? 'JEFE FINAL' : fmtTime(v) + ' / ' + fmtTime(STAGE_SECONDS)).setFontSize(v < 0 ? 28 : 24));
    set('kills', this.kills, v => this.killT.setText('Bajas ' + v));
    set('coins', this.coinsRun, v => this.coinT.setText(String(v)));
    if (this.boss) this.bossFill.setScale(Math.max(0, this.boss.hp / this.boss.maxHp), 1);
    if (this.bannerT.alpha > 0 && this.now > this.bannerUntil) this.bannerT.setAlpha(Math.max(0, this.bannerT.alpha - 0.05));
  },

  /* ---------------- ventanas ---------------- */
  ui(o, d = 0) { o.setScrollFactor(0, 0, true).setDepth(UI_DEPTH + 100 + d); this.ov.push(o); return o; },
  openOverlay(alpha = 0.72) {
    this.closeOverlay(); this.uiBlocked = true; this.joy.reset();
    this.ui(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, alpha).setInteractive());
  },
  closeOverlay() { this.ov.forEach(o => o.destroy()); this.ov = []; this.cards = null; this.ovKind = null; },
  resume() { this.closeOverlay(); this.uiBlocked = false; this.paused = false; },

  // Qué se puede ofrecer ahora mismo.
  upgradePool(ownedOnly) {
    const A = this.actives, P = this.passives, out = [], primes = [];
    Object.keys(ACTIVES).forEach(id => {
      const l = A[id] || 0;
      if (l >= MAX_SKILL_LVL && !this.primes[id] && P[ACTIVES[id].pair]) primes.push({ type: 'prime', id });
      else if (l > 0 && l < MAX_SKILL_LVL) out.push({ type: 'active', id });
      else if (l === 0 && !ownedOnly && Object.keys(A).length < MAX_ACTIVE_SLOTS) out.push({ type: 'active', id });
    });
    Object.keys(PASSIVES).forEach(id => {
      const l = P[id] || 0;
      if (l > 0 && l < MAX_SKILL_LVL) out.push({ type: 'passive', id });
      else if (l === 0 && !ownedOnly && Object.keys(P).length < MAX_PASSIVE_SLOTS) out.push({ type: 'passive', id });
    });
    return { primes, out };
  },
  rollChoices() {
    const { primes, out } = this.upgradePool(false);
    Phaser.Utils.Array.Shuffle(out);
    const c = primes.concat(out).slice(0, 3);
    if (!c.length) return [{ type: 'heal' }, { type: 'coins' }];
    return c;
  },
  describe(c) {
    if (c.type === 'heal') return { icon: 'ic_pupusa', name: 'Pupusa revuelta', tag: '', desc: 'Recupera 30% de vida', gold: false };
    if (c.type === 'coins') return { icon: 'ic_coin', name: COIN_NAME, tag: '', desc: '+25 ' + COIN_NAME.toLowerCase(), gold: false };
    if (c.type === 'prime') { const a = ACTIVES[c.id]; return { icon: skillIcon(c.id), name: a.prime, tag: 'PRIME', desc: a.primeDesc, gold: true }; }
    if (c.type === 'active') { const a = ACTIVES[c.id], l = this.actives[c.id] || 0; return { icon: skillIcon(c.id), name: a.name, tag: l ? 'Nv ' + (l + 1) : 'NUEVA', desc: a.lv[l], gold: false }; }
    const p = PASSIVES[c.id], l = this.passives[c.id] || 0;
    const pair = ACTIVES[pairOf(c.id)];
    return { icon: skillIcon(c.id), name: p.name, tag: l ? 'Nv ' + (l + 1) : 'NUEVA', desc: p.desc + (l ? '' : `\nPareja de: ${pair.name}`), gold: false };
  },
  applyChoice(c) {
    if (c.type === 'heal') this.p.hp = Math.min(this.p.maxHp, this.p.hp + this.p.maxHp * 0.3);
    else if (c.type === 'coins') this.coinsRun += 25;
    else if (c.type === 'prime') this.primes[c.id] = true;
    else if (c.type === 'active') this.actives[c.id] = (this.actives[c.id] || 0) + 1;
    else this.passives[c.id] = (this.passives[c.id] || 0) + 1;
    this.recalc(); this.syncWeapons();
  },

  openLevelUp() {
    this.openOverlay(); this.ovKind = 'level'; SFX.play('level');
    this.ui(txt(this, W / 2, 150, '¡SUBISTE DE NIVEL!', 36, '#fde047'));
    this.ui(txt(this, W / 2, 196, 'Elegí una mejora', 18, '#e7e5e4'));
    this.cards = this.rollChoices();
    this.cards.forEach((c, i) => this.card(c, 320 + i * 168));
    if (this.rerolls > 0 && this.cards[0].type !== 'heal')
      this.ui(button(this, W / 2, 840, 330, 58, `CAMBIAR OPCIONES (${this.rerolls})`, () => { this.rerolls--; this.openLevelUp(); }, { size: 19, color: 0xe5e7eb }), 5);
  },
  card(c, y) {
    const d = this.describe(c), w = 492, h = 152;
    const box = this.add.container(W / 2, y);
    box.add([this.add.rectangle(0, 0, w, h, 0x111111), this.add.rectangle(0, 0, w - 8, h - 8, d.gold ? 0x7a5200 : 0x2a2018),
      this.add.rectangle(0, -h / 2 + 7, w - 8, 6, d.gold ? 0xfde047 : 0x4a3a2a),
      this.add.rectangle(-w / 2 + 72, 0, 104, 104, d.gold ? 0xfacc15 : 0x3f3226).setStrokeStyle(4, 0x111111),
      fitIcon(this.add.image(-w / 2 + 72, 0, d.icon), 84),
      this.add.text(-w / 2 + 138, -h / 2 + 18, d.name, { fontFamily: FONT, fontSize: '20px', color: d.gold ? '#fde047' : '#ffffff', wordWrap: { width: 250 } }),
      this.add.text(w / 2 - 16, -h / 2 + 20, d.tag, { fontFamily: FONT, fontSize: '16px', color: d.tag === 'NUEVA' ? '#86efac' : '#fde047' }).setOrigin(1, 0),
      this.add.text(-w / 2 + 138, -h / 2 + 72, d.desc, { fontFamily: FONT, fontSize: '14px', color: '#d6d3d1', wordWrap: { width: 332 }, lineSpacing: 3 })]);
    if (c.type === 'active' || c.type === 'passive') {
      const l = (c.type === 'active' ? this.actives[c.id] : this.passives[c.id]) || 0;
      for (let k = 0; k < MAX_SKILL_LVL; k++) box.add(this.add.rectangle(-w / 2 + 146 + k * 20, -h / 2 + 58, 15, 7, k < l ? 0xfacc15 : k === l ? 0x86efac : 0x57493a));
    }
    this.ui(box, 2);
    let pressed = false;
    box.setSize(w, h).setInteractive({ useHandCursor: true });
    box.on('pointerdown', () => { pressed = true; box.setScale(0.97); });
    box.on('pointerout', () => { pressed = false; box.setScale(1); });
    box.on('pointerup', () => { if (!pressed) return; SFX.play('click'); this.choose(c); });
  },
  choose(c) { this.applyChoice(c); this.resume(); },

  openChest() {
    this.openOverlay(); this.ovKind = 'chest'; SFX.play('chest');
    const r = Math.random(), n = r < 0.1 ? 5 : r < 0.4 ? 3 : 1, got = [];
    for (let i = 0; i < n; i++) {
      const { primes, out } = this.upgradePool(true);
      const c = primes.length ? primes[0] : out.length ? pick(out) : { type: 'coins' };
      got.push(this.describe(c)); this.applyChoice(c);
    }
    this.ui(txt(this, W / 2, 170, n >= 5 ? '¡COFRE LEGENDARIO!' : n >= 3 ? '¡COFRE GRANDE!' : '¡COFRE!', 38, '#fde047'));
    fitIcon(this.ui(this.add.image(W / 2, 270, 'ic_chest')), 120);
    got.forEach((d, i) => {
      const y = 380 + i * 78;
      this.ui(this.add.rectangle(W / 2, y, 470, 70, d.gold ? 0x7a5200 : 0x2a2018).setStrokeStyle(4, 0x111111));
      fitIcon(this.ui(this.add.image(80, y, d.icon), 1), 52);
      this.ui(plain(this, 122, y - 24, d.name, 18, d.gold ? '#fde047' : '#ffffff'), 1);
      this.ui(plain(this, 122, y + 2, d.tag || d.desc, 14, '#86efac'), 1);
    });
    this.ui(button(this, W / 2, 850, 300, 70, '¡VA PUES!', () => this.resume(), { size: 26 }), 5);
  },

  openPause() {
    if (this.over || this.uiBlocked) return;
    this.openOverlay(0.8); this.ovKind = 'pause'; this.paused = true;
    this.ui(txt(this, W / 2, 110, 'PAUSA', 44, '#fde047'));
    this.ui(txt(this, W / 2, 158, `${this.st.name} · Nv ${this.level} · ${this.kills} bajas`, 16, '#e7e5e4'));
    const row = (title, ids, lvl, y) => {
      this.ui(plain(this, 36, y - 62, title, 16, '#a8a29e'));
      for (let i = 0; i < 6; i++) {
        const x = 70 + i * 80, id = ids[i];
        this.ui(this.add.rectangle(x, y, 70, 70, 0x2a2018).setStrokeStyle(4, id && this.primes[id] ? 0xfacc15 : 0x111111));
        if (!id) continue;
        fitIcon(this.ui(this.add.image(x, y - 4, skillIcon(id)), 1), 50);
        this.ui(txt(this, x + 20, y + 24, this.primes[id] ? 'P' : String(lvl[id]), 15, this.primes[id] ? '#fde047' : '#ffffff'), 2);
      }
    };
    row('ARMAS', Object.keys(this.actives), this.actives, 260);
    row('APOYOS', Object.keys(this.passives), this.passives, 390);
    this.ui(button(this, W / 2, 540, 360, 76, 'CONTINUAR', () => this.resume(), { size: 28 }), 5);
    this.ui(button(this, W / 2, 635, 360, 60, SAVE.sfx ? 'SONIDO: SÍ' : 'SONIDO: NO', () => { SAVE.sfx = !SAVE.sfx; writeSave(); this.paused = false; this.uiBlocked = false; this.openPause(); }, { size: 20, color: 0xe5e7eb }), 5);
    this.ui(button(this, W / 2, 725, 360, 60, 'SALIR AL MENÚ', () => { this.over = true; this.bank(false); this.scene.start('Menu'); }, { size: 20, color: 0xf87171 }), 5);
  },

  /* ---------------- final de la partida ---------------- */
  finish(win) {
    if (this.over) return;
    this.over = true; this.joy.reset();
    if (!win && this.revives > 0) {
      this.openOverlay(0.78); this.ovKind = 'revive';
      this.ui(txt(this, W / 2, 300, '¡TE BAJARON EL TANQUE!', 34, '#f87171'));
      this.ui(txt(this, W / 2, 360, 'Podés seguir una vez más en esta zona.', 18, '#e7e5e4'));
      this.ui(button(this, W / 2, 470, 380, 80, 'REVIVIR', () => this.revive(), { size: 30, color: 0x84cc16 }), 5);
      this.ui(button(this, W / 2, 570, 380, 60, 'RENDIRSE', () => this.endRun(false), { size: 20, color: 0xe5e7eb }), 5);
      return;
    }
    this.endRun(win);
  },
  revive() {
    this.revives--; this.over = false; this.resume();
    this.p.hp = this.p.maxHp * 0.6; this.p.inv = this.now + 2.5;
    this.cameras.main.flash(250, 255, 240, 200);
    for (const e of this.enemies.slice()) if (!e.big && Math.hypot(e.x - this.p.x, e.y - this.p.y) < 420) this.kill(e);
    for (const b of this.ebullets) this.free(b.spr); this.ebullets.length = 0;
  },
  // Guarda lo ganado. Devuelve lo que se muestra en la pantalla final.
  bank(win) {
    const idx = this.stageIdx, vm = this.vm(), out = { coins: 0, jocotes: this.jocRun, items: [] };
    out.coins = Math.round((this.coinsRun + Math.floor(this.kills / 40) + (win ? 120 * this.st.id : 0)) * this.base.luck);
    if (win) {
      if (!SAVE.cleared[idx]) { SAVE.cleared[idx] = true; out.jocotes += 3; out.first = true; }
      SAVE.stage = Math.max(SAVE.stage, Math.min(STAGES.length, idx + 2));
      out.items.push(rollItem(this.st.id), rollItem(this.st.id));
    } else if (vm >= 5) out.items.push(rollItem(this.st.id));
    SAVE.best[idx] = Math.max(SAVE.best[idx] || 0, Math.floor(vm * 60));
    SAVE.coins += out.coins; SAVE.jocotes += out.jocotes; writeSave();
    return out;
  },
  endRun(win) {
    this.over = true;
    const r = this.bank(win), last = this.stageIdx === STAGES.length - 1;
    this.openOverlay(0.82); this.ovKind = 'end';
    this.ui(txt(this, W / 2, 130, win ? (last ? `¡${ISLAND_NAME.toUpperCase()} ES LIBRE!` : '¡ZONA LIBERADA!') : 'MISIÓN FALLIDA', win && last ? 30 : 40, win ? '#fde047' : '#f87171', { wordWrap: { width: 500 } }));
    this.ui(txt(this, W / 2, 196, win ? `Cayó ${this.st.boss.name}. La gente de ${this.st.name} ya puede salir.` : `Aguantaste ${fmtTime(this.gt)} en ${this.st.name}.`, 17, '#e7e5e4', { wordWrap: { width: 480 } }));
    fitIcon(this.ui(this.add.image(W / 2, 300, win ? 'ic_medal' : 'presi')), 130);
    const line = (y, icon, label, val, color) => {
      this.ui(this.add.rectangle(W / 2, y, 440, 54, 0x2a2018).setStrokeStyle(4, 0x111111));
      fitIcon(this.ui(this.add.image(86, y, icon), 1), 38);
      this.ui(plain(this, 118, y - 13, label, 18, '#e7e5e4'), 1);
      this.ui(plain(this, 470, y - 13, val, 20, color, {}).setOrigin(1, 0), 1);
    };
    line(410, 'e_thug', 'Bandidos fuera de combate', String(this.kills), '#ffffff');
    line(470, 'ic_coin', COIN_NAME, '+' + r.coins, '#fde047');
    if (r.jocotes) line(530, 'ic_jocote', PREMIUM_NAME + (r.first ? ' (primera vez)' : ''), '+' + r.jocotes, '#fca5a5');
    if (r.items.length) {
      this.ui(txt(this, W / 2, 596, 'EQUIPO ENCONTRADO', 16, '#a8a29e'));
      r.items.forEach((it, i) => {
        const x = W / 2 + (i - (r.items.length - 1) / 2) * 110, s = slotOf(it.slot);
        this.ui(this.add.rectangle(x, 660, 92, 92, 0x2a2018).setStrokeStyle(5, RARITY[it.rar].color));
        fitIcon(this.ui(this.add.image(x, 656, s.tex), 1), 64);
        this.ui(txt(this, x, 720, RARITY[it.rar].name, 13, RARITY[it.rar].css), 1);
      });
    }
    const next = win && !last;
    this.ui(button(this, W / 2, 800, 380, 76, next ? 'SIGUIENTE ZONA' : (win ? 'JUGAR OTRA VEZ' : 'REINTENTAR'),
      () => this.scene.start('Game', { stage: this.st.id + (next ? 1 : 0) }), { size: 26 }), 5);
    this.ui(button(this, W / 2, 890, 380, 60, 'MENÚ', () => this.scene.start('Menu'), { size: 22, color: 0xe5e7eb }), 5);
    if (BOT) {
      window.BOTLOG.push(`END win=${win} bossT=${this.finalAt ? Math.round(this.now - this.finalAt) : '-'} minHp=${Math.round((this.minHp ?? 1) * 100)}% revives=${this.revives} t=${fmtTime(this.gt)} lvl=${this.level} kills=${this.kills} coins=${r.coins} items=${r.items.length}`,
        'actives=' + JSON.stringify(this.actives) + ' primes=' + Object.keys(this.primes).join(',') + ' passives=' + JSON.stringify(this.passives));
      window.BOTDONE = true;
    }
  },

  // Con ?bot=1 las ventanas se contestan solas.
  botUi() {
    if (QS.get('hold') === this.ovKind) return;   // pruebas: deja abierta esa ventana
    if (this.ovKind === 'level' && this.cards) {
      const own = c => c.type === 'active' && this.actives[c.id], few = Object.keys(this.actives).length < 4;
      const c = this.cards.find(c => c.type === 'prime') || this.cards.find(own) || (few && this.cards.find(c => c.type === 'active')) || this.cards.find(c => c.type === 'passive') || this.cards[0];
      this.choose(c);
    } else if (this.ovKind === 'chest') this.resume();
    else if (this.ovKind === 'revive') { if (QS.get('bot') === 'norevive') this.endRun(false); else this.revive(); }
  },
});
