# Accesibilidad · WCAG 2.1 AA (RV-8.9)

Auditoría del 3 de agosto de 2026 con **axe-core 4.12.1**, criterios
`wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa`.

## Cómo repetirla

```bash
pnpm a11y:preparar
```

Deja `axe.min.js` accesible en `/axe.min.js` mientras corre `pnpm dev`. Después,
en la consola del navegador y por cada página a revisar:

```js
const s = document.createElement("script")
s.src = "/axe.min.js"
s.onload = () =>
	axe
		.run(document, {
			runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
		})
		.then((r) => console.table(r.violations))
document.head.appendChild(s)
```

Al terminar:

```bash
pnpm a11y:limpiar
```

**Nunca compilar con `axe.min.js` en `public/`**: son 572 KB de herramienta de
auditoría que acabarían servidos a cada visitante.

## Resultado

| Página              | Violaciones | Reglas superadas |
| ------------------- | ----------- | ---------------- |
| `/` (tema oscuro)   | 0           | 19               |
| `/` (tema claro)    | 0           | 19               |
| `/registro`         | 0           | 26               |
| `/derechos-arco`    | 0           | 26               |
| `/aviso-privacidad` | 0           | 19               |
| `/admin/donadores`  | 0           | 25               |
| `/admin/dashboard`  | 0           | 23               |

## El defecto que se encontró y se corrigió

**Contraste insuficiente del color de marca sobre fondo oscuro.**

`--primary` daba **3.58:1** aplicado como texto sobre el fondo del tema oscuro,
por debajo del 4.5:1 que WCAG 2.1 AA exige para texto normal (1.4.3).

Lo interesante del caso es que **no tenía solución con un solo valor**. El mismo
token se usaba para dos cosas distintas:

| Luminosidad         | Como texto sobre el fondo | Blanco sobre el botón |
| ------------------- | ------------------------- | --------------------- |
| 0.5419 _(original)_ | 3.56:1 ✗                  | 5.36:1 ✓              |
| 0.58                | 4.21:1 ✗                  | 4.52:1 ✓              |
| 0.60                | 4.58:1 ✓                  | 4.16:1 ✗              |
| 0.62                | 4.97:1 ✓                  | 3.83:1 ✗              |

Aclararlo lo suficiente para que el texto cumpliera hundía el contraste del
texto blanco sobre el botón. Son dos requisitos que tiran en direcciones
opuestas porque son dos roles distintos: **superficie** y **texto**.

La corrección fue separarlos:

- `--primary` (0.5419) sigue pintando superficies — botones, insignias—, donde
  el texto blanco encima da 5.36:1.
- `--primary-accent` (0.62) es nuevo y pinta **texto**: 4.97:1 sobre el fondo
  oscuro. En tema claro toma el mismo valor que `--primary`, que ahí ya daba
  10.95:1.

Los 26 usos de `text-primary` pasaron a `text-primary-accent`.

## Lo que axe no puede comprobar, verificado a mano

- **Foco visible (2.4.7).** Recorrido completo con Tab sobre la landing: cada
  elemento enfocable muestra un anillo de 3 px del color de marca. Comprobado
  visualmente, no solo por estilo computado —medir `getComputedStyle` dentro de
  `focusin` da falsos negativos porque el navegador aún no ha resuelto
  `:focus-visible`—.
- **Enlace de salto (2.4.1).** `.skip-link` es el primer elemento del recorrido y
  se vuelve visible al recibir foco.
- **Movimiento reducido (2.3.3).** `@media (prefers-reduced-motion: reduce)`
  anula animaciones y transiciones en `index.css`.
- **El color nunca es el único indicador (1.4.1).** El semáforo de vencimiento de
  ARCO y los estados del padrón llevan siempre texto además del color.
- **Errores anunciados (3.3.1).** Los mensajes de validación usan `role="alert"`
  y los campos se enlazan con `aria-describedby`.

## Pendiente

- **Prueba con lector de pantalla real** (VoiceOver / NVDA). axe detecta
  estructura, no si el resultado se entiende al escucharlo. Corresponde a las
  pruebas de usabilidad del Sprint 9.
- **Lighthouse ≥ 95**, que el plan menciona: requiere un despliegue servido, no
  el servidor de desarrollo. Queda para el Sprint 9, junto con el resto de
  métricas de rendimiento.

## El naranja de marca #FC4B08 y las cuatro paletas (17 de agosto de 2026)

Red Vida entregó un naranja de marca, `#FC4B08`, y cuatro combinaciones de
color construidas alrededor de él bajo el esquema 60/30/10. La restricción que
condiciona todo el sistema es esta:

| Par                       | Contraste | AA texto normal (4.5:1) |
| ------------------------- | --------- | ----------------------- |
| `#FC4B08` sobre blanco    | 3.42:1    | **no**                  |
| Blanco sobre `#FC4B08`    | 3.42:1    | **no**                  |
| `#172A32` sobre `#FC4B08` | 4.35:1    | **no**                  |
| `#25282A` sobre `#FC4B08` | 4.34:1    | **no**                  |
| Negro sobre `#FC4B08`     | 6.15:1    | sí                      |

Es decir: **el naranja de marca no admite texto blanco encima ni sirve como
color de texto sobre fondo claro.** Sí cumple el 3:1 que exige WCAG 1.4.11 para
componentes de interfaz, así que como _superficie_ de un botón funciona; lo que
no funciona es la etiqueta blanca que normalmente se le pondría.

De ahí salen dos decisiones que ya estaban en el sistema y ahora se justifican
con números:

- `--primary` pinta superficies y lleva `--primary-foreground`, un tono casi
  negro derivado del color de texto de cada paleta.
- `--primary-accent` es el naranja aplicado a TEXTO, oscurecido hasta 4.5:1
  conservando el matiz (36.2° frente a los 36.33° de la marca).

Se añadió `--contraste`, que es el color ancla del 30%. Los bloques grandes
(como la tarjeta de llamada a la acción de la portada) usan ese token y no
`--primary`: a pantalla completa el naranja satura, y era lo que rompía la
proporción 60/30/10.

### Cómo se generan

`src/paletas.css` no se edita a mano. Lo produce `docs/paletas/generar_css.py`
a partir de los 6 colores por combinación que entregó la agencia; los ~20
tokens restantes se resuelven por bisección en OKLCH hasta cumplir 4.5:1 en
texto y 3:1 en componentes. El generador **aborta** si algún par se queda corto.

```bash
cd docs/paletas && python3 generar_css.py && mv paletas.css ../../src/ && cd ../.. && npx prettier --write src/paletas.css
```

(El paso de prettier solo recorta ceros finales —`36.20` pasa a `36.2`—; sin él
el archivo es numéricamente el mismo pero no pasa `pnpm format:check`.)

Al escribirlo aparecieron dos conflictos reales, no evitables ajustando a ojo:

1. **Ningún ámbar de aviso** cumple a la vez 4.5:1 con el gris oscuro de la
   paleta encima y 3:1 contra un fondo casi blanco: la ventana de luminancia
   sale vacía en la combinación 2. Se resolvió bajando el texto del aviso a casi
   negro, que es como se compone un ámbar habitualmente.
2. **`--border` y `--input` no pueden ser el mismo valor.** El borde que
   especifica la marca (p. ej. `#DCE5E7`) da 1.2:1 contra el fondo: vale para
   separar tarjetas, pero no para delimitar un campo del formulario de registro,
   donde el borde es lo único que identifica el control. `--input` se oscurece
   hasta 3:1; `--border` se deja como lo pide la marca.

### Estado

Las 4 paletas nuevas × 2 modos × 13 pares = **104 comprobaciones, todas en
verde**, medidas dos veces: en el generador y otra vez en el navegador leyendo
los tokens ya resueltos.

La paleta institucional actual (rojo `#7B0D1E`) **no se tocó**, y esa misma
medición le encontró 5 incumplimientos preexistentes:

| Par                                          | Contraste           |
| -------------------------------------------- | ------------------- |
| `--input` contra el fondo (claro)            | 1.27:1 (mínimo 3:1) |
| `--destructive` con texto blanco (oscuro)    | 2.77:1              |
| `--muted-foreground` sobre `--muted` (claro) | 4.39:1              |
| `--success` con texto blanco (claro)         | 4.36:1              |
| `--primary-accent` sobre `--card` (oscuro)   | 4.43:1              |

Los tres últimos se quedan a menos de un décimo del umbral. Los dos primeros
sí son visibles: los campos del formulario de registro apenas se distinguen del
fondo, y un mensaje de error en modo oscuro queda por debajo de la mitad de lo
exigido.
