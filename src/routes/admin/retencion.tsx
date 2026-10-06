import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { RetencionPage } from "@/features/retencion"

export const Route = createFileRoute("/admin/retencion")({
	component: () => (
		<RequierePermiso permisos={["admin:audit"]}>
			<RetencionPage />
		</RequierePermiso>
	),
})
