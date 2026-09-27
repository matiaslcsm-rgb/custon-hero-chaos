// Creeps: tipos con su mecánica y su contra, y los temas de las oleadas. Reglas: DISEÑO.md §8.
//
// Campos de un tipo de creep:
//   key, label, symbol, color, hp, atk, atkSpeed, moveInterval (ms por casilla), range, gold, xp
//   armor, magicResist, evasion   opcionales (0 si no se indican)
//   attackType   'physical' (por defecto) | 'magical'
//   oneHit       muere de un solo golpe;  groupSize: aparece en grupos de N (por cada unidad pedida)
//   mechanic     qué hace (se muestra en el aviso de oleada y en el códice)
//   counter      cómo contrarrestarlo;  counterItem: clave del ítem de ITEMS que lo contrarresta (lo usa la IA)
//   bossable     puede ser la base del jefe de una oleada
//   priority     prioridad como objetivo: el ataque automático y la IA van primero por los de prioridad más alta
//   update(c, dt)                 comportamiento propio; devuelve true si ya decidió qué hacer este frame
//   onAttack(c, target, result)   después de cada ataque suyo
//   onDeath(c, killer)            al morir a manos de un héroe

const BOSS_XP = 120;

// Cacería Veloz: cuanto antes muere un creep tras aparecer, más oro paga (hasta x3).
function speedGoldMultiplier(timeAliveSeconds) {
    if (timeAliveSeconds <= 1) return 3;
    if (timeAliveSeconds >= 6) return 1;
    return 3 - (timeAliveSeconds - 1) * (2 / 5);
}

const CREEP_TYPES = {
    // --- BÁSICOS ---
    CHUSMA: {
        key: 'CHUSMA', label: 'Chusma', symbol: 'x', color: '#6c757d', hp: 1, atk: 4, atkSpeed: 1.0, moveInterval: 220, range: 1.0, gold: 4, xp: 6, oneHit: true,
        mechanic: 'Muere de un golpe, pero viene en cantidad.', counter: 'Daño en área'
    },
    GRUNT: {
        key: 'GRUNT', label: 'Grunt', symbol: 'g', color: '#ffb703', hp: 35, atk: 8, atkSpeed: 0.8, moveInterval: 260, range: 1.3, gold: 6, xp: 18, armor: 1, bossable: true,
        mechanic: 'Soldado básico cuerpo a cuerpo.', counter: '—'
    },
    ARCHER: {
        key: 'ARCHER', label: 'Arquero', symbol: 'r', color: '#8ecae6', hp: 22, atk: 10, atkSpeed: 0.9, moveInterval: 300, range: 4.5, gold: 7, xp: 18, bossable: true,
        mechanic: 'Ataca desde lejos (rango 4,5).', counter: 'Más rango, movilidad o ir a buscarlo'
    },
    SCOUT: {
        key: 'SCOUT', label: 'Explorador', symbol: 's', color: '#ff477e', hp: 18, atk: 6, atkSpeed: 1.4, moveInterval: 150, range: 1.2, gold: 5, xp: 14, bossable: true,
        mechanic: 'Muy rápido y ataca seguido.', counter: 'Ralentizar o aturdir'
    },
    BRUTE: {
        key: 'BRUTE', label: 'Bruto', symbol: 'b', color: '#e63946', hp: 60, atk: 14, atkSpeed: 0.6, moveInterval: 340, range: 1.4, gold: 10, xp: 28, armor: 3, bossable: true,
        mechanic: 'Lento, resistente y pega fuerte.', counter: 'Mantener distancia'
    },

    // --- CON MECÁNICA ---
    SHAMAN: {
        key: 'SHAMAN', label: 'Chamán', symbol: 'c', color: '#c77dff', hp: 26, atk: 12, atkSpeed: 0.8, moveInterval: 300, range: 4, gold: 8, xp: 20, attackType: 'magical', bossable: true,
        mechanic: 'Ataca con daño MÁGICO a distancia (ignora la armadura).', counter: 'Resistencia mágica', counterItem: 'CLOAK'
    },
    HEALER: {
        key: 'HEALER', label: 'Sanador', symbol: 'h', color: '#80ffdb', hp: 40, atk: 4, atkSpeed: 0.7, moveInterval: 300, range: 3, gold: 9, xp: 22,
        healEvery: 3, healAmount: 20, healRadius: 5, priority: 2,
        // Cura una cantidad fija (crece con la oleada), no un % de la vida del objetivo: con % era imposible matar a un jefe con 2 Sanadores.
        mechanic: 'Cada 3s cura 20 de vida (más en oleadas avanzadas) al creep más herido cerca. Tu ataque automático lo prioriza si está a tiro.',
        counter: 'Anticuración o matarlo primero', counterItem: 'SPEAR',
        update(c, dt) {
            if (!everyInterval(c, 'heal', dt, this.healEvery)) return false;
            const ally = c.arena.creeps.filter(o => o !== c && o.isAlive() && !o.oneHit && o.hp < o.maxHp && Math.hypot(o.x - c.x, o.y - c.y) <= this.healRadius)
                .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            if (ally) healUnit(ally, this.healAmount * c.statMult);
            return false;
        }
    },
    SPECTER: {
        key: 'SPECTER', label: 'Espectro', symbol: 'e', color: '#adb5bd', hp: 35, atk: 12, atkSpeed: 1.0, moveInterval: 180, range: 1.2, gold: 8, xp: 18, evasion: 60,
        mechanic: 'Esquiva el 60% de los ataques básicos.', counter: 'Ataques que no fallan o habilidades', counterItem: 'TRUESTRIKE'
    },
    ARMORED: {
        key: 'ARMORED', label: 'Acorazado', symbol: 'a', color: '#9a8c98', hp: 110, atk: 14, atkSpeed: 0.7, moveInterval: 380, range: 1.3, gold: 12, xp: 30, armor: 12, bossable: true,
        mechanic: 'Armadura 12: recibe 48% menos de daño físico.', counter: 'Daño mágico o puro, o reducir armadura', counterItem: 'HAMMER'
    },
    SWARM: {
        key: 'SWARM', label: 'Enjambre', symbol: '·', color: '#b5e48c', hp: 10, atk: 3, atkSpeed: 1.2, moveInterval: 160, range: 1.1, gold: 2, xp: 4, groupSize: 4,
        mechanic: 'Aparecen de a 4, débiles y rápidos.', counter: 'Daño en área'
    },
    KAMIKAZE: {
        key: 'KAMIKAZE', label: 'Kamikaze', symbol: 'k', color: '#fb8500', hp: 16, atk: 40, atkSpeed: 1, moveInterval: 150, range: 1.5, gold: 6, xp: 14,
        mechanic: 'Corre hacia vos y EXPLOTA al llegar (mucho daño físico).', counter: 'Matarlo a distancia antes de que llegue',
        update(c) {
            const target = creepTarget(c);
            if (Math.hypot(c.x - target.x, c.y - target.y) > this.range) return false;
            c.hp = 0; // se destruye al explotar: no da oro ni experiencia
            dealDamage(c, target, Math.round(c.atk * enrageMult(c.arena)), 'physical');
            log(`💥 ¡Un Kamikaze explotó a tu lado!`);
            return true;
        }
    },
    STUNNER: {
        key: 'STUNNER', label: 'Aturdidor', symbol: 't', color: '#ffd166', hp: 55, atk: 8, atkSpeed: 0.9, moveInterval: 280, range: 1.3, gold: 10, xp: 24, bossable: true,
        stunEvery: 2, stunDuration: 1.5,
        mechanic: 'Cada 2 golpes te aturde 1,5s.', counter: 'Resistencia al control', counterItem: 'BOOTS',
        onAttack(c, target, result) {
            if (result.evaded) return;
            c.hitCount = (c.hitCount || 0) + 1;
            if (c.hitCount % this.stunEvery === 0 && target.isAlive()) addEffect(target, { id: 'STUN', name: 'Aturdido', duration: this.stunDuration, flags: ['stun'] });
        }
    },
    WARLOCK: {
        key: 'WARLOCK', label: 'Brujo', symbol: 'w', color: '#e0aaff', hp: 30, atk: 8, atkSpeed: 0.7, moveInterval: 320, range: 4, gold: 10, xp: 24,
        attackType: 'magical', bossable: true, priority: 1,
        boltEvery: 5, boltRange: 5, boltDamage: 20, boltStun: 1.2,
        mechanic: 'Ataca con magia a distancia y cada 5s lanza un rayo que hace daño mágico y te aturde 1,2s.',
        counter: 'Inmunidad mágica, resistencia mágica o al control', counterItem: 'AEGIS',
        update(c, dt) {
            if (!everyInterval(c, 'bolt', dt, this.boltEvery)) return false;
            const target = creepTarget(c);
            if (Math.hypot(c.x - target.x, c.y - target.y) > this.boltRange) return false;
            const { dealt } = dealDamage(c, target, Math.round(this.boltDamage * c.statMult * enrageMult(c.arena)), 'magical');
            const stunned = target.isAlive() && addEffect(target, { id: 'STUN', name: 'Aturdido', duration: this.boltStun, flags: ['stun'] });
            if (dealt > 0 || stunned) log(`⚡ Un Brujo te lanzó un rayo${stunned ? ' y te aturdió' : ''}.`);
            return false;
        }
    },
    FROSTCASTER: {
        key: 'FROSTCASTER', label: 'Escarchador', symbol: 'f', color: '#90e0ef', hp: 28, atk: 7, atkSpeed: 0.9, moveInterval: 300, range: 4, gold: 9, xp: 20,
        attackType: 'magical', slow: 0.3, slowDuration: 2,
        mechanic: 'Ataques mágicos a distancia que te ralentizan 30% por 2s.', counter: 'Resistencia al control o mágica', counterItem: 'BOOTS',
        onAttack(c, target, result) {
            if (!result.evaded && target.isAlive()) addEffect(target, { id: 'FROSTCASTER_SLOW', name: 'Escarcha', duration: this.slowDuration, mods: { moveSpeedPct: -this.slow } });
        }
    },
    CROSSBOW: {
        key: 'CROSSBOW', label: 'Ballestero', symbol: 'z', color: '#d4a373', hp: 30, atk: 18, atkSpeed: 0.5, moveInterval: 320, range: 6, gold: 10, xp: 22, bossable: true,
        mechanic: 'Dispara desde muy lejos (rango 6) golpes lentos pero fuertes.', counter: 'Vida y armadura, o alcanzarlo rápido', counterItem: 'HEART'
    },
    DRUMMER: {
        key: 'DRUMMER', label: 'Tamborilero', symbol: 'd', color: '#f4a261', hp: 45, atk: 4, atkSpeed: 0.8, moveInterval: 300, range: 3, gold: 10, xp: 22, priority: 1,
        auraRadius: 4, auraAtkSpeed: 0.4,
        mechanic: 'Los creeps cerca de él (radio 4) atacan 40% más rápido. Objetivo prioritario.', counter: 'Matarlo primero',
        update(c, dt) {
            if (!everyInterval(c, 'drum', dt, 0.5)) return false;
            c.arena.creeps.forEach(o => {
                if (o !== c && o.isAlive() && Math.hypot(o.x - c.x, o.y - c.y) <= this.auraRadius) {
                    addEffect(o, { id: 'DRUM_AURA', name: 'Tambores de guerra', duration: 0.6, mods: { atkSpeedPct: this.auraAtkSpeed } });
                }
            });
            return false;
        }
    },
    THIEF: {
        key: 'THIEF', label: 'Ladrón', symbol: '$', color: '#ffe066', hp: 24, atk: 5, atkSpeed: 1.0, moveInterval: 150, range: 1.2, gold: 8, xp: 16,
        steal: 20, fleeFor: 3,
        mechanic: 'Te roba 20 de oro por golpe y huye. Si lo matás, recuperás el oro +50%.', counter: 'Ralentizar, aturdir o rango',
        update(c, dt) {
            if (gameClock >= (c.fleeUntil || 0)) return false;
            stepCreepAway(c, creepTarget(c), dt);
            return true;
        },
        onAttack(c, target, result) {
            if (result.evaded || !target.isHero) return;
            const stolen = Math.min(target.gold, this.steal);
            if (stolen <= 0) return;
            target.gold -= stolen;
            c.stolen = (c.stolen || 0) + stolen;
            c.fleeUntil = gameClock + this.fleeFor;
            log(`💰 ¡Un Ladrón te robó ${stolen} de oro y huye!`);
        },
        onDeath(c, killer) {
            if (!c.stolen) return;
            const back = Math.round(c.stolen * 1.5);
            killer.gold += back;
            log(`💰 Recuperaste ${back} de oro del Ladrón.`);
        }
    }
};

// Temas de oleada: para cada oleada se elige uno al azar de su nivel (de la ronda 4 en adelante se repite el último nivel).
// groups: tipos y cantidades; boss: tipo base del jefe de la oleada.
const WAVE_THEMES = [
    [ // oleada 1
        { name: 'Avanzada', groups: [{ type: 'GRUNT', count: 4 }, { type: 'ARCHER', count: 2 }, { type: 'CHUSMA', count: 3 }, { type: 'SCOUT', count: 1 }], boss: 'GRUNT' },
        { name: 'Enjambre', groups: [{ type: 'SWARM', count: 2 }, { type: 'GRUNT', count: 2 }, { type: 'ARCHER', count: 1 }], boss: 'SCOUT' }
    ],
    [ // oleada 2
        { name: 'Hechiceros', groups: [{ type: 'SHAMAN', count: 3 }, { type: 'GRUNT', count: 3 }, { type: 'HEALER', count: 1 }, { type: 'CHUSMA', count: 2 }], boss: 'SHAMAN' },
        { name: 'Espectros', groups: [{ type: 'SPECTER', count: 4 }, { type: 'GRUNT', count: 2 }, { type: 'ARCHER', count: 2 }], boss: 'GRUNT' },
        { name: 'Brujería', groups: [{ type: 'WARLOCK', count: 2 }, { type: 'FROSTCASTER', count: 2 }, { type: 'GRUNT', count: 3 }, { type: 'CHUSMA', count: 2 }], boss: 'WARLOCK' }
    ],
    [ // oleada 3
        { name: 'Muralla', groups: [{ type: 'ARMORED', count: 3 }, { type: 'HEALER', count: 2 }, { type: 'ARCHER', count: 3 }], boss: 'ARMORED' },
        { name: 'Kamikazes', groups: [{ type: 'KAMIKAZE', count: 4 }, { type: 'SCOUT', count: 2 }, { type: 'BRUTE', count: 2 }], boss: 'BRUTE' },
        { name: 'Tiradores', groups: [{ type: 'CROSSBOW', count: 3 }, { type: 'DRUMMER', count: 1 }, { type: 'GRUNT', count: 3 }, { type: 'SCOUT', count: 2 }], boss: 'CROSSBOW' }
    ],
    [ // oleada 4
        { name: 'Emboscada', groups: [{ type: 'THIEF', count: 2 }, { type: 'STUNNER', count: 3 }, { type: 'SPECTER', count: 2 }, { type: 'SHAMAN', count: 2 }], boss: 'STUNNER' },
        { name: 'Asedio', groups: [{ type: 'ARMORED', count: 2 }, { type: 'SHAMAN', count: 3 }, { type: 'HEALER', count: 2 }, { type: 'STUNNER', count: 2 }], boss: 'ARMORED' },
        { name: 'Tormenta Arcana', groups: [{ type: 'WARLOCK', count: 2 }, { type: 'FROSTCASTER', count: 2 }, { type: 'SHAMAN', count: 2 }, { type: 'HEALER', count: 1 }, { type: 'DRUMMER', count: 1 }], boss: 'WARLOCK' }
    ]
];
