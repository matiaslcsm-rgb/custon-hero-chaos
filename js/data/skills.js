// Habilidades de cada héroe. Cada una lleva su propia lógica en cast():
//   - `this` es la habilidad misma (para leer this.duration, this.name, etc.).
//   - Devuelve false si no pudo lanzarse (ej: sin objetivo en rango): en ese caso no se cobra maná ni cooldown.
//   - Devuelve true si se lanzó; handleSkillKeypress() se encarga de cobrar maná y poner el cooldown.
//
// Kit drafteable por héroe: exactamente 3 normales cada uno. No incluye la pasiva fija de arquetipo
// (ver HERO_TEMPLATES.archetypePassive) ni la definitiva (ver HERO_ULTIMATES, se desbloquea sola al
// aprender las 3 normales). Se draftea 1 al inicio + 1 por cada oleada superada hasta agotar el pool.
const HERO_SKILLS = {
    AXE: {
        AXE_HACHAZO: {
            id: 'AXE_HACHAZO', name: 'Golpe de Hacha', keybind: 'e', cooldown: 5, manaCost: 30,
            description: '[E] 30 maná. Golpe frontal: 120% de tu daño físico al enemigo más cercano. 25% de probabilidad de aturdirlo 1s.',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, player.attackRange + 0.5);
                if (!target) { log('Golpe de Hacha: sin objetivo en rango.'); return false; }
                const dmg = Math.round(player.atk * 1.2);
                damageCreep(target, dmg);
                if (target.isAlive() && Math.random() < 0.25) target.stunnedUntil = gameClock + 1;
                log(`🪓 ¡Golpe de Hacha a ${target.label}! (-${dmg} HP)`);
                return true;
            }
        },
        AXE_PROVOCACION: {
            id: 'AXE_PROVOCACION', name: 'Llamado Provocador', keybind: 'r', cooldown: 14, manaCost: 45,
            description: '[R] 45 maná. Provoca a los enemigos en radio 5 por 2.5s y te da 25% de reducción de daño mientras dura.',
            cast() {
                player.dmgReductionUntil = gameClock + 2.5; player.dmgReductionPct = 0.25;
                player.tauntActiveUntil = gameClock + 2.5;
                let count = 0;
                creeps.forEach(c => { if (c.isAlive() && Math.hypot(c.x - player.x, c.y - player.y) <= 5) count++; });
                log(`🛡️ ¡Llamado Provocador! ${count} enemigos provocados (te atacan a vos). +25% reducción de daño por 2.5s.`);
                return true;
            }
        },
        AXE_GIRO: {
            id: 'AXE_GIRO', name: 'Giro de Combate', keybind: 't', cooldown: 10, manaCost: 40,
            description: '[T] 40 maná. Gira con su arma: 70% de tu daño físico a todos los enemigos en radio 2.',
            cast() {
                const dmg = Math.round(player.atk * 0.7);
                let hits = 0;
                creeps.forEach(c => { if (c.isAlive() && Math.hypot(c.x - player.x, c.y - player.y) <= 2) { damageCreep(c, dmg); hits++; } });
                log(`🌀 ¡Giro de Combate! Golpeaste a ${hits} enemigo(s) por ${dmg} c/u.`);
                return true;
            }
        }
    },
    SNIPER: {
        SNIPER_POTENTE: {
            id: 'SNIPER_POTENTE', name: 'Disparo Potente', keybind: 'e', cooldown: 7, manaCost: 35,
            description: '[E] 35 maná. Disparo preciso: 180% de tu daño físico al enemigo más cercano.',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, player.attackRange + 2);
                if (!target) { log('Disparo Potente: sin objetivo en rango.'); return false; }
                const dmg = Math.round(player.atk * 1.8);
                damageCreep(target, dmg);
                log(`🎯 ¡Disparo Potente a ${target.label}! (-${dmg} HP)`);
                return true;
            }
        },
        SNIPER_CONGELANTE: {
            id: 'SNIPER_CONGELANTE', name: 'Disparo Congelante', keybind: 'r', cooldown: 9, manaCost: 30,
            description: '[R] 30 maná. 100% de tu daño físico y ralentiza 50% por 3s (más si el objetivo está a distancia máxima).',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, player.attackRange + 2);
                if (!target) { log('Disparo Congelante: sin objetivo en rango.'); return false; }
                const dmg = Math.round(player.atk * 1.0);
                damageCreep(target, dmg);
                if (target.isAlive()) target.slowUntil = gameClock + 3;
                log(`❄️ ¡Disparo Congelante a ${target.label}! -50% velocidad 3s.`);
                return true;
            }
        },
        SNIPER_VISION: {
            id: 'SNIPER_VISION', name: 'Visión de Cazador', keybind: 't', cooldown: 16, manaCost: 40, duration: 5,
            description: '[T] 40 maná. 5s: +40% de rango y +25% de daño físico, pero -50% de velocidad de movimiento.',
            cast() {
                player.visionUntil = gameClock + this.duration;
                log('👁️ ¡Visión de Cazador! +40% rango, +25% daño, -50% velocidad de movimiento por 5s.');
                return true;
            }
        }
    },
    ASSASSIN: {
        ASSASSIN_BLINK: {
            id: 'ASSASSIN_BLINK', name: 'Parpadeo', keybind: 'e', cooldown: 12, manaCost: 35,
            description: '[E] 35 maná. Teletransporte de hasta 8 casillas junto al enemigo más cercano: +20% vel. ataque 2s y ataca de inmediato.',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, 8);
                if (!target) { log('Parpadeo: sin objetivo en rango.'); return false; }
                blinkNextTo(target);
                player.atkSpeedBuffUntil = gameClock + 2;
                const { dmg, isCrit } = rollAttackDamage(target);
                resolveBasicHit(target, dmg, isCrit);
                log(`💨 ¡Parpadeo junto a ${target.label}! +20% vel. ataque 2s.`);
                return true;
            }
        },
        ASSASSIN_CRITSTRIKE: {
            id: 'ASSASSIN_CRITSTRIKE', name: 'Golpe Crítico', keybind: 'r', cooldown: 8, manaCost: 40,
            description: '[R] 40 maná. 150% de tu daño físico al enemigo más cercano, con +25% de probabilidad extra de crítico.',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, player.attackRange + 1);
                if (!target) { log('Golpe Crítico: sin objetivo en rango.'); return false; }
                let dmg = Math.round(player.atk * 1.5);
                const isCrit = Math.random() < ((player.critChance || 0) + 25) / 100;
                if (isCrit) dmg = Math.round(dmg * 2);
                damageCreep(target, dmg);
                log(`⚔️ ¡Golpe Crítico a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dmg} HP)`);
                return true;
            }
        },
        ASSASSIN_LETHALSPEED: {
            id: 'ASSASSIN_LETHALSPEED', name: 'Velocidad Letal', keybind: 't', cooldown: 14, manaCost: 35, duration: 4,
            description: '[T] 35 maná. 4s: +60% velocidad de ataque. Cada golpe consecutivo al mismo enemigo suma daño (se reinicia si cambiás de objetivo).',
            cast() {
                player.lethalSpeedUntil = gameClock + this.duration;
                player.lethalSpeedComboUntil = gameClock + this.duration;
                player.comboTarget = null; player.comboStacks = 0;
                log('⚡ ¡Velocidad Letal! +60% vel. ataque por 4s. Combo activo.');
                return true;
            }
        }
    },
    VAMPIRE: {
        VAMP_DARKBLOOD: {
            id: 'VAMP_DARKBLOOD', name: 'Sangre Oscura', keybind: 'e', cooldown: 12, manaCost: 25, duration: 5,
            description: '[E] 25 maná. Consumís 8% de tu vida actual y ganás +30% daño físico por 5s; tu robo de vida aumenta mientras dura.',
            cast() {
                const cost = Math.round(player.hp * 0.08);
                player.hp = Math.max(1, player.hp - cost);
                player.darkBloodUntil = gameClock + this.duration;
                log(`🩸 ¡Sangre Oscura! -${cost} HP propia, +30% daño físico por 5s.`);
                return true;
            }
        },
        VAMP_CLAW: {
            id: 'VAMP_CLAW', name: 'Garra Vampírica', keybind: 'r', cooldown: 6, manaCost: 30,
            description: '[R] 30 maná. 130% de tu daño físico al enemigo más cercano; recuperás 20% del daño como vida (más si tiene <30% HP).',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, player.attackRange + 1);
                if (!target) { log('Garra Vampírica: sin objetivo en rango.'); return false; }
                const dmg = Math.round(player.atk * 1.3);
                const lowHp = target.maxHp && target.hp / target.maxHp < 0.3;
                const dealt = damageCreep(target, dmg);
                const heal = Math.round(dealt * (lowHp ? 0.4 : 0.2));
                player.hp = Math.min(player.maxHp, player.hp + heal);
                log(`🐾 ¡Garra Vampírica a ${target.label}! (-${dmg} HP, +${heal} HP propia)`);
                return true;
            }
        },
        VAMP_LEAP: {
            id: 'VAMP_LEAP', name: 'Salto Sangriento', keybind: 't', cooldown: 10, manaCost: 35,
            description: '[T] 35 maná. Saltás hasta 6 casillas hacia el enemigo más cercano: 100% de daño físico de impacto y -40% velocidad 2s.',
            cast() {
                const target = nearestAliveCreep(player.x, player.y, 6);
                if (!target) { log('Salto Sangriento: sin objetivo en rango.'); return false; }
                blinkNextTo(target);
                const dmg = Math.round(player.atk * 1.0);
                damageCreep(target, dmg);
                if (target.isAlive()) target.slowUntil = gameClock + 2;
                log(`🦇 ¡Salto Sangriento sobre ${target.label}! (-${dmg} HP, -40% velocidad)`);
                return true;
            }
        }
    }
};

// Habilidad definitiva única por héroe: se desbloquea automáticamente (no se draftea) al aprender
// las 3 habilidades normales del kit. Usa la tecla [F] y comparte el mismo sistema de maná/cooldown.
const HERO_ULTIMATES = {
    AXE: {
        id: 'AXE_FURIA', name: 'Furia del Guerrero', keybind: 'f', cooldown: 45, manaCost: 80, duration: 8,
        description: '[F] DEFINITIVA. 80 maná. 8s: +40% daño físico, +30% vel. ataque, +20% reducción de daño. Cada golpe recibido suma daño extra.',
        cast() {
            player.furiaUntil = gameClock + this.duration; player.furiaBonusAtk = 0;
            log('🔥 ¡FURIA DEL GUERRERO! +40% daño, +30% vel. ataque, +20% reducción de daño por 8s.');
            return true;
        }
    },
    SNIPER: {
        id: 'SNIPER_MORTAL', name: 'Disparo Mortal', keybind: 'f', cooldown: 50, manaCost: 90,
        description: '[F] DEFINITIVA. 90 maná. Apunta y dispara un proyectil devastador: 300% de tu daño físico, hasta 450% a distancia máxima, con alta probabilidad de crítico.',
        cast() {
            const target = nearestAliveCreep(player.x, player.y, player.attackRange * 3);
            if (!target) { log('Disparo Mortal: sin objetivo en rango.'); return false; }
            const dist = Math.hypot(player.x - target.x, player.y - target.y);
            const distPct = dist / player.attackRange;
            const mult = distPct > 0.8 ? 4.5 : distPct > 0.45 ? 3.75 : 3.0;
            let dmg = Math.round(player.atk * mult);
            const isCrit = Math.random() < 0.6;
            if (isCrit) dmg = Math.round(dmg * 2);
            damageCreep(target, dmg);
            log(`💀 ¡DISPARO MORTAL a ${target.label}!${isCrit ? ' ¡CRÍTICO!' : ''} (-${dmg} HP)`);
            return true;
        }
    },
    ASSASSIN: {
        id: 'ASSASSIN_MASACRE', name: 'Masacre', keybind: 'f', cooldown: 50, manaCost: 90, duration: 6,
        description: '[F] DEFINITIVA. 90 maná. 6s: +50% prob. crítico, +40% vel. ataque, +25% vel. movimiento. Cada baja extiende la duración +1.5s.',
        cast() {
            player.masacreUntil = gameClock + this.duration;
            log('🔪 ¡MASACRE! +50% crítico, +40% vel. ataque, +25% vel. movimiento por 6s.');
            return true;
        }
    },
    VAMPIRE: {
        id: 'VAMP_IMMORTAL', name: 'Forma Inmortal', keybind: 'f', cooldown: 60, manaCost: 100, duration: 6,
        description: '[F] DEFINITIVA. 100 maná. 6s: +30% daño físico, +30% vel. ataque, +25% robo de vida, y tu vida no puede bajar de 1. Al terminar, recibís parte del daño acumulado.',
        cast() {
            player.immortalUntil = gameClock + this.duration;
            player.immortalAccumulatedDmg = 0;
            log('🧛 ¡FORMA INMORTAL! No podés morir por 6s. +30% daño, +30% vel. ataque, +25% robo de vida.');
            return true;
        }
    }
};
