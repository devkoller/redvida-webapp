import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

/**
 * Iluminación de la escena · RV-L2.6
 *
 * **Luz de entorno, no focos.** Antes había tres luces colocadas a mano —una
 * ambiental floja, una clave cálida arriba a la derecha y un contraluz vino
 * detrás— y estaban afinadas para dos figuras que siempre estaban en el mismo
 * sitio. Eso deja de funcionar en cuanto se añade cualquier cosa más: un modelo
 * a la izquierda del encuadre recibe otra luz que uno a la derecha, y uno al
 * fondo se queda sin contraluz. No es que se vea mal, es que **se ve distinto
 * según dónde esté**, que es peor.
 *
 * La solución estándar para esto es iluminar con un **mapa de entorno**: una
 * imagen que rodea la escena entera y de la que cada material toma luz en todas
 * las direcciones. Un objeto nuevo queda iluminado igual esté donde esté y mire
 * hacia donde mire, sin tocar nada.
 *
 * Se genera aquí mismo con un degradado en un lienzo 2D —la misma técnica que
 * `halo.ts`—, así que **no descarga ningún archivo**: un HDR de los que se usan
 * normalmente para esto pesa varios megas, y el presupuesto del lienzo entero
 * son 250 kB.
 *
 * ---
 *
 * **Queda una luz direccional, y es a propósito.** Con solo entorno, una figura
 * se ve completa pero plana: sin una dirección dominante no hay lado iluminado
 * ni lado en sombra, y el volumen desaparece — la persona se lee como una
 * silueta recortada. La direccional no está para iluminar, está para **modelar**,
 * y por eso es suave y va alta y ligeramente al frente: la misma para todos los
 * objetos de la escena, no apuntada a nadie.
 */

/** Cúpula: color del cenit, del horizonte y del suelo. */
const CIELO = "#ffd9c0"
const HORIZONTE = "#a4737d"
const SUELO = "#3d2a30"

/**
 * Cuánta luz llega del entorno.
 *
 * **Es el mando principal de la escena.** Subirlo aclara todo por igual sin
 * cambiar de dónde viene la luz; bajarlo devuelve el escenario a oscuras. Y a
 * oscuras es donde la esfera significa algo: si el ambiente sube mucho, la luz
 * que la persona lleva dentro deja de ser un acontecimiento. Entre 0.4 y 0.8
 * está el rango razonable.
 */
const AMBIENTE = 0.7

/** La direccional que da volumen. Deliberadamente floja. */
const CLAVE = 0.45
const COLOR_CLAVE = "#ffd9c8"
const POSICION_CLAVE: [number, number, number] = [2.5, 6, 5]

/**
 * Cúpula de luz: una esfera del revés con un degradado vertical en los vértices.
 *
 * **Geometría y no una textura**, y no por gusto. El primer intento fue un
 * degradado pintado en un lienzo 2D —la técnica de `halo.ts`— convertido en
 * mapa de entorno: el generador lo aceptaba sin protestar, el mapa quedaba
 * colgado de la escena con todo en su sitio… y no iluminaba nada. Medido a
 * nivel de píxel: subir la intensidad de 0 a 2 no cambiaba **ni un valor** de la
 * imagen. Con una escena de verdad delante del mismo generador, los objetos se
 * iban a blanco. Así que el problema estaba en la textura, no en el mecanismo.
 *
 * Una esfera con colores por vértice no tiene ese riesgo: es lo mismo que hace
 * `RoomEnvironment` de three, cuesta cuatro líneas y el degradado se controla
 * mejor que dibujándolo.
 */
function cupula(): THREE.Scene {
	const escena = new THREE.Scene()
	const geometria = new THREE.SphereGeometry(10, 24, 16)

	const arriba = new THREE.Color(CIELO)
	const medio = new THREE.Color(HORIZONTE)
	const abajo = new THREE.Color(SUELO)
	const posicion = geometria.getAttribute("position")
	const colores = new Float32Array(posicion.count * 3)
	const color = new THREE.Color()

	for (let i = 0; i < posicion.count; i++) {
		// −1 en el suelo, +1 en el cenit.
		const altura = posicion.getY(i) / 10
		if (altura >= 0) color.copy(medio).lerp(arriba, altura)
		else color.copy(medio).lerp(abajo, -altura)
		color.toArray(colores, i * 3)
	}
	geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3))

	// Vista desde dentro, y sin luz propia: la esfera **es** la luz.
	const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })
	escena.add(new THREE.Mesh(geometria, material))
	return escena
}

export function Iluminacion() {
	const gl = useThree((s) => s.gl)
	const escena = useThree((s) => s.scene)

	useEffect(() => {
		// El generador convierte la cúpula en los mapas borrosos que usa el
		// sombreador para el difuso y el reflejo. Se hace una vez y se tira: lo que
		// se conserva es su resultado.
		const generador = new THREE.PMREMGenerator(gl)
		const sala = cupula()
		const entorno = generador.fromScene(sala)
		sala.traverse((o) => {
			const malla = o as THREE.Mesh
			if (malla.isMesh) {
				malla.geometry.dispose()
				;(malla.material as THREE.Material).dispose()
			}
		})
		generador.dispose()

		escena.environment = entorno.texture
		escena.environmentIntensity = AMBIENTE

		// **Crear y colgar aquí, en el efecto, y no en el render.** Con `StrictMode`
		// React monta, desmonta y vuelve a montar: lo que se cuelga durante el
		// render no se vuelve a colgar en ese baile, pero la limpieza sí corre — y
		// deja la escena sin entorno para siempre. Es el mismo tropiezo que dejaba
		// al personaje en cruz. Creado en el efecto, cada limpieza tiene su montaje.
		return () => {
			escena.environment = null
			entorno.dispose()
		}
	}, [gl, escena])

	return <directionalLight position={POSICION_CLAVE} intensity={CLAVE} color={COLOR_CLAVE} />
}

export default Iluminacion
