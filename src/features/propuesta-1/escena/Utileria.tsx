import { useFrame } from "@react-three/fiber"
import { Suspense, use, useMemo, useRef } from "react"
import * as THREE from "three"

import { aMundo, aRelativo } from "./camara"
import { cargarGLB } from "./modelos"
import { OBJETOS, type Objeto } from "./objetos"

/**
 * La utilería de la escena · RV-L2.7
 *
 * Coloca lo que declare `objetos.ts`. Se llama `Utileria` y no `Objetos` por un
 * motivo tonto y real: en macOS el sistema de archivos no distingue mayúsculas,
 * así que `Objetos.tsx` y `objetos.ts` son **el mismo nombre** y TypeScript se
 * niega a importar los dos. Todo lo que decide qué se ve está en ese
 * archivo; aquí solo está el cómo, y es deliberadamente poco: cargar, escalar al
 * tamaño real y ponerlo en su sitio.
 *
 * **Cada objeto suspende por su cuenta.** Con un solo `Suspense` alrededor de
 * los tres, el más pesado retrasaría a los otros dos y aparecerían juntos y
 * tarde. Con uno cada uno, cada cosa entra en cuanto está.
 *
 * **No reciben luz propia ni la piden.** Es la ventaja de haber pasado la escena
 * a luz de entorno (`iluminacion.tsx`): un objeto nuevo queda iluminado igual
 * esté donde esté, sin añadirle un foco ni tocar nada. Este componente no sabe
 * nada de luces, y eso es exactamente lo que se buscaba.
 */

const GRADOS = Math.PI / 180

function Pieza({ objeto }: { objeto: Objeto }) {
	// `use()` suspende hasta que el GLB está cargado. La caché de `cargarGLB` hace
	// que dos entradas con el mismo archivo compartan una sola descarga.
	const original = use(cargarGLB(`/modelos/${objeto.archivo}.glb`))

	const modelo = useMemo(() => {
		// **Clonar, no usar el original.** El original vive en la caché y puede
		// aparecer más de una vez en la escena; si se colgara tal cual, la segunda
		// aparición se llevaría la primera de su sitio — un `Object3D` solo puede
		// tener un padre.
		const copia = original.clone(true)

		// Escalar por la dimensión mayor y centrar. El modelo llega con la escala y
		// el origen que tuviera el archivo, que en modelos generados no son
		// consistentes: normalizarlo aquí es lo que hace que `tamano` signifique
		// metros de verdad y que girar el objeto lo haga sobre sí mismo y no
		// alrededor de un punto arbitrario.
		const caja = new THREE.Box3().setFromObject(copia)
		const medidas = caja.getSize(new THREE.Vector3())
		const centro = caja.getCenter(new THREE.Vector3())
		const escala = objeto.tamano / Math.max(medidas.x, medidas.y, medidas.z, 1e-6)

		copia.scale.setScalar(escala)
		copia.position.copy(centro).multiplyScalar(-escala)

		// La malla se sale de su caja original al mecerse, y three la descartaría
		// en algunos encuadres si confiara en ella.
		copia.traverse((hijo) => {
			hijo.frustumCulled = false
		})

		return copia
	}, [original, objeto.tamano])

	const grupo = useRef<THREE.Group>(null)
	// Desfase estable por objeto: sin él los tres se mecen al unísono y se lee
	// como que la escena entera tiembla.
	const fase = useMemo(() => objeto.posicion[0] * 3.7 + objeto.posicion[1] * 5.1, [objeto.posicion])

	useFrame((estado) => {
		const vaiven = objeto.vaiven ?? 0
		if (!grupo.current || !vaiven) return
		const t = estado.clock.elapsedTime + fase
		const base = objeto.rotacion ?? [0, 0, 0]
		grupo.current.rotation.set(
			(base[0] + Math.sin(t * 0.31) * vaiven) * GRADOS,
			(base[1] + Math.sin(t * 0.23) * vaiven) * GRADOS,
			(base[2] + Math.cos(t * 0.27) * vaiven) * GRADOS,
		)
	})

	const rotacion = objeto.rotacion ?? [0, 0, 0]

	// Sin `anclaje`, las coordenadas son del mundo y el objeto se queda donde se
	// le puso. Con él, se leen respecto de la cámara en ese momento del recorrido.
	const posicion = useMemo(
		() =>
			objeto.anclaje === undefined
				? new THREE.Vector3(...objeto.posicion)
				: aMundo(aRelativo(objeto.posicion), objeto.anclaje),
		[objeto.posicion, objeto.anclaje],
	)

	return (
		<group
			ref={grupo}
			position={posicion}
			rotation={[rotacion[0] * GRADOS, rotacion[1] * GRADOS, rotacion[2] * GRADOS]}
		>
			<primitive object={modelo} />
		</group>
	)
}

export function Utileria() {
	return (
		<>
			{OBJETOS.map((objeto, i) => (
				<Suspense key={`${objeto.archivo}-${i}`} fallback={null}>
					<Pieza objeto={objeto} />
				</Suspense>
			))}
		</>
	)
}

export default Utileria
