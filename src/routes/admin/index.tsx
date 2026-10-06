import { createFileRoute, redirect } from "@tanstack/react-router"
import { UserX } from "lucide-react"

import { rutaInicial } from "@/features/auth/secciones"
import { useSessionStore } from "@/stores/sessionStore"

/**
 * Punto de entrada del panel: reparte a cada quien a su primera sección.
 *
 * Existe para que nada dentro de la aplicación tenga que adivinar dónde
 * aterriza un rol concreto. `/admin` es siempre un destino válido.
 */
export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		const destino = rutaInicial(useSessionStore.getState().usuario)
		if (destino) throw redirect({ to: destino, replace: true })
	},
	component: SinSecciones,
})

function SinSecciones() {
	return (
		<div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
			<span className="bg-muted flex size-12 items-center justify-center rounded-full">
				<UserX className="text-muted-foreground size-5" aria-hidden="true" />
			</span>
			<h1 className="mt-4 text-2xl font-bold tracking-tight">Su cuenta no tiene secciones</h1>
			<p className="text-muted-foreground mt-2 text-sm">
				El acceso está activo, pero todavía no se le ha asignado ningún rol con permisos de
				operación. Solicite la asignación a la persona responsable del registro.
			</p>
		</div>
	)
}
