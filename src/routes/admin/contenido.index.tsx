import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { CmsPage } from "@/features/cms"

export const Route = createFileRoute("/admin/contenido/")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<CmsPage />
		</RequierePermiso>
	),
})
