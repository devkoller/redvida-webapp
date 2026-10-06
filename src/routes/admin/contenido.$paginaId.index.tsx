import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { PaginaCmsPage } from "@/features/cms/pages/pagina"

export const Route = createFileRoute("/admin/contenido/$paginaId/")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<PaginaCmsPage />
		</RequierePermiso>
	),
})
