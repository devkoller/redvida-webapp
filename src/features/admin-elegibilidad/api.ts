import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"

export type TipoReglaElegibilidad = "permanente" | "temporal"

export interface PreguntaElegibilidad {
	id: number
	clave: string
	texto: string
	seccion: string
	tipo_regla: TipoReglaElegibilidad
	descripcion_descarte: string | null
	periodo_meses: number | null
	periodo_dias: number | null
	por_confirmar: boolean
	orden: number
	activo: boolean
	actualizado_por: number | null
}

export interface DatosPregunta {
	clave?: string
	texto: string
	seccion: string
	tipo_regla: TipoReglaElegibilidad
	descripcion_descarte?: string | null
	periodo_meses?: number | null
	periodo_dias?: number | null
	por_confirmar: boolean
}

export const listarPreguntas = () => fetchApi.get<PreguntaElegibilidad[]>(ENDPOINTS.elegibilidadPreguntas)

export const crearPregunta = (datos: DatosPregunta) =>
	fetchApi.post<PreguntaElegibilidad>(ENDPOINTS.elegibilidadPreguntas, datos)

export const actualizarPregunta = (id: number, cambios: Partial<DatosPregunta> & { activo?: boolean }) =>
	fetchApi.patch<PreguntaElegibilidad>(ENDPOINTS.elegibilidadPregunta(id), cambios)

export const eliminarPregunta = (id: number) => fetchApi.delete(ENDPOINTS.elegibilidadPregunta(id))

export const reordenarPreguntas = (ordenes: { id: number; orden: number }[]) =>
	fetchApi.put(ENDPOINTS.elegibilidadPreguntasOrden, { ordenes })
