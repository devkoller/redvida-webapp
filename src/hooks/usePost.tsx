import { useMutation } from "@tanstack/react-query"

import fetchApi, { type ApiError } from "@/api/fetchApi"

export interface UsePostVariables {
	url: string
	body?: unknown
	method?: "post" | "patch"
}

/**
 * Escritura contra la API.
 *
 * No muestra toasts por su cuenta: en el wizard de registro, un error de
 * validación debe pintarse **sobre los campos del formulario**, no en una
 * notificación que desaparece a los cinco segundos. Quien llama decide.
 */
export function usePost<T = unknown>(opciones?: {
	onSuccess?: (data: T) => void
	onError?: (error: ApiError) => void
}) {
	const mutation = useMutation<T, ApiError, UsePostVariables>({
		mutationFn: ({ url, body, method = "post" }) =>
			method === "patch" ? fetchApi.patch<T>(url, body) : fetchApi.post<T>(url, body),
		onSuccess: opciones?.onSuccess,
		onError: opciones?.onError,
	})

	return {
		execute: mutation.mutateAsync,
		response: mutation.data ?? null,
		loading: mutation.isPending,
		error: mutation.error ?? null,
		reset: mutation.reset,
	}
}

export default usePost
