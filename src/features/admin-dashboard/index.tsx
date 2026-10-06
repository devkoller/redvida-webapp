import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { Download } from "lucide-react"

import { API_URL, ENDPOINTS } from "@/api/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { exportarDashboard } from "./data/exportar"

interface Dashboard {
	kpis: Record<string, number>
	cobertura_tipificacion: { completos: number; parciales: number; porcentaje: number }
	registros_por_mes: { mes: string; total: number }[]
	distribucion_sexo: { sexo: string; total: number }[]
	distribucion_estado: { estado: string; total: number }[]
	distribucion_edad: { rango: string; total: number }[]
	busquedas: {
		total: number
		con_resultados: number
		tasa_coincidencia: number
		mejor_grado_promedio: number | null
	}
}

const KPIS: { clave: string; etiqueta: string; descripcion: string }[] = [
	{ clave: "total_registrados", etiqueta: "Registrados", descripcion: "Total con datos activos" },
	{ clave: "verificados", etiqueta: "Verificados", descripcion: "Confirmaron su correo" },
	{ clave: "elegibles", etiqueta: "Elegibles", descripcion: "Aptos y con consentimiento" },
	{ clave: "tipificados", etiqueta: "Tipificados", descripcion: "Con perfil HLA parcial" },
	{ clave: "disponibles", etiqueta: "Disponibles", descripcion: "Participan en búsquedas" },
	{ clave: "suspendidos", etiqueta: "Suspendidos", descripcion: "Fuera temporalmente" },
]

/**
 * Tablero operativo.
 *
 * Todo lo que muestra es **agregado**: ningún dato individual. Las barras son
 * CSS puro y no una librería de gráficas — a este nivel de complejidad, una
 * dependencia de charts añadiría cientos de kilobytes para dibujar rectángulos.
 */
export function AdminDashboardPage() {
	const { data, isLoading } = useQuery<Dashboard>({
		queryKey: ["admin-dashboard"],
		queryFn: async () => {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.dashboard}`)
			return data.data
		},
	})

	if (isLoading || !data) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
				<p className="text-muted-foreground">Cargando tablero…</p>
			</div>
		)
	}

	const maxMes = Math.max(...data.registros_por_mes.map((m) => m.total), 1)

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
			<header className="mb-8 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tablero del registro</h1>
					<p className="text-muted-foreground mt-2 text-sm">
						Datos agregados del padrón. No muestra información individual.
					</p>
				</div>
				<Button variant="outline" onClick={() => exportarDashboard(data)}>
					<Download className="size-4" />
					Exportar a Excel
				</Button>
			</header>

			{/* ---------------------------------------------------------------- KPIs */}
			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{KPIS.map((kpi) => (
					<Card key={kpi.clave}>
						<CardContent className="p-5">
							<p className="text-muted-foreground text-sm">{kpi.etiqueta}</p>
							<p className="text-primary-accent mt-1 text-3xl font-bold tabular-nums">
								{data.kpis[kpi.clave] ?? 0}
							</p>
							<p className="text-muted-foreground mt-1 text-xs">{kpi.descripcion}</p>
						</CardContent>
					</Card>
				))}
			</section>

			{/* ------------------------------------------------------------ Cobertura */}
			<section className="mt-8 grid gap-4 lg:grid-cols-2">
				<Card>
					<CardContent className="p-5">
						<h2 className="font-semibold">Cobertura de tipificación</h2>
						<p className="text-primary-accent mt-2 text-4xl font-bold tabular-nums">
							{data.cobertura_tipificacion.porcentaje}%
						</p>
						<p className="text-muted-foreground mt-1 text-sm">
							{data.cobertura_tipificacion.completos} con perfil 10/10 completo ·{" "}
							{data.cobertura_tipificacion.parciales} parciales
						</p>
						<div className="bg-muted mt-4 h-2 overflow-hidden rounded-full">
							<div
								className="bg-primary h-full rounded-full transition-all"
								style={{ width: `${data.cobertura_tipificacion.porcentaje}%` }}
								role="progressbar"
								aria-valuenow={data.cobertura_tipificacion.porcentaje}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="Cobertura de tipificación"
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-5">
						<h2 className="font-semibold">Búsquedas de compatibilidad</h2>
						<div className="mt-3 grid grid-cols-2 gap-4">
							<div>
								<p className="text-3xl font-bold tabular-nums">{data.busquedas.total}</p>
								<p className="text-muted-foreground text-xs">búsquedas realizadas</p>
							</div>
							<div>
								<p className="text-3xl font-bold tabular-nums">
									{data.busquedas.tasa_coincidencia}%
								</p>
								<p className="text-muted-foreground text-xs">encontraron al menos un candidato</p>
							</div>
						</div>
						{data.busquedas.mejor_grado_promedio != null && (
							<p className="text-muted-foreground mt-3 text-sm">
								Mejor grado promedio: {data.busquedas.mejor_grado_promedio}
							</p>
						)}
					</CardContent>
				</Card>
			</section>

			{/* --------------------------------------------------- Registros por mes */}
			<section className="mt-8">
				<Card>
					<CardContent className="p-5">
						<h2 className="mb-4 font-semibold">Registros por mes</h2>
						{data.registros_por_mes.length === 0 ? (
							<p className="text-muted-foreground text-sm">Sin registros en los últimos 12 meses.</p>
						) : (
							<div className="flex h-40 items-end gap-2">
								{data.registros_por_mes.map((mes) => (
									<div key={mes.mes} className="flex flex-1 flex-col items-center gap-1.5">
										<span className="text-muted-foreground text-xs tabular-nums">{mes.total}</span>
										<div
											className="bg-primary w-full rounded-t transition-all"
											style={{ height: `${Math.max(4, (mes.total / maxMes) * 100)}%` }}
											title={`${mes.mes}: ${mes.total} registros`}
										/>
										<span className="text-muted-foreground text-[0.65rem]">
											{mes.mes.slice(5)}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</section>

			{/* ------------------------------------------------------- Distribuciones */}
			<section className="mt-4 grid gap-4 lg:grid-cols-3">
				<Distribucion titulo="Por edad" datos={data.distribucion_edad} campo="rango" />
				<Distribucion titulo="Por sexo" datos={data.distribucion_sexo} campo="sexo" />
				<Distribucion titulo="Por estado" datos={data.distribucion_estado} campo="estado" />
			</section>
		</div>
	)
}

function Distribucion({
	titulo,
	datos,
	campo,
}: {
	titulo: string
	datos: Record<string, string | number>[]
	campo: string
}) {
	const total = datos.reduce((suma, fila) => suma + Number(fila.total), 0)

	return (
		<Card>
			<CardContent className="p-5">
				<h2 className="mb-3 font-semibold">{titulo}</h2>
				{datos.length === 0 ? (
					<p className="text-muted-foreground text-sm">Sin datos.</p>
				) : (
					<ul className="space-y-2.5">
						{datos.map((fila) => {
							const porcentaje = total > 0 ? (Number(fila.total) / total) * 100 : 0
							return (
								<li key={String(fila[campo])} className="space-y-1">
									<div className="flex justify-between text-sm">
										<span className="truncate">{fila[campo]}</span>
										<span className="text-muted-foreground tabular-nums">
											{fila.total} ({Math.round(porcentaje)}%)
										</span>
									</div>
									<div className="bg-muted h-1.5 overflow-hidden rounded-full">
										<div
											className={cn("bg-primary h-full rounded-full")}
											style={{ width: `${porcentaje}%` }}
										/>
									</div>
								</li>
							)
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	)
}

export default AdminDashboardPage
