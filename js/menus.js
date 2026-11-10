'use strict';
/* Pantallas fuera de la partida: carga, batalla (elegir zona), historia, equipo y taller. */

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0906);
    txt(this, W / 2, H / 2 - 60, GAME_TITLE, 36, '#fde047');
    this.add.rectangle(W / 2, H / 2, 324, 28, 0x111111).setStrokeStyle(4, 0x4a3a2a);
    const bar = this.add.rectangle(W / 2 - 158, H / 2, 316, 20, 0xf59e0b).setOrigin(0, 0.5).setScale(0, 1);
    this.load.on('progress', v => bar.setScale(v, 1));
    Object.keys(ART).forEach(k => this.load.image(k, `assets/img/${k}.png?v=${VERSION}`));
  }
  create() {
    makeFxTextures(this);
    if (BOT) this.scene.start('Game', { stage: parseInt(QS.get('stage') || '1', 10) });
    else this.scene.start(QS.get('scene') || 'Menu');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    this.input.on('pointerdown', () => SFX.unlock());
    this.add.image(W / 2, H / 2, 'keyart');
    this.add.rectangle(W / 2, 760, W, 400, 0x0d0906, 0.55);
    currencyBar(this);
    txt(this, W / 2, 150, GAME_TITLE, 48, '#fde047', { strokeThickness: 10, wordWrap: { width: 520 } });
    txt(this, W / 2, 232, GAME_SUB, 20, '#ffffff');

    const sel = Phaser.Math.Clamp(this.registry.get('sel') ?? SAVE.stage, 1, STAGES.length), st = STAGES[sel - 1];
    const locked = sel > SAVE.stage, done = SAVE.cleared[sel - 1];
    panel(this, W / 2, 610, 420, 190);
    plain(this, 78, 528, `ZONA ${sel} DE ${STAGES.length}`, 15, '#fbbf24');
    plain(this, 78, 550, st.name.toUpperCase(), 26, '#ffffff');
    plain(this, 78, 588, st.sub, 14, '#d6d3d1', { wordWrap: { width: 250 } });
    plain(this, 78, 636, 'Jefe: ' + (locked ? '???' : st.boss.name), 14, '#fca5a5');
    const best = SAVE.best[sel - 1];
    plain(this, 78, 660, locked ? 'Liberá la zona anterior' : done ? 'LIBERADA' : best ? 'Mejor aguante: ' + fmtTime(best) : 'Sin intentos', 14, done ? '#86efac' : '#a8a29e');
    const boss = fitIcon(this.add.image(400, 608, st.boss.tex), 150);
    if (locked) boss.setTintFill(0x111111);
    const arrow = (x, dir, ok) => {
      const a = this.add.image(x, 610, 'arrow').setScale(2.4 * dir, 2.4).setAlpha(ok ? 1 : 0.25);
      if (ok) a.setInteractive({ useHandCursor: true }).on('pointerup', () => { SFX.play('click'); this.registry.set('sel', sel + dir); this.scene.restart(); });
    };
    arrow(30, -1, sel > 1); arrow(W - 30, 1, sel < STAGES.length);

    button(this, W / 2, 762, 380, 84, locked ? 'BLOQUEADA' : 'JUGAR', () => {
      if (!SAVE.introSeen) this.scene.start('Intro', { stage: sel }); else this.scene.start('Game', { stage: sel });
    }, { size: 34, disabled: locked, depth: 20 });
    const link = (x, label, cb, ox) => {
      const t = this.add.text(x, 836, label, { fontFamily: FONT, fontSize: '14px', color: '#e7e5e4', stroke: '#111111', strokeThickness: 4 }).setOrigin(ox, 0.5).setInteractive({ useHandCursor: true });
      t.on('pointerup', () => cb(t)); return t;
    };
    link(24, 'Ver historia', () => this.scene.start('Intro', { stage: sel, replay: true }), 0);
    let armed = false;
    link(W - 24, 'Borrar progreso', t => {
      if (!armed) { armed = true; t.setText('¿Seguro? Tocá otra vez').setColor('#f87171'); return; }
      SAVE = defaultSave(); writeSave(); this.registry.set('sel', 1); this.scene.restart();
    }, 1);
    plain(this, W / 2, 836, VERSION, 12, '#a8a29e', { stroke: '#111111', strokeThickness: 3 }).setOrigin(0.5);
    tabBar(this, 'Menu');
  }
}

class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }
  init(d) { this.stage = d.stage || 1; this.replay = !!d.replay; }
  create() {
    this.add.image(W / 2, H / 2, 'keyart').setTint(0x777777);
    txt(this, W / 2, 110, ISLAND_NAME.toUpperCase(), 40, '#fde047');
    txt(this, W / 2, 160, 'necesita ayuda', 22, '#ffffff');
    panel(this, W / 2, 770, 508, 300);
    this.add.image(132, 540, 'presi').setScale(1.1);
    plain(this, 40, 640, HERO_NAME, 22, '#f59e0b');
    this.bodyT = plain(this, 40, 680, '', 23, '#ffffff', { wordWrap: { width: 460 }, lineSpacing: 6 });
    const hint = plain(this, W - 40, 900, 'Tocá para seguir', 15, '#a8a29e').setOrigin(1, 0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    button(this, W - 80, 40, 120, 48, 'SALTAR', () => this.finish(), { size: 18, color: 0xe5e7eb });
    this.i = 0; this.leaving = false; this.bodyT.setText(INTRO[0].text);
    this.input.on('pointerdown', (p, over) => { SFX.unlock(); if (over.length === 0) this.next(); });
  }
  next() {
    if (this.leaving) return;
    if (++this.i >= INTRO.length) this.finish(); else this.bodyT.setText(INTRO[this.i].text);
  }
  finish() {
    if (this.leaving) return;
    this.leaving = true; SAVE.introSeen = true; writeSave();
    if (this.replay) this.scene.start('Menu'); else this.scene.start('Game', { stage: this.stage });
  }
}

/* Equipo: 6 piezas que suben el ataque y la vida del tanque en todas las zonas. */
class EquipScene extends Phaser.Scene {
  constructor() { super('Equip'); }
  init(d) { this.selId = d.sel || null; this.page = d.page || 0; }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1c1917);
    this.add.tileSprite(W / 2, 244, W, 364, 'ground1').setTint(0x8a8a8a);
    currencyBar(this);
    const skin = SKINS.find(s => s.id === SAVE.skin) || SKINS[0];
    this.add.image(W / 2, 236, 'shadow').setScale(3.4, 3);
    this.add.image(W / 2, 230, 'tank_hull').setScale(2).setAngle(-90).setTint(skin.tint);
    this.add.image(W / 2, 230, 'tank_turret').setOrigin(0.25, 0.5).setScale(2).setAngle(-90).setTint(skin.tint);

    const pickItem = id => { SFX.play('click'); this.scene.restart({ sel: id, page: this.page }); };
    const cell = (x, y, size, it, ghost, selected) => {
      const box = this.add.rectangle(x, y, size, size, 0x2a2018).setStrokeStyle(selected ? 7 : 5, selected ? 0xffffff : it ? RARITY[it.rar].color : 0x111111);
      if (it) {
        fitIcon(this.add.image(x, y - 4, slotOf(it.slot).tex), size * 0.66);
        plain(this, x + size / 2 - 7, y + size / 2 - 24, 'Nv' + it.lvl, 13, '#ffffff', { stroke: '#111111', strokeThickness: 4 }).setOrigin(1, 0);
        box.setInteractive({ useHandCursor: true }).on('pointerup', () => pickItem(it.id));
      } else if (ghost) fitIcon(this.add.image(x, y, ghost), size * 0.6).setAlpha(0.22);
      return box;
    };
    SLOTS.forEach((s, i) => {
      const x = i < 3 ? 70 : W - 70, y = 114 + (i % 3) * 110, it = equippedItem(s.id);
      cell(x, y, 88, it, s.tex, it && it.id === this.selId);
      plain(this, x, y + 46, s.short, 12, '#ffffff', { stroke: '#111111', strokeThickness: 4 }).setOrigin(0.5, 0);
    });
    const g = gearTotals();
    txt(this, W / 2, 404, `ATAQUE +${g.atk}%     VIDA +${g.hp}`, 20, '#fde047');

    // Mochila: lo que no está puesto, primero lo más raro.
    const equippedIds = Object.values(SAVE.equip);
    const bag = SAVE.items.filter(i => !equippedIds.includes(i.id)).sort((a, b) => b.rar - a.rar || b.lvl - a.lvl);
    const per = 10, pages = Math.max(1, Math.ceil(bag.length / per));
    this.page = Math.min(this.page, pages - 1);
    plain(this, 24, 432, `MOCHILA (${bag.length})`, 15, '#a8a29e');
    bag.slice(this.page * per, this.page * per + per).forEach((it, i) => cell(62 + (i % 5) * 104, 512 + Math.floor(i / 5) * 104, 92, it, null, it.id === this.selId));
    if (!bag.length) plain(this, W / 2, 530, 'Vacía. Liberá zonas para encontrar equipo.', 15, '#78716c').setOrigin(0.5);
    if (pages > 1) {
      plain(this, W / 2, 432, `${this.page + 1}/${pages}`, 15, '#e7e5e4').setOrigin(0.5, 0);
      button(this, W - 150, 440, 60, 30, '<', () => this.scene.restart({ sel: this.selId, page: Math.max(0, this.page - 1) }), { size: 16, depth: 20, color: 0xe5e7eb });
      button(this, W - 60, 440, 60, 30, '>', () => this.scene.restart({ sel: this.selId, page: Math.min(pages - 1, this.page + 1) }), { size: 16, depth: 20, color: 0xe5e7eb });
    }

    // Ficha de la pieza elegida
    const it = SAVE.items.find(i => i.id === this.selId);
    panel(this, W / 2, 782, 520, 162);
    if (!it) plain(this, W / 2, 770, 'Tocá una pieza para verla', 17, '#a8a29e').setOrigin(0.5);
    else {
      const s = slotOf(it.slot), on = SAVE.equip[it.slot] === it.id, maxed = it.lvl >= itemMaxLvl(it), cost = itemCost(it);
      const same = SAVE.items.filter(o => o.slot === it.slot && o.rar === it.rar && o.id !== it.id);
      plain(this, 26, 704, s.name, 19, RARITY[it.rar].css);
      plain(this, 26, 730, `${RARITY[it.rar].name} · Nv ${it.lvl}/${itemMaxLvl(it)} · ${s.stat === 'atk' ? 'Ataque +' + itemValue(it) + '%' : 'Vida +' + itemValue(it)}`, 14, '#e7e5e4');
      button(this, 92, 808, 150, 62, on ? 'QUITAR' : 'PONER', () => {
        if (on) delete SAVE.equip[it.slot]; else SAVE.equip[it.slot] = it.id;
        writeSave(); this.scene.restart({ sel: it.id, page: this.page });
      }, { size: 19, depth: 20, color: 0x84cc16 });
      const up = button(this, 262, 808, 170, 62, maxed ? 'AL MÁXIMO' : `SUBIR  ${cost}`, () => {
        SAVE.coins -= cost; it.lvl++; writeSave(); this.scene.restart({ sel: it.id, page: this.page });
      }, { size: 17, depth: 20, disabled: maxed || SAVE.coins < cost });
      if (!maxed) { up.label.setX(-12); up.add(this.add.image(66, -3, 'coin')); }
      const canFuse = it.rar < RARITY.length - 1 && same.length >= 2;
      button(this, 440, 808, 170, 62, it.rar >= RARITY.length - 1 ? 'TOPE' : `FUSIONAR ${Math.min(3, same.length + 1)}/3`, () => {
        // Se gastan otras 2 piezas iguales (primero las que no están puestas y de menor nivel).
        const burn = same.sort((a, b) => (SAVE.equip[a.slot] === a.id) - (SAVE.equip[b.slot] === b.id) || a.lvl - b.lvl).slice(0, 2).map(o => o.id);
        SAVE.items = SAVE.items.filter(o => !burn.includes(o.id));
        if (burn.includes(SAVE.equip[it.slot])) SAVE.equip[it.slot] = it.id;
        it.rar++; writeSave(); this.scene.restart({ sel: it.id, page: this.page });
      }, { size: 15, depth: 20, disabled: !canFuse, color: 0xc084fc });
      plain(this, 440, 846, '3 iguales = 1 mejor', 11, '#a8a29e').setOrigin(0.5, 0);
    }
    tabBar(this, 'Equip');
  }
}

/* Taller: mejoras permanentes con bitcolones y pintura del tanque con jocotes. */
class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1c1917);
    currencyBar(this);
    txt(this, W / 2, 96, 'TALLER DEL TANQUE', 30, '#fde047');
    UPGRADES.forEach((u, i) => {
      const y = 172 + i * 84, lvl = SAVE.up[u.id], maxed = lvl >= u.max, cost = upgradeCost(u, lvl);
      panel(this, W / 2, y, 516, 76);
      plain(this, 26, y - 26, u.name.toUpperCase(), 20, '#ffffff');
      plain(this, 26, y + 4, u.desc, 13, '#a8a29e');
      for (let k = 0; k < u.max; k++) this.add.rectangle(190 + k * 13, y - 14, 9, 14, k < lvl ? 0x84cc16 : 0x44403c);
      const b = button(this, W - 88, y, 144, 54, maxed ? 'MÁXIMO' : String(cost), () => {
        SAVE.coins -= cost; SAVE.up[u.id]++; writeSave(); this.scene.restart();
      }, { depth: 20, size: 20, disabled: maxed || SAVE.coins < cost });
      if (!maxed) { b.label.setX(10); b.add(this.add.image(-46, -3, 'coin')); }
    });
    txt(this, W / 2, 610, `PINTURA · SE PAGA CON ${PREMIUM_NAME.toUpperCase()}`, 17, '#fca5a5');
    SKINS.forEach((sk, i) => {
      const x = 95 + i * 175, y = 730, owned = SAVE.skins.includes(sk.id), using = SAVE.skin === sk.id;
      this.add.rectangle(x, y, 162, 190, 0x2a2018).setStrokeStyle(5, using ? 0xfacc15 : 0x111111);
      this.add.image(x, y - 34, 'tank_hull').setAngle(-90).setTint(sk.tint).setScale(1.1);
      this.add.image(x, y - 34, 'tank_turret').setOrigin(0.25, 0.5).setAngle(-90).setTint(sk.tint).setScale(1.1);
      plain(this, x, y + 22, sk.name, 13, '#e7e5e4').setOrigin(0.5, 0);
      let label, cb = () => {}, disabled = false;
      if (using) { label = 'EN USO'; disabled = true; }
      else if (owned) { label = 'USAR'; cb = () => { SAVE.skin = sk.id; writeSave(); this.scene.restart(); }; }
      else { label = String(sk.cost); disabled = SAVE.jocotes < sk.cost; cb = () => { SAVE.jocotes -= sk.cost; SAVE.skins.push(sk.id); SAVE.skin = sk.id; writeSave(); this.scene.restart(); }; }
      const b = button(this, x, y + 66, 130, 46, label, cb, { depth: 20, size: 17, disabled, color: 0xfde68a });
      if (!owned) { b.label.setX(12); b.add(this.add.image(-30, -3, 'jocote').setScale(0.8)); }
    });
    tabBar(this, 'Shop');
  }
}

window.GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d0906',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  fps: BOT ? { forceSetTimeOut: true, target: 60 } : {},
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, IntroScene, GameScene, EquipScene, ShopScene],
});
