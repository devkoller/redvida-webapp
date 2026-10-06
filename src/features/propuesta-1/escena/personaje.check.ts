/**
 * Comprobación del modelo y sus dos poses · RV-L2.5
 *
 * Carga `personaje.glb` y recorre su clip **con el mismo mecanismo que usa
 * `Personaje.tsx`** —un `AnimationMixer` al que se le pone el tiempo a mano— y
 * mide la silueta que sale en cada extremo.
 *
 * Es la única forma de saber si una pose dice lo que se quiere que diga sin
 * mirarla: "agotado" no es una lista de ángulos, es **una mano apoyada en la
 * rodilla**, una cabeza más baja y una figura más corta. Aquí eso se mide en
 * centímetros, y es lo que protege de reexportar desde Blender con un retoque
 * que rompa una de las dos poses sin que nadie se entere.
 *
 *     npx tsx src/features/propuesta-1/escena/personaje.check.ts
 */

import { existsSync, readFileSync } from "node:fs"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import { sinTexturas } from "./glb-sin-texturas"

const RUTA = "public/modelos/personaje.glb"

let fallos = 0
function exigir(condicion: boolean, descripcion: string) {
	console.log(`  ${condicion ? "ok  " : "FALLA"}  ${descripcion}`)
	if (!condicion) fallos++
}

const r = (n: number) => n.toFixed(3).padStart(7)

if (!existsSync(RUTA)) {
	console.error(`No está ${RUTA}. Se genera con blender/riggear_personaje.py`)
	process.exit(1)
}

const gltf = await new GLTFLoader().parseAsync(sinTexturas(readFileSync(RUTA)), "")
const raiz = gltf.scene
const clip = gltf.animations[0]

console.log(`\nModelo · ${RUTA}\n`)
console.log(`  clip "${clip.name}" · ${clip.duration.toFixed(3)} s · ${clip.tracks.length} pistas`)

const huesos = new Map<string, THREE.Bone>()
raiz.traverse((n) => {
	if ((n as THREE.Bone).isBone) huesos.set(n.name, n as THREE.Bone)
})
console.log(`  ${huesos.size} huesos\n`)

console.log("Comprobaciones\n")

exigir(clip !== undefined, "el archivo trae el clip de transformación")
// Un clip de un segundo es lo que deja que `Personaje.tsx` haga `tiempo = ánimo`
// sin conversiones. Si alguien reexporta con otros fps, se entera aquí.
exigir(Math.abs(clip.duration - 1) < 1e-6, "que dura exactamente un segundo")

const necesarios = ["cadera", "cabeza", "mano_izq", "pierna_izq", "pie_izq", "columna_alta"]
exigir(
	necesarios.every((n) => huesos.has(n)),
	`y el esqueleto que espera la escena (${necesarios.join(", ")})`,
)

/** Evalúa el clip en `tiempo` y devuelve las posiciones de mundo que interesan. */
const mezclador = new THREE.AnimationMixer(raiz)
mezclador.clipAction(clip).play()

/** El tope evita el rebobinado del bucle en el segundo exacto. Ver `Personaje.tsx`. */
const CASI = 1 - 1e-4

function medir(tiempo: number) {
	mezclador.setTime(Math.min(tiempo, CASI) * clip.duration)
	raiz.updateMatrixWorld(true)
	const punto = (nombre: string) => huesos.get(nombre)!.getWorldPosition(new THREE.Vector3())
	const cabeza = punto("cabeza")
	// Eje Y del hueso = su dirección: en el pie va del tobillo a los dedos.
	const dedos = new THREE.Vector3()
	huesos.get("pie_izq")!.matrixWorld.extractBasis(new THREE.Vector3(), dedos, new THREE.Vector3())
	const muslo = punto("muslo_izq")
	const rodilla = punto("pierna_izq")
	const tobillo = punto("pie_izq")
	return {
		dedos: dedos.normalize(),
		// Cuánto se sale la rodilla de la recta cadera→tobillo. Cero = pierna recta.
		flexion: muslo.distanceTo(rodilla) + rodilla.distanceTo(tobillo) - muslo.distanceTo(tobillo),
		// La coronilla está media cabeza por encima de la base del cráneo.
		coronilla: cabeza.y + 0.23,
		cabeza,
		cadera: punto("cadera"),
		mano: punto("mano_izq"),
		rodilla,
		tobillo,
	}
}

const agotado = medir(0)
const erguido = medir(1)

// Y que el rebobinado del bucle sea de verdad un peligro y no una manía: pedir el
// segundo exacto tiene que devolver otra cosa que pedir una diezmilésima menos.
mezclador.setTime(clip.duration)
raiz.updateMatrixWorld(true)
const enElBorde = huesos.get("cabeza")!.getWorldPosition(new THREE.Vector3()).y

console.log()
console.log(
	["", "coronilla", "cadera.y", "mano→rodilla", "pies.y"].map((s) => s.padStart(14)).join(""),
)
for (const [nombre, m] of [
	["agotado", agotado],
	["erguido", erguido],
] as const) {
	console.log(
		[nombre, r(m.coronilla), r(m.cadera.y), r(m.mano.distanceTo(m.rodilla)), r(m.tobillo.y)]
			.map((s) => String(s).padStart(14))
			.join(""),
	)
}
console.log()

// --- Lo que hace legible el agotamiento -------------------------------------
//
// La mano **sobre** la rodilla, no cerca de ella: el radio del muslo a esa
// altura es de unos 8 cm, así que por debajo de 15 la mano está apoyada y por
// encima de 25 está colgando y la pose se lee como tristeza, no como cansancio.
exigir(agotado.mano.distanceTo(agotado.rodilla) < 0.15, "agotado: la mano se apoya en la rodilla")
exigir(erguido.mano.distanceTo(erguido.rodilla) > 0.35, "erguido: y ahí ya no está")

// La figura entera se hunde. Medido: la coronilla baja 33 cm, que es lo que
// antes se fingía con un centímetro de desplazamiento porque sin cinemática
// inversa no había forma de bajar la cadera dejando los pies plantados.
const hundimiento = erguido.coronilla - agotado.coronilla
console.log(`  la coronilla baja ${r(hundimiento)} m al agotarse`)
exigir(hundimiento > 0.2, "agotado: la figura se hunde de verdad")
exigir(erguido.cadera.y - agotado.cadera.y > 0.15, "y la cadera baja con ella")

// **Los pies no se despegan del suelo.** Es la condición que hacía imposible el
// hundimiento antiguo, y la que resuelve la IK del script de Blender.
exigir(Math.abs(agotado.tobillo.y - erguido.tobillo.y) < 0.03, "y los pies siguen plantados")

// **Los dedos de los pies miran adelante.** Suena a perogrullada y no lo es: el
// archivo de origen viene con los pies hacia +Y de Blender y todo lo que se posa
// mira al contrario, así que la primera versión salió con la figura bien puesta y
// los pies del revés. Se vio en pantalla, no aquí — ahora también aquí.
//
// El personaje mira hacia +Z, así que la dirección del pie tiene que tener +Z.
// Se mira solo en planta: el hueso del pie baja del tobillo a la punta, así que
// la mayor parte de su dirección es vertical y diría poco sobre hacia dónde mira.
const enPlanta = (v: THREE.Vector3) => v.z / Math.hypot(v.x, v.z)
console.log(
	`  dedos del pie · agotado ${r(enPlanta(agotado.dedos))} · erguido ${r(enPlanta(erguido.dedos))}`,
)
exigir(enPlanta(agotado.dedos) > 0.8, "los dedos de los pies apuntan hacia adelante")
exigir(enPlanta(erguido.dedos) > 0.8, "en las dos poses")

// --- Lo que hace legible la victoria ----------------------------------------
//
// **Cuánto mira hacia arriba es decisión de dirección, no de este archivo.** La
// primera versión echaba la cabeza 45° atrás para que se leyera "mirando al
// cielo"; la aprobada la deja casi al frente. Lo que se protege aquí es lo que
// no puede pasar en ninguna variante: que la cabeza **cuelgue hacia adelante**,
// que es la postura de la otra pose y contaría lo contrario.
//
// El personaje mira hacia +Z, así que la cabeza por delante de la cadera es +Z.
const adelanta = (m: { cabeza: THREE.Vector3; cadera: THREE.Vector3 }) => m.cabeza.z - m.cadera.z
console.log(
	`  la cabeza adelanta · erguido ${r(adelanta(erguido))} · agotado ${r(adelanta(agotado))}`,
)
exigir(adelanta(erguido) < 0.05, "erguido: la cabeza no cuelga hacia adelante")
exigir(adelanta(agotado) > 0.15, "agotado: y ahí sí, que es media pose")
exigir(erguido.coronilla > 1.6, "y la figura se estira casi a su altura completa")

// **Las piernas, rectas.** Es una figura plantada, y una rodilla doblada la
// convierte en una figura a punto de sentarse. Cero es la recta perfecta; dos
// centímetros ya se ven de frente.
console.log(`  flexión de rodilla · erguido ${r(erguido.flexion)} · agotado ${r(agotado.flexion)}`)
exigir(erguido.flexion < 0.01, "erguido: las piernas están rectas")
exigir(agotado.flexion > 0.1, "agotado: y las rodillas bien dobladas")

// Las manos en la cintura: cerca de la cadera y por encima de ella.
const manoCadera = erguido.mano.distanceTo(erguido.cadera)
console.log(`  la mano queda a ${r(manoCadera)} m de la cadera`)
exigir(manoCadera < 0.35, "erguido: las manos se apoyan en la cintura")

// --- El recorrido intermedio ------------------------------------------------
//
// La pose de en medio tiene que estar **entre** las dos, no en otro sitio: una
// slerp por hueso puede tomar el camino largo si dos cuaterniones quedan en
// hemisferios opuestos, y eso se ve como un brazo dando la vuelta entera.
const medio = medir(0.5)
const entre = (x: number, a: number, b: number) =>
	x > Math.min(a, b) - 0.02 && x < Math.max(a, b) + 0.02
exigir(
	entre(medio.coronilla, agotado.coronilla, erguido.coronilla) &&
		entre(medio.mano.y, agotado.mano.y, erguido.mano.y) &&
		entre(medio.cadera.y, agotado.cadera.y, erguido.cadera.y),
	"a mitad de clip la figura está entre las dos poses, no dando la vuelta",
)

exigir(
	Math.abs(enElBorde - erguido.cabeza.y) > 0.01,
	"el clip rebobina en el segundo exacto (por eso `Personaje.tsx` se queda justo antes)",
)

console.log(fallos === 0 ? "\nSin fallos.\n" : `\n${fallos} comprobación(es) fallida(s).\n`)
process.exit(fallos === 0 ? 0 : 1)
