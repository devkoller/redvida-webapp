import { createFileRoute } from "@tanstack/react-router"

import { AuditoriaPage } from "@/features/auditoria"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/auditoria")({
	component: () => (
		<RequierePermiso permisos={["admin:audit"]}>
			<AuditoriaPage />
		</RequierePermiso>
	),
})
