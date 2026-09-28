// Etiquetas: describen qué es y qué hace cada habilidad o innato.
// Sirven para que las sinergias, los ítems de contra y los creeps funcionen por categoría
// (ej: un ítem de anticuración afecta a todo lo que tenga ROBO_VIDA) sin programar cada caso.
// Solo se pueden usar las etiquetas definidas acá: main.js avisa en consola si alguna no existe.
const TAGS = {
    'FÍSICO': 'Daño físico (lo reduce la armadura)',
    'MÁGICO': 'Daño mágico (lo reduce la resistencia mágica)',
    'PURO': 'Daño que ignora armadura y resistencia mágica',
    'AL_GOLPEAR': 'Se activa o mejora con los ataques básicos',
    'AL_MATAR': 'Se activa al eliminar enemigos',
    'AL_RECIBIR_DAÑO': 'Se activa al recibir daño',
    'AL_LANZAR': 'Se activa al lanzar habilidades',
    'AL_MOVERSE': 'Se activa o mejora al moverse',
    'CRÍTICO': 'Usa o mejora los golpes críticos',
    'ROBO_VIDA': 'Cura con el daño causado',
    'CURACIÓN': 'Recupera vida (regeneración, curaciones directas)',
    'CONTROL': 'Aturde, ralentiza o provoca',
    'MOVILIDAD': 'Desplaza al héroe',
    'ÁREA': 'Afecta a varios enemigos a la vez',
    'DAÑO_EN_EL_TIEMPO': 'Daño repartido a lo largo de varios segundos',
    'MEJORA': 'Aplica un efecto temporal positivo (se puede disipar)',
    'PERJUICIO': 'Aplica un efecto negativo al enemigo (reducir armadura, más daño recibido...)',
    'INVOCACIÓN': 'Crea unidades aliadas'
};
