import { useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { ACTOS, GUION } from "../data/guion"
import { aMundo, aPerfil, aRelativo, fovPara, perfilPara, recorrer } from "./camara"
import { FIGURA_A, FIGURA_B, PECHO } from "./figuras"
import { calcular, calcularMarcas, vuelo, type Marcas } from "./coreografia"
import type { EstadoEscena } from "./estado"
import { crearControlEsfera, Esfera } from "./Esfera"
import { Lucecitas } from "./Lucecitas"
import { Iluminacion } from "./iluminacion"
import { crearControlFigura, Personaje } from "./Personaje"
import { Utileria } from "./Utileria"

/**
 * Puesta en escena · RV-L3.4 · RV-L4.3
 *
 * **El estado llega por prop, no por contexto.** `<Canvas>` monta un
 * reconciliador de React aparte, y el contexto del árbol del DOM no cruza esa
 * frontera de forma fiable.
 *
 * Todo lo que se mueve se calcula en **un solo `useFrame`** y se escribe sobre
 * objetos de control mutables. La escena no re-renderiza nunca después del
 * montaje.
 *
 * ---
 *
 * **La cámara está fija, y van dos intentos de moverla.**
 *
 * El primero fue un paneo lateral de una figura a la otra: arrastraba a los
 * personajes por la pantalla, que parecían deslizarse de lado mientras uno hacía
 * scroll.
 *
 * El segundo fue un descenso en hélice alrededor de un pilar central. La cámara
 * bajaba y giraba de verdad —26 unidades y 1.35 vueltas, medido—, pero **no se
 * veía**: un cilindro liso se ve igual desde cualquier ángulo, así que girar a su
 * alrededor no produce ningún indicio de movimiento. Sin superficies con detalle
 * que pasen de largo, no hay paralaje, y sin paralaje no hay descenso. El
 * resultado fue un bloque oscuro en el centro y todo lo demás igual.
 *
 * La lección para un tercer intento: **el movimiento de cámara no se siente por
 * lo que hace la cámara, sino por lo que pasa por delante.** Antes de volver a
 * moverla hay que poblar el espacio.
 */

/** Índice de la sección donde aparece la figura B, y de la del cierre. */
const I_ENCUENTRO = GUION.findIndex((s) => s.acto === ACTOS.encuentro)
const I_RESOLUCION = GUION.findIndex((s) => s.acto === ACTOS.resolucion)

/** Cada figura se planta donde su sección declaró la luz: ahí tiene el pecho. */
const A = GUION[0].luz
const B = GUION[I_ENCUENTRO].luz
const GRADOS = Math.PI / 180

export function Escena({
	estado,
	colorFondo,
	colorMarca,
}: {
	estado: React.RefObject<EstadoEscena>
	/** Fondo y niebla, tomados del tema activo. Ver `colores.ts`. */
	colorFondo: string
	/** Color de marca de la paleta activa: le da cuerpo a la esfera en claro. */
	colorMarca: string
}) {
	const camara = useThree((s) => s.camera)
	const tamano = useThree((s) => s.size)

	/**
	 * Apaisado o vertical · RV-L2.13
	 *
	 * Toda la puesta en escena —dónde orbita la cámara, cuánto abre el objetivo y
	 * dónde se plantan las dos figuras— depende de esto. El porqué está en
	 * `camara.ts`: con un campo de visión vertical fijo, una pantalla en pie
	 * recorta tanto por los lados que ni la hélice ni las figuras caben.
	 */
	const perfil = perfilPara(tamano.width / Math.max(1, tamano.height))
	const figuraDeA = FIGURA_A[perfil]
	const figuraDeB = FIGURA_B[perfil]

	/**
	 * El objetivo se abre según la proporción de la pantalla.
	 *
	 * `Lienzo.tsx` ya no fija el `fov`: lo pone aquí `fovPara`, que en 16:9
	 * devuelve los mismos 32° de siempre y solo se separa de ellos cuando la
	 * pantalla se estrecha.
	 */
	useEffect(() => {
		const c = camara as THREE.PerspectiveCamera
		if (!c.isPerspectiveCamera) return
		c.fov = fovPara(tamano.width / Math.max(1, tamano.height))
		c.updateProjectionMatrix()
	}, [camara, tamano])

	/**
	 * Cuánto tira a claro el fondo del tema, de 0 a 1.
	 *
	 * Se saca de la luminancia del color de fondo en vez de preguntar «¿está en
	 * modo claro?», y no es lo mismo: hay cinco paletas y cada una trae su propio
	 * papel. Lo que le importa a la escena no es qué modo eligió la persona sino
	 * **cuánta luz hay detrás**, que es lo que decide si una luz aditiva se ve.
	 */
	const claridad = useMemo(() => {
		const [r, g, b] = colorFondo.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0]
		const luminancia = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
		return Math.min(1, Math.max(0, (luminancia - 0.25) / 0.45))
	}, [colorFondo])
	const escena3D = useThree((s) => s.scene)

	const esfera = useRef(crearControlEsfera())
	const figuraA = useRef(crearControlFigura(1))
	const figuraB = useRef(crearControlFigura(0))

	/**
	 * **No hay suelo.**
	 *
	 * Había un disco en y = 0 para dar apoyo a las figuras. Al pasar la esfera por
	 * encima lo iluminaba, y el borde del disco se dibujaba como **una raya
	 * horizontal a todo lo ancho de la pantalla** — la línea que parecía separar
	 * las secciones y que estuve buscando en el CSS. No era CSS: era el horizonte
	 * del suelo.
	 *
	 * Quitarlo no cuesta nada: no hay sombras proyectadas que apoyar, y en un
	 * escenario a oscuras las figuras se sostienen igual de bien sobre el vacío.
	 */

	useEffect(() => {
		// El encuadre de partida. A partir de aquí lo lleva el scroll, cuadro a
		// cuadro, desde el `useFrame` de abajo.
		recorrer(camara, 0, perfil)

		if (import.meta.env.DEV) {
			;(window as any).rvEscena = { esfera, figuraA, figuraB, estado, escena3D, camara }
		}

		return () => {
			if (import.meta.env.DEV) delete (window as any).rvEscena
		}
	}, [camara, estado])

	/**
	 * Trayectoria de la esfera · RV-L2.9
	 *
	 * Los puntos de control son los `luz` que cada sección del guion declara, así
	 * que la esfera está exactamente donde esa sección quiere mientras se la lee.
	 * Es lo que evita que cruce por detrás de una numeralia: esa sección manda la
	 * luz por encima de los números, y la de cuatro pasos la cruza por arriba.
	 *
	 * **Ahora esos puntos viajan con la cámara.** Se escribieron mirando una
	 * pantalla con la cámara quieta, y lo que se midió en ellos —que la luz nunca
	 * pise el texto, que es contraste y no gusto— es una regla **de pantalla**, no
	 * de coordenadas del mundo. Mientras la cámara no se movía, daba lo mismo; en
	 * cuanto baja quince metros y da media vuelta, deja de dar lo mismo: los
	 * puntos se quedaban atrás y la esfera desaparecía del cuadro.
	 *
	 * Así que cada punto se traduce a «tantos metros a la derecha, arriba y al
	 * fondo de la cámara» y se vuelve a colocar usando **el encuadre que la cámara
	 * tendrá en el momento en que esa sección esté centrada**. La composición
	 * aprobada se mantiene; lo que cambia es que ahora acompaña.
	 */
	const relativos = useMemo(
		() => GUION.slice(0, I_RESOLUCION + 1).map(({ luz }) => aRelativo(luz)),
		[],
	)

	/**
	 * La curva, rehecha cada vez que cambian las marcas — que es cuando se sabe en
	 * qué progreso cae cada sección, y por tanto dónde estará la cámara.
	 */
	const curva = useRef<THREE.CatmullRomCurve3 | null>(null)

	/**
	 * En qué momento del scroll se evalúa el punto de cada sección.
	 *
	 * El de cada sección, salvo **a partir del encuentro**: desde ahí la esfera ya
	 * no va hacia una posición de pantalla, va hacia **una persona plantada en el
	 * mundo**. Si esos últimos puntos se calcularan con la cámara de su propia
	 * sección, cada uno caería en un sitio distinto y la esfera terminaría medio
	 * metro por delante del pecho en vez de dentro. Anclados todos al momento de
	 * la figura, terminan donde está ella.
	 */
	const momento = (m: Marcas, i: number) =>
		m.anclas[Math.min(i, I_ENCUENTRO)]?.[0] ?? i / relativos.length

	const rehacerCurva = (m: Marcas) => {
		const puntos = relativos.map((rel, i) =>
			aMundo(aPerfil(rel, perfil), momento(m, i), undefined, perfil),
		)
		colocarFiguras(m, puntos)
		curva.current = new THREE.CatmullRomCurve3(
			puntos,
			false,
			// **`centripetal`, no `catmullrom`.** Con puntos que alternan de un
			// margen al otro, la variante uniforme se pasa de largo en cada giro:
			// la curva se abre más allá de los propios puntos de control y la
			// esfera acaba saliéndose del encuadre en cada zigzag. La
			// parametrización centrípeta es la única de las tres que garantiza no
			// sobrepasar ni formar bucles.
			"centripetal",
		)

		// Y las dos figuras, que se plantan en el pecho que declara su sección: la
		// del hero al empezar y la del encuentro cuando le toca. Se restan los
		// 1.12 m del pecho **en vertical del mundo**, no de la cámara: por mucho
		// que la cámara se incline, una persona sigue de pie.
	}

	const colocarFiguras = (m: Marcas, puntos: THREE.Vector3[]) => {
		// Las dos figuras se colocan desde `figuras.ts` —su sitio respecto de la
		// cámara— y no desde la luz del guion. Su pecho **sustituye** al punto de
		// la sección correspondiente en la curva, para que la esfera siga saliendo
		// y llegando exactamente al pecho aunque se muevan las personas.
		aMundo(figuraDeA.sitio, figuraDeA.momento ?? momento(m, 0), pechoA.current, perfil)
		aMundo(figuraDeB.sitio, figuraDeB.momento ?? momento(m, I_ENCUENTRO), pechoB.current, perfil)
		puntos[0] = pechoA.current.clone()
		for (let i = I_ENCUENTRO; i < puntos.length; i++) puntos[i] = pechoB.current.clone()

		anclaA.current.copy(pechoA.current)
		anclaA.current.y -= PECHO
		anclaB.current.copy(pechoB.current)
		anclaB.current.y -= PECHO
	}

	const pechoA = useRef(new THREE.Vector3())
	const pechoB = useRef(new THREE.Vector3())
	const anclaA = useRef(new THREE.Vector3(A[0], 0, A[2]))
	const anclaB = useRef(new THREE.Vector3(B[0], 0, B[2]))
	const marcas = useRef<Marcas | null>(null)
	const medidaVista = useRef("")
	const posicion = useMemo(() => new THREE.Vector3(), [])
	const deriva = useMemo(() => new THREE.Vector3(), [])

	/**
	 * Salto a un punto del scroll, solo en desarrollo · RV-L2.10
	 *
	 * `?escena=0.9` congela la escena en ese progreso. La página mide doce mil
	 * píxeles y el desenlace vive en el último 15 %: revisar dónde queda una
	 * figura o si una hebra la tapa costaba recorrerla entera cada vez. Con esto
	 * se abre directamente en el momento que se quiere mirar.
	 *
	 * Solo afecta a la escena 3D; el texto de la página sigue donde esté el
	 * scroll. Fuera de desarrollo el parámetro se ignora.
	 */
	const saltoDev = useMemo(() => {
		if (!import.meta.env.DEV) return null
		const valor = new URLSearchParams(window.location.search).get("escena")
		const numero = valor === null ? NaN : Number(valor)
		return Number.isFinite(numero) ? Math.min(1, Math.max(0, numero)) : null
	}, [])

	useFrame((estadoR3F) => {
		const s = estado.current
		if (!s) return
		const p = saltoDev ?? s.suave

		// Las marcas se recalculan solo cuando cambia la disposición: número de
		// hitos o alto del escenario. Es lo que mantiene la animación cuadrada con
		// el contenido sin constantes escritas a mano.
		// El perfil entra en la huella: girar el teléfono cambia dónde orbita la
		// cámara y dónde va cada figura, así que la curva de la esfera y los
		// anclajes hay que rehacerlos igual que si hubiera cambiado el contenido.
		const huella = `${perfil}:${s.hitos.length}:${Math.round(s.alto)}`
		if (huella !== medidaVista.current && s.hitos.length > 2) {
			medidaVista.current = huella
			const viewports = Math.max(1, (s.alto - window.innerHeight) / window.innerHeight)
			marcas.current = calcularMarcas(
				s.hitos.map((h) => h.centro),
				GUION.map((seccion) => seccion.acto),
				viewports,
			)
			rehacerCurva(marcas.current)
		}
		if (!marcas.current || !curva.current) return

		const c = calcular(p, marcas.current)

		// --- La cámara -------------------------------------------------------
		// Atada al scroll como todo lo demás: se detiene donde uno pare y vuelve
		// atrás si uno sube. El recorrido y el porqué de que sea corto están en
		// `camara.ts`.
		recorrer(estadoR3F.camera, p, perfil)

		// --- La esfera -------------------------------------------------------
		curva.current.getPoint(c.t, posicion)
		// Mientras nace, sigue al pecho de A, que va subiendo con el hero. Sin
		// esto la esfera saldría de un punto fijo del aire.
		posicion.y += c.figuraA.desplazamientoY * c.esfera.pesoOrigen
		// El vuelo de abeja se suma encima del recorrido. Su amplitud se apaga sola
		// al acercarse al centro, así que no puede invadir el lado del texto.
		vuelo(estadoR3F.clock.elapsedTime, posicion.x, deriva)
		posicion.add(deriva)

		esfera.current.posicion.copy(posicion)
		esfera.current.presencia = c.esfera.presencia
		esfera.current.velocidad = s.velocidad

		// --- Las figuras -----------------------------------------------------
		Object.assign(figuraA.current, c.figuraA)
		Object.assign(figuraB.current, c.figuraB)
		figuraA.current.posicion.copy(anclaA.current)
		figuraB.current.posicion.copy(anclaB.current)
	})

	return (
		<>
			{/**
			 * **La escena ya no pinta su propio fondo.**
			 *
			 * Lo hacía con el mismo color que el DOM, para que el lienzo y la página
			 * se leyeran como una sola superficie. Ese truco dejó de hacer falta el
			 * día en que la página dejó de tener un fondo liso: ahora hay un campo de
			 * luz por debajo (`components/Ambiente.tsx`) y un fondo opaco aquí lo
			 * taparía. El lienzo se limpia transparente (`alpha: true`, ver
			 * `Lienzo.tsx`) y las figuras se recortan contra ese fondo.
			 *
			 * La niebla sí conserva el color del tema: es lo que funde lo lejano con
			 * el fondo, y sin un color al que fundirse las cosas del fondo se
			 * quedarían nítidas y recortadas.
			 */}
			<fog attach="fog" args={[colorFondo, 9, 22]} />

			{/**
			 * El polvo de luz que llena el aire de la escena. Ver `Lucecitas.tsx`.
			 *
			 * Sustituye al campo de estrellas a pantalla completa que había antes:
			 * aquel pagaba por píxel de pantalla y este paga por punto, que son 420.
			 * Y al estar dentro de la escena, la hélice los tapa al pasar por
			 * delante — el paralaje sale gratis porque es de verdad.
			 *
			 * `claridad` los apaga en los temas claros, donde la luz aditiva no
			 * suma nada sobre papel blanco.
			 */}
			<Lucecitas estado={estado} claridad={claridad} />

			{/* Toda la luz de la escena, y viene de un mapa de entorno: lo que se
			    añada queda iluminado igual esté donde esté. Ver `iluminacion.tsx`. */}
			<Iluminacion />

			{/* La utilería: lo que haya declarado `objetos.ts`. */}
			<Utileria />

			{/**
			 * `claridad` es cuánto tira a claro el fondo del tema, de 0 a 1. La
			 * esfera lo usa para decidir cuánto cuerpo necesita: con fondo oscuro le
			 * basta la luz, con fondo claro la luz no suma nada y hace falta materia.
			 */}
			<Esfera control={esfera} color={colorMarca} claridad={claridad} />

			{/*
			 * Dos figuras, un modelo, un clip. La del hero lo recorre hasta el final
			 * y se queda ahí —erguida desde el primer cuadro—; la del encuentro
			 * empieza en el fotograma 0, con las manos en las rodillas, y se endereza
			 * con el scroll.
			 *
			 * Suspenden por separado aunque compartan archivo: la promesa de carga es
			 * la misma, así que la segunda no espera a nada que la primera no haya
			 * esperado ya.
			 */}
			<Suspense fallback={null}>
				<Personaje rotacionY={figuraDeA.giro * GRADOS} control={figuraA} alturaPecho={PECHO} />
			</Suspense>

			<Suspense fallback={null}>
				<Personaje
					rotacionY={figuraDeB.giro * GRADOS}
					control={figuraB}
					alturaPecho={PECHO}
					fase={2.4}
				/>
			</Suspense>
		</>
	)
}

export default Escena
