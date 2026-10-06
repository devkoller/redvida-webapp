import type { Seccion } from "./guion"

interface BloqueCms {
	tipo: string
	contenido: Record<string, any>
}

/**
 * Tipo de bloque del CMS que corresponde a cada tipo de sección del guion.
 * Solo `texto` cambia de nombre: en el CMS ya existe un bloque `texto` distinto
 * (título + cuerpo), así que el de entrada y apartados se llama `texto_apartados`.
 */
const TIPO_CMS: Record<Seccion["tipo"], string> = {
	hero: "hero",
	manifiesto: "manifiesto",
	texto: "texto_apartados",
	estadisticas: "estadisticas",
	timeline: "timeline",
	tarjetas: "tarjetas",
	lista: "lista",
	cierre: "cierre",
	cta: "cta",
}

/** Campos de gestión del CMS que no son contenido de la sección. */
const GESTION = ["ancla", "nav", "capitulo"]

/**
 * Pone los **textos del CMS** sobre el guion.
 *
 * La estructura de la landing narrativa —qué secciones hay, en qué orden, de
 * qué lado va el texto, cuánto dura cada una, dónde está la esfera— vive en el
 * guion, porque la escena 3D está construida sobre ella. Del CMS salen los
 * **textos**: cada bloque se asocia con su sección por `ancla` (= `id` de la
 * sección) y debe ser del tipo que esa sección espera.
 *
 * Una sección sin bloque coincidente conserva el texto del guion: el sitio no
 * puede quedarse con huecos si el CMS está incompleto o caído.
 */
export function aplicarCms(guion: Seccion[], bloques: BloqueCms[]): Seccion[] {
	const porAncla = new Map(bloques.map((b) => [String(b.contenido?.ancla ?? ""), b]))

	return guion.map((seccion) => {
		const bloque = porAncla.get(seccion.id)
		if (!bloque || bloque.tipo !== TIPO_CMS[seccion.tipo]) return seccion

		const contenido = Object.fromEntries(
			Object.entries(bloque.contenido).filter(([clave]) => !GESTION.includes(clave)),
		)
		// En el CMS cada punto es un objeto (la lista de campos solo admite
		// elementos con campos); el componente espera el texto.
		if (seccion.tipo === "lista" && Array.isArray(contenido.puntos)) {
			contenido.puntos = contenido.puntos.map((p: any) => (typeof p === "string" ? p : p?.texto ?? ""))
		}

		const capitulo = String(bloque.contenido?.capitulo ?? "") || seccion.capitulo
		return { ...seccion, capitulo, contenido }
	})
}
