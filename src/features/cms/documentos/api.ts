import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import { manejarError } from "../api"
import type { ConfigDocumento } from "./config"

export interface VersionDocumento {
	id: number
	version: string
	hash_contenido: string
	vigente_desde: string
	vigente_hasta: string | null
	vigente: boolean
}

export interface VersionDocumentoCompleta extends VersionDocumento {
	/** Texto tal como se guardó: Markdown (versión inicial) o HTML (editadas en el panel). */
	contenido: string
}

export const useVersionesDocumento = (doc: ConfigDocumento) =>
	useQuery<VersionDocumento[]>({
		queryKey: ["documento-versiones", doc.clave],
		queryFn: async () => (await axios.get(doc.endpointVersiones)).data.data,
	})

export const useVersionDocumento = (doc: ConfigDocumento, version: string | undefined) =>
	useQuery<VersionDocumentoCompleta>({
		queryKey: ["documento-version", doc.clave, version],
		queryFn: async () =>
			(await axios.get(`${doc.endpointVersiones}/${encodeURIComponent(version!)}`)).data.data,
		enabled: !!version,
	})

export function usePublicarDocumento(doc: ConfigDocumento) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (contenido: string) =>
			(await axios.post(doc.endpointVersiones, { contenido })).data.data as { version: string },
		onSuccess: (nueva) => {
			toast.success(`${doc.titulo} publicado como versión ${nueva.version}`)
			queryClient.invalidateQueries({ queryKey: ["documento-versiones", doc.clave] })
			queryClient.invalidateQueries({ queryKey: ["documento-version", doc.clave] })
			// Las páginas públicas guardan el texto en caché unos minutos.
			queryClient.invalidateQueries({ queryKey: ["fetchData", ENDPOINTS.avisoPrivacidad] })
			queryClient.invalidateQueries({ queryKey: ["fetchData", ENDPOINTS.consentimientoVigente] })
		},
		onError: (e) => manejarError(e, `No fue posible publicar el documento (${doc.titulo})`),
	})
}
