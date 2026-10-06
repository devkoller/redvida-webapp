import { useQuery } from "@tanstack/react-query"
import axios from "axios"

import { API_URL, ENDPOINTS } from "@/api/config"
import type { ContenidoPagina } from "./tipos"

/**
 * Contenido publicado de cualquier página del CMS (`/preguntas`, etc.).
 *
 * Sin respaldo embebido: si falla, quien lo usa decide qué mostrar. La portada
 * (`features/propuesta-1`) cae a los textos de su guion; `/preguntas` ofrece
 * reintentar.
 */
export function useContenidoPagina(slug: string) {
	return useQuery<ContenidoPagina>({
		queryKey: ["contenido", slug],
		queryFn: async () => {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.contenido(slug)}`)
			return data.data
		},
		staleTime: 60_000,
		retry: 1,
	})
}
