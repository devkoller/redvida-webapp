import { useSyncExternalStore } from "react"

/**
 * Preferencias de movimiento y capacidad del equipo · RV-L1.6 · RV-L5.2
 *
 * Una sola pregunta gobierna toda la landing: **¿esta persona debe ver
 * animación?** La responde `useAnimacionActiva()`, y de ella dependen tanto los
 * revelados al scroll como el montaje del lienzo 3D.
 *
 * Dos fuentes, y ningún botón en la página:
 *
 * 1. `prefers-reduced-motion` del sistema operativo: quien lo activó pidió que
 *    nada se mueva, y es un requisito de accesibilidad, no un gusto.
 * 2. La capacidad del equipo y de la conexión (WebGL, memoria, ahorro de datos).
 */

/**
 * Antes había un interruptor manual (guardado en `localStorage`) para apagar la
 * animación. Se quitó, pero quien lo había pulsado conservaba la elección
 * guardada y seguía viendo la versión sin animación sin poder cambiarla. Se
 * borra una vez al cargar.
 */
try {
	localStorage.removeItem("redvida:animacion")
} catch {
	/* Safari en navegación privada lanza al tocar localStorage. */
}

// -----------------------------------------------------------------------------
// Preferencia del sistema
// -----------------------------------------------------------------------------

const consulta = () =>
	typeof window !== "undefined" && typeof window.matchMedia === "function"
		? window.matchMedia("(prefers-reduced-motion: reduce)")
		: null

function suscribirSistema(oyente: () => void) {
	const mq = consulta()
	mq?.addEventListener("change", oyente)
	return () => mq?.removeEventListener("change", oyente)
}

export function usePrefiereMenosMovimiento(): boolean {
	return useSyncExternalStore(
		suscribirSistema,
		() => consulta()?.matches ?? false,
		() => false,
	)
}

// -----------------------------------------------------------------------------
// Capacidad del equipo
// -----------------------------------------------------------------------------

let cacheWebgl: boolean | null = null

/** ¿Hay WebGL2 utilizable? Se prueba una vez y se recuerda: crear el contexto no es gratis. */
export function hayWebgl(): boolean {
	if (cacheWebgl !== null) return cacheWebgl
	try {
		const lienzo = document.createElement("canvas")
		cacheWebgl = Boolean(lienzo.getContext("webgl2"))
	} catch {
		cacheWebgl = false
	}
	return cacheWebgl
}

/**
 * ¿Conviene montar la escena 3D en este equipo?
 *
 * Es una heurística, no una medición. Prefiere el falso negativo: quien tenga un
 * teléfono modesto ve la ilustración estática, que es mejor experiencia que una
 * escena a 12 fps. Ninguna de estas señales existe en Safari, así que ahí la
 * decisión recae en `hayWebgl()` y en el límite de `dpr` del lienzo.
 */
export function equipoSuficiente(): boolean {
	if (!hayWebgl()) return false

	const nav = navigator as Navigator & {
		deviceMemory?: number
		connection?: { saveData?: boolean; effectiveType?: string }
	}

	if (nav.connection?.saveData) return false
	if (nav.connection?.effectiveType && /^(slow-)?2g$/.test(nav.connection.effectiveType))
		return false
	if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false
	if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 4) return false

	return true
}

// -----------------------------------------------------------------------------
// La pregunta que importa
// -----------------------------------------------------------------------------

/**
 * `movimiento` gobierna los revelados del DOM; `escena` además exige que el
 * equipo dé para WebGL. Son distintos: un teléfono de gama baja puede animar
 * opacidades sin despeinarse y aun así no querer una escena 3D.
 */
export function useAnimacionActiva(): { movimiento: boolean; escena: boolean } {
	const menosMovimiento = usePrefiereMenosMovimiento()
	const movimiento = !menosMovimiento
	return { movimiento, escena: movimiento && equipoSuficiente() }
}
