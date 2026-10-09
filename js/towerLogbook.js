// Tower Chaos: la Bitácora (REWORK.md §6, 2026-10-08).
//
//   Un solo libro con pestañas en vez de tres ventanas sueltas: ✏️ Cuaderno (N) · 📜 Códice (J) · 🐾 Bestiario (K).
//   Cada tecla abre el libro en su pestaña; la misma tecla lo cierra y otra cambia de pestaña (como el diario de Hades
//   o el Compendio de Hollow Knight). El Bestiario ahora se guarda entre runs: además de las criaturas de esta run,
//   una colección con todas las que viste alguna vez, cuántas veces las cruzaste y cuántas mataste.

const LOGBOOK_TABS = {
    notebook: { label: '✏️ Cuaderno', key: 'notebook', render: () => renderNotebook() },
    codex: { label: '📜 Códice', key: 'codex', render: () => renderCodex() },
    bestiary: { label: '🐾 Bestiario', key: 'bestiary', render: () => renderBestiary() }
};
let logbookTab = null;
function openLogbook(tab) {
    if (gameMode !== 'tower' || (tab !== 'codex' && !towerRun)) return;
    logbookTab = tab;
    notebookOpen = tab === 'notebook'; codexOpen = tab === 'codex'; bestiaryOpen = tab === 'bestiary';
    showPanel('logbook-container', true);
    document.querySelectorAll('#logbook-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.logbook-pane').forEach(p => { p.style.display = p.dataset.pane === tab ? '' : 'none'; });
    document.getElementById('codex-count').textContent = '';
    LOGBOOK_TABS[tab].render();
    bestiarySave();
}
function closeLogbook() {
    logbookTab = null; notebookOpen = codexOpen = bestiaryOpen = false;
    showPanel('logbook-container', false);
}
// La tecla de una pestaña: si el libro está en esa pestaña, lo cierra; si no, lo abre (o cambia) a esa pestaña
function toggleLogbookTab(tab, open) {
    if (open === undefined) open = logbookTab !== tab;
    if (open) openLogbook(tab); else if (logbookTab === tab) closeLogbook();
}
function renderLogbookTabs() {
    const bar = document.getElementById('logbook-tabs');
    if (!bar || bar.childElementCount) return;
    Object.entries(LOGBOOK_TABS).forEach(([k, t]) => {
        const b = document.createElement('button'); b.dataset.tab = k;
        b.innerHTML = `${t.label} <small>${keyName(KEYMAP[t.key])}</small>`;
        b.onclick = () => openLogbook(k);
        bar.appendChild(b);
    });
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', renderLogbookTabs);

// --- BESTIARIO QUE SE GUARDA ENTRE RUNS ---
let bestiaryPersist = true; // las pruebas lo apagan
const BESTIARY_KEY = 'chc-bestiary', BESTIARY_CAP = 400;
function bestiaryLoad() { try { const b = JSON.parse(localStorage.getItem(BESTIARY_KEY) || 'null'); if (b && b.beasts) return b; } catch (e) { /* vacío */ } return { beasts: {} }; }
let bestiaryStore = bestiaryLoad();
function bestiarySave() { if (!bestiaryPersist) return; try { localStorage.setItem(BESTIARY_KEY, JSON.stringify(bestiaryStore)); } catch (e) { /* no se guarda */ } }
// Lo que se guarda de una criatura (sin funciones): lo justo para dibujarla y describirla
function beastRecord(t) {
    return { label: t.label, biome: t.biome, plan: t.plan, color: t.color, scale: t.scale, parts: t.parts, traits: t.traits, trait: t.trait, genome: t.genome,
        mechanic: t.mechanic, hp: t.hp, atk: t.atk, attackType: t.attackType, range: t.range, armor: t.armor, from: t.from, bulletPattern: t.bulletPattern };
}
function rememberBeast(t) {
    if (!t || !t.genome) return;
    const b = bestiaryStore.beasts[t.label];
    if (b) { if (!towerRun || b.lastRun !== towerRun.startedAt) { b.runs = (b.runs || 1) + 1; b.lastRun = towerRun && towerRun.startedAt; } }
    else {
        const keys = Object.keys(bestiaryStore.beasts);
        if (keys.length >= BESTIARY_CAP) delete bestiaryStore.beasts[keys[0]]; // la más vieja deja lugar
        bestiaryStore.beasts[t.label] = Object.assign(beastRecord(t), { runs: 1, kills: 0, lastRun: towerRun && towerRun.startedAt });
    }
    bestiarySave();
}
function rememberBeastKill(t) {
    const b = t && bestiaryStore.beasts[t.label];
    if (!b) return;
    b.kills = (b.kills || 0) + 1;
    if (b.kills % 10 === 0) bestiarySave(); // de a tandas (se guarda también al abrir la Bitácora)
}
let bestiaryView = 'run'; // 'run' (esta run) | 'all' (la colección)
