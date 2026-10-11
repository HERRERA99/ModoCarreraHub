import { POSITIONS, FORMATIONS, STORAGE_KEY, uid, assignPlayers, positionOptions, buildLineup, chooseStarter, cleanLineups, validatePlayer, validateData, loadData, persistData, mergeBackup } from './model.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const fileInput = document.querySelector('#import-file');
let data = { version: 1, saves: [] };
let storageProblem = false;
let activeId = null;
let activeView = 'opciones';
let toastTimer;
const icons = {
  pitch: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M5 12h14"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',
  folder: '<path d="M3 7V4h7l3 3h8v13H3z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = (key, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const activeSave = () => data.saves.find(s => s.id === activeId);
const plural = (count, singular, multiple = `${singular}s`) => `${count} ${count === 1 ? singular : multiple}`;
const date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Ahora' : new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d); };

try { data = loadData(localStorage); } catch { storageProblem = true; }

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}
function commit(next) {
  if (storageProblem) {
    const message = 'Recupera o restablece el almacenamiento antes de hacer cambios.';
    if (modal.open && modal.querySelector('#form-error')) showError(message);
    notify(message); return false;
  }
  try { data = persistData(localStorage, next); return true; }
  catch {
    const message = 'No se pudo guardar. El almacenamiento puede estar lleno o bloqueado. Exporta una copia y libera espacio.';
    if (modal.open && modal.querySelector('#form-error')) showError(message);
    notify(message); return false;
  }
}
function changeSave(id, transform) {
  return commit({ ...data, saves: data.saves.map(s => s.id === id ? { ...cleanLineups(transform(s)), updatedAt: new Date().toISOString() } : s) });
}
function navigate(id = null) {
  activeId = id;
  activeView = 'opciones';
  history.replaceState(null, '', id ? `#partida=${encodeURIComponent(id)}&vista=${activeView}` : location.pathname + location.search);
  render();
  window.scrollTo({ top: 0 });
}
function syncRoute() {
  const route = new URLSearchParams(location.hash.slice(1));
  const id = route.get('partida');
  activeView = route.get('vista') === 'titulares' ? 'titulares' : 'opciones';
  activeId = data.saves.some(s => s.id === id) ? id : null;
  render();
}
window.addEventListener('hashchange', syncRoute);
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try {
    data = loadData(localStorage);
    storageProblem = false;
    if (!activeSave()) activeId = null;
    modal.close();
    render();
    notify('Partidas actualizadas desde otra pestaña.');
  } catch { storageProblem = true; render(); }
});

function render() {
  const save = activeSave();
  document.title = save ? `${save.name} · Modo Carrera Hub` : 'Modo Carrera Hub · Mis partidas';
  app.innerHTML = `<aside class="sidebar">
    <a class="brand" href="#" data-action="home"><span class="brand-symbol">${icon('pitch')}</span><span>modo carrera<span class="brand-sub">HUB</span></span></a>
    <div class="sidebar-section">TU VESTUARIO</div>
    <button class="nav-item ${!save ? 'selected' : ''}" data-action="home">${icon('folder')} Mis partidas <span class="nav-count">${data.saves.length}</span></button>
    <div class="sidebar-label"><span>PARTIDAS</span><button class="icon-button" data-action="new-save" aria-label="Crear partida">${icon('plus')}</button></div>
    <nav class="save-nav" aria-label="Partidas">${data.saves.length ? data.saves.map(s => `<button class="save-nav-item ${s.id === activeId ? 'selected' : ''}" data-action="open-save" data-id="${esc(s.id)}"><span class="club-dot">${esc((s.club || s.name)[0].toUpperCase())}</span><span class="truncate">${esc(s.name)}</span>${s.id === activeId ? '<span class="active-dot"></span>' : ''}</button>`).join('') : '<p class="sidebar-empty">Cada carrera empieza<br>con una nueva partida.</p>'}</nav>
    <div class="local-note">${icon('shield')}<div><strong>Tu navegador. Tus datos.</strong><span>Guardado local · Sin cuentas</span></div></div>
  </aside>
  <div class="workspace"><header class="topbar"><div class="breadcrumb"><button data-action="home">Mis partidas</button>${save ? `${icon('arrow')}<span>${esc(save.name)}</span>` : '<span class="breadcrumb-separator">/</span><span>Vista general</span>'}</div><div class="topbar-actions"><span class="saved-state"><i></i>${storageProblem ? 'Revisar almacenamiento' : 'Guardado local'}</span><button class="button subtle compact" data-action="import">${icon('upload')}<span>Importar</span></button><button class="button subtle compact" data-action="export-all" ${data.saves.length ? '' : 'disabled'}>${icon('download')}<span>Exportar todo</span></button></div></header>
    <main>${storageProblem ? `<div class="storage-alert" role="alert"><strong>No hemos podido leer tus datos locales.</strong><p>No se sobrescribirán. Descarga los datos originales antes de restablecer el almacenamiento. Si el navegador bloquea el guardado, habilítalo y recarga la página.</p><button class="button" data-action="raw-backup">Descargar datos originales</button><button class="button danger" data-action="reset-storage">Restablecer almacenamiento</button></div>` : ''}${save ? boardView(save) : homeView()}</main>
    <footer><span>MODO CARRERA HUB</span><span>Planifica tu próxima temporada.</span></footer>
  </div>`;
}
function homeView() {
  return `<div class="page-heading"><div><div class="eyebrow">EL PRÓXIMO CAPÍTULO EMPIEZA AQUÍ</div><h1>Mis partidas<span class="heading-dot">.</span></h1><p>Un lugar para cada carrera. Una pizarra para cada plantilla.</p></div><button class="button primary" data-action="new-save">${icon('plus')} Nueva partida</button></div>
    <section class="home-hero"><div><span class="hero-kicker"><span></span> PIENSA COMO UN ENTRENADOR</span><h2>Tu plantilla,<br>en perspectiva.</h2><p>Encuentra los huecos. Ordena los recambios.<br>Construye el equipo que tienes en mente.</p><button class="button light" data-action="${data.saves.length ? 'open-save' : 'new-save'}" ${data.saves.length ? `data-id="${esc(data.saves[0].id)}"` : ''}>${data.saves.length ? 'Volver a la pizarra' : 'Crear mi primera partida'} ${icon('arrow')}</button><div class="hero-footnote">FIFA / EA SPORTS FC <span>·</span> JUGADORES INTRODUCIDOS A MANO</div></div><div class="hero-art" aria-hidden="true"><div class="mini-field"><div class="mini-mid"></div><div class="mini-circle"></div><div class="mini-box top"></div><div class="mini-box bottom"></div>${[[50,16,'DC'],[22,34,'MI'],[50,40,'MC'],[78,34,'MD'],[23,65,'LI'],[50,63,'DFC'],[77,65,'LD'],[50,85,'POR']].map(([x,y,p])=>`<div class="mini-player" style="left:${x}%;top:${y}%"><span></span><b>${p}</b></div>`).join('')}</div><div class="art-badge">${icon('check')} Todo tu equipo, de un vistazo</div></div></section>
    <div class="section-heading"><h2>Tus carreras <span class="count-pill">${data.saves.length}</span></h2><span>Guardadas en este navegador</span></div>
    ${data.saves.length ? `<section class="save-grid" aria-label="Tus partidas">${data.saves.map(s => { const c = buildLineup(s); return `<article class="save-tile"><div class="save-tile-top"><span class="club-emblem">${icon('shield')}</span><span class="formation-pill">${FORMATIONS[s.formation].label}</span></div><button class="save-title" data-action="open-save" data-id="${esc(s.id)}"><h3>${esc(s.name)}</h3><p>${esc(s.club || 'Club sin indicar')}</p></button><div class="save-stats"><span>${icon('people')} ${plural(s.players.length, 'jugador', 'jugadores')}</span><span class="${c.count < 11 ? 'text-amber' : 'text-green'}">${c.count}/11 puestos cubiertos</span></div><div class="save-tile-footer"><span>${icon('clock')} ${date(s.updatedAt)}</span><div><button class="icon-button" data-action="rename-save" data-id="${esc(s.id)}" aria-label="Renombrar ${esc(s.name)}">${icon('edit')}</button><button class="icon-button delete-hover" data-action="delete-save" data-id="${esc(s.id)}" aria-label="Eliminar ${esc(s.name)}">${icon('trash')}</button><button class="open-tile" data-action="open-save" data-id="${esc(s.id)}" aria-label="Abrir ${esc(s.name)}">${icon('arrow')}</button></div></div></article>`; }).join('')}<button class="new-save-tile" data-action="new-save"><span>${icon('plus')}</span><strong>Una nueva historia</strong><small>Crear otra partida</small></button></section>` : `<section class="empty-home"><span class="empty-icon">${icon('folder')}</span><div><h3>El vestuario está listo. Falta tu equipo.</h3><p>Crea una partida y añade tus jugadores para empezar.</p></div><button class="button" data-action="demo">Probar una plantilla de ejemplo ${icon('arrow')}</button></section>`}
    <div class="home-bottom"><span>${icon('shield')} Tus partidas se quedan en este dispositivo.</span><span>Exporta un JSON para llevarlas a otro navegador.</span></div>`;
}
function boardView(save) {
  const assignment = assignPlayers(save.players, save.formation);
  const { unmatched } = assignment;
  const formation = FORMATIONS[save.formation];
  const lineup = buildLineup(save);
  const selected = Object.values(lineup.selected).filter(Boolean);
  const used = new Set(selected.map(p => p.id));
  const coverage = assignment.coverage.map(c => {
    const starters = formation.fieldRows.flat().filter(slot => slot.position === c.position && lineup.selected[slot.id]).length;
    const substitutes = assignment.groups[c.position].filter(p => !used.has(p.id)).length;
    return { ...c, starters, substitutes, assigned:starters + substitutes, vacancies:c.slots - starters, excess:Math.max(0,starters + substitutes - c.slots * 2) };
  });
  const totals = coverage.reduce((sum,c) => ({ starters:sum.starters + c.starters, vacancies:sum.vacancies + c.vacancies, substitutes:sum.substitutes + c.substitutes, excess:sum.excess + c.excess }), { starters:0,vacancies:0,substitutes:0,excess:0 });
  const showOptions = activeView === 'opciones';
  const options = showOptions ? positionOptions(save.players, save.formation) : null;
  return `<div class="page-heading board-heading"><div><div class="eyebrow">${esc(save.club || 'TU MODO CARRERA')} <span class="eyebrow-divider">/</span> PIZARRA DE PLANTILLA</div><div class="title-row"><h1>${esc(save.name)}<span class="heading-dot">.</span></h1><button class="icon-button" data-action="rename-save" data-id="${esc(save.id)}" aria-label="Renombrar partida">${icon('edit')}</button></div><p>Todos tus jugadores. Cada posición. Las decisiones, tuyas.</p></div><button class="button primary" data-action="add-player">${icon('plus')} Añadir jugador</button></div>
    <div class="board-tabs" role="tablist" aria-label="Vista de la pizarra"><button id="tab-opciones" role="tab" aria-selected="${showOptions}" aria-controls="board-panel" tabindex="${showOptions ? 0 : -1}" data-action="board-view" data-view="opciones">${icon('people')} Opciones por posición</button><button id="tab-titulares" role="tab" aria-selected="${!showOptions}" aria-controls="board-panel" tabindex="${showOptions ? -1 : 0}" data-action="board-view" data-view="titulares">${icon('pitch')} Titulares</button></div>
    <p class="view-description">${showOptions ? 'Cada puesto tiene su lista de jugadores compatibles, ordenada por preferencia y valoración. Los puestos izquierdo y derecho comparten opciones; cada jugador se cuenta una sola vez en el resumen.' : 'Tu once titular, sin duplicados. Automáticamente se eligen los primeros de cada cola de posición: preferencia, valoración y nombre. Pulsa un puesto para cambiar su titular.'}</p>
    <div id="board-panel" role="tabpanel" aria-labelledby="tab-${activeView}" tabindex="0"><div class="board-layout"><section class="board-main" aria-label="Pizarra de plantilla"><div class="board-toolbar"><label for="formation">${icon('pitch')} Formación <select id="formation">${Object.entries(FORMATIONS).map(([key,f])=>`<option value="${key}" ${save.formation === key ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label>${showOptions ? '<span class="options-legend">TODAS LAS OPCIONES · POR PREFERENCIA</span>' : '<button class="button subtle compact" data-action="reset-lineup">Restablecer once automático</button>'}</div>
    <div class="pitch ${showOptions ? 'options-pitch' : 'lineup-pitch'}"><div class="pitch-markings" aria-hidden="true"><div class="field-border"></div><div class="field-middle"></div><div class="field-circle"></div><div class="field-penalty top"></div><div class="field-penalty bottom"></div><div class="field-goal top"></div><div class="field-goal bottom"></div></div><div class="pitch-direction">ATAQUE ↑</div><div class="pitch-rows">${formation.fieldRows.map(row => `<div class="pitch-row" style="--groups:${row.length}" data-count="${row.length}">${row.map(slot => showOptions ? optionsGroupView(slot, options[slot.position]) : starterSlotView(slot, lineup.selected[slot.id])).join('')}</div>`).join('')}</div><div class="pitch-caption">${formation.label} <span>·</span> ${showOptions ? plural(save.players.length, 'jugador', 'jugadores') + ' en plantilla' : `${lineup.count}/11 titulares`}</div></div>
    <div class="ordering-note">${icon('check')}<p><strong>La posición siempre va primero.</strong> 1.ª preferencia → 2.ª → 3.ª… Dentro de cada nivel: valoración y nombre. ${showOptions ? 'Pulsa un jugador para editar.' : 'Los cambios manuales se guardan para esta formación. Si eliges un jugador del once, se intercambia o mueve sin duplicarlo.'}</p></div>
    ${showOptions && unmatched.length ? `<section class="unmatched"><div class="section-heading"><div><h2>Sin encaje en esta formación <span class="count-pill">${unmatched.length}</span></h2><p>Ninguna de sus posiciones aparece en ${formation.label}.</p></div></div><div class="unmatched-grid">${unmatched.map(p=>playerCard(p, false, true)).join('')}</div></section>` : ''}</section>
    ${showOptions ? `<aside class="coverage-panel"><section class="summary-card"><div class="card-heading"><h2>Estado de la plantilla</h2>${icon('people')}</div><div class="coverage-number">${totals.starters}<span>/ 11</span></div><p class="coverage-caption">puestos titulares cubiertos</p><div class="coverage-progress" role="progressbar" aria-label="Puestos titulares cubiertos" aria-valuemin="0" aria-valuemax="11" aria-valuenow="${totals.starters}"><span style="width:${totals.starters / 11 * 100}%"></span></div><div class="summary-grid"><div><strong>${save.players.length}</strong><span>Jugadores</span></div><div><strong class="text-amber">${totals.vacancies}</strong><span>Sin cubrir</span></div><div><strong>${totals.substitutes}</strong><span>Recambios</span></div><div><strong class="${totals.excess ? 'text-amber' : ''}">${totals.excess}</strong><span>En exceso</span></div></div>${unmatched.length ? `<div class="summary-warning">${plural(unmatched.length, 'jugador', 'jugadores')} sin encaje</div>` : ''}</section>
    <section class="coverage-card"><h2>Cobertura por posición</h2><div class="coverage-table-heading"><span>Puesto</span><span>Asignados / puestos</span></div>${coverage.map(c=>`<div class="coverage-line"><span class="position-label">${c.position}</span><span class="coverage-meter">${Array.from({length:c.slots * 2},(_,i)=>`<i class="${i < c.starters ? 'filled' : i >= c.slots && i < c.assigned ? 'reserve' : ''}"></i>`).join('')}</span><strong class="${c.vacancies || c.excess ? 'text-amber' : ''}">${c.assigned}<span> / ${c.slots}</span></strong></div>`).join('')}<div class="coverage-key"><span><i class="starter-dot"></i> Titular</span><span><i class="sub-dot"></i> Recambio</span></div></section>
    <section class="coach-note"><span class="eyebrow">LECTURA DE LA PIZARRA</span><h3>${totals.vacancies ? 'Hay sitio para crecer.' : 'El once está cubierto.'}</h3><p>${totals.vacancies ? `${totals.vacancies === 1 ? 'Falta' : 'Faltan'} ${plural(totals.vacancies, 'titular', 'titulares')}. Las posiciones vacías señalan dónde reforzar tu equipo.` : 'Todas las posiciones tienen titular. Revisa los recambios para preparar una temporada larga.'}</p><div class="note-rule"></div><p><strong>Referencia de equilibrio</strong><br>1 titular + 1 recambio por puesto. Los jugadores que superan ese límite se cuentan como exceso.</p><p class="fine-print">La asignación respeta las preferencias, sin mover jugadores para compensar huecos.</p></section>
    <button class="button full" data-action="export-save">${icon('download')} Exportar esta partida</button><button class="button subtle full delete-hover" data-action="delete-save" data-id="${esc(save.id)}">${icon('trash')} Eliminar partida</button></aside>` : lineupSidebar(save,lineup)}</div></div>`;
}
function lineupSidebar(save, lineup) {
  const manual = Object.values(lineup.selected).filter(p => p?.manual).length;
  return `<aside class="coverage-panel"><section class="summary-card"><div class="card-heading"><h2>Tu once titular</h2>${icon('pitch')}</div><div class="coverage-number">${lineup.count}<span>/ 11</span></div><p class="coverage-caption">puestos titulares cubiertos</p><div class="coverage-progress" role="progressbar" aria-label="Puestos titulares cubiertos" aria-valuemin="0" aria-valuemax="11" aria-valuenow="${lineup.count}"><span style="width:${lineup.count / 11 * 100}%"></span></div><div class="summary-grid"><div><strong>${save.players.length}</strong><span>En plantilla</span></div><div><strong class="text-amber">${11 - lineup.count}</strong><span>Sin titular</span></div><div><strong>${manual}</strong><span>Elegidos por ti</span></div><div><strong>${lineup.count - manual}</strong><span>Automáticos</span></div></div></section><section class="coach-note"><span class="eyebrow">EL ONCE LO DECIDES TÚ</span><h3>Un puesto. Un jugador.</h3><p>Pulsa cualquier tarjeta para elegir entre los jugadores compatibles, ordenados por preferencia y valoración.</p><div class="note-rule"></div><p>Si ya está en el once, se intercambiará o moverá sin duplicarse. Tus elecciones se guardan para esta partida y formación.</p><p class="fine-print">El botón «Restablecer once automático» recupera los primeros de cada cola de posición.</p></section><button class="button full" data-action="export-save">${icon('download')} Exportar esta partida</button></aside>`;
}
function optionsGroupView(slot, players) {
  return `<section class="position-group options-group" aria-label="Opciones ${slot.name}"><div class="group-heading"><strong title="${slot.name}">${slot.label}</strong><span>${plural(players.length, 'opción', 'opciones')}</span></div>${players.length ? `<ol class="option-list" aria-label="Jugadores compatibles con ${slot.name}, por preferencia">${players.map(player => `<li>${playerCard(player, false, false, true)}</li>`).join('')}</ol>` : `<button class="vacant-slot" data-action="add-player" data-position="${slot.position}">${icon('plus')}<span>Añadir opción</span></button><div class="options-group-footer">Sin jugadores compatibles</div>`}</section>`;
}
function starterSlotView(slot, player) {
  return `<section class="position-group starter-slot" aria-label="Titular ${slot.name}"><div class="group-heading"><strong title="${slot.name}">${slot.label}</strong>${player ? `<span>${player.manual ? 'Tu elección' : 'Automático'}</span>` : ''}</div>${player ? playerCard(player,true,false,false,slot) : `<button class="vacant-slot" data-action="choose-starter" data-slot="${slot.id}" aria-label="Elegir titular de ${slot.name}">${icon('plus')}<span>Elegir titular</span></button>`}<div class="starter-slot-hint">${player ? 'Pulsa para cambiar' : 'Puesto sin cubrir'}</div></section>`;
}
function playerCard(player, starter, unmatched = false, candidate = false, slot = null) {
  return `<button class="player-card ${starter ? 'starter' : 'reserve'} ${unmatched ? 'unmatched-player' : ''} ${candidate ? 'candidate' : ''}" data-action="${slot ? 'choose-starter' : 'edit-player'}" ${slot ? `data-slot="${slot.id}"` : ''} data-id="${esc(player.id)}" aria-label="${slot ? `Cambiar titular de ${slot.name}` : `Editar ${esc(player.name)}`}"><div class="player-top"><span class="player-name">${esc(player.name)}</span><strong class="rating">${player.rating}</strong></div><div class="player-meta"><span>${player.age} años</span><span>POT <strong>${player.potential}</strong></span>${unmatched || candidate ? '' : `<span class="role-label">${starter ? 'Titular' : 'Recambio'}</span>`}</div><div class="player-bottom"><span class="player-positions">${player.positions.map(esc).join('<span class="position-arrow"> → </span>')}</span><span class="preference ${player.preference > 0 ? 'secondary' : ''}">${unmatched ? 'Sin encaje' : `${player.preference + 1}.ª pref.`}</span></div></button>`;
}

function openModal(content) {
  modal.innerHTML = content;
  modal.showModal();
}
const modalHeading = (eyebrow, title, subtitle = '') => `<div class="modal-heading"><div><div class="eyebrow">${eyebrow}</div><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="icon-button" type="button" data-close aria-label="Cerrar">${icon('close')}</button></div>`;
const formError = '<p class="form-error" id="form-error" role="alert" hidden></p>';
function starterDialog(slotId) {
  const save = activeSave();
  const slots = FORMATIONS[save.formation].fieldRows.flat();
  const slot = slots.find(s => s.id === slotId);
  if (!slot) return;
  const lineup = buildLineup(save);
  const choices = positionOptions(save.players,save.formation)[slot.position];
  openModal(`${modalHeading('ELIGE TU ONCE', slot.name, 'Opciones ordenadas por preferencia, valoración y nombre.')}<div class="lineup-choices">${choices.map(p => {
    const source = slots.find(s => lineup.selected[s.id]?.id === p.id);
    return `<button class="lineup-choice ${lineup.selected[slotId]?.id === p.id ? 'current-choice' : ''}" data-select-player="${esc(p.id)}"><span class="choice-heading"><strong>${esc(p.name)}</strong><b>${p.rating}</b></span><span class="choice-meta">${p.age} años · POT ${p.potential} · ${p.preference + 1}.ª preferencia</span><span class="choice-meta">${p.positions.join(' → ')}</span>${source ? `<span class="choice-status">${source.id === slotId ? 'Titular actual' : `Titular en ${source.name.toLowerCase()} · se intercambiará o moverá`}</span>` : ''}</button>`;
  }).join('') || '<p class="field-help">No hay jugadores compatibles. Añade uno con esta posición desde la pestaña de opciones.</p>'}</div>${formError}<div class="modal-footer"><button class="button" id="empty-slot">Dejar sin titular</button><button class="button" data-close>Volver al once</button></div>`);
  const select = playerId => {
    if (changeSave(save.id,current => chooseStarter(current,slotId,playerId))) { modal.close(); render(); notify('Once actualizado. Elección guardada para esta formación.'); }
  };
  modal.querySelectorAll('[data-select-player]').forEach(button => button.addEventListener('click', () => select(button.dataset.selectPlayer)));
  modal.querySelector('#empty-slot').addEventListener('click', () => select(null));
}
function showError(message) { const el = modal.querySelector('#form-error'); el.hidden = false; el.textContent = message; }
modal.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) modal.close();
  if (e.target === modal) { const rect = modal.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) modal.close(); }
});

function saveDialog(id) {
  const save = data.saves.find(s => s.id === id);
  openModal(`${modalHeading('UNA NUEVA TEMPORADA', save ? 'Editar partida' : 'Nueva partida', 'Ponle nombre a tu próxima historia.')}<form id="save-form"><label class="form-label">Nombre de la partida<input name="name" required maxlength="80" placeholder="Ej. Camino a la Champions" value="${esc(save?.name || '')}" autofocus></label><label class="form-label">Club <span class="optional">opcional</span><input name="club" maxlength="80" placeholder="Ej. Real Sporting de Gijón" value="${esc(save?.club || '')}"></label>${formError}<div class="modal-footer"><button class="button" type="button" data-close>Cancelar</button><button class="button primary" type="submit">${save ? 'Guardar cambios' : 'Crear partida'} ${icon('arrow')}</button></div></form>`);
  modal.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const fields = new FormData(e.target);
    const name = fields.get('name').trim();
    const club = fields.get('club').trim();
    if (!name) { showError('Escribe un nombre para la partida.'); return; }
    const newId = save?.id || uid();
    const next = save ? { ...data, saves: data.saves.map(s=>s.id === id ? { ...s, name, club, updatedAt: new Date().toISOString() } : s) } : { ...data, saves: [...data.saves, { id: newId, name, club, players: [], formation: '4-4-2', updatedAt: new Date().toISOString() }] };
    if (commit(next)) { modal.close(); navigate(save ? activeId : newId); notify(save ? 'Partida actualizada.' : 'Partida creada. Añade tu primer jugador.'); }
  });
}
function playerDialog(id, initialPosition) {
  const save = activeSave();
  if (!save) return;
  const player = save.players.find(p=>p.id === id);
  let positions = [...(player?.positions || (initialPosition ? [initialPosition] : []))];
  openModal(`${modalHeading('FICHA DE PLANTILLA', player ? 'Editar jugador' : 'Añadir jugador', 'Sus preferencias deciden su lugar en la pizarra.')}<form id="player-form"><label class="form-label">Nombre<input name="name" required maxlength="80" placeholder="Nombre del jugador" value="${esc(player?.name || '')}" autofocus></label><fieldset class="positions-field"><legend>Posiciones <span class="optional">en orden de preferencia</span></legend><p class="field-help">Selecciona sus posiciones y usa las flechas para ordenarlas.</p><div id="selected-positions"></div><div class="position-picker" id="position-picker"></div></fieldset><div class="number-fields"><label class="form-label">Valoración<input type="number" name="rating" min="1" max="99" step="1" required placeholder="75" value="${player?.rating ?? ''}"><small>1–99</small></label><label class="form-label">Potencial<input type="number" name="potential" min="1" max="99" step="1" required placeholder="84" value="${player?.potential ?? ''}"><small>1–99</small></label><label class="form-label">Edad<input type="number" name="age" min="14" max="60" step="1" required placeholder="21" value="${player?.age ?? ''}"><small>14–60 años</small></label></div><p class="field-help">El potencial y la edad son informativos y no afectan al orden.</p>${formError}<div class="modal-footer">${player ? `<button class="icon-button danger" type="button" id="remove-player" aria-label="Eliminar jugador">${icon('trash')}</button>` : ''}<button class="button" type="button" data-close>Cancelar</button><button class="button primary" type="submit">${player ? 'Guardar cambios' : 'Añadir a plantilla'} ${icon('check')}</button></div></form>`);
  function renderPositions() {
    modal.querySelector('#selected-positions').innerHTML = positions.length ? `<div class="ordered-positions">${positions.map((p,i)=>`<div class="ordered-position"><span><small>${i + 1}.ª</small><b>${p}</b></span><div><button type="button" class="position-control" data-move="${i}" data-direction="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${p} en preferencia">↑</button><button type="button" class="position-control" data-move="${i}" data-direction="1" ${i === positions.length-1 ? 'disabled' : ''} aria-label="Bajar ${p} en preferencia">↓</button><button type="button" class="position-control" data-remove="${p}" aria-label="Quitar ${p}">×</button></div></div>`).join('')}</div>` : '<div class="position-empty">Selecciona al menos una posición ↓</div>';
    modal.querySelector('#position-picker').innerHTML = POSITIONS.map(p=>`<button type="button" class="position-option ${positions.includes(p) ? 'chosen' : ''}" data-position-option="${p}" aria-pressed="${positions.includes(p)}">${p}${positions.includes(p) ? icon('check') : ''}</button>`).join('');
  }
  renderPositions();
  modal.querySelector('.positions-field').addEventListener('click', e => {
    const option = e.target.closest('[data-position-option]');
    const remove = e.target.closest('[data-remove]');
    const move = e.target.closest('[data-move]');
    if (option) { const p = option.dataset.positionOption; positions = positions.includes(p) ? positions.filter(x=>x !== p) : [...positions,p]; }
    else if (remove) positions = positions.filter(p=>p !== remove.dataset.remove);
    else if (move && !move.disabled) { const i = Number(move.dataset.move), j = i + Number(move.dataset.direction); [positions[i],positions[j]] = [positions[j],positions[i]]; }
    else return;
    renderPositions();
    const focus = option ? modal.querySelector(`[data-position-option="${option.dataset.positionOption}"]`) : move ? modal.querySelector(`[data-move="${Number(move.dataset.move) + Number(move.dataset.direction)}"][data-direction="${move.dataset.direction}"]`) : modal.querySelector('#position-picker button');
    focus?.focus();
  });
  modal.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const fields = new FormData(e.target);
    try {
      const updated = validatePlayer({ id: player?.id || uid(), name: fields.get('name'), positions, rating: Number(fields.get('rating')), potential: Number(fields.get('potential')), age: Number(fields.get('age')) });
      if (changeSave(save.id, current => ({ ...current, players: player ? current.players.map(p=>p.id === player.id ? updated : p) : [...current.players, updated] }))) { modal.close(); render(); notify(player ? 'Jugador actualizado. Pizarra recalculada.' : 'Jugador añadido a la plantilla.'); }
    } catch (err) { showError(err.message); }
  });
  modal.querySelector('#remove-player')?.addEventListener('click', () => confirmDialog('Eliminar jugador', `¿Eliminar a ${player.name} de esta plantilla? Esta acción no se puede deshacer.`, 'Eliminar jugador', () => {
    if (changeSave(save.id,current=>({ ...current, players: current.players.filter(p=>p.id !== player.id) }))) { modal.close(); render(); notify('Jugador eliminado.'); }
  }));
}
function confirmDialog(title, description, label, action, danger = true) {
  if (modal.open) modal.close();
  openModal(`${modalHeading(danger ? 'CONFIRMAR CAMBIO' : 'COPIA DE SEGURIDAD', esc(title))}<p class="confirm-description">${esc(description)}</p><div class="modal-footer"><button class="button" data-close>Cancelar</button><button class="button ${danger ? 'danger-solid' : 'primary'}" id="confirm-action">${esc(label)}</button></div>`);
  modal.querySelector('#confirm-action').addEventListener('click', action);
}
function exportJson(value, filename) {
  const blob = new Blob([JSON.stringify(value,null,2)],{ type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function backup(saves = data.saves) {
  exportJson({ version: 1, exportedAt: new Date().toISOString(), saves }, `modo-carrera-${new Date().toISOString().slice(0,10)}.json`);
  notify('Copia JSON exportada. Guárdala en un lugar seguro.');
}
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0]; fileInput.value = '';
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { notify('El JSON supera el límite de 5 MB.'); return; }
  try {
    const incoming = validateData(JSON.parse(await file.text()));
    if (!incoming.saves.length) { notify('Esta copia no contiene partidas.'); return; }
    confirmDialog('Importar partidas', `Se añadirán ${plural(incoming.saves.length, 'partida')} (${incoming.saves.map(s=>s.name).join(', ')}). Se crearán copias independientes; tus partidas actuales se conservarán.`, 'Importar copia', () => {
      try { if (commit(mergeBackup(data,incoming))) { modal.close(); navigate(); notify('Partidas importadas como copias independientes.'); } } catch (err) { notify(err.message); }
    },false);
  } catch (err) { notify(err instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : err.message); }
});
function createDemo() {
  const samples = [
    ['Adrián Vega',['POR'],76,82,24],['Diego Ríos',['POR'],69,80,20],['Hugo Martín',['LI','CAI'],74,81,23],['Pablo Serrano',['DFC'],78,82,27],['Álex Torres',['DFC','MCD'],75,86,21],['Mateo Gil',['DFC','LD'],71,83,20],['Lucas Vidal',['LD','CAD'],76,80,25],['Iker Santos',['MI','EI'],77,85,22],['Jugador A',['MC','MCD'],70,82,21],['Jugador B',['MCO','MC'],80,87,23],['Nicolás León',['MC','MCO'],76,84,24],['Bruno Costa',['MD','ED'],75,80,26],['Daniel Soler',['DC','SD'],79,85,23],['Leo Romero',['DC'],73,88,19],['Óscar Navarro',['ED','SD'],77,81,25],
  ];
  const save = { id: uid(), name: 'Una nueva era', club: 'Club de ejemplo · Datos ficticios', formation: '4-4-2', updatedAt: new Date().toISOString(), players: samples.map(([name,positions,rating,potential,age])=>({ id: uid(),name,positions,rating,potential,age })) };
  if (commit({ ...data, saves: [...data.saves,save] })) { navigate(save.id); notify('Ejemplo creado con jugadores ficticios. Puedes editarlo o eliminarlo.'); }
}
app.addEventListener('change', e => {
  if (e.target.id === 'formation') { const save = activeSave(); if (changeSave(save.id, s=>({ ...s,formation:e.target.value }))) { render(); document.querySelector('#formation').focus(); notify('Formación actualizada. Asignación recalculada.'); } else render(); }
});
app.addEventListener('keydown', e => {
  if (!e.target.matches('[role="tab"]')) return;
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const view = e.key === 'Home' ? 'opciones' : e.key === 'End' ? 'titulares' : activeView === 'opciones' ? 'titulares' : 'opciones';
  document.querySelector(`#tab-${view}`).click();
});
app.addEventListener('click', e => {
  const button = e.target.closest('[data-action]');
  if (!button || button.disabled) return;
  e.preventDefault();
  const { action,id,position } = button.dataset;
  if (action === 'board-view') {
    activeView = button.dataset.view;
    history.replaceState(null, '', `#partida=${encodeURIComponent(activeId)}&vista=${activeView}`);
    render();
    document.querySelector(`#tab-${activeView}`).focus({ preventScroll: true });
  }
  else if (action === 'home') navigate();
  else if (action === 'new-save') saveDialog();
  else if (action === 'open-save') navigate(id);
  else if (action === 'rename-save') saveDialog(id);
  else if (action === 'add-player') playerDialog(null,position);
  else if (action === 'edit-player') playerDialog(id);
  else if (action === 'choose-starter') starterDialog(button.dataset.slot);
  else if (action === 'reset-lineup') {
    const save = activeSave();
    if (changeSave(save.id,current => { const lineups = { ...current.lineups }; delete lineups[current.formation]; return { ...current,lineups }; })) { render(); notify('Once automático restablecido para esta formación.'); }
  }
  else if (action === 'delete-save') {
    const save = data.saves.find(s=>s.id === id);
    confirmDialog('Eliminar partida', `¿Eliminar «${save.name}» y sus ${plural(save.players.length, 'jugador', 'jugadores')}? Exporta una copia si quieres conservarla. Esta acción no se puede deshacer.`, 'Eliminar partida', () => { if (commit({ ...data,saves:data.saves.filter(s=>s.id !== id) })) { modal.close(); navigate(activeId === id ? null : activeId); notify('Partida eliminada.'); } });
  }
  else if (action === 'export-all') backup();
  else if (action === 'export-save') backup([activeSave()]);
  else if (action === 'import') fileInput.click();
  else if (action === 'demo') createDemo();
  else if (action === 'raw-backup') { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw === null) notify('No hay datos originales disponibles.'); else { exportJson({ raw },'modo-carrera-recuperacion.json'); notify('Datos originales descargados para recuperación.'); } } catch { notify('El navegador no permite acceder al almacenamiento.'); } }
  else if (action === 'reset-storage') confirmDialog('Restablecer almacenamiento', 'Se eliminarán los datos locales que no se han podido leer. Descarga los datos originales antes de continuar.', 'Restablecer', () => { try { localStorage.removeItem(STORAGE_KEY); storageProblem = false; data = { version: 1,saves:[] }; modal.close(); navigate(); notify('Almacenamiento restablecido.'); } catch { notify('El navegador bloquea el almacenamiento. Revisa sus permisos.'); } });
});
syncRoute();
