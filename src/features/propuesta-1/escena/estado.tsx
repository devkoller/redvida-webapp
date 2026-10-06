import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	type ReactNode,
} from "react"

/**
 * Estado compartido entre el DOM y la escena 3D · RV-L1.1 · RV-L1.3
 *
 * **Regla central: nada de esto vive en `useState`.** El progreso del scroll
 * cambia hasta 60 veces por segundo; enrutarlo por el ciclo de render de React
 * significaría reconciliar el árbol completo de la landing en cada cuadro. Se
 * escribe en un objeto mutable dentro de un `ref`, que tanto los efectos del DOM
 * como el `useFrame` de react-three-fiber leen directamente.
 *
 * Es la contrapartida de que React no aparezca en el camino caliente: quien
 * quiera reaccionar a un cambio de acto tiene que suscribirse a mano
 * (`suscribirActo`), no esperar un re-render.
 */

/** Un bloque de contenido registrado en la escena. La curva de la esfera se deriva de estos. */
export interface Hito {
	id: string
	/** Índice en el guion, en orden de documento. */
	indice: number
	elemento: HTMLElement
	/** Centro vertical del bloque, en progreso normalizado del escenario (0..1). */
	centro: number
	/** Alto del bloque respecto al alto total del escenario. */
	alto: number
}

export interface EstadoEscena {
	/** Progreso del escenario, sin suavizar. 0 = arriba del todo, 1 = final. */
	crudo: number
	/** El mismo progreso con inercia. Es el que debe animar la escena. */
	suave: number
	/** Diferencia entre crudo y suave. Sirve para deformar la esfera al acelerar. */
	velocidad: number
	/** Alto del escenario en píxeles. Se recalcula al redimensionar. */
	alto: number
	/** Bloques registrados, en orden de documento. */
	hitos: Hito[]
}

interface Contexto {
	estado: React.RefObject<EstadoEscena>
	registrarHito: (hito: Omit<Hito, "centro" | "alto">) => () => void
	/** Fuerza una nueva medición de los hitos. Tras cambiar contenido o tipografía. */
	remedir: () => void
	refEscenario: (elemento: HTMLElement | null) => void
}

const EscenaContexto = createContext<Contexto | null>(null)

const limitar = (valor: number, min = 0, max = 1) => Math.min(max, Math.max(min, valor))

/**
 * Suavizado independiente de la tasa de refresco.
 *
 * Un `a += (b - a) * 0.1` por cuadro parece equivalente, pero da resultados
 * distintos a 60 Hz y a 120 Hz: en un monitor rápido la animación va casi el
 * doble de rápida. La forma exponencial fija el comportamiento en segundos.
 */
const suavizar = (actual: number, objetivo: number, dt: number, rapidez = 8) =>
	actual + (objetivo - actual) * (1 - Math.exp(-dt * rapidez))

export function ProveedorEscena({ children }: { children: ReactNode }) {
	const estado = useRef<EstadoEscena>({
		crudo: 0,
		suave: 0,
		velocidad: 0,
		alto: 0,
		hitos: [],
	})

	const escenario = useRef<HTMLElement | null>(null)
	const sinRegistrar = useRef<Map<string, Omit<Hito, "centro" | "alto">>>(new Map())
	const cuadro = useRef<number | null>(null)
	const ultimoTiempo = useRef(0)
	const ultimoScroll = useRef(0)

	/** Recalcula la geometría del escenario y la posición normalizada de cada hito. */
	const medir = useCallback(() => {
		const elemento = escenario.current
		if (!elemento) return

		const rect = elemento.getBoundingClientRect()
		const arriba = rect.top + window.scrollY
		// El recorrido útil termina cuando el final del escenario alcanza el final
		// del viewport, no cuando alcanza su inicio: si no, el último acto queda
		// fuera de pantalla justo cuando debería resolverse.
		const recorrido = Math.max(1, elemento.offsetHeight - window.innerHeight)

		estado.current.alto = elemento.offsetHeight

		const hitos: Hito[] = []
		for (const parcial of sinRegistrar.current.values()) {
			const r = parcial.elemento.getBoundingClientRect()
			const centroPx = r.top + window.scrollY - arriba + r.height / 2 - window.innerHeight / 2
			hitos.push({
				...parcial,
				centro: limitar(centroPx / recorrido),
				alto: r.height / elemento.offsetHeight,
			})
		}
		hitos.sort((a, b) => a.indice - b.indice)
		estado.current.hitos = hitos
	}, [])

	const registrarHito = useCallback(
		(hito: Omit<Hito, "centro" | "alto">) => {
			sinRegistrar.current.set(hito.id, hito)
			medir()
			return () => {
				sinRegistrar.current.delete(hito.id)
				medir()
			}
		},
		[medir],
	)

	const refEscenario = useCallback(
		(elemento: HTMLElement | null) => {
			escenario.current = elemento
			if (elemento) medir()
		},
		[medir],
	)

	useEffect(() => {
		const leerScroll = () => {
			const elemento = escenario.current
			if (!elemento) return
			const rect = elemento.getBoundingClientRect()
			const recorrido = Math.max(1, elemento.offsetHeight - window.innerHeight)
			estado.current.crudo = limitar(-rect.top / recorrido)
		}

		const paso = (tiempo: number) => {
			const dt = Math.min(0.05, (tiempo - ultimoTiempo.current) / 1000 || 0.016)
			ultimoTiempo.current = tiempo

			const s = estado.current
			const antes = s.suave
			s.suave = suavizar(s.suave, s.crudo, dt)
			s.velocidad = (s.suave - antes) / dt

			// El bucle se detiene solo. Mantener un rAF vivo con la página quieta
			// impide que el navegador baje de frecuencia y se nota en la batería.
			const asentado = Math.abs(s.crudo - s.suave) < 0.0001
			const quieto = tiempo - ultimoScroll.current > 250
			if (asentado && quieto) {
				s.suave = s.crudo
				s.velocidad = 0
				cuadro.current = null
				return
			}
			cuadro.current = requestAnimationFrame(paso)
		}

		const despertar = () => {
			ultimoScroll.current = performance.now()
			if (cuadro.current === null) {
				ultimoTiempo.current = performance.now()
				cuadro.current = requestAnimationFrame(paso)
			}
		}

		const alHacerScroll = () => {
			leerScroll()
			despertar()
		}

		let temporizador: ReturnType<typeof setTimeout>
		const alRedimensionar = () => {
			clearTimeout(temporizador)
			temporizador = setTimeout(() => {
				medir()
				leerScroll()
				despertar()
			}, 150)
		}

		leerScroll()
		estado.current.suave = estado.current.crudo

		window.addEventListener("scroll", alHacerScroll, { passive: true })
		window.addEventListener("resize", alRedimensionar)

		return () => {
			window.removeEventListener("scroll", alHacerScroll)
			window.removeEventListener("resize", alRedimensionar)
			clearTimeout(temporizador)
			if (cuadro.current !== null) cancelAnimationFrame(cuadro.current)
		}
	}, [medir])

	// Las fuentes web cambian el alto de los bloques al terminar de cargar. Sin
	// esto, los hitos quedan medidos contra la tipografía de respaldo.
	useEffect(() => {
		document.fonts?.ready.then(medir)
	}, [medir])

	const valor = useMemo<Contexto>(
		() => ({ estado, registrarHito, remedir: medir, refEscenario }),
		[registrarHito, medir, refEscenario],
	)

	return <EscenaContexto.Provider value={valor}>{children}</EscenaContexto.Provider>
}

export function useEscena() {
	const contexto = useContext(EscenaContexto)
	if (!contexto) throw new Error("useEscena debe usarse dentro de <ProveedorEscena>")
	return contexto
}

/**
 * Registra un bloque como hito de la escena.
 *
 * Devuelve un `ref` que hay que colgar del elemento. La curva que recorre la
 * esfera (fase L3) se construye con estas posiciones, de modo que agregar,
 * quitar o reordenar un bloque reacomoda la animación sin tocar código.
 */
export function useHito(id: string, indice: number) {
	const { registrarHito } = useEscena()
	const elemento = useRef<HTMLElement | null>(null)
	const limpiar = useRef<(() => void) | null>(null)

	return useCallback(
		(nodo: HTMLElement | null) => {
			limpiar.current?.()
			limpiar.current = null
			elemento.current = nodo
			if (nodo) limpiar.current = registrarHito({ id, indice, elemento: nodo })
		},
		[id, indice, registrarHito],
	)
}
