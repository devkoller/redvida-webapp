import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { DonadorDetallePage } from "@/features/admin-donadores/pages/detalle"

export const Route = createFileRoute("/admin/donadores/$codigo")({
	component: () => (
		<RequierePermiso permisos={["donador:read"]}>
			<DonadorDetallePage />
		</RequierePermiso>
	),
})
