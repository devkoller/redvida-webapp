import { API_URL, ENDPOINTS } from "@/api/config"

/**
 * Documentos legales versionados que se editan desde el panel.
 *
 * Los dos funcionan igual —cada edición publica una versión nueva e inmutable,
 * con la huella SHA-256 de su texto— y solo cambian el endpoint y los textos
 * que explican qué pasa al publicar.
 */
export interface ConfigDocumento {
	clave: "aviso-privacidad" | "consentimiento"
	titulo: string
	descripcion: string
	/** Dónde se ve el documento publicado. */
	rutaPublica: string
	etiquetaPublica: string
	endpointVersiones: string
	/** Ruta base del documento en el panel. */
	rutaAdmin: string
	/** Qué pasa con quien ya se registró, para el aviso previo a publicar. */
	efecto: string
	marcadores?: string
}

export const AVISO_PRIVACIDAD: ConfigDocumento = {
	clave: "aviso-privacidad",
	titulo: "Aviso de privacidad",
	descripcion:
		"Documento legal versionado. Cada cambio crea una versión nueva; nunca se modifica una ya publicada.",
	rutaPublica: "/aviso-privacidad",
	etiquetaPublica: "Ver en el sitio",
	endpointVersiones: `${API_URL}${ENDPOINTS.avisoPrivacidad}/versiones`,
	rutaAdmin: "/admin/contenido/aviso-privacidad",
	efecto:
		"Cada donador queda ligado a la versión del aviso (y a su huella SHA-256) que aceptó al registrarse. Por eso editar no sobrescribe: publica una versión nueva, que aplica de inmediato a los registros siguientes. Las personas ya registradas conservan la que aceptaron.",
	marcadores: "[RAZÓN SOCIAL / INSTITUCIÓN], [DOMICILIO FISCAL], [CORREO ELECTRÓNICO] y [TELÉFONO]",
}

export const CONSENTIMIENTO: ConfigDocumento = {
	clave: "consentimiento",
	titulo: "Consentimiento informado",
	descripcion:
		"Texto que se lee y se firma en el paso 5 del registro. Cada cambio crea una versión nueva; nunca se modifica una ya firmada.",
	rutaPublica: "/registro",
	etiquetaPublica: "Ir al registro",
	endpointVersiones: `${API_URL}/consentimiento/admin/versiones`,
	rutaAdmin: "/admin/contenido/consentimiento",
	efecto:
		"La firma de cada persona queda ligada a la versión del documento y a su huella SHA-256: es la prueba de qué aceptó. Por eso editar no sobrescribe: publica una versión nueva, que se muestra de inmediato en el paso 5 del registro. Quien ya firmó conserva la que firmó, y quien esté firmando en este momento tendrá que recargar y leer el texto nuevo.",
}

export const DOCUMENTOS = [AVISO_PRIVACIDAD, CONSENTIMIENTO]
