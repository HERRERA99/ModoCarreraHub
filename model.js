export const POSITIONS = ['POR', 'LD', 'CAD', 'DFC', 'LI', 'CAI', 'MCD', 'MC', 'MCO', 'MD', 'MI', 'ED', 'EI', 'SD', 'DC'];
const backFour = ['LI', 'DFC', 'DFC', 'LD'];
const backThree = ['DFC', 'DFC', 'DFC'];
const positionNames = { POR:'Portero', LI:'Lateral izquierdo', LD:'Lateral derecho', DFC:'Central', MC:'Mediocentro', MCD:'Pivote', MCO:'Mediapunta', DC:'Delantero', SD:'Segundo delantero', MI:'Medio izquierdo', MD:'Medio derecho', EI:'Extremo izquierdo', ED:'Extremo derecho', CAI:'Carrilero izquierdo', CAD:'Carrilero derecho' };
function formation(label, field) {
  const slots = {};
  for (const p of field.flat()) slots[p] = (slots[p] || 0) + 1;
  const occurrences = {};
  const fieldRows = field.map(row => row.map(position => {
    const index = occurrences[position] = (occurrences[position] || 0) + 1;
    const side = slots[position] === 2 ? ['izq.', 'der.'][index - 1] : slots[position] === 3 ? ['izq.', 'centro', 'der.'][index - 1] : '';
    const fullSide = { 'izq.':'izquierdo', 'der.':'derecho', centro:'central' }[side] || '';
    return { id:`${position}-${index}`, position, label:`${position}${side ? ` ${side}` : ''}`, name:position === 'DFC' && side === 'centro' ? 'Central' : `${positionNames[position]}${fullSide ? ` ${fullSide}` : ''}` };
  }));
  return { label, slots, fieldRows, rows: field.map(row => [...new Set(row)]) };
}
export const FORMATIONS = {
  '4-4-2': formation('4-4-2 · Clásica', [['DC','DC'],['MI','MC','MC','MD'],backFour,['POR']]),
  '4-4-2-pivotes': formation('4-4-2 · Doble pivote', [['DC','DC'],['MI','MD'],['MCD','MCD'],backFour,['POR']]),
  '4-4-1-1': formation('4-4-1-1 · Segundo delantero', [['DC'],['SD'],['MI','MC','MC','MD'],backFour,['POR']]),
  '4-1-2-1-2': formation('4-1-2-1-2 · Rombo cerrado', [['DC','DC'],['MCO'],['MC','MC'],['MCD'],backFour,['POR']]),
  '4-1-2-1-2-abierta': formation('4-1-2-1-2 · Rombo abierto', [['DC','DC'],['MCO'],['MI','MD'],['MCD'],backFour,['POR']]),
  '4-3-3': formation('4-3-3 · Con pivote', [['EI','DC','ED'],['MC','MC'],['MCD'],backFour,['POR']]),
  '4-3-3-plana': formation('4-3-3 · Plana', [['EI','DC','ED'],['MC','MC','MC'],backFour,['POR']]),
  '4-3-3-ofensiva': formation('4-3-3 · Ofensiva', [['EI','DC','ED'],['MCO'],['MC','MC'],backFour,['POR']]),
  '4-3-3-defensiva': formation('4-3-3 · Defensiva', [['EI','DC','ED'],['MC'],['MCD','MCD'],backFour,['POR']]),
  '4-2-3-1': formation('4-2-3-1 · Abierta', [['DC'],['MI','MCO','MD'],['MCD','MCD'],backFour,['POR']]),
  '4-2-3-1-cerrada': formation('4-2-3-1 · Tres mediapuntas', [['DC'],['MCO','MCO','MCO'],['MCD','MCD'],backFour,['POR']]),
  '4-2-2-2': formation('4-2-2-2 · Dos mediapuntas', [['DC','DC'],['MCO','MCO'],['MCD','MCD'],backFour,['POR']]),
  '4-3-1-2': formation('4-3-1-2 · Mediocampo compacto', [['DC','DC'],['MCO'],['MC','MC','MC'],backFour,['POR']]),
  '4-3-2-1': formation('4-3-2-1 · Dos segundos delanteros', [['DC'],['SD','SD'],['MC','MC','MC'],backFour,['POR']]),
  '4-1-4-1': formation('4-1-4-1 · Con pivote', [['DC'],['MI','MC','MC','MD'],['MCD'],backFour,['POR']]),
  '4-2-4': formation('4-2-4 · Cuatro atacantes', [['EI','DC','DC','ED'],['MC','MC'],backFour,['POR']]),
  '3-5-2': formation('3-5-2 · Con carrileros', [['DC','DC'],['MC','MC'],['CAI','MCD','CAD'],backThree,['POR']]),
  '3-4-3': formation('3-4-3 · Con extremos', [['EI','DC','ED'],['MI','MC','MC','MD'],backThree,['POR']]),
  '3-4-1-2': formation('3-4-1-2 · Con mediapunta', [['DC','DC'],['MCO'],['MI','MC','MC','MD'],backThree,['POR']]),
  '3-4-2-1': formation('3-4-2-1 · Dos mediapuntas', [['DC'],['MCO','MCO'],['MI','MC','MC','MD'],backThree,['POR']]),
  '5-3-2': formation('5-3-2 · Tres mediocentros', [['DC','DC'],['MC','MC','MC'],['CAI','CAD'],backThree,['POR']]),
  '5-2-1-2': formation('5-2-1-2 · Con mediapunta', [['DC','DC'],['MCO'],['MC','MC'],['CAI','CAD'],backThree,['POR']]),
  '5-2-3': formation('5-2-3 · Con extremos', [['EI','DC','ED'],['MC','MC'],['CAI','CAD'],backThree,['POR']]),
  '5-4-1': formation('5-4-1 · Bloque bajo', [['DC'],['MI','MC','MC','MD'],['CAI','CAD'],backThree,['POR']]),
};
export const STORAGE_KEY = 'modo-carrera-hub:v1';
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const alphabet = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
const compareByPreference = (a, b) => a.preference - b.preference || b.rating - a.rating || alphabet.compare(a.name, b.name) || a.id.localeCompare(b.id);
export function positionOptions(players, formationKey) {
  if (!Object.hasOwn(FORMATIONS, formationKey)) throw new Error('Formación desconocida.');
  return Object.fromEntries(Object.keys(FORMATIONS[formationKey].slots).map(position => [position,
    players.filter(player => player.positions.includes(position))
      .map(player => ({ ...player, preference: player.positions.indexOf(position) }))
      .sort(compareByPreference),
  ]));
}
export function assignPlayers(players, formationKey) {
  if (!Object.hasOwn(FORMATIONS, formationKey)) throw new Error('Formación desconocida.');
  const formation = FORMATIONS[formationKey];
  const groups = Object.fromEntries(Object.keys(formation.slots).map(position => [position, []]));
  const unmatched = [];
  for (const player of players) {
    const preference = player.positions.findIndex(position => position in groups);
    if (preference === -1) unmatched.push(player);
    else groups[player.positions[preference]].push({ ...player, preference });
  }
  for (const group of Object.values(groups)) group.sort(compareByPreference);
  unmatched.sort((a, b) => alphabet.compare(a.name, b.name) || a.id.localeCompare(b.id));
  const coverage = Object.entries(groups).map(([position, group]) => {
    const slots = formation.slots[position];
    return { position, slots, assigned: group.length, starters: Math.min(slots, group.length), vacancies: Math.max(0, slots - group.length), substitutes: Math.max(0, group.length - slots), excess: Math.max(0, group.length - slots * 2) };
  });
  const totals = coverage.reduce((sum, item) => {
    for (const key of ['slots', 'assigned', 'starters', 'vacancies', 'substitutes', 'excess']) sum[key] += item[key];
    return sum;
  }, { slots: 0, assigned: 0, starters: 0, vacancies: 0, substitutes: 0, excess: 0 });
  return { groups, unmatched, coverage, totals };
}
export function buildLineup(save) {
  const slots = FORMATIONS[save.formation].fieldRows.flat();
  const assignment = assignPlayers(save.players, save.formation);
  const overrides = save.lineups?.[save.formation] || {};
  const used = new Set();
  const selected = {};
  for (const slot of slots) {
    if (!Object.hasOwn(overrides, slot.id)) continue;
    if (overrides[slot.id] === null) { selected[slot.id] = null; continue; }
    const p = save.players.find(p => p.id === overrides[slot.id] && p.positions.includes(slot.position));
    if (p && !used.has(p.id)) { selected[slot.id] = { ...p, preference:p.positions.indexOf(slot.position), manual:true }; used.add(p.id); }
  }
  const indexes = {};
  for (const slot of slots) {
    const index = indexes[slot.position] || 0;
    indexes[slot.position] = index + 1;
    if (Object.hasOwn(selected, slot.id)) continue;
    const queue = assignment.groups[slot.position];
    const preferred = queue[index];
    const p = preferred && !used.has(preferred.id) ? preferred : queue.find(p => !used.has(p.id));
    selected[slot.id] = p ? { ...p, manual:false } : null;
    if (p) used.add(p.id);
  }
  return { selected, count:used.size, bench:save.players.filter(p => !used.has(p.id)) };
}
export function chooseStarter(save, slotId, playerId) {
  const slots = FORMATIONS[save.formation].fieldRows.flat();
  const target = slots.find(s => s.id === slotId);
  const player = save.players.find(p => p.id === playerId);
  if (!target || (playerId !== null && (!player || !player.positions.includes(target.position)))) throw new Error('Jugador incompatible con este puesto.');
  const current = buildLineup(save).selected;
  const picks = { ...save.lineups?.[save.formation], [slotId]:playerId };
  const source = playerId === null ? null : slots.find(s => s.id !== slotId && current[s.id]?.id === playerId);
  if (source) {
    const displaced = current[slotId];
    if (displaced?.positions.includes(source.position)) picks[source.id] = displaced.id;
    else delete picks[source.id];
  }
  return { ...save, lineups:{ ...save.lineups, [save.formation]:picks } };
}
export function cleanLineups(save) {
  const lineups = {};
  for (const [key, picks] of Object.entries(save.lineups || {})) {
    if (!Object.hasOwn(FORMATIONS,key)) continue;
    const used = new Set();
    lineups[key] = {};
    for (const slot of FORMATIONS[key].fieldRows.flat()) {
      const id = picks[slot.id];
      if (id === null) lineups[key][slot.id] = null;
      else if (save.players.some(p => p.id === id && p.positions.includes(slot.position)) && !used.has(id)) { lineups[key][slot.id] = id; used.add(id); }
    }
  }
  return { ...save, lineups };
}
function fail(message) { throw new Error(message); }
function boundedText(value, field, max, optional = false) {
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) fail(`${field}: texto no válido (máximo ${max} caracteres).`);
  return value.trim();
}
export function validatePlayer(value) {
  if (!value || typeof value !== 'object') fail('Jugador no válido.');
  const name = boundedText(value.name, 'Nombre del jugador', 80);
  if (!Array.isArray(value.positions) || !value.positions.length || value.positions.length > POSITIONS.length || value.positions.some(p => !POSITIONS.includes(p)) || new Set(value.positions).size !== value.positions.length) fail(`Las posiciones de ${name} deben ser válidas y no repetirse.`);
  for (const [key, label, min, max] of [['rating', 'Valoración', 1, 99], ['potential', 'Potencial', 1, 99], ['age', 'Edad', 14, 60]]) {
    if (!Number.isInteger(value[key]) || value[key] < min || value[key] > max) fail(`${label} de ${name}: debe ser un entero entre ${min} y ${max}.`);
  }
  return { id: typeof value.id === 'string' && value.id ? value.id : uid(), name, positions: [...value.positions], rating: value.rating, potential: value.potential, age: value.age };
}
export function validateData(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.saves) || value.saves.length > 500) fail('Copia no válida. Se necesita un JSON de Modo Carrera Hub (versión 1).');
  const saveIds = new Set();
  return { version: 1, saves: value.saves.map(save => {
    if (!save || typeof save.formation !== 'string' || !Object.hasOwn(FORMATIONS, save.formation) || !Array.isArray(save.players) || save.players.length > 10000) fail('Una partida tiene una formación o plantilla no válida.');
    const id = typeof save.id === 'string' && save.id ? save.id : uid();
    if (saveIds.has(id)) fail('La copia contiene partidas con identificadores repetidos.');
    saveIds.add(id);
    const players = save.players.map(validatePlayer);
    if (new Set(players.map(p => p.id)).size !== players.length) fail('La copia contiene jugadores con identificadores repetidos en una partida.');
    const lineups = {};
    if (save.lineups !== undefined && (!save.lineups || typeof save.lineups !== 'object' || Array.isArray(save.lineups))) fail('Selecciones de titulares no válidas.');
    for (const [key, picks] of Object.entries(save.lineups || {})) {
      if (!Object.hasOwn(FORMATIONS,key) || !picks || typeof picks !== 'object' || Array.isArray(picks)) fail('Formación de titulares no válida.');
      const slots = FORMATIONS[key].fieldRows.flat();
      const used = new Set();
      lineups[key] = {};
      for (const [slotId, playerId] of Object.entries(picks)) {
        const slot = slots.find(s => s.id === slotId);
        if (!slot || (playerId !== null && (typeof playerId !== 'string' || !players.some(p => p.id === playerId && p.positions.includes(slot.position)) || used.has(playerId)))) fail('Un titular está repetido o no es compatible con su puesto.');
        lineups[key][slotId] = playerId;
        if (playerId !== null) used.add(playerId);
      }
    }
    return { id, name: boundedText(save.name, 'Nombre de partida', 80), club: boundedText(save.club ?? '', 'Club', 80, true), formation: save.formation, players, lineups, updatedAt: typeof save.updatedAt === 'string' ? save.updatedAt : new Date().toISOString() };
  }) };
}
export function loadData(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? { version: 1, saves: [] } : validateData(JSON.parse(raw));
}
export function persistData(storage, data) {
  const validated = validateData(data);
  storage.setItem(STORAGE_KEY, JSON.stringify(validated));
  return validated;
}
export function mergeBackup(data, backup) {
  const incoming = validateData(backup);
  const copies = incoming.saves.map(save => {
    const ids = new Map(save.players.map(p => [p.id,uid()]));
    const lineups = Object.fromEntries(Object.entries(save.lineups).map(([key,picks]) => [key,Object.fromEntries(Object.entries(picks).map(([slot,id]) => [slot,id === null ? null : ids.get(id)]))]));
    return { ...save, id:uid(), players:save.players.map(p => ({ ...p,id:ids.get(p.id) })), lineups, updatedAt:new Date().toISOString() };
  });
  return validateData({ version: 1, saves: [...data.saves, ...copies] });
}
