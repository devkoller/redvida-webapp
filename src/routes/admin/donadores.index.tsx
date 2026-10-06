import { createFileRoute } from "@tanstack/react-router"

import { AdminDonadoresPage } from "@/features/admin-donadores"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/donadores/")({
	component: () => (
		<RequierePermiso permisos={["donador:read"]}>
			<AdminDonadoresPage />
		</RequierePermiso>
	),
})
