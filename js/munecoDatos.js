// Los números del muñeco (index.html?muneco, fase B2 paso 2b): tiempos, daño, avance, empujón, congelado, sacudón y
// cajas de cada movimiento, y "general": la bola del muñeco y los congelados fijos. Mandan sobre los de js/muneco.js. Para cambiarlos: en el muñeco, O abre el
// panel, ajustás jugando, "📋 Copiar datos" y pegás acá el texto entero (reemplaza este archivo).
const MUNECO_DATOS = {
    dash: {"startup":0.05,"active":0.16,"recovery":0.12,"speed":210},
    swing0: {"startup":0.07,"active":0.08,"recovery":0.22,"dmg":10,"lunge":6,"hitstop":0.05,"shake":0,"hit.x":2,"hit.w":22,"hit.h":20},
    swing1: {"startup":0.06,"active":0.08,"recovery":0.22,"dmg":12,"lunge":6,"hitstop":0.05,"shake":0,"hit.x":2,"hit.w":22,"hit.h":20},
    swing2: {"startup":0.16,"active":0.1,"recovery":0.32,"dmg":22,"lunge":10,"hitstop":0.09,"shake":2,"hit.x":0,"hit.w":28,"hit.h":26},
    parry: {"startup":0.04,"active":0.3,"recovery":0.18,"dmg":5,"lunge":0,"hitstop":0.04,"shake":0,"hit.x":0,"hit.w":16,"hit.h":24},
    shoot: {"startup":0.12,"active":0.05,"recovery":0.25,"lunge":0,"shot.speed":160,"shot.dmg":8,"shot.w":10,"shot.h":12,"shot.life":0.9},
    hurt: {"startup":0,"active":0.12,"recovery":0.14,"knock":9},
    death: {"startup":0.2,"active":0.5,"recovery":1.4,"knock":6},
    crouchSwing: {"startup":0.06,"active":0.08,"recovery":0.2,"dmg":9,"lunge":3,"hitstop":0.04,"shake":0,"hit.x":2,"hit.w":22,"hit.h":12},
    general: {"walk":62,"dummyEvery":1.8,"dummyWarn":0.5,"ball.speed":85,"ball.dmg":20,"ball.w":7,"ball.h":7,"ball.life":3,"shotHitstop":0.04,"parryHitstop":0.06,"parryBack":1.5,"parryDmg":2,"hurtHitstop":0.05,"hurtShake":1.5}
};
