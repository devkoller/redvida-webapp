import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"
import type { UsuarioSesion } from "@/stores/sessionStore"

/**
 * El login devuelve una de dos cosas: la sesión completa, o un desafío de
 * segundo factor. Se modela como unión para que el consumidor tenga que
 * distinguirlas explícitamente en vez de asumir que siempre hay token.
 */
export type RespuestaLogin =
	| {
			access_token: string
			refresh_token: string
			expira_en: string
			usuario: UsuarioSesion
			mfa_requerido?: false
	  }
	| {
			mfa_requerido: true
			mfa_enrolado: boolean
			mfa_token: string
			expira_en: string
	  }

export const login = (usuario: string, password: string) =>
	fetchApi.post<RespuestaLogin>(ENDPOINTS.login, { usuario, password })

export const logout = (refreshToken: string) =>
	fetchApi.post(ENDPOINTS.logout, { refresh_token: refreshToken })

export const perfil = () => fetchApi.get<UsuarioSesion>(ENDPOINTS.perfil)

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
	fetchApi.post(ENDPOINTS.cambiarPassword, {
		password_actual: passwordActual,
		password_nueva: passwordNueva,
	})

export const validarPassword = (password: string) =>
	fetchApi.post<{ valida: boolean; errores: string[] }>(ENDPOINTS.validarPassword, { password })
