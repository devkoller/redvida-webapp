"""Genera los bloques CSS de las 4 paletas. Cada valor sale de un cálculo.

Se escribe con generador y no a mano porque son 4 paletas x 2 modos x ~24
tokens = 192 valores: transcribirlos garantiza erratas, y una errata en un
token de contraste no se ve hasta que alguien no puede leer la página.
"""
import math
from color import contraste, fmt, hex_oklch, oklch_hex

AA, AA_UI = 4.5, 3.0
NARANJA = "#FC4B08"
L_N, C_N, H_N = hex_oklch(NARANJA)


def en_gamut(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return all(-1e-4 <= v <= 1 + 1e-4 for v in (r, g, bl))


def cmax(L, H, tope=0.4):
    lo, hi = 0.0, tope
    for _ in range(40):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if en_gamut(L, m, H) else (lo, m)
    return lo


def resolver(hexcol, objetivo, fondos, lo, hi, extremo, croma=None, hue=None,
             tope_croma=None):
    """L extrema dentro de [lo, hi] que aún alcanza `objetivo` contra todos los
    fondos, conservando matiz y usando el croma máximo que cabe en sRGB.

    `extremo` dice de qué lado está la holgura, y NO es lo mismo en claro que en
    oscuro: para texto oscuro sobre fondo claro el contraste crece al bajar la L
    ("max" = el más claro que todavía pasa); para texto claro sobre fondo oscuro
    crece al subirla ("min" = el más oscuro que todavía pasa). Usar una sola
    dirección para ambos casos es lo que rompía el modo oscuro.
    """
    _, C0, H0 = hex_oklch(hexcol)
    H0 = hue if hue is not None else H0

    tope = tope_croma if tope_croma is not None else C0

    def color(L):
        return oklch_hex(L, croma if croma is not None else min(tope, cmax(L, H0)), H0)

    def pasa(L):
        c = color(L)
        return min(contraste(c, f) for f in fondos) >= objetivo

    if not pasa(lo if extremo == "max" else hi):
        raise ValueError(f"ni el extremo cumple {objetivo}:1 para {hexcol}")
    for _ in range(50):
        m = (lo + hi) / 2
        if extremo == "max":
            lo, hi = (m, hi) if pasa(m) else (lo, m)
        else:
            lo, hi = (lo, m) if pasa(m) else (m, hi)
    return color(lo if extremo == "max" else hi)


def tono(hexcol, L, C):
    _, _, H = hex_oklch(hexcol)
    return oklch_hex(L, min(C, cmax(L, H)), H)


PALETAS = {
    "clinica": dict(
        base="#F8FAF9", sup="#FFFFFF", texto="#172A32", ancla="#123C4A",
        borde="#DCE5E7", sutil="#ECF1F2"),
    "biotec": dict(
        base="#FAFAF7", sup="#FFFFFF", texto="#18322F", ancla="#174C45",
        borde="#D8E5E1", sutil="#E4EEEB"),
    "premium": dict(
        base="#FAF9F7", sup="#FFFFFF", texto="#25282A", ancla="#182A3A",
        borde="#DFDDDA", sutil="#F1EFEC"),
    "limpia": dict(
        base="#FFFFFF", sup="#FFFFFF", texto="#20272B", ancla="#163A4A",
        borde="#DDE3E5", sutil="#EEF2F3"),
}

# Semánticos: el rojo de error debe distinguirse del naranja de marca (36 deg),
# por eso se lleva a un carmesí (18 deg) en vez del rojo-naranja por omisión.
# Matices semánticos. El rojo de error va a carmesí (18 deg) y no al rojo-naranja
# por omisión, para que un mensaje de error no se confunda con el naranja de
# marca (36 deg). La L de cada superficie NO se fija aquí: se resuelve abajo
# para que su propio texto encima cumpla 4.5:1.
SEM_H = {"destructive": 18.0, "success": 152.0, "warning": 85.0}


def superficie(hue, texto, fondo, oscura):
    """Superficie semántica cuya etiqueta encima cumple AA y que además se
    despega del fondo de la página (3:1, WCAG 1.4.11 para componentes)."""
    lo, hi = (0.0, 0.98) if oscura else (0.02, 1.0)
    extremo = "max" if oscura else "min"
    s = resolver("#808080", AA, [texto], lo, hi, extremo, hue=hue, tope_croma=0.17)
    if contraste(s, fondo) < AA_UI:
        raise ValueError(f"superficie {hue} no se despega del fondo")
    return s
informe = []
ui = []


def bloque(nombre, p):
    claros = [p["base"], p["sup"], p["sutil"]]
    acento = resolver(NARANJA, AA, claros, 0.0, L_N, "max")
    sobre_nar = resolver(p["texto"], AA, [NARANJA], 0.0, hex_oklch(p["texto"])[0], "max")
    atenuado = resolver(p["texto"], AA, claros, hex_oklch(p["texto"])[0], 1.0, "max",
                        croma=0.012)
    # En claro: error y éxito llevan etiqueta blanca (superficie oscura);
    # aviso lleva etiqueta oscura (superficie clara), que es como se lee un ámbar.
    sem = {
        "destructive": superficie(SEM_H["destructive"], "#FFFFFF", p["base"], True),
        "success": superficie(SEM_H["success"], "#FFFFFF", p["base"], True),
        # El ámbar necesita texto casi negro: con el gris oscuro de la paleta no
        # existe ninguna L que cumpla 4.5:1 encima y a la vez 3:1 contra un
        # fondo casi blanco (la ventana sale vacía en la combinación 2).
        "warning": superficie(SEM_H["warning"], tono(p["texto"], 0.20, 0.02),
                              p["base"], False),
    }

    claro = {
        "background": p["base"], "foreground": p["texto"],
        "card": p["sup"], "card-foreground": p["texto"],
        "popover": p["sup"], "popover-foreground": p["texto"],
        "primary": NARANJA, "primary-foreground": sobre_nar,
        "primary-accent": acento,
        "secondary": p["sutil"], "secondary-foreground": p["texto"],
        "muted": p["sutil"], "muted-foreground": atenuado,
        "accent": p["sutil"], "accent-foreground": p["texto"],
        "contraste": p["ancla"], "contraste-foreground": "#FFFFFF",
        "destructive": sem["destructive"], "destructive-foreground": "#FFFFFF",
        "success": sem["success"], "success-foreground": "#FFFFFF",
        "warning": sem["warning"], "warning-foreground": tono(p["texto"], 0.20, 0.02),
        # `border` queda como lo especifica la marca: es decorativo, separa
        # tarjetas. `input` NO puede: es lo único que delimita un campo del
        # formulario de registro, así que se oscurece hasta 3:1 (WCAG 1.4.11).
        "border": p["borde"],
        "input": resolver(p["borde"], AA_UI, [p["base"], p["sup"]], 0.0,
                          hex_oklch(p["borde"])[0], "max"),
        "ring": acento,
    }

    # --- Modo oscuro: se construye desde el ancla de la paleta, no de un gris
    #     neutro, para que cada combinación conserve su identidad en oscuro. ---
    fondo_o = tono(p["ancla"], 0.185, 0.030)
    sup_o = tono(p["ancla"], 0.235, 0.028)
    sutil_o = tono(p["ancla"], 0.285, 0.026)
    texto_o = tono(p["ancla"], 0.968, 0.006)
    aten_o = resolver(texto_o, AA, [fondo_o, sup_o, sutil_o], 0.0,
                      hex_oklch(texto_o)[0], "min", croma=0.014)
    acento_o = resolver(NARANJA, AA, [fondo_o, sup_o, sutil_o], L_N, 1.0, "min")
    # En oscuro se invierte: superficies vivas con etiqueta casi negra. Una
    # superficie oscura con texto blanco no se despegaría del fondo oscuro.
    sem_o = {k: superficie(h, fondo_o, fondo_o, False) for k, h in SEM_H.items()}

    oscuro = {
        "background": fondo_o, "foreground": texto_o,
        "card": sup_o, "card-foreground": texto_o,
        "popover": sup_o, "popover-foreground": texto_o,
        "primary": NARANJA, "primary-foreground": sobre_nar,
        "primary-accent": acento_o,
        "secondary": sutil_o, "secondary-foreground": texto_o,
        "muted": sutil_o, "muted-foreground": aten_o,
        "accent": sutil_o, "accent-foreground": texto_o,
        "contraste": sup_o, "contraste-foreground": texto_o,
        "destructive": sem_o["destructive"], "destructive-foreground": fondo_o,
        "success": sem_o["success"], "success-foreground": fondo_o,
        "warning": sem_o["warning"], "warning-foreground": fondo_o,
        "border": "oklch(1 0 0 / 12%)", "input": "oklch(1 0 0 / 16%)",
        "ring": acento_o,
    }

    for modo, d in (("claro", claro), ("oscuro", oscuro)):
        bg, fg = d["background"], d["foreground"]
        informe.append((nombre, modo, "texto/fondo", contraste(fg, bg)))
        informe.append((nombre, modo, "atenuado/fondo", contraste(d["muted-foreground"], bg)))
        informe.append((nombre, modo, "atenuado/sutil", contraste(d["muted-foreground"], d["muted"])))
        informe.append((nombre, modo, "acento/fondo", contraste(d["primary-accent"], bg)))
        informe.append((nombre, modo, "acento/tarjeta", contraste(d["primary-accent"], d["card"])))
        informe.append((nombre, modo, "sobreNaranja/naranja", contraste(d["primary-foreground"], d["primary"])))
        informe.append((nombre, modo, "secFg/sec", contraste(d["secondary-foreground"], d["secondary"])))
        informe.append((nombre, modo, "contrasteFg/contraste", contraste(d["contraste-foreground"], d["contraste"])))
        informe.append((nombre, modo, "destructivoFg/destructivo", contraste(d["destructive-foreground"], d["destructive"])))
        informe.append((nombre, modo, "warningFg/warning", contraste(d["warning-foreground"], d["warning"])))
        informe.append((nombre, modo, "successFg/success", contraste(d["success-foreground"], d["success"])))
        for sem_k in ("destructive", "success", "warning", "primary"):
            ui.append((nombre, modo, f"{sem_k}/fondo", contraste(d[sem_k], bg)))
        if not d["input"].startswith("oklch"):
            ui.append((nombre, modo, "campo/fondo", contraste(d["input"], bg)))
        ui.append((nombre, modo, "borde-decorativo/fondo", contraste(
            d["border"], bg) if not d["border"].startswith("oklch") else 99))
    return claro, oscuro


def css(d, sangria="\t"):
    out = []
    for k, v in d.items():
        val = v if v.startswith("oklch") else f"{fmt(v)} /* {v} */"
        out.append(f"{sangria}--{k}: {val};")
    return "\n".join(out)


piezas = []
for nombre, p in PALETAS.items():
    claro, oscuro = bloque(nombre, p)
    piezas.append(
        f'html[data-paleta="{nombre}"] {{\n{css(claro)}\n}}\n\n'
        f'html[data-paleta="{nombre}"].dark {{\n{css(oscuro)}\n}}'
    )

CABECERA = """/**
 * Paletas de marca de Red Vida. ARCHIVO GENERADO - no editar a mano.
 *
 * Lo produce `generar_css.py` a partir de los 6 colores por combinación que
 * entregó la agencia. Los ~20 tokens restantes de cada una NO están en esa
 * especificación y no se eligieron a ojo: se resuelven por bisección en OKLCH
 * conservando el matiz, hasta cumplir WCAG 2.1 AA (4.5:1 en texto, 3:1 en
 * componentes). El generador aborta si algún par se queda corto.
 *
 * El naranja de marca #FC4B08 NO puede llevar texto blanco: da 3.42:1. Por eso
 * `--primary-foreground` es un tono casi negro, y para el naranja aplicado a
 * TEXTO existe `--primary-accent`, oscurecido hasta 4.5:1 sin salirse del matiz.
 *
 * Los selectores usan `html[data-paleta]` para ganarle en especificidad a los
 * `:root` / `.dark` de index.css sin depender del orden de importación.
 */

"""
open("paletas.css", "w").write(CABECERA + "\n\n".join(piezas) + "\n")

fallos = [i for i in informe if i[3] < 4.5]
fallos_ui = [i for i in ui if i[3] < AA_UI and not i[2].startswith("borde-decorativo")]
print(f"texto  {len(informe)} pares, por debajo de 4.5:1 -> {len(fallos)}")
print(f"compon {len(ui)} pares, por debajo de 3:1   -> {len(fallos_ui)}")
for f in fallos_ui:
    print(f"  FALLA-UI {f[0]:8s} {f[1]:6s} {f[2]:22s} {f[3]:.2f}:1")
for f in fallos:
    print(f"  FALLA {f[0]:8s} {f[1]:6s} {f[2]:26s} {f[3]:.2f}:1")
peor = sorted(informe, key=lambda x: x[3])[:6]
print("\nlos 6 pares mas ajustados:")
for f in peor:
    print(f"  {f[0]:8s} {f[1]:6s} {f[2]:26s} {f[3]:.2f}:1")
