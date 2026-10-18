"""Servidor de pruebas sin caché que además guarda capturas para los informes.

Uso (desde la carpeta del juego):  python docs/captura.py [puerto]   (por defecto 8766)

Sirve el juego igual que `python -m http.server`, pero sin caché, y acepta
PUT /docs/informes/img/<nombre>.png para guardar una captura. Desde la consola del navegador
(el canvas del juego es #ascii-canvas; el del muñeco, #mu-canvas, se amplía ×3 sin suavizar para que se vea):

    const src = document.getElementById('mu-canvas'), k = 3, c = document.createElement('canvas');
    c.width = src.width * k; c.height = src.height * k;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, c.width, c.height);
    c.toBlob(b => fetch('/docs/informes/img/2026-10-18-muneco-antes.png', { method: 'PUT', body: b }), 'image/png')

Si la pestaña está en segundo plano el canvas puede estar vacío: dibujá un cuadro a mano antes
(munecoDraw(muneco, src.getContext('2d')) en el muñeco, render() en el juego).

Solo escribe PNG adentro de docs/informes/img/ (nada de rutas con ..) y solo escucha en localhost.
"""
import http.server
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA_IMG = os.path.join(RAIZ, 'docs', 'informes', 'img')
NOMBRE_OK = re.compile(r'^/docs/informes/img/([A-Za-z0-9_.-]+\.png)$')
TOPE = 2 * 1024 * 1024  # una captura chica pesa mucho menos; esto frena accidentes


class Manejador(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_PUT(self):
        m = NOMBRE_OK.match(self.path.split('?')[0])
        largo = int(self.headers.get('Content-Length') or 0)
        if not m or '..' in m.group(1) or not 0 < largo <= TOPE:
            self.send_error(400, 'Solo PNG en /docs/informes/img/ y hasta 2 MB')
            return
        datos = self.rfile.read(largo)
        if not datos.startswith(b'\x89PNG'):
            self.send_error(400, 'No es un PNG')
            return
        os.makedirs(CARPETA_IMG, exist_ok=True)
        with open(os.path.join(CARPETA_IMG, m.group(1)), 'wb') as f:
            f.write(datos)
        self.send_response(201)
        self.end_headers()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f'Sirviendo {RAIZ} en http://localhost:{puerto}/ (sin caché, capturas en docs/informes/img/)')
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), Manejador).serve_forever()
