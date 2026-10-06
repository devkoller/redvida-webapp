import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { texturaHalo } from "./halo"

/**
 * La esfera de luz · RV-L3.1 · RV-L3.3
 *
 * Tres piezas superpuestas, y las tres hacen falta:
 *
 * 1. **Núcleo** — esfera pequeña con material básico, siempre a tope de brillo.
 *    Da el punto duro que el ojo sigue.
 * 2. **Halo** — un plano encarado a cámara con un degradado radial y mezcla
 *    aditiva. Es lo que se lee como resplandor. Sustituye al *bloom* de
 *    postprocesado: cuesta un triángulo en vez de tres pasadas de pantalla
 *    completa, y en móvil esa diferencia es la que decide si hay 30 fps o 12.
 * 3. **Luz puntual** — la que de verdad ilumina a las figuras y el suelo. Sin
 *    ella la esfera sería un adhesivo pegado sobre la escena.
 */

export interface ControlEsfera {
	posicion: THREE.Vector3
	/** 0 = no existe (dentro de un pecho) · 1 = tamaño pleno. */
	presencia: number
	/** Estiramiento por velocidad, para que se sienta con masa. */
	velocidad: number
}

export const crearControlEsfera = (): ControlEsfera => ({
	posicion: new THREE.Vector3(),
	presencia: 0,
	velocidad: 0,
})

/**
 * Cuerpo de la esfera para fondos claros · RV-L4.4
 *
 * Los tres elementos que tenía —núcleo, halo y resplandor— son **luz aditiva**:
 * suman brillo sobre lo que haya debajo. Sobre el escenario oscuro eso es
 * exactamente lo que se quiere, y es lo que hace que la esfera parezca una
 * fuente y no un objeto. Pero **sobre un fondo claro, sumar luz al blanco no
 * hace nada**: el resultado sigue siendo blanco, y la esfera desaparece.
 *
 * No se arregla subiendo la intensidad —no hay nada por encima del blanco—, sino
 * dándole **materia**: una esfera de verdad, translúcida y del color de la
 * paleta, que en un fondo claro se lee como una cuenta de vidrio. Recoge además
 * el mapa de entorno de la escena, así que tiene reflejo y no parece un círculo
 * pegado.
 *
 * Su presencia la manda `claridad`: en modo oscuro vale 0 y el cuerpo no existe,
 * de modo que ahí no cambia absolutamente nada de lo que ya estaba aprobado.
 */
/**
 * Cuánto cuerpo llega a tener la esfera en el tema más claro.
 *
 * Es el mando de este efecto. Por debajo de 0.5 vuelve a perderse sobre el papel
 * claro; por encima de 0.85 deja de leerse como luz con materia y se lee como
 * una canica opaca, que es justo lo que no es.
 */
const CUERPO = 0.72

export function Esfera({
	control,
	color,
	claridad,
}: {
	control: React.RefObject<ControlEsfera>
	/** Color de marca de la paleta activa. */
	color: string
	/** 0 = fondo oscuro · 1 = fondo claro. */
	claridad: number
}) {
	const grupo = useRef<THREE.Group>(null)
	const halo = useRef<THREE.Mesh>(null)
	const haloExterior = useRef<THREE.Mesh>(null)
	const luz = useRef<THREE.PointLight>(null)
	const nucleo = useRef<THREE.Mesh>(null)

	const textura = useMemo(texturaHalo, [])
	// La esfera es lo que representa la donación: es el objeto más importante de
	// la escena y tiene que ocupar sitio. El núcleo se lee como una perla y el
	// halo interior le da cuerpo; el exterior, mucho más tenue y lento, es lo que
	// hace que la luz parezca alcanzar al texto en vez de quedarse en un punto.
	const geoNucleo = useMemo(() => new THREE.IcosahedronGeometry(0.11, 3), [])
	// Algo mayor que el núcleo: lo envuelve en vez de sustituirlo, así que en los
	// temas intermedios se ve la perla dentro del vidrio.
	const geoCuerpo = useMemo(() => new THREE.SphereGeometry(0.19, 32, 24), [])
	const geoHalo = useMemo(() => new THREE.PlaneGeometry(2.2, 2.2), [])
	// El resplandor amplio medía 6.5 y con la esfera en el margen se cortaba
	// contra el borde de la pantalla: en vez de desvanecerse, terminaba en una
	// línea recta. A 4.4 el degradado llega a cero dentro del encuadre.
	const geoHaloExterior = useMemo(() => new THREE.PlaneGeometry(4.4, 4.4), [])

	const matCuerpo = useMemo(
		() =>
			new THREE.MeshPhysicalMaterial({
				color,
				transparent: true,
				opacity: 0,
				roughness: 0.08,
				metalness: 0,
				// Barniz: es lo que le pone el brillo de canto que hace que se lea como
				// vidrio y no como una pelota de plástico.
				clearcoat: 1,
				clearcoatRoughness: 0.12,
				// Sin escritura de profundidad, como los halos: la esfera pasa por
				// delante de las figuras sin recortarse contra ellas.
				depthWrite: false,
			}),
		[color],
	)

	const matNucleo = useMemo(
		() => new THREE.MeshBasicMaterial({ color: "#fff6e6", toneMapped: false }),
		[],
	)
	const matHalo = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				map: textura,
				transparent: true,
				blending: THREE.AdditiveBlending,
				// Sin escritura de profundidad ni test: el halo debe poder pasar por
				// delante de la figura sin recortarse contra su geometría.
				depthWrite: false,
				depthTest: false,
				toneMapped: false,
			}),
		[textura],
	)

	// El resplandor amplio que alcanza al texto. Muy tenue: a esta escala,
	// cualquier opacidad apreciable lava la sección entera.
	const matHaloExterior = useMemo(
		() =>
			new THREE.MeshBasicMaterial({
				map: textura,
				transparent: true,
				// Bajo a propósito: cada punto de opacidad de más aquí es luz que
				// llega al texto y contraste que se pierde.
				opacity: 0.2,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				depthTest: false,
				toneMapped: false,
			}),
		[textura],
	)

	useEffect(() => {
		return () => {
			// **La textura NO se libera aquí.** Es compartida con las dos figuras
			// (`halo.ts`); destruirla al desmontar la esfera dejaría los resplandores
			// de los personajes apuntando a una textura muerta. Vive lo que viva la
			// pestaña, y ocupa 64 kB.
			geoNucleo.dispose()
			geoCuerpo.dispose()
			geoHalo.dispose()
			geoHaloExterior.dispose()
			matNucleo.dispose()
			matCuerpo.dispose()
			matHalo.dispose()
			matHaloExterior.dispose()
		}
	}, [
		geoNucleo,
		geoCuerpo,
		geoHalo,
		geoHaloExterior,
		matNucleo,
		matCuerpo,
		matHalo,
		matHaloExterior,
	])

	useFrame((estado) => {
		const g = grupo.current
		const c = control.current
		if (!g || !c) return

		const { presencia, velocidad } = c
		g.position.copy(c.posicion)
		g.visible = presencia > 0.002

		const t = estado.clock.elapsedTime
		// Latido tenue. Una esfera de brillo constante se lee como una bombilla;
		// con latido, como algo vivo.
		const latido = 1 + Math.sin(t * 2.6) * 0.06

		if (nucleo.current) nucleo.current.scale.setScalar(presencia * latido)

		if (halo.current) {
			halo.current.scale.setScalar(presencia * latido)
			// Encarar la cámara cada cuadro. Es lo que hace un sprite, hecho a mano
			// para no arrastrar `Sprite` ni el `Billboard` de drei.
			halo.current.quaternion.copy(estado.camera.quaternion)
			// Estirarse en el sentido del movimiento al acelerar.
			halo.current.scale.x *= 1 + Math.min(0.5, Math.abs(velocidad) * 0.08)
		}

		if (haloExterior.current) {
			// Respira más despacio y en contrafase con el núcleo: si los dos latieran
			// igual, se leerían como una sola pieza y el resplandor perdería
			// profundidad.
			haloExterior.current.scale.setScalar(presencia * (1 + Math.sin(t * 1.3 + 1.2) * 0.1))
			haloExterior.current.quaternion.copy(estado.camera.quaternion)
		}

		// El cuerpo solo aparece cuando el fondo es claro, y con la misma presencia
		// que el resto de la esfera: si la esfera no está, su vidrio tampoco.
		matCuerpo.opacity = presencia * claridad * CUERPO

		if (luz.current) luz.current.intensity = presencia * 13
	})

	return (
		<group ref={grupo}>
			{/* De fuera hacia dentro. El `renderOrder` los mantiene en ese orden pase
			    lo que pase con la profundidad. */}
			<mesh
				ref={haloExterior}
				geometry={geoHaloExterior}
				material={matHaloExterior}
				renderOrder={9}
			/>
			<mesh ref={halo} geometry={geoHalo} material={matHalo} renderOrder={10} />
			<mesh geometry={geoCuerpo} material={matCuerpo} renderOrder={10} />
			<mesh ref={nucleo} geometry={geoNucleo} material={matNucleo} renderOrder={11} />
			<pointLight ref={luz} color="#ffb877" distance={9} decay={2} />
		</group>
	)
}

export default Esfera
