import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { VersionesCmsPage } from "@/features/cms/pages/versiones"

export const Route = createFileRoute("/admin/contenido/$paginaId/versiones")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<VersionesCmsPage />
		</RequierePermiso>
	),
})
