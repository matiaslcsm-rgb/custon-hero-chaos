"""Corre las pruebas del juego (index.html?test) en un navegador invisible y dice cuántas pasaron.

Uso (desde la carpeta del juego):  python docs/correr-pruebas.py [--veces N]
  --veces N   las corre N veces seguidas (para cazar pruebas que fallan a veces)

Levanta solo su servidor sin caché (el de docs/captura.py) en un puerto libre y lo apaga al terminar.
Sale con código 0 si pasaron todas en todas las vueltas, 1 si no. Muestra las que fallaron y los errores de la consola.
Necesita Playwright una vez:  pip install playwright  y  python -m playwright install chromium
"""
import argparse
import http.server
import os
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from captura import Manejador  # noqa: E402  (mismo servidor sin caché)

from playwright.sync_api import sync_playwright  # noqa: E402

TOPE = 120  # segundos por vuelta; hoy tardan unos 12


class Callado(Manejador):
    def log_message(self, *a):  # sin una línea por archivo pedido
        pass


def una_vuelta(page, url):
    errores = []
    page.on('pageerror', lambda e: errores.append(str(e)))
    page.goto(url)
    page.wait_for_function("/^[✅❌]/.test(document.title)", timeout=TOPE * 1000)
    fallas = page.eval_on_selector_all('#test-report .fail', 'els => els.map(e => e.innerText.replace(/\\n+/g, " — "))')
    return page.title(), fallas, errores


def main():
    sys.stdout.reconfigure(encoding='utf-8')  # la consola de Windows no imprime ✅ si no
    ap = argparse.ArgumentParser()
    ap.add_argument('--veces', type=int, default=1)
    args = ap.parse_args()
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Callado)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/index.html?test'
    ok = 0
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch()
            for i in range(args.veces):
                t0 = time.time()
                page = nav.new_page()
                titulo, fallas, errores = una_vuelta(page, url)
                page.close()
                ok += not fallas
                print(f'{titulo}  ({time.time() - t0:.0f} s){f"  vuelta {i + 1}/{args.veces}" if args.veces > 1 else ""}')
                for f in fallas:
                    print('   ' + f)
                for e in errores:
                    print('   error en la consola: ' + e)
            nav.close()
    finally:
        srv.shutdown()
    if args.veces > 1:
        print(f'{ok}/{args.veces} vueltas sin fallas')
    sys.exit(0 if ok == args.veces else 1)


if __name__ == '__main__':
    main()
