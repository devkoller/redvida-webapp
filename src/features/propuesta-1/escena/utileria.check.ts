/**
 * Comprobación de la utilería · RV-L2.7
 *
 * Carga cada modelo de `objetos.ts`, le aplica **la misma matemática que
 * `Utileria.tsx`** —escalar por la dimensión mayor, centrar, girar, colocar— y
 * dice dónde acaba cada cosa: cuánto mide de verdad, si entra en cuadro, si se
 * mete en el suelo y si pisa a alguna de las dos figuras.
 *
 * Colocar objetos a ojo es probar y recargar. Esto responde en dos segundos las
 * preguntas que uno se hace mirando la pantalla —"¿por qué no lo veo?"— y que
 * mirando no se contestan: un objeto invisible puede estar detrás de la cámara,
 * dentro de otro, o medir dos milímetros.
 *
 *     npx tsx src/features/propuesta-1/escena/utileria.check.ts
 */

import { existsSync, readFileSync } from "node:fs"
import * as THREE from "three"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import { aMundo, aRelativo, encuadre, fovPara, type Encuadre, type Perfil } from "./camara"
import { sinTexturas } from "./glb-sin-texturas"
import { OBJETOS } from "./objetos"

/**
 * Qué pantalla se comprueba · RV-L2.13
 *
 *     npx tsx src/features/propuesta-1/escena/utileria.check.ts        # apaisada
 *     npx tsx src/features/propuesta-1/escena/utileria.check.ts alto   # vertical
 *
 * Las dos hay que pasarlas. La vertical usa otra órbita y otro objetivo, así que
 * un objeto que entra en cuadro en apaisado puede salirse ahí — y al revés.
 */
const PERFIL: Perfil = process.argv[2] === "alto" ? "alto" : "ancho"
const FOV = fovPara(PERFIL === "alto" ? 9 / 19.5 : 16 / 9)
const ASPECTO = PERFIL === "alto" ? 9 / 19.5 : 16 / 9

/**
 * **El recorrido entero, no solo los extremos.**
 *
 * Con una cámara fija bastaba un encuadre. Con una cámara que baja girando, el
 * peor momento suele estar **en medio**: un objeto entra perfecto al principio y
 * al final, y a mitad de página se sale por un lado o una hebra de la hélice
 * pasa rozando el objetivo. Nueve paradas cubren el trayecto de sobra, y cuestan
 * milisegundos.
 */
const PARADAS = 9
const ENCUADRES: [string, Encuadre][] = Array.from({ length: PARADAS }, (_, i) => {
	const p = i / (PARADAS - 1)
	return [`p=${p.toFixed(2)}`, encuadre(p, PERFIL)]
})
const [, PRIMERO] = ENCUADRES[0]
const [, ULTIMO] = ENCUADRES[ENCUADRES.length - 1]

const NIEBLA = { cerca: 9, lejos: 22 }
/** Dónde se planta cada figura, para avisar de solapes. */
const FIGURAS = [
	{ nombre: "figura A", x: -1.55 },
	{ nombre: "figura B", x: 1.55 },
]

const GRADOS = Math.PI / 180
let fallos = 0
const r = (n: number) => n.toFixed(2).padStart(6)

function exigir(condicion: boolean, descripcion: string) {
	console.log(`  ${condicion ? "ok  " : "FALLA"}  ${descripcion}`)
	if (!condicion) fallos++
}

// Con `MeshoptDecoder`, igual que `modelos.ts`: los GLB de `optimizar_props.sh`
// traen los búferes comprimidos y sin él no abren.
const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

/**
 * La pirámide de visión de la cámara de la escena.
 *
 * `ASPECTO` es una pantalla apaisada corriente. En una más estrecha el encuadre
 * recorta por los lados, así que lo que aquí pasa por los pelos puede salirse en
 * móvil — motivo de más para no dejar nada pegado al borde.
 */

function vista(encuadre: Encuadre) {
	const c = new THREE.PerspectiveCamera(FOV, ASPECTO, 0.1, 40)
	c.position.set(...encuadre.posicion)
	c.lookAt(new THREE.Vector3(...encuadre.mira))
	c.updateMatrixWorld(true)
	c.updateProjectionMatrix()
	return c
}

function piramide(encuadre: Encuadre) {
	const c = vista(encuadre)
	return new THREE.Frustum().setFromProjectionMatrix(
		new THREE.Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse),
	)
}

/** Distancia del punto más cercano de la malla a un ojo, en metros. */
function distanciaAGeometria(raiz: THREE.Object3D, ojo: THREE.Vector3) {
	let minimo = Infinity
	const v = new THREE.Vector3()
	raiz.updateMatrixWorld(true)
	raiz.traverse((nodo) => {
		const malla = nodo as THREE.Mesh
		if (!malla.isMesh) return
		const posicion = malla.geometry.getAttribute("position")
		for (let i = 0; i < posicion.count; i++) {
			v.fromBufferAttribute(posicion, i).applyMatrix4(malla.matrixWorld)
			const d = v.distanceTo(ojo)
			if (d < minimo) minimo = d
		}
	})
	return minimo
}

/** Cuánto se mueve un punto en pantalla entre los dos extremos, en porcentaje. */
function paralaje(punto: THREE.Vector3) {
	const a = punto.clone().project(vista(PRIMERO))
	const b = punto.clone().project(vista(ULTIMO))
	return Math.hypot(b.x - a.x, b.y - a.y) * 50
}

console.log(`\nUtilería · ${OBJETOS.length} objetos\n`)
console.log(
	["objeto", "ancho", "alto", "fondo", "suelo", "cámara", "niebla", "paralaje"]
		.map((s) => s.padStart(9))
		.join(""),
)

for (const objeto of OBJETOS) {
	const ruta = `public/modelos/${objeto.archivo}.glb`
	if (!existsSync(ruta)) {
		console.log(`  ${objeto.archivo}: no existe ${ruta}`)
		fallos++
		continue
	}

	const gltf = await cargador.parseAsync(sinTexturas(readFileSync(ruta)), "")
	const pieza = gltf.scene

	// --- lo mismo que hace `Utileria.tsx` ------------------------------------
	const caja = new THREE.Box3().setFromObject(pieza)
	const medidas = caja.getSize(new THREE.Vector3())
	const centro = caja.getCenter(new THREE.Vector3())
	const escala = objeto.tamano / Math.max(medidas.x, medidas.y, medidas.z, 1e-6)
	pieza.scale.setScalar(escala)
	pieza.position.copy(centro).multiplyScalar(-escala)

	const grupo = new THREE.Group()
	const [rx, ry, rz] = objeto.rotacion ?? [0, 0, 0]
	grupo.rotation.set(rx * GRADOS, ry * GRADOS, rz * GRADOS)
	grupo.position.copy(
		objeto.anclaje === undefined
			? new THREE.Vector3(...objeto.posicion)
			: aMundo(aRelativo(objeto.posicion), objeto.anclaje, undefined, PERFIL),
	)
	grupo.add(pieza)
	grupo.updateMatrixWorld(true)

	// --- dónde acaba ---------------------------------------------------------
	const final = new THREE.Box3().setFromObject(grupo)
	const tam = final.getSize(new THREE.Vector3())
	const medio = final.getCenter(new THREE.Vector3())
	const distancia = medio.distanceTo(new THREE.Vector3(...PRIMERO.posicion))

	// ¿Entra en cuadro? Se monta la cámara de verdad —los mismos fov, near y far
	// que `Lienzo.tsx`— y se le pregunta si la caja del objeto cae dentro de su
	// pirámide de visión. Hacerlo a mano con ángulos es lo que uno cree que es
	// fácil hasta que un objeto pasa la cuenta y no se ve.
	// **Con la cámara en movimiento, «siempre en cuadro» dejó de ser la regla.**
	// Un objeto entra y sale del encuadre según avanza el recorrido, y eso no es un
	// fallo: es lo que hace una cámara que se mueve. Lo que sí es un fallo es que
	// no aparezca **en ningún momento** — sería peso descargado para nada.
	const visible = ENCUADRES.filter(([, e]) => piramide(e).intersectsBox(final)).map(([n]) => n)

	const niebla = Math.min(
		1,
		Math.max(0, (distancia - NIEBLA.cerca) / (NIEBLA.lejos - NIEBLA.cerca)),
	)

	console.log(
		[
			objeto.archivo,
			r(tam.x),
			r(tam.y),
			r(tam.z),
			r(final.min.y),
			r(distancia),
			`${Math.round(niebla * 100)}%`,
			`${paralaje(medio).toFixed(1)}%`,
		]
			.map((s) => String(s).padStart(9))
			.join(""),
	)

	// --- lo que tiene que cumplirse ------------------------------------------
	//
	// **Que se vea.** Detrás de la cámara o fuera del cono no se dibuja, y desde
	// el navegador eso se investiga a ciegas: no hay error, simplemente no está.
	console.log(
		`  ${objeto.archivo}: en cuadro en ${visible.length} de ${ENCUADRES.length} paradas` +
			(visible.length ? ` (${visible[0]} → ${visible[visible.length - 1]})` : ""),
	)
	exigir(visible.length > 0, `${objeto.archivo}: se ve en algún momento del recorrido`)

	// La escenografía juega con otras reglas: puede pasar por detrás del texto,
	// hundirse bajo el suelo y envolver a las figuras. Lo único que se le sigue
	// exigiendo, además de verse, es que **no atraviese la cámara**: la geometría
	// que queda por detrás del plano cercano se corta en seco, y en pantalla eso
	// es una tajada recta que aparece y desaparece al hacer scroll.
	if (objeto.fondo) {
		// **Se mide contra los vértices, no contra la caja.** Una hélice es sobre
		// todo aire: su caja envuelve a la cámara mucho antes de que ninguna parte
		// del modelo se le acerque, y con la caja cualquier escenografía grande daría
		// un falso positivo.
		let minimo = Infinity
		let donde = ""
		for (const [nombre, e] of ENCUADRES) {
			const d = distanciaAGeometria(grupo, new THREE.Vector3(...e.posicion))
			if (d < minimo) {
				minimo = d
				donde = nombre
			}
		}
		console.log(
			`  ${objeto.archivo}: lo más cerca que le pasa a la cámara ${r(minimo)} m, en ${donde}`,
		)
		// Por debajo de 10 cm la geometría cruza el plano cercano y se corta en
		// seco; por debajo de medio metro no se corta, pero llena el encuadre y
		// tapa lo que haya detrás. Lo primero es un fallo, lo segundo un aviso.
		exigir(minimo > 0.1, `${objeto.archivo}: no atraviesa la cámara en ningún punto`)
		if (minimo < 0.5)
			console.log("         ⚠ a esa distancia barre el encuadre y tapa a las figuras")
		continue
	}

	// **Que no esté enterrado.** Las figuras pisan y = 0; un objeto por debajo se
	// hunde en un suelo que no existe y se lee como un recorte a media altura.
	exigir(final.min.y > -0.05, `${objeto.archivo}: no se hunde por debajo del suelo`)

	// **Que la niebla no se lo coma.** Empieza a los 9 y a los 22 borra del todo.
	exigir(niebla < 0.35, `${objeto.archivo}: la niebla no se lo lleva`)

	// **Que no caiga sobre la columna de texto.** El titular y los párrafos viven
	// en la mitad izquierda del encuadre, y un objeto ahí se lee como una mancha
	// encima de las letras — pasó con el ADN, que atravesaba el titular del hero.
	// Se proyecta el centro del objeto a coordenadas de pantalla: 0 es el centro,
	// −1 el borde izquierdo.
	// Solo se le exige mientras se le ve: fuera de cuadro da igual dónde caiga.
	const invade = ENCUADRES.filter(
		([n, e]) => visible.includes(n) && medio.clone().project(vista(e)).x <= 0.05,
	).map(([n]) => n)
	exigir(
		invade.length === 0,
		`${objeto.archivo}: nunca cae sobre la columna de texto${invade.length ? ` (invade en ${invade.join(", ")})` : ""}`,
	)

	// **Que no se meta dentro de una figura.** Cada persona ocupa un cilindro de
	// unos 55 cm de radio; un objeto dentro atraviesa la malla y se ve fatal.
	for (const figura of FIGURAS) {
		const separacion = Math.hypot(medio.x - figura.x, medio.z)
		exigir(separacion > 0.55, `${objeto.archivo}: no se mete dentro de la ${figura.nombre}`)
	}
}

// **Las figuras ya no se comprueban aquí.** Vivían en puntos fijos del mundo y
// se podían medir con dos constantes; desde que la escena las coloca respecto de
// la cámara, quién comprueba eso es `puesta.check.ts`, que sabe en qué momento
// del scroll le toca a cada una. Dejar aquí la versión vieja solo servía para
// fallar por una razón falsa.

console.log(fallos === 0 ? "\nSin fallos.\n" : `\n${fallos} comprobación(es) fallida(s).\n`)
process.exit(fallos === 0 ? 0 : 1)
