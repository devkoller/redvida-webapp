import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { HlaIngestaPage } from "@/features/hla-ingesta"

export const Route = createFileRoute("/admin/hla")({
	component: () => (
		// `hla:read` basta para abrir la pantalla porque también sirve para
		// consultar lotes ya cargados; la carga en sí la corta `hla:write` en el
		// servidor.
		<RequierePermiso permisos={["hla:write", "hla:read"]}>
			<HlaIngestaPage />
		</RequierePermiso>
	),
})
