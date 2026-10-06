import { useQuery } from "@tanstack/react-query"

import fetchApi, { type ApiError } from "@/api/fetchApi"

export interface UseFetchOptions {
	url: string
	qs?: Record<string, unknown>
	enabled?: boolean
	/** Milisegundos que el dato se considera fresco. Los catálogos casi no cambian. */
	staleTime?: number
}

/**
 * Lectura contra la API. Envuelve `useQuery` para que las pantallas no repitan
 * la construcción de `queryKey` ni el desempaquetado de la respuesta.
 *
 * Devuelve `{ response, loading, error, refetch }` — los mismos nombres que en
 * `sigma-webapp`, para que quien haya trabajado en aquel proyecto no tenga que
 * aprender otra convención.
 */
export function useFetch<T = unknown>({ url, qs, enabled = true, staleTime }: UseFetchOptions) {
	const { data, isLoading, isFetching, error, refetch, isError } = useQuery<T, ApiError>({
		queryKey: ["fetchData", url, qs ?? null],
		queryFn: ({ signal }) => fetchApi.get<T>(url, { qs, signal }),
		enabled,
		...(staleTime !== undefined ? { staleTime } : {}),
	})

	return {
		response: data ?? null,
		loading: isLoading,
		fetching: isFetching,
		error: error ?? null,
		isError,
		refetch,
	}
}

export default useFetch
