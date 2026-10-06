import { useEffect, useState } from "react"

/**
 * Colores de la escena tomados del tema activo.
 *
 * El fondo del lienzo estaba escrito a mano (`#1a0a10`). Mientras solo existía
 * una paleta funcionaba, pero al poder elegir combinación de color el lienzo se
 * quedaba fijo mientras la página cambiaba alrededor: se leía como un agujero
 * pegado encima, justo lo contrario de lo que se buscaba.
 */

/**
 * Resuelve cualquier color CSS a `rgb(...)`.
 *
 * `getComputedStyle` devuelve los tokens tal cual se escribieron —en este
 * proyecto, `oklch(...)`— y `THREE.Color` no sabe leer oklch. En vez de
 * duplicar la conversión OKLCH→sRGB en el paquete, se pinta un píxel y se lee:
 * la hace el navegador, es exacta y sirve para cualquier formato que acepte CSS.
 */
function aRgb(color: string): string | null {
	if (!color) return null
	const lienzo = document.createElement("canvas")
	lienzo.width = lienzo.height = 1
	const ctx = lienzo.getContext("2d")
	if (!ctx) return null
	ctx.fillStyle = "#000"
	ctx.fillStyle = color
	ctx.fillRect(0, 0, 1, 1)
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
	return `rgb(${r}, ${g}, ${b})`
}

/**
 * Color de fondo efectivo del elemento, siguiendo los cambios de tema.
 *
 * Se observa `<html>` porque ahí es donde viven tanto la clase `dark` como
 * `data-paleta`: cambiar de combinación no vuelve a montar nada, así que sin
 * observador el lienzo conservaría el color de la paleta anterior.
 */
/**
 * Cualquier token de color del tema, resuelto a `rgb(...)` y siguiendo los
 * cambios de tema y de paleta.
 *
 * Mismo mecanismo que `useColorDeFondo` —pintar un píxel y leerlo, porque
 * `THREE.Color` no sabe de `oklch`— pero para un token cualquiera. Lo usa la
 * esfera, que necesita el color de marca para tener cuerpo en los temas claros.
 */
export function useColorDeToken(
	elemento: React.RefObject<HTMLElement | null>,
	token: string,
	respaldo: string,
): string {
	const [color, setColor] = useState(respaldo)

	useEffect(() => {
		const leer = () => {
			const nodo = elemento.current
			if (!nodo) return
			setColor(aRgb(getComputedStyle(nodo).getPropertyValue(token).trim()) ?? respaldo)
		}

		leer()
		const observador = new MutationObserver(leer)
		observador.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-paleta"],
		})
		return () => observador.disconnect()
	}, [elemento, token, respaldo])

	return color
}

export function useColorDeFondo(
	elemento: React.RefObject<HTMLElement | null>,
	respaldo = "#1a0a10",
): string {
	const [color, setColor] = useState(respaldo)

	useEffect(() => {
		const leer = () => {
			const nodo = elemento.current
			if (!nodo) return
			const resuelto = aRgb(getComputedStyle(nodo).backgroundColor)
			// Un contenedor transparente devuelve alfa 0; en ese caso el fondo real
			// lo pone un ancestro y el token es la fuente fiable.
			const token = aRgb(getComputedStyle(nodo).getPropertyValue("--background").trim())
			setColor(token ?? resuelto ?? respaldo)
		}

		leer()
		const observador = new MutationObserver(leer)
		observador.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-paleta"],
		})
		return () => observador.disconnect()
	}, [elemento, respaldo])

	return color
}
