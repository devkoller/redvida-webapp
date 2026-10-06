import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
	CalendarCheck,
	CalendarClock,
	CalendarOff,
	ChevronLeft,
	ChevronRight,
	Clock,
	MoreHorizontal,
	SlidersHorizontal,
	Timer,
	UserCheck,
	X,
} from "lucide-react"
import { useMemo, useState } from "react"

import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState, ErrorState, TablaSkeleton } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePermission } from "@/stores/sessionStore"
import { DialogoAccionCita, DialogoBloqueo, DialogoHorario, type AccionCita } from "./components/dialogos"
import {
	DonaEstatus,
	HorariosSolicitados,
	Leyenda,
	OcupacionPorDia,
	TendenciaSemanal,
} from "./components/graficas"
import {
	ESTATUS_CITA,
	diaCorto,
	estatusEfectivo,
	nombreDonador,
	sumarDias,
	ymd,
	type Cita,
	type ConfigAgenda,
	type EstatusEfectivo,
} from "./data/citas"
import { calcularMetricas } from "./data/metricas"

const POR_PAGINA = 15
/** Ventana descargada: 90 días atrás para asistencia y tendencia, 60 adelante para la agenda. */
const ATRAS = 90
const ADELANTE = 60
const AGENDA_DIAS = 45

/**
 * Agenda de citas: KPIs y gráficas arriba, agenda abajo.
 *
 * Todo se calcula en el navegador a partir de una sola consulta de la ventana
 * de fechas, así que los números de los KPIs y los de la tabla nunca discrepan.
 */
export function AdminCitasPage() {
	const puedeEscribir = usePermission("donador:write")
	const ahora = useMemo(() => new Date(), [])
	const hoy = ymd(ahora)
	const porDefecto = { estatus: "todos", desde: hoy, hasta: ymd(sumarDias(ahora, AGENDA_DIAS)) }

	const [filtros, setFiltros] = useState(porDefecto)
	const [pagina, setPagina] = useState(1)
	const [accion, setAccion] = useState<AccionCita | null>(null)
	const [horarioAbierto, setHorarioAbierto] = useState(false)
	const [bloqueoAbierto, setBloqueoAbierto] = useState(false)

	const citas = useQuery({
		queryKey: ["admin-citas", hoy],
		queryFn: () =>
			fetchApi.get<Cita[]>(ENDPOINTS.adminCitas, {
				qs: { desde: ymd(sumarDias(ahora, -ATRAS)), hasta: ymd(sumarDias(ahora, ADELANTE)) },
			}),
	})
	const configuracion = useQuery({
		queryKey: ["admin-citas-configuracion"],
		queryFn: () => fetchApi.get<ConfigAgenda>(ENDPOINTS.adminConfiguracionCitas),
	})

	const config = configuracion.data
	const metricas = useMemo(
		() => calcularMetricas(citas.data ?? [], config, ahora),
		[citas.data, config, ahora],
	)

	const filas = useMemo(
		() =>
			(citas.data ?? [])
				.map((c) => ({ c, e: estatusEfectivo(c, ahora) }))
				.filter(
					({ c, e }) =>
						c.fecha >= filtros.desde &&
						c.fecha <= filtros.hasta &&
						(filtros.estatus === "todos" || e === filtros.estatus),
				),
		[citas.data, filtros, ahora],
	)
	const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
	const visibles = filas.slice((Math.min(pagina, paginas) - 1) * POR_PAGINA, Math.min(pagina, paginas) * POR_PAGINA)

	const hayFiltros =
		filtros.estatus !== porDefecto.estatus || filtros.desde !== porDefecto.desde || filtros.hasta !== porDefecto.hasta
	const cambiar = (parcial: Partial<typeof filtros>) => {
		setFiltros((f) => ({ ...f, ...parcial }))
		setPagina(1)
	}
	const chips = [
		filtros.estatus !== "todos" && {
			key: "estatus",
			label: `Estatus: ${ESTATUS_CITA[filtros.estatus as EstatusEfectivo].etiqueta}`,
			quitar: () => cambiar({ estatus: "todos" }),
		},
		(filtros.desde !== porDefecto.desde || filtros.hasta !== porDefecto.hasta) && {
			key: "rango",
			label: `Del ${filtros.desde} al ${filtros.hasta}`,
			quitar: () => cambiar({ desde: porDefecto.desde, hasta: porDefecto.hasta }),
		},
	].filter(Boolean) as { key: string; label: string; quitar: () => void }[]

	const k = metricas.kpis
	const cargando = citas.isPending

	return (
		<PageShell>
			<PageHeader
				title="Agenda de citas"
				description={
					config
						? `Toma de muestra, lunes a viernes de ${config.hora_inicio.slice(0, 5)} a ${config.hora_fin.slice(0, 5)}, en intervalos de ${config.intervalo_minutos} minutos.`
						: "Toma de muestra de donadores."
				}
				actions={
					puedeEscribir && (
						<>
							<Button variant="outline" onClick={() => setHorarioAbierto(true)}>
								<Clock className="size-4" />
								Horario operativo
							</Button>
							<Button variant="outline" onClick={() => setBloqueoAbierto(true)}>
								<CalendarOff className="size-4" />
								Bloquear agenda
							</Button>
						</>
					)
				}
			/>

			{/* ------------------------------------------------------------------ KPIs */}
			{cargando ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-36 rounded-xl" />
					))}
				</div>
			) : citas.isError ? null : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						label="Citas de hoy"
						icon={<CalendarClock className="size-4" aria-hidden="true" />}
						value={k.hoy}
						hint={`${k.hoyAtendidas} atendidas · ${k.hoy - k.hoyAtendidas} pendientes`}
					/>
					<StatCard
						label="Próximos 7 días"
						icon={<CalendarCheck className="size-4" aria-hidden="true" />}
						value={k.proximas7}
						hint={k.ocupacion7 == null ? "Sin capacidad configurada" : `${k.ocupacion7}% de la capacidad de la agenda`}
					/>
					<StatCard
						label="Asistencia"
						icon={<UserCheck className="size-4" aria-hidden="true" />}
						value={k.asistencia == null ? "—" : `${k.asistencia}%`}
						hint={`${k.atendidas} atendidas de ${k.yaOcurridas} que ya debían ocurrir (últimos ${ATRAS} días)`}
					/>
					<StatCard
						label="Por cerrar"
						icon={<Timer className="size-4" aria-hidden="true" />}
						value={k.porCerrar}
						tone={k.porCerrar > 0 ? "warning" : undefined}
						hint={
							k.porCerrar > 0
								? "Citas pasadas sin marcar como atendidas ni canceladas"
								: "Todas las citas pasadas están cerradas"
						}
					/>
				</div>
			)}

			{/* --------------------------------------------------------------- Gráficas */}
			{!cargando && !citas.isError && !metricas.sinDatos && (
				<PageSection title="Análisis" description={`Citas de los últimos ${ATRAS} días y de los próximos ${ADELANTE}.`}>
					<div className="grid gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Ocupación de los próximos días hábiles</CardTitle>
							</CardHeader>
							<CardContent>
								<OcupacionPorDia dias={metricas.dias} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Citas por semana</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<TendenciaSemanal semanas={metricas.semanas} />
								<Leyenda estatus={["atendida", "programada", "por_cerrar", "cancelada"]} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Estatus de las citas</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<DonaEstatus total={metricas.total} />
								<p className="text-muted-foreground text-xs">
									{k.tasaCancelacion ?? 0}% de las citas de la ventana se cancelaron.
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Horarios más solicitados</CardTitle>
							</CardHeader>
							<CardContent>
								<HorariosSolicitados horas={metricas.horas} />
							</CardContent>
						</Card>
					</div>
				</PageSection>
			)}

			{/* ----------------------------------------------------------------- Agenda */}
			<PageSection title="Agenda">
				<Card>
					<CardContent className="space-y-3">
						<div className="flex items-center gap-2">
							<SlidersHorizontal className="text-muted-foreground size-4" aria-hidden="true" />
							<h3 className="text-sm font-medium">Filtros</h3>
						</div>
						<div className="flex flex-wrap items-end gap-3">
							<div className="w-44 space-y-2">
								<Label htmlFor="f-estatus" className="text-muted-foreground text-xs">Estatus</Label>
								<Select value={filtros.estatus} onValueChange={(v) => cambiar({ estatus: v })}>
									<SelectTrigger id="f-estatus" className="bg-card w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="todos">Todos</SelectItem>
										{(Object.keys(ESTATUS_CITA) as EstatusEfectivo[]).map((e) => (
											<SelectItem key={e} value={e}>
												{ESTATUS_CITA[e].etiqueta}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="w-44 space-y-2">
								<Label htmlFor="f-desde" className="text-muted-foreground text-xs">Desde</Label>
								<Input id="f-desde" type="date" className="bg-card" value={filtros.desde} onChange={(e) => e.target.value && cambiar({ desde: e.target.value })} />
							</div>
							<div className="w-44 space-y-2">
								<Label htmlFor="f-hasta" className="text-muted-foreground text-xs">Hasta</Label>
								<Input id="f-hasta" type="date" className="bg-card" value={filtros.hasta} onChange={(e) => e.target.value && cambiar({ hasta: e.target.value })} />
							</div>
							<Button variant="ghost" className="ms-auto" disabled={!hayFiltros} onClick={() => { setFiltros(porDefecto); setPagina(1) }}>
								Limpiar
							</Button>
						</div>
						<div className="flex min-h-6 flex-wrap items-center gap-2">
							{chips.map((f) => (
								<Badge key={f.key} variant="secondary" className="gap-1">
									{f.label}
									<button type="button" onClick={f.quitar} aria-label={`Quitar filtro ${f.label}`}>
										<X className="size-3" />
									</button>
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="gap-0 py-0">
					<CardContent className="p-0">
						{cargando ? (
							<TablaSkeleton rows={8} />
						) : citas.isError ? (
							<ErrorState onRetry={() => citas.refetch()} />
						) : filas.length === 0 ? (
							<EmptyState
								title={hayFiltros ? "Ninguna cita coincide con los filtros" : `No hay citas en los próximos ${AGENDA_DIAS} días`}
								description={hayFiltros ? "Amplíe el rango de fechas o quite el filtro de estatus." : "Las citas aparecerán aquí cuando los donadores agenden."}
								action={hayFiltros && <Button size="sm" variant="outline" onClick={() => { setFiltros(porDefecto); setPagina(1) }}>Limpiar filtros</Button>}
							/>
						) : (
							<>
								<div className="max-md:hidden">
									<Table className="table-fixed">
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="text-muted-foreground w-44 px-4 text-xs">Fecha</TableHead>
												<TableHead className="text-muted-foreground w-20 px-4 text-xs">Hora</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Donador</TableHead>
												<TableHead className="text-muted-foreground w-40 px-4 text-xs">Estatus</TableHead>
												<TableHead className="w-14 px-4"><span className="sr-only">Acciones</span></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{visibles.map(({ c, e }) => (
												<TableRow key={c.id} className="h-12">
													<TableCell className="px-4 capitalize">{diaCorto(c.fecha)}</TableCell>
													<TableCell className="px-4 tabular-nums">{c.hora.slice(0, 5)}</TableCell>
													<TableCell className="px-4">
														<Link
															to="/admin/donadores/$codigo"
															params={{ codigo: c.donador.codigo_registro }}
															className="block truncate hover:underline"
															title={nombreDonador(c.donador)}
														>
															{nombreDonador(c.donador)}
														</Link>
														<span className="text-muted-foreground font-mono text-xs">{c.donador.codigo_registro}</span>
													</TableCell>
													<TableCell className="px-4">
														<Badge variant={ESTATUS_CITA[e].variante} className={`min-w-24 ${ESTATUS_CITA[e].clase ?? ""}`}>
															{ESTATUS_CITA[e].etiqueta}
														</Badge>
													</TableCell>
													<TableCell className="px-4">
														{puedeEscribir && c.estatus === "programada" && (
															<MenuCita cita={c} onAccion={setAccion} />
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>

								<ul className="divide-y md:hidden">
									{visibles.map(({ c, e }) => (
										<li key={c.id} className="flex items-start justify-between gap-3 px-4 py-4">
											<div className="min-w-0 space-y-1">
												<p className="text-sm font-medium capitalize">{diaCorto(c.fecha)} · {c.hora.slice(0, 5)}</p>
												<Link to="/admin/donadores/$codigo" params={{ codigo: c.donador.codigo_registro }} className="block truncate text-sm hover:underline">
													{nombreDonador(c.donador)}
												</Link>
												<p className="text-muted-foreground font-mono text-xs">{c.donador.codigo_registro}</p>
												<Badge variant={ESTATUS_CITA[e].variante} className={ESTATUS_CITA[e].clase}>{ESTATUS_CITA[e].etiqueta}</Badge>
											</div>
											{puedeEscribir && c.estatus === "programada" && <MenuCita cita={c} onAccion={setAccion} />}
										</li>
									))}
								</ul>
							</>
						)}
					</CardContent>
				</Card>

				{!cargando && !citas.isError && (
					<div className="flex items-center justify-between gap-3">
						<p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
							{filas.length} citas · página {Math.min(pagina, paginas)} de {paginas}
						</p>
						<div className="flex gap-2">
							<Button variant="outline" size="icon" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
								<ChevronLeft className="size-4" />
							</Button>
							<Button variant="outline" size="icon" aria-label="Página siguiente" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				)}
			</PageSection>

			<DialogoAccionCita accion={accion} config={config} hoy={hoy} onCerrar={() => setAccion(null)} />
			{horarioAbierto && <DialogoHorario abierto onAbiertoChange={setHorarioAbierto} config={config} />}
			<DialogoBloqueo abierto={bloqueoAbierto} onAbiertoChange={setBloqueoAbierto} hoy={hoy} />
		</PageShell>
	)
}

function MenuCita({ cita, onAccion }: { cita: Cita; onAccion: (a: AccionCita) => void }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={`Acciones de la cita de ${cita.donador.codigo_registro}`}>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => onAccion({ tipo: "atendida", cita })}>Marcar atendida</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onAccion({ tipo: "reprogramar", cita })}>Reprogramar</DropdownMenuItem>
				<DropdownMenuItem variant="destructive" onSelect={() => onAccion({ tipo: "cancelar", cita })}>Cancelar cita</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export default AdminCitasPage
