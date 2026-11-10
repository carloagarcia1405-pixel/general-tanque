"""Corta las hojas de arte (art/raw/*.png, generadas en Higgsfield) y las deja
como sprites listos para el juego en assets/img/ + assets/manifest.js.

Uso:  python tools/build_art.py     (desde la carpeta del juego)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'art', 'raw')
OUT = os.path.join(ROOT, 'assets', 'img')
os.makedirs(OUT, exist_ok=True)
ALPHA_CUT = 140
manifest = {}


def load(name):
    im = Image.open(os.path.join(RAW, name + '.png')).convert('RGBA')
    a = np.array(im)
    a[:, :, 3] = np.where(a[:, :, 3] >= ALPHA_CUT, 255, 0)
    a[a[:, :, 3] == 0] = 0
    return a


def segments(mask1d, want, min_gap=10):
    """Tramos ocupados de una proyeccion; une huecos chicos hasta quedar `want`."""
    segs, start = [], None
    for i, v in enumerate(mask1d):
        if v and start is None:
            start = i
        if not v and start is not None:
            segs.append([start, i]); start = None
    if start is not None:
        segs.append([start, len(mask1d)])
    segs = [s for s in segs if s[1] - s[0] >= 3]
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    while len(merged) > want:
        gaps = [merged[i + 1][0] - merged[i][1] for i in range(len(merged) - 1)]
        i = int(np.argmin(gaps))
        merged[i][1] = merged[i + 1][1]; del merged[i + 1]
    if len(merged) != want:
        raise SystemExit(f'esperaba {want} tramos y hay {len(merged)}')
    return merged


def label(mask):
    """Componentes conexas (8 vecinos) de una mascara chica, sin scipy."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y0, x0 in zip(*np.where(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n
                        stack.append((yy, xx))
    return lab, n


def cells(a, rows, cols):
    """Separa la hoja en rows x cols sprites. Cada mancha suelta va a la celda donde
    cae su centro, asi un sprite puede invadir la celda vecina sin mezclarse."""
    H, W = a.shape[:2]
    F = 2
    small = (a[:H // F * F, :W // F * F, 3] > 0).reshape(H // F, F, W // F, F).any(axis=(1, 3))
    lab, n = label(small)
    big = np.repeat(np.repeat(lab, F, axis=0), F, axis=1)
    big = np.pad(big, ((0, H - big.shape[0]), (0, W - big.shape[1])))
    owner = np.zeros(n + 1, np.int32)
    sizes = np.bincount(lab.ravel(), minlength=n + 1)
    ys, xs = np.indices(lab.shape)
    cy = np.bincount(lab.ravel(), ys.ravel(), n + 1) / np.maximum(sizes, 1) * F
    cx = np.bincount(lab.ravel(), xs.ravel(), n + 1) / np.maximum(sizes, 1) * F
    for i in range(1, n + 1):
        owner[i] = min(rows - 1, int(cy[i] * rows / H)) * cols + min(cols - 1, int(cx[i] * cols / W)) + 1
    cellmap = owner[big]
    out = []
    for c in range(1, rows * cols + 1):
        m = cellmap == c
        if not m.any():
            raise SystemExit(f'celda {c} vacia')
        b = a.copy()
        b[~m] = 0
        out.append(trim(b))
    return out


def trim(a):
    al = a[:, :, 3] > 0
    ys, xs = np.where(al.any(axis=1))[0], np.where(al.any(axis=0))[0]
    return a[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]


def resize(a, scale):
    im = Image.fromarray(a, 'RGBA').convert('RGBa')
    w, h = max(1, round(a.shape[1] * scale)), max(1, round(a.shape[0] * scale))
    im = im.resize((w, h), Image.LANCZOS).convert('RGBA')
    b = np.array(im)
    b[:, :, 3] = np.where(b[:, :, 3] >= 128, 255, 0)
    b[b[:, :, 3] == 0] = 0
    return b


def save(key, a):
    Image.fromarray(a, 'RGBA').save(os.path.join(OUT, key + '.png'), optimize=True)
    manifest[key] = [int(a.shape[1]), int(a.shape[0])]


def emit(key, a, h=None, w=None, m=None, rot=False, icon=None):
    """h/w/m = alto, ancho o lado mayor final en px. rot = la hoja lo trae apuntando
    arriba y el juego lo quiere apuntando a la derecha. icon = guarda ademas ic_<icon>."""
    if rot:
        a = np.rot90(a, k=3).copy()
    if h: s = h / a.shape[0]
    elif w: s = w / a.shape[1]
    else: s = m / max(a.shape[:2])
    save(key, resize(a, s))
    if icon:
        save('ic_' + icon, resize(a, 64 / max(a.shape[:2])))
    return s


# ---------------- Tanque ----------------
hull, turret = cells(load('tank'), 1, 2)
s = emit('tank_hull', hull, w=96, rot=True)
tr = np.rot90(turret, k=3).copy()
save('tank_turret', resize(tr, s))

# ---------------- Enemigos ----------------
ea = load('enemiesA')
# El pañuelo del 2.º bandido salió con los colores de una bandera real: se pasa a verde liso.
box = ea[96:156, 512:574]
r, g, b = box[:, :, 0].astype(int), box[:, :, 1].astype(int), box[:, :, 2].astype(int)
yel = (r > 150) & (g > 120) & (b < 120) & (box[:, :, 3] > 0)
lum = (r + g) / 510.0
box[yel, 0] = (40 * lum[yel] + 10).astype(np.uint8)
box[yel, 1] = (170 * lum[yel] + 20).astype(np.uint8)
box[yel, 2] = (70 * lum[yel] + 10).astype(np.uint8)
for key, c, hh in zip(['e_thug', 'e_runner', 'e_gunman', 'e_brute', 'e_molotov', 'e_biker'],
                      cells(ea, 2, 3), [58, 54, 58, 74, 58, 62]):
    emit(key, c, h=hh)
for key, c, hh in zip(['e_sniper', 'e_knives', 'e_dynamite', 'e_harpoon', 'e_guard', 'e_rott'],
                      cells(load('enemiesB'), 2, 3), [54, 54, 58, 58, 60, 42]):
    emit(key, c, h=hh)
for key, c, hh in zip(['m_anchor', 'm_minigun', 'm_chopper', 'm_truck'],
                      cells(load('minibosses'), 2, 2), [118, 122, 112, 122]):
    emit(key, c, h=hh)
emit('boss1', trim(load('boss1')), h=190)
emit('boss2', trim(load('boss2')), h=190)
emit('boss3', trim(load('boss3')), w=236)
emit('mansion', trim(load('mansion')), w=524)

# ---------------- Aliados y armas ----------------
al = cells(load('allies'), 3, 3)
emit('w_rocket', al[0], w=46, rot=True, icon='cohetes')
emit('a_dog', al[1], h=36, icon='kaisers')
emit('a_cam', al[2], h=54, icon='cam')
emit('a_soldier', al[3], h=52, icon='fuerzas')
emit('w_yina', al[4], m=44, icon='yina')
emit('w_bloq', al[5], h=44, icon='bloqueador')
emit('w_machete', al[6], w=66, rot=True, icon='machete')
emit('w_shell', al[7], w=26, rot=True)
emit('a_maitro', al[8], h=58)

# ---------------- Objetos ----------------
pk = cells(load('pickups'), 3, 3)
emit('p_pupusa', pk[0], w=40, icon='pupusa')
emit('p_mortero', pk[1], m=46, icon='mortero')
emit('p_cobrador', pk[2], h=50, icon='cobrador')
emit('p_chest', pk[3], h=44)
emit('p_chestgold', pk[4], h=54, icon='chest')
emit('p_crate', pk[5], h=46)
emit('xp1', pk[6], h=18)
emit('xp5', pk[7], h=21)
emit('xp25', pk[8], h=25)

ps = cells(load('passives'), 3, 3)
for key, c in zip(['municion', 'polvora', 'concentrado', 'silbato', 'radio', 'cafe', 'atol', 'piedra'], ps):
    emit('ic_' + key, c, m=64)
emit('coin', ps[8], m=22, icon='coin')

eq = cells(load('equip'), 3, 3)
for key, c in zip(['eq_canon', 'eq_escapulario', 'eq_guantes', 'eq_blindaje', 'eq_faja', 'eq_orugas'], eq):
    emit(key, c, m=72)
save('ic_canon', resize(eq[0], 64 / max(eq[0].shape[:2])))
emit('jocote', eq[6], m=28, icon='jocote')
emit('ic_medal', eq[7], m=64)
emit('ebullet', eq[8], m=16)
emit('fireball', eq[8], m=34)

# ---------------- Escenografia ----------------
for sheet, keys, hs in [
    ('props1', ['s1_palm', 's1_boat', 's1_crates', 's1_shack', 's1_nets', 's1_rocks'], [170, 84, 84, 150, 110, 84]),
    ('props2', ['s2_stall', 's2_house', 's2_banana', 's2_bus', 's2_lamp', 's2_barricade'], [130, 150, 140, 112, 150, 84]),
    ('props3', ['s3_fountain', 's3_lion', 's3_topiary', 's3_car', 's3_column', 's3_palm'], [130, 130, 112, 84, 130, 160]),
]:
    for key, c, hh in zip(keys, cells(load(sheet), 2, 3), hs):
        emit(key, c, h=hh)

p = trim(load('presi'))
emit('presi', p, h=220)

# ---------------- Suelos (mosaico espejado = siempre continuo) ----------------
for i in (1, 2, 3):
    g = Image.open(os.path.join(RAW, f'ground{i}.png')).convert('RGB').resize((512, 512), Image.LANCZOS)
    tile = Image.new('RGB', (1024, 1024))
    tile.paste(g, (0, 0)); tile.paste(g.transpose(Image.FLIP_LEFT_RIGHT), (512, 0))
    tile.paste(g.transpose(Image.FLIP_TOP_BOTTOM), (0, 512))
    tile.paste(g.transpose(Image.ROTATE_180), (512, 512))
    tile = tile.quantize(96, dither=Image.NONE)
    tile.save(os.path.join(OUT, f'ground{i}.png'), optimize=True)
    manifest[f'ground{i}'] = [1024, 1024]

k = Image.open(os.path.join(RAW, 'keyart.png')).convert('RGB')
kw = round(k.height * 540 / 960)
k = k.crop(((k.width - kw) // 2, 0, (k.width - kw) // 2 + kw, k.height)).resize((540, 960), Image.LANCZOS)
k.quantize(200, dither=Image.NONE).save(os.path.join(OUT, 'keyart.png'), optimize=True)
manifest['keyart'] = [540, 960]

with open(os.path.join(ROOT, 'assets', 'manifest.js'), 'w', encoding='utf-8') as f:
    f.write('// Generado por tools/build_art.py: no editar a mano.\nconst ART = ' + json.dumps(manifest, indent=0) + ';\n')
total = sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT))
print(len(manifest), 'sprites,', round(total / 1024), 'KB')
