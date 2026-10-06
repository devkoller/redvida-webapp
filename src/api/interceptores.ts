import axios, { type AxiosInstance } from "axios"

import { API_URL, ENDPOINTS } from "./config"
import { usePortalStore } from "@/stores/portalStore"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * Interceptores de sesión: adjuntan el token y lo refrescan al expirar.
 *
 * Se instalan **dos veces**, y hace falta que así sea: `fetchApi` trabaja sobre
 * una instancia creada con `axios.create()`, que no hereda los interceptores
 * del axios global, mientras que varias pantallas del panel (CMS, tablero,
 * padrón, HLA) llaman al `axios` global directamente. Registrarlos en un solo
 * sitio dejaba la mitad de las peticiones saliendo sin `Authorization`.
 */

let refrescando: Promise<string | null> | null = null

/**
 * Refresca el token de acceso.
 *
 * Se comparte una sola promesa entre peticiones concurrentes: si tres llamadas
 * reciben 401 a la vez y cada una intentara refrescar, la segunda presentaría
 * un refresh ya rotado y el backend —correctamente— revocaría toda la cadena
 * por sospecha de robo. Serializar aquí es lo que evita ese falso positivo.
 */
async function refrescarToken(): Promise<string | null> {
	if (refrescando) return refrescando

	refrescando = (async () => {
		const { refreshToken, actualizarTokens, cerrar } = useSessionStore.getState()
		if (!refreshToken) return null

		try {
			const { data } = await axios.post(
				`${API_URL}${ENDPOINTS.refresh}`,
				{ refresh_token: refreshToken },
				// Marcado para que el interceptor no reintente: si el propio
				// refresh fallara con 401, reintentarlo sería un bucle.
				{ headers: { "X-Skip-Auth-Retry": "1" } },
			)
			const nuevos = data.data
			actualizarTokens({
				accessToken: nuevos.access_token,
				refreshToken: nuevos.refresh_token,
			})
			return nuevos.access_token as string
		} catch {
			cerrar()
			return null
		} finally {
			refrescando = null
		}
	})()

	return refrescando
}

/** Se invoca cuando la sesión ya no se puede recuperar (refresh caducado o revocado). */
let alPerderSesion: (() => void) | null = null

export function registrarCierreDeSesion(callback: () => void): void {
	alPerderSesion = callback
}

/**
 * Rutas que actúan sobre un registro de donador y exigen su sesión (la que
 * entrega la verificación del OTP): portal, elegibilidad, alta de cita y
 * consentimiento. El resto de `/citas` es del panel o público.
 */
const usaSesionDonador = (url: string): boolean => {
	const ruta = url.startsWith(API_URL) ? url.slice(API_URL.length) : url
	return (
		ruta.startsWith("/portal/") ||
		ruta.startsWith("/donadores/elegibilidad") ||
		ruta.startsWith("/consentimiento/") ||
		/^\/citas\/?(\?.*)?$/.test(ruta)
	)
}

export function instalarInterceptores(cliente: AxiosInstance): void {
	cliente.interceptors.request.use((config) => {
		const destino = `${config.baseURL ?? ""}${config.url ?? ""}`
		// Estas rutas usan la sesión del donador, nunca la del panel.
		if (
			usaSesionDonador(config.url ?? "") &&
			!(config.url ?? "").includes("/consentimiento/vigente")
		) {
			const tokenPortal = usePortalStore.getState().token
			if (tokenPortal) config.headers.set("Authorization", `Bearer ${tokenPortal}`)
			return config
		}

		const token = useSessionStore.getState().accessToken

		// El token solo viaja a nuestra API. La comprobación se hace sobre la URL
		// ya resuelta porque `fetchApi` usa rutas relativas con `baseURL` y las
		// pantallas que llaman al axios global usan la URL absoluta.
		if (token && destino.startsWith(API_URL)) {
			config.headers.set("Authorization", `Bearer ${token}`)
		}
		return config
	})

	cliente.interceptors.response.use(
		(respuesta) => respuesta,
		async (error) => {
			const original = error.config

			const debeReintentar =
				error.response?.status === 401 &&
				original &&
				!original._reintentado &&
				!original.headers?.["X-Skip-Auth-Retry"] &&
				useSessionStore.getState().refreshToken

			if (debeReintentar) {
				original._reintentado = true
				const token = await refrescarToken()
				if (token) {
					original.headers.Authorization = `Bearer ${token}`
					return cliente(original)
				}
				// El refresh falló: la sesión ya se limpió, hay que salir del panel.
				alPerderSesion?.()
			}

			return Promise.reject(error)
		},
	)
}

/** Instala los interceptores en el axios global. Se llama una sola vez, al arrancar. */
export function instalarInterceptoresGlobales(): void {
	instalarInterceptores(axios)
}
