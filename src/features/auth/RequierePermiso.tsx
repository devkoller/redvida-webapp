import { Link } from "@tanstack/react-router"
import { Lock } from "lucide-react"

import { usePermission } from "@/stores/sessionStore"

/**
 * Oculta una pantalla completa a quien no tenga el permiso.
 *
 * Igual que el guard de `/admin`, esto es cortesía de interfaz: evita que
 * alguien llegue a una pantalla que solo le devolvería 403 en cada consulta.
 * La negativa que cuenta la emite `requirePermission` en el servidor, que
 * además la registra en la bitácora de auditoría.
 */
export function RequierePermiso({
	permisos,
	children,
}: {
	permisos: string[]
	children: React.ReactNode
}) {
	const autorizado = usePermission(...permisos)

	if (autorizado) return <>{children}</>

	return (
		<div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
			<span className="bg-muted flex size-12 items-center justify-center rounded-full">
				<Lock className="text-muted-foreground size-5" aria-hidden="true" />
			</span>
			<h1 className="mt-4 text-2xl font-bold tracking-tight">No tiene acceso a esta sección</h1>
			<p className="text-muted-foreground mt-2 text-sm">
				Su cuenta no cuenta con los permisos necesarios. Si considera que se trata de un error,
				solicite el ajuste a la persona responsable del registro.
			</p>
			{/* A `/admin`, no al tablero: quien está viendo este muro puede muy
			    bien no tener tampoco `dashboard:read`, y el botón lo devolvería
			    al mismo sitio. */}
			<Link
				to="/admin"
				className="bg-primary text-primary-foreground mt-6 rounded-md px-5 py-2.5 text-sm font-medium"
			>
				Volver al panel
			</Link>
		</div>
	)
}
