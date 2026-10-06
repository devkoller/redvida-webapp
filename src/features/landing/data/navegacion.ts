import type { BloqueBase, ContenidoPagina } from "./tipos"

/**
 * Anclas de sección y menú de navegación, derivados del contenido del CMS.
 *
 * Antes el encabezado apuntaba a `#que-son`, `#como-donar`, `#requisitos` y
 * `#preguntas`, pero la landing rotula sus secciones `contenido-0`,
 * `contenido-1`… Ninguna de esas cuatro anclas existía en la página, así que
 * el menú no llevaba a ningún sitio.
 *
 * La causa de fondo es que el menú estaba escrito a mano y el contenido lo
 * decide el CMS: en cuanto alguien reordena o renombra un bloque, vuelven a
 * separarse. Por eso ahora ambos salen de la misma fuente.
 *
 * Este módulo es **puro**: sin React, sin red. Se comprueba con
 * `npx tsx src/features/landing/data/navegacion.check.ts`.
 */

/** Convierte un título en ancla utilizable: sin acentos, signos ni espacios. */
export function aAncla(texto: string): string {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

/**
 * Ancla de un bloque. `contenido.ancla` manda —es lo que el CMS puede fijar y
 * lo que hace que un enlace compartido siga funcionando aunque cambie el
 * título—; si no está, se deriva del título; y si tampoco hay título, se cae
 * al índice, que al menos es único.
 */
export function anclaDe(bloque: BloqueBase, indice: number): string {
	const explicita = bloque.contenido?.ancla
	if (typeof explicita === "string" && explicita.trim()) return aAncla(explicita)
	const titulo = bloque.contenido?.titulo
	if (typeof titulo === "string" && titulo.trim()) return aAncla(titulo)
	return `contenido-${indice}`
}

export interface EntradaMenu {
	ancla: string
	etiqueta: string
}

/**
 * Entradas del menú: solo los bloques que lo piden con `contenido.nav`.
 *
 * Es explícito y no automático a propósito. Una landing tiene ocho o diez
 * bloques y un menú con ocho entradas no orienta a nadie; que el CMS marque
 * cuáles merecen estar deja la decisión en quien edita el contenido.
 */
export function menuDe(contenido: ContenidoPagina): EntradaMenu[] {
	return contenido.bloques
		.map((bloque, indice) => {
			const etiqueta = bloque.contenido?.nav
			if (typeof etiqueta !== "string" || !etiqueta.trim()) return null
			return { ancla: anclaDe(bloque, indice), etiqueta: etiqueta.trim() }
		})
		.filter((entrada): entrada is EntradaMenu => entrada !== null)
}

/**
 * "Contacto" en el encabezado no sale del CMS: no hay un bloque de contacto
 * en el contenido —el propio diseño de Figma tampoco tenía una sección para
 * eso, solo el enlace en el menú— así que por ahora se manda al pie de
 * página, donde vive la información legal e institucional del sitio.
 */
export const ENLACE_CONTACTO: EntradaMenu = { ancla: "contacto", etiqueta: "Contacto" }
