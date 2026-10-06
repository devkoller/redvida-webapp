import { cn } from "@/lib/utils"
import type { DetalleLocus } from "../data/schema"

/**
 * Matriz visual de coincidencia por locus.
 *
 * Verde = 2/2, ámbar = 1/2, rojo = 0/2. **El color nunca va solo**: cada celda
 * lleva el conteo escrito y un `title` con el detalle. Cerca del 8% de los
 * hombres tiene alguna deficiencia en la visión del color rojo-verde, y esta
 * matriz la lee personal clínico que decide sobre un trasplante.
 */
export function MatrizCoincidencia({ detalle }: { detalle: DetalleLocus[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{detalle.map((locus) => {
				const descripcion = locus.mismatch
					? `${locus.locus}: ${locus.match}/2 — paciente ${locus.mismatch.paciente} vs donador ${locus.mismatch.donador}`
					: `${locus.locus}: ${locus.match}/2 — ${locus.donador.join(" + ")}`

				return (
					<div
						key={locus.locus}
						title={descripcion}
						className={cn(
							"flex min-w-[3.6rem] flex-col items-center gap-0.5 rounded-md border px-2 py-1.5 text-center",
							locus.match === 2 && "border-success/40 bg-success/10",
							locus.match === 1 && "border-warning/50 bg-warning/10",
							locus.match === 0 && "border-destructive/40 bg-destructive/10",
						)}
					>
						<span className="text-[0.7rem] leading-none font-semibold tracking-wide">
							{locus.locus}
						</span>
						<span
							className={cn(
								"font-mono text-xs leading-none font-bold",
								locus.match === 2 && "text-success",
								locus.match === 1 && "text-warning-foreground",
								locus.match === 0 && "text-destructive",
							)}
						>
							{locus.match}/2
						</span>
						{locus.tipo === "potencial" && (
							<span
								className="text-muted-foreground text-[0.6rem] leading-none"
								title="Comparado a baja resolución"
							>
								baja res.
							</span>
						)}
						<span className="sr-only">{descripcion}</span>
					</div>
				)
			})}
		</div>
	)
}

export default MatrizCoincidencia
