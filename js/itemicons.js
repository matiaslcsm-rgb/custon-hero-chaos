// Íconos de ítems en pixel art, dibujados en código (12×12, mismo sistema que los sprites de sprites.js).
// Cada ítem usa una forma (espada, guante, anillo…) y su color principal; el resto de la paleta se deriva:
//   m color principal · d oscuro · l claro · w metal · h mango/madera
// Se usan en la tienda, el inventario, las recetas, la guía y el glosario (itemNameHtml los agrega solo).

const ITEM_ICON_SHAPES = {
    sword: ['..........lw', '.........lwl', '........lwl.', '.......lwl..', '......lwl...', '.....lwl....',
            '..m.lwl.....', '...mwl......', '...hmm......', '..h..m......', '.h..........', 'dh..........'],
    dagger: ['............', '............', '.........lw.', '........lwl.', '.......lwl..', '......lwl...',
             '...m.lwl....', '....mwl.....', '....hm......', '...h..m.....', '..d.........', '............'],
    hammer: ['............', '..dddddddd..', '..dmmmmmmd..', '..dmllmmmd..', '..dddddddd..', '.....hh.....',
             '.....hh.....', '.....hh.....', '.....hh.....', '.....hh.....', '.....dd.....', '............'],
    spear: ['...........w', '..........wl', '.........wl.', '........hw..', '.......h....', '......h.....',
            '.....h......', '....h.......', '...h........', '..h.........', '.h..........', '............'],
    staff: ['....mm......', '...mllm.....', '...mllm.....', '....mm......', '.....h......', '.....h......',
            '.....h......', '.....h......', '.....h......', '.....h......', '.....h......', '....hhh.....'],
    glove: ['............', '...m.m.m....', '...m.m.m.m..', '...mmmmmmm..', '..mmmmmmmm..', '..mmmmmmm...',
            '...mmmmmm...', '...mmmmm....', '...ddddd....', '...lllll....', '............', '............'],
    boot: ['............', '....mmmm....', '....mmmm....', '....mlmm....', '....mmmm....', '....mmmm....',
           '....mmmmm...', '....mmmmmmm.', '...dddddddd.', '............', '............', '............'],
    armor: ['............', '..mm....mm..', '.mmmmmmmmmm.', '.mmmlmmlmmm.', '.mmmmmmmmmm.', '..mmmmmmmm..',
            '..mmdmmdmm..', '..mmmmmmmm..', '..mmmmmmmm..', '...mmmmmm...', '............', '............'],
    shield: ['............', '..dddddddd..', '..dmmmmmmd..', '..dmmllmmd..', '..dmllllmd..', '..dmmllmmd..',
             '..dmmmmmmd..', '...dmmmmd...', '....dmmd....', '.....dd.....', '............', '............'],
    cape: ['....dddd....', '...dmmmmd...', '...mmmmmm...', '..mmmmmmmm..', '..mmmmmmmm..', '.mmmmlmmmmm.',
           '.mmmmlmmmmm.', '.mmmmmmmmmm.', 'mmmmmmmmmmmm', 'mmmmmmmmmmmm', 'm.m.m.m.m.m.', '............'],
    ring: ['............', '....mmmm....', '....mlmm....', '.....mm.....', '....wwww....', '...w....w...',
           '..w......w..', '..w......w..', '...w....w...', '....wwww....', '............', '............'],
    gem: ['............', '....llll....', '...lmmmml...', '..lmmmmmmml.', '..mmmmmmmmm.', '...mmmmmmm..',
          '....mmmmm...', '.....mmm....', '......m.....', '............', '............', '............'],
    crystal: ['.....l......', '....lm......', '....lmm.....', '...lmmm.....', '...lmmmd....', '...lmmmd....',
              '..lmmmmd....', '..lmmmmdd...', '...mmmdd....', '....mdd.....', '.....d......', '............'],
    orb: ['............', '....mmmm....', '...mllmmm...', '..mllmmmmm..', '..mlmmmmmm..', '..mmmmmmmd..',
          '..mmmmmmdd..', '...mmmmdd...', '....mddd....', '...wwwwww...', '..wwwwwwww..', '............'],
    heart: ['............', '..mm....mm..', '.mlmm..mmmm.', '.mlmmmmmmmm.', '.mmmmmmmmmm.', '.mmmmmmmmmm.',
            '..mmmmmmmm..', '...mmmmmm...', '....mmmm....', '.....mm.....', '............', '............'],
    mask: ['............', '..mmmmmmmm..', '.mmmmmmmmmm.', '.mm..mm..mm.', '.mm..mm..mm.', '.mmmmmmmmmm.',
           '..mmmmmmmm..', '..mm.dd.mm..', '...mmmmmm...', '....mmmm....', '............', '............'],
    chalice: ['............', '..wwwwwwww..', '..wmmmmmmw..', '..wmmmmmmw..', '...wmmmmw...', '....wwww....',
              '.....ww.....', '.....ww.....', '.....ww.....', '...wwwwww...', '............', '............'],
    fang: ['............', '...m........', '...mm.......', '...mmm......', '....mmm.....', '....mmmm....',
           '.....mmmm...', '.....mmmmm..', '......mmmmm.', '.......ddd..', '............', '............'],
    branch: ['............', '........m...', '.......mm...', '......h.m...', '.....h......', '....h.mm....',
             '...h..m.....', '..h.........', '.h..........', '............', '............', '............'],
    belt: ['............', '............', '............', 'mmmmmmmmmmmm', 'mmmmwwwwmmmm', 'mmmmw..wmmmm',
           'mmmmwwwwmmmm', 'mmmmmmmmmmmm', '............', '............', '............', '............'],
    book: ['............', '.dddddddddd.', '.dmmmmmmmmw.', '.dmmmllmmmw.', '.dmmlmmlmmw.', '.dmmmllmmmw.',
           '.dmmmmmmmmw.', '.dmmmmmmmmw.', '.dmmmmmmmmw.', '.dddddddddd.', '............', '............'],
    crown: ['............', '............', '.m...m...m..', '.mm.mmm.mm..', '.mmmmmmmmm..', '.mlmmlmmlm..',
            '.mmmmmmmmm..', '.ddddddddd..', '............', '............', '............', '............'],
    amulet: ['..w......w..', '...w....w...', '....w..w....', '.....ww.....', '....mmmm....', '...mllmmm...',
             '...mlmmmm...', '...mmmmmm...', '....mmmm....', '............', '............', '............'],
    lantern: ['.....ww.....', '....w..w....', '...dddddd...', '...dlllld...', '...dlmmld...', '...dlmmld...',
              '...dlllld...', '...dddddd...', '............', '............', '............', '............'],
    clock: ['....dddd....', '..ddwwwwdd..', '.dwwwmwwwwd.', '.dwwwmwwwwd.', 'dwwwwmwwwwwd', 'dwwwwmmmwwwd',
            'dwwwwwwwwwwd', '.dwwwwwwwwd.', '.dwwwwwwwwd.', '..ddwwwwdd..', '....dddd....', '............'],
    coin: ['............', '...mmmmmm...', '..mllmmmmm..', '.mlmmdmmmmm.', '.mlmmdmmmmm.', '.mmmmmmmmmm.',
           '.mmmmmmmmmd.', '.mmmmmmmmdd.', '..mmmmmmdd..', '...dddddd...', '............', '............']
};

const ITEM_ICONS = {
    BRANCH_STR: ['branch', '#ff6b6b'], BRANCH_AGI: ['branch', '#69db7c'], BRANCH_INT: ['branch', '#74c0fc'],
    BLADE: ['sword', '#adb5bd'], QUICK_GLOVES: ['glove', '#f4a261'], FANG: ['fang', '#f1faee'], CHAINMAIL: ['armor', '#8d99ae'],
    RUNE_CAPE: ['cape', '#7b2cbf'], VITALITY: ['gem', '#e63946'], REGEN_RING: ['ring', '#52b788'], VAMP_MASK: ['mask', '#9d0208'],
    MANA_CRYSTAL: ['crystal', '#4895ef'], TRAVEL_BOOTS: ['boot', '#8d6e63'], SERRATED: ['dagger', '#ced4da'], FROST_ORB: ['orb', '#90e0ef'],
    BELT: ['belt', '#bc6c25'], GLOVES: ['glove', '#ffd166'], TOME: ['book', '#3a0ca3'], DIADEM: ['crown', '#ffd166'],
    TRUESTRIKE: ['sword', '#e0fbfc'], HAMMER: ['hammer', '#6c757d'], SWIFT_BLADE: ['sword', '#ffd166'], CRIMSON: ['chalice', '#d00000'],
    SPEAR: ['spear', '#adb5bd'], SKADI: ['orb', '#caf0f8'], CLOAK: ['cape', '#c77dff'], BOOTS: ['boot', '#495057'],
    THORNS: ['armor', '#2d6a4f'], HEART: ['heart', '#ff006e'], AEGIS: ['shield', '#ffb703'], ARCANE_STAFF: ['staff', '#c77dff'],
    FRAGMENT: ['crystal', '#9d4edd'], GREED: ['coin', '#ffd166'],
    BRUTE_AMULET: ['amulet', '#e63946'], STALKER_DAGGER: ['dagger', '#52b788'], APPRENTICE_STONE: ['gem', '#4895ef'],
    EXPLORER_LANTERN: ['lantern', '#ffd166'], WOLF_FANG: ['fang', '#e9ecef'], OAK_SHIELD: ['shield', '#8d6e63'],
    SHARP_CLAW: ['fang', '#adb5bd'], ARCANE_RING: ['ring', '#9d4edd'], PILGRIM_MANTLE: ['cape', '#606c38'],
    TENACITY_CHARM: ['amulet', '#48cae4'], COLOSSUS_PLATES: ['armor', '#6c757d'], EXECUTIONER_AXE: ['hammer', '#9d0208'],
    STORM_BOOTS: ['boot', '#48cae4'], ARCHMAGE_ORB: ['orb', '#7b2cbf'], BLOOD_CHALICE: ['chalice', '#9d0208'],
    DOOM_SWORD: ['sword', '#ff5400'], CROWN_OF_THREE: ['crown', '#ffd166'], PHOENIX_HEART: ['heart', '#ff7b00'],
    FORBIDDEN_GRIMOIRE: ['book', '#6a040f'], BROKEN_CLOCK: ['clock', '#ffd166'],
    KAYA: ['gem', '#9d4edd'], ECLIPSE_STAFF: ['staff', '#3c096c'],
    TALENT_STR: ['book', '#e03131'], TALENT_AGI: ['book', '#2f9e44'], TALENT_INT: ['book', '#1971c2']
};

const itemIconCache = {};
function itemIconUrl(key) {
    if (itemIconCache[key]) return itemIconCache[key];
    const def = ITEM_ICONS[key];
    if (!def) return null;
    const [shape, main] = def;
    const pal = { m: main, d: shade(main, -0.45), l: shade(main, 0.5), w: '#dee2e6', h: '#7f5539' };
    const c = document.createElement('canvas');
    c.width = c.height = 12 * 3;
    const g = c.getContext('2d');
    ITEM_ICON_SHAPES[shape].forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.' || !pal[ch]) return;
        g.fillStyle = pal[ch]; g.fillRect(x * 3, y * 3, 3, 3);
    }));
    return (itemIconCache[key] = c.toDataURL());
}
function itemIconHtml(key, size = 'sm') {
    const url = itemIconUrl(key);
    return url ? `<img src="${url}" class="pixel-img item-icon ${size}" alt="">` : '';
}
