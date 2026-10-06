import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ESTATUS_DONADOR, type DonadorListado } from "../data/schema"

/**
 * Estatus del donador + ciclo del dato. El ciclo manda sobre el estatus: un
 * donador "disponible" pero bloqueado NO participa en búsquedas, y mostrar solo
 * el estatus haría creer lo contrario.
 */
export function EstatusBadge({
	estatus,
	cicloDato,
}: {
	estatus: DonadorListado["estatus"]
	cicloDato?: string
}) {
	const config = ESTATUS_DONADOR[estatus]
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge
				variant={config?.variante ?? "outline"}
				className={cn("min-w-24", config?.clase)}
			>
				{config?.etiqueta ?? estatus}
			</Badge>
			{cicloDato && cicloDato !== "activo" && (
				<Badge variant="destructive" title="No participa en búsquedas">
					{cicloDato}
				</Badge>
			)}
		</div>
	)
}
