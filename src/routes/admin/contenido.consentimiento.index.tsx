import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { CONSENTIMIENTO } from "@/features/cms/documentos/config"
import { PaginaDocumento } from "@/features/cms/documentos/pagina-documento"

export const Route = createFileRoute("/admin/contenido/consentimiento/")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<PaginaDocumento doc={CONSENTIMIENTO} />
		</RequierePermiso>
	),
})
