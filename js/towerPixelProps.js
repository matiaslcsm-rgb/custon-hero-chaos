// Infinite Tower: objetos del mundo en pixel art (2026-10-13, estilo principal de la Torre; va con el suelo en pixel art, towerPixel.js).
//
//   Cofres, botín, antorchas y fogatas, mercader, herrero y yunque, santuarios, las armas clavadas del despertar, la
//   piedra de regreso, los menhires del círculo, la escalera, las cuevas (boca, pozo y soga), tus restos y los eventos
//   (carreta, cofre maldito, mercader ambulante y prisionero). Cada función de dibujo de siempre pregunta pixelOn() al
//   empezar y, si está prendido, dibuja acá. Los carteles van en letra clara con borde oscuro (se leen en suelo oscuro).

const PXP_STONE = ['#3e3a37', '#55504b', '#6e6862', '#8a837b', '#a69e95'];
const pxpCache = {};
function pxProp(key, w, h, paint) { return pxpCache[key] || (pxpCache[key] = pxSprite(w, h, paint)); }
// Dibuja un sprite con la base (los pies) en (cx, by)
function pxPut(img, cx, by, s = PXG.scale) {
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(cx - img.width * s / 2), Math.round(by - img.height * s), img.width * s, img.height * s);
    ctx.imageSmoothingEnabled = sm;
}
function pxLabel(text, x, y, color = '#f2e6c8') {
    ctx.save(); ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,9,8,0.9)'; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
    ctx.restore();
}
function pxGlow(cx, cy, rx, ry, color, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
const pxFrameK = (speed = 8, n = 3, off = 0) => Math.floor(fxClock * speed + off) % n;
const tileBase = (x, y) => [x * TILE + TILE / 2, y * TILE + TILE - 2]; // centro de la casilla y su borde de abajo

// --- FUEGO ---
function pxFlame(k, big) {
    const w = big ? 11 : 7, h = big ? 14 : 10;
    return pxProp(`flame${big ? 'B' : ''}${k}`, w, h, S => {
        const cx = (w - 1) / 2, sway = [0, 1, -1][k];
        const layer = (wd, top, col) => S.tri([cx - wd, h - 1], [cx + wd + 1, h - 1], [cx + sway * (top < 4 ? 1 : 0.5), top], col);
        layer(w / 2, 0 + (k === 1 ? 1 : 0), '#c8401a'); layer(w / 2 - 1.2, 2, '#ff8a1a'); layer(w / 2 - 2.4, 4 + (k === 2 ? 1 : 0), '#ffd166'); S.set(cx, h - 3, '#fff0a0'); S.set(cx, h - 2, '#fff0a0');
    });
}
// Fogata: piedras en ronda y troncos cruzados (la llama va aparte); también la usa la portada (titleScreen.js)
function pxCampfire() {
    return pxProp('campfire', 18, 9, S => {
        pxShadow(S, 9, 7, 8, 1.6);
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; S.ball(9 + Math.cos(a) * 6.5, 5.5 + Math.sin(a) * 2.2, 1.5, 1.2, PXP_STONE); }
        S.line(4, 7, 14, 3, PXB_WOOD[1], 1); S.line(4, 3, 14, 7, PXB_WOOD[2], 1); S.outline('#110d0b');
    });
}
function pxDrawLights(level) {
    towerLights(level).forEach(o => {
        if (o.noDraw || !canSeeOrExplored(level, o)) return;
        const [cx, by] = tileBase(o.x, o.y), k = pxFrameK(9, 3, o.x * 0.37);
        if (o.kind === 'torch') {
            pxPut(pxProp('torch', 5, 16, S => { pxShadow(S, 2, 15, 2, 0.8); S.line(2, 15, 2, 4, PXB_WOOD[1]); S.line(3, 14, 3, 5, PXB_WOOD[2]); S.rect(1, 3, 3, 2, '#3a3028'); S.outline('#110d0b'); }), cx, by);
            pxGlow(cx, by - 30, 9, 9, '#ff9a3a', 0.18 + 0.06 * k);
            pxPut(pxFlame(k, false), cx + 1, by - 24);
        } else {
            pxPut(pxCampfire(), cx, by);
            pxGlow(cx, by - 14, 16, 12, '#ff9a3a', 0.16 + 0.06 * k);
            pxPut(pxFlame(k, true), cx, by - 6);
            if (o.camp && towerDarkness() >= 0.5 && Math.hypot(player.x - o.x, player.y - o.y) <= ATMOS.campReach + 2) pxLabel('fogata: descansá', cx, by - TILE * 1.1, '#ffcf6a');
        }
    });
}

// --- COFRES Y BOTÍN ---
function pxChest(open, cursed) {
    const W = cursed ? ['#24142e', '#36204a', '#4a2f5e', '#5e3d74', '#74508c'] : ['#3a2414', '#553620', '#6e4a2c', '#8a5e38', '#a87446'];
    const band = cursed ? '#c9a3e6' : '#e0b84a';
    return pxProp(`chest${open ? 'O' : ''}${cursed ? 'C' : ''}`, 16, 14, S => {
        pxShadow(S, 8, 13, 7, 1.4);
        S.rect(2, 7, 12, 6, W[2]); S.rect(2, 7, 12, 1, W[3]); for (let x = 2; x < 14; x += 4) S.rect(x, 8, 1, 5, W[1]);
        if (open) { S.rect(2, 2, 12, 4, W[1]); S.rect(3, 3, 10, 2, W[0]); S.rect(3, 6, 10, 1, '#120c08'); S.set(5, 6, '#ffe9a0'); S.set(10, 6, '#ffe9a0'); }
        else { S.rect(2, 3, 12, 4, W[3]); S.rect(3, 2, 10, 1, W[4]); S.rect(2, 6, 12, 1, W[1]); S.rect(7, 5, 2, 3, band); S.set(7, 7, '#2a1d14'); }
        S.rect(2, 9, 12, 1, band); S.set(2, 9, shade(band, -0.3)); S.set(13, 9, shade(band, -0.3));
        S.outline('#110d0b');
    });
}
function pxDrawLoot(level) {
    (level.chests || []).forEach(ch => {
        if ((!canSee(level, ch.x, ch.y) && !level.explored[ch.y][ch.x]) || chestUnderWater(level, ch)) return; // hundido: no se ve (towerQuests.js)
        const [cx, by] = tileBase(ch.x, ch.y);
        if (!ch.open) pxGlow(cx, by - 4, 13, 5, '#ffd166', 0.12 + 0.08 * Math.sin(fxClock * 3 + ch.x));
        pxPut(pxChest(ch.open, false), cx, by);
    });
    (level.drops || []).forEach(d => {
        if (!canSee(level, d.x, d.y)) return;
        const cx = d.x * TILE + TILE / 2, cy = d.y * TILE + TILE / 2, color = ITEM_QUALITY[d.item.quality].color, ok = lootAllowed(d.item);
        ctx.save(); if (!ok) ctx.globalAlpha = 0.35;
        // Haz de luz del color de la calidad (como el botín de Risk of Rain), de a píxeles
        const p = 0.5 + 0.5 * Math.sin(fxClock * 4 + d.x);
        for (let i = 0; i < 9; i++) { ctx.globalAlpha = (ok ? 1 : 0.35) * (0.5 - i * 0.05) * (0.6 + 0.4 * p); ctx.fillStyle = color; ctx.fillRect(Math.round(cx - 2), Math.round(cy + 8 - i * 4), 4, 4); }
        ctx.globalAlpha = ok ? 1 : 0.35;
        const img = towerIconImage(d.item);
        if (img.complete) ctx.drawImage(img, cx - 9, cy - 9 + Math.sin(fxClock * 3 + d.y) * 1.5, 18, 18);
        ctx.restore();
    });
}

// --- PERSONAJES DEL PUEBLO ---
function pxNpc(kind, k) {
    const key = 'npc' + kind + k;
    if (pxpCache[key]) return pxpCache[key];
    const f = { walk: -1, idle: k, ph: 0, bob: 0, br: k };
    const look = { merchant: ['#8a6a46', { robe: true, head: 'hood', weapon: 'lantern' }, 'pack'], peddler: ['#a47148', { robe: true, head: 'hat', weapon: 'lantern' }, 'bigpack'],
        smith: ['#5c4033', { head: 'skin', hair: '#2a1d14', weapon: 'hammer', belt: '#2a1d14' }, 'apron'], prisoner: ['#7f8f80', { head: 'skin', hair: '#5a4a3a' }, null] }[kind];
    const P = pxbPalette(look[0]);
    return (pxpCache[key] = pxSprite(14 + PXB_PAD * 2, 22 + PXB_PAD, S => {
        S.tx = PXB_PAD; S.ty = PXB_PAD;
        if (look[2] === 'pack' || look[2] === 'bigpack') { const big = look[2] === 'bigpack'; S.rect(big ? -3 : -1, big ? 3 : 7, big ? 7 : 5, big ? 12 : 8, PXB_WOOD[1]); S.rect(big ? -3 : -1, big ? 3 : 7, big ? 7 : 5, 1, PXB_WOOD[2]); S.set(1, big ? 8 : 10, '#c9a227'); }
        pxbHumanoid(S, P, f, look[1]);
        if (look[2] === 'apron') { S.rect(5, 12, 4, 5, '#3a2a1c'); S.rect(5, 12, 4, 1, '#55402c'); }
        S.outline('#110d0b');
    }));
}
function pxDrawNpc(kind, x, y, label, flip = false) {
    const [cx, by] = tileBase(x, y), img = pxNpc(kind, pxFrameK(1.6, 2, x * 0.3));
    ctx.save(); ctx.translate(cx, 0); if (flip) ctx.scale(-1, 1); pxPut(img, 0, by); ctx.restore();
    if (label) pxLabel(label, cx, y * TILE - TILE * 0.55);
}
function pxDrawMerchant(level) {
    const m = level.town && level.town.merchant;
    if (!m || !level.explored[m.y][m.x]) return;
    pxDrawNpc('merchant', m.x, m.y, 'Mercader (B)');
}
function pxDrawSmith(level) {
    const s = level.town && level.town.smith;
    if (!s || !level.explored[s.y][s.x]) return;
    const [cx, by] = tileBase(s.x, s.y);
    pxPut(pxProp('anvil', 13, 8, S => { pxShadow(S, 6, 7, 6, 1.2); S.rect(1, 1, 11, 2, PXB_STEEL[1]); S.rect(1, 1, 11, 1, PXB_STEEL[2]); S.rect(9, 1, 3, 1, PXB_STEEL[3]); S.rect(4, 3, 5, 2, PXB_STEEL[0]); S.rect(3, 5, 7, 2, PXB_STEEL[1]); S.outline('#110d0b'); }), cx + TILE * 0.85, by);
    if (Math.sin(fxClock * 5) > 0.6) { ctx.fillStyle = '#ffb703'; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(cx + TILE * (0.7 + 0.3 * Math.random())), Math.round(by - TILE * (0.6 + 0.3 * Math.random())), 2, 2); }
    pxDrawNpc('smith', s.x, s.y, 'Herrero (B)');
}

// --- SANTUARIOS, PIEDRA DE REGRESO Y MENHIRES ---
function pxDrawShrines(level) {
    (level.shrines || []).forEach(s => {
        if (!level.explored[s.y][s.x]) return;
        const S = SHRINES[s.kind], [cx, by] = tileBase(s.x, s.y);
        if (!s.used) pxGlow(cx, by - 2, 15, 5, S.color, 0.3 + 0.2 * Math.sin(fxClock * 3));
        pxPut(pxProp('shrine' + (s.used ? 'U' : s.kind), 11, 19, Sp => {
            pxShadow(Sp, 5, 18, 5, 1.2);
            Sp.rect(1, 16, 9, 2, PXP_STONE[1]); Sp.rect(1, 16, 9, 1, PXP_STONE[2]);
            for (let y = 3; y < 16; y++) { const half = 2 + (y - 3) * 0.12; for (let x = Math.round(5 - half); x <= Math.round(5 + half); x++) Sp.set(x, y, x < 5 ? PXP_STONE[3] : x > 5 ? PXP_STONE[1] : PXP_STONE[2]); }
            Sp.tri([3, 3], [8, 3], [5.5, 0], PXP_STONE[3]);
            const g = s.used ? ['#4a4440', '#5a544e', '#6b6155', '#6b6155', '#7a7068'] : [shade(S.color, -0.4), shade(S.color, -0.15), S.color, shade(S.color, 0.3), '#ffffff'];
            Sp.ball(5.5, 8.5, 1.8, 1.8, g);
            Sp.outline('#110d0b');
        }), cx, by);
    });
}
// La página de Arén: un papel arrugado en el piso que brilla apenas (towerLore.js)
function pxDrawArenPage(level) {
    const p = level.arenPage;
    if (!p || !level.explored[p.y][p.x]) return;
    const [cx, by] = tileBase(p.x, p.y);
    pxGlow(cx, by - 2, 10, 4, '#fff3c4', 0.2 + 0.15 * Math.sin(fxClock * 2.4));
    pxPut(pxProp('arenPage', 9, 7, S => {
        pxShadow(S, 4, 6, 4, 1);
        S.rect(1, 1, 7, 5, '#e9dcc0'); S.rect(1, 1, 7, 1, '#f7efd9'); S.rect(6, 4, 2, 2, '#c9b48a');
        S.line(2, 3, 5, 3, '#6b5a44'); S.line(2, 4, 4, 4, '#6b5a44');
        S.outline('#110d0b');
    }), cx, by);
}
function pxDrawWaystone(level) {
    const w = waystoneSpot(level);
    if (!w || !level.explored[w.y] || !level.explored[w.y][w.x]) return;
    const [cx, by] = tileBase(w.x, w.y), on = waystoneFloors().length > 0, pulse = 0.5 + 0.5 * Math.sin(fxClock * 2.5);
    if (on) pxGlow(cx, by - 3, 18, 6, '#7b6cf6', 0.18 + 0.18 * pulse);
    pxPut(pxProp('waystone' + (on ? 'On' : ''), 12, 22, S => {
        pxShadow(S, 6, 21, 6, 1.4);
        S.ball(6, 12, 4.6, 9.5, PXP_STONE); S.rect(2, 19, 9, 2, PXP_STONE[1]);
        const r = on ? '#a99bff' : '#2c2724';
        S.line(4, 7, 6, 9, r); S.line(6, 9, 4, 11, r); S.line(8, 6, 8, 14, r); S.set(5, 15, r); S.set(7, 16, r);
        S.outline('#110d0b');
    }), cx, by);
    if (on && nearWaystone()) pxLabel(`${keyName(KEYMAP.interact)}: piedra de regreso`, cx, by + TILE * 0.3, '#c8bfff');
}
function pxDrawMenhirs(level) {
    if (level.floor !== 1 || level.isCave || !level.explored[level.start.y][level.start.x]) return;
    const cx = level.start.x * TILE + TILE / 2, cy = level.start.y * TILE + TILE / 2;
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        pxPut(pxProp('menhir' + (i % 3), 8, 13, S => { pxShadow(S, 4, 12, 3.5, 1); S.ball(4, 6.5, 2.8, 5.8 - (i % 3) * 0.6, PXP_STONE); if (i % 3 === 1) S.set(3, 5, '#5d7d34'); S.set(5, 9, '#4f6b2e'); S.outline('#110d0b'); }), cx + Math.cos(a) * TILE * 1.6, cy + Math.sin(a) * TILE * 1.6 + 8);
    }
}

// --- ARMAS CLAVADAS DEL DESPERTAR ---
function pxStuckWeapon(key) {
    return pxProp('stuck' + key, 14, 22, S => {
        pxShadow(S, 7, 20, 5, 1.2);
        if (key === 'ADVENTURER_SWORD') { S.line(7, 19, 7, 6, PXB_STEEL[3]); S.line(8, 19, 8, 7, PXB_STEEL[1]); S.rect(5, 5, 6, 1, '#c9a227'); S.line(7, 4, 7, 1, PXB_WOOD[1]); S.set(7, 0, '#e0b84a'); }
        else if (key === 'ADVENTURER_BOW') { for (let k = -8; k <= 8; k++) S.set(6 + Math.round(3 * Math.cos(k / 8 * 1.3)), 10 + k, PXB_WOOD[2]); S.line(6, 2, 6, 18, '#e0d8c8'); S.line(8, 4, 11, 19, PXB_WOOD[1]); S.set(8, 3, PXB_STEEL[3]); }
        else { S.line(7, 20, 7, 4, PXB_WOOD[1]); S.line(8, 20, 8, 5, PXB_WOOD[2]); S.ball(7.5, 2.5, 2.2, 2.2, ['#3a2a7a', '#5a48b0', '#8a78e8', '#c0b4ff', '#ffffff']); }
        S.ball(7, 20, 4.5, 1.6, ['#3a2e24', '#4f4033', '#665343', '#7a6652', '#8f7a62']);
        S.outline('#110d0b');
    });
}
function pxDrawStarterWeapons(level) {
    if (!level.starterWeapons || !towerRun || !towerRun.starterPending) return;
    const near = starterWeaponNear();
    level.starterWeapons.forEach((w, i) => {
        if (!level.explored[w.y][w.x]) return;
        const [cx, by] = tileBase(w.x, w.y), pulse = 0.5 + 0.5 * Math.sin(fxClock * 3 + i * 2), on = w === near;
        pxGlow(cx, by - 4, TILE * 0.5, TILE * 0.18, '#ffd166', 0.18 + 0.2 * pulse + (on ? 0.2 : 0));
        pxPut(pxStuckWeapon(w.key), cx, by, PXG.scale * (on ? 1.15 : 1));
        pxLabel(STARTER_WEAPONS[w.key].className, cx, by - TILE * 1.55, on ? '#ffd166' : '#f2e6c8');
    });
    if (near) { pxUiPass = true; drawStarterCard(near); pxUiPass = false; } // cartel con colores de panel oscuro (towerPixelUi.js)
}

// --- ESCALERA, CUEVAS Y RESTOS ---
function pxDrawStairs(level) {
    const st = level.stairs;
    if (!st || !level.explored[st.y][st.x]) return;
    const [cx, by] = tileBase(st.x, st.y), open = level.stairsOpen;
    if (open) pxGlow(cx, by - 14, 18, 16, '#9dffb0', 0.12 + 0.08 * Math.sin(fxClock * 3));
    pxPut(pxProp('stairs' + (open ? 'O' : ''), 17, 18, S => {
        for (let i = 0; i < 5; i++) { const y = 15 - i * 3, x0 = 1 + i, w = 15 - i * 2; S.rect(x0, y, w, 3, PXP_STONE[1 + (i % 2)]); S.rect(x0, y, w, 1, PXP_STONE[3 + (i === 4 ? 1 : 0)]); }
        if (!open) { S.rect(6, 4, 5, 4, '#c9a227'); S.rect(7, 1, 3, 3, null); S.set(7, 2, '#8a8a8a'); S.set(9, 2, '#8a8a8a'); S.set(7, 3, '#8a8a8a'); S.set(9, 3, '#8a8a8a'); S.set(8, 1, '#8a8a8a'); S.set(8, 5, '#3a2a10'); }
        S.outline('#110d0b');
    }), cx, by);
}
function pxDrawPortals(level) {
    (level.caves || []).forEach(c => {
        if (!level.explored[c.y][c.x]) return;
        const [cx, by] = tileBase(c.x, c.y);
        pxPut(pxProp('caveMouth', 20, 16, S => {
            S.ball(10, 10, 9.5, 7, PXP_STONE); S.ball(10, 11.5, 6, 4.6, ['#050404', '#0a0807', '#100c0a', '#15110e', '#1a1511']);
            S.rect(4, 15, 12, 1, '#1a1511'); S.set(5, 4, '#5d7d34'); S.set(14, 5, '#5d7d34'); S.outline('#110d0b');
        }), cx, by + 2);
    });
    if (level.down && level.explored[level.down.y][level.down.x]) {
        const [cx, by] = tileBase(level.down.x, level.down.y);
        pxPut(pxProp('pit', 18, 10, S => { S.ball(9, 5, 8.5, 4.5, PXP_STONE); S.ball(9, 5.5, 6.5, 3.2, ['#020202', '#050404', '#080606', '#0c0a09', '#100d0b']); S.outline('#110d0b'); }), cx, by);
    }
    if (level.exitUp && level.explored[level.exitUp.y][level.exitUp.x]) {
        const [cx, by] = tileBase(level.exitUp.x, level.exitUp.y);
        pxGlow(cx, by - 18, 16, 20, '#ffe6a0', 0.22);
        pxPut(pxProp('rope', 9, 22, S => { S.line(2, 0, 2, 21, PXB_WOOD[2]); S.line(6, 0, 6, 21, PXB_WOOD[2]); for (let y = 2; y < 21; y += 3) S.line(3, y, 5, y, PXB_WOOD[1]); S.outline('#110d0b'); }), cx, by);
    }
}
function pxDrawCorpses(level) {
    level.corpses.forEach(c => {
        if (!level.explored[c.y][c.x]) return;
        const active = c === towerRun.corpse, [cx, by] = tileBase(c.x, c.y);
        if (active) pxGlow(cx, by - 4, 16, 7, '#c9a227', 0.3 + 0.2 * Math.sin(fxClock * 4));
        pxPut(pxProp('bones' + (active ? 'A' : ''), 14, 9, S => {
            const bone = active ? ['#a89e88', '#c8bea6', '#ddd4bc', PXB_BONE, '#fffaf0'] : ['#6b6458', '#7f786b', '#938b7d', '#a59d8e', '#b5ad9e'];
            S.line(1, 7, 12, 5, bone[2]); S.line(2, 4, 10, 8, bone[1]); S.ball(9, 4, 3, 2.8, bone); S.set(8, 4, '#1a1412'); S.set(10, 4, '#1a1412'); S.rect(8, 6, 3, 1, bone[1]);
            S.outline('#110d0b');
        }), cx, by);
        if (active) pxLabel(`tus restos (+${c.points})`, cx, by - TILE * 0.85, '#ffd166');
    });
}

// --- EVENTOS DEL CAMPO ---
function pxDrawEvents(level) {
    (level.events || []).forEach(e => {
        if (e.kind === 'ambush' || !level.explored[e.y][e.x]) return;
        const [cx, by] = tileBase(e.x, e.y);
        if (e.kind === 'caravan') {
            const broken = e.state === 'lost';
            pxPut(pxProp('caravan' + (broken ? 'X' : ''), 32, 22, S => {
                pxShadow(S, 16, 21, 14, 1.6);
                S.rect(3, 11, 26, 6, broken ? '#4a3424' : PXB_WOOD[1]); S.rect(3, 11, 26, 1, PXB_WOOD[2]); for (let x = 3; x < 29; x += 5) S.rect(x, 12, 1, 5, PXB_WOOD[0]);
                if (!broken) for (let x = 4; x <= 27; x++) { const top = 11 - Math.round(8 * Math.sin((x - 4) / 23 * Math.PI)); for (let y = top; y < 11; y++) S.set(x, y, y === top ? '#f4ecd8' : x % 6 === 0 ? '#b8ab90' : '#d8ccb0'); }
                [7, 24].forEach(wx => { S.ball(wx, 18, 3.4, 3.4, ['#241a12', '#3a2a1c', '#4f3a26', '#654a30', '#7a5c3c']); S.set(wx, 18, '#a8a098'); S.set(wx - 2, 18, '#241a12'); S.set(wx + 2, 18, '#241a12'); S.set(wx, 16, '#241a12'); S.set(wx, 20, '#241a12'); });
                S.line(29, 15, 31, 17, PXB_WOOD[1]);
                S.outline('#110d0b');
            }), cx, by + 4);
            if (e.state === 'attack') { ctx.fillStyle = '#1a1412'; ctx.fillRect(cx - 17, by - 52, 34, 6); ctx.fillStyle = '#e85d04'; ctx.fillRect(cx - 16, by - 51, 32 * e.cart.hp / e.cart.maxHp, 4); }
        } else if (e.kind === 'cursed') {
            if (e.state !== 'open') pxGlow(cx, by - 8, 18, 12, '#9d4edd', 0.3 + 0.2 * Math.sin(fxClock * 3));
            pxPut(pxChest(e.state === 'open', true), cx, by);
        } else if (e.kind === 'peddler') {
            pxDrawNpc('peddler', e.x, e.y, 'Mercader (B)');
        } else if (e.kind === 'prisoner') {
            if (e.state !== 'freed') pxPut(pxNpc('prisoner', pxFrameK(1.2, 2)), cx, by);
            pxPut(pxProp('cage' + (e.state === 'freed' ? 'O' : ''), 18, 28, S => {
                S.rect(0, 0, 18, 2, PXB_STEEL[1]); S.rect(0, 26, 18, 2, PXB_STEEL[0]); S.rect(0, 0, 18, 1, PXB_STEEL[2]);
                const bars = e.state === 'freed' ? [0, 17] : [0, 4, 8, 13, 17];
                bars.forEach(x => S.rect(x, 2, 1, 24, x % 8 ? PXB_STEEL[2] : PXB_STEEL[1]));
                S.outline('#110d0b');
            }), cx, by);
        }
    });
}
