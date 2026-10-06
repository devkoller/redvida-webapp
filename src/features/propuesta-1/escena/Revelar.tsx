import { useCallback, useRef, type ElementType, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { useAnimacionActiva } from "./preferencias"

/**
 * Revelado al entrar en el viewport · RV-L1.2
 *
 * Un **único** `IntersectionObserver` para toda la página, compartido por todos
 * los elementos. Instanciar uno por componente multiplica el trabajo del hilo
 * principal justo mientras se hace scroll, que es el peor momento posible.
 *
 * El revelado es de un solo sentido: una vez visible, el elemento no se vuelve a
 * ocultar al subir. Reanimar hacia atrás se ve como un parpadeo y molesta a
 * quien está releyendo algo.
 *
 * **Accesibilidad (§2.4.1 del plan):** esto anima `opacity` y `transform` desde
 * un estado que ya es legible. El contenido está en el DOM desde el primer
 * render y con `prefers-reduced-motion` no se le aplica ninguna clase de
 * animación: la regla CSS `.revelar` solo actúa bajo `[data-animacion="si"]`.
 */

type Devolucion = (visible: boolean) => void

let observador: IntersectionObserver | null = null
const suscritos = new WeakMap<Element, Devolucion>()

/**
 * El segundo observador: el que prepara, no el que revela · RV-L1.2c
 *
 * **El problema que resuelve.** `will-change: opacity, transform` estaba escrito
 * en la regla `.revelar` de la hoja de estilos, así que lo llevaban **los
 * sesenta y nueve bloques de la página desde el primer pintado** y no lo
 * soltaban hasta revelarse. `will-change` no es una sugerencia: el navegador
 * promueve el elemento a su propia capa de composición ahí mismo. Sesenta y
 * nueve capas retenidas en memoria de vídeo —varias de ellas además con un
 * `filter: blur()` en su estado inicial, que obliga a guardar la versión
 * desenfocada— compitiendo con el campo de estrellas por la misma tarjeta.
 *
 * Es la clase de coste que no se ve en un perfil como un pico: se ve como que la
 * página va bien y de pronto, al entrar en una sección, da un tirón.
 *
 * **La corrección no es quitar `will-change`**, que existe por algo: sin él, el
 * navegador crea la capa en el primer cuadro de la transición, y ese cuadro es
 * justo el que se quiere barato. Es **decirlo a tiempo y retirarlo después**.
 * Este observador va 500 px por delante del otro: promueve el bloque mientras
 * aún está fuera de pantalla, con tiempo de sobra, y el revelado se encuentra la
 * capa hecha. Al terminar la transición se suelta.
 *
 * En cualquier instante hay un puñado de elementos promovidos en vez de todos.
 */
let observadorPreparacion: IntersectionObserver | null = null
const preparados = new WeakMap<Element, () => void>()

function obtenerObservadorPreparacion() {
	if (observadorPreparacion) return observadorPreparacion
	observadorPreparacion = new IntersectionObserver(
		(entradas) => {
			for (const entrada of entradas) {
				if (!entrada.isIntersecting) continue
				preparados.get(entrada.target)?.()
				observadorPreparacion?.unobserve(entrada.target)
				preparados.delete(entrada.target)
			}
		},
		// Medio viewport de margen: suficiente para que la promoción ocurra en un
		// cuadro tranquilo, poco como para no tener media página promovida.
		{ rootMargin: "500px 0px 500px 0px" },
	)
	return observadorPreparacion
}

function obtenerObservador() {
	if (observador) return observador
	observador = new IntersectionObserver(
		(entradas) => {
			for (const entrada of entradas) {
				// Un elemento que ya quedó ARRIBA del viewport no está intersecando y
				// nunca volverá a entrar desde abajo: se revela de inmediato.
				//
				// Sin esto, recargar a media página, seguir un enlace con ancla o
				// restaurar la posición de scroll deja en blanco todo lo que quedó
				// por encima. Es el modo en que este patrón falla de verdad, y no se
				// ve nunca probando la página desde arriba.
				const yaPaso = entrada.boundingClientRect.bottom < 0
				if (!entrada.isIntersecting && !yaPaso) continue

				suscritos.get(entrada.target)?.(true)
				observador?.unobserve(entrada.target)
				suscritos.delete(entrada.target)
			}
		},
		{
			// Se dispara un poco antes de que el bloque toque el borde inferior:
			// la animación termina cuando el ojo llega, no después.
			rootMargin: "0px 0px -12% 0px",
			threshold: 0.1,
		},
	)
	return observador
}

/**
 * Gestos de entrada disponibles.
 *
 * Los cuatro primeros son genéricos; los cuatro últimos tienen carácter y se
 * reparten por tipo de sección — con el mismo desvanecido para todo, trece
 * secciones seguidas se leen como una sola lista larga.
 */
export type Variante =
	| "abajo"
	| "izquierda"
	| "derecha"
	| "escala"
	| "desvanecer"
	/** Emerge de la profundidad, desenfocada. Para títulos. */
	| "profundidad"
	/** Se levanta girando sobre su base. Para cifras. */
	| "pivote"
	/** Entra desde el margen exterior de la columna. Para listas y pasos. */
	| "margen"
	/** Se enfoca. Para las frases que van solas. */
	| "enfoque"

export function Revelar({
	children,
	className,
	variante = "abajo",
	retraso = 0,
	como: Como = "div",
	...resto
}: {
	children: ReactNode
	className?: string
	variante?: Variante
	/** Retraso en milisegundos. Para escalonar los elementos de una lista. */
	retraso?: number
	como?: ElementType
} & Record<string, any>) {
	// TypeScript no puede resolver las props de una etiqueta que se decide en
	// tiempo de ejecución: al intersecar las de todos los elementos posibles,
	// cada prop acaba en `never`. La alternativa sería hacer el componente
	// genérico por etiqueta, que aquí no compra nada — esto solo envuelve.
	const Etiqueta = Como as any

	const { movimiento } = useAnimacionActiva()
	const limpiar = useRef<(() => void) | null>(null)

	const ref = useCallback(
		(nodo: HTMLElement | null) => {
			limpiar.current?.()
			limpiar.current = null
			if (!nodo || !movimiento) return

			const preparar = obtenerObservadorPreparacion()
			preparados.set(nodo, () => {
				nodo.style.willChange = "opacity, transform, filter"
			})
			preparar.observe(nodo)

			let plazo: ReturnType<typeof setTimeout> | undefined
			const obs = obtenerObservador()
			suscritos.set(nodo, () => {
				nodo.setAttribute("data-visible", "true")
				// Soltar la capa al acabar. Un `transitionend` sería más exacto, pero
				// llega una vez por propiedad animada —opacidad, transformada y
				// desenfoque— y habría que contarlas; el tiempo es conocido y fijo.
				plazo = setTimeout(() => {
					nodo.style.willChange = ""
				}, 750 + retraso)
			})
			obs.observe(nodo)

			limpiar.current = () => {
				clearTimeout(plazo)
				preparar.unobserve(nodo)
				preparados.delete(nodo)
				obs.unobserve(nodo)
				suscritos.delete(nodo)
			}
		},
		[movimiento, retraso],
	)

	return (
		<Etiqueta
			ref={ref}
			className={cn(movimiento && "revelar", className)}
			data-variante={movimiento ? variante : undefined}
			style={retraso ? { transitionDelay: `${retraso}ms` } : undefined}
			{...resto}
		>
			{children}
		</Etiqueta>
	)
}

export default Revelar
