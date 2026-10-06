"""
Normaliza las 3 propuestas de logo para uso en la interfaz.

Los originales llegan en condiciones muy distintas:
- logo1.png: 479x370, ya con transparencia real.
- logo2.jpeg: 9919x9919, 4.7 MB, JPEG plano con fondo BLANCO SÓLIDO (sin alfa).
- logo3.png: 1650x1275, ya con transparencia real.

`logo2` tiene una trampa: la doble hélice del centro también está pintada de
BLANCO, igual que el fondo — en un JPEG plano no hay forma de distinguir "blanco
de fondo" de "blanco de diseño" por color. Comprobado en logo1.png (que sí tiene
alfa real): esa hélice es blanco OPACO, no un hueco transparente — así se ve
bien tanto en fondo claro como oscuro. Para que logo2 se comporte igual, la
transparencia se calcula por CONECTIVIDAD (inundación desde las esquinas), no
por color: solo el blanco que toca el borde de la imagen se vuelve transparente;
el blanco encerrado dentro de la figura (la hélice) se queda opaco.

Y las tres tienen proporciones de lienzo distintas, así que puestas sin más en
una insignia cuadrada de 36px se ven de tamaños distintos entre sí. Se recorta
cada una a su contenido real y se centra en un lienzo cuadrado con el mismo
margen, para que las tres pesen visualmente igual en la insignia.

Este script no toca los originales que subiste: lee de `public/`, escribe
derivados optimizados en `public/logos/`.

Uso, desde este directorio:

    python3 procesar_logos.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None  # es nuestro propio archivo; no hace falta el aviso

RAIZ = Path(__file__).resolve().parents[2] / "public"
SALIDA = RAIZ / "logos"
SALIDA.mkdir(exist_ok=True)

LADO_FINAL = 512
MARGEN = 0.08
CENTINELA = (1, 254, 1)  # color imposible en el arte real; marca "es fondo"


def quitar_fondo_por_conectividad(im: Image.Image, lado_trabajo=1200) -> Image.Image:
    """Transparenta solo el blanco CONECTADO al borde de la imagen.

    Deja intacto el blanco "de diseño" que queda encerrado dentro de la
    figura (la hélice), que es lo que hace que se comporte como logo1/logo3.
    """
    im = im.convert("RGB")
    if max(im.size) > lado_trabajo:
        im.thumbnail((lado_trabajo, lado_trabajo), Image.LANCZOS)

    relleno = im.copy()
    w, h = relleno.size
    semillas = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0)]
    for semilla in semillas:
        if relleno.getpixel(semilla) != CENTINELA:
            ImageDraw.floodfill(relleno, semilla, CENTINELA, thresh=18)

    origen = im.load()
    marcado = relleno.load()
    salida = Image.new("RGBA", im.size)
    out = salida.load()
    for y in range(h):
        for x in range(w):
            if marcado[x, y] == CENTINELA:
                out[x, y] = (255, 255, 255, 0)
            else:
                r, g, b = origen[x, y]
                out[x, y] = (r, g, b, 255)

    # El umbral de flood-fill deja un borde de 1-2px sin decidir con nitidez
    # (antialiasing del JPEG original). Un desenfoque leve solo en el canal
    # alfa lo suaviza sin tocar el color.
    canal_alfa = salida.split()[-1].filter(ImageFilter.GaussianBlur(1.1))
    salida.putalpha(canal_alfa)
    return salida


def recortar_al_contenido(im: Image.Image, umbral_alfa=10) -> Image.Image:
    caja = im.split()[-1].point(lambda a: 255 if a > umbral_alfa else 0).getbbox()
    return im.crop(caja) if caja else im


def encuadrar_cuadrado(im: Image.Image, lado: int, margen: float) -> Image.Image:
    contenido = round(lado * (1 - 2 * margen))
    w, h = im.size
    escala = contenido / max(w, h)
    nuevo = im.resize((max(1, round(w * escala)), max(1, round(h * escala))), Image.LANCZOS)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    x = (lado - nuevo.width) // 2
    y = (lado - nuevo.height) // 2
    lienzo.paste(nuevo, (x, y), nuevo)
    return lienzo


def procesar(nombre_entrada: str, id_logo: int, fondo_blanco_solido: bool):
    im = Image.open(RAIZ / nombre_entrada)
    if fondo_blanco_solido:
        im.draft("RGB", (1200, 1200))  # decodifica el JPEG ya reducido: rápido y ligero
        im = quitar_fondo_por_conectividad(im)
    else:
        im = im.convert("RGBA")
    im = recortar_al_contenido(im)
    im = encuadrar_cuadrado(im, LADO_FINAL, MARGEN)
    destino = SALIDA / f"logo-{id_logo}.png"
    im.save(destino, optimize=True)
    print(f"{nombre_entrada} -> {destino.relative_to(RAIZ.parent)}  "
          f"({destino.stat().st_size / 1024:.0f} KB)")


procesar("logo1.png", 1, fondo_blanco_solido=False)
procesar("logo2.jpeg", 2, fondo_blanco_solido=True)
procesar("logo3.png", 3, fondo_blanco_solido=False)
