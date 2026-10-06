import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"

export interface RolBasico {
	clave: string
	nombre: string
}

export interface Usuario {
	id: number
	usuario: string
	email: string
	nombre: string
	activo: boolean
	debe_cambiar_password: boolean
	intentos_fallidos: number
	bloqueado_hasta: string | null
	ultimo_acceso: string | null
	mfa_habilitado: boolean
	createdAt: string
	updatedAt: string
	roles: RolBasico[]
}

export interface DetalleUsuario {
	usuario: Omit<Usuario, "roles">
	roles: RolBasico[]
	permisos: string[]
	sesiones_activas: number
}

export interface Rol {
	id: number
	clave: string
	nombre: string
	descripcion: string | null
	es_sistema: boolean
	activo: boolean
	total_usuarios: number
	total_permisos: number
}

export interface Permiso {
	id: number
	clave: string
	modulo: string
	accion: string
	descripcion: string | null
}

export interface UsuarioCreado {
	id: number
	usuario: string
	email: string
	nombre: string
	roles: string[]
	password_temporal: string
	advertencia: string
}

export interface PasswordRestablecida {
	password_temporal: string
	advertencia: string
}

// --- Usuarios ---------------------------------------------------------------

export const listarUsuarios = (qs: { busqueda?: string; rol?: string; activo?: boolean; page?: number }) =>
	fetchApi.getConMeta<Usuario[]>(ENDPOINTS.adminUsuarios, { qs })

export const detalleUsuario = (id: number) => fetchApi.get<DetalleUsuario>(ENDPOINTS.adminUsuario(id))

export const crearUsuario = (datos: { usuario: string; email: string; nombre: string; roles: string[] }) =>
	fetchApi.post<UsuarioCreado>(ENDPOINTS.adminUsuarios, datos)

export const actualizarUsuario = (
	id: number,
	cambios: { nombre?: string; email?: string; activo?: boolean },
) => fetchApi.patch<Usuario>(ENDPOINTS.adminUsuario(id), cambios)

export const actualizarRolesUsuario = (id: number, roles: string[]) =>
	fetchApi.put<{ roles: string[] }>(ENDPOINTS.adminUsuarioRoles(id), { roles })

export const restablecerPassword = (id: number) =>
	fetchApi.post<PasswordRestablecida>(ENDPOINTS.adminUsuarioResetPassword(id))

export const eliminarUsuario = (id: number) => fetchApi.delete(ENDPOINTS.adminUsuario(id))

// --- Roles y permisos --------------------------------------------------------

export const listarRoles = () => fetchApi.get<Rol[]>(ENDPOINTS.adminRoles)

export const catalogoPermisos = () => fetchApi.get<Permiso[]>(ENDPOINTS.adminPermisos)

export const detalleRol = (id: number) =>
	fetchApi.get<{ rol: Rol; permisos: string[] }>(ENDPOINTS.adminRol(id))

export const crearRol = (datos: { clave: string; nombre: string; descripcion?: string }) =>
	fetchApi.post<Rol>(ENDPOINTS.adminRoles, datos)

export const actualizarRol = (
	id: number,
	cambios: { nombre?: string; descripcion?: string | null; activo?: boolean },
) => fetchApi.patch<Rol>(ENDPOINTS.adminRol(id), cambios)

export const actualizarPermisosRol = (id: number, permisos: string[]) =>
	fetchApi.put<{ permisos: string[] }>(ENDPOINTS.adminRolPermisos(id), { permisos })

export const eliminarRol = (id: number) => fetchApi.delete(ENDPOINTS.adminRol(id))
