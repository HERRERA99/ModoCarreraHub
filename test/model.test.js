import test from 'node:test';
import assert from 'node:assert/strict';
import { assignPlayers, positionOptions, buildLineup, chooseStarter, cleanLineups, FORMATIONS, STORAGE_KEY, validatePlayer, validateData, loadData, persistData, mergeBackup } from '../model.js';

const player = (name, positions, rating = 75, extra = {}) => ({ id: name, name, positions, rating, potential: 84, age: 21, ...extra });
const save = (id, players = [], formation = '4-4-2') => ({ id, name: `Partida ${id}`, club: '', formation, players, lineups:{}, updatedAt: '2026-10-11T12:00:00.000Z' });
function storage(initial) {
  const values = new Map(initial ? [[STORAGE_KEY, initial]] : []);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key,value) };
}

test('caso obligatorio: MC como primera preferencia con 70 precede a MC como segunda con 80', () => {
  const result = assignPlayers([player('Jugador B',['MCO','MC'],80),player('Jugador A',['MC'],70)],'4-4-2');
  assert.deepEqual(result.groups.MC.map(p=>p.name), ['Jugador A','Jugador B']);
});
test('orden lexicográfico por preferencia, valoración y nombre; edad y potencial no influyen', () => {
  const result = assignPlayers([
    player('Tercero',['SD','MCO','MC'],99), player('Segundo',['MCO','MC'],99),
    player('Zeta',['MC'],70,{ age:14, potential:99 }), player('Álvaro',['MC'],70,{ age:40, potential:70 }),
    player('Primero',['MC'],71),
  ],'4-4-2');
  assert.deepEqual(result.groups.MC.map(p=>p.name),['Primero','Álvaro','Zeta','Segundo','Tercero']);
});
test('sin equilibrado: LI no pasa a DFC aunque DFC esté vacío', () => {
  const result = assignPlayers([player('A',['LI','DFC']),player('B',['LI','DFC']),player('C',['LI','DFC'])],'4-4-2');
  assert.equal(result.groups.LI.length,3);
  assert.equal(result.groups.DFC.length,0);
  assert.deepEqual(result.coverage.find(c=>c.position === 'LI'),{ position:'LI',slots:1,assigned:3,starters:1,vacancies:0,substitutes:2,excess:1 });
});
test('puestos repetidos comparten cola: 2 MC, 2 titulares, 3 recambios y 1 exceso', () => {
  const result = assignPlayers(Array.from({length:5},(_,i)=>player(`${i}`,['MC'],90-i)),'4-4-2');
  assert.equal(result.groups.MC.length,5);
  assert.deepEqual(result.coverage.find(c=>c.position === 'MC'),{ position:'MC',slots:2,assigned:5,starters:2,vacancies:0,substitutes:3,excess:1 });
  assert.equal(result.totals.assigned,5);
  assert.equal(result.totals.starters,2);
});
test('cambio de formación y edición recalculan sin duplicar jugadores', () => {
  const players = [player('A',['MCO','MC'],80),player('B',['EI','MI']),player('C',['SD'])];
  const classic = assignPlayers(players,'4-4-2');
  assert.equal(classic.groups.MC[0].name,'A');
  assert.equal(classic.groups.MI[0].name,'B');
  assert.equal(classic.unmatched[0].name,'C');
  const attacking = assignPlayers(players,'4-2-3-1');
  assert.equal(attacking.groups.MCO[0].name,'A');
  const edited = assignPlayers([player('A',['DC','MC']),...players.slice(1)],'4-4-2');
  assert.equal(edited.groups.DC[0].name,'A');
  assert.equal(edited.groups.MC.length,0);
});
test('cada jugador aparece y se cuenta una sola vez en todas las formaciones', () => {
  const players = [player('A',['MC','MCD','DFC']),player('B',['POR']),player('C',['ED','MD','CAD']),player('D',['SD']),player('E',['MCO','DC'])];
  for (const key of Object.keys(FORMATIONS)) {
    const result = assignPlayers(players,key);
    const displayed = [...Object.values(result.groups).flat(),...result.unmatched];
    assert.equal(displayed.length,players.length);
    assert.equal(new Set(displayed.map(p=>p.id)).size,players.length);
    assert.equal(result.totals.assigned + result.unmatched.length,players.length);
    assert.equal(result.totals.slots,11);
    assert.equal(result.totals.vacancies + result.totals.starters,11);
  }
});
test('las formaciones tienen exactamente los puestos solicitados', () => {
  assert.deepEqual(FORMATIONS['4-4-2'].slots,{POR:1,LI:1,DFC:2,LD:1,MI:1,MC:2,MD:1,DC:2});
  assert.deepEqual(FORMATIONS['4-3-3'].slots,{POR:1,LI:1,DFC:2,LD:1,MCD:1,MC:2,EI:1,DC:1,ED:1});
  assert.deepEqual(FORMATIONS['4-2-3-1'].slots,{POR:1,LI:1,DFC:2,LD:1,MCD:2,MI:1,MCO:1,MD:1,DC:1});
  assert.deepEqual(FORMATIONS['3-5-2'].slots,{POR:1,DFC:3,CAI:1,MC:2,MCD:1,CAD:1,DC:2});
  for (const f of Object.values(FORMATIONS)) assert.deepEqual([...f.rows.flat()].sort(),Object.keys(f.slots).sort());
});
test('partidas independientes y persistencia al reconstruir el estado', () => {
  const local = storage();
  const initial = { version:1,saves:[save('a',[player('Pedro',['MC','MCD'],75)]),save('b',[player('Carlos',['DC'],80)],'3-5-2')] };
  persistData(local,initial);
  const reloaded = loadData(local);
  assert.deepEqual(reloaded,initial);
  reloaded.saves[0].players[0].rating = 90;
  reloaded.saves[0].formation = '4-3-3';
  persistData(local,reloaded);
  const again = loadData(local);
  assert.equal(again.saves[0].formation,'4-3-3');
  assert.equal(again.saves[0].players[0].rating,90);
  assert.deepEqual(again.saves[1],initial.saves[1]);
});
test('exportación JSON e importación conservan datos y añaden copias independientes', () => {
  const original = {version:1,saves:[save('a',[player('Pedro',['MC','MCD','MCO'],75)])]};
  const result = mergeBackup(original,JSON.parse(JSON.stringify(original)));
  assert.equal(result.saves.length,2);
  assert.deepEqual(result.saves[0],original.saves[0]);
  assert.notEqual(result.saves[0].id,result.saves[1].id);
  assert.notEqual(result.saves[0].players[0].id,result.saves[1].players[0].id);
  assert.deepEqual(result.saves[1].players[0].positions,['MC','MCD','MCO']);
  result.saves[1].players[0].positions.reverse();
  assert.deepEqual(result.saves[0].players[0].positions,['MC','MCD','MCO']);
});
test('rechaza posiciones repetidas, desconocidas y vacías', () => {
  for (const positions of [['MC','MC'],['XX'],[]]) assert.throws(()=>validatePlayer(player('Pedro',positions)));
});
test('valida nombres y valores numéricos enteros', () => {
  for (const extra of [{name:' '},{rating:100},{rating:74.5},{potential:0},{age:13},{age:61}]) assert.throws(()=>validatePlayer(player('Pedro',['MC'],75,extra)));
  assert.equal(validatePlayer(player('Pedro',['MC'],80,{potential:70})).potential,70);
});
test('JSON inválido nunca reemplaza datos existentes y detecta IDs duplicados', () => {
  const original = {version:1,saves:[save('a')]};
  const local = storage(); persistData(local,original);
  assert.throws(()=>persistData(local,{version:2,saves:[]}));
  assert.deepEqual(loadData(local),original);
  assert.throws(()=>validateData({version:1,saves:[save('a'),save('a')]}));
  assert.throws(()=>validateData({version:1,saves:[save('a',[],'__proto__')]}));
  assert.throws(()=>assignPlayers([], 'toString'));
  assert.throws(()=>validateData({version:1,saves:[save('a',[player('X',['MC']),player('X',['DC'])])]}));
  assert.throws(()=>loadData(storage('{broken')));
});
test('propaga errores de almacenamiento sin simular guardado exitoso', () => {
  assert.throws(()=>persistData({setItem:()=>{throw new Error('QuotaExceeded');}},{version:1,saves:[]}),/QuotaExceeded/);
  assert.deepEqual(loadData(storage()),{version:1,saves:[]});
});
test('opciones incluye jugadores en todas sus posiciones compatibles, sin alterar la asignación única', () => {
  const players = [player('Pedro',['MC','MCD','MCO']),player('Luis',['DFC','MC']),player('Óscar',['SD'])];
  const before = JSON.stringify(players);
  const options = positionOptions(players,'4-2-3-1');
  assert.deepEqual(options.MCD.map(p=>[p.name,p.preference]),[['Pedro',1]]);
  assert.deepEqual(options.MCO.map(p=>[p.name,p.preference]),[['Pedro',2]]);
  assert.deepEqual(options.DFC.map(p=>p.name),['Luis']);
  assert.equal(Object.values(options).flat().filter(p=>p.name === 'Óscar').length,0);
  const assigned = assignPlayers(players,'4-2-3-1');
  assert.equal(assigned.groups.MCD.length,1);
  assert.equal(assigned.groups.MCO.length,0);
  assert.equal(assigned.totals.assigned,2);
  assert.equal(JSON.stringify(players),before);
});
test('listas de opciones mantienen prioridad absoluta y desempates por valoración y nombre', () => {
  const options = positionOptions([
    player('Jugador B',['DFC','MC'],80),player('Jugador A',['MC'],70),
    player('Zeta',['MC'],75),player('Álvaro',['MC'],75),
    player('Jugador C',['DC','LI','MC'],99),
  ],'4-4-2');
  assert.deepEqual(options.MC.map(p=>p.name),['Álvaro','Zeta','Jugador A','Jugador B','Jugador C']);
  assert.equal(options.DFC[0].name,'Jugador B');
});
test('opciones se recalculan con formación y preferencias y no duplican puestos repetidos', () => {
  const players = [player('Pedro',['MC','MCD','MCO'])];
  const classic = positionOptions(players,'4-4-2');
  assert.equal(classic.MC.length,1);
  assert.equal(classic.MCO,undefined);
  const attacking = positionOptions(players,'4-2-3-1');
  assert.equal(attacking.MCO[0].preference,2);
  const edited = positionOptions([player('Pedro',['MCO','MCD','MC'])],'4-2-3-1');
  assert.equal(edited.MCO[0].preference,0);
  assert.equal(edited.MCD[0].preference,1);
  assert.throws(()=>positionOptions([], 'toString'));
});
test('24 formaciones con once puestos individuales y centrales izquierdo, central y derecho', () => {
  assert.equal(Object.keys(FORMATIONS).length,24);
  for (const formation of Object.values(FORMATIONS)) {
    const slots = formation.fieldRows.flat();
    assert.equal(slots.length,11,formation.label);
    assert.equal(new Set(slots.map(s=>s.id)).size,11,formation.label);
    for (const [position,count] of Object.entries(formation.slots)) assert.equal(slots.filter(s=>s.position === position).length,count);
    const central = slots.filter(s=>s.position === 'DFC');
    assert.equal(central[0].name,'Central izquierdo');
    assert.equal(central.at(-1).name,'Central derecho');
    if (central.length === 3) assert.equal(central[1].name,'Central');
  }
});
test('once automático elige los primeros por preferencia, sin mostrar recambios ni duplicar', () => {
  const current = save('a',[player('B',['MCO','MC'],80),player('A',['MC'],70),player('C',['MC'],69),player('D',['MC'],65)]);
  const result = buildLineup(current);
  assert.equal(result.selected['MC-1'].name,'A');
  assert.equal(result.selected['MC-2'].name,'C');
  assert.equal(result.count,2);
  assert.deepEqual(result.bench.map(p=>p.name),['B','D']);
  assert.equal(new Set(Object.values(result.selected).filter(Boolean).map(p=>p.id)).size,result.count);
});
test('el usuario puede elegir un recambio y dejar un puesto vacío', () => {
  const current = save('a',[player('A',['MC'],80),player('B',['MC'],75),player('C',['MC'],70)]);
  const chosen = chooseStarter(current,'MC-1','C');
  assert.equal(buildLineup(chosen).selected['MC-1'].name,'C');
  assert.equal(buildLineup(chosen).selected['MC-2'].name,'B');
  assert.equal(buildLineup(chosen).count,2);
  const empty = chooseStarter(chosen,'MC-1',null);
  assert.equal(buildLineup(empty).selected['MC-1'],null);
  assert.equal(buildLineup(empty).count,1);
  assert.throws(()=>chooseStarter(current,'POR-1','C'));
});
test('cambiar central izquierdo por el derecho intercambia ambos y conserva un once único', () => {
  const current = save('a',[player('A',['DFC'],80),player('B',['DFC'],75),player('C',['DFC'],70)]);
  const changed = chooseStarter(current,'DFC-1','B');
  const result = buildLineup(changed);
  assert.equal(result.selected['DFC-1'].name,'B');
  assert.equal(result.selected['DFC-2'].name,'A');
  assert.equal(result.count,2);
  assert.equal(changed.lineups['4-4-2']['DFC-2'],'A');
});
test('mover a otro tipo de posición no duplica ni coloca al desplazado en una posición incompatible', () => {
  const current = save('a',[player('A',['MC','DFC'],80),player('B',['DFC'],75),player('C',['MC'],70)]);
  const result = buildLineup(chooseStarter(current,'DFC-1','A'));
  assert.equal(result.selected['DFC-1'].name,'A');
  assert.equal(result.selected['MC-1'].name,'C');
  assert.equal(result.selected['DFC-2'].name,'B');
  assert.equal(result.count,3);
});
test('selecciones persistentes por formación y partida, incluidas en copias con IDs nuevos', () => {
  let current = chooseStarter(save('a',[player('A',['DFC'],80),player('B',['DFC'],75)]),'DFC-1','B');
  current = chooseStarter({...current,formation:'3-5-2'},'DFC-3','A');
  current.formation = '4-4-2';
  const initial = {version:1,saves:[current,save('b')]};
  const local = storage(); persistData(local,initial);
  const reload = loadData(local);
  assert.deepEqual(reload,initial);
  assert.equal(buildLineup(reload.saves[0]).selected['DFC-1'].name,'B');
  assert.equal(buildLineup({...reload.saves[0],formation:'3-5-2'}).selected['DFC-3'].name,'A');
  assert.deepEqual(reload.saves[1].lineups,{});
  const copies = mergeBackup({version:1,saves:[]},JSON.parse(JSON.stringify(initial)));
  assert.equal(buildLineup(copies.saves[0]).selected['DFC-1'].name,'B');
  assert.notEqual(copies.saves[0].lineups['4-4-2']['DFC-1'],current.lineups['4-4-2']['DFC-1']);
});
test('borrar o cambiar posiciones de un titular limpia elecciones obsoletas y recalcula', () => {
  const current = chooseStarter(save('a',[player('A',['DFC'],80),player('B',['DFC'],75)]),'DFC-1','B');
  const edited = cleanLineups({...current,players:[current.players[0],player('B',['DC'],75)]});
  assert.equal(edited.lineups['4-4-2']['DFC-1'],undefined);
  assert.equal(buildLineup(edited).selected['DFC-1'],null);
  assert.equal(buildLineup(edited).selected['DFC-2'].name,'A');
  const removed = cleanLineups({...current,players:[current.players[0]]});
  assert.equal(buildLineup(removed).selected['DFC-1'],null);
  assert.equal(buildLineup(removed).selected['DFC-2'].name,'A');
  assert.doesNotThrow(()=>validateData({version:1,saves:[removed]}));
});
test('copias antiguas siguen funcionando y copias con titulares inválidos se rechazan', () => {
  const old = save('old'); delete old.lineups;
  assert.deepEqual(validateData({version:1,saves:[old]}).saves[0].lineups,{});
  const current = save('a',[player('A',['DFC'])]);
  for (const lineups of [{'4-4-2':{'DFC-1':'A','DFC-2':'A'}},{'4-4-2':{'POR-1':'A'}},{'4-4-2':{'BAD-1':'A'}},{'unknown':{}}]) assert.throws(()=>validateData({version:1,saves:[{...current,lineups}]}));
});
