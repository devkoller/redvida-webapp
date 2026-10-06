import { createFileRoute } from "@tanstack/react-router"

import { AdminUsuariosPage } from "@/features/admin-usuarios"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/usuarios")({
	component: () => (
		<RequierePermiso permisos={["admin:users"]}>
			<AdminUsuariosPage />
		</RequierePermiso>
	),
})
