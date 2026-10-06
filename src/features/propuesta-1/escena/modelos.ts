import * as THREE from "three"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { clone as clonarConEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js"

import { OBJETOS } from "./objetos"

/**
 * Carga del modelo · RV-L2.2c · RV-L2.5
 *
 * Cargador propio en vez de `useGLTF` de drei: el *chunk* del lienzo ya roza los
 * 250 kB gz solo con three, y drei arrastra su caché y `DRACOLoader` aunque no se
 * usen. Aquí basta `GLTFLoader` y una promesa.
 *
 * **`MeshoptDecoder` sí se trae, y a conciencia.** Es la única pieza de ese lote
 * que se paga, unos 25 kB, y se paga porque se usa: `optimizar_props.sh`
 * comprime los búferes con `meshopt`, y sin decodificador esos archivos no
 * abren. La cuenta sale sola — el ADN suavizado pasa de 3.4 MB a 991 kB. Los
 * modelos sin comprimir, como `personaje.glb`, siguen cargando igual: la
 * extensión solo se aplica si el archivo la declara.
 *
 * **Un solo archivo para las dos figuras, y para las dos poses.**
 * `personaje.glb` trae la malla con esqueleto humanoide de 20 huesos y un clip
 * de **dos fotogramas** —agotado en t = 0, victoria en t = 1— que la escena
 * recorre a mano según el scroll. Se acabaron los dos modelos que se cruzaban
 * bajo un fogonazo: la transformación vuelve a ser un movimiento.
 *
 * El archivo se construye con `blender/riggear_personaje.py`, que parte de
 * `personaje_final.glb` —sin esqueleto, en pose de estrella, 350 000 triángulos
 * y 12 MB— y deja 35 000 triángulos y 1 MB. Ahí está documentado todo lo que
 * tiene que ver con el rigado, el pesado y las dos poses; aquí no se decide
 * nada de eso, solo se carga.
 */

const RUTA = "/modelos/personaje.glb"

/** Altura de la figura, en metros. La misma que fija el script de Blender. */
export const ALTURA = 1.72

export interface Modelo {
	/** Raíz normalizada, lista para clonar. */
	objeto: THREE.Object3D
	/** La transformación completa: t = 0 agotado, t = 1 erguido. */
	clip: THREE.AnimationClip
}

const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
let promesa: Promise<Modelo> | null = null
let cargado = false
let alProgreso: ((valor: number) => void) | null = null

/**
 * Carga cualquier GLB de `public/modelos/`, una sola vez por archivo.
 *
 * La caché es lo que permite que un mismo objeto aparezca varias veces en la
 * escena sin descargarlo varias veces — y que quien lo use no tenga que
 * preocuparse de si ya estaba pedido. Devuelve **el original**: quien lo ponga
 * en escena tiene que clonarlo, porque un `Object3D` solo puede colgar de un
 * padre y el segundo uso desengancharía al primero.
 */
const cacheGLB = new Map<string, Promise<THREE.Object3D>>()

/**
 * Avance de cada archivo, por ruta.
 *
 * **Existe porque la pantalla de carga estaba midiendo la mitad del trabajo.**
 * Solo seguía a `personaje.glb` (1.0 MB) e ignoraba la utilería, y la hélice
 * pesa otros 991 kB. El anillo llegaba al 100 %, se quitaba, y la escena
 * aparecía vacía unos segundos hasta que terminaba de bajar lo que nadie estaba
 * contando. No era un fallo de la transición: era que el 100 % no significaba
 * lo que decía.
 */
const avances = new Map<string, { cargado: number; total: number; listo: boolean }>()

function anotar(ruta: string, cargado: number, total: number, listo = false) {
	avances.set(ruta, { cargado, total, listo })
}

/** Fracción cargada de un archivo, de 0 a 1. */
function fraccion(ruta: string): number {
	const a = avances.get(ruta)
	if (!a) return 0
	if (a.listo) return 1
	return a.total > 0 ? Math.min(1, a.cargado / a.total) : 0
}

export function cargarGLB(ruta: string): Promise<THREE.Object3D> {
	const existente = cacheGLB.get(ruta)
	if (existente) return existente
	const nueva = cargador
		.loadAsync(ruta, (evento) => {
			if (evento.total) anotar(ruta, evento.loaded, evento.total)
		})
		.then((gltf: GLTF) => {
			anotar(ruta, 1, 1, true)
			return gltf.scene
		})
	cacheGLB.set(ruta, nueva)
	return nueva
}

/**
 * Normaliza el modelo: altura fija, centrado en X/Z y con los pies en y = 0.
 *
 * El archivo ya sale así de Blender, de modo que esto no debería mover nada.
 * Se conserva porque es la red que evita recalibrar cámara y posiciones el día
 * que alguien reexporte con otra escala; y porque no cuesta nada.
 *
 * **La caja se mide en reposo**, que es la pose de estrella con la que se
 * exportó el esqueleto: `Box3.setFromObject` de una malla con esqueleto no
 * conoce la pose. Da igual para la altura —la estrella mide lo mismo de alto—,
 * pero conviene saberlo antes de fiarse de esta caja para otra cosa.
 */
function normalizar(raiz: THREE.Object3D): THREE.Object3D {
	const contenedor = new THREE.Group()
	const caja = new THREE.Box3().setFromObject(raiz)
	const tamano = caja.getSize(new THREE.Vector3())
	const centro = caja.getCenter(new THREE.Vector3())

	const escala = ALTURA / (tamano.y || 1)
	raiz.scale.setScalar(escala)
	raiz.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala)

	contenedor.add(raiz)
	return contenedor
}

/**
 * Carga el modelo, opcionalmente informando el avance (0 a 1) por `onProgreso`.
 *
 * El evento de progreso solo llega mientras la descarga está en curso: si el
 * modelo ya se cargó antes —la figura del encuentro reutiliza el mismo
 * archivo—, `onProgreso` recibe directamente `1` en vez de quedarse mudo.
 */
export function cargarModelo(onProgreso?: (valor: number) => void): Promise<Modelo> {
	if (cargado) {
		onProgreso?.(1)
		return promesa!
	}

	alProgreso = onProgreso ?? null
	promesa ??= cargador
		.loadAsync(RUTA, (evento) => {
			if (!evento.total) return
			anotar(RUTA, evento.loaded, evento.total)
			alProgreso?.(evento.loaded / evento.total)
		})
		.then((gltf: GLTF) => {
			cargado = true
			anotar(RUTA, 1, 1, true)
			return { objeto: normalizar(gltf.scene), clip: gltf.animations[0] }
		})
	return promesa
}

/**
 * Copia utilizable del modelo cargado.
 *
 * **`Object3D.clone()` no sirve para una malla con esqueleto.** Copia la
 * jerarquía pero deja el `SkinnedMesh` apuntando al esqueleto del original, así
 * que las dos figuras compartirían huesos: posar una movería a la otra.
 * `SkeletonUtils.clone` duplica los huesos y vuelve a enlazar el skin.
 */
export const clonar = (original: THREE.Object3D): THREE.Object3D => clonarConEsqueleto(original)

/**
 * Todo lo que la escena necesita antes de poder mostrarse.
 *
 * Se deriva de `objetos.ts` en vez de escribirse a mano: añadir una pieza a la
 * utilería la mete sola en la cuenta de la pantalla de carga, que es la única
 * forma de que esto no vuelva a quedarse desfasado.
 */
export function archivosDeEscena(): string[] {
	const rutas = new Set<string>([RUTA])
	for (const objeto of OBJETOS) rutas.add(`/modelos/${objeto.archivo}.glb`)
	return [...rutas]
}

/**
 * Carga **todo** lo que hay que tener antes de enseñar la escena, informando de
 * un avance que sí corresponde con el trabajo pendiente.
 *
 * **El avance se promedia por archivo, no por bytes**, y es a propósito. Sumar
 * bytes exige conocer el tamaño total de todos antes de poder dividir, y esa
 * cifra no existe hasta que cada descarga ha devuelto su cabecera: durante los
 * primeros cuadros el denominador va creciendo y el porcentaje baja solo, que es
 * la peor cosa que puede hacer una barra de progreso. Promediando la fracción de
 * cada archivo, cada uno aporta su parte desde el primer instante y ninguno
 * puede hacer retroceder al conjunto. Con dos archivos de tamaño parecido —1.0
 * MB y 991 kB— la diferencia con el reparto real es de décimas.
 *
 * Los archivos se piden todos a la vez: son peticiones independientes y
 * encadenarlas solo alargaría la espera.
 */
export function precargarEscena(onProgreso?: (valor: number) => void): Promise<void> {
	const rutas = archivosDeEscena()

	const avisar = () => {
		let suma = 0
		for (const ruta of rutas) suma += fraccion(ruta)
		onProgreso?.(suma / rutas.length)
	}

	// El cargador solo avisa cuando llega un trozo; entre trozo y trozo no pasa
	// nada. Este reloj es el que mantiene el anillo moviéndose con suavidad.
	const reloj = setInterval(avisar, 100)

	const peticiones: Promise<unknown>[] = [cargarModelo(avisar)]
	for (const ruta of rutas) {
		if (ruta !== RUTA) peticiones.push(cargarGLB(ruta))
	}

	return Promise.all(peticiones).then(() => {
		clearInterval(reloj)
		onProgreso?.(1)
	})
}
