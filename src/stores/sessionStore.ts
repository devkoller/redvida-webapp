import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface UsuarioSesion {
	id: number
	usuario: string
	nombre: string
	email: string
	roles: string[]
	permisos: string[]
	debe_cambiar_password: boolean
}

interface SessionState {
	accessToken: string | null
	refreshToken: string | null
	usuario: UsuarioSesion | null

	iniciar: (payload: {
		accessToken: string
		refreshToken: string
		usuario: UsuarioSesion
	}) => void
	actualizarTokens: (payload: { accessToken: string; refreshToken: string }) => void
	cerrar: () => void
	tienePermiso: (...permisos: string[]) => boolean
}

/**
 * Sesión administrativa.
 *
 * Persistida en **localStorage** —a diferencia del wizard de registro, que usa
 * `sessionStorage`—. La diferencia es deliberada: el wizard contiene datos
 * personales de un tercero a medio capturar en un equipo que puede ser
 * compartido; esto es la sesión de la propia persona en su equipo de trabajo, y
 * cerrarla en cada pestaña haría el panel inusable.
 *
 * Los tokens en `localStorage` son accesibles desde JavaScript, así que un XSS
 * los expondría. La mitigación real es que el CMS sanitiza en el servidor y que
 * el token de acceso vive poco; guardarlos en una cookie `HttpOnly` sería mejor
 * y queda anotado como mejora para producción.
 */
export const useSessionStore = create<SessionState>()(
	persist(
		(set, get) => ({
			accessToken: null,
			refreshToken: null,
			usuario: null,

			iniciar: ({ accessToken, refreshToken, usuario }) =>
				set({ accessToken, refreshToken, usuario }),

			actualizarTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

			cerrar: () => set({ accessToken: null, refreshToken: null, usuario: null }),

			/**
			 * Comprueba permisos para **ocultar acciones**, nunca para autorizar.
			 * La autorización real la hace el backend en cada petición; esto solo
			 * evita mostrar botones que van a devolver 403.
			 */
			tienePermiso: (...permisos) => {
				const usuario = get().usuario
				if (!usuario) return false
				return permisos.some((permiso) => usuario.permisos.includes(permiso))
			},
		}),
		{
			name: "redvida-sesion",
			storage: createJSONStorage(() => localStorage),
		},
	),
)

/** Hook de conveniencia para condicionar la interfaz. */
export const usePermission = (...permisos: string[]): boolean =>
	useSessionStore((estado) => {
		if (!estado.usuario) return false
		return permisos.some((permiso) => estado.usuario!.permisos.includes(permiso))
	})
