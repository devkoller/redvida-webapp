import { cn } from "@/lib/utils"
import { ESTATUS_CITA, aFecha, type EstatusEfectivo } from "../data/citas"
import type { Conteo } from "../data/metricas"

/**
 * Gráficas en CSS/SVG puro, como las del tablero: a este nivel una librería de
 * charts añadiría cientos de KB para dibujar rectángulos. Los colores salen de
 * los tokens, así que siguen a la paleta y al modo oscuro.
 *
 * Cada gráfica trae su resumen en `aria-label` y los valores a la vista: el
 * color nunca es la única señal.
 */

const ORDEN: EstatusEfectivo[] = ["atendida", "programada", "por_cerrar", "cancelada"]

export function Leyenda({ estatus }: { estatus: EstatusEfectivo[] }) {
	return (
		<ul className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
			{estatus.map((e) => (
				<li key={e} className="flex items-center gap-2">
					<span className={cn("size-3 rounded-sm", ESTATUS_CITA[e].barra)} aria-hidden="true" />
					{ESTATUS_CITA[e].etiqueta}
				</li>
			))}
		</ul>
	)
}

/** Columnas: lo agendado de cada día contra la capacidad de la agenda. */
export function OcupacionPorDia({ dias }: { dias: { fecha: string; total: number; capacidad: number }[] }) {
	const resumen = dias.map((d) => `${d.fecha}: ${d.total} de ${d.capacidad}`).join("; ")
	return (
		<div role="img" aria-label={`Citas programadas contra capacidad por día. ${resumen}`}>
			<div className="flex h-48 items-end gap-2">
				{dias.map((d) => {
					const pct = d.capacidad ? Math.min(100, (d.total / d.capacidad) * 100) : 0
					const f = aFecha(d.fecha)
					return (
						<div key={d.fecha} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
							<span className="text-xs font-medium tabular-nums">{d.total}</span>
							<div
								className="bg-muted flex w-full flex-1 items-end overflow-hidden rounded-md"
								title={`${d.total} de ${d.capacidad} franjas`}
							>
								<div className="bg-primary w-full" style={{ height: `${Math.max(pct, d.total ? 4 : 0)}%` }} />
							</div>
							<span className="text-muted-foreground text-center text-[0.7rem] leading-tight">
								{f.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")}
								<br />
								{f.getDate()}
							</span>
						</div>
					)
				})}
			</div>
			<p className="text-muted-foreground mt-3 text-xs">
				La barra gris es la capacidad del día ({dias[0]?.capacidad ?? 0} franjas).
			</p>
		</div>
	)
}

/** Columnas apiladas por semana. */
export function TendenciaSemanal({ semanas }: { semanas: { inicio: string; conteo: Conteo; actual: boolean }[] }) {
	const max = Math.max(1, ...semanas.map((s) => Object.values(s.conteo).reduce((a, b) => a + b, 0)))
	const resumen = semanas
		.map((s) => `semana del ${s.inicio}: ${Object.values(s.conteo).reduce((a, b) => a + b, 0)} citas`)
		.join("; ")
	return (
		<div role="img" aria-label={`Citas por semana. ${resumen}`}>
			<div className="flex h-48 items-end gap-2">
				{semanas.map((s) => {
					const total = Object.values(s.conteo).reduce((a, b) => a + b, 0)
					return (
						<div key={s.inicio} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
							<span className="text-xs font-medium tabular-nums">{total || ""}</span>
							<div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-md">
								<div className="flex flex-col-reverse" style={{ height: `${(total / max) * 100}%` }}>
									{ORDEN.map((e) =>
										s.conteo[e] ? (
											<div
												key={e}
												className={ESTATUS_CITA[e].barra}
												style={{ flexGrow: s.conteo[e] }}
												title={`${ESTATUS_CITA[e].etiqueta}: ${s.conteo[e]}`}
											/>
										) : null,
									)}
								</div>
							</div>
							<span
								className={cn(
									"text-muted-foreground text-center text-[0.7rem] leading-tight",
									s.actual && "text-foreground font-medium",
								)}
							>
								{aFecha(s.inicio).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "")}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}

/** Dona de estatus, con el total al centro. */
export function DonaEstatus({ total }: { total: Conteo }) {
	const suma = ORDEN.reduce((a, e) => a + total[e], 0)
	const R = 52
	const C = 2 * Math.PI * R
	let acumulado = 0
	return (
		<div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
			<div
				role="img"
				aria-label={`Citas por estatus. ${ORDEN.map((e) => `${ESTATUS_CITA[e].etiqueta}: ${total[e]}`).join("; ")}`}
				className="relative size-40 shrink-0"
			>
				<svg viewBox="0 0 140 140" className="size-full -rotate-90">
					<circle cx="70" cy="70" r={R} fill="none" strokeWidth="18" className="stroke-muted" />
					{suma > 0 &&
						ORDEN.map((e) => {
							if (!total[e]) return null
							const largo = (total[e] / suma) * C
							const el = (
								<circle
									key={e}
									cx="70"
									cy="70"
									r={R}
									fill="none"
									strokeWidth="18"
									strokeDasharray={`${largo} ${C - largo}`}
									strokeDashoffset={-acumulado}
									className={ESTATUS_CITA[e].trazo}
								/>
							)
							acumulado += largo
							return el
						})}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-2xl font-semibold tabular-nums">{suma}</span>
					<span className="text-muted-foreground text-xs">citas</span>
				</div>
			</div>
			<ul className="w-full space-y-2 text-sm">
				{ORDEN.map((e) => (
					<li key={e} className="flex items-center justify-between gap-3">
						<span className="flex items-center gap-2">
							<span className={cn("size-3 rounded-sm", ESTATUS_CITA[e].barra)} aria-hidden="true" />
							{ESTATUS_CITA[e].etiqueta}
						</span>
						<span className="tabular-nums">
							{total[e]}
							<span className="text-muted-foreground ms-2 text-xs">
								{suma ? Math.round((total[e] / suma) * 100) : 0}%
							</span>
						</span>
					</li>
				))}
			</ul>
		</div>
	)
}

/** Barras horizontales: franjas horarias más solicitadas. */
export function HorariosSolicitados({ horas }: { horas: { hora: number; total: number }[] }) {
	const max = Math.max(1, ...horas.map((h) => h.total))
	return (
		<ul
			className="space-y-3"
			aria-label={`Citas por hora. ${horas.map((h) => `${h.hora}:00, ${h.total}`).join("; ")}`}
		>
			{horas.map((h) => (
				<li key={h.hora} className="flex items-center gap-3 text-sm">
					<span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
						{String(h.hora).padStart(2, "0")}:00
					</span>
					<div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
						<div className="bg-primary h-full rounded-full" style={{ width: `${(h.total / max) * 100}%` }} />
					</div>
					<span className="w-8 shrink-0 text-right text-xs tabular-nums">{h.total}</span>
				</li>
			))}
		</ul>
	)
}
