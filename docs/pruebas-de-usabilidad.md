# Protocolo de pruebas de usabilidad · RV-9.2

> **Estas pruebas requieren personas y no se han ejecutado.** Este documento es
> el protocolo y el instrumento de captura, listos para que el equipo conduzca
> las sesiones.

---

## Qué se quiere averiguar

El riesgo #7 del plan es *baja conversión en el registro*. Un formulario que
funciona técnicamente puede seguir perdiendo a la mitad de quienes lo empiezan,
y eso no lo detecta ninguna prueba automatizada.

La pregunta concreta: **¿una persona sin relación con el proyecto completa el
registro sola, en su propio teléfono, sin ayuda?**

## A quién convocar

**5 a 8 personas** ajenas al proyecto. Con 5 aparecen la mayoría de los
problemas graves; más de 8 empieza a repetir hallazgos.

Buscar variedad en lo que afecta al uso:

| Variable | Por qué importa |
|---|---|
| Edad (18–55, el rango elegible) | La letra pequeña y los objetivos táctiles |
| Familiaridad con trámites en línea | Quien nunca los hace es quien encuentra los atascos |
| Teléfono propio, Android e iOS | El teclado, el autocompletado y el selector de fecha difieren |
| Conexión real, no wifi de oficina | Los tiempos de espera se sienten distinto |

**Su propio teléfono, no uno prestado.** El autocompletado, el tamaño de letra
configurado y las manías de su navegador son parte de lo que se está probando.

## Cómo conducir la sesión

Unos 30 minutos por persona.

1. **Antes (2 min).** Explicar que se prueba el sistema, no a la persona, y que
   cualquier dificultad es información útil. Pedir permiso para grabar la
   pantalla. **No dar ninguna instrucción sobre cómo usarlo.**

2. **Tarea (20 min).** Una sola consigna:

   > «Imagina que quieres registrarte como donador de células madre. Entra a
   > este sitio y hazlo. Piensa en voz alta: di lo que estás mirando, lo que
   > esperas que pase y lo que te confunde.»

3. **Durante.** **No ayudar.** Si se atasca, esperar. Si pregunta, devolver la
   pregunta: «¿qué harías si yo no estuviera?». El silencio incómodo es donde
   está el hallazgo.

   Solo intervenir si lleva más de 3 minutos bloqueada, y anotarlo como fallo
   crítico.

4. **Después (8 min).**
   - ¿Qué te pareció más difícil?
   - ¿Hubo algo que no entendiste?
   - ¿Te quedó claro a qué te estás comprometiendo?
   - ¿Confiarías tus datos a este sitio? ¿Por qué?
   - Del 1 al 10, ¿qué tan fácil te resultó?

La tercera pregunta es la importante: el consentimiento tiene que ser
**informado**. Si la persona completó el registro sin entender qué aceptó, el
consentimiento es legalmente frágil por muy firmado que esté.

## Qué medir

| Métrica | Cómo | Objetivo |
|---|---|---|
| Tasa de finalización | Cuántas completan sin ayuda | **≥ 80%** |
| Tiempo total | Del inicio a la constancia | < 8 min |
| Tiempo por paso | Marca al cambiar de paso | Ningún paso > 3 min |
| Puntos de fricción | Cada duda, error o retroceso | — |
| Abandonos | En qué paso se rinde | 0 |
| Facilidad percibida | 1–10 | ≥ 7 de media |

## Instrumento de captura

Una hoja por participante:

```
Participante ____   Edad ____   Teléfono: Android / iOS
Familiaridad con trámites en línea:  ninguna / poca / mucha
Fecha ____________   Conduce ____________

TIEMPOS POR PASO
  1. Datos personales      ____ min   dudas: ______________________
  2. Contacto y domicilio  ____ min   dudas: ______________________
  3. Verificación (OTP)    ____ min   dudas: ______________________
  4. Elegibilidad          ____ min   dudas: ______________________
  5. Consentimiento        ____ min   dudas: ______________________
  TOTAL ____ min

FRICCIÓN  (paso · qué pasó · gravedad: bloquea / confunde / molesta)
  ______________________________________________________________
  ______________________________________________________________
  ______________________________________________________________

CITAS TEXTUALES  (lo que dijo, con sus palabras)
  ______________________________________________________________
  ______________________________________________________________

RESULTADO
  ☐ completó sola   ☐ completó con ayuda   ☐ abandonó en el paso ____

CIERRE
  Lo más difícil: _______________________________________________
  ¿Entendió a qué se comprometió?  sí / parcialmente / no
  ¿Confiaría sus datos?  sí / no  · por qué: ____________________
  Facilidad (1-10): ____
```

## Dónde se espera fricción

Anotado por diseño, para prestar atención:

| Paso | Sospecha |
|---|---|
| **CURP** | El campo más probable de abandono. Mucha gente no la sabe de memoria y la validación es estricta: si el mensaje de error no dice *qué* está mal, se rinde |
| **OTP** | Salir al correo y volver rompe el flujo. Si el mensaje tarda, se asume que falló |
| **Elegibilidad** | Preguntas de salud sensibles. Puede generar desconfianza o respuestas poco sinceras |
| **Consentimiento** | Hay que leer el documento hasta el final. ¿Lo leen, o buscan cómo saltárselo? |
| **Firma** | Firmar con el dedo en una pantalla pequeña. ¿Sale una firma que la persona reconozca como suya? |

Si alguien completa el consentimiento en menos de 20 segundos, **no lo leyó**, y
eso es un hallazgo tan importante como un error técnico.

## Qué hacer con los resultados

1. Agrupar la fricción por gravedad: bloquea > confunde > molesta.
2. Corregir **todo lo que bloquee** antes de abrir al público.
3. Lo que confunde, priorizarlo por cuántas personas lo encontraron.
4. Registrar los hallazgos y las correcciones en este mismo documento.

## Resultados

*Pendiente. Completar tras las sesiones.*

| Participante | Edad | SO | Completó | Tiempo | Facilidad |
|---|---|---|---|---|---|
| | | | | | |

**Hallazgos priorizados:**

| # | Paso | Qué pasó | Gravedad | Personas | Corrección | Estado |
|---|---|---|---|---|---|---|
| | | | | | | |
