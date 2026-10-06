import { Badge } from "@/components/ui/badge"
import type { PaginaCms } from "../data/schema"

/** Estado de publicación. Siempre con texto: el color no es la única señal. */
export function EstadoPagina({ pagina }: { pagina: PaginaCms }) {
	if (pagina.tiene_cambios_sin_publicar)
		return (
			<Badge className="bg-warning text-warning-foreground min-w-28">Sin publicar</Badge>
		)
	if (pagina.version_publicada)
		return (
			<Badge className="bg-success text-success-foreground min-w-28">
				Publicada v{pagina.version_publicada.numero_version}
			</Badge>
		)
	return (
		<Badge variant="secondary" className="min-w-28">
			Nunca publicada
		</Badge>
	)
}
