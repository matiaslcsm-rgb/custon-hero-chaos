# Custom Hero Chaos — Documento de diseño

Documento vivo: define las reglas del juego y el orden en que se van construyendo.
Si algo del código contradice este documento, se discute y se actualiza uno de los dos.

---

## 1. Visión general

Cada jugador elige un **héroe**, arma su kit **drafteando habilidades** (propias o de otros héroes),
compra **ítems** según lo que enfrenta y compite en dos frentes:

- **PvE:** oleadas de creeps que exigen armarse de forma situacional; si no te adaptás, te matan.
- **PvP:** duelos contra otros héroes y **apuestas** sobre esos duelos. El objetivo es quedar primero.

El corazón del juego es el **loop de escalado**: armar sinergias entre habilidades, hacerlas crecer
con la definitiva y contrarrestar las del rival con ítems.

---

## 2. Anatomía de un héroe

| Parte | Cantidad | ¿Se draftea? | Descripción |
|---|---|---|---|
| **Innato** | 1 | No, viene con el héroe | Mecánica permanente que define su identidad. Funciona con cualquier combinación de habilidades. Conserva un **escalado chico** propio del héroe. |
| **Habilidades naturales** | 4 | Sí | 3 normales + 1 definitiva. Pueden ser activas o pasivas. |
| └ **Definitiva** | 1 de las 4 | Sí | La más fuerte del héroe. Siempre trae una **mecánica de escalado fuerte** y permanente. |
| **Stats base** | — | — | Atributo principal (STR/AGI/INT), HP, daño, rango, etc. |

**Decisión — escalado repartido:** el héroe (vía su innato) tiene un escalado chico por bajas y duelos; la definitiva
trae el escalado fuerte. Si drafteás la definitiva de otro héroe, sumás su escalado al tuyo.

### Atributos (Fuerza, Agilidad, Inteligencia) — estilo Dota 2 ✅

Cada héroe tiene **atributos base** y **ganancia por nivel**; el atributo principal crece más rápido.
Además, con el kit al máximo cada punto sobrante da +1 a los tres (ver §3).

| Atributo | Por cada punto |
|---|---|
| **Fuerza (STR)** | +5 HP máximo · +0,05 regeneración de HP/s |
| **Agilidad (AGI)** | +1% velocidad de ataque · +1% velocidad de movimiento (hasta 40 AGI) · +0,1% crítico · **+0,08 armadura** |
| **Inteligencia (INT)** | +4 maná máximo · +0,05 regeneración de maná/s · +0,1% amplificación de hechizo · **+0,1% resistencia mágica** |
| **Atributo principal** | Además: +0,8 daño de ataque |
| **Magos** (principal Inteligencia) | Además: **+100% amplificación de hechizo** (su daño mágico se duplica) |

| Héroe | Fuerza | Agilidad | Inteligencia |
|---|---|---|---|
| Axe (STR) | **24 + 2,8** | 12 + 1,6 | 14 + 1,6 |
| Sniper (AGI) | 16 + 1,8 | **22 + 3,0** | 15 + 1,4 |
| Asesino (AGI) | 18 + 2,0 | **22 + 3,2** | 14 + 1,4 |
| Vampiro (STR) | **24 + 3,0** | 14 + 1,8 | 14 + 1,4 |

*La vida y el daño base de cada héroe se ajustaron para que en nivel 1 queden igual que antes del cambio.*
Los coeficientes están en `ATTRIBUTE_RULES` (hero.js).

### Daño
Todo el daño pasa por una sola función (`dealDamage`) para héroes y creeps. Tres tipos:

| Tipo | Lo reduce | Máximo de reducción |
|---|---|---|
| **Físico** | Armadura: 4% por punto | 80% |
| **Mágico** | Resistencia mágica (y lo aumenta la amplificación de hechizo del atacante) | 75% |
| **Puro** | Nada | — |

- **El esquive solo evita ataques básicos**, no habilidades (como en Dota 2).
- Los creeps también tienen armadura (Grunt 1, Bruto 3, jefe +2) y pueden tener resistencia mágica.

### Escalado propuesto para las definitivas actuales

Cada definitiva suma un escalado fuerte con una condición que invita a usarla bien (el escalado del héroe se mantiene, más chico):

| Héroe | Definitiva | Escalado (permanente, toda la partida) |
|---|---|---|
| Axe | Furia del Guerrero | Cada baja **durante** la Furia: +0,5 armadura |
| Sniper | Disparo Mortal | Si mata al objetivo: +3 daño de ataque |
| Asesino | Masacre | Cada baja durante la Masacre: +1% crítico |
| Vampiro | Forma Inmortal | Cada 50 de vida curada durante la forma: +5 HP máx. |

Así, drafteando la definitiva de otro héroe te llevás también su forma de escalar.

---

## 3. Niveles: experiencia y puntos de habilidad (estilo Dota 2)

**El héroe gana experiencia** y sube de nivel. **Cada nivel da 1 punto de habilidad.**

| Tipo de habilidad | Niveles | Restricción |
|---|---|---|
| Normal (activa o pasiva) | 4 | Ninguna: se sube cuando quieras |
| Definitiva | 3 | Nivel 1 desde el nivel 6 del héroe, nivel 2 desde el 12, nivel 3 desde el 18 |

- Cada nivel de habilidad mejora sus números (daño, duración, cooldown, costo…). Los valores por nivel se definen en los datos de cada habilidad.
- **La definitiva no se puede subir de golpe:** va de a un nivel cada 6 niveles del héroe. Esto es lo que controla el poder de las definitivas
  (sobre todo si alguien draftea 2).
- **Las habilidades drafteadas llegan en nivel 0** (bloqueadas): hay que invertir un punto para poder usarlas.
- **Los puntos que no se pueden gastar se guardan** (ej: normales al máximo y la definitiva esperando el nivel 12).
- **Cuando el kit está completo y todas sus habilidades al máximo**, cada punto (guardado o nuevo) se convierte en
  **+1 a Fuerza, Agilidad e Inteligencia**, así el héroe siempre escala.

**Fuentes de experiencia (propuesta, a balancear):** bajas de creeps, oleada superada, duelo ganado (más), duelo perdido (menos).

*Implementado (valores provisorios):* creeps 6–28 XP, jefe 120, oleada superada 40 + 20 × n.º de oleada.
Nivel siguiente: 100 + 40 × (nivel − 1). En el prototipo de 5 oleadas el héroe termina cerca del nivel 8.

---

## 4. Draft de habilidades

**Espacios del kit:** 4 espacios **libres** para habilidades activas. Cualquier habilidad (normal o definitiva) puede ir en cualquier espacio,
así que se puede terminar con 2 definitivas o ninguna. *(Decisión tomada: más caos; se controla con los niveles de la definitiva.)*

**Teclas por orden de aprendizaje:** las habilidades activas toman la primera tecla libre entre **E, R, T, F**.

**Pasivas:** no usan tecla ni espacio de activa, y se muestran siempre como un recuadro más chico con su información.
Pero **cuentan como una de las 4 elecciones del draft**: el kit completo son 4 habilidades en total, sean activas o pasivas.

**Cada ronda de draft ofrece 3 opciones:**
- **1 garantizada** de las habilidades naturales de tu héroe (si te queda alguna sin elegir).
- **2 del pool global** (habilidades de todos los héroes).
- Nunca se ofrece algo que ya tenés.

Con suerte armás el héroe "natural"; si no, mezclás a gusto.

**Rondas:** 1 al empezar + 1 después de cada oleada, hasta llenar los 4 espacios.
Las definitivas entran al pool como cualquier otra habilidad.

### Rehacer el kit: Fragmento y Libro del Destino

| Objeto | Cómo se consigue | Qué hace |
|---|---|---|
| **Fragmento del Destino** | Se compra en la tienda (precio a definir) o se gana por ir abajo en el ranking (ver §9) | Quita **al azar** una de tus habilidades y te ofrece **4** nuevas del pool para elegir |
| **Libro del Destino** | Lo gana el **último** del ranking (ver §9) | **Elegís vos** qué habilidad cambiar y te ofrece **6** nuevas para elegir |

- Un Fragmento se puede **usar o vender**.
- **La habilidad reemplazada devuelve sus puntos:** recuperás los puntos invertidos para repartirlos de nuevo.
- Solo se usan fuera de las oleadas.

---

## 5. Sinergias (preparado para muchos héroes y habilidades)

Para que con 50+ habilidades las combinaciones funcionen solas, sin programar cada par a mano,
todo se apoya en tres piezas:

### 4.1 Etiquetas (tags)
Cada habilidad declara qué es y qué hace:

`FÍSICO` `MÁGICO` `PURO` · `AL_GOLPEAR` `AL_MATAR` `AL_RECIBIR_DAÑO` `AL_LANZAR` ·
`CRÍTICO` `ROBO_VIDA` `CONTROL` (aturdir/ralentizar) `MOVILIDAD` `ÁREA` `DAÑO_EN_EL_TIEMPO` `MEJORA` (buff) `INVOCACIÓN`

Los ítems y los creeps también las leen: un ítem "anticuración" afecta todo lo que tenga `ROBO_VIDA`.

### 4.2 Eventos
El combate emite eventos y las habilidades pasivas (o los ítems) se enganchan a ellos:

`alAtacar` · `alGolpear` · `alCritear` · `alMatar` · `alRecibirDaño` · `alLanzarHabilidad` · `cadaSegundo`

Ejemplos de sinergias que salen solas:
- **Contraataque** (innato Axe, `alRecibirDaño`) + **Llamado Provocador** → más golpes recibidos = más contraataques.
- **Hambre** (innato Vampiro) + **Golpe Crítico** (Asesino) → críticos grandes = mucha curación.
- **Velocidad Letal** (Asesino) + **Puntería Perfecta** (innato Sniper) → combo a distancia máxima.

### 4.3 Mejoras y efectos genéricos (buffs/debuffs)
Hoy cada efecto tiene su propio campo en el héroe (`furiaUntil`, `masacreUntil`, `visionUntil`…) y
`rollAttackDamage` los revisa uno por uno. Con muchas habilidades eso no escala.

Modelo nuevo: una lista de efectos activos en cada unidad, todos con la misma forma:
duración, modificadores de stats (+% daño, +% vel. ataque…), reacciones a eventos, y si se puede disipar.
El cálculo de daño suma lo que haya, sin conocer cada habilidad.

---

## 6. Roster y criterios para agregar un héroe

### Roster actual (9 héroes)
| Héroe | Atributo | Rol | Innato |
|---|---|---|---|
| Axe `@` | Fuerza | Tanque de contraataque | Contraataque |
| Sniper `S` | Agilidad | Francotirador de largo alcance | Puntería Perfecta |
| Asesino `K` | Agilidad | Asesino de críticos | Golpe Mortal |
| Guerrero Vampiro `V` | Fuerza | Robo de vida cuerpo a cuerpo | Hambre |
| Arcanista `A` | Inteligencia | Ráfaga que escala lanzando hechizos | Resonancia Arcana |
| Bruja del Hielo `F` | Inteligencia | Control de masas y ralentización | Escarcha Profunda |
| Nigromante `N` | Inteligencia | Drenaje de vida y desgaste | Cosecha de Almas |
| Sabio del Vacío `Ø` | Inteligencia | Movilidad y ráfaga en área | Paso Etéreo |
| Alquimista `L` | Inteligencia | Ácido y reducción de armadura | Gredas Transmutadoras |

Los 5 magos se diseñaron con Gemini (con el prompt de `docs/prompt-heroes.md`) y se ajustaron al motor.
Cada héroe vive en su propio archivo: `js/data/heroes/<héroe>.js`.

**Balance medido** (10 partidas por héroe con su kit natural, jugador automático invulnerable; segundos para limpiar
las 5 oleadas): Sniper 57 · Asesino 59 · Sabio del Vacío 62 · Arcanista 79 · Alquimista 87 · Axe 89 · Nigromante 91 ·
Vampiro 99 · **Bruja del Hielo 44 (a observar)**. En otra medición con kit completo desde el inicio la Bruja quedó pareja
con el Sniper (60 vs 53), así que falta jugarla para confirmar si está fuerte.

**Dificultad con la IA** (16 partidas por héroe, la IA juega sola sin modo dios: draftea, compra y pelea):
Sniper, Asesino, Axe, Vampiro, Nigromante y Alquimista 16/16 · Bruja del Hielo 14/16 · Arcanista y Sabio del Vacío 13/16.

**Ajustes hechos tras medir:**
- **Guerrero Vampiro** ganaba 1/12. Diagnóstico: moría rodeado en las primeras oleadas; es el único sin daño en área y
  su robo de vida (~4,5 HP/s) no alcanzaba contra 5 creeps (~34 de daño/s). Cambiar habilidades, draft o rango casi no
  movía nada; con el innato de Axe ganaba 12/12, así que el problema era Hambre. **Hambre ahora también cura 5% de la
  vida máxima por cada baja** → 16/16.
- **Arcanista** ganaba 69% (Axe 88%). Moría sobre todo contra Arqueros, que tenían más alcance (4,5 contra 4).
  **Rango 4 → 5 y +30 de vida** → 81%.

**Ojo:** con una IA decente casi todos los héroes ganan casi siempre, así que el PvE hoy es fácil. La dificultad debería
subir con los creeps con mecánicas (fase E) y los duelos (fase F).

### IA de héroes ✅
Controla a un héroe en la oleada y fuera de ella (`js/ai.js`). La usa el **Piloto automático** del jugador
(botón o tecla **P**), las pruebas, las mediciones de balance y más adelante los rivales (fase F).

| Situación | Qué hace |
|---|---|
| A distancia (rango ≥ 2,5: tiradores y magos) | Ataca al más cercano; si un enemigo se acerca a menos del 60% de su rango, **retrocede** a la casilla más segura sin dejar de pegar; si no hay nadie a tiro, avanza |
| Cuerpo a cuerpo | Va al enemigo más cercano |
| Habilidades de área | Solo con 2+ enemigos cerca (o el jefe) |
| Definitiva | Con 3+ enemigos cerca o el jefe cerca |
| Mejoras y controles propios | Cuando hay enemigos cerca |
| Movilidad (a distancia) | Solo para acercarse, nunca para meterse entre enemigos |
| Puntos de habilidad | Primero la definitiva; después la de menos nivel |
| Draft | Prefiere sus habilidades naturales; si no tiene definitiva, una definitiva |
| Tienda | Si está Condenado compra una vida; si no, ítems de su atributo principal |

### Criterios

Un héroe entra solo si cumple **todo** esto:

1. **Identidad clara:** atributo principal + rol que no esté cubierto (o una variante claramente distinta).
2. **Innato único:** una mecánica que no repite a otro héroe y funciona con cualquier kit drafteado.
3. **4 habilidades naturales:** 3 normales + 1 definitiva, con al menos 1 activa.
4. **Habilidades autosuficientes:** cada una tiene que servir aunque se draftee sola en otro héroe
   (no puede depender del innato de su héroe original).
5. **Definitiva con escalado:** la más fuerte del kit, cooldown largo, y una mecánica permanente de crecimiento con condición.
   **Niveles definidos:** las normales traen valores para sus 4 niveles y la definitiva para sus 3.
6. **Etiquetas declaradas:** cada habilidad aporta al menos 1 sinergia con etiquetas existentes y, a ser posible, abre 1 nueva.
7. **Contras existentes:** al menos 1 ítem o tipo de creep que contrarreste sus habilidades principales. Si no existe, se crea junto con el héroe.
8. **Presupuesto de poder:** los números entran en los rangos de referencia (a definir con balance: % de daño por segundo de cooldown, duración de controles, etc.).
9. **Sin duplicados:** ninguna habilidad copia la mecánica de otra ya existente con otro nombre.

---

## 7. Ítems: mejorar y contrarrestar

Tres familias:

| Familia | Para qué | Ejemplos |
|---|---|---|
| **Stats** | Base del armado | Cinturón (STR), Guantes (AGI), Túnica (INT), armadura, RM |
| **Potenciadores** | Refuerzan etiquetas propias | +% daño crítico, +duración de mejoras, +% robo de vida |
| **Destino** | Rehacer el kit | Fragmento del Destino (comprable/vendible), Libro del Destino (solo por ranking). Ver §4 |
| **Contras pedidos por los magos** | Pendientes de crear | Silencio (impide lanzar habilidades), inmunidad mágica, anticuración (vs Nigromante y Alquimista), disipar mejoras (vs Furia Química) |
| **Contras** | Anulan etiquetas rivales | Anticuración (vs `ROBO_VIDA`), capa antimagia (vs `MÁGICO`), disipador (quita `MEJORA`), botas firmes (resistencia a `CONTROL`), hoja certera (ignora evasión), coraza de espinas (castiga `AL_GOLPEAR`) |

- **Mejoras por niveles:** los ítems se pueden subir de nivel o combinar (recetas) para escalar a lo largo de la partida.
- **Espacios limitados** de inventario, para que armarse sea una elección y no acumular todo.

---

## 8. Creeps: desafío situacional

Cada tipo de creep tiene una **mecánica** y un **contra**. Si no te armás para lo que viene, te matan.

| Creep | Mecánica | Contra |
|---|---|---|
| Chamán | Daño mágico a distancia | Resistencia mágica |
| Sanador | Cura a los demás creeps | Anticuración o daño explosivo |
| Espectro | 50% de evasión | Hoja certera o daño mágico |
| Acorazado | Armadura muy alta | Daño mágico/puro o reducción de armadura |
| Enjambre | Muchos creeps débiles | Daño en área |
| Kamikaze | Explota al llegar a vos | Rango o movilidad |
| Aturdidor | Controles frecuentes | Resistencia a control |
| Ladrón | Te roba oro y escapa | Ralentizaciones o movilidad |

- **Aviso de la próxima oleada:** en la tienda se ve qué tipos de creeps vienen, para comprar en consecuencia.

### Muerte, vidas y Condenado ✅

Cada héroe empieza con **2 vidas**.

1. **Morir con vidas:** perdés 1 vida y quedás **3 segundos muerto**. Mientras tanto los creeps **pierden el agro**
   y vuelven a su lugar de aparición, así podés acomodarte al revivir. El reloj de la oleada se pausa.
2. **Revivir:** en el mismo lugar, con la vida llena y **Voluntad de Titán** durante **5 segundos**: no recibís daño,
   **+100% velocidad de ataque** y tus habilidades **no gastan maná** (los enfriamientos siguen corriendo).
   Al morir se pierden las mejoras temporales que tenías activas.
3. **Sin vidas → Condenado:** al revivir de tu última vida quedás **Condenado**: recibís **+10% de daño de todas las fuentes**.
   - Si **un creep** te mata estando Condenado, quedás **eliminado** (modo espectador).
   - Si **un héroe** te mata en un duelo *(fase F)*, no quedás eliminado pero sumás **+10% de daño recibido** por cada duelo perdido.
4. **Injusticia de los Codiciosos** (ítem): solo aparece en la tienda estando Condenado. Compra **1 vida** y te saca de Condenado.
   Cuesta **400g** y **cada compra cuesta el doble** que la anterior. Si volvés a quedar sin vidas, el % de daño recibido
   que tenías **se duplica** (ej: +30% → compra → sin vidas otra vez → +60%).

### Temporizadores ✅
Para que nadie estanque la partida, todas las fases tienen tiempo:

| Fase | Tiempo | Si se acaba |
|---|---|---|
| Elección de héroe | 30 s | Se elige uno al azar |
| Draft | 20 s | Se elige una opción al azar |
| Preparación | 30 s | Empieza la oleada (usar un objeto del destino no reinicia este tiempo) |
| Oleada | 30 s | Los creeps se **enfurecen**: +5% de daño y de velocidad de ataque por cada segundo extra |

El tiempo de oleada sale de medir partidas simuladas: limpiar una oleada tarda **13–19 s** (mediana según el héroe),
el 90% de las veces menos de 24 s y el peor caso fue 27 s. Los valores están en `timers.js`.

**Balance a revisar:** un jugador automático simple (camina hacia el enemigo más cercano, sin esquivar) **perdió las 15
partidas con cada héroe** y murió entre las oleadas 1 y 3. No juega bien, pero indica que el juego es exigente al principio.

---

## 9. PvP: duelos, apuestas y ranking

- Varios héroes rivales (controlados por IA al principio) hacen el mismo recorrido: draft, tienda, oleadas.
- Entre oleadas hay **duelos 1v1**. Ganar da el bonus de escalado por duelo.
- Los jugadores **apuestan oro** sobre los duelos (incluidos los ajenos).
- Se pierde con vidas en 0; gana el último en pie o el que termina primero en el ranking.

### Ranking y ayuda a los que van atrás
Partidas de **8 jugadores**. Cuando **todos ya tuvieron su duelo** de la ronda, se arma el **top 8**
ordenado por **puntos y oro**:

| Puesto | Recompensa |
|---|---|
| 1.º a 4.º | Nada extra |
| 5.º a 8.º | 1 **Fragmento del Destino** cada uno (para probar suerte o venderlo) |
| 8.º (último) | Además, 1 **Libro del Destino** |

La idea es que quien va perdiendo tenga herramientas para rehacer su kit y volver a la partida.

---

## 10. Orden de construcción

Cada fase deja el juego jugable.

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **A. Cimientos** ✅ | Quién lanza como parámetro, sistema genérico de mejoras, eventos, etiquetas, teclas por espacio | Sin esto, cada habilidad, ítem y creep nuevo hay que programarlo a mano contra todos los demás |
| **B. Draft y niveles** ✅ | Draft mezclado, definitiva drafteable, experiencia y niveles de habilidad, escalado en la definitiva, pasivas sin espacio, Fragmento del Destino en la tienda | Es lo que define al modo; los niveles cambian cómo se draftea, así que van juntos |
| **C. Roster** | Aplicar los criterios, pasar los 4 héroes actuales, sumar héroes de INT (daño mágico) | Da variedad para que el draft mezclado tenga gracia |
| **D. Ítems** | Contras por etiqueta, niveles/recetas, inventario limitado | Necesita las etiquetas y habilidades variadas para tener qué contrarrestar |
| **E. Creeps** | Tipos con mecánica, aviso de oleada, oleadas compuestas | Es el campo de prueba de los ítems situacionales |
| **F. PvP** | Rivales con IA, duelos, apuestas, ranking top 8, Fragmentos/Libro para los últimos | Usa todo lo anterior: la IA draftea, compra y pelea con las mismas reglas |

---

### Pruebas automáticas
Abrir **`tests.html`** (doble clic) corre todas las pruebas y muestra ✅/❌ por cada una.
**Correrlas después de cada cambio.** Cada mecánica nueva tiene que sumar su prueba en `js/tests.js`.

---

## 11. Preguntas abiertas

1. **Definitiva en el pool:** ¿aparece en el draft con la misma probabilidad que una normal, o más baja?
   *(Hoy: misma probabilidad. Con 4 definitivas en 16 habilidades, ~59% de los drafts ofrece al menos una.)*
4. **Largo de la partida:** con 5 oleadas se llega a nivel ~8, así que la definitiva nunca pasa de nivel 1.
   Hay que decidir cuántas rondas tiene una partida completa (con duelos) o ajustar la experiencia.
2. **Precio del Fragmento del Destino** en la tienda, y cuánto se recupera al venderlo. *(Provisorio: 150g, se vende por 75g.)*
3. **Puntos del ranking:** ¿qué da puntos? (duelos ganados, apuestas acertadas, oleadas…)

### Decisiones tomadas
- Definitiva **libre** (no tiene espacio reservado).
- Escalado **repartido** (chico en el héroe, fuerte en la definitiva).
- Orden: fase **A** (cimientos) y después **B** (draft y niveles).
- **Niveles estilo Dota 2:** normales 4 niveles, definitiva 3 (cada 6 niveles del héroe); con todo al máximo, +1 a los 3 atributos por nivel.
- **Habilidades drafteadas en nivel 0**; puntos sin gastar **se guardan**; al reemplazar una habilidad **se devuelven sus puntos**.
- **Pasivas:** cuentan como una de las 4 elecciones del draft, pero no usan tecla.
- **Rehacer el kit:** con Fragmento (4 opciones, habilidad al azar) o Libro (6 opciones, elegís cuál) del Destino; no se paga oro por volver a tirar el draft normal.

---

## Glosario

Nombre oficial de cada paso y mecánica, y dónde vive en el código. Los marcados con 🆕 son propuestas:
si un nombre no te gusta, se cambia acá y después en el código.

### Estructura de la partida
| Nombre | Qué es | En el código |
|---|---|---|
| **Partida** | Juego completo de 8 jugadores | — |
| **Ronda** 🆕 | Un ciclo: Draft → Preparación → Oleada → Duelos → Ranking | `waveNumber` |
| **Elección de Héroe** | Elegir el héroe al empezar | `gameState = 'HERO_SELECT'` |
| **Draft** | Elegir 1 habilidad entre varias opciones | `'DRAFT'`, `startSkillDraft()` |
| **Preparación** | Tienda, subir habilidades, usar objetos del destino | `'PREP'`, `startPreparation()` |
| **Oleada** | Combate PvE contra creeps | `'WAVE'`, `updateWave()` |
| **Oleada del Jefe** 🆕 | La oleada final, más difícil | `isBossWave` |
| **Duelo** | Combate 1v1 contra otro héroe *(fase F)* | — |
| **Ranking (Top 8)** | Orden por puntos y oro tras los duelos *(fase F)* | — |

### Héroe y kit
| Nombre | Qué es | En el código |
|---|---|---|
| **Innato** | Mecánica fija del héroe, no se draftea | `innate` |
| **Kit** | Las 4 habilidades elegidas en el draft | `player.skills`, `KIT_SIZE` |
| **Habilidad natural** | Habilidad que pertenece a tu héroe (★ en el draft) | `skill.heroKey` |
| **Definitiva** | La habilidad más fuerte de cada héroe; 3 niveles | `isUltimate` |
| **Pasiva** | Habilidad sin tecla que reacciona a eventos | `kind: 'passive'` |
| **Punto de habilidad** | Se gana 1 por nivel; sube una habilidad | `skillPoints` |
| **Crecimiento** 🆕 | Escalado chico del héroe (por bajas y duelos) | `scaling` |
| **Ascenso** 🆕 | Escalado fuerte de la definitiva | `grantPermanent()` en cada definitiva |
| **Bonus permanente** | Stats ganados por Crecimiento o Ascenso | `hero.bonus` |
| **Vidas** | Muertes que aguanta el héroe antes de quedar eliminado | `lives` |
| **Voluntad de Titán** | Bonus al revivir tras morir en una oleada | `TITAN_WILL`, `applyTitanWill()` (death.js) |
| **Condenado** | Estado sin vidas: más daño recibido; si te mata un creep, quedás eliminado | `setCondemned()`, `isCondemned()` |
| **Eliminado / Espectador** | El héroe quedó fuera de la partida | `gameState = 'GAMEOVER'` |
| **Injusticia de los Codiciosos** | Ítem que compra una vida estando Condenado | `ITEMS.GREED`, `buyGreedLife()` |
| **Mago** | Héroe de Inteligencia: +100% amplificación de hechizo | `ATTRIBUTE_RULES.mageSpellAmp` |

### Combate
| Nombre | Qué es | En el código |
|---|---|---|
| **Daño** (físico / mágico / puro) | Todo daño a cualquier unidad, con su mitigación | `dealDamage()` |
| **Efecto** (mejora / perjuicio) | Estado temporal sobre una unidad (Furia, Aturdido…) | `addEffect()` |
| **Evento** | Algo que pasa en combate y activa reacciones | `emit()` |
| **Etiqueta** | Categoría de una habilidad (`FÍSICO`, `ROBO_VIDA`…) | `TAGS` |
| **Enfurecimiento** 🆕 | Los creeps ganan daño y vel. de ataque al pasarse el tiempo de la oleada | `enrageMult()` (timers.js) |
| **Piloto automático** | La IA juega por el jugador (botón o tecla P) | `autopilot`, `js/ai.js` |
| **Temporizador de fase** | Tiempo de cada fase; al vencer, el juego decide | `PHASE_TIMES`, `tickPhaseTimer()` |
| **Aura del Jefe** 🆕 | +daño a los creeps cerca del jefe | `auraRadius`, `auraAtkBonus` |

### Economía
| Nombre | Qué es | En el código |
|---|---|---|
| **Oro** | Moneda de la tienda y las apuestas | `gold` |
| **Cacería Veloz** 🆕 | Hasta x3 de oro por matar un creep rápido | `speedGoldMultiplier()` |
| **Interés** | +1 oro por cada 10 ahorrados al terminar la oleada (máx. 5) | `onWaveCleared()` |
| **Objetos del Destino** | Fragmento y Libro del Destino | `destiny`, `useFragment()`, `useBook()` |
| **Segunda Oportunidad** 🆕 | Premio para los 4 últimos del ranking *(fase F)* | — |
