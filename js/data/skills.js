// Habilidades naturales de cada héroe: 3 normales + 1 definitiva (isUltimate). Todas se draftean.
//
// Campos de una habilidad:
//   id, name, description
//   kind        'active' (se lanza con tecla) | 'passive' (reacciona a eventos con `hooks`, no usa tecla)
//   isUltimate  true en la definitiva (3 niveles, uno cada 6 niveles del héroe)
//   tags        etiquetas de data/tags.js; las usan las sinergias, los ítems de contra y los creeps
//   values      números de la habilidad. Un array = un valor por nivel (4 en normales, 3 en definitivas);
//               un número suelto = igual en todos los niveles. cooldown y manaCost van acá también.
//               Dentro de cast/hooks se leen con val(this, caster, 'clave') según el nivel actual.
//   description texto con marcadores que se completan desde `values`:
//               {clave} muestra el valor tal cual; {clave%} lo muestra como porcentaje (0.25 → 25%).
//   cast(caster) solo las activas. `caster` es el héroe que la lanza; `this` es la habilidad.
//               Devuelve false si no pudo lanzarse (ej: sin objetivo): no se cobra maná ni cooldown.
//   hooks       solo las pasivas: reacciones a eventos, ver effects.js.
//
// La tecla NO es parte de la habilidad: se asigna por orden de aprendizaje (ver Hero.addSkill).
// Regla para agregar habilidades: tienen que funcionar solas en cualquier héroe (ver DISEÑO.md §6).
// Por eso no dependen del innato de su héroe original, y los efectos temporales usan addEffect().
const HERO_SKILLS = {
    AXE: {
        AXE_HACHAZO: {
            id: 'AXE_HACHAZO', name: 'Golpe de Hacha', kind: 'active',
            tags: ['FÍSICO', 'CONTROL'],
            values: { cooldown: [6, 5.5, 5, 4.5], manaCost: [30, 30, 35, 35], dmgMult: [1.0, 1.2, 1.4, 1.6], stunChance: [0.2, 0.25, 0.3, 0.35], stunDuration: 1 },
            description: 'Golpe frontal: {dmgMult%} de tu daño físico al enemigo más cercano. {stunChance%} de probabilidad de aturdirlo {stunDuration}s.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 0.5);
                if (!target) { log('Golpe de Hacha: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                if (target.isAlive() && Math.random() < val(this, caster, 'stunChance')) {
                    addEffect(target, { id: 'STUN', name: 'Aturdido', duration: val(this, caster, 'stunDuration'), flags: ['stun'] });
                }
                log(`🪓 ¡Golpe de Hacha a ${target.label}! (-${dealt} HP)`);
                return true;
            }
        },
        AXE_PROVOCACION: {
            id: 'AXE_PROVOCACION', name: 'Llamado Provocador', kind: 'active',
            tags: ['CONTROL', 'MEJORA'],
            values: { cooldown: [15, 14, 13, 12], manaCost: 45, duration: [2, 2.5, 3, 3.5], dmgReduction: [0.2, 0.25, 0.3, 0.35], radius: 5 },
            description: 'Provoca a los enemigos en radio {radius} por {duration}s y te da {dmgReduction%} de reducción de daño mientras dura.',
            cast(caster) {
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { dmgReduction: val(this, caster, 'dmgReduction') }, flags: ['taunt']
                });
                const radius = val(this, caster, 'radius');
                const count = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius).length;
                log(`🛡️ ¡Llamado Provocador! ${count} enemigos provocados.`);
                return true;
            }
        },
        AXE_GIRO: {
            id: 'AXE_GIRO', name: 'Giro de Combate', kind: 'active',
            tags: ['FÍSICO', 'ÁREA'],
            values: { cooldown: [11, 10, 9, 8], manaCost: 40, dmgMult: [0.5, 0.7, 0.9, 1.1], radius: 2 },
            description: 'Gira con su arma: {dmgMult%} de tu daño físico a todos los enemigos en radio {radius}.',
            cast(caster) {
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const radius = val(this, caster, 'radius');
                let hits = 0;
                enemiesOf(caster).forEach(c => {
                    if (c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius) { dealDamage(caster, c, dmg, 'physical'); hits++; }
                });
                log(`🌀 ¡Giro de Combate! Golpeaste a ${hits} enemigo(s) por ${dmg} c/u.`);
                return true;
            }
        },
        AXE_FURIA: {
            id: 'AXE_FURIA', name: 'Furia del Guerrero', kind: 'active', isUltimate: true,
            tags: ['MEJORA', 'AL_RECIBIR_DAÑO', 'AL_MATAR'],
            values: { cooldown: [50, 45, 40], manaCost: [80, 100, 120], duration: [6, 8, 10], atkPct: [0.3, 0.4, 0.5], atkSpeedPct: 0.3, dmgReduction: 0.2, stackAtk: 2, stackCap: [20, 30, 40], armorPerKill: [0.5, 0.75, 1] },
            description: 'DEFINITIVA. {duration}s: +{atkPct%} daño físico, +{atkSpeedPct%} vel. ataque, +{dmgReduction%} reducción de daño. Cada golpe recibido suma +{stackAtk} de daño (hasta +{stackCap}). ESCALADO: cada baja durante la Furia te da +{armorPerKill} de armadura permanente.',
            cast(caster) {
                const skill = this;
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { atkPct: val(this, caster, 'atkPct'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), dmgReduction: val(this, caster, 'dmgReduction'), flatAtk: 0 },
                    hooks: {
                        onDamaged(owner, { dealt }, effect) {
                            if (dealt > 0) effect.mods.flatAtk = Math.min(val(skill, owner, 'stackCap'), effect.mods.flatAtk + val(skill, owner, 'stackAtk'));
                        },
                        onKill(owner) { grantPermanent(owner, 'armor', val(skill, owner, 'armorPerKill'), skill.name); }
                    }
                });
                log('🔥 ¡FURIA DEL GUERRERO!');
                return true;
            }
        }
    },
    SNIPER: {
        SNIPER_POTENTE: {
            id: 'SNIPER_POTENTE', name: 'Disparo Potente', kind: 'active',
            tags: ['FÍSICO'],
            values: { cooldown: [8, 7, 6, 5], manaCost: 35, dmgMult: [1.4, 1.8, 2.2, 2.6] },
            description: 'Disparo preciso: {dmgMult%} de tu daño físico al enemigo más cercano.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 2);
                if (!target) { log('Disparo Potente: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                log(`🎯 ¡Disparo Potente a ${target.label}! (-${dealt} HP)`);
                return true;
            }
        },
        SNIPER_CONGELANTE: {
            id: 'SNIPER_CONGELANTE', name: 'Disparo Congelante', kind: 'active',
            tags: ['FÍSICO', 'CONTROL'],
            values: { cooldown: 9, manaCost: 30, dmgMult: [0.8, 1.0, 1.2, 1.4], slow: [0.4, 0.5, 0.6, 0.7], farSlowBonus: 0.2, duration: 3 },
            description: '{dmgMult%} de tu daño físico y ralentiza {slow%} por {duration}s (+{farSlowBonus%} si el objetivo está a más de 80% de tu rango).',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 2);
                if (!target) { log('Disparo Congelante: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                dealDamage(caster, target, dmg, 'physical');
                const farAway = Math.hypot(caster.x - target.x, caster.y - target.y) > caster.attackRange * 0.8;
                const slow = Math.min(0.9, val(this, caster, 'slow') + (farAway ? val(this, caster, 'farSlowBonus') : 0));
                if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Congelado', duration: val(this, caster, 'duration'), mods: { moveSpeedPct: -slow } });
                log(`❄️ ¡Disparo Congelante a ${target.label}! -${Math.round(slow * 100)}% velocidad.`);
                return true;
            }
        },
        SNIPER_VISION: {
            id: 'SNIPER_VISION', name: 'Visión de Cazador', kind: 'active',
            tags: ['MEJORA'],
            values: { cooldown: 16, manaCost: 40, duration: [4, 5, 6, 7], rangePct: [0.3, 0.4, 0.5, 0.6], atkPct: [0.15, 0.25, 0.35, 0.45], moveSlow: 0.5 },
            description: '{duration}s: +{rangePct%} de rango y +{atkPct%} de daño físico, pero -{moveSlow%} de velocidad de movimiento.',
            cast(caster) {
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { rangePct: val(this, caster, 'rangePct'), atkPct: val(this, caster, 'atkPct'), moveSpeedPct: -val(this, caster, 'moveSlow') }
                });
                log('👁️ ¡Visión de Cazador!');
                return true;
            }
        },
        SNIPER_MORTAL: {
            id: 'SNIPER_MORTAL', name: 'Disparo Mortal', kind: 'active', isUltimate: true,
            tags: ['FÍSICO', 'CRÍTICO', 'AL_MATAR'],
            values: { cooldown: [60, 50, 40], manaCost: [90, 110, 130], dmgMult: [3.0, 3.5, 4.0], farBonus: 0.5, critChance: 0.6, atkPerKill: [3, 4, 5] },
            description: 'DEFINITIVA. Proyectil devastador: {dmgMult%} de tu daño físico (+{farBonus%} a distancia máxima), con {critChance%} de probabilidad de crítico. Alcance: 3 veces tu rango. ESCALADO: si mata al objetivo, +{atkPerKill} de daño de ataque permanente.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange * 3);
                if (!target) { log('Disparo Mortal: sin objetivo en rango.'); return false; }
                const distPct = Math.hypot(caster.x - target.x, caster.y - target.y) / caster.attackRange;
                const farMult = distPct > 0.8 ? 1 + val(this, caster, 'farBonus') : distPct > 0.45 ? 1 + val(this, caster, 'farBonus') / 2 : 1;
                let dmg = Math.round(caster.atk * val(this, caster, 'dmgMult') * farMult);
                const isCrit = Math.random() < val(this, caster, 'critChance');
                if (isCrit) dmg = Math.round(dmg * 2);
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                log(`💀 ¡DISPARO MORTAL a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dealt} HP)`);
                if (!target.isAlive()) grantPermanent(caster, 'atk', val(this, caster, 'atkPerKill'), this.name);
                return true;
            }
        }
    },
    ASSASSIN: {
        ASSASSIN_BLINK: {
            id: 'ASSASSIN_BLINK', name: 'Parpadeo', kind: 'active',
            tags: ['MOVILIDAD', 'FÍSICO'],
            values: { cooldown: [14, 12, 10, 8], manaCost: 35, range: 8, atkSpeedPct: [0.2, 0.3, 0.4, 0.5], buffDuration: 2 },
            description: 'Teletransporte de hasta {range} casillas junto al enemigo más cercano: ataca de inmediato y gana +{atkSpeedPct%} vel. ataque por {buffDuration}s.',
            cast(caster) {
                const target = nearestEnemy(caster, val(this, caster, 'range'));
                if (!target) { log('Parpadeo: sin objetivo en rango.'); return false; }
                blinkNextTo(caster, target);
                addEffect(caster, { id: this.id, name: this.name, duration: val(this, caster, 'buffDuration'), tags: ['MEJORA'], mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct') } });
                const { dmg, isCrit } = rollAttackDamage(caster, target);
                resolveBasicHit(caster, target, dmg, isCrit);
                log(`💨 ¡Parpadeo junto a ${target.label}!`);
                return true;
            }
        },
        ASSASSIN_CRITSTRIKE: {
            id: 'ASSASSIN_CRITSTRIKE', name: 'Golpe Crítico', kind: 'active',
            tags: ['FÍSICO', 'CRÍTICO'],
            values: { cooldown: 8, manaCost: 40, dmgMult: [1.2, 1.5, 1.8, 2.1], extraCrit: 25 },
            description: '{dmgMult%} de tu daño físico al enemigo más cercano, con +{extraCrit}% de probabilidad extra de crítico.',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 1);
                if (!target) { log('Golpe Crítico: sin objetivo en rango.'); return false; }
                let dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const isCrit = Math.random() < (effCritChance(caster) + val(this, caster, 'extraCrit')) / 100;
                if (isCrit) dmg = Math.round(dmg * 2);
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                log(`⚔️ ¡Golpe Crítico a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dealt} HP)`);
                return true;
            }
        },
        ASSASSIN_LETHALSPEED: {
            id: 'ASSASSIN_LETHALSPEED', name: 'Velocidad Letal', kind: 'active',
            tags: ['MEJORA', 'AL_GOLPEAR'],
            values: { cooldown: 14, manaCost: 35, duration: 4, atkSpeedPct: [0.4, 0.6, 0.8, 1.0], comboStep: 0.05, comboCap: [0.3, 0.4, 0.5, 0.6] },
            description: '{duration}s: +{atkSpeedPct%} velocidad de ataque. Cada golpe consecutivo al mismo enemigo suma +{comboStep%} de daño (hasta +{comboCap%}; se reinicia si cambiás de objetivo).',
            cast(caster) {
                const step = val(this, caster, 'comboStep'), cap = val(this, caster, 'comboCap');
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { atkSpeedPct: val(this, caster, 'atkSpeedPct') }, data: { comboTarget: null, stacks: 0 },
                    hooks: {
                        beforeAttack(owner, ctx, effect) {
                            if (effect.data.comboTarget !== ctx.target) { effect.data.comboTarget = ctx.target; effect.data.stacks = 0; }
                            ctx.dmg *= 1 + Math.min(cap, effect.data.stacks * step);
                            effect.data.stacks++;
                        }
                    }
                });
                log('⚡ ¡Velocidad Letal! Combo activo.');
                return true;
            }
        },
        ASSASSIN_MASACRE: {
            id: 'ASSASSIN_MASACRE', name: 'Masacre', kind: 'active', isUltimate: true,
            tags: ['MEJORA', 'CRÍTICO', 'AL_MATAR'],
            values: { cooldown: [55, 50, 45], manaCost: 90, duration: 6, critChance: [40, 50, 60], atkSpeedPct: 0.4, moveSpeedPct: 0.25, extendPerKill: 1.5, critPerKill: [1, 1.5, 2] },
            description: 'DEFINITIVA. {duration}s: +{critChance}% prob. crítico, +{atkSpeedPct%} vel. ataque, +{moveSpeedPct%} vel. movimiento. Cada baja extiende la duración +{extendPerKill}s. ESCALADO: cada baja durante la Masacre te da +{critPerKill}% de crítico permanente.',
            cast(caster) {
                const skill = this;
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { critChance: val(this, caster, 'critChance'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), moveSpeedPct: val(this, caster, 'moveSpeedPct') },
                    hooks: {
                        onKill(owner, payload, effect) {
                            effect.until += val(skill, owner, 'extendPerKill');
                            grantPermanent(owner, 'critChance', val(skill, owner, 'critPerKill'), skill.name);
                        }
                    }
                });
                log('🔪 ¡MASACRE!');
                return true;
            }
        }
    },
    VAMPIRE: {
        VAMP_DARKBLOOD: {
            id: 'VAMP_DARKBLOOD', name: 'Sangre Oscura', kind: 'active',
            tags: ['MEJORA', 'ROBO_VIDA'],
            values: { cooldown: 12, manaCost: 25, hpCost: 0.08, duration: 5, atkPct: [0.2, 0.3, 0.4, 0.5], lifestealBonus: [0.3, 0.5, 0.7, 0.9] },
            description: 'Consumís {hpCost%} de tu vida actual y ganás +{atkPct%} daño físico por {duration}s; tu robo de vida cura +{lifestealBonus%} mientras dura.',
            cast(caster) {
                const cost = Math.round(caster.hp * val(this, caster, 'hpCost'));
                caster.hp = Math.max(1, caster.hp - cost);
                const bonus = val(this, caster, 'lifestealBonus');
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { atkPct: val(this, caster, 'atkPct') },
                    hooks: { beforeLifesteal(owner, ctx) { ctx.mult += bonus; } }
                });
                log(`🩸 ¡Sangre Oscura! -${cost} HP propia.`);
                return true;
            }
        },
        VAMP_CLAW: {
            id: 'VAMP_CLAW', name: 'Garra Vampírica', kind: 'active',
            tags: ['FÍSICO', 'ROBO_VIDA'],
            values: { cooldown: [7, 6, 5, 4], manaCost: 30, dmgMult: [1.0, 1.3, 1.6, 1.9], healPct: 0.2 },
            description: '{dmgMult%} de tu daño físico al enemigo más cercano; recuperás {healPct%} del daño como vida (el doble si tiene <30% HP).',
            cast(caster) {
                const target = nearestEnemy(caster, caster.attackRange + 1);
                if (!target) { log('Garra Vampírica: sin objetivo en rango.'); return false; }
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const lowHp = target.maxHp && target.hp / target.maxHp < 0.3;
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                const heal = healUnit(caster, Math.round(dealt * val(this, caster, 'healPct') * (lowHp ? 2 : 1)));
                log(`🐾 ¡Garra Vampírica a ${target.label}! (-${dealt} HP, +${heal} HP propia)`);
                return true;
            }
        },
        VAMP_LEAP: {
            id: 'VAMP_LEAP', name: 'Salto Sangriento', kind: 'active',
            tags: ['MOVILIDAD', 'FÍSICO', 'CONTROL'],
            values: { cooldown: [12, 11, 10, 9], manaCost: 35, range: 6, dmgMult: [0.8, 1.0, 1.2, 1.4], slow: 0.4, slowDuration: [1.5, 2, 2.5, 3] },
            description: 'Saltás hasta {range} casillas hacia el enemigo más cercano: {dmgMult%} de daño físico de impacto y -{slow%} velocidad por {slowDuration}s.',
            cast(caster) {
                const target = nearestEnemy(caster, val(this, caster, 'range'));
                if (!target) { log('Salto Sangriento: sin objetivo en rango.'); return false; }
                blinkNextTo(caster, target);
                const dmg = Math.round(caster.atk * val(this, caster, 'dmgMult'));
                const { dealt } = dealDamage(caster, target, dmg, 'physical');
                if (target.isAlive()) addEffect(target, { id: 'SLOW_' + this.id, name: 'Desgarrado', duration: val(this, caster, 'slowDuration'), mods: { moveSpeedPct: -val(this, caster, 'slow') } });
                log(`🦇 ¡Salto Sangriento sobre ${target.label}! (-${dealt} HP)`);
                return true;
            }
        },
        VAMP_IMMORTAL: {
            id: 'VAMP_IMMORTAL', name: 'Forma Inmortal', kind: 'active', isUltimate: true,
            tags: ['MEJORA', 'ROBO_VIDA', 'AL_RECIBIR_DAÑO'],
            values: { cooldown: [70, 60, 50], manaCost: 100, duration: [5, 6, 7], atkPct: 0.3, atkSpeedPct: 0.3, lifesteal: [20, 25, 30], payback: [0.4, 0.3, 0.2], healStep: 50, hpPerStep: [5, 7, 10] },
            description: 'DEFINITIVA. {duration}s: +{atkPct%} daño físico, +{atkSpeedPct%} vel. ataque, +{lifesteal}% robo de vida, y tu vida no puede bajar de 1. Al terminar recibís {payback%} del daño acumulado. ESCALADO: cada {healStep} de vida curada durante la forma te da +{hpPerStep} de HP máximo permanente.',
            cast(caster) {
                const skill = this;
                addEffect(caster, {
                    id: this.id, name: this.name, duration: val(this, caster, 'duration'), tags: this.tags,
                    mods: { atkPct: val(this, caster, 'atkPct'), atkSpeedPct: val(this, caster, 'atkSpeedPct'), lifesteal: val(this, caster, 'lifesteal') },
                    flags: ['preventDeath'], data: { accumulated: 0, healed: 0 },
                    hooks: {
                        onDamaged(owner, { dealt }, effect) { effect.data.accumulated += dealt; },
                        onHeal(owner, { amount }, effect) {
                            const step = val(skill, owner, 'healStep');
                            effect.data.healed += amount;
                            while (effect.data.healed >= step) {
                                effect.data.healed -= step;
                                grantPermanent(owner, 'maxHp', val(skill, owner, 'hpPerStep'), skill.name);
                            }
                        },
                        onExpire(owner, effect) {
                            const payback = Math.round(effect.data.accumulated * val(skill, owner, 'payback'));
                            if (payback <= 0) return;
                            owner.hp = Math.max(0, owner.hp - payback);
                            log(`⚠️ Forma Inmortal termina: recibís ${payback} de daño acumulado.`);
                            if (!owner.isAlive()) onHeroDeath(owner);
                        }
                    }
                });
                log('🧛 ¡FORMA INMORTAL! No podés morir mientras dure.');
                return true;
            }
        }
    }
};
