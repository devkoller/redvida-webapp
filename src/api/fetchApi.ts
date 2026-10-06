import axios, { AxiosError, type AxiosInstance } from "axios"

import { API_URL } from "./config"
import { respuestaDemo } from "./demo"
import { instalarInterceptores } from "./interceptores"

/**
 * Cliente HTTP contra `redvida-server`.
 *
 * Todas las respuestas de la API comparten el mismo shape
 * `{ label, message, status, data, cause, name }`, así que el cliente lo
 * desenvuelve una sola vez y el resto de la aplicación trabaja con `data`.
 *
 * El flujo público de registro no necesita sesión, pero el panel sí. Los
 * interceptores adjuntan el token solo cuando existe, de modo que las rutas
 * públicas siguen funcionando igual para un visitante anónimo.
 */

/** Error de campo devuelto por la validación del backend. */
export interface ErrorCampo {
	campo: string
	mensaje: string
}

/**
 * Error normalizado. Trae `errores` cuando el backend devolvió la lista
 * completa de campos inválidos, que es lo que el formulario necesita para
 * marcarlos uno por uno en vez de mostrar un mensaje genérico.
 */
export class ApiError extends Error {
	status: number
	errores: ErrorCampo[]
	cause?: unknown

	constructor(message: string, status: number, errores: ErrorCampo[] = [], cause?: unknown) {
		super(message)
		this.name = "ApiError"
		this.status = status
		this.errores = errores
		this.cause = cause
	}
}

interface RespuestaApi<T = unknown> {
	label?: string
	message?: string
	status?: number
	data?: T
	cause?: unknown
	name?: string
	meta?: Record<string, unknown>
}

const esListaDeErrores = (cause: unknown): cause is ErrorCampo[] =>
	Array.isArray(cause) && cause.every((item) => item && typeof item === "object" && "campo" in item)

const normalizarError = (error: unknown): ApiError => {
	if (error instanceof ApiError) return error

	if (axios.isAxiosError(error)) {
		const axiosError = error as AxiosError<RespuestaApi>
		const respuesta = axiosError.response

		if (!respuesta) {
			// Sin respuesta: el servidor no está o la red se cayó. Distinguirlo
			// importa — no es lo mismo "sus datos son inválidos" que "no pudimos
			// comunicarnos", y la acción que se le pide al usuario es distinta.
			return new ApiError(
				"No fue posible comunicarse con el servidor. Verifique su conexión e intente de nuevo.",
				0,
			)
		}

		const cuerpo = respuesta.data
		const errores = esListaDeErrores(cuerpo?.cause) ? cuerpo.cause : []

		return new ApiError(
			cuerpo?.message || "Ocurrió un error al procesar la solicitud",
			respuesta.status,
			errores,
			cuerpo?.cause,
		)
	}

	return new ApiError(error instanceof Error ? error.message : "Ocurrió un error inesperado", 0)
}

class FetchApi {
	private cliente: AxiosInstance

	constructor() {
		this.cliente = axios.create({
			baseURL: API_URL,
			headers: { "Content-Type": "application/json" },
			timeout: 20000,
		})

		instalarInterceptores(this.cliente)

		this.get = this.get.bind(this)
		this.post = this.post.bind(this)
		this.patch = this.patch.bind(this)
		this.delete = this.delete.bind(this)
	}

	async get<T = unknown>(
		url: string,
		opciones: { qs?: Record<string, unknown>; signal?: AbortSignal } = {},
	): Promise<T> {
		const demo = await respuestaDemo<T>("get", url)
		if (demo) return demo.data

		try {
			const { data } = await this.cliente.get<RespuestaApi<T>>(url, {
				params: opciones.qs,
				signal: opciones.signal,
			})
			return data?.data as T
		} catch (error) {
			throw normalizarError(error)
		}
	}

	/**
	 * Igual que `get` pero conserva `meta` (totales, paginación).
	 *
	 * No pasa por el modo demostración: solo lo usan las tablas del panel, que
	 * no forman parte del recorrido que se enseña.
	 */
	async getConMeta<T = unknown>(
		url: string,
		opciones: { qs?: Record<string, unknown>; signal?: AbortSignal } = {},
	): Promise<{ data: T; meta?: Record<string, unknown> }> {
		try {
			const { data } = await this.cliente.get<RespuestaApi<T>>(url, {
				params: opciones.qs,
				signal: opciones.signal,
			})
			return { data: data?.data as T, meta: data?.meta }
		} catch (error) {
			throw normalizarError(error)
		}
	}

	async post<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		const demo = await respuestaDemo<T>("post", url)
		if (demo) return demo.data

		try {
			const { data } = await this.cliente.post<RespuestaApi<T>>(url, body, { signal })
			return data?.data as T
		} catch (error) {
			throw normalizarError(error)
		}
	}

	async patch<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		const demo = await respuestaDemo<T>("patch", url)
		if (demo) return demo.data

		try {
			const { data } = await this.cliente.patch<RespuestaApi<T>>(url, body, { signal })
			return data?.data as T
		} catch (error) {
			throw normalizarError(error)
		}
	}

	/**
	 * `put` y `delete` no pasan por el modo demostración: hoy solo los usa la
	 * gestión de usuarios y roles, que queda fuera del recorrido que se enseña.
	 */
	async put<T = unknown>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
		try {
			const { data } = await this.cliente.put<RespuestaApi<T>>(url, body, { signal })
			return data?.data as T
		} catch (error) {
			throw normalizarError(error)
		}
	}

	async delete<T = unknown>(url: string, signal?: AbortSignal): Promise<T> {
		try {
			const { data } = await this.cliente.delete<RespuestaApi<T>>(url, { signal })
			return data?.data as T
		} catch (error) {
			throw normalizarError(error)
		}
	}
}

export default new FetchApi()
