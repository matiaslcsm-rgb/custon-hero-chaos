// Datos de los héroes: stats base, innato y mecánica de escalado.
//
// innate: la habilidad innata, permanente y no drafteable. Define la identidad del héroe y reacciona a
// eventos de combate mediante `hooks` (ver effects.js). Tiene que funcionar con cualquier kit drafteado.
//
// scaling: escalado chico propio del héroe: qué stat sube, cuánto por cada N creeps eliminados
// (acumulado durante toda la partida) y cuánto por ganar un duelo 1v1 contra otro héroe
// (perHeroKill queda listo para cuando se implementen los duelos PvP).
const HERO_TEMPLATES = {
    AXE: {
        key: 'AXE', name: 'Axe', symbol: '@', primaryAttr: 'STR', role: 'Tanque de contraataque',
        baseHp: 120, baseAtk: 16, baseAtkSpeed: 0.9, baseAttackRange: 1.5,
        baseArmor: 2, baseMagicResist: 15, baseHpRegen: 1.5,
        baseMaxMana: 100, baseManaRegen: 1.2, baseMoveSpeed: 2.8, baseProjectileSpeed: 0,
        baseCritChance: 5, baseEvasion: 4, baseSpellAmp: 0, baseLifesteal: 0,
        description: 'Fuerza: tanque de primera línea. Provoca enemigos y castiga a quien lo golpea. Escala armadura.',
        scaling: { stat: 'armor', perKills: 10, perKillsAmount: 0.5, perHeroKill: 1.5 },
        innate: {
            id: 'COUNTERATTACK', name: 'Contraataque', chance: 20, tauntBonusChance: 20,
            tags: ['FÍSICO', 'AL_RECIBIR_DAÑO'],
            description: 'Innato: 20% de probabilidad de responder automáticamente con un golpe físico (100% de tu daño) contra quien te golpeó. +20% de probabilidad mientras estás provocando enemigos.',
            hooks: {
                onDamaged(owner, { source, dealt }, innate) {
                    if (dealt <= 0 || !source || !source.isAlive()) return;
                    let chance = innate.chance / 100;
                    if (hasFlag(owner, 'taunt')) chance += innate.tauntBonusChance / 100;
                    if (Math.random() >= chance) return;
                    damageCreep(owner, source, owner.atk);
                    log(`🪓 ¡Contraataque! Golpeaste de vuelta a ${source.label}.`);
                }
            }
        }
    },
    SNIPER: {
        key: 'SNIPER', name: 'Sniper', symbol: 'S', primaryAttr: 'AGI', role: 'Francotirador de largo alcance',
        baseHp: 85, baseAtk: 14, baseAtkSpeed: 1.2, baseAttackRange: 5,
        baseArmor: 0, baseMagicResist: 10, baseHpRegen: 0.5,
        baseMaxMana: 150, baseManaRegen: 1.5, baseMoveSpeed: 2.6, baseProjectileSpeed: 11,
        baseCritChance: 12, baseEvasion: 8, baseSpellAmp: 8, baseLifesteal: 0,
        description: 'Agilidad: DPS físico de largo alcance. Cuanto más lejos dispara, más daño hace. Frágil de cerca.',
        scaling: { stat: 'atk', perKills: 8, perKillsAmount: 3, perHeroKill: 8 },
        innate: {
            id: 'PERFECT_AIM', name: 'Puntería Perfecta',
            tags: ['FÍSICO', 'AL_GOLPEAR'],
            description: 'Innato: el daño de tus ataques básicos crece con la distancia al objetivo (+15% a media distancia, +35% a distancia máxima).',
            hooks: {
                beforeAttack(owner, ctx) {
                    if (!ctx.target || owner.attackRange <= 0) return;
                    const distPct = Math.hypot(owner.x - ctx.target.x, owner.y - ctx.target.y) / owner.attackRange;
                    if (distPct > 0.8) ctx.dmg *= 1.35; else if (distPct > 0.45) ctx.dmg *= 1.15;
                }
            }
        }
    },
    ASSASSIN: {
        key: 'ASSASSIN', name: 'Asesino', symbol: 'K', primaryAttr: 'AGI', role: 'Asesino de críticos',
        baseHp: 90, baseAtk: 15, baseAtkSpeed: 1.1, baseAttackRange: 1.3,
        baseArmor: 1, baseMagicResist: 8, baseHpRegen: 0.8,
        baseMaxMana: 90, baseManaRegen: 1.3, baseMoveSpeed: 3.4, baseProjectileSpeed: 0,
        baseCritChance: 20, baseEvasion: 10, baseSpellAmp: 0, baseLifesteal: 0,
        description: 'Agilidad: asesino explosivo de altísimo daño crítico. Entra, elimina un objetivo y sale antes de que lo rodeen.',
        scaling: { stat: 'critChance', perKills: 8, perKillsAmount: 2, perHeroKill: 5 },
        // Golpe Mortal no necesita hooks: su efecto es la probabilidad de crítico base alta (baseCritChance: 20).
        innate: {
            id: 'DEADLY_STRIKE', name: 'Golpe Mortal',
            tags: ['CRÍTICO'],
            description: 'Innato: alta probabilidad base de golpe crítico (x2 daño) en cada ataque básico.'
        }
    },
    VAMPIRE: {
        key: 'VAMPIRE', name: 'Guerrero Vampiro', symbol: 'V', primaryAttr: 'STR', role: 'Guerrero vampiro cuerpo a cuerpo',
        baseHp: 140, baseAtk: 15, baseAtkSpeed: 0.85, baseAttackRange: 1.4,
        baseArmor: 3, baseMagicResist: 12, baseHpRegen: 1.0,
        baseMaxMana: 100, baseManaRegen: 1.0, baseMoveSpeed: 2.9, baseProjectileSpeed: 0,
        baseCritChance: 6, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 15,
        description: 'Fuerza: guerrero resistente que se cura con el daño que hace. Dominante en peleas largas.',
        scaling: { stat: 'lifesteal', perKills: 9, perKillsAmount: 1, perHeroKill: 3 },
        innate: {
            id: 'BLOODLUST', name: 'Hambre',
            tags: ['ROBO_VIDA'],
            description: 'Innato: convierte una parte de tu daño físico en vida (Robo de Vida base 15%). La curación se duplica contra enemigos con menos de 30% HP.',
            hooks: {
                beforeLifesteal(owner, ctx) {
                    if (ctx.target && ctx.target.maxHp && ctx.target.hp / ctx.target.maxHp < 0.3) ctx.mult *= 2;
                }
            }
        }
    }
};

function scalingStatLabel(stat) {
    return stat === 'armor' ? 'armadura' : stat === 'atk' ? 'daño de ataque' :
        stat === 'critChance' ? '% crítico' : stat === 'lifesteal' ? '% robo de vida' : stat;
}
