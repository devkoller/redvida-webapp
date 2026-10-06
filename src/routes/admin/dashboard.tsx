import { createFileRoute } from "@tanstack/react-router"

import { AdminDashboardPage } from "@/features/admin-dashboard"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/dashboard")({
	component: () => (
		<RequierePermiso permisos={["dashboard:read"]}>
			<AdminDashboardPage />
		</RequierePermiso>
	),
})
