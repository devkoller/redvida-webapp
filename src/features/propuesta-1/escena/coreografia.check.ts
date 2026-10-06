/**
 * Comprobación de la coreografía · RV-L3.4
 *
 * No es una prueba unitaria formal —el proyecto todavía no tiene arnés de
 * pruebas en el frontend—, pero verifica por números lo que mirando la pantalla
 * es difícil de afirmar: que la esfera no asoma antes de tiempo, que llega al
 * segundo pecho justo cuando se extingue, que la figura B nunca se desvanece
 * durante el cambio de malla y que **ninguna figura se mueve en X**.
 *
 *     npx tsx src/features/propuesta-1/escena/coreografia.check.ts
 */

import * as THREE from "three"

import { GUION } from "../data/guion"
import { calcular, calcularMarcas, vuelo } from "./coreografia"

const r = (n: number) => n.toFixed(2)
let fallos = 0

function exigir(condicion: boolean, descripcion: string) {
	console.log(`${condicion ? "  ok  " : " FALLA"}  ${descripcion}`)
	if (!condicion) fallos++
}

/**
 * Centros simulados a partir de las alturas declaradas en el guion.
 *
 * **No se pueden repartir uniformemente.** Con secciones de distinto alto, dar
 * por hecho que están equiespaciadas oculta justamente el problema que estas
 * alturas vienen a resolver: que el acto final se comprima al 8 % del scroll.
 * Se replica aquí el mismo cálculo que hace `estado.tsx` con el DOM real.
 */
const n = GUION.length
const altos = GUION.map((s) => s.alto ?? 1)
const total = altos.reduce((a, b) => a + b, 0)
const recorrido = total - 1 // el último viewport no es scroll

const centros: number[] = []
let acumulado = 0
for (const alto of altos) {
	// Centro del bloque menos medio viewport, igual que en `medir()`.
	centros.push(Math.min(1, Math.max(0, (acumulado + alto / 2 - 0.5) / recorrido)))
	acumulado += alto
}

const actos = GUION.map((s) => s.acto)
const marcas = calcularMarcas(centros, actos, recorrido)

console.log(
	`\n${n} secciones · ${total.toFixed(1)} pantallas de alto · ${recorrido.toFixed(1)} de scroll\n`,
)
console.log(
	`salida ${r(marcas.salida)} · emitida ${r(marcas.emitida)} · llegada ${r(marcas.llegada)} · ` +
		`transformación [${r(marcas.transformacion[0])}, ${r(marcas.transformacion[1])}]`,
)

console.log("\nRecorrido\n")
console.log(
	["  p", "  t", "esfera", "  A.y", "A.animo", "B.pres", "B.animo", "destello"]
		.map((s) => s.padStart(9))
		.join(""),
)
for (let p = 0; p <= 1.0001; p += 0.05) {
	const c = calcular(p, marcas)
	console.log(
		[
			r(p),
			r(c.t),
			r(c.esfera.presencia),
			r(c.figuraA.desplazamientoY),
			r(c.figuraA.animo),
			r(c.figuraB.presencia),
			r(c.figuraB.animo),
			r(c.figuraB.destello),
		]
			.map((s) => s.padStart(9))
			.join(""),
	)
}

console.log("\nComprobaciones\n")

// --- El hero manda ----------------------------------------------------------
const inicio = calcular(0, marcas)
exigir(inicio.esfera.presencia === 0, "en el hero la esfera todavía no existe")
exigir(inicio.figuraA.desplazamientoY === 0, "la figura A empieza en su sitio")

// **Dirección del movimiento.** Al hacer scroll hacia abajo el contenido sube en
// pantalla, así que una figura anclada a su sección tiene la Y creciente. La
// versión anterior de esta comprobación exigía lo contrario y por eso el fallo
// pasó: el test y el código estaban escritos desde la misma idea equivocada, y
// verse en pantalla fue lo único que lo destapó.
const unPoco = calcular(0.01, marcas)
exigir(unPoco.figuraA.desplazamientoY > 0, "la figura A sube con el hero, no baja")
// **La figura B no entra: está.** Ha pasado por tres versiones y conviene tener
// las tres presentes antes de tocar esto otra vez. Primero subía desde fuera del
// encuadre, y parecía salir del suelo como un zombi. Luego se revelaba con
// opacidad, quieta en su sitio — que resolvía aquello, pero con la cámara en
// movimiento se leía como una persona que aparece y desaparece según se sube o
// se baja. Ahora está siempre, como el resto de la escena: lo que cambia con el
// scroll es su pose y su luz.
exigir(inicio.figuraB.desplazamientoY === 0, "la figura B nunca se desplaza en vertical")
exigir(inicio.figuraB.presencia === 1, "y está presente desde el principio, sin desvanecidos")
exigir(calcular(1, marcas).figuraB.presencia > 0.98, "al final está del todo presente")

// La esfera no debe distraer mientras se lee el título.
const alEmpezar = calcular(centros[1] * 0.08, marcas)
exigir(alEmpezar.esfera.presencia < 0.02, "la esfera no asoma con el título quieto")

// --- Nadie se mueve en X ----------------------------------------------------
// La coreografía no expone desplazamiento horizontal para las figuras: no puede
// haberlo. Esta comprobación existe para que quede escrito, y para que reaparezca
// si alguien vuelve a introducir un paneo de cámara.
const claves = Object.keys(calcular(0.5, marcas).figuraA)
exigir(
	!claves.some((k) => k.toLowerCase().includes("x")),
	"ninguna figura tiene desplazamiento en X",
)

// --- La figura A se va con el hero, no antes --------------------------------
const traUnaPantalla = calcular(1 / recorrido, marcas)
exigir(
	traUnaPantalla.figuraA.desplazamientoY > 3,
	"tras una pantalla de scroll, la figura A ya salió por arriba",
)

/**
 * **La comprobación que faltaba.** La esfera tiene que nacer del pecho de la
 * figura A *mientras esa figura sigue en pantalla*. Si se retrasa, la persona ya
 * salió por arriba y la esfera aparece de la nada en mitad del encuadre: se
 * pierde por completo la lectura de que la luz sale de alguien.
 *
 * El umbral de 2.4 unidades es medio escenario: más allá, la figura está saliendo
 * de cuadro por arriba.
 */
let pAsoma = 1
for (let p = 0; p <= 1; p += 0.001) {
	if (calcular(p, marcas).esfera.presencia > 0.35) {
		pAsoma = p
		break
	}
}
const alAsomar = calcular(pAsoma, marcas)
console.log(
	`  la esfera asoma en p = ${r(pAsoma)}, con la figura A a ${r(alAsomar.figuraA.desplazamientoY)} de su sitio`,
)
exigir(
	alAsomar.figuraA.desplazamientoY < 2.4,
	"la esfera sale de la figura A estando esta aún visible",
)

// --- La figura B llega y se queda ------------------------------------------
const enAncla = calcular(marcas.anclaB, marcas)
const trasAncla = calcular(Math.min(1, marcas.anclaB + 0.05), marcas)
exigir(enAncla.figuraB.presencia === 1, "la figura B está presente en su sección")
exigir(Math.abs(trasAncla.figuraB.desplazamientoY) < 0.001, "y no se desplaza en ningún momento")

// --- El recorrido de la esfera ---------------------------------------------
let monotona = true
for (let p = 0; p < 1; p += 0.005) {
	if (calcular(p + 0.005, marcas).t < calcular(p, marcas).t - 1e-9) monotona = false
}
exigir(monotona, "la esfera avanza siempre, nunca retrocede")

const alLlegar = calcular(marcas.llegada, marcas)
exigir(alLlegar.t > 0.999, "al llegar, la esfera completó la curva")
exigir(alLlegar.esfera.presencia < 0.02, "y se extingue justo ahí, dentro del pecho")

// Cada sección tiene que tener a la esfera en su punto de luz cuando está
// centrada: es lo que hace que acompañe al texto en vez de cruzarlo al azar.
let desviacionMaxima = 0
for (let i = 1; i < n - 1; i++) {
	const esperado = i / (n - 1)
	const obtenido = calcular(centros[i], marcas).t
	desviacionMaxima = Math.max(desviacionMaxima, Math.abs(esperado - obtenido))
}
console.log(`  desviación máxima respecto al punto de luz de cada sección: ${r(desviacionMaxima)}`)
exigir(desviacionMaxima < 0.06, "la esfera está en el punto de cada sección cuando toca")

// --- La esfera no se sale de cuadro ni pisa el texto ------------------------
//
// La curva pasa por los puntos declarados, pero **entre dos puntos hace lo que
// quiere**: con la parametrización uniforme se abría más allá de los propios
// controles en cada zigzag y la esfera terminaba fuera de la pantalla. Aquí se
// recorre la curva entera y se mide de verdad, en vez de confiar en que los
// puntos de control estén dentro.
const I_RESOLUCION = GUION.findIndex((s) => s.acto === 4)
const curva = new THREE.CatmullRomCurve3(
	GUION.slice(0, I_RESOLUCION + 1).map(({ luz }) => new THREE.Vector3(...luz)),
	false,
	"centripetal",
)

/** Medio ancho del escenario, menos el radio con que el halo aún se ve. */
const BORDE = 2.6
let maxX = 0
let maxY = 0
let minY = 99
const punto = new THREE.Vector3()
for (let t = 0; t <= 1; t += 0.002) {
	curva.getPoint(t, punto)
	maxX = Math.max(maxX, Math.abs(punto.x))
	maxY = Math.max(maxY, punto.y)
	minY = Math.min(minY, punto.y)
}
console.log(`  recorrido real de la curva: |x| ≤ ${r(maxX)} · y ∈ [${r(minY)}, ${r(maxY)}]`)
exigir(maxX <= BORDE, "la esfera nunca se sale del encuadre por los lados")

/**
 * **El vuelo de abeja tampoco puede invadir el texto.**
 *
 * La deriva orgánica se suma a la curva, así que puede sacar la esfera de donde
 * la coreografía la puso. Lo único que la contiene es que su amplitud se apaga
 * hacia el centro — y eso hay que comprobarlo, no suponerlo. Se recorre la curva
 * **y** el tiempo a la vez, porque el vuelo depende de los dos.
 */
{
	const d = { x: 0, y: 0, z: 0 }
	let peorX = 0
	let invade = false
	for (let t = 0; t < 60; t += 0.11) {
		for (let u = 0; u <= 1; u += 0.01) {
			curva.getPoint(u, punto)
			vuelo(t, punto.x, d)
			const x = punto.x + d.x
			peorX = Math.max(peorX, Math.abs(x))
			// Estando en su margen, el vuelo no puede acercarla a la banda central.
			if (Math.abs(punto.x) > 1.3 && Math.abs(x) < 1.05) invade = true
		}
	}
	console.log(`  con vuelo, |x| máximo de la esfera: ${r(peorX)}`)
	exigir(peorX <= BORDE, "el vuelo no saca la esfera del encuadre")
	exigir(!invade, "el vuelo nunca empuja la esfera hacia la banda del texto")
}

exigir(maxY <= 2.7 && minY >= 0.4, "la esfera se mantiene dentro del alto del escenario")

// Y la regla que sostiene la legibilidad: en cada sección, la luz cae del lado
// contrario al texto. Se comprueba sobre el guion resuelto, que es donde podría
// colarse un `luz` explícito mal puesto.
const invasiones = GUION.filter((s) => {
	if (s.acto === 3 || s.acto === 4) return false // ahí manda la figura B
	return s.lado === "izquierda" ? s.luz[0] < 0.8 : s.luz[0] > -0.8
})
exigir(invasiones.length === 0, "ninguna sección tiene la luz del mismo lado que su texto")

// --- La transformación ------------------------------------------------------
//
// Ya no hay cruce de mallas que vigilar: con el esqueleto, la persona se endereza
// recorriendo un clip de dos fotogramas. Lo que hay que comprobar ahora es que
// ese movimiento sea **continuo, monótono y reversible** — las tres cosas que un
// clip *reproducido* no da, y que solo se tienen porque aquí el tiempo del clip
// lo pone el scroll.

console.log("\nTransformación de la figura B\n")
console.log(["  p", "presencia", "  ánimo", "destello"].map((x) => x.padStart(10)).join(""))
for (let p = 0.8; p <= 1.0001; p += 0.025) {
	const c = calcular(p, marcas)
	console.log(
		[r(p), r(c.figuraB.presencia), r(c.figuraB.animo), r(c.figuraB.destello)]
			.map((x) => x.padStart(10))
			.join(""),
	)
}
console.log()

/**
 * **La comprobación que importa con una sola malla.** El ánimo es el tiempo del
 * clip, así que tiene que ser **monótono y continuo**: si retrocediera, la
 * persona se desencorvaría y volvería a encorvarse sin que nadie subiera; y un
 * salto grande entre dos progresos vecinos es un tirón en pantalla, porque el
 * scroll puede caer justo en medio.
 *
 * Es lo que sustituye a la vigilancia del cruce de mallas: aquella comprobaba
 * que la figura no se desvaneciera entre dos objetos; esta, que el movimiento no
 * se rompa.
 */
let saltoMaximo = 0
let dondeSalto = 0
let retrocesos = 0
let anterior = calcular(marcas.anclaB, marcas).figuraB.animo
for (let p = marcas.anclaB; p <= 1; p += 0.002) {
	const actual = calcular(p, marcas).figuraB.animo
	const salto = actual - anterior
	if (salto < -1e-9) retrocesos++
	if (Math.abs(salto) > saltoMaximo) {
		saltoMaximo = Math.abs(salto)
		dondeSalto = p
	}
	anterior = actual
}
exigir(retrocesos === 0, "el ánimo de B nunca retrocede mientras se avanza")
console.log(`  salto máximo por 0.002 de progreso: ${r(saltoMaximo)} en p = ${r(dondeSalto)}`)
// La transformación ocupa ~15 % del recorrido, así que 0.002 de progreso son
// ~1.3 % de clip. El margen deja sitio al suavizado, que acelera en el centro.
exigir(saltoMaximo < 0.03, "y avanza sin escalones")

// Y es reversible por construcción: `calcular` es una función pura del progreso,
// así que volver a un progreso anterior devuelve exactamente la misma pose.
const ida = calcular(0.93, marcas).figuraB.animo
const vuelta = calcular(0.93, marcas).figuraB.animo
exigir(ida === vuelta, "volver atrás devuelve la misma pose, no una parecida")

// El fogonazo acompaña al enderezamiento: ya no tapa un corte, lo subraya.
const enMitad = calcular((marcas.transformacion[0] + marcas.transformacion[1]) / 2, marcas)
console.log(`  destello en mitad de la transformación: ${r(enMitad.figuraB.destello)}`)
exigir(enMitad.figuraB.destello > 0.5, "el fogonazo acompaña a la transformación")

const final = calcular(1, marcas)
exigir(final.figuraB.animo > 0.999, "al final la figura B está del todo erguida y encendida")
exigir(final.figuraB.destello < 0.05, "y el fogonazo ya se apagó")

console.log(fallos === 0 ? "\nSin fallos.\n" : `\n${fallos} comprobación(es) fallida(s).\n`)
process.exit(fallos === 0 ? 0 : 1)
