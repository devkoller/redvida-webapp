import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import type { BloqueCms, PaginaCms, VersionCms } from "./data/schema"

/** Mensaje del servidor, con el detalle campo por campo cuando la validación lo trae. */
export const manejarError = (error: unknown, porOmision: string) => {
	if (axios.isAxiosError(error)) {
		const cuerpo = error.response?.data
		const detalle = Array.isArray(cuerpo?.cause)
			? ` (${cuerpo.cause.map((e: any) => `${e.campo}: ${e.mensaje}`).join("; ")})`
			: ""
		toast.error((cuerpo?.message ?? porOmision) + detalle)
		return
	}
	toast.error(porOmision)
}

export const usePaginas = () =>
	useQuery<PaginaCms[]>({
		queryKey: ["cms-paginas"],
		queryFn: async () => (await axios.get(`${API_URL}${ENDPOINTS.cmsPaginas}`)).data.data,
	})

export const useBorrador = (paginaId: number) =>
	useQuery<{ pagina: PaginaCms; bloques: BloqueCms[] }>({
		queryKey: ["cms-bloques", paginaId],
		queryFn: async () => (await axios.get(`${API_URL}${ENDPOINTS.cmsBloques(paginaId)}`)).data.data,
	})

export const useVersiones = (paginaId: number) =>
	useQuery<VersionCms[]>({
		queryKey: ["cms-versiones", paginaId],
		queryFn: async () => (await axios.get(`${API_URL}${ENDPOINTS.cmsVersiones(paginaId)}`)).data.data,
	})

/** Contenido mínimo por tipo: la API valida, así que el bloque nace con lo indispensable. */
const SEMILLAS: Record<string, Record<string, unknown>> = {
	hero: { titulo: "Nuevo título", cta_texto: "Registrarme", cta_url: "/registro" },
	estadisticas: { cifras: [{ valor: "0", etiqueta: "Descripción" }] },
	texto: { titulo: "Nuevo bloque", contenido: "<p>Escriba aquí.</p>" },
	timeline: { pasos: [{ titulo: "Paso 1", texto: "<p>Descripción</p>" }] },
	tarjetas: { tarjetas: [{ titulo: "Punto", texto: "<p>Descripción</p>" }] },
	testimonios: { testimonios: [{ cita: "<p>Cita</p>", autor: "Autor" }] },
	faq: { preguntas: [{ pregunta: "¿Pregunta?", respuesta: "<p>Respuesta</p>" }] },
	cta: { titulo: "Llamada a la acción", cta_texto: "Registrarme", cta_url: "/registro" },
	html: { html: "<p>HTML</p>" },
}

/** Todas las operaciones sobre una página. Editar nunca publica: eso es `publicar`. */
export function useOperacionesPagina(paginaId: number) {
	const queryClient = useQueryClient()
	const refrescar = () => {
		queryClient.invalidateQueries({ queryKey: ["cms-bloques", paginaId] })
		queryClient.invalidateQueries({ queryKey: ["cms-paginas"] })
		queryClient.invalidateQueries({ queryKey: ["cms-versiones", paginaId] })
	}

	return {
		guardarBloque: useMutation({
			mutationFn: async ({ id, contenido }: { id: number; contenido: Record<string, any> }) => {
				await axios.patch(`${API_URL}${ENDPOINTS.cmsBloque(id)}`, { contenido })
			},
			onSuccess: () => {
				toast.success("Bloque guardado. Recuerde publicar para que se vea en el sitio")
				refrescar()
			},
			onError: (e) => manejarError(e, "No fue posible guardar el bloque"),
		}),
		crearBloque: useMutation({
			mutationFn: async (tipo: string): Promise<{ id?: number }> => {
				const { data } = await axios.post(`${API_URL}${ENDPOINTS.cmsBloques(paginaId)}`, {
					tipo,
					contenido: SEMILLAS[tipo] ?? {},
				})
				return data.data
			},
			onSuccess: () => {
				toast.success("Bloque agregado al borrador")
				refrescar()
			},
			onError: (e) => manejarError(e, "No fue posible agregar el bloque"),
		}),
		eliminarBloque: useMutation({
			mutationFn: async (id: number) => {
				await axios.delete(`${API_URL}${ENDPOINTS.cmsBloque(id)}`)
			},
			onSuccess: () => {
				toast.success("Bloque eliminado del borrador")
				refrescar()
			},
			onError: (e) => manejarError(e, "No fue posible eliminar el bloque"),
		}),
		alternarVisible: useMutation({
			mutationFn: async ({ id, visible }: { id: number; visible: boolean }) => {
				await axios.patch(`${API_URL}${ENDPOINTS.cmsBloque(id)}`, { visible })
			},
			onSuccess: refrescar,
			onError: (e) => manejarError(e, "No fue posible cambiar la visibilidad"),
		}),
		reordenar: useMutation({
			mutationFn: async (orden: number[]) => {
				await axios.patch(`${API_URL}${ENDPOINTS.cmsOrden(paginaId)}`, { orden })
			},
			onSuccess: refrescar,
			onError: (e) => manejarError(e, "No fue posible reordenar"),
		}),
		publicar: useMutation({
			mutationFn: async (comentario: string) => {
				const { data } = await axios.post(`${API_URL}${ENDPOINTS.cmsPublicar(paginaId)}`, {
					comentario: comentario.trim() || null,
				})
				return data.data as { numero_version: number }
			},
			onSuccess: (data) => {
				toast.success(`Publicado como versión ${data.numero_version}. El sitio ya lo muestra`)
				refrescar()
			},
			onError: (e) => manejarError(e, "No fue posible publicar"),
		}),
		revertir: useMutation({
			mutationFn: async (versionId: number) => {
				const { data } = await axios.post(`${API_URL}${ENDPOINTS.cmsRevertir(paginaId, versionId)}`)
				return data.data as { revertido_desde: number }
			},
			onSuccess: (data) => {
				toast.success(`Revertido a la versión ${data.revertido_desde}`)
				refrescar()
			},
			onError: (e) => manejarError(e, "No fue posible revertir"),
		}),
	}
}
