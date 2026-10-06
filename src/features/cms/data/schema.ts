export interface PaginaCms {
	id: number
	slug: string
	titulo: string
	meta_descripcion: string | null
	version_publicada_id: number | null
	editable: boolean
	updatedAt: string
	total_bloques: number
	version_publicada: { id: number; numero_version: number; fecha_publicacion: string } | null
	ultima_edicion: string | null
	tiene_cambios_sin_publicar: boolean
}

export interface BloqueCms {
	id: number
	pagina_id: number
	tipo: string
	orden: number
	contenido: Record<string, any>
	visible: boolean
	updatedAt: string
}

export interface VersionCms {
	id: number
	numero_version: number
	estado: string
	comentario: string | null
	publicado_por: number | null
	fecha_publicacion: string
	es_vigente: boolean
}

export interface MedioCms {
	id: number
	nombre_archivo: string
	nombre_original: string | null
	ruta: string
	mime_type: string
	tamano_bytes: string
	ancho: number | null
	alto: number | null
	texto_alt: string
	derivados: Record<string, string>
	createdAt: string
}

/**
 * Descripción de cada tipo de bloque para el panel.
 *
 * `campos` describe el formulario a generar. Es un espejo de
 * `bloques.schema.ts` del servidor: al agregar un tipo hay que tocar ambos.
 * **La autoridad es el servidor** — si el formulario deja pasar algo inválido,
 * la API lo rechaza y el bloque no se guarda.
 */
/** `codigo`: HTML crudo (bloque «HTML libre»); un editor visual lo desfiguraría. */
export type TipoCampo = "texto" | "rico" | "url" | "lista" | "codigo"

export interface CampoBloque {
	clave: string
	etiqueta: string
	tipo: TipoCampo
	ayuda?: string
	/** Solo para `lista`: campos de cada elemento */
	elemento?: { clave: string; etiqueta: string; tipo: TipoCampo }[]
}

/**
 * Campos de navegación, comunes a todos los tipos.
 *
 * Se añaden en un único punto (ver `conNavegacion` al final) igual que en
 * `bloques.schema.ts` del servidor: al agregar un tipo nuevo no hay que
 * acordarse de incluirlos, y no pueden quedarse desparejados entre ambos lados.
 */
const CAMPOS_NAVEGACION: CampoBloque[] = [
	{
		clave: "ancla",
		etiqueta: "Ancla de la sección",
		tipo: "texto",
		ayuda:
			"Id para enlazar directo, por ejemplo «requisitos» permite /#requisitos. Se normaliza al guardar.",
	},
	{
		clave: "nav",
		etiqueta: "Etiqueta en el menú",
		tipo: "texto",
		ayuda: "Si se deja vacío, la sección no aparece en el menú del encabezado.",
	},
	{
		clave: "capitulo",
		etiqueta: "Rótulo de capítulo",
		tipo: "texto",
		ayuda: "Por ejemplo «01 · Qué es RedVida». Solo la landing narrativa lo muestra.",
	},
]

const BLOQUES: Record<string, { etiqueta: string; descripcion: string; campos: CampoBloque[] }> = {
	hero: {
		etiqueta: "Portada",
		descripcion: "El encabezado principal con título, texto y botón",
		campos: [
			{ clave: "antetitulo", etiqueta: "Línea sobre el título", tipo: "texto", ayuda: "Opcional. Solo la landing narrativa la muestra." },
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "subtitulo", etiqueta: "Texto de apoyo", tipo: "rico" },
			{ clave: "cta_texto", etiqueta: "Texto del botón", tipo: "texto" },
			{
				clave: "cta_url",
				etiqueta: "Destino del botón",
				tipo: "url",
				ayuda: "Por ejemplo /registro",
			},
			{
				clave: "imagen_url",
				etiqueta: "Foto",
				tipo: "url",
				ayuda: "Ruta bajo /, por ejemplo /fotos/hero.jpg. Vacío = sin foto.",
			},
			{ clave: "nota", etiqueta: "Nota al pie", tipo: "texto" },
		],
	},
	estadisticas: {
		etiqueta: "Cifras",
		descripcion: "Datos destacados en cuadrícula",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "descripcion", etiqueta: "Introducción", tipo: "rico", ayuda: "Opcional. Solo la landing narrativa la muestra." },
			{
				clave: "cifras",
				etiqueta: "Cifras",
				tipo: "lista",
				elemento: [
					{ clave: "valor", etiqueta: "Valor", tipo: "texto" },
					{ clave: "etiqueta", etiqueta: "Descripción", tipo: "texto" },
					{ clave: "icono", etiqueta: "Icono (lucide-react)", tipo: "texto" },
				],
			},
		],
	},
	texto: {
		etiqueta: "Texto",
		descripcion: "Un bloque de texto con título opcional",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "contenido", etiqueta: "Contenido", tipo: "rico" },
		],
	},
	texto_imagen: {
		etiqueta: "Texto con foto",
		descripcion: "Un bloque de texto acompañado de una imagen a un lado",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "contenido", etiqueta: "Contenido", tipo: "rico" },
			{
				clave: "imagen_url",
				etiqueta: "Foto",
				tipo: "url",
				ayuda: "Ruta bajo /, por ejemplo /fotos/celulas.jpg. Vacío = sin foto.",
			},
			{
				clave: "posicion_imagen",
				etiqueta: "Lado de la foto",
				tipo: "texto",
				ayuda: '"izquierda" o "derecha". Cualquier otro valor se trata como "derecha".',
			},
		],
	},
	timeline: {
		etiqueta: "Pasos",
		descripcion: "Secuencia numerada de pasos",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "descripcion", etiqueta: "Introducción", tipo: "rico" },
			{
				clave: "pasos",
				etiqueta: "Pasos",
				tipo: "lista",
				elemento: [
					{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
					{ clave: "texto", etiqueta: "Descripción", tipo: "rico" },
					{ clave: "icono", etiqueta: "Icono", tipo: "texto" },
				],
			},
		],
	},
	tarjetas: {
		etiqueta: "Tarjetas",
		descripcion: "Lista de puntos con icono",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "descripcion", etiqueta: "Introducción", tipo: "rico" },
			{
				clave: "tarjetas",
				etiqueta: "Tarjetas",
				tipo: "lista",
				elemento: [
					{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
					{ clave: "texto", etiqueta: "Descripción", tipo: "rico" },
					{ clave: "icono", etiqueta: "Icono", tipo: "texto" },
				],
			},
		],
	},
	testimonios: {
		etiqueta: "Testimonios",
		descripcion: "Citas de donadores o receptores",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{
				clave: "testimonios",
				etiqueta: "Testimonios",
				tipo: "lista",
				elemento: [
					{ clave: "cita", etiqueta: "Cita", tipo: "rico" },
					{ clave: "autor", etiqueta: "Autor", tipo: "texto" },
					{ clave: "rol", etiqueta: "Rol", tipo: "texto" },
				],
			},
		],
	},
	faq: {
		etiqueta: "Preguntas frecuentes",
		descripcion: "Acordeón de pregunta y respuesta",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{
				clave: "preguntas",
				etiqueta: "Preguntas",
				tipo: "lista",
				elemento: [
					{ clave: "pregunta", etiqueta: "Pregunta", tipo: "texto" },
					{ clave: "respuesta", etiqueta: "Respuesta", tipo: "rico" },
				],
			},
		],
	},
	cta: {
		etiqueta: "Llamada a la acción",
		descripcion: "Bloque destacado con botón",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "texto", etiqueta: "Texto", tipo: "rico" },
			{ clave: "cta_texto", etiqueta: "Texto del botón", tipo: "texto" },
			{ clave: "cta_url", etiqueta: "Destino del botón", tipo: "url" },
			{
				clave: "imagen_url",
				etiqueta: "Foto de fondo",
				tipo: "url",
				ayuda: "Ruta bajo /, por ejemplo /fotos/banner.jpg. Vacío = tarjeta de color sólido.",
			},
			{ clave: "nota", etiqueta: "Nota bajo el botón", tipo: "texto", ayuda: "Opcional. Solo la landing narrativa la muestra." },
		],
	},
	manifiesto: {
		etiqueta: "Frase destacada",
		descripcion: "Una frase a toda página con un pie opcional (landing narrativa)",
		campos: [
			{ clave: "texto", etiqueta: "Frase", tipo: "texto" },
			{ clave: "pie", etiqueta: "Pie", tipo: "rico" },
		],
	},
	texto_apartados: {
		etiqueta: "Texto con apartados",
		descripcion: "Una entrada y varios apartados con subtítulo (landing narrativa)",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "entrada", etiqueta: "Entrada", tipo: "rico" },
			{
				clave: "apartados",
				etiqueta: "Apartados",
				tipo: "lista",
				elemento: [
					{ clave: "subtitulo", etiqueta: "Subtítulo", tipo: "texto" },
					{ clave: "texto", etiqueta: "Texto", tipo: "rico" },
				],
			},
		],
	},
	lista: {
		etiqueta: "Lista de puntos",
		descripcion: "Puntos con una marca, p. ej. los requisitos (landing narrativa)",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "descripcion", etiqueta: "Introducción", tipo: "rico" },
			{
				clave: "puntos",
				etiqueta: "Puntos",
				tipo: "lista",
				elemento: [{ clave: "texto", etiqueta: "Texto", tipo: "rico" }],
			},
			{ clave: "nota", etiqueta: "Nota al final", tipo: "texto" },
		],
	},
	cierre: {
		etiqueta: "Cierre",
		descripcion: "Título grande y una frase, antes de la llamada final (landing narrativa)",
		campos: [
			{ clave: "titulo", etiqueta: "Título", tipo: "texto" },
			{ clave: "texto", etiqueta: "Texto", tipo: "rico" },
		],
	},
	html: {
		etiqueta: "HTML libre",
		descripcion: "Solo para administradores. Se sanitiza al guardar",
		campos: [{ clave: "html", etiqueta: "HTML", tipo: "codigo" }],
	},
}

/** Añade los campos de navegación a cada tipo, sin repetirlos uno por uno. */
export const TIPOS_BLOQUE: Record<
	string,
	{ etiqueta: string; descripcion: string; campos: CampoBloque[] }
> = Object.fromEntries(
	Object.entries(BLOQUES).map(([tipo, definicion]) => [
		tipo,
		{ ...definicion, campos: [...definicion.campos, ...CAMPOS_NAVEGACION] },
	]),
)

/**
 * Página de la landing narrativa. Sus textos salen del CMS, pero su estructura
 * (secciones, orden, coreografía de la escena 3D) vive en el código y se
 * asocia a cada bloque por su `ancla`: aquí se editan **textos**, no se agregan,
 * quitan ni reordenan secciones.
 */
export const SLUG_NARRATIVA = "propuesta-1"

/** Tipos que solo entiende la landing narrativa: no se ofrecen en otras páginas. */
export const TIPOS_SOLO_NARRATIVA = ["manifiesto", "texto_apartados", "lista", "cierre"]

/** Campos de gestión que no se editan en la landing narrativa: `ancla` es el vínculo con su sección. */
export const CAMPOS_OCULTOS_NARRATIVA = ["ancla", "nav"]

/** Campos que solo tienen sentido en la landing narrativa. */
export const CAMPOS_SOLO_NARRATIVA = ["capitulo", "antetitulo"]
