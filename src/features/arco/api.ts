import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"

export type TipoArco =
	| "acceso"
	| "rectificacion"
	| "cancelacion"
	| "oposicion"
	| "portabilidad"
	| "revocacion"

export type EstatusArco =
	| "recibida"
	| "en_analisis"
	| "prevencion"
	| "procedente"
	| "improcedente"
	| "atendida"

export type Semaforo = "verde" | "ambar" | "rojo" | "cerrada"

export interface Derecho {
	clave: TipoArco
	titulo: string
	descripcion: string
}

export interface AcuseSolicitud {
	folio: string
	tipo: TipoArco
	fecha_limite_respuesta: string
	plazo_dias_habiles: number
	plazo_confirmado: boolean
}

export interface EstadoSolicitud {
	folio: string
	tipo: TipoArco
	estatus: EstatusArco
	fecha_solicitud: string
	fecha_limite_respuesta: string
	fecha_respuesta: string | null
	respuesta: string | null
	semaforo: Semaforo
}

export interface SolicitudBandeja {
	id: string
	folio: string
	tipo: TipoArco
	estatus: EstatusArco
	solicitante_nombre: string
	solicitante_email: string
	vinculada: boolean
	fecha_solicitud: string
	fecha_limite_respuesta: string
	fecha_respuesta: string | null
	semaforo: Semaforo
}

export interface ResumenBandeja {
	abiertas: number
	verde: number
	ambar: number
	rojo: number
	requiere_atencion: boolean
}

export const listarDerechos = () => fetchApi.get<Derecho[]>(ENDPOINTS.arcoDerechos)

export const crearSolicitud = (cuerpo: {
	tipo: TipoArco
	solicitante_nombre: string
	solicitante_email: string
	solicitante_telefono?: string
	descripcion: string
	codigo_registro?: string
}) => fetchApi.post<AcuseSolicitud>(ENDPOINTS.arcoSolicitud, cuerpo)

export const consultarFolio = (folio: string) =>
	fetchApi.get<EstadoSolicitud>(ENDPOINTS.arcoFolio(folio))

export const listarBandeja = (qs: Record<string, unknown>) =>
	fetchApi.get<{
		solicitudes: SolicitudBandeja[]
		total: number
		pagina: number
		por_pagina: number
	}>(ENDPOINTS.arco, { qs })

export const resumenBandeja = () => fetchApi.get<ResumenBandeja>(ENDPOINTS.arcoResumen)

export const resolverSolicitud = (
	id: string,
	cuerpo: { estatus: EstatusArco; respuesta?: string; codigo_registro?: string },
) => fetchApi.patch(ENDPOINTS.arcoSolicitudAdmin(id), cuerpo)

export const revocar = (id: string, cuerpo: { alcance: "total" | "solo_contacto"; motivo?: string }) =>
	fetchApi.post(ENDPOINTS.arcoRevocar(id), cuerpo)

/** Etiquetas de interfaz. Se mantienen aquí para no repetirlas en cada pantalla. */
export const ETIQUETA_TIPO: Record<TipoArco, string> = {
	acceso: "Acceso",
	rectificacion: "Rectificación",
	cancelacion: "Cancelación",
	oposicion: "Oposición",
	portabilidad: "Portabilidad",
	revocacion: "Revocación",
}

export const ETIQUETA_ESTATUS: Record<EstatusArco, string> = {
	recibida: "Recibida",
	en_analisis: "En análisis",
	prevencion: "Prevención",
	procedente: "Procedente",
	improcedente: "Improcedente",
	atendida: "Atendida",
}
