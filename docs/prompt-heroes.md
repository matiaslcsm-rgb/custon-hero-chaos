# Prompt para diseñar héroes con otra IA (Gemini, ChatGPT…)

Copiá el bloque de abajo, reemplazá lo que está entre corchetes y pegale la respuesta a Claude para integrarla.
Actualizalo cuando el motor sume funciones nuevas (y la lista de símbolos usados).

```text
Estoy desarrollando un juego web en JavaScript inspirado en "Custom Hero Chaos" (Dota 2). Necesito que diseñes
[CANTIDAD] héroes nuevos de tipo [FUERZA / AGILIDAD / INTELIGENCIA (mago)]. Ideas/temática: [TUS IDEAS O "libre"].

Devolvé los héroes EXACTAMENTE en el formato de datos de abajo, usando SOLO las funciones del motor que te listo.
Si una idea necesita algo que el motor no tiene, no lo inventes en el código: explicalo en las notas de diseño.

=== REGLAS DEL JUEGO ===
- Cada héroe tiene: 1 INNATO (pasiva fija, no se draftea) + 4 HABILIDADES NATURALES (3 normales + 1 DEFINITIVA).
- Los jugadores draftean habilidades de TODOS los héroes y las mezclan. Por eso CADA HABILIDAD TIENE QUE FUNCIONAR
  SOLA en cualquier héroe: no puede depender del innato de su héroe ni de otra habilidad del kit.
- Niveles estilo Dota 2: las normales tienen 4 niveles; la definitiva tiene 3 (se suben en los niveles 6/12/18 del héroe).
- La definitiva es la habilidad más fuerte, con enfriamiento largo, y SIEMPRE trae un "Ascenso": una mejora PERMANENTE
  con condición (ej: "cada baja durante el efecto da +1 de armadura permanente").
- El innato define la identidad del héroe y reacciona a eventos del combate.
- El mapa es una grilla de 20x12 casillas; los rangos y radios se miden en casillas.
- Daño: 'physical' (lo reduce la armadura, 4% por punto, máx 80%), 'magical' (lo reduce la resistencia mágica, máx 75%),
  'pure' (sin reducción). Los magos (principal Inteligencia) tienen +100% de amplificación de hechizo: el motor ya
  multiplica su daño mágico automáticamente. NO multipliques vos por spellAmp.
- Atributos por punto: Fuerza +5 HP y +0.05 regen HP; Agilidad +1% vel. ataque, +1% vel. movimiento, +0.1% crítico,
  +0.08 armadura; Inteligencia +4 maná, +0.05 regen maná, +0.1% amp. hechizo, +0.1% resistencia mágica.
  Atributo principal: además +0.8 de daño de ataque por punto.

=== CRITERIOS OBLIGATORIOS PARA CADA HÉROE ===
1. Identidad clara: rol distinto a los existentes: Axe (tanque contraataque), Sniper (tirador), Asesino (críticos),
   Guerrero Vampiro (robo de vida), Arcanista (ráfaga por cargas), Bruja del Hielo (control y ralentización),
   Nigromante (drenaje), Sabio del Vacío (movilidad y área), Alquimista (ácido y reducir armadura),
   Danzante Cinético (duelista móvil: el movimiento da daño).
2. Innato único que funcione con cualquier kit.
3. 3 normales + 1 definitiva, con al menos 1 activa.
4. Cada habilidad sirve sola en cualquier héroe.
5. Definitiva con Ascenso y valores para 3 niveles; normales con valores para 4 niveles.
6. Etiquetas declaradas, SOLO de esta lista: FÍSICO, MÁGICO, PURO, AL_GOLPEAR, AL_MATAR, AL_RECIBIR_DAÑO, AL_LANZAR, AL_MOVERSE,
   CRÍTICO, ROBO_VIDA, CURACIÓN, CONTROL, MOVILIDAD, ÁREA, DAÑO_EN_EL_TIEMPO, MEJORA, PERJUICIO, INVOCACIÓN.
7. Que se pueda contrarrestar: en las notas decí qué ítem o tipo de creep lo contrarresta.
8. Números dentro de estos rangos de referencia:
   - Nivel 1 del héroe: HP total 180-240; daño de ataque 25-32; maná 150-250.
   - Habilidades normales: enfriamiento 5-16 s, costo 25-60 de maná. Físicas: 70%-260% del daño de ataque.
     Mágicas: daño base 40-160 según nivel, más un % de Inteligencia (ej: + 50% de INT).
   - Daño o curación por segundo en pasivas: bajo (5-25 por segundo), porque actúan todo el tiempo.
   - Controles: aturdir 0.5-2 s, ralentizar 20%-70% por 1.5-4 s.
   - Definitivas: enfriamiento 40-70 s, costo 80-150 de maná.
9. No copiar la mecánica de una habilidad existente con otro nombre.
10. Símbolo de 1 carácter que NO sea ninguno de estos (ya usados): @ S K V A F N Ø L D x g r s b c h e a k t w f z d $ q J Ω

=== FORMATO ===
Un bloque por héroe:

registerHero({
    key: 'CLAVE', name: 'Nombre', symbol: 'Z', primaryAttr: 'INT', role: 'Rol corto',
    attributes: { str: [16, 1.6], agi: [14, 1.4], int: [24, 3.2] },   // [base, ganancia por nivel]; el principal crece más
    baseHp: 110, baseAtk: 8, baseAtkSpeed: 0.9, baseAttackRange: 4,   // HP total = baseHp + STR*5; daño = baseAtk + principal*0.8
    baseArmor: 0, baseMagicResist: 15, baseHpRegen: 0.5,
    baseMaxMana: 120, baseManaRegen: 2.0, baseMoveSpeed: 2.7, baseProjectileSpeed: 10,  // 0 = cuerpo a cuerpo
    baseCritChance: 5, baseEvasion: 5, baseSpellAmp: 0, baseLifesteal: 0,
    description: 'Inteligencia: descripción corta del estilo de juego.',
    // Escalado chico del héroe. stat: 'armor' | 'atk' | 'critChance' | 'lifesteal' | 'maxHp'
    scaling: { stat: 'maxHp', perKills: 10, perKillsAmount: 10, perHeroKill: 30 },
    innate: {
        id: 'CLAVE_INNATO', name: 'Nombre', tags: ['MÁGICO', 'AL_LANZAR'],
        description: 'Innato: texto con los números concretos.',
        hooks: { onCast(owner, payload) { /* ... */ } }
    }
}, {
    CLAVE_HABILIDAD1: {
        id: 'CLAVE_HABILIDAD1', name: 'Nombre', kind: 'active',   // 'active' o 'passive'
        tags: ['MÁGICO', 'ÁREA'],
        // Un array = un valor por nivel (4 en normales, 3 en la definitiva); un número suelto = igual en todos.
        // cooldown y manaCost son obligatorios en las activas. Porcentajes como fracción (0.3 = 30%) y SIEMPRE
        // positivos (para ralentizar, guardá 0.3 y aplicá -val(...) en el mod).
        values: { cooldown: [10, 9, 8, 7], manaCost: [40, 50, 60, 70], baseDmg: [50, 90, 130, 170], intRatio: 0.5, radius: 2 },
        // Marcadores: {clave} muestra el valor; {clave%} lo muestra como porcentaje (0.5 → 50%).
        // La descripción tiene que decir exactamente lo que hace el código.
        description: 'Explota: {baseDmg} + {intRatio%} de tu Inteligencia como daño mágico a los enemigos en radio {radius}.',
        cast(caster) {
            const radius = val(this, caster, 'radius');
            const targets = enemiesOf(caster).filter(c => c.isAlive() && Math.hypot(c.x - caster.x, c.y - caster.y) <= radius);
            if (!targets.length) { log('Nombre: sin enemigos cerca.'); return false; }   // false = no se cobra maná ni enfriamiento
            const dmg = val(this, caster, 'baseDmg') + caster.int * val(this, caster, 'intRatio');
            targets.forEach(c => dealDamage(caster, c, dmg, 'magical'));
            log(`✨ ¡Nombre! ${targets.length} enemigo(s) alcanzados.`);
            return true;
        }
    },
    CLAVE_PASIVA: {
        id: 'CLAVE_PASIVA', name: 'Nombre', kind: 'passive', tags: ['DAÑO_EN_EL_TIEMPO'],
        values: { dmgPerSecond: [5, 10, 15, 20], radius: 2 },
        description: 'Pasiva: los enemigos en radio {radius} sufren {dmgPerSecond} de daño mágico por segundo.',
        hooks: {
            // Dentro de los hooks de una pasiva, `this` es la habilidad.
            // onTick corre CADA FRAME: para algo "por segundo" usá everyInterval (si no, el daño por frame se redondea a 0).
            onTick(owner, { dt }) {
                if (!owner.isAlive() || !everyInterval(owner, this.id, dt)) return;
                /* ... */
            }
        }
    },
    // ... las demás normales y la definitiva (isUltimate: true) ...
});

=== FUNCIONES DEL MOTOR QUE PODÉS USAR (y nada más) ===
- val(this, caster, 'clave')            → valor según el nivel actual de la habilidad. Si lo usás dentro del hook de un
                                          efecto creado con addEffect, guardá antes `const skill = this;` y usá val(skill, owner, ...)
- nearestEnemy(caster, rango)           → enemigo vivo más cercano dentro del rango, o null
- enemiesOf(caster)                     → lista de enemigos (tienen x, y, hp, maxHp, isAlive(), label)
- dealDamage(caster, objetivo, cantidad, 'physical' | 'magical' | 'pure') → devuelve { dealt } (vida quitada de verdad)
- healUnit(unidad, cantidad)            → cura y devuelve cuánto curó
- addEffect(unidad, { id, name, duration, tags, mods, flags, hooks, data }) → efecto temporal (mismo id = se refresca)
    mods:  atkPct, flatAtk, atkSpeedPct, moveSpeedPct (negativo = ralentizar), rangePct, critChance, lifesteal,
           dmgReduction, dmgTakenPct, armor (negativo = reducir), magicResist, evasion, spellAmp
    flags: 'stun', 'invulnerable', 'preventDeath', 'taunt', 'freeCast'
    hooks: los mismos eventos de abajo + onExpire(owner, effect); data: estado libre del efecto
- getEffect(unidad, id), hasFlag(unidad, flag), removeEffect(unidad, id)
- everyInterval(unidad, clave, dt, segundos = 1) → true una vez por intervalo (auras, daño en el tiempo, regeneración)
- grantPermanent(heroe, stat, cantidad, nombreFuente) → Ascenso.
    stat: 'armor' | 'atk' | 'critChance' | 'lifesteal' | 'maxHp' | 'str' | 'agi' | 'int'
- blinkNextTo(caster, objetivo)         → teletransporta al caster al lado del objetivo
- rollAttackDamage(caster, objetivo) y resolveBasicHit(caster, objetivo, dmg, isCrit) → un ataque básico instantáneo
- effCritChance(u), effArmor(u), effEvasion(u), effSpellAmp(u) → valores actuales (base + efectos)
- tryCastSkill(heroe, habilidad) → lanza otra habilidad del kit respetando maná y enfriamiento
- log('texto')                          → mensaje en el registro de combate (no lo uses en cada golpe o cada frame)
- Datos del caster: caster.atk, caster.int, caster.str, caster.agi, caster.attackRange, caster.hp, caster.maxHp,
  caster.mana, caster.maxMana, caster.x, caster.y
Eventos para hooks: hook(dueño, payload)
- beforeAttack { target, dmg }     (se puede modificar dmg)
- onHit { target, dealt, isCrit }  (ataque básico)       onDealDamage { target, dealt, type } (cualquier daño hecho)
- onKill { victim }  onDamaged { source, dealt, type }  beforeLifesteal { target, mult }  onHeal { amount }
- onCast { skill }  onTick { dt } (cada frame)  onMove { steps } (avanzó casillas)

=== QUÉ QUIERO QUE ME DEVUELVAS, POR CADA HÉROE ===
1. El bloque registerHero(...) completo.
2. Notas de diseño cortas:
   - Fantasía / estilo de juego en 2 líneas.
   - 2-3 sinergias con habilidades de otros héroes.
   - Qué lo contrarresta (ítem o tipo de creep).
   - Cualquier mecánica que no pudiste hacer con el motor y habría que agregar.
Usá ids en MAYÚSCULAS con un prefijo único por héroe. Textos en español rioplatense.
```
