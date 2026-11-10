'use strict';
/* =====================================================================
   OPERACIÓN CARIBE (antes "General Tanque") — v0.3
   Todo lo que es nombre, texto, número de balance o calendario de un stage
   vive en este archivo. Parodia: ningún nombre de persona, país o marca real.
   ===================================================================== */
const GAME_TITLE = 'OPERACIÓN CARIBE';
const GAME_SUB = 'El Presi y su tanque';
const VERSION = 'v0.3.0';
const HERO_NAME = 'EL PRESI';
const ISLAND_NAME = 'Isla Jaibití';
const GANG_NAME = 'La Banda del Tiburón';
const COIN_NAME = 'Bitcolones';
const PREMIUM_NAME = 'Jocotes';

const QS = new URLSearchParams(location.search);
// Duración de cada stage en segundos (15 min como Survivor.io). ?min=3 lo acorta para probar.
const STAGE_SECONDS = QS.has('min') ? Math.max(1, parseFloat(QS.get('min'))) * 60 : 900;
const SIM_SPEED = QS.has('speed') ? Math.max(1, parseInt(QS.get('speed'), 10)) : 1;
const BOT = QS.has('bot');
const GOD = QS.has('god');   // pruebas: el tanque no recibe daño

const MAX_ACTIVE_SLOTS = 6;   // armas por partida (incluye el cañón)
const MAX_PASSIVE_SLOTS = 6;
const MAX_SKILL_LVL = 5;

const W = 540, H = 960;
const FONT = '"Arial Black", "Arial Bold", Arial, sans-serif';
const SAVE_KEY = 'operacion_caribe_save_v3';
const UI_DEPTH = 1e7;

/* ---------------- Armas (5 niveles; con su pasiva pareja llegan a PRIME) ---------------- */
const ACTIVES = {
  canon: { name: 'Cañón del Tanque', pair: 'municion', prime: 'Cañón Izalco',
    lv: ['Obús hacia donde mira el tanque que revienta en área', '+30% de daño y explosión más grande', 'Dispara 2 obuses seguidos', '+30% de daño y recarga más rápido', 'Dispara 3 obuses seguidos'],
    primeDesc: 'Bolas de lava que revientan en un área gigante' },
  cohetes: { name: 'Cohetes de Vara', pair: 'polvora', prime: 'Castillo de Pólvora',
    lv: ['El maitro de la fiesta patronal bombardea bandidos al azar', '3 cohetes por tanda', '4 cohetes y +25% de daño', '5 cohetes por tanda', '6 cohetes y +25% de daño'],
    primeDesc: '10 cohetes con explosión gigante, más seguido' },
  kaisers: { name: 'Jauría de Káisers', pair: 'concentrado', prime: 'Jauría Brava',
    lv: ['Un chucho feroz cuida el tanque y embiste al que se acerque', '2 chuchos', '+40% de daño de mordida', '3 chuchos', '4 chuchos y +40% de daño'],
    primeDesc: '6 chuchos más rápidos; cada mordida pega en área' },
  cam: { name: 'Agente del KAM', pair: 'silbato', prime: 'Comisionado del KAM',
    lv: ['Un agente municipal se suma y dispara su pistola', '+30% de daño', 'Dispara más rápido', 'Dispara 2 balas y +30% de daño', 'Dispara todavía más rápido'],
    primeDesc: 'Escopetazo de 5 perdigones que atraviesan' },
  fuerzas: { name: 'Fuerzas Especiales', pair: 'radio', prime: 'Comando Torogoz',
    lv: ['3 soldados rodean el tanque y disparan a discreción', '+25% de daño', 'Ráfagas de 4 balas', '+25% de daño', 'Ráfagas de 5 balas y +30% de daño'],
    primeDesc: 'Balas explosivas que atraviesan, ráfagas de 6' },
  yina: { name: 'Yina de la Niña Lilian', pair: 'cafe', prime: 'La Yina Suprema',
    lv: ['Una yina poderosa rebota por toda la pantalla', '+40% de daño', '2 yinas', '+40% de daño', '3 yinas'],
    primeDesc: '4 yinas gigantes y más veloces' },
  bloqueador: { name: 'Bloqueador Don René', pair: 'atol', prime: 'Bloqueador Factor 1000',
    lv: ['Las balas te hacen 15% menos daño; su brillo quema y frena al que se acerque', 'Balas -25% y brillo más grande', 'Balas -35% y +50% de quemadura', 'Balas -45% y brillo más grande', 'Balas -55% y +70% de quemadura'],
    primeDesc: 'El brillo deshace las balas enemigas que lo tocan' },
  machete: { name: 'El Machete Oxidado', pair: 'piedra', prime: 'El Corvo Dorado',
    lv: ['Un machete gira alrededor del tanque', '2 machetes', '+40% de daño', '3 machetes', '4 machetes y +40% de daño'],
    primeDesc: '6 machetes que nunca dejan de girar' },
};
const W_STATS = {
  // dmg 20 = mata de un tiro a los primeros bandidos del stage 1 (thug 12, runner 7, knives 10, rott 14).
  canon:      { dmg: 20, cd: 0.75, range: 400, shots: [1, 1, 2, 2, 3], mul: [1, 1.3, 1.3, 1.7, 1.7], cdMul: [1, 1, 1, 0.85, 0.85], aoe: [72, 80, 88, 96, 106], pAoe: 135, pMul: 2.4 },
  cohetes:    { dmg: 18, cd: 4.2, n: [2, 3, 4, 5, 6], mul: [1, 1, 1.25, 1.25, 1.5], aoe: 55, pMul: 2.2 },
  kaisers:    { dmg: 14, n: [1, 2, 2, 3, 4], mul: [1, 1, 1.4, 1.4, 1.8], pMul: 2.6 },
  cam:        { dmg: 9, cd: [0.8, 0.8, 0.62, 0.62, 0.48], shots: [1, 1, 1, 2, 2], mul: [1, 1.3, 1.3, 1.6, 1.6], pMul: 2.0 },
  fuerzas:    { dmg: 6, cd: 1.5, burst: [3, 3, 4, 4, 5], mul: [1, 1.25, 1.25, 1.5, 1.8], pMul: 2.4 },
  yina:       { dmg: 12, n: [1, 1, 2, 2, 3], mul: [1, 1.4, 1.4, 1.8, 1.8], speed: 330, pMul: 2.5 },
  bloqueador: { dmg: 4, cut: [0.15, 0.25, 0.35, 0.45, 0.55], r: [80, 92, 92, 106, 106], mul: [1, 1, 1.5, 1.5, 2.2], pMul: 3 },
  machete:    { dmg: 11, n: [1, 2, 2, 3, 4], mul: [1, 1, 1.4, 1.4, 1.8], pMul: 2.4 },
};
const PASSIVES = {
  municion:    { name: 'Munición Reforzada', desc: '+10% de daño' },
  polvora:     { name: 'Pólvora de Feria',   desc: '+10% de área de explosiones y golpes' },
  concentrado: { name: 'Concentrado',        desc: '+8% de velocidad del tanque' },
  silbato:     { name: 'Silbato',            desc: '-7% de recarga de todas las armas' },
  radio:       { name: 'Radio Militar',      desc: '+12% de velocidad de balas, yinas y chuchos' },
  cafe:        { name: 'Café de Altura',     desc: '+10% de experiencia' },
  atol:        { name: 'Atol de Elote',      desc: '+20 de vida máxima y regenera vida' },
  piedra:      { name: 'Piedra de Afilar',   desc: '+8% de probabilidad de golpe crítico' },
};
const pairOf = pid => Object.keys(ACTIVES).find(a => ACTIVES[a].pair === pid);
const skillIcon = id => 'ic_' + id;
// Curva rápida al inicio (nivel 2 con 4 cafés) y que se va endureciendo.
const xpNeed = l => Math.floor(3 + l * 1.6 + l * l * 0.16);

/* ---------------- Objetos del mapa ---------------- */
const ITEMS = {
  pupusa:   { tex: 'p_pupusa',   name: 'Pupusa',               desc: 'Recupera 30% de vida' },
  mortero:  { tex: 'p_mortero',  name: 'Mortero Número 5',     desc: 'Revienta a todos los bandidos en pantalla' },
  cobrador: { tex: 'p_cobrador', name: 'El Cobrador de la 141', desc: 'Recoge todo el café y las monedas del mapa' },
};

/* ---------------- Enemigos ----------------
   ai: melee | ranged | lob | line | boom.  xp: 1 verde, 5 azul, 25 dorado. */
const ENEMIES = {
  thug:     { tex: 'e_thug',     hp: 12, spd: 56,  dmg: 6,  r: 17, xp: 1, ai: 'melee' },
  runner:   { tex: 'e_runner',   hp: 7,  spd: 104, dmg: 5,  r: 15, xp: 1, ai: 'melee' },
  knives:   { tex: 'e_knives',   hp: 10, spd: 122, dmg: 8,  r: 15, xp: 1, ai: 'melee' },
  rott:     { tex: 'e_rott',     hp: 14, spd: 128, dmg: 10, r: 16, xp: 1, ai: 'melee' },
  brute:    { tex: 'e_brute',    hp: 75, spd: 38,  dmg: 16, r: 24, xp: 5, ai: 'melee' },
  gunman:   { tex: 'e_gunman',   hp: 14, spd: 50,  dmg: 8,  r: 17, xp: 1, ai: 'ranged', range: 250, cd: 2.8, shot: 9,  bspd: 170 },
  harpoon:  { tex: 'e_harpoon',  hp: 16, spd: 52,  dmg: 8,  r: 17, xp: 1, ai: 'ranged', range: 230, cd: 3.2, shot: 11, bspd: 230 },
  guard:    { tex: 'e_guard',    hp: 30, spd: 54,  dmg: 10, r: 17, xp: 5, ai: 'ranged', range: 260, cd: 3.2, shot: 8,  bspd: 210, burst: 3 },
  sniper:   { tex: 'e_sniper',   hp: 12, spd: 44,  dmg: 6,  r: 17, xp: 5, ai: 'ranged', range: 400, cd: 4.6, shot: 18, bspd: 430, aim: 0.9 },
  molotov:  { tex: 'e_molotov',  hp: 16, spd: 50,  dmg: 8,  r: 17, xp: 1, ai: 'lob',    range: 280, cd: 4.2, shot: 7 },
  dynamite: { tex: 'e_dynamite', hp: 18, spd: 82,  dmg: 0,  r: 17, xp: 5, ai: 'boom',   shot: 22 },
  biker:    { tex: 'e_biker',    hp: 26, spd: 250, dmg: 14, r: 22, xp: 1, ai: 'line' },
};

/* Calendario de cada stage, en minutos de un stage de 15 (se escala solo con ?min=).
   roster: qué bandidos salen, desde qué minuto y con qué peso. */
const EVENTS = [
  { at: 1.5, kind: 'elite' }, { at: 2.5, kind: 'horde' }, { at: 3.5, kind: 'stampede' }, { at: 4, kind: 'elite' },
  { at: 5, kind: 'mini', slot: 0 }, { at: 6.5, kind: 'elite' }, { at: 7.5, kind: 'horde' }, { at: 8.5, kind: 'stampede' },
  { at: 9, kind: 'elite' }, { at: 10, kind: 'mini', slot: 1 }, { at: 11.5, kind: 'elite' }, { at: 12.5, kind: 'horde' },
  { at: 13, kind: 'stampede' }, { at: 13.5, kind: 'elite' }, { at: 15, kind: 'boss' },
];
const STAGES = [
  { id: 1, name: 'Puerto Jaiba', sub: 'La playa y el muelle de los pescadores', ground: 'ground1', hp: 1, dmg: 1,
    props: ['s1_palm', 's1_palm', 's1_boat', 's1_crates', 's1_shack', 's1_nets', 's1_rocks'],
    roster: [['thug', 0, 10], ['runner', 1, 5], ['gunman', 2.5, 3], ['harpoon', 4, 3], ['brute', 5.5, 2], ['knives', 8, 4], ['dynamite', 10.5, 2]],
    minis: ['anchor', 'chopper'],
    boss: { id: 'tiburon', name: 'EL TIBURÓN', tex: 'boss1', hp: 100000, r: 60, spd: 52, dmg: 22 },
    intro: 'Los pescadores de Puerto Jaiba ya no pueden salir al mar. ¡A limpiar el muelle!' },
  { id: 2, name: 'Mercado Viejo', sub: 'Las calles de colores del pueblo', ground: 'ground2', hp: 1.45, dmg: 1.3,
    props: ['s2_stall', 's2_house', 's2_banana', 's2_banana', 's2_bus', 's2_lamp', 's2_barricade'],
    roster: [['thug', 0, 8], ['knives', 0.5, 5], ['molotov', 2, 3], ['gunman', 3, 3], ['brute', 4.5, 2], ['sniper', 6.5, 2], ['dynamite', 8, 3], ['runner', 9, 5]],
    minis: ['minigun', 'truck'],
    boss: { id: 'gallo', name: 'EL GALLO DE ORO', tex: 'boss2', hp: 150000, r: 60, spd: 66, dmg: 30 },
    intro: 'La banda cobra renta en cada puesto del mercado. Hoy se les acaba el negocio.' },
  { id: 3, name: 'Lomas del Patrón', sub: 'Los jardines de la mansión', ground: 'ground3', hp: 2.0, dmg: 1.6,
    props: ['s3_fountain', 's3_lion', 's3_topiary', 's3_topiary', 's3_car', 's3_column', 's3_palm'],
    roster: [['guard', 0, 6], ['rott', 0, 6], ['thug', 0, 5], ['sniper', 2, 3], ['brute', 3, 3], ['molotov', 5, 3], ['knives', 6, 5], ['dynamite', 8, 3]],
    minis: ['anchor', 'truck'],
    boss: { id: 'patron', name: 'EL PATRÓN FORTACHÓN', tex: 'boss3', hp: 220000, r: 70, spd: 0, dmg: 40 },
    intro: 'Allá arriba, en su mansión de lujo, se esconde el jefe de todos. Vamos por él.' },
];
const MINIS = {
  anchor:  { name: 'El Ancla',      tex: 'm_anchor',  hp: 4000, r: 44, spd: 60,  dmg: 18, ai: 'charge' },
  chopper: { name: 'El Calavera',   tex: 'm_chopper', hp: 3500, r: 42, spd: 150, dmg: 18, ai: 'rider' },
  minigun: { name: 'El Teniente',   tex: 'm_minigun', hp: 4500, r: 44, spd: 46,  dmg: 16, ai: 'spray' },
  truck:   { name: 'La Troca Brava', tex: 'm_truck',   hp: 5000, r: 48, spd: 70,  dmg: 22, ai: 'chargespray' },
};

/* ---------------- Fuera de los stages: taller, skins y equipo ---------------- */
const UPGRADES = [
  { id: 'dmg',    name: 'Pólvora',  desc: '+6% de daño',              base: 40, max: 10 },
  { id: 'hp',     name: 'Lámina',   desc: '+12 de vida',              base: 40, max: 10 },
  { id: 'speed',  name: 'Motor',    desc: '+3% de velocidad',         base: 35, max: 8 },
  { id: 'magnet', name: 'Imán',     desc: '+15% radio para recoger',  base: 30, max: 6 },
  { id: 'luck',   name: 'Suerte',   desc: '+8% de bitcolones',   base: 50, max: 6 },
];
const SKINS = [
  { id: 'olivo',  name: 'Verde Olivo',   cost: 0,  tint: 0xffffff },
  { id: 'azul',   name: 'Azul Marino',   cost: 5,  tint: 0x8fb4ff },
  { id: 'dorado', name: 'Tanque de Oro', cost: 12, tint: 0xffd75a },
];
const SLOTS = [
  { id: 'canon',       name: 'Cañón de Hierro Colado',   short: 'Cañón',       stat: 'atk', base: 8,  tex: 'eq_canon' },
  { id: 'escapulario', name: 'Escapulario de la Abuela', short: 'Escapulario', stat: 'atk', base: 5,  tex: 'eq_escapulario' },
  { id: 'guantes',     name: 'Guantes de Albañil',       short: 'Guantes',     stat: 'atk', base: 6,  tex: 'eq_guantes' },
  { id: 'blindaje',    name: 'Blindaje de Lámina',       short: 'Blindaje',    stat: 'hp',  base: 30, tex: 'eq_blindaje' },
  { id: 'faja',        name: 'Faja de Cargador',         short: 'Faja',        stat: 'hp',  base: 22, tex: 'eq_faja' },
  { id: 'orugas',      name: 'Orugas Recauchadas',       short: 'Orugas',      stat: 'hp',  base: 18, tex: 'eq_orugas' },
];
const RARITY = [
  { name: 'Común',     color: 0x9ca3af, css: '#d1d5db', mult: 1 },
  { name: 'Bueno',     color: 0x22c55e, css: '#86efac', mult: 1.6 },
  { name: 'Mejor',     color: 0x3b82f6, css: '#93c5fd', mult: 2.4 },
  { name: 'Excelente', color: 0xa855f7, css: '#d8b4fe', mult: 3.5 },
  { name: 'Épico',     color: 0xf59e0b, css: '#fde047', mult: 5 },
];
const slotOf = id => SLOTS.find(s => s.id === id);
const itemMaxLvl = it => 10 + 5 * it.rar;
const itemValue = it => Math.round(slotOf(it.slot).base * RARITY[it.rar].mult * (1 + 0.12 * (it.lvl - 1)));
const itemCost = it => Math.round(25 * it.lvl * (1 + 0.6 * it.rar));

const INTRO = [
  { text: 'Me acaban de avisar: en ' + ISLAND_NAME + ' ' + GANG_NAME + ' tiene a la gente sin poder salir de su casa.' },
  { text: 'Nadie más va a ir. Así que saquen el tanque, que voy yo.' },
  { text: 'Los bandidos sueltan granos de café. Con café el tanque sube de nivel y elegís con qué les damos.' },
  { text: 'Cohetes de vara, chuchos bravos, la yina de la niña Lilian... lo que haya en la casa.' },
  { text: 'Son 3 zonas. En cada una hay que aguantar 15 minutos y bajarse al jefe.' },
  { text: 'El último se esconde en una mansión de lujo. Ese es mío. ¡Arranquen!' },
];
