// Sonidos propios: archivos de audio (mp3, ogg o wav) que reemplazan a los sintetizados de audio.js.
// Poné el archivo en la carpeta sounds/ y agregá una línea acá con el nombre del sonido y su ruta.
// Si un sonido no está en la lista (o el archivo no carga), suena el sintetizado.
//
// Nombres disponibles (cuándo suenan):
//   wave      empieza una ronda de creeps          duel     empieza una ronda con duelo
//   boss      aparece el jefe de ronda             win      ganaste tu duelo      lose     perdiste tu duelo
//   betWin    alguien ganó una apuesta             tick     cuenta regresiva (últimos 5 s)   tickLast   último segundo
//   levelup   subiste de nivel                     coin     cobrás oro            click    botones
//   hit / heroHit / crit / swing / shoot   golpes y disparos     cast / ult   habilidades y definitivas
//   heal      curación    death    muerte    boom    explosión    pop    creep eliminado
//
// Ejemplo:
//   const SOUND_FILES = { betWin: 'sounds/apuesta-ganada.mp3', duel: 'sounds/duelo.ogg' };

const SOUND_FILES = {
};

// Volumen de cada archivo (1 = normal), por si alguno suena muy fuerte o muy bajo. Ej: { betWin: 0.6 }
const SOUND_VOLUME = {
};
