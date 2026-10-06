import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { archivoDeLogo, esLogo, LOGO_POR_OMISION, type LogoId } from "@/lib/logos"
import { PALETA_POR_OMISION, esPaleta, type PaletaId } from "@/lib/temas"

type Theme = "light" | "dark" | "system"

interface ThemeProviderState {
	theme: Theme
	setTheme: (theme: Theme) => void
	resolved: "light" | "dark"
	paleta: PaletaId
	setPaleta: (paleta: PaletaId) => void
	logo: LogoId
	setLogo: (logo: LogoId) => void
}

const ALMACEN = "redvida-theme"
export const ALMACEN_PALETA = "redvida-paleta"
export const ALMACEN_LOGO = "redvida-logo"
/** Id del `<link>` de favicon en `index.html`; el efecto de logo lo reapunta. */
export const ID_FAVICON = "favicon-link"

const ThemeContext = createContext<ThemeProviderState>({
	theme: "system",
	setTheme: () => undefined,
	resolved: "light",
	paleta: PALETA_POR_OMISION,
	setPaleta: () => undefined,
	logo: LOGO_POR_OMISION,
	setLogo: () => undefined,
})

/**
 * Tema de la página: tres ejes independientes.
 *
 * - `theme` decide claro u oscuro. Por omisión `system`, que respeta lo que la
 *   persona ya eligió en su dispositivo en vez de imponer un modo.
 * - `paleta` decide la combinación de color de marca. Cada paleta trae sus
 *   propias versiones clara y oscura, así que los dos ejes se combinan sin
 *   pisarse: elegir "biotecnología" no obliga a salir del modo oscuro.
 * - `logo` decide cuál de las 3 propuestas de imagen sustituye a la insignia
 *   de texto "RV" en encabezado, pie y panel — y también el ícono de la
 *   pestaña del navegador, que es el único lugar de los cuatro que no puede
 *   leer clases de Tailwind: se actualiza reapuntando `href` del `<link>` de
 *   favicon en `index.html` por su id (`ID_FAVICON`).
 *
 * Los tres se aplican al `<html>` (clase y `data-*`) y no a un contenedor,
 * para que alcancen también a lo que se renderiza en portales: menús, diálogos
 * y avisos quedan fuera del árbol de la aplicación.
 */
export function ThemeProvider({
	children,
	defaultTheme = "system",
}: {
	children: ReactNode
	defaultTheme?: Theme
}) {
	const [theme, setThemeState] = useState<Theme>(
		() => (localStorage.getItem(ALMACEN) as Theme) || defaultTheme,
	)
	const [resolved, setResolved] = useState<"light" | "dark">("light")
	const [paleta, setPaletaState] = useState<PaletaId>(() => {
		const guardada = localStorage.getItem(ALMACEN_PALETA)
		return esPaleta(guardada) ? guardada : PALETA_POR_OMISION
	})
	const [logo, setLogoState] = useState<LogoId>(() => {
		const guardado = localStorage.getItem(ALMACEN_LOGO)
		return esLogo(guardado) ? guardado : LOGO_POR_OMISION
	})

	useEffect(() => {
		const root = window.document.documentElement
		const media = window.matchMedia("(prefers-color-scheme: dark)")

		const aplicar = () => {
			const efectivo = theme === "system" ? (media.matches ? "dark" : "light") : theme
			root.classList.remove("light", "dark")
			root.classList.add(efectivo)
			setResolved(efectivo)
		}

		aplicar()
		// Si está en `system`, seguir los cambios del sistema operativo en vivo.
		if (theme === "system") {
			media.addEventListener("change", aplicar)
			return () => media.removeEventListener("change", aplicar)
		}
	}, [theme])

	useEffect(() => {
		const root = window.document.documentElement
		// La paleta institucional es la de `index.css`: se representa quitando el
		// atributo, no añadiendo un bloque que repita los mismos valores.
		if (paleta === PALETA_POR_OMISION) delete root.dataset.paleta
		else root.dataset.paleta = paleta
	}, [paleta])

	useEffect(() => {
		const root = window.document.documentElement
		if (logo === LOGO_POR_OMISION) delete root.dataset.logo
		else root.dataset.logo = logo

		// El favicon vive fuera del árbol de React (es un `<link>` estático de
		// `index.html`), así que se actualiza a mano por id en vez de con JSX.
		const enlace = document.getElementById(ID_FAVICON) as HTMLLinkElement | null
		if (enlace) {
			enlace.href = archivoDeLogo(logo) ?? "/favicon.svg"
			enlace.type = logo === LOGO_POR_OMISION ? "image/svg+xml" : "image/png"
		}
	}, [logo])

	const setTheme = (nuevo: Theme) => {
		localStorage.setItem(ALMACEN, nuevo)
		setThemeState(nuevo)
	}

	const setPaleta = (nueva: PaletaId) => {
		localStorage.setItem(ALMACEN_PALETA, nueva)
		setPaletaState(nueva)
	}

	const setLogo = (nuevo: LogoId) => {
		localStorage.setItem(ALMACEN_LOGO, nuevo)
		setLogoState(nuevo)
	}

	return (
		<ThemeContext.Provider value={{ theme, setTheme, resolved, paleta, setPaleta, logo, setLogo }}>
			{children}
		</ThemeContext.Provider>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
