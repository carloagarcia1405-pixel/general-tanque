'use strict';
/* Animación hecha con los mismos píxeles del arte original. El reloj es el de
   simulación: pausa, selección de mejoras y velocidad de prueba siguen iguales. */
const ActorMotion = {
  walkers: ['e_thug', 'e_runner', 'e_gunman', 'e_brute', 'e_molotov',
    'e_sniper', 'e_knives', 'e_dynamite', 'e_harpoon', 'e_guard',
    'm_anchor', 'm_minigun', 'boss1', 'boss2', 'a_cam', 'a_soldier', 'a_maitro'],
  vehicles: ['e_biker', 'm_chopper', 'm_truck'],

  prepare(scene) {
    for (const key of this.walkers.concat(['e_rott', 'a_dog'])) {
      const name = key + '_walk';
      if (scene.textures.exists(name)) continue;
      const source = scene.textures.get(key).getSourceImage();
      const w = source.width, h = source.height;
      const texture = scene.textures.createCanvas(name, w * 8, h);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      const dog = key === 'e_rott' || key === 'a_dog';
      const hip = Math.round(h * (dog ? 0.64 : 0.67)), mid = Math.round(w * 0.5);
      for (let frame = 0; frame < 8; frame++) {
        const x = frame * w, step = Math.sin(frame / 8 * Math.PI * 2);
        ctx.save(); ctx.beginPath(); ctx.rect(x, 0, w, h); ctx.clip();
        // El torso se conserva entero; las dos piernas alternan apoyo y elevación.
        ctx.drawImage(source, 0, 0, w, hip, x, 0, w, hip);
        for (let leg = 0; leg < 2; leg++) {
          const sx = leg ? mid : 0, sw = leg ? w - mid : mid;
          const stride = step * (leg ? -1 : 1);
          const lift = Math.round(Math.max(0, stride) * Math.max(2, h * 0.045));
          const shift = Math.round(stride * Math.max(1, w * 0.025));
          // Deformación gradual desde la cadera: sin cortes ni huecos en la cintura.
          for (let y = hip; y < h; y++) {
            const weight = (y - hip) / (h - hip);
            ctx.drawImage(source, sx, y, sw, 1,
              x + sx + Math.round(shift * weight), y - Math.round(lift * weight), sw, 1);
          }
        }
        texture.add(frame, 0, x, 0, w, h);
        ctx.restore();
      }
      texture.refresh();
    }
    if (!scene.textures.exists('fx_muzzle')) {
      const g = scene.make.graphics({ add: false });
      g.fillStyle(0x9a4b16); g.fillRect(1, 7, 22, 6); g.fillRect(8, 2, 6, 16);
      g.fillStyle(0xffc04a); g.fillRect(3, 8, 18, 4); g.fillRect(9, 4, 4, 12);
      g.fillStyle(0xfff1bd); g.fillRect(5, 9, 11, 2);
      g.generateTexture('fx_muzzle', 24, 20); g.destroy();
    }
  },

  attack(scene, actor, angle, melee = false) {
    actor.attackAt = scene.now;
    actor.attackAngle = angle;
    actor.attackMelee = melee;
  },

  pose(scene, actor, dt) {
    const s = actor.spr;
    if (!s || !s.active) return;
    if (!actor.motion) actor.motion = { x: actor.x, y: actor.y, phase: actor.ph || 0,
      scaleX: s.scaleX, scaleY: s.scaleY, key: s.poolKey || s.texture.key };
    const m = actor.motion;
    const distance = Math.hypot(actor.x - m.x, actor.y - m.y);
    m.x = actor.x; m.y = actor.y;
    // No convertir teletransportes al borde del mapa en pasos gigantes.
    const moving = distance > 0.08 && distance < 70 && !actor.fixed;
    if (moving) m.phase += Math.min(distance, 12) / (m.key === 'a_dog' || m.key === 'e_rott' ? 5 : 7);
    const walkKey = m.key + '_walk';
    if (moving && scene.textures.exists(walkKey)) s.setTexture(walkKey, Math.floor(m.phase) % 8);
    else s.setTexture(m.key);
    const stride = m.phase * Math.PI / 4;
    const vehicle = this.vehicles.includes(m.key);
    const bob = moving ? Math.abs(Math.sin(stride)) * (vehicle ? 0.6 : 1.6) : 0;
    const age = scene.now - (actor.attackAt ?? -10);
    const attack = age >= 0 && age < 0.24 ? Math.sin(age / 0.24 * Math.PI) : 0;
    const sign = s.flipX ? -1 : 1;
    const recoil = attack * (actor.attackMelee ? 4 : -2);
    const angle = actor.attackAngle ?? (s.flipX ? Math.PI : 0);
    s.setPosition(actor.x + Math.cos(angle) * recoil, actor.y - bob + Math.sin(angle) * recoil)
      .setRotation((moving ? Math.sin(stride) * (vehicle ? 0.012 : 0.035) : 0) + attack * sign * (actor.attackMelee ? 0.16 : -0.045))
      .setScale(m.scaleX * (1 + attack * 0.025), m.scaleY * (1 - attack * 0.025));
  },

  muzzle(scene, x, y, angle, scale = 1) {
    if (scene.fx.length >= 220) return;
    const spr = scene.img('fx_muzzle', x, y).setRotation(angle).setScale(scale).setDepth(UI_DEPTH - 19);
    scene.fx.push({ kind: 'muzzle', spr, scale, t0: scene.now, dur: 0.085 });
  },

  death(scene, actor) {
    if (scene.fx.length >= 200) return;
    const source = actor.spr;
    const spr = scene.img(source.texture.key, source.x, source.y).setFrame(source.frame.name)
      .setFlipX(source.flipX).setScale(source.scaleX, source.scaleY)
      .setRotation(source.rotation).setDepth(source.depth);
    if (actor.tint) spr.setTint(actor.tint);
    scene.fx.push({ kind: 'death', spr, sx: source.scaleX, sy: source.scaleY,
      rotation: source.rotation, sign: source.flipX ? -1 : 1,
      t0: scene.now, dur: actor.big ? 0.45 : 0.28 });
  },

  updateFx(f, t, dt) {
    if (f.kind === 'muzzle') f.spr.setScale(f.scale * (1 - t * 0.6)).setAlpha(1 - t);
    else if (f.kind === 'death') {
      f.spr.y += 16 * dt;
      f.spr.setRotation(f.rotation + t * 0.65 * f.sign)
        .setScale(f.sx * (1 + t * 0.1), f.sy * (1 - t * 0.6)).setAlpha(1 - t);
    } else if (f.kind === 'smoke') {
      f.spr.y -= 14 * dt;
      f.spr.setScale(f.s0 + (f.s1 - f.s0) * t).setAlpha(0.22 * (1 - t));
    } else if (f.kind === 'shock') {
      f.spr.setScale(f.s0 + (f.s1 - f.s0) * t).setAlpha(0.65 * (1 - t) ** 2);
    } else return false;
    return true;
  },

  update(scene, dt) {
    for (const e of scene.enemies) if (!e.dead) this.pose(scene, e, dt);
    for (const actor of scene.soldiers.concat(scene.dogs, scene.agent ? [scene.agent] : [])) this.pose(scene, actor, dt);
    if (scene.maitro.visible) {
      const a = scene.maitroActor; a.x = scene.p.x - 52; a.y = scene.p.y - 6;
      this.pose(scene, a, dt);
    }
  },
};
