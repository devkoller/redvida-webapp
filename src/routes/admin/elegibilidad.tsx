import { createFileRoute } from "@tanstack/react-router"

import { AdminElegibilidadPage } from "@/features/admin-elegibilidad"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/elegibilidad")({
	component: () => (
		<RequierePermiso permisos={["elegibilidad:config"]}>
			<AdminElegibilidadPage />
		</RequierePermiso>
	),
})
