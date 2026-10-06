import {
	ClipboardCheck,
	CalendarDays,
	Dna,
	FileText,
	History,
	LayoutDashboard,
	ScrollText,
	Search,
	ShieldCheck,
	Timer,
	Users,
} from "lucide-react"
import type { ComponentType } from "react"

import type { UsuarioSesion } from "@/stores/sessionStore"

export interface Seccion {
	titulo: string
	ruta: string
	icono: ComponentType<{ className?: string }>
	/** Permisos que habilitan la sección; basta con tener uno. */
	permisos: string[]
}

/**
 * Secciones del panel, en el orden en que se muestran.
 *
 * Los permisos declarados aquí son los **mismos** que exige el backend en cada
 * ruta. Deben mantenerse sincronizados, pero si se desincronizan el efecto es
 * cosmético: el peor caso es un enlace visible que devuelve 403, nunca un
 * acceso concedido de más. La autorización real vive en `requirePermission`.
 */
export const SECCIONES: Seccion[] = [
	{
		titulo: "Panel",
		ruta: "/admin/dashboard",
		icono: LayoutDashboard,
		permisos: ["dashboard:read"],
	},
	{ titulo: "Donadores", ruta: "/admin/donadores", icono: Users, permisos: ["donador:read"] },
	{ titulo: "Citas", ruta: "/admin/citas", icono: CalendarDays, permisos: ["donador:read"] },
	{ titulo: "HLA", ruta: "/admin/hla", icono: Dna, permisos: ["hla:write", "hla:read"] },
	{
		titulo: "Compatibilidad",
		ruta: "/admin/compatibilidad",
		icono: Search,
		permisos: ["busqueda:execute"],
	},
	{ titulo: "Derechos ARCO", ruta: "/admin/arco", icono: ScrollText, permisos: ["arco:read"] },
	{ titulo: "Auditoría", ruta: "/admin/auditoria", icono: History, permisos: ["admin:audit"] },
	{ titulo: "Retención", ruta: "/admin/retencion", icono: Timer, permisos: ["admin:audit"] },
	{ titulo: "Contenido", ruta: "/admin/contenido", icono: FileText, permisos: ["cms:read"] },
	{
		titulo: "Usuarios",
		ruta: "/admin/usuarios",
		icono: ShieldCheck,
		permisos: ["admin:users"],
	},
	{
		titulo: "Elegibilidad",
		ruta: "/admin/elegibilidad",
		icono: ClipboardCheck,
		permisos: ["elegibilidad:config"],
	},
]

export const seccionesVisibles = (usuario: UsuarioSesion | null): Seccion[] =>
	usuario
		? SECCIONES.filter((seccion) =>
				seccion.permisos.some((permiso) => usuario.permisos.includes(permiso)),
			)
		: []

/**
 * Primera sección que la persona puede abrir realmente, o `null` si no tiene
 * ninguna.
 *
 * No todo el mundo tiene tablero: `editor_contenido`, por diseño, no ve nada
 * del padrón. Mandar a todos a `/admin/dashboard` dejaba al editor en un muro
 * de «no tiene acceso» cuyo único botón llevaba de vuelta al mismo muro.
 */
export const rutaInicial = (usuario: UsuarioSesion | null): string | null =>
	seccionesVisibles(usuario)[0]?.ruta ?? null
