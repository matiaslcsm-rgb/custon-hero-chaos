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

**Con recetas y Área de Descanso** (12 partidas por héroe): con contras **92%** de victorias (1,19 muertes/partida), sin
contras **84%**. Los cuerpo a cuerpo se recuperaron (Axe 11/12, Asesino 10/12, Vampiro 9/12; antes 1-6/12): los ayuda volver
con la vida llena a cada oleada y los compuestos de tanque. El juego quedó más fácil; se puede subir la dificultad de las oleadas.

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

## 7. Ítems: recetas estilo Dota 2 ✅

- **Básicos:** mejoran **un solo stat** (o empeoran uno del enemigo). Se pueden tener repetidos y se acumulan.
- **Compuestos:** se arman con básicos + el precio de la **receta**, suman sus efectos y suelen agregar algo especial.
  Al comprar un compuesto se usan los básicos que ya tenés y **pagás solo lo que falta**. Uno de cada compuesto como máximo.
- **Inventario de 6 espacios** (básicos y compuestos). Un compuesto entra aunque esté lleno si libera los espacios de sus componentes.
- **Vender** devuelve el **50%** del precio total del ítem.
- **Inmediatos** (no ocupan espacio): Fragmento del Destino, Injusticia de los Codiciosos.
- *Las recetas reemplazaron a los niveles de ítem de la fase D* (en Dota los ítems crecen armando compuestos).
- Todo se ve en la tienda (pestañas Básicos / Compuestos / Otros, con ✓ en los componentes que ya tenés) y en la pestaña **🎒 Ítems**.

### Básicos
| Ítem | Precio | Efecto |
|---|---|---|
| Rama de Fuerza / Agilidad / Inteligencia | 50 | +4 al atributo |
| Espada Corta | 100 | +10 daño |
| Guantes de Rapidez | 90 | +12% vel. de ataque |
| Colmillo | 90 | +8% crítico |
| Cota de Malla | 80 | +3 armadura |
| Capa Rúnica | 75 | +15% resistencia mágica |
| Piedra de Vitalidad | 90 | +80 vida |
| Anillo de Regeneración | 70 | +3 vida/s |
| Máscara Vampírica | 90 | +10% robo de vida |
| Cristal de Maná | 70 | +75 maná, +1 maná/s |
| Botas de Viaje | 60 | +10% vel. de movimiento |
| Daga Serrada | 80 | Tu daño reduce 30% la curación del objetivo |
| Orbe Helado | 90 | Tus ataques ralentizan 15% |

### Compuestos
| Grupo | Ítem | Receta | Efecto |
|---|---|---|---|
| Atributos | Cinturón de Fuerza | 2 Ramas de Fuerza + 40 | +14 Fuerza |
| | Guantes de Celeridad | 2 Ramas de Agilidad + 40 | +14 Agilidad |
| | Túnica del Mago | 2 Ramas de Inteligencia + 40 | +14 Inteligencia |
| | Diadema del Equilibrio | 3 Ramas (una de cada) + 60 | +8 a los tres |
| Ataque | Hoja Certera | Espada + Guantes de Rapidez + 30 | +15 daño, +12% vel. ataque, ataques que no fallan |
| | Martillo Rompecorazas | 2 Espadas + 20 | +22 daño, cada golpe quita 2 armadura (x4) |
| | Hoja Veloz | Colmillo + Guantes de Rapidez + 60 | +15% crítico, +22% vel. ataque |
| Robo de vida y anticuración | Sed Carmesí | Máscara Vampírica + Espada + 50 | +12 daño, +18% robo de vida (x2 bajo 30% de vida) |
| | Lanza Cortacuras | Daga Serrada + Espada + 30 | +12 daño, −60% curación del objetivo |
| | Ojo de Invierno | Orbe Helado + 3 Ramas + 80 | +7 a los tres; ataques ralentizan 30% y −40% curación |
| Defensa y tanque | Capa Antimagia | Capa Rúnica + Anillo + 20 | +25% resistencia mágica, +3 vida/s |
| | Botas Firmes | Botas de Viaje + Cota de Malla + 30 | +10% movimiento, +3 armadura, −40% duración de control |
| | Coraza de Espinas | Cota de Malla + Piedra de Vitalidad + 50 | +5 armadura, +100 vida, devuelve 30% del daño cuerpo a cuerpo |
| | Corazón del Titán | 2 Piedras de Vitalidad + Anillo + 120 | +250 vida, regenera 1,5% de la vida máx./s |
| | Égida Inquebrantable | Capa Rúnica + Piedra + Rama de Fuerza + 90 | +15% RM, +80 vida, +4 Fuerza; bajo 40% de vida: **inmunidad mágica** 4 s (cada 35 s) |
| Magia | Báculo Arcano | Rama de Inteligencia + Cristal de Maná + 60 | +6 INT, +150 maná, +2 maná/s, +15% amplificación |

**Inmunidad mágica** (`magicImmune`): no recibe daño mágico ni aturdimientos ni ralentizaciones. El daño físico y puro sí entran.

**Pendiente:** contras específicos para los duelos (silencio, disipar mejoras) y habilidades activas de ítems.

---

## 8. Creeps: desafío situacional ✅

Cada tipo de creep tiene una **mecánica** y un **contra**. Todo está en `js/data/creeps.js` y se ve en la pestaña
**👹 Creeps y Jefes** del juego.

| Creep | Mecánica | Contra (ítem) |
|---|---|---|
| Chusma `x` | Muere de un golpe, viene en cantidad | Área |
| Grunt `g` | Soldado básico | — |
| Arquero `r` | Ataca desde rango 4,5 | Más rango, movilidad |
| Explorador `s` | Muy rápido | Ralentizar, aturdir |
| Bruto `b` | Lento, resistente, pega fuerte | Distancia |
| **Chamán** `c` | Daño **mágico** a distancia | Resistencia mágica (**Capa Antimagia**) |
| **Sanador** `h` | Cada 3 s cura 20 de vida (crece con la oleada) al creep más herido; **objetivo prioritario** | Anticuración (**Lanza Cortacuras**) o matarlo primero |
| **Espectro** `e` | 60% de evasión contra ataques básicos | Ataques que no fallan (**Hoja Certera**) o habilidades |
| **Acorazado** `a` | Armadura 12 (−48% daño físico) | Daño mágico/puro o reducir armadura (**Martillo Rompecorazas**) |
| **Enjambre** `·` | Vienen de a 4, débiles y rápidos | Área |
| **Kamikaze** `k` | Explota al llegar a vos | Matarlo a distancia |
| **Aturdidor** `t` | Cada 2 golpes aturde 1,5 s | Resistencia al control (**Botas Firmes**) |
| **Ladrón** `$` | Roba 20 de oro por golpe y huye; si lo matás, recuperás +50% | Ralentizar, aturdir, rango |
| **Brujo** `w` | Magia a distancia; cada 5 s un rayo que hace daño mágico y **aturde** 1,2 s; objetivo prioritario | Inmunidad mágica (**Égida**), resistencia mágica o al control |
| **Escarchador** `f` | Ataques mágicos a distancia que **ralentizan** 30% | Resistencia al control (**Botas Firmes**) |
| **Ballestero** `z` | Rango 6, golpes lentos y fuertes | Vida y armadura (**Corazón del Titán**) o alcanzarlo |
| **Tamborilero** `d` | Aura: los creeps cercanos atacan 40% más rápido; objetivo prioritario | Matarlo primero |

### Oleadas con tema
Cada oleada sortea un tema de su nivel (en la tienda se ve **el aviso de la próxima oleada**: qué viene y cómo contrarrestarlo):

| Oleada | Temas posibles |
|---|---|
| 1 | Avanzada · Enjambre |
| 2 | Hechiceros · Espectros · Brujería |
| 3 | Muralla · Kamikazes · Tiradores |
| 4 en adelante | Emboscada · Asedio · Tormenta Arcana |

*(La oleada "Jefe Final" de cada 5 rondas se reemplazó por el jefe de ronda, ver §9 bis.)*

Cada oleada trae además un **jefe** (4x vida, +2 armadura y aura que potencia a los creeps cercanos) del tipo que indica el tema.

### Ítems de contra
Se compran una vez y quedan permanentes: Capa Antimagia (60g), Hoja Certera (75g), Lanza Cortacuras (65g),
Martillo Rompecorazas (70g), Botas Firmes (50g).

### Reglas nuevas
- **Prioridad de objetivo:** el ataque automático va primero por los objetivos prioritarios en rango (Sanadores), y la IA camina hacia ellos.
- **Inmunidad tras aturdimiento:** un héroe no puede ser aturdido de nuevo hasta 1,5 s después de que termina un aturdimiento
  (con 2 Aturdidores enfurecidos quedaba aturdido para siempre). A los creeps no se les aplica.
- **Resistencia al control** (`statusResist`): acorta aturdimientos y ralentizaciones.

### Balance medido (IA sin modo dios)
- Antes de la fase E la IA ganaba ~97%: el PvE era fácil. Con los creeps nuevos gana **~78%** (Sniper y Bruja del Hielo 12/12,
  Arcanista 11/12, Alquimista y Sabio 9/12, Asesino, Vampiro y Nigromante 8/12, **Axe 7/12**). Los cuerpo a cuerpo sufren más
  las oleadas con muchos atacantes a distancia.
- **Los contras funcionan pero compiten con los atributos:** dados gratis subían las victorias de 69% a 89%; a 100-150g rendían
  *menos* que gastar el oro en atributos. A mitad de precio (los actuales) ya ayudan (72%, menos muertes). El equilibrio fino
  queda para la economía de ítems (fase D).
- Problemas encontrados y corregidos al medir: el Sanador curaba un % de la vida del objetivo (un jefe con 2 Sanadores era
  imposible de matar) y el bloqueo por aturdimiento.

### Área de Descanso ✅
Al terminar una oleada (y, con la fase F, al terminar un duelo) los héroes van a un **área común de descanso** hasta que se
acabe el tiempo de preparación. Desde ahí compran y draftean, y **vuelven al combate con la vida y el maná completos**
(las mejoras temporales se pierden). Por eso se quitó la Poción de Vida.

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

- Partidas de **8 héroes**: el jugador + 7 rivales controlados por la IA, que hacen el mismo recorrido con las mismas reglas.
- **Ronda:** Draft → Preparación (Área de Descanso) → Oleada (cada héroe en su propia arena, en paralelo) → Duelos → Ranking.
- **Duelos 1v1** después de cada oleada. **Parejas al azar**, evitando repetir el rival de la ronda anterior. Si quedan impares,
  uno descansa esa ronda. Ganar da el bonus de escalado por duelo.
- **Los duelos no cuestan vidas** (las vidas se pierden solo contra creeps). El castigo depende de cuántos quedan en juego:
  - **5 o más:** perder no tiene castigo (solo te quedás sin los +3 puntos).
  - **4 o menos (la mitad):** el perdedor queda **maldito (Condenado)**, aunque tenga vidas; si ya lo estaba, **+10%** más.
    La maldición amplifica el daño de **creeps y héroes sin maldición** (no el de otros malditos).
  - **3 o menos:** **duelo a muerte**: perder estando maldito **elimina**.
  - Es para que la partida no se estanque cuando todos tienen builds que los creeps no pueden derrotar.
- Maldito **con vidas**: si un creep lo mata, pierde una vida como siempre; queda eliminado solo sin vidas.
- Al terminar su duelo, cada héroe espera en el Área de Descanso.
- **Apuestas:** antes de los duelos hay una **previa de 10 s** con las parejas; el jugador puede apostar oro a quién gana
  **un duelo ajeno** (uno por ronda, **tope: 25% de su oro**); si acierta, cobra **el doble**. La IA no apuesta.
- **Puntos del ranking:** ganar un duelo **+3**; superar la oleada sin morir **+1**. El oro desempata.
- **Largo de la partida (propuesta):** hasta que quede un solo héroe, con un máximo de **20 rondas**; si se llega, gana el
  primero del ranking. Como la idea es que las builds escalen, una build tiene que rendir contra creeps **y** en duelos.
- Si el jugador queda eliminado, puede seguir mirando la partida (espectador).

### Ranking y ayuda a los que van atrás
Partidas de **8 jugadores**. Cuando **todos ya tuvieron su duelo** de la ronda, se arma el **top 8**
ordenado por **puntos y oro**:

| Puesto | Recompensa |
|---|---|
| Mitad de arriba | Nada extra |
| **Mitad de abajo de los que siguen en juego** (con 8: los 4 últimos; con 5: los 2 últimos) | 1 **Fragmento del Destino** cada uno (para probar suerte o venderlo) |
| Último en juego | Además, 1 **Libro del Destino** |

Se reparte **en cada ronda**. Los eliminados no cuentan.

La idea es que quien va perdiendo tenga herramientas para rehacer su kit y volver a la partida.

### Implementado en F1 ✅
- **Arenas** (`js/world.js`): cada héroe pelea la misma oleada en su propia arena, con sus creeps, jefe y proyectiles; las 8 se
  actualizan en paralelo en cada frame. La ronda sigue cuando terminan todas; los que terminan antes esperan en el Área de Descanso.
- **Rivales:** 7 héroes distintos al del jugador. Draftean y compran al instante (misma IA que el Piloto automático).
- **Ranking** siempre visible: puesto, vidas, puntos, oro y estado (⚔ pelea, 🏕 descansa, ☠ muerto, 💀 eliminado).
  **Clic en un héroe para mirar su arena** (el registro muestra solo lo que pasa en la arena que mirás).
- **Rondas:** hasta 20; las rondas 1-4 usan los temas de su nivel y después se repiten los del nivel 4, cada vez más fuertes;
  cada 5 rondas hay jefe de ronda después de los duelos (§9 bis). Si una arena pasa de 120 s, se da por perdida.
- **Espectador:** si el jugador queda eliminado, la partida sigue y puede mirar a los demás.
- Rendimiento: un frame con las 8 arenas tarda ~0,1 ms (peor caso ~9 ms).

### Implementado en F2 ✅
- Después de las oleadas: parejas al azar (sin repetir el rival anterior; con impares uno descansa), una arena de duelo por
  pareja, todas en paralelo. Al empezar: vida y maná llenos, sin mejoras temporales y **enfriamientos reiniciados**.
- Gana quien mata al otro; a los **45 s**, quien tenga más % de vida. Ganador **+3 puntos** y escalado por duelo; perdedor
  **−1 vida** (sin vidas → Condenado; ya Condenado → +10% de daño recibido, sin eliminar).
- La IA en duelo usa definitivas y habilidades de área contra un solo rival. La Coraza de Espinas refleja también a héroes.

**Medido en una partida completa de 20 rondas (IA sin modo dios):** los 30 duelos se definieron por muerte, con una
duración mediana de **3,2 s** (muy cortos); en la ronda 2 ya había **5 de 8 Condenados**; en la ronda 5 quedaban 3 héroes y
siguieron así **15 rondas** hasta el límite (estancamiento). **A decidir:** duración de los duelos, costo en vidas de perder
un duelo, y cómo se define una partida cuando quedan pocos.

**Con las reglas nuevas de maldición (5 partidas de 20 rondas):** después de la ronda 5 no cae nadie más (quedan 5 a 8 hasta el
final): los creeps escalan +10% lineal por ronda y los héroes mucho más rápido, así que nunca se llega a la mitad.
Probado: creeps **×1,12 por ronda** (exponencial) → en la ronda 20 quedan 3-5; **×1,15** → la partida termina con un ganador
entre las rondas 8 y 18. **El Sniper ganó las 13 partidas simuladas** (domina los duelos a distancia).

**Aplicado:** creeps **×1,13 por ronda** y **−60% de daño entre héroes en duelo**. Medido (12 partidas): partidas de **15 a 20
rondas**; duelos de **~10 s** de mediana (10% más cortos: 3 s; 10% más largos: 27 s), casi ninguno por tiempo.

**Sniper** (ganó 12/12 partidas, 93% de duelos). Probado cambiando una cosa por vez: rango 4 o sin Puntería Perfecta no
cambian nada; **sin su escalado baja a 73%**: +3 de daño cada 8 bajas (~+75 en una partida) es muy superior al de otros
héroes (Axe: +0,5 armadura cada 10). El Alquimista también domina los duelos (~85%) y los cuerpo a cuerpo casi no ganan
(Vampiro 0-9%, Asesino 8-26%) porque los de distancia **pueden moverse y atacar a la vez** ("kiteo gratis").
**Propuesta medida:** escalado del Sniper a la mitad + **moverse reinicia el ataque** (como la animación de ataque de Dota):
las victorias se reparten (Bruja 5, Axe 4-5, Arcanista 2-3, Sniper, Vampiro y Alquimista 1) y los cuerpo a cuerpo suben
(Axe ~55%, Asesino ~33%, Vampiro ~20% de duelos). **Aplicado** (escalado del Sniper +1,5 daño cada 8 bajas y +4 por
duelo; `MOVE_RESETS_ATTACK` en game.js). Queda por mirar: el Alquimista sigue ganando ~83% de sus duelos.

### Implementado en F3 ✅
- **Previa de duelos** (`js/bets.js`): al terminar las oleadas se sortean las parejas y se muestran con puesto, puntos, nivel,
  vidas y récord de duelos. 10 s para apostar (o "Listo, a los duelos"). Sin oro, sin duelos ajenos o eliminado → se saltea.
- **Por qué el tope:** medido en 207 duelos, **el que va arriba en puntos gana el 73%**. Pagando ×2 sin tope, apostar al
  favorito deja **+46%** promedio por apuesta (y en una ronda se ganan ~90g): rendía más que farmear.
- **Premios** (`js/rewards.js`) al final de cada ronda (no en la última): Fragmento a la mitad de abajo en juego, Libro al último.
- **IA con objetos del destino** (decisión mía, reversible): usa el Libro en una habilidad que no es natural de su héroe (si
  no tiene, lo guarda); usa el Fragmento si al menos la mitad de su kit no es natural y, si no, lo vende. El Piloto automático
  hace lo mismo y no apuesta.
- **Medido (20 partidas de 12 rondas por variante):** con la IA, los premios **no cambian de forma medible** la remontada: el
  líder de la ronda 4 gana 70-75% de las partidas con y sin premios, y el último de la ronda 4 termina ~4.º-5.º en todos los
  casos (también probando que la IA use siempre los Fragmentos). La diferencia la haría un jugador que elige bien qué cambiar.

### Construcción de la fase F
| Etapa | Qué |
|---|---|
| **F1** ✅ | Mundo de 8 héroes: rivales con IA jugando sus oleadas en paralelo, cada uno en su arena; ranking con puntos; mirar cualquier arena |
| **F2** ✅ | Duelos: parejas al azar, arena de duelo, perder cuesta vida, Condenado suma castigo, espera en el Área de Descanso |
| **F3** ✅ | Previa de duelos con apuestas (×2, tope 25% del oro); Fragmento a la mitad de abajo en juego y Libro al último |

---

## 9 bis. Jefes de ronda y objetos neutrales (fase G)

- Cada cierta cantidad de rondas, **al terminar los duelos se pausan** y **todos pelean contra un jefe**: un creep mucho más
  fuerte y resistente.
- Derrotarlo da **oro** y un **objeto neutral**.
- **Objetos neutrales:** van en un **espacio aparte** del inventario y dan una mejora. **Solo se puede tener uno a la vez.**
  Cada jefe siguiente ofrece objetos **mejores**: podés quedarte con el que tenés o cambiarlo por el nuevo.
  También se pueden **vender** por oro (perdés el objeto).

### Decisiones
- **Reemplaza a la oleada del jefe:** rondas **5, 10, 15 y 20**: oleada normal → duelos → **jefe de ronda** para todos los
  que siguen en juego, en una sola arena. Un jefe distinto por escalón, cada uno más fuerte.
- **Premio:** si el jefe cae en **60 s**, todos cobran oro (100/150/200/250 según el escalón) y experiencia; los **3 que más
  daño le hicieron** cobran **+50% / +30% / +15%**. Si se acaba el tiempo, se va y no hay premio.
- **Sin riesgo de vidas:** morir contra el jefe no cuesta vidas; se revive a los **5 s** en el fondo de la arena, sin Voluntad de Titán.
- **Neutrales: elegís 1 de 3** del escalón del jefe (en la preparación siguiente), o te quedás con el tuyo.

### Implementado en G ✅
- **Jefes** (`js/data/bosses.js`): Gólem Ancestral (ronda 5: Golpe Sísmico en área que aturde), Reina de la Colmena
  (10: invoca Enjambres), Dragón de Escarcha (15: Aliento Helado a los 3 más cercanos, ralentiza) y Señor del Abismo
  (20: Llamarada de daño puro a todos, Furia con menos de la mitad de vida). Vida = por héroe × héroes que pelean × el
  crecimiento de los creeps de la ronda. El jefe ataca al héroe vivo más cercano.
- **Neutrales** (`js/data/neutrals.js`): 20 objetos, 5 por escalón. Se venden por **60g × escalón**. Aparecen en la tienda
  (sección "Objeto neutral") y en el códice de Ítems. Los jefes, en el códice de Creeps y en el aviso de la oleada.
- **Decisión mía (reversible):** al cambiar de neutral, **el anterior se vende solo** (para no perderlo por olvidarse).
  La IA elige el de mayor escalón que le sirva a su atributo principal.
- **Medido** (9 partidas de 15 rondas, sin modo dios; primera versión: caía en ~10 s y nadie moría; se triplicó la vida y
  se subió el daño): con ~5 héroes, el jefe cae en **~33 s** (ronda 5), **~40 s** (ronda 10) y **~55 s** (ronda 15),
  con 0,5 a 5 muertes por pelea y alguna vez se escapa. El Señor del Abismo (ronda 20) casi no se llega a ver en las simulaciones.

---

## 9 ter. Menú, tutorial y elección de héroe

- **Menú de inicio:** "Iniciar partida" o "Tutorial". El tutorial (8 páginas: objetivo, ronda, controles, habilidades, tienda,
  vidas, duelos y apuestas, jefes y ayudas) también se abre en cualquier momento desde la pestaña **📖 Tutorial**.
- **Elección de héroe:** a cada jugador se le reparten **3 héroes al azar** + la opción **🎲 Héroe al azar** (uno que no está
  entre tus 3). Tiempo: 30 s (si se acaba, te toca uno de tus 3). **Los héroes elegidos nunca se repiten.**
- **Opciones únicas:** tus 3 opciones son solo tuyas (ningún rival las recibe). Para que las de **todos** sean distintas
  hacen falta 8 × 3 = **24 héroes**; hoy hay 9, así que entre los rivales las opciones se pisan (el código ya reparte
  opciones únicas a todos cuando haya héroes suficientes). Los rivales eligen de las suyas; si ya se las tomaron, de lo que quede.
- **Códice de ítems:** nombres en el color de su categoría (básicos celeste, mejoras dorado, neutrales verde/azul/violeta/naranja
  por escalón, especiales lila) y descripción en blanco. Secciones con botones para saltar: Básicos, Mejoras (por grupo),
  Neutrales (por escalón) y Especiales. En la tienda, los nombres usan los mismos colores.
- **Códice de Creeps y Jefes:** mismo formato. Nombre en el color del creep, stats y mecánica en blanco, contra con su ítem en
  color. Secciones: Básicos, Con mecánica, Temas de oleada (con sus creeps y el jefe de cada oleada) y Jefes de ronda.

## 9 quater. Gráficos: efectos de combate (paso 1 de la mejora visual)

Se eligió mejorar el estilo ASCII actual antes que pasar a pixel art (se decide después, con el juego "vivo" para comparar).
Todo en `js/fx.js`, **solo visual** (no cambia reglas) y solo para la arena que estás mirando:
- **Números de daño** flotantes: naranja físico, violeta mágico, blanco puro, rojo el que recibe un héroe; los críticos más
  grandes con "!" y chispas. Curación en verde, "esquiva", oro ganado ("+6g") y "¡NIVEL N!".
- **Partículas** al morir (del color del creep), **anillos** al lanzar habilidades (color según el tipo de daño; la definitiva
  más grande) y en las mecánicas de los jefes, **explosión** del Kamikaze.
- **Temblor de pantalla** en críticos, muertes de héroes, definitivas y golpes de jefe.
- **Golpe cuerpo a cuerpo:** el héroe salta hacia el objetivo y deja un **tajo** (arco del color del héroe, dorado si es
  crítico, alternando el sentido en cada golpe); el golpeado **destella** en blanco.
- **Movimiento suave** entre casillas, **brillo** en héroes y jefes, **estela** en los proyectiles, barra de vida con borde y
  **barra de maná** en los héroes, marcas de **aturdido** (✦✦) y **ralentizado** (❄).
- **Fondo por arena** (sin grilla): pasto oscuro en las oleadas, piedra en los duelos, rojo volcánico en el jefe de ronda.

**Siguiente paso:** rediseño del panel lateral y los menús (íconos, barras, cartas).

---

## 10. Orden de construcción

Cada fase deja el juego jugable.

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **A. Cimientos** ✅ | Quién lanza como parámetro, sistema genérico de mejoras, eventos, etiquetas, teclas por espacio | Sin esto, cada habilidad, ítem y creep nuevo hay que programarlo a mano contra todos los demás |
| **B. Draft y niveles** ✅ | Draft mezclado, definitiva drafteable, experiencia y niveles de habilidad, escalado en la definitiva, pasivas sin espacio, Fragmento del Destino en la tienda | Es lo que define al modo; los niveles cambian cómo se draftea, así que van juntos |
| **C. Roster** | Aplicar los criterios, pasar los 4 héroes actuales, sumar héroes de INT (daño mágico) | Da variedad para que el draft mezclado tenga gracia |
| **D. Ítems** ✅ | Contras por etiqueta, niveles/recetas, inventario limitado | Necesita las etiquetas y habilidades variadas para tener qué contrarrestar |
| **E. Creeps** ✅ | Tipos con mecánica, aviso de oleada, oleadas compuestas | Es el campo de prueba de los ítems situacionales |
| **F. PvP** | Rivales con IA, duelos, apuestas, ranking top 8, Fragmentos/Libro para los últimos | Usa todo lo anterior: la IA draftea, compra y pelea con las mismas reglas |
| **G. Jefes de ronda** ✅ | Jefe común cada N rondas, objetos neutrales (uno a la vez, mejoran con cada jefe) | Da objetivos compartidos y escalado extra en partidas largas |

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
| **Jefe de Ronda** | Cada 5 rondas, después de los duelos: todos los héroes contra un jefe | `'BOSS'`, `startBossFight()` (bosses.js) |
| **Objeto Neutral** | Premio del jefe de ronda; espacio aparte, uno a la vez | `hero.neutral`, `NEUTRAL_ITEMS` |
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
| **Inventario** | 6 espacios para ítems básicos y compuestos | `hero.inventory`, `INVENTORY_SLOTS` (items.js) |
| **Ítem básico / compuesto** | Básico: un stat. Compuesto: básicos + receta | `tier`, `components`, `recipe` |
| **Receta** | Precio extra para armar un compuesto | `recipe`, `recipeStatus()` |
| **Inmunidad mágica** | Sin daño mágico ni control (Égida) | flag `magicImmune` |
| **Área de Descanso** | Donde esperan los héroes entre combates; se vuelve con vida y maná completos | `sendToRestArea()`, `returnFromRestArea()` |
| **Tema de oleada** | Composición de una oleada (Muralla, Hechiceros…) | `WAVE_THEMES`, `rollWave()` |
| **Aviso de oleada** | Qué viene en la próxima oleada, visible en la tienda | `nextWave`, `renderWavePreview()` |
| **Objetivo prioritario** | Creep al que el ataque automático va primero (Sanador) | `priority`, `pickAttackTarget()` |
| **Inmunidad tras aturdimiento** | 1,5 s sin poder ser aturdido de nuevo (héroes) | `STUN_IMMUNITY_AFTER` |
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
