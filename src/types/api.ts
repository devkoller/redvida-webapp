/** Tipos de los recursos que devuelve `redvida-server`. */

export interface OpcionCatalogo {
	id: number
	clave: string
	nombre: string
	orden?: number
}

export interface EstadoCatalogo extends OpcionCatalogo {
	pais_id: number
	abreviatura?: string | null
}

export interface MunicipioCatalogo {
	id: number
	estado_id: number
	clave: string
	nombre: string
}

export interface RespuestaAlta {
	id: number
	codigo_registro: string
	estatus: string
	otp_enviado: boolean
	expira_en_minutos: number
	/** El correo y la CURP ya estaban registrados sin verificar: se retomó ese registro. */
	reanudado?: boolean
}

export interface RespuestaVerificacion {
	codigo_registro: string
	estatus: string
	email_verificado: boolean
	/** Sesión del donador para el resto del wizard. */
	token?: string
}

export interface PreguntaElegibilidad {
	clave: string
	texto: string
	requiereFecha: boolean
	/** Título del grupo en que se presenta. Lo decide el servidor. */
	seccion: string
	/**
	 * La pregunta no viene del documento de criterios de Red Vida y espera
	 * confirmación del área médica. El formulario la señala para poder pedir
	 * esa revisión durante las presentaciones.
	 */
	porConfirmar?: boolean
}

export interface CuestionarioElegibilidad {
	version: string
	preguntas: PreguntaElegibilidad[]
}

export interface MotivoElegibilidad {
	clave: string
	descripcion: string
	bloqueado_hasta?: string
}

export interface RespuestaElegibilidad {
	resultado: "apto" | "no_apto_temporal" | "no_apto_permanente"
	motivos: MotivoElegibilidad[]
	bloqueado_hasta: string | null
	version_cuestionario: string
	donador_id: number
	estatus: string
}

export type EstatusDonador =
	"pre_registro" | "verificado" | "elegible" | "tipificado" | "disponible" | "suspendido" | "baja"

export interface DocumentoConsentimiento {
	version: string
	contenido: string
	/** SHA-256 del texto exacto; se devuelve al firmar */
	hash: string
}

export interface RespuestaConsentimiento {
	id: string
	codigo_registro: string
	version_documento: string
	hash_documento: string
	pdf_hash: string
	fecha_aceptacion: string
	estatus: string
}

export interface AvisoPrivacidad {
	id: number | null
	version: string
	contenido: string
	hash: string
	vigente_desde: string | null
}

export interface EstatusRegistro {
	codigo_registro: string
	estatus: EstatusDonador
	email_verificado: boolean
	fecha_registro: string
	elegibilidad: {
		resultado: "apto" | "no_apto_temporal" | "no_apto_permanente"
		bloqueado_hasta: string | null
	} | null
}
