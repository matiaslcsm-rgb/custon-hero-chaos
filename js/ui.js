// Interfaz: paneles de selección/draft/tienda, códice de héroes, HUD de stats y render del canvas.

const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d');
const TILE = 26;
canvas.width = COLS * TILE; canvas.height = ROWS * TILE;

function setStateText(text) { document.getElementById('game-state-text').textContent = text; }
function showPanel(id, visible) { document.getElementById(id).style.display = visible ? 'block' : 'none'; }

// --- SELECCIÓN DE HÉROE ---
function initHeroSelect() {
    const container = document.getElementById('hero-options');
    container.innerHTML = '';
    Object.values(HERO_TEMPLATES).forEach(t => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        const scalingText = `Escalado: +${t.scaling.perKillsAmount} ${scalingStatLabel(t.scaling.stat)} cada ${t.scaling.perKills} bajas &middot; +${t.scaling.perHeroKill} al ganar un duelo.`;
        card.innerHTML = `<h4>[${t.symbol}] ${t.name} (${t.primaryAttr})</h4><p>${t.description}</p><p style="color:#ffb703; margin-top:4px;">${scalingText}</p>`;
        card.onclick = () => selectHero(t);
        container.appendChild(card);
    });
}

// --- CÓDICE DE HÉROES (referencia navegable, no afecta una partida en curso) ---
function renderHeroCodex() {
    const list = document.getElementById('codex-hero-list');
    list.innerHTML = '';
    Object.values(HERO_TEMPLATES).forEach(t => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.innerHTML = `<h4>[${t.symbol}] ${t.name}</h4><p>${t.primaryAttr} &middot; ${t.description}</p>`;
        card.onclick = () => renderCodexDetail(t);
        list.appendChild(card);
    });
}

function renderCodexDetail(t) {
    const ref = new Hero(t); // instancia de referencia solo para calcular stats base (str 20/agi 15/int 15, sin ítems ni skills)
    const detail = document.getElementById('codex-detail');
    const draftable = Object.values(HERO_SKILLS[t.key]);
    const statRows = [
        ['HP máx.', ref.maxHp], ['Maná máx.', ref.maxMana],
        ['Daño de ataque', ref.atk], ['Vel. de ataque', ref.atkSpeed.toFixed(2)],
        ['Rango de ataque', ref.attackRange], ['Vel. de proyectil', ref.projectileSpeed || 'Melé (instantáneo)'],
        ['Armadura física', ref.armor], ['Resistencia mágica', ref.magicResist + '%'],
        ['Regen. HP', ref.hpRegen.toFixed(2) + '/s'], ['Regen. Maná', ref.manaRegen.toFixed(2) + '/s'],
        ['Vel. de movimiento', ref.moveSpeed.toFixed(2)], ['Prob. de crítico', ref.critChance.toFixed(1) + '%'],
        ['Prob. de esquivar', ref.evasion + '%'], ['Amp. de hechizo', ref.spellAmp.toFixed(1) + '%'],
        ['Robo de vida', ref.lifesteal + '%'], ['Rol', t.role]
    ];
    const ult = HERO_ULTIMATES[t.key];
    let html = `<h3>[${t.symbol}] ${t.name} &mdash; ${t.primaryAttr}</h3><p style="color:#bbb;">${t.description}</p>`;
    html += `<div class="codex-sub">Stats base (STR 20 / AGI 15 / INT 15, sin ítems)</div>`;
    html += `<div class="stat-grid">${statRows.map(r => `<div>${r[0]}: <strong>${r[1]}</strong></div>`).join('')}</div>`;
    html += `<div class="codex-sub">Escalado de arquetipo</div>`;
    html += `<div class="ability-row"><p>+${t.scaling.perKillsAmount} ${scalingStatLabel(t.scaling.stat)} cada ${t.scaling.perKills} bajas de creeps &middot; +${t.scaling.perHeroKill} al ganar un duelo 1v1.</p></div>`;
    html += `<div class="codex-sub">Pasiva fija (siempre activa, no se draftea)</div>`;
    html += `<div class="ability-row fixed"><h4>${t.archetypePassive.name}</h4><p>${t.archetypePassive.description}</p></div>`;
    html += `<div class="codex-sub">Habilidades normales (elegís ${draftable.length} de ${draftable.length} a lo largo de la partida, 1 por vez)</div>`;
    html += draftable.map(s => `<div class="ability-row"><h4>${s.name}</h4><p>${s.description}</p></div>`).join('');
    html += `<div class="codex-sub">Habilidad definitiva (se desbloquea sola al aprender las 3 normales)</div>`;
    html += `<div class="ability-row fixed"><h4>${ult.name}</h4><p>${ult.description}</p></div>`;
    detail.innerHTML = html;
}

function showView(view) {
    document.getElementById('view-game').style.display = view === 'game' ? 'flex' : 'none';
    document.getElementById('view-heroes').style.display = view === 'heroes' ? 'block' : 'none';
    document.getElementById('nav-game').classList.toggle('active', view === 'game');
    document.getElementById('nav-heroes').classList.toggle('active', view === 'heroes');
}

// --- DRAFT Y TIENDA ---
function renderDraft() {
    const c = document.getElementById('draft-options'); c.innerHTML = '';
    const remaining = Object.values(HERO_SKILLS[player.key]).filter(s => !player.hasSkill(s.id));
    const pool = shuffle(remaining.slice()).slice(0, 3);
    pool.forEach(s => {
        const card = document.createElement('div'); card.className = 'skill-card';
        card.innerHTML = `<h4>${s.name}</h4><p>${s.description}</p>`;
        card.onclick = () => learnSkill(s);
        c.appendChild(card);
    });
}

function renderShop() {
    const c = document.getElementById('shop-options'); c.innerHTML = '';
    Object.values(ITEMS).forEach(i => {
        const card = document.createElement('div'); card.className = 'skill-card';
        card.innerHTML = `<h4>${i.name}</h4><p>${i.desc}</p>`;
        card.onclick = () => buyItem(i);
        c.appendChild(card);
    });
}

// --- HUD ---
function renderCooldownBar() {
    const bar = document.getElementById('cooldown-bar'); bar.innerHTML = '';
    player.skills.filter(s => s.cooldown).forEach(s => {
        const remaining = Math.max(0, (player.cooldowns[s.id] || 0));
        const span = document.createElement('span');
        span.className = remaining <= 0 ? 'ready' : '';
        span.textContent = `[${s.keybind.toUpperCase()}] ${s.name}: ${remaining <= 0 ? 'Listo' : remaining.toFixed(1) + 's'}`;
        bar.appendChild(span);
    });
}

function updateHud() {
    if (!player) return;
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-hp').textContent = `${Math.round(player.hp)}/${player.maxHp}`;
    document.getElementById('player-mana').textContent = `${Math.round(player.mana)}/${player.maxMana}`;
    document.getElementById('player-gold').textContent = player.gold;
    document.getElementById('round-num').textContent = Math.min(waveNumber, NORMAL_WAVES) + (isBossWave ? ' (JEFE)' : '');
    document.getElementById('stat-str').textContent = player.str;
    document.getElementById('stat-agi').textContent = player.agi;
    document.getElementById('stat-int').textContent = player.int;
    document.getElementById('stat-armor').textContent = player.armor.toFixed(1);
    document.getElementById('extra-stats').textContent =
        `RM: ${player.magicResist.toFixed(0)}% | Crít: ${player.critChance.toFixed(1)}% | Evasión: ${player.evasion.toFixed(1)}% | ` +
        `Amp.Hechizo: ${player.spellAmp.toFixed(1)}% | Robo Vida: ${player.lifesteal.toFixed(1)}% | Regen: ${player.hpRegen.toFixed(1)} HP/s, ${player.manaRegen.toFixed(1)} Maná/s | ` +
        `Vel.Mov: ${player.moveSpeed.toFixed(1)}${player.projectileSpeed > 0 ? ` | Vel.Proyectil: ${player.projectileSpeed.toFixed(1)}` : ''}`;
    document.getElementById('lives-text').textContent = '♥'.repeat(Math.max(0, player.lives)) + '♡'.repeat(Math.max(0, 2 - player.lives));
    document.getElementById('skills-owned').textContent = player.skills.length ? ('Habilidades: ' + player.skills.map(s => s.name).join(', ')) : '';
    if (player.scaling) {
        const bonusMap = { armor: player.bonusArmor, atk: player.bonusAtk, critChance: player.bonusCritChance, lifesteal: player.bonusLifesteal };
        const bonusSoFar = bonusMap[player.scaling.stat] || 0;
        const toNext = player.scaling.perKills - (player.creepKillCount % player.scaling.perKills);
        document.getElementById('scaling-info').textContent = `Escalado: +${bonusSoFar.toFixed(1)} ${scalingStatLabel(player.scaling.stat)} acumulado (${player.creepKillCount} bajas, próximo bonus en ${toNext})`;
    }
    if (gameState === 'WAVE') renderCooldownBar();
}

// Deja la interfaz como al abrir el juego (usado por "Nueva Partida").
function resetHud() {
    ['draft-container', 'shop-container', 'restart-btn'].forEach(id => showPanel(id, false));
    showPanel('hero-select-panel', true);
    setStateText('SELECCIÓN DE HÉROE');
    document.getElementById('player-name').textContent = 'Ninguno';
    document.getElementById('round-num').textContent = '1';
    ['cooldown-bar', 'combat-log'].forEach(id => document.getElementById(id).innerHTML = '');
    ['skills-owned', 'scaling-info', 'extra-stats'].forEach(id => document.getElementById(id).textContent = '');
}

// --- RENDER DEL CANVAS ---
function drawUnit(u, color, symbol) {
    const cx = u.x * TILE + TILE / 2, cy = u.y * TILE + TILE / 2;
    ctx.fillStyle = color; ctx.fillText(symbol, cx, cy);
    if (u.maxHp) {
        const pct = Math.max(0, u.hp / u.maxHp);
        ctx.fillStyle = '#333'; ctx.fillRect(cx - TILE / 2 + 2, cy - TILE / 2 + 2, TILE - 4, 3);
        ctx.fillStyle = pct > 0.5 ? '#00f5d4' : pct > 0.25 ? '#ffb703' : '#ff0055';
        ctx.fillRect(cx - TILE / 2 + 2, cy - TILE / 2 + 2, (TILE - 4) * pct, 3);
    }
}

function render() {
    ctx.fillStyle = '#050507'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#151821';
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);

    // Aura del jefe
    if (gameState === 'WAVE' && boss && boss.isAlive()) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,0,85,0.4)';
        ctx.arc(boss.x * TILE + TILE / 2, boss.y * TILE + TILE / 2, boss.auraRadius * TILE, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (gameState === 'WAVE') {
        creeps.forEach(c => { if (c.isAlive()) drawUnit(c, c.color, c.symbol); });
        ctx.fillStyle = '#fefae0';
        projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, 3, 0, Math.PI * 2); ctx.fill(); });
    }
    if (player && player.isAlive() && (gameState === 'WAVE' || gameState === 'PREP')) {
        const invulnerable = gameState === 'WAVE' && player.invulnerableUntil > gameClock;
        drawUnit({ x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp }, invulnerable ? '#ffffff' : '#00f5d4', player.symbol);
    }
}
