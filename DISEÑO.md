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

**Decisión — escalado repartido:** el héroe (vía su innato) tiene un escalado chico por bajas y duelos; la definitiva
trae el escalado fuerte. Si drafteás la definitiva de otro héroe, sumás su escalado al tuyo.
| **Stats base** | — | — | Atributo principal (STR/AGI/INT), HP, daño, rango, etc. |

### Estado actual vs. modelo nuevo

| Concepto | Hoy en el código | Modelo nuevo | Cambio necesario |
|---|---|---|---|
| Innato | `archetypePassive` (Contraataque, Puntería Perfecta, Golpe Mortal, Hambre) | Igual | Ninguno: ya encaja |
| Habilidades naturales | 3 normales + definitiva = 4 | 4 (incluye la definitiva) | Ninguno en cantidad |
| Definitiva | Se desbloquea sola al aprender las 3 normales | Se draftea como una más | Cambiar la regla del draft |
| Escalado | Del héroe (`scaling`: +stat cada N bajas) | Repartido: chico en el innato, fuerte en la definitiva | Reducir el del héroe y agregar el de cada definitiva |
| Teclas | Fijas por habilidad (`keybind: 'e'`) | Por espacio del kit | Si mezclás, dos habilidades podrían usar la misma tecla |
| Quién lanza | Las habilidades usan `player` directamente | Cualquier héroe (jugador o rival) | Necesario para PvP |

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

## 3. Draft de habilidades

**Espacios del kit:** 4 espacios **libres**. Cualquier habilidad (normal o definitiva) puede ir en cualquier espacio,
así que se puede terminar con 2 definitivas o ninguna. *(Decisión tomada: más caos, más riesgo de balance; se controla con cooldowns y costos.)*

**Teclas por orden de aprendizaje:** las habilidades activas toman la primera tecla libre entre **E, R, T, F**.
Las pasivas ocupan espacio pero no usan tecla.

**Cada ronda de draft ofrece 3 opciones:**
- **1 garantizada** de las habilidades naturales de tu héroe (si te queda alguna sin elegir).
- **2 del pool global** (habilidades de todos los héroes).
- Nunca se ofrece algo que ya tenés.

Con suerte armás el héroe "natural"; si no, mezclás a gusto.

**Rondas:** 1 al empezar + 1 después de cada oleada, hasta llenar los 4 espacios.
Las definitivas entran al pool como cualquier otra habilidad.

---

## 4. Sinergias (preparado para muchos héroes y habilidades)

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

## 5. Criterios para agregar un héroe al roster

Un héroe entra solo si cumple **todo** esto:

1. **Identidad clara:** atributo principal + rol que no esté cubierto (o una variante claramente distinta).
2. **Innato único:** una mecánica que no repite a otro héroe y funciona con cualquier kit drafteado.
3. **4 habilidades naturales:** 3 normales + 1 definitiva, con al menos 1 activa.
4. **Habilidades autosuficientes:** cada una tiene que servir aunque se draftee sola en otro héroe
   (no puede depender del innato de su héroe original).
5. **Definitiva con escalado:** la más fuerte del kit, cooldown largo, y una mecánica permanente de crecimiento con condición.
6. **Etiquetas declaradas:** cada habilidad aporta al menos 1 sinergia con etiquetas existentes y, a ser posible, abre 1 nueva.
7. **Contras existentes:** al menos 1 ítem o tipo de creep que contrarreste sus habilidades principales. Si no existe, se crea junto con el héroe.
8. **Presupuesto de poder:** los números entran en los rangos de referencia (a definir con balance: % de daño por segundo de cooldown, duración de controles, etc.).
9. **Sin duplicados:** ninguna habilidad copia la mecánica de otra ya existente con otro nombre.

---

## 6. Ítems: mejorar y contrarrestar

Tres familias:

| Familia | Para qué | Ejemplos |
|---|---|---|
| **Stats** | Base del armado | Cinturón (STR), Guantes (AGI), Túnica (INT), armadura, RM |
| **Potenciadores** | Refuerzan etiquetas propias | +% daño crítico, +duración de mejoras, +% robo de vida |
| **Contras** | Anulan etiquetas rivales | Anticuración (vs `ROBO_VIDA`), capa antimagia (vs `MÁGICO`), disipador (quita `MEJORA`), botas firmes (resistencia a `CONTROL`), hoja certera (ignora evasión), coraza de espinas (castiga `AL_GOLPEAR`) |

- **Mejoras por niveles:** los ítems se pueden subir de nivel o combinar (recetas) para escalar a lo largo de la partida.
- **Espacios limitados** de inventario, para que armarse sea una elección y no acumular todo.

---

## 7. Creeps: desafío situacional

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
- Las oleadas se arman combinando tipos, cada vez más exigentes.

---

## 8. PvP: duelos, apuestas y ranking

- Varios héroes rivales (controlados por IA al principio) hacen el mismo recorrido: draft, tienda, oleadas.
- Entre oleadas hay **duelos 1v1**. Ganar da el bonus de escalado por duelo.
- Los jugadores **apuestan oro** sobre los duelos (incluidos los ajenos).
- Se pierde con vidas en 0; gana el último en pie o el que termina primero en el ranking.

---

## 9. Orden de construcción

Cada fase deja el juego jugable.

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **A. Cimientos** | Quién lanza como parámetro, sistema genérico de mejoras, eventos, etiquetas, teclas por espacio | Sin esto, cada habilidad, ítem y creep nuevo hay que programarlo a mano contra todos los demás |
| **B. Draft mezclado** | Nuevas reglas de draft, definitiva drafteable, escalado en la definitiva | Es lo que define al modo; con A hecha es chico |
| **C. Roster** | Aplicar los criterios, pasar los 4 héroes actuales, sumar héroes de INT (daño mágico) | Da variedad para que el draft mezclado tenga gracia |
| **D. Ítems** | Contras por etiqueta, niveles/recetas, inventario limitado | Necesita las etiquetas y habilidades variadas para tener qué contrarrestar |
| **E. Creeps** | Tipos con mecánica, aviso de oleada, oleadas compuestas | Es el campo de prueba de los ítems situacionales |
| **F. PvP** | Rivales con IA, duelos, apuestas, ranking | Usa todo lo anterior: la IA draftea, compra y pelea con las mismas reglas |

---

## 10. Preguntas abiertas

1. **Pasivas:** ¿las pasivas drafteadas cuentan como uno de los 4 espacios? *(Por ahora: sí.)*
2. **Rondas de draft:** ¿se puede pagar oro para volver a tirar las 3 opciones?
3. **Definitiva en el pool:** con espacios libres, ¿la probabilidad de que aparezca una definitiva es igual a la de una normal, o más baja?

### Decisiones tomadas
- Definitiva **libre** (no tiene espacio reservado).
- Escalado **repartido** (chico en el héroe, fuerte en la definitiva).
- Orden: fase **A** (cimientos) y después **B** (draft mezclado).
