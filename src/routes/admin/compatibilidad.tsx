import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { CompatibilidadPage } from "@/features/compatibilidad"

export const Route = createFileRoute("/admin/compatibilidad")({
	component: () => (
		// Solo `busqueda:execute` abre la pantalla. `donador:reveal` se comprueba
		// aparte, sobre el botón de revelar identidad: hay perfiles que pueden
		// buscar sin poder levantar el seudónimo de nadie.
		<RequierePermiso permisos={["busqueda:execute"]}>
			<CompatibilidadPage />
		</RequierePermiso>
	),
})
