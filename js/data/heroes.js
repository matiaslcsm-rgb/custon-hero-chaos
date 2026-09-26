// Datos de los héroes: stats base, pasiva fija de arquetipo y mecánica de escalado.

// Cada arquetipo define su propia mecánica de escalado: qué stat sube, cuánto por cada N creeps
// eliminados (acumulado durante toda la partida) y cuánto por ganar un duelo 1v1 contra otro héroe
// (perHeroKill queda listo para cuando se implementen los duelos PvP del loop completo).
const HERO_TEMPLATES = {
    AXE: {
        key: 'AXE', name: 'Axe', symbol: '@', primaryAttr: 'STR', role: 'Tanque de contraataque',
        baseHp: 120, baseAtk: 16, baseAtkSpeed: 0.9, baseAttackRange: 1.5,
        baseArmor: 2, baseMagicResist: 15, baseHpRegen: 1.5,
        baseMaxMana: 100, baseManaRegen: 1.2, baseMoveSpeed: 2.8, baseProjectileSpeed: 0,
        baseCritChance: 5, baseEvasion: 4, baseSpellAmp: 0, baseLifesteal: 0,
        description: 'Fuerza: tanque de primera línea. Provoca enemigos y castiga a quien lo golpea. Escala armadura.',
        scaling: { stat: 'armor', perKills: 10, perKillsAmount: 0.5, perHeroKill: 1.5 },
        archetypePassive: {
            id: 'COUNTERATTACK', name: 'Contraataque', chance: 20, tauntBonusChance: 20,
            description: 'Pasiva fija de Fuerza: 20% de probabilidad de responder automáticamente con un golpe físico (100% de tu daño) contra quien te golpeó. La probabilidad sube mientras Llamado Provocador está activo.'
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
        archetypePassive: {
            id: 'PERFECT_AIM', name: 'Puntería Perfecta',
            description: 'Pasiva fija de Agilidad: el daño de tus ataques básicos crece con la distancia al objetivo (hasta +35% a distancia máxima).'
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
        archetypePassive: {
            id: 'DEADLY_STRIKE', name: 'Golpe Mortal',
            description: 'Pasiva fija de Agilidad: alta probabilidad base de golpe crítico (x2 daño) en cada ataque básico.'
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
        archetypePassive: {
            id: 'BLOODLUST', name: 'Hambre',
            description: 'Pasiva fija de Fuerza: convierte una parte de tu daño físico en vida (Robo de Vida). Se duplica contra enemigos con menos de 30% HP.'
        }
    }
};

function scalingStatLabel(stat) {
    return stat === 'armor' ? 'armadura' : stat === 'atk' ? 'daño de ataque' :
        stat === 'critChance' ? '% crítico' : stat === 'lifesteal' ? '% robo de vida' : stat;
}
