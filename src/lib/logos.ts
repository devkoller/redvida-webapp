/**
 * Las 3 propuestas de logo que Red Vida puso a elegir.
 *
 * `actual` no es una propuesta: es la insignia de texto "RV" que la página ya
 * usa mientras nadie elige un logo. Los tres archivos son derivados —no los
 * que se subieron— generados por `docs/logos/procesar_logos.py`: recortados a
 * su contenido, centrados en un lienzo cuadrado del mismo tamaño relativo (para
 * que ninguno se vea más chico que otro por el margen que traía el original) y
 * con fondo realmente transparente, no blanco. `logo2` en particular llegó como
 * JPEG de fondo blanco sólido sin canal alfa; el proceso lo documenta.
 */
export const LOGOS = [
	{ id: "actual", nombre: "Insignia de texto", archivo: null },
	{ id: "1", nombre: "Propuesta 1", archivo: "/logos/logo-1.png" },
	{ id: "2", nombre: "Propuesta 2", archivo: "/logos/logo-2.png" },
	{ id: "3", nombre: "Propuesta 3", archivo: "/logos/logo-3.png" },
] as const

export type LogoId = (typeof LOGOS)[number]["id"]

export const LOGO_POR_OMISION: LogoId = "actual"

export function esLogo(valor: string | null): valor is LogoId {
	return LOGOS.some((l) => l.id === valor)
}

export function archivoDeLogo(id: LogoId): string | null {
	return LOGOS.find((l) => l.id === id)?.archivo ?? null
}
