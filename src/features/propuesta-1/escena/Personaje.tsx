import { useFrame } from "@react-three/fiber"
import { use, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { materialHalo } from "./halo"
import { cargarModelo, clonar } from "./modelos"

/**
 * Una de las dos figuras · RV-L2.2c · RV-L2.5
 *
 * El personaje trae esqueleto humanoide y un clip de dos fotogramas —agotado y
 * victoria—, así que **la pose no se reproduce: se recorre**. `animo` va de 0
 * (hundido y apagado) a 1 (erguido y encendido) y se usa tal cual como tiempo
 * del clip, que dura exactamente un segundo.
 *
 * Eso da las tres cosas que la historia necesita: la transformación queda
 * **atada al scroll**, se puede detener a medias, y va y vuelve si el usuario
 * sube. Y elimina el cambio de malla con fogonazo que hubo que montar mientras
 * los modelos no tenían esqueleto: una sola figura, una sola malla.
 *
 * **El mezclador se avanza con `dt = 0`.** No queremos que el clip corra por su
 * cuenta: el tiempo lo pone el scroll. `setTime` posiciona y evalúa.
 */

const COLOR_EMISION = new THREE.Color("#ff9d5c")
const APAGADO = new THREE.Color("#4a4650")

/**
 * Tope del tiempo del clip, justo por debajo del final.
 *
 * El clip se reproduce en bucle, y pedir el segundo exacto **da la vuelta al
 * fotograma 0**: la figura aparecería agotada en el momento de máximo triunfo.
 * Una diezmilésima antes es la misma pose sin el salto.
 */
const TOPE = 1 - 1e-4

/** Nadie baja de aquí: por debajo, la figura se lee como un agujero negro. */
const LUZ_MINIMA = 0.12

/**
 * Estado que la escena escribe cuadro a cuadro. Objeto mutable, no props: mover
 * esto por el ciclo de render de React costaría una reconciliación por cuadro.
 */
export interface ControlFigura {
	/** 0 = hundido y apagado · 1 = erguido y brillando. Gobierna pose y luz. */
	animo: number
	/** Fogonazo puntual, 0..1. Lo dispara la esfera al entrar en el pecho. */
	destello: number
	/**
	 * Desplazamiento vertical respecto a su sitio, en unidades de mundo.
	 *
	 * Es lo que ancla a cada figura a su sección: sube con el scroll igual que el
	 * texto que la acompaña. **En X no se mueve nunca.**
	 */
	desplazamientoY: number
	/**
	 * Dónde se planta, en coordenadas del mundo · RV-L2.9
	 *
	 * **Ya no es una prop fija.** Mientras la cámara estuvo quieta, cada figura
	 * vivía en un punto escrito a mano y ahí se quedaba. Con la cámara bajando y
	 * girando, ese punto se queda atrás: la escena mantiene a las figuras delante
	 * calculando dónde caen respecto del encuadre que la cámara tendrá cuando le
	 * toque a cada una. Ver `camara.ts` y la trayectoria en `Escena.tsx`.
	 */
	posicion: THREE.Vector3
	/**
	 * Presencia, 0..1. Con qué fuerza se ve la figura.
	 *
	 * La segunda persona **no entra moviéndose**: aparece donde siempre estuvo.
	 * Antes subía desde debajo del encuadre y parecía que salía del suelo.
	 */
	presencia: number
}

export const crearControlFigura = (animo = 0): ControlFigura => ({
	animo,
	posicion: new THREE.Vector3(),
	destello: 0,
	desplazamientoY: 0,
	presencia: 1,
})

export interface PersonajeProps {
	rotacionY?: number
	control: React.RefObject<ControlFigura>
	/** Altura del pecho, donde se coloca la luz interior. */
	alturaPecho?: number
	/** Semilla de la respiración, para que las dos figuras no respiren al unísono. */
	fase?: number
}

export function Personaje({
	rotacionY = 0,
	control,
	alturaPecho = 1.12,
	fase = 0,
}: PersonajeProps) {
	// `use()` suspende hasta que el GLB está cargado.
	const { objeto: original, clip } = use(cargarModelo())

	const { objeto, materiales, mezclador } = useMemo(() => {
		const objeto = clonar(original)
		const materiales: THREE.MeshStandardMaterial[] = []

		objeto.traverse((hijo) => {
			const malla = hijo as THREE.Mesh
			if (!malla.isMesh) return
			const base = malla.material as THREE.MeshStandardMaterial
			const propio = base.clone()
			propio.emissive = COLOR_EMISION.clone()
			propio.emissiveIntensity = 0
			// `transparent` permanente: alternar la bandera en caliente obliga a
			// recompilar el shader y produce un tirón justo al aparecer la figura.
			propio.transparent = true
			propio.depthWrite = true
			malla.material = propio
			// Sin recorte por frustum: la malla se deforma más allá de su caja
			// original al posarla, y three la descartaría en algunos encuadres.
			malla.frustumCulled = false
			materiales.push(propio)
		})

		// Un mezclador por figura: comparten clip pero cada una lo recorre por su
		// cuenta, que es justo lo que las diferencia —A llega erguida, B no.
		const mezclador = new THREE.AnimationMixer(objeto)
		mezclador.clipAction(clip).play()

		// **Posar ya, aquí, y no esperar al primer `useFrame`.** La pose de reposo
		// del archivo es la estrella con la que se rigó —brazos y piernas
		// abiertos—, que no es ninguna de las dos poses de la historia. Si un solo
		// cuadro se dibuja antes de que corra el bucle, esa estrella asoma. Se ve
		// en cuanto el navegador estrangula los cuadros de una pestaña de fondo.
		mezclador.setTime(Math.min(control.current?.animo ?? 0, TOPE) * clip.duration)

		return { objeto, materiales, mezclador }
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `control` es un ref
		// mutable que la escena reescribe cada cuadro: leerlo aquí es solo para no
		// dibujar la pose de reposo, y no debe rehacer el clon cuando cambie.
	}, [original, clip])

	useEffect(() => {
		return () => materiales.forEach((m) => m.dispose())
	}, [materiales])

	/**
	 * **La acción se vuelve a lanzar en un efecto, y aquí no se para nada.**
	 *
	 * `StrictMode` monta, desmonta y vuelve a montar. El `useMemo` no se repite en
	 * ese baile —las dependencias no cambian—, así que la limpieza del primer
	 * montaje actuaba sobre el mismo mezclador que iba a usar el segundo. Y parar
	 * una acción no deja la pose donde estaba: el mezclador **restaura el estado
	 * original** de cada hueso, que es la pose de estrella con la que se rigó el
	 * modelo. El resultado era una figura en cruz, quieta, en producción no —solo
	 * en desarrollo—, que es la peor clase de fallo.
	 *
	 * Lanzarla aquí la deja corriendo pase lo que pase con los montajes. Y no hay
	 * nada que parar al desmontar: el mezclador solo lo referencia esta figura, así
	 * que se va con ella.
	 */
	useEffect(() => {
		const accion = mezclador.clipAction(clip)
		if (!accion.isRunning()) accion.play()
	}, [mezclador, clip])

	/**
	 * Resplandor propio · RV-L2.4b
	 *
	 * La misma técnica que la esfera: un plano encarado a cámara con mezcla
	 * aditiva. Va **detrás** de la figura, de modo que la silueta se recorta contra
	 * su propia luz en vez de quedar lavada por ella.
	 *
	 * Es lo que empareja visualmente a las personas con la esfera: si solo la
	 * esfera irradia, la luz se lee como algo ajeno que pasa cerca; si la persona
	 * encendida irradia igual, se lee como que la lleva dentro. Que es la idea.
	 */
	const resplandor = useMemo(() => new THREE.PlaneGeometry(3.4, 3.4), [])
	const materialResplandor = useMemo(() => materialHalo(0.34), [])
	const halo = useRef<THREE.Mesh>(null)

	useEffect(() => {
		return () => {
			resplandor.dispose()
			materialResplandor.dispose()
		}
	}, [resplandor, materialResplandor])

	const grupo = useRef<THREE.Group>(null)
	const luz = useRef<THREE.PointLight>(null)
	const animoSuave = useRef(control.current?.animo ?? 0)

	const coloresBase = useMemo(() => materiales.map((m) => m.color.clone()), [materiales])

	useFrame((estado, dt) => {
		const c = control.current
		if (!c) return

		const t = estado.clock.elapsedTime + fase
		const paso = Math.min(0.1, dt)

		// El ánimo llega como objetivo y se persigue con inercia: enderezarse tiene
		// que costar un instante, no ser un corte.
		animoSuave.current += (c.animo - animoSuave.current) * (1 - Math.exp(-paso * 3))
		const a = animoSuave.current
		const vida = 0.25 + a * 0.75

		// --- La pose ---------------------------------------------------------
		// El clip dura 1 s y va de agotado a erguido, así que el ánimo **es** el
		// tiempo. Sin `dt`: nada avanza solo.
		mezclador.setTime(Math.min(a, TOPE) * clip.duration)

		// --- El cuerpo entero -------------------------------------------------
		//
		// **No hay respiración.** Había dos: una que inclinaba el pecho y otra que
		// subía y bajaba la figura entera, las dos al mismo ritmo. Con los modelos
		// sin esqueleto la primera no hacía nada —no había huesos que mover— y al
		// llegar el rig se encendió sola; y un grado de giro en el pecho son varios
		// milímetros en la cabeza, porque todo lo que hay por encima lo amplifica.
		// El resultado era un péndulo. Las dos fuera.
		//
		// Queda el balanceo, y a la mitad de lo que era: gira toda la figura desde
		// los pies, así que también es un péndulo por construcción, con 1.72 m de
		// brazo de palanca. Poner su amplitud a cero deja a las figuras quietas del
		// todo, si algún día se prefiere así.
		if (grupo.current) {
			const balanceo = Math.sin(t * 0.43) * 0.006 * vida
			grupo.current.rotation.z = balanceo
			// La X nunca se toca: la figura está clavada en su sitio. Lo único que
			// cambia es la altura, que la ata a su sección.
			//
			// **Ya no hay hundimiento aparte.** La pose agotada baja la cadera 21 cm
			// con los pies clavados en el suelo, que es lo que antes no se podía
			// hacer sin cinemática inversa y se fingía moviendo la figura entera.
			grupo.current.position.set(c.posicion.x, c.posicion.y + c.desplazamientoY, c.posicion.z)

			// Fuera de cuadro no se dibuja.
			// **Solo la presencia decide si se dibuja.**
			//
			// Aquí había además un recorte por altura —`|y| < 6`— que venía de cuando
			// las figuras vivían pegadas al suelo: entonces, estar lejos en Y
			// significaba estar fuera del encuadre, y ahorraba dibujar. Desde que la
			// cámara baja quince metros y las figuras se colocan respecto de ella, una
			// Y de −16 es lo normal, no una anomalía. La segunda persona quedaba
			// **permanentemente invisible** por esta condición: bien colocada, bien
			// iluminada, con presencia 1, y descartada antes de dibujarse.
			//
			// No hace falta sustituirlo por nada: three ya descarta por frustum lo que
			// no entra en cuadro.
			grupo.current.visible = c.presencia > 0.01
		}

		// --- El encendido ------------------------------------------------------
		// El suelo de luz va aquí y no en el ánimo: una figura del todo apagada se
		// lee como un agujero recortado en el fondo, y la que espera no está
		// ausente. Separarlo del ánimo deja que la pose llegue entera al agotamiento
		// sin que la figura desaparezca.
		const total = Math.min(1, Math.max(a, LUZ_MINIMA) + c.destello)
		for (let i = 0; i < materiales.length; i++) {
			const m = materiales[i]
			m.color.lerpColors(APAGADO, coloresBase[i], total)
			m.emissiveIntensity = total * 0.14 + c.destello * 0.7
			m.opacity = c.presencia
		}

		if (halo.current) {
			// Arranca tarde y sube rápido: al cuadrado, el resplandor no asoma
			// mientras la persona está hundida y se dispara al enderezarse.
			const fuerza = total * total * c.presencia
			halo.current.visible = fuerza > 0.01
			halo.current.scale.setScalar(0.55 + fuerza * 0.55 + Math.sin(t * 1.6) * 0.03 * fuerza)
			halo.current.quaternion.copy(estado.camera.quaternion)
			materialResplandor.opacity = fuerza * 0.34
		}

		if (luz.current) luz.current.intensity = a * 0.9 + c.destello * 5
	})

	return (
		<group ref={grupo} rotation={[0, rotacionY, 0]}>
			{/* Resplandor por detrás. `renderOrder` bajo para que la figura se dibuje
			    encima y conserve su silueta recortada contra la luz. */}
			<mesh
				ref={halo}
				geometry={resplandor}
				material={materialResplandor}
				position={[0, alturaPecho, -0.55]}
				renderOrder={-1}
			/>

			{/* Luz del pecho: alumbra el entorno, no el propio cuerpo. Pegada a la
			    malla la satura a blanco y borra la silueta. */}
			<pointLight
				ref={luz}
				position={[0, alturaPecho, 0.5]}
				color={COLOR_EMISION}
				distance={3}
				decay={2}
			/>
			<primitive object={objeto} />
		</group>
	)
}

export default Personaje
