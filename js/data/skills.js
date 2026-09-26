// Habilidades de cada héroe.
//
// Campos de una habilidad:
//   id, name, cooldown, manaCost, duration (opcional), description
//   kind   'active' (se lanza con tecla) | 'passive' (reacciona a eventos con `hooks`, no usa tecla)
//   tags   etiquetas de data/tags.js; las usan las sinergias, los ítems de contra y los creeps
//   cast(caster)  solo las activas. `caster` es el héroe que la lanza (jugador o, en el futuro, un rival).
//                 `this` es la habilidad (para leer this.duration, etc.).
//                 Devuelve false si no pudo lanzarse (ej: sin objetivo): no se cobra maná ni cooldown.
//   hooks  solo las pasivas (o activas con parte pasiva): reacciones a eventos, ver effects.js.
//
// La tecla NO es parte de la habilidad: se asigna por orden de aprendizaje (ver Hero.addSkill),
// así se pueden mezclar habilidades de distintos héroes sin que choquen.
//
// Regla para agregar habilidades: tienen que funcionar solas en cualquier héroe (ver DISEÑO.md §6).
// Por eso no dependen del innato de su héroe original, y los efectos temporales se aplican con
// addEffect() en vez de campos propios del héroe.
//
// Kit drafteable por héroe: 3 normales. La definitiva está en HERO_ULTIMATES.
const HERO_SKILLS = {
    AXE: {
        AXE_HACHAZO: {
            id: 'AXE_HACHAZO', name: 'Golpe de Hacha', kind: 'active', cooldown: 5, manaCost: 30,
            tags: ['FÍSICO', 'CONTROL'],
            description: '30 maná. Golpe frontal: 120% de tu daño físico al enemigo más cercano. 25% de probabilidad de aturdirlo 1s.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 0.5);
                if (!target) { log('Golpe de Hacha: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * 1.2);
                damageCreep(caster, target, dmg);
                if (target.isAlive() && Math.random() < 0.25) addEffect(target, { id: 'STUN', name: 'Aturdido', duration: 1, flags: ['stun'] });
                log(`🪓 ¡Golpe de Hacha a ${target.label}! (-${dmg} HP)`);
                return true;
            }
        },
        AXE_PROVOCACION: {
            id: 'AXE_PROVOCACION', name: 'Llamado Provocador', kind: 'active', cooldown: 14, manaCost: 45, duration: 2.5,
            tags: ['CONTROL', 'MEJORA'],
            description: '45 maná. Provoca a los enemigos en radio 5 por 2.5s y te da 25% de reducción de daño mientras dura.',
            cast(caster) {
                addEffect(caster, {
                    id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                    mods: { dmgReduction: 0.25 }, flags: ['taunt']
                });
                const count = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= 5).length;
                log(`🛡️ ¡Llamado Provocador! ${count} enemigos provocados. +25% reducción de daño por 2.5s.`);
                return true;
            }
        },
        AXE_GIRO: {
            id: 'AXE_GIRO', name: 'Giro de Combate', kind: 'active', cooldown: 10, manaCost: 40,
            tags: ['FÍSICO', 'ÁREA'],
            description: '40 maná. Gira con su arma: 70% de tu daño físico a todos los enemigos en radio 2.',
            cast(caster) {
                const dmg = Math.round(caster.atk * 0.7);
                let hits = 0;
                enemiesOf(caster).forEach(c => {
                    if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= 2) { damageCreep(caster, c, dmg); hits++; }
                });
                log(`🌀 ¡Giro de Combate! Golpeaste a ${hits} enemigo(s) por ${dmg} c/u.`);
                return true;
            }
        }
    },
    SNIPER: {
        SNIPER_POTENTE: {
            id: 'SNIPER_POTENTE', name: 'Disparo Potente', kind: 'active', cooldown: 7, manaCost: 35,
            tags: ['FÍSICO'],
            description: '35 maná. Disparo preciso: 180% de tu daño físico al enemigo más cercano.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 2);
                if (!target) { log('Disparo Potente: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * 1.8);
                damageCreep(caster, target, dmg);
                log(`🎯 ¡Disparo Potente a ${target.label}! (-${dmg} HP)`);
                return true;
            }
        },
        SNIPER_CONGELANTE: {
            id: 'SNIPER_CONGELANTE', name: 'Disparo Congelante', kind: 'active', cooldown: 9, manaCost: 30,
            tags: ['FÍSICO', 'CONTROL'],
            description: '30 maná. 100% de tu daño físico y ralentiza 50% por 3s (70% si el objetivo está a más de 80% de tu rango).',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 2);
                if (!target) { log('Disparo Congelante: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * 1.0);
                damageCreep(caster, target, dmg);
                const farAway = Math.hypot(caster.x - target.x, caster.y - target.y) > caster.attackRange * 0.8;
                const slow = farAway ? 0.7 : 0.5;
                if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Congelado', duration: 3, mods: { moveSpeedPct: -slow } });
                log(`❄️ ¡Disparo Congelante a ${target.label}! -${slow * 100}% velocidad 3s.`);
                return true;
            }
        },
        SNIPER_VISION: {
            id: 'SNIPER_VISION', name: 'Visión de Cazador', kind: 'active', cooldown: 16, manaCost: 40, duration: 5,
            tags: ['MEJORA'],
            description: '40 maná. 5s: +40% de rango y +25% de daño físico, pero -50% de velocidad de movimiento.',
            cast(caster) {
                addEffect(caster, {
                    id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                    mods: { rangePct: 0.4, atkPct: 0.25, moveSpeedPct: -0.5 }
                });
                log('👁️ ¡Visión de Cazador! +40% rango, +25% daño, -50% velocidad de movimiento por 5s.');
                return true;
            }
        }
    },
    ASSASSIN: {
        ASSASSIN_BLINK: {
            id: 'ASSASSIN_BLINK', name: 'Parpadeo', kind: 'active', cooldown: 12, manaCost: 35,
            tags: ['MOVILIDAD', 'FÍSICO'],
            description: '35 maná. Teletransporte de hasta 8 casillas junto al enemigo más cercano: +20% vel. ataque 2s y ataca de inmediato.',
            cast(caster) {
                const target = nearestEnemy(caster, 8);
                if (!target) { log('Parpadeo: sin objetivo en rango.'); return false; }
                blinkNextTo(caster, target);
                addEffect(caster, { id: this.id, name: this.name, duration: 2, tags: ['MEJORA'], mods: { atkSpeedPct: 0.2 } });
                const { dmg, isCrit } = rollAttackDamage(caster, target);
                resolveBasicHit(caster, target, dmg, isCrit);
                log(`💨 ¡Parpadeo junto a ${target.label}! +20% vel. ataque 2s.`);
                return true;
            }
        },
        ASSASSIN_CRITSTRIKE: {
            id: 'ASSASSIN_CRITSTRIKE', name: 'Golpe Crítico', kind: 'active', cooldown: 8, manaCost: 40,
            tags: ['FÍSICO', 'CRÍTICO'],
            description: '40 maná. 150% de tu daño físico al enemigo más cercano, con +25% de probabilidad extra de crítico.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 1);
                if (!target) { log('Golpe Crítico: sin objetivo en rango.'); return false; }
                let dmg = Math.round(caster.atk * 1.5);
                const isCrit = Math.random() < (effCritChance(caster) + 25) / 100;
                if (isCrit) dmg = Math.round(dmg * 2);
                damageCreep(caster, target, dmg);
                log(`⚔️ ¡Golpe Crítico a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dmg} HP)`);
                return true;
            }
        },
        ASSASSIN_LETHALSPEED: {
            id: 'ASSASSIN_LETHALSPEED', name: 'Velocidad Letal', kind: 'active', cooldown: 14, manaCost: 35, duration: 4,
            tags: ['MEJORA', 'AL_GOLPEAR'],
            description: '35 maná. 4s: +60% velocidad de ataque. Cada golpe consecutivo al mismo enemigo suma +5% de daño (hasta +40%; se reinicia si cambiás de objetivo).',
            cast(caster) {
                addEffect(caster, {
                    id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                    mods: { atkSpeedPct: 0.6 }, data: { comboTarget: null, stacks: 0 },
                    hooks: {
                        beforeAttack(owner, ctx, effect) {
                            if (effect.data.comboTarget !== ctx.target) { effect.data.comboTarget = ctx.target; effect.data.stacks = 0; }
                            ctx.dmg *= 1 + Math.min(0.4, effect.data.stacks * 0.05);
                            effect.data.stacks++;
                        }
                    }
                });
                log('⚡ ¡Velocidad Letal! +60% vel. ataque por 4s. Combo activo.');
                return true;
            }
        }
    },
    VAMPIRE: {
        VAMP_DARKBLOOD: {
            id: 'VAMP_DARKBLOOD', name: 'Sangre Oscura', kind: 'active', cooldown: 12, manaCost: 25, duration: 5,
            tags: ['MEJORA', 'ROBO_VIDA'],
            description: '25 maná. Consumís 8% de tu vida actual y ganás +30% daño físico por 5s; tu robo de vida cura +50% mientras dura.',
            cast(caster) {
                const cost = Math.round(caster.hp * 0.08);
                caster.hp = Math.max(1, caster.hp - cost);
                addEffect(caster, {
                    id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                    mods: { atkPct: 0.3 },
                    hooks: { beforeLifesteal(owner, ctx) { ctx.mult += 0.5; } }
                });
                log(`🩸 ¡Sangre Oscura! -${cost} HP propia, +30% daño físico por 5s.`);
                return true;
            }
        },
        VAMP_CLAW: {
            id: 'VAMP_CLAW', name: 'Garra Vampírica', kind: 'active', cooldown: 6, manaCost: 30,
            tags: ['FÍSICO', 'ROBO_VIDA'],
            description: '30 maná. 130% de tu daño físico al enemigo más cercano; recuperás 20% del daño como vida (40% si tiene <30% HP).',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 1);
                if (!target) { log('Garra Vampírica: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * 1.3);
                const lowHp = target.maxHp && target.hp / target.maxHp < 0.3;
                const dealt = damageCreep(caster, target, dmg);
                const heal = Math.round(dealt * (lowHp ? 0.4 : 0.2));
                caster.hp = Math.min(caster.maxHp, caster.hp + heal);
                log(`🐾 ¡Garra Vampírica a ${target.label}! (-${dmg} HP, +${heal} HP propia)`);
                return true;
            }
        },
        VAMP_LEAP: {
            id: 'VAMP_LEAP', name: 'Salto Sangriento', kind: 'active', cooldown: 10, manaCost: 35,
            tags: ['MOVILIDAD', 'FÍSICO', 'CONTROL'],
            description: '35 maná. Saltás hasta 6 casillas hacia el enemigo más cercano: 100% de daño físico de impacto y -40% velocidad 2s.',
            cast(caster) {
                const target = nearestEnemy(caster, 6);
                if (!target) { log('Salto Sangriento: sin objetivo en rango.'); return false; }
                blinkNextTo(caster, target);
                const dmg = Math.round(caster.atk * 1.0);
                damageCreep(caster, target, dmg);
                if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Desgarrado', duration: 2, mods: { moveSpeedPct: -0.4 } });
                log(`🦇 ¡Salto Sangriento sobre ${target.label}! (-${dmg} HP, -40% velocidad)`);
                return true;
            }
        }
    }
};

// Habilidad definitiva de cada héroe. Por ahora se desbloquea sola al aprender las 3 normales
// (en la fase B pasa a draftearse como una más). Comparte el mismo sistema de maná/cooldown.
const HERO_ULTIMATES = {
    AXE: {
        id: 'AXE_FURIA', name: 'Furia del Guerrero', kind: 'active', isUltimate: true, cooldown: 45, manaCost: 80, duration: 8,
        tags: ['MEJORA', 'AL_RECIBIR_DAÑO'],
        description: 'DEFINITIVA. 80 maná. 8s: +40% daño físico, +30% vel. ataque, +20% reducción de daño. Cada golpe recibido suma +2 de daño (hasta +30).',
        cast(caster) {
            addEffect(caster, {
                id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                mods: { atkPct: 0.4, atkSpeedPct: 0.3, dmgReduction: 0.2, flatAtk: 0 },
                hooks: {
                    onDamaged(owner, { dealt }, effect) {
                        if (dealt > 0) effect.mods.flatAtk = Math.min(30, effect.mods.flatAtk + 2);
                    }
                }
            });
            log('🔥 ¡FURIA DEL GUERRERO! +40% daño, +30% vel. ataque, +20% reducción de daño por 8s.');
            return true;
        }
    },
    SNIPER: {
        id: 'SNIPER_MORTAL', name: 'Disparo Mortal', kind: 'active', isUltimate: true, cooldown: 50, manaCost: 90,
        tags: ['FÍSICO', 'CRÍTICO'],
        description: 'DEFINITIVA. 90 maná. Apunta y dispara un proyectil devastador: 300% de tu daño físico, hasta 450% a distancia máxima, con 60% de probabilidad de crítico.',
        cast(caster) {
            const target = nearestEnemy(caster, caster.attackRange * 3);
            if (!target) { log('Disparo Mortal: sin objetivo en rango.'); return false; }
            const distPct = Math.hypot(caster.x - target.x, caster.y - target.y) / caster.attackRange;
            const mult = distPct > 0.8 ? 4.5 : distPct > 0.45 ? 3.75 : 3.0;
            let dmg = Math.round(caster.atk * mult);
            const isCrit = Math.random() < 0.6;
            if (isCrit) dmg = Math.round(dmg * 2);
            damageCreep(caster, target, dmg);
            log(`💀 ¡DISPARO MORTAL a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dmg} HP)`);
            return true;
        }
    },
    ASSASSIN: {
        id: 'ASSASSIN_MASACRE', name: 'Masacre', kind: 'active', isUltimate: true, cooldown: 50, manaCost: 90, duration: 6,
        tags: ['MEJORA', 'CRÍTICO', 'AL_MATAR'],
        description: 'DEFINITIVA. 90 maná. 6s: +50% prob. crítico, +40% vel. ataque, +25% vel. movimiento. Cada baja extiende la duración +1.5s.',
        cast(caster) {
            addEffect(caster, {
                id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                mods: { critChance: 50, atkSpeedPct: 0.4, moveSpeedPct: 0.25 },
                hooks: { onKill(owner, payload, effect) { effect.until += 1.5; } }
            });
            log('🔪 ¡MASACRE! +50% crítico, +40% vel. ataque, +25% vel. movimiento por 6s.');
            return true;
        }
    },
    VAMPIRE: {
        id: 'VAMP_IMMORTAL', name: 'Forma Inmortal', kind: 'active', isUltimate: true, cooldown: 60, manaCost: 100, duration: 6,
        tags: ['MEJORA', 'ROBO_VIDA', 'AL_RECIBIR_DAÑO'],
        description: 'DEFINITIVA. 100 maná. 6s: +30% daño físico, +30% vel. ataque, +25% robo de vida, y tu vida no puede bajar de 1. Al terminar, recibís 30% del daño acumulado.',
        cast(caster) {
            addEffect(caster, {
                id: this.id, name: this.name, duration: this.duration, tags: this.tags,
                mods: { atkPct: 0.3, atkSpeedPct: 0.3, lifesteal: 25 }, flags: ['preventDeath'],
                data: { accumulated: 0 },
                hooks: {
                    onDamaged(owner, { dealt }, effect) { effect.data.accumulated += dealt; },
                    onExpire(owner, effect) {
                        const payback = Math.round(effect.data.accumulated * 0.3);
                        if (payback <= 0) return;
                        owner.hp = Math.max(0, owner.hp - payback);
                        log(`⚠️ Forma Inmortal termina: recibís ${payback} de daño acumulado.`);
                        if (!owner.isAlive()) onHeroDeath(owner);
                    }
                }
            });
            log('🧛 ¡FORMA INMORTAL! No podés morir por 6s. +30% daño, +30% vel. ataque, +25% robo de vida.');
            return true;
        }
    }
};
