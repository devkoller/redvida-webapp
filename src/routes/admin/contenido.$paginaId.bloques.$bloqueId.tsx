import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { BloqueCmsPage } from "@/features/cms/pages/bloque"

export const Route = createFileRoute("/admin/contenido/$paginaId/bloques/$bloqueId")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<BloqueCmsPage />
		</RequierePermiso>
	),
})
