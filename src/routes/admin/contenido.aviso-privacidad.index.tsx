import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { AVISO_PRIVACIDAD } from "@/features/cms/documentos/config"
import { PaginaDocumento } from "@/features/cms/documentos/pagina-documento"

export const Route = createFileRoute("/admin/contenido/aviso-privacidad/")({
	component: () => (
		<RequierePermiso permisos={["cms:read"]}>
			<PaginaDocumento doc={AVISO_PRIVACIDAD} />
		</RequierePermiso>
	),
})
