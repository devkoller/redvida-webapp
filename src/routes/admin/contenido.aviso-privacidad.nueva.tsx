import { createFileRoute } from "@tanstack/react-router"

import { RequierePermiso } from "@/features/auth/RequierePermiso"
import { AVISO_PRIVACIDAD } from "@/features/cms/documentos/config"
import { NuevaVersionDocumento } from "@/features/cms/documentos/pagina-nueva-version"

export const Route = createFileRoute("/admin/contenido/aviso-privacidad/nueva")({
	// `base`: versión de la que parte el texto (por omisión, la vigente).
	validateSearch: (search: Record<string, unknown>): { base?: string } =>
		typeof search.base === "string" && /^v\d+$/.test(search.base) ? { base: search.base } : {},
	component: () => (
		<RequierePermiso permisos={["cms:publish"]}>
			<Nueva />
		</RequierePermiso>
	),
})

function Nueva() {
	const { base } = Route.useSearch()
	return <NuevaVersionDocumento doc={AVISO_PRIVACIDAD} base={base} />
}
