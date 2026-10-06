# redvida-webapp

SPA pública de **RedVidaMX** — landing informativa y flujo de registro de donadores.

Node 24 LTS · Vite 7 · React 19 · TanStack Router + Query · Tailwind v4 · shadcn/ui (`new-york`)

> Estado: **Sprint 3 completo.** Landing pública, wizard de registro de 4 pasos contra la API real y consulta de estatus. El panel administrativo llega en el Sprint 6 y el CMS en el Sprint 7.

---

## Puesta en marcha

Requiere `redvida-server` corriendo (por omisión en `http://localhost:3000/v1`).

```bash
nvm use
pnpm install
cp .env.example .env
pnpm dev
```

| Script           | Qué hace                                 |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo en `:5173`        |
| `pnpm build`     | `tsc -b && vite build`                   |
| `pnpm preview`   | Sirve el build de producción             |
| `pnpm typecheck` | Solo verificación de tipos               |
| `pnpm format`    | Prettier con orden de clases de Tailwind |

---

## Estructura

```
src/
├── main.tsx                    # QueryClient + RouterProvider + ThemeProvider
├── routeTree.gen.ts            # generado; SÍ se versiona (ver .gitignore)
├── index.css                   # sistema de diseño: tokens OKLCH light/dark
├── routes/                     # ruteo por archivos (TanStack Router)
│   ├── __root.tsx              # layout público + 404 + Toaster
│   ├── index.tsx               # landing
│   └── registro/
│       ├── index.tsx           # wizard
│       └── estatus.tsx         # consulta de avance
├── features/
│   ├── landing/                # secciones de la landing
│   ├── registro/
│   │   ├── components/         # paso-datos · paso-otp · paso-elegibilidad
│   │   │                       # paso-confirmacion · wizard-stepper · error-summary
│   │   └── data/schema.ts      # esquemas zod por paso
│   └── estatus/                # línea de tiempo del recorrido
├── components/
│   ├── ui/                     # shadcn
│   ├── public-header.tsx
│   ├── public-footer.tsx
│   └── theme-provider.tsx
├── api/{config.ts,fetchApi.ts}
├── hooks/{useFetch.tsx,usePost.tsx}
├── stores/registroStore.ts
└── types/api.ts
```

---

## Sistema de diseño

Base: rojo institucional **`#7B0D1E`** = `oklch(0.3757 0.1411 20.78)`.

Los tokens van en **OKLCH** porque es perceptualmente uniforme: bajar la luminosidad se ve como "un poco más oscuro" de verdad, mientras que el mismo ajuste en HSL desatura el color por el camino.

Tres decisiones que conviene conocer:

1. **En modo oscuro el primario se aclara** a `#C42B47`. El rojo institucional sobre gris oscuro no alcanza el contraste AA que se certifica en el Sprint 8. La identidad importa, pero menos que poder leer.
2. **El color destructivo es distinto del primario.** Si el rojo de error fuera el rojo de la marca, un mensaje de error no se distinguiría de un botón.
3. **El foco visible no se elimina.** Es requisito WCAG 2.4.7 y la única forma de completar el registro con teclado.

---

## El wizard de registro

Cuatro pasos: datos personales → verificación por OTP → cuestionario de salud → confirmación.

### Por qué el paso vive en el store y no en la URL

El avance se guarda en `registroStore` (Zustand). Con rutas por paso, cualquiera podría saltarse la verificación de correo escribiendo `/registro/paso-3`. Con el store, el paso solo avanza cuando el backend confirmó la operación anterior.

### Por qué `sessionStorage` y no `localStorage`

En el store hay datos personales a medio capturar: nombre, CURP, correo. En `sessionStorage` desaparecen al cerrar la pestaña; en `localStorage` se quedarían indefinidamente en un equipo que puede ser compartido —una computadora de biblioteca, un módulo de campaña—. Se pierde el avance al cerrar la pestaña, y es el intercambio correcto.

Al terminar se llama `limpiar()`: la pantalla de confirmación conserva solo el código de registro, que no es dato personal.

### Validación en dos capas

`zod` en el cliente duplica a propósito parte de lo que valida el backend. No es desconfianza: corregir un campo sin esperar el viaje al servidor es la diferencia entre completar el registro y abandonarlo. **El backend sigue siendo la autoridad** — la coherencia de la CURP contra nombre, fecha y sexo, y la unicidad, solo él puede verificarlas.

Cuando el backend devuelve la lista completa de campos inválidos (`cause`), `fetchApi` la normaliza en `ApiError.errores` y el formulario los marca uno por uno, además de mostrarlos en `ErrorSummary`.

### El cuestionario se renderiza desde la API

Las preguntas vienen de `GET /donadores/elegibilidad/cuestionario`, no de una lista en el front. Los criterios clínicos van a cambiar tras la validación médica y no debe hacer falta redesplegar la SPA para eso.

### Modo demostración (`VITE_DEMO=1`)

El proyecto se entrega a lo largo de dos meses y hay que poder **enseñar las
pantallas antes de que la cadena completa funcione**. Con `VITE_DEMO=1`:

- el formulario no valida — el paso 1 avanza aunque esté vacío;
- las llamadas a la API se responden con datos de ejemplo (catálogos,
  cuestionario y consentimiento), con 350 ms de espera para que los estados de
  carga se vean como se verán de verdad;
- el indicador de avance se vuelve pulsable, para saltar a cualquier paso.

Nada de esto se nota en pantalla: no hay botones ni indicadores añadidos. Los
campos se dejan vacíos y se avanza, o se escribe solo lo que se quiera enseñar.

**No hay aviso en pantalla.** Es deliberado: lo que se presenta debe verse como
el producto que será, no como una maqueta. El aviso equivalente se imprime en la
consola del navegador, donde lo ve quien desarrolla y no quien mira.

Se resuelve **en compilación**, a un literal `__DEMO__` (ver `vite.config.ts`).
No hay parámetro de URL ni bandera en `sessionStorage` que lo encienda: el único
interruptor es quien compila o arranca el servidor. Una compilación de
producción sin esa variable no puede activarlo.

Para el día a día va en `.env.development.local`. **Nunca en `.env.local`**:
Vite carga ese archivo también al compilar para producción, y el modo acabaría
en el sitio real. Para una compilación de presentación desplegable:

```bash
VITE_DEMO=1 pnpm build
```

Lo que no se salta: las cuatro condiciones del consentimiento —leer el
documento, firmar y marcar las dos casillas—. Eso no es validación de datos,
es la pantalla que se quiere enseñar; para saltarla está el indicador pulsable.

### Las pantallas de rechazo

Quien acaba de dedicar cinco minutos a intentar salvar una vida no debe encontrarse un "no apto" seco:

- **Diferimiento temporal** → la fecha exacta en que podrá volver, y por qué motivo.
- **Descarte permanente** → el motivo, y otras formas de ayudar (difusión, donación de sangre).

---

## Accesibilidad

Se certifica AA en el Sprint 8, pero el trabajo empieza aquí:

- Enlace "Saltar al contenido" (WCAG 2.4.1).
- El stepper es un `<ol>` con `aria-current="step"`.
- Cada campo tiene `<label>` asociado, y su ayuda y su error enlazados por `aria-describedby`.
- `ErrorSummary` tiene `role="alert"` y recibe el foco al aparecer (WCAG 3.3.1).
- Al cambiar de paso, la vista vuelve arriba y el foco pasa al encabezado.
- `prefers-reduced-motion` desactiva las animaciones.
- El menú móvil declara `aria-expanded` y `aria-controls`.

Pendiente para el Sprint 8: auditoría formal con lector de pantalla y verificación de contraste en todos los estados.

---

## Notas

- **`routeTree.gen.ts` se versiona** aunque lo genere el plugin. `pnpm build` ejecuta `tsc -b` antes que `vite build`, así que en un clon limpio el archivo aún no existiría y el typecheck fallaría. No editarlo a mano.
- **No hay autenticación**: todo el flujo del Sprint 3 es público. El interceptor de token llega con el panel administrativo (Sprint 8).
- **El contenido de la landing está en código.** El Sprint 7 lo mueve al CMS; la estructura de secciones ya corresponde a los tipos de bloque (`hero`, `estadisticas`, `timeline`, `tarjetas`, `faq`, `cta`) para que la migración sea un mapeo y no una reescritura.
