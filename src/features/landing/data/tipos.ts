/** Tipos de bloque del CMS. Deben coincidir con `bloques.schema.ts` del servidor. */

export interface BloqueBase {
	tipo: string
	orden: number
	contenido: Record<string, any>
}

export interface ContenidoPagina {
	slug: string
	titulo: string
	meta_descripcion: string | null
	version: number
	publicado_en: string
	bloques: BloqueBase[]
}

/**
 * Contenido mínimo embebido en el bundle.
 *
 * **Fallback obligatorio (RV-7.5).** Si la API de contenido falla —está caída,
 * la red se cortó, la página aún no se publica— la landing renderiza esto en
 * vez de una página en blanco. El sitio público no puede depender de que el
 * CMS esté disponible: es la cara del proyecto y quien llega desde una campaña
 * debe poder registrarse aunque el panel esté fuera de servicio.
 *
 * Es deliberadamente corto: lo indispensable para entender de qué se trata y
 * llegar al registro.
 */
export const CONTENIDO_FALLBACK: ContenidoPagina = {
	slug: "inicio",
	titulo: "RedVida",
	meta_descripcion: null,
	version: 0,
	publicado_en: "",
	bloques: [
		{
			tipo: "hero",
			orden: 1,
			contenido: {
				titulo: "Sé la coincidencia que alguien está esperando",
				subtitulo:
					"<p>Un hisopo bucal y tres minutos pueden ser la única oportunidad de vida para una persona con leucemia.</p>",
				cta_texto: "Registrarme como donador",
				cta_url: "/registro",
				nota: "Gratuito · Voluntario · Puedes retirarte cuando quieras",
			},
		},
		{
			tipo: "cta",
			orden: 2,
			contenido: {
				titulo: "Tres minutos hoy. Una vida entera para alguien más.",
				texto: "<p>Solo necesitas tu CURP y un correo electrónico.</p>",
				cta_texto: "Registrarme como donador",
				cta_url: "/registro",
			},
		},
	],
}
