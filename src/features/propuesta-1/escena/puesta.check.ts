/**
 * Comprobación de la puesta en escena · RV-L2.9
 *
 * Con la cámara quieta, dónde caían las figuras y la esfera era una constante
 * que se elegía mirando una vez. Con la cámara bajando quince metros y dando
 * media vuelta, **es una función del scroll**, y a ojo no se comprueba: haría
 * falta recorrer la página entera parándose en cada sección.
 *
 * Esto hace justo eso, sin navegador: reconstruye las marcas como en
 * `coreografia.check.ts`, coloca cada luz con el mismo cálculo que usa la
 * escena, y mide en coordenadas de pantalla lo que tiene que cumplirse.
 *
 *     npx tsx src/features/propuesta-1/escena/puesta.check.ts
 */

import * as THREE from "three"

import { readFileSync } from "node:fs"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import { aMundo, aPerfil, aRelativo, encuadre, fovPara, type Perfil } from "./camara"
import { FIGURA_A, FIGURA_B, PECHO as ALTURA_PECHO, type Figura } from "./figuras"
import { sinTexturas } from "./glb-sin-texturas"
import { OBJETOS } from "./objetos"
import { calcularMarcas } from "./coreografia"
import { ACTOS, GUION } from "../data/guion"

/**
 * Qué pantalla se comprueba · RV-L2.13
 *
 *     npx tsx src/features/propuesta-1/escena/puesta.check.ts        # apaisada
 *     npx tsx src/features/propuesta-1/escena/puesta.check.ts alto   # vertical
 *
 * **Las dos hay que pasarlas**, y la vertical no es un extra: es donde esto
 * falla. Con el campo de visión vertical fijo que había, una pantalla en pie
 * recortaba tanto por los lados que las dos figuras quedaban fuera del encuadre
 * — y esta comprobación, que solo miraba 16:9, decía que todo estaba bien.
 */
const PERFIL: Perfil = process.argv[2] === "alto" ? "alto" : "ancho"
/** 16:9 apaisada; 9:19.5 es un teléfono moderno en pie. */
const ASPECTO = PERFIL === "alto" ? 9 / 19.5 : 16 / 9
const FOV = fovPara(ASPECTO)
const PECHO = ALTURA_PECHO

let fallos = 0
const r = (n: number) => n.toFixed(2).padStart(6)

function exigir(condicion: boolean, descripcion: string) {
	console.log(`  ${condicion ? "ok  " : "FALLA"}  ${descripcion}`)
	if (!condicion) fallos++
}

function camara(progreso: number) {
	const { posicion, mira } = encuadre(progreso, PERFIL)
	const c = new THREE.PerspectiveCamera(FOV, ASPECTO, 0.1, 40)
	c.position.set(...posicion)
	c.lookAt(new THREE.Vector3(...mira))
	c.updateMatrixWorld(true)
	c.updateProjectionMatrix()
	return c
}

/** Dónde cae un punto del mundo en la pantalla: −1 izquierda, +1 derecha. */
const enPantalla = (punto: THREE.Vector3, progreso: number) =>
	punto.clone().project(camara(progreso))

// --- Las marcas, como las calcula la escena ---------------------------------
const altos = GUION.map((s) => s.alto ?? 1)
const recorrido = altos.reduce((a, b) => a + b, 0) - 1
const centros: number[] = []
let acumulado = 0
for (const alto of altos) {
	centros.push(Math.min(1, Math.max(0, (acumulado + alto / 2 - 0.5) / recorrido)))
	acumulado += alto
}
const marcas = calcularMarcas(
	centros,
	GUION.map((s) => s.acto),
	recorrido,
)

const I_ENCUENTRO = GUION.findIndex((s) => s.acto === ACTOS.encuentro)
const I_RESOLUCION = GUION.findIndex((s) => s.acto === ACTOS.resolucion)

console.log("\nPuesta en escena · la luz de cada sección en su momento\n")
console.log(
	["sección", "progreso", "pantalla x", "pantalla y", "lado texto"]
		.map((s) => s.padStart(13))
		.join(""),
)

/** Dónde acaba la luz de cada sección, y en qué progreso se la mira. */
const momento = (i: number) => marcas.anclas[Math.min(i, I_ENCUENTRO)]?.[0] ?? i / GUION.length

const luces = GUION.slice(0, I_RESOLUCION + 1).map((seccion, i) => {
	const progreso = momento(i)
	return {
		seccion,
		progreso,
		mundo: aMundo(aPerfil(aRelativo(seccion.luz), PERFIL), progreso, undefined, PERFIL),
	}
})

for (const { seccion, progreso, mundo } of luces) {
	const v = enPantalla(mundo, progreso)
	console.log(
		[seccion.id, r(progreso), r(v.x), r(v.y), seccion.lado]
			.map((s) => String(s).padStart(13))
			.join(""),
	)
}
console.log()

// --- Lo que tiene que cumplirse ---------------------------------------------
//
// **Que la luz se vea, en el momento en que su sección se está leyendo.** Es la
// condición que se rompió al mover la cámara: los puntos estaban escritos en
// coordenadas del mundo y la cámara se fue de allí.
const invisibles = luces.filter(({ mundo, progreso }) => {
	const v = enPantalla(mundo, progreso)
	return Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95 || v.z > 1
})
exigir(
	invisibles.length === 0,
	`la luz de cada sección está en cuadro cuando le toca${invisibles.length ? ` (se salen: ${invisibles.map((l) => l.seccion.id).join(", ")})` : ""}`,
)

// **Y del lado contrario a su texto.** No es estética: el halo suma luz sobre lo
// que haya debajo, y medido sobre este fondo el texto secundario aguanta muy
// poco antes de bajar del 4.5:1 de WCAG AA. O la esfera no pisa el texto, o el
// texto deja de cumplir. Con la cámara fija bastaba mirar la X del mundo; ahora
// «el lado» es el lado **de la pantalla**, que es lo que siempre quiso decir.
const invaden = luces.filter(({ seccion, mundo, progreso }) => {
	const x = enPantalla(mundo, progreso).x
	return seccion.lado === "izquierda" ? x < 0.1 : x > -0.1
})
exigir(
	invaden.length === 0,
	`ninguna luz cae del lado de su texto${invaden.length ? ` (invaden: ${invaden.map((l) => l.seccion.id).join(", ")})` : ""}`,
)

// --- Las dos figuras --------------------------------------------------------
//
// Se plantan en el pecho que declara su sección, restando la altura del pecho en
// vertical del mundo: por mucho que la cámara se incline, una persona sigue de
// pie.
const pies = (figura: Figura, porOmision: number) => {
	const progreso = figura.momento ?? porOmision
	const pecho = aMundo(figura.sitio, progreso, undefined, PERFIL)
	return { progreso, pecho, punto: pecho.clone().setY(pecho.y - PECHO) }
}

const A = pies(FIGURA_A[PERFIL], momento(0))
const B = pies(FIGURA_B[PERFIL], momento(I_ENCUENTRO))

const caja = (pies: THREE.Vector3) =>
	new THREE.Box3(
		new THREE.Vector3(pies.x - 0.5, pies.y, pies.z - 0.4),
		new THREE.Vector3(pies.x + 0.5, pies.y + 1.72, pies.z + 0.4),
	)

const piramide = (progreso: number) => {
	const c = camara(progreso)
	return new THREE.Frustum().setFromProjectionMatrix(
		new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse),
	)
}

for (const [nombre, f] of [
	["A", A],
	["B", B],
] as const) {
	console.log(
		`  figura ${nombre}: pies en ${f.punto
			.toArray()
			.map((n) => r(n))
			.join(
				", ",
			)} · a ${r(f.pecho.distanceTo(new THREE.Vector3(...encuadre(f.progreso, PERFIL).posicion)))} m de la cámara`,
	)
}
console.log()

exigir(piramide(A.progreso).intersectsBox(caja(A.punto)), "la figura A está en cuadro en el hero")
exigir(
	piramide(B.progreso).intersectsBox(caja(B.punto)),
	"la figura B está en cuadro cuando aparece",
)
// Y sigue estándolo al final, que es cuando se endereza: es el desenlace, y el
// scroll termina ahí.
exigir(piramide(1).intersectsBox(caja(B.punto)), "y sigue en cuadro al terminar el scroll")

// --- Que no se les cruce el ADN por delante ---------------------------------
//
// **Estar en cuadro no es estar a la vista.** Una hebra de la hélice puede
// quedarse justo entre el objetivo y la persona: la figura está donde debe, y no
// se ve. Eso no lo dice ninguna medida de encuadre; se ve en la pantalla, o se
// lanza un rayo.
//
// ---
//
// **Esto miraba un solo instante, y ese era el hueco.** Lanzaba un rayo desde
// donde está la cámara en el momento de cada figura, y con eso daba el visto
// bueno. Pero la figura se queda plantada en el mundo mientras **la cámara sigue
// bajando y girando**: la línea de visión cambia durante todo el resto del
// scroll, y una hebra que no estorbaba en el momento de la foto puede cruzarse
// diez segundos después. Es exactamente lo que pasaba al final del recorrido en
// pantalla vertical, y esta comprobación decía que todo estaba bien.
//
// Ahora se recorre el trayecto entero, y en cada parada:
//
// 1. **Se mira si la figura está en cuadro.** Si no lo está, que haya una hebra
//    en medio da igual: no hay nada que tapar. Comprobarlo igualmente llenaría la
//    salida de falsos positivos en los tramos donde la persona ni aparece.
// 2. **Se lanzan tres rayos, no uno.** Al pecho, a la cabeza y a los pies. Un
//    único rayo al pecho es una sonda muy fina: una hebra puede cruzar por la
//    cara y pasar de largo por el centro del torso sin que nadie se entere.
const escenografia = OBJETOS.filter((o) => o.fondo)
// Con `MeshoptDecoder`, igual que `modelos.ts`: los GLB de `optimizar_props.sh`
// traen los búferes comprimidos y sin él no abren.
const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

/** Paradas del recorrido. Suficientes para que no se cuele una hebra entre dos. */
const PARADAS_DE_VISION = 25

/** A qué alturas del cuerpo se apunta, respecto del pecho. */
const ALTURAS: [string, number][] = [
	["la cabeza", 0.5],
	["el pecho", 0],
	["los pies", -PECHO],
]

for (const objeto of escenografia) {
	const gltf = await cargador.parseAsync(
		sinTexturas(readFileSync(`public/modelos/${objeto.archivo}.glb`)),
		"",
	)
	const pieza = gltf.scene
	const cajaModelo = new THREE.Box3().setFromObject(pieza)
	const medidas = cajaModelo.getSize(new THREE.Vector3())
	const centro = cajaModelo.getCenter(new THREE.Vector3())
	const escala = objeto.tamano / Math.max(medidas.x, medidas.y, medidas.z, 1e-6)
	pieza.scale.setScalar(escala)
	pieza.position.copy(centro).multiplyScalar(-escala)

	const grupo = new THREE.Group()
	grupo.position.set(...objeto.posicion)
	grupo.add(pieza)
	grupo.updateMatrixWorld(true)

	const rayo = new THREE.Raycaster()

	for (const [nombre, f] of [
		["A", A],
		["B", B],
	] as const) {
		const cuerpo = caja(f.punto)
		let enCuadro = 0
		let tapados = 0
		const primero: string[] = []

		for (let i = 0; i < PARADAS_DE_VISION; i++) {
			const p = i / (PARADAS_DE_VISION - 1)
			if (!piramide(p).intersectsBox(cuerpo)) continue
			enCuadro++

			for (const [parte, alto] of ALTURAS) {
				const destino = f.pecho.clone()
				destino.y += alto
				const ojo = new THREE.Vector3(...encuadre(p, PERFIL).posicion)
				const hacia = destino.clone().sub(ojo)
				const distancia = hacia.length()
				rayo.set(ojo, hacia.normalize())
				rayo.far = distancia
				const choques = rayo.intersectObject(grupo, true)
				if (choques.length === 0) continue
				tapados++
				if (primero.length < 3) {
					primero.push(`p=${p.toFixed(2)} por ${parte} (a ${r(choques[0].distance)} m)`)
				}
			}
		}

		console.log(
			`  ${objeto.archivo} → figura ${nombre}: en cuadro en ${enCuadro} de ${PARADAS_DE_VISION} paradas` +
				(tapados
					? `, se cruza en ${tapados} de ${enCuadro * ALTURAS.length} visuales — ${primero.join("; ")}`
					: ", despejado en todas"),
		)
		exigir(
			tapados === 0,
			`el ${objeto.archivo} no se cruza ante la figura ${nombre} en ningún punto del recorrido`,
		)
	}
}

// --- El viaje de la esfera --------------------------------------------------
//
// Sale del pecho de A y llega al pecho de B. Se comprueba contra la curva real,
// construida como la construye la escena.
// La curva, como la arma la escena: los pechos de las figuras sustituyen al
// punto de su sección, para que la esfera salga y llegue exactamente a ellos.
const puntos = luces.map((l) => l.mundo)
puntos[0] = A.pecho
for (let i = I_ENCUENTRO; i < puntos.length; i++) puntos[i] = B.pecho

const curva = new THREE.CatmullRomCurve3(puntos, false, "centripetal")

const salida = curva.getPoint(0)
const llegada = curva.getPoint(1)
const pechoA = A.pecho
const pechoB = B.pecho

console.log(`  la esfera sale a ${r(salida.distanceTo(pechoA))} m del pecho de A`)
console.log(
	`  y llega a ${r(llegada.distanceTo(luces[luces.length - 1].mundo))} m del último punto`,
)
console.log(`  el pecho de B queda a ${r(llegada.distanceTo(pechoB))} m de donde termina`)
console.log()

exigir(salida.distanceTo(pechoA) < 0.01, "la esfera sale del pecho de la figura A")
exigir(llegada.distanceTo(pechoB) < 0.15, "y termina en el pecho de la figura B")

// **Que no se meta dentro de la cámara por el camino.** La curva pasa por delante
// del objetivo en cada zigzag; si en algún tramo se acerca demasiado, el halo
// llena la pantalla de golpe.
let masCerca = Infinity
let dondeCerca = 0
for (let i = 0; i <= 200; i++) {
	const t = i / 200
	const punto = curva.getPoint(t)
	// El progreso en que la esfera está en ese punto de la curva no es t, pero a
	// efectos de distancia basta con recorrer los dos a la par.
	const d = punto.distanceTo(new THREE.Vector3(...encuadre(t, PERFIL).posicion))
	if (d < masCerca) {
		masCerca = d
		dondeCerca = t
	}
}
console.log(`  lo más cerca que le pasa a la cámara: ${r(masCerca)} m, en t = ${r(dondeCerca)}`)
exigir(masCerca > 0.8, "la esfera nunca se pega al objetivo")

console.log(fallos === 0 ? "\nSin fallos.\n" : `\n${fallos} comprobación(es) fallida(s).\n`)
process.exit(fallos === 0 ? 0 : 1)
