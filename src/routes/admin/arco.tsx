import { createFileRoute } from "@tanstack/react-router"

import { BandejaArcoPage } from "@/features/arco/BandejaArcoPage"
import { RequierePermiso } from "@/features/auth/RequierePermiso"

export const Route = createFileRoute("/admin/arco")({
	component: () => (
		<RequierePermiso permisos={["arco:read"]}>
			<BandejaArcoPage />
		</RequierePermiso>
	),
})
