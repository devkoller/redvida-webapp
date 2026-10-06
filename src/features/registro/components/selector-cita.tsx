import { CalendarDays, Clock, Droplet } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import fetchApi from "@/api/fetchApi"
import { ENDPOINTS } from "@/api/config"
import { ErrorSummary } from "./error-summary"

/** Ventana en la que se puede agendar, a partir de mañana. */
const DIAS_VENTANA = 45

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MESES = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
]

/** Fecha local en AAAA-MM-DD (toISOString convertiría a UTC y puede correr el día). */
const aIso = (fecha: Date) =>
	`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`

type Nivel = "alta" | "media" | "baja"
const COLOR_PANEL: Record<Nivel, string> = {
	alta: "bg-emerald-600",
	media: "bg-amber-600",
	baja: "bg-rose-600",
}

const inicioDelDia = (fecha: Date) =>
	new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())

/**
 * Calendario de disponibilidad + horarios + confirmación. Lo comparten el
 * paso 4 del registro y el portal del donador (reagendar): `alConfirmar` es
 * lo único que cambia entre uno y otro.
 */
export function SelectorCita({
	alConfirmar,
	etiquetaBoton = "Confirmar cita",
	deshabilitado = false,
}: {
	alConfirmar: (fecha: string, hora: string) => Promise<void>
	etiquetaBoton?: string
	deshabilitado?: boolean
}) {
	const [fecha, setFecha] = useState<string | null>(null)
	const [hora, setHora] = useState<string | null>(null)
	const [faltaHora, setFaltaHora] = useState(false)
	const [errorReserva, setErrorReserva] = useState<string | null>(null)
	const [guardando, setGuardando] = useState(false)
	const [mes, setMes] = useState(() => new Date())

	const hoy = useMemo(() => inicioDelDia(new Date()), [])
	const manana = useMemo(() => {
		const d = new Date(hoy)
		d.setDate(d.getDate() + 1)
		return d
	}, [hoy])
	const ultimoDia = useMemo(() => {
		const d = new Date(hoy)
		d.setDate(d.getDate() + DIAS_VENTANA)
		return d
	}, [hoy])

	const fueraDeVentana = (dia: Date) => {
		const d = inicioDelDia(dia)
		// domingo = 0: la toma de muestra no opera ese día.
		return d < manana || d > ultimoDia || d.getDay() === 0
	}

	const {
		data: disponibilidad = [],
		isLoading,
		error: errorDisponibilidad,
	} = useQuery({
		queryKey: ["citas", aIso(manana), aIso(ultimoDia)],
		queryFn: () =>
			fetchApi.get<{ fecha: string; horas: string[] }[]>(ENDPOINTS.citasDisponibilidad, {
				qs: { desde: aIso(manana), hasta: aIso(ultimoDia) },
			}),
	})
	const horasDisponibles = disponibilidad.find((dia) => dia.fecha === fecha)?.horas ?? []
	const maxHoras = useMemo(
		() => Math.max(1, ...disponibilidad.map((dia) => dia.horas.length)),
		[disponibilidad],
	)
	const nivelDe = (dia: Date): Nivel | "ninguna" | null => {
		const registro = disponibilidad.find((r) => r.fecha === aIso(dia))
		if (!registro) return null
		if (registro.horas.length === 0) return "ninguna"
		const proporcion = registro.horas.length / maxHoras
		return proporcion >= 0.5 ? "alta" : proporcion >= 0.1 ? "media" : "baja"
	}
	const sinHorarios = (dia: Date) => !isLoading && nivelDe(dia) === "ninguna"
	const diasPorNivel = (nivel: Nivel) =>
		disponibilidad
			.filter((r) => nivelDe(new Date(`${r.fecha}T12:00:00`)) === nivel)
			.map((r) => new Date(`${r.fecha}T12:00:00`))

	const fechaSeleccionada = useMemo(
		() => (fecha ? new Date(`${fecha}T12:00:00`) : undefined),
		[fecha],
	)

	const elegirFecha = (dia: Date | undefined) => {
		if (!dia || fueraDeVentana(dia) || sinHorarios(dia)) return
		setFecha(aIso(dia))
		setHora(null)
		setFaltaHora(false)
		setErrorReserva(null)
	}

	const nivelSeleccionado = fechaSeleccionada ? nivelDe(fechaSeleccionada) : null
	const colorPanel =
		nivelSeleccionado && nivelSeleccionado !== "ninguna"
			? COLOR_PANEL[nivelSeleccionado]
			: COLOR_PANEL.alta

	const confirmar = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!fecha) return
		if (!hora) {
			setFaltaHora(true)
			return
		}
		setErrorReserva(null)
		setGuardando(true)
		try {
			await alConfirmar(fecha, hora)
		} catch (error) {
			// Una franja puede ocuparse entre cargar el calendario y confirmar. El
			// backend es quien decide y su mensaje se muestra aquí, no en consola.
			setErrorReserva(
				error instanceof Error
					? error.message
					: "No fue posible reservar la cita. Verifique su conexión e inténtelo nuevamente.",
			)
		} finally {
			setGuardando(false)
		}
	}

	return (
		<div className="space-y-6">
			<ErrorSummary
				mensaje={
					errorReserva ||
					(errorDisponibilidad
						? "No pudimos consultar los horarios disponibles. Verifique su conexión e inténtelo de nuevo."
						: faltaHora
							? "Seleccione un horario para continuar"
							: undefined)
				}
			/>

			<form onSubmit={confirmar} className="space-y-6" noValidate>
				<fieldset className="space-y-4">
					<legend className="flex items-center gap-2 text-sm font-medium">
						<CalendarDays aria-hidden className="text-muted-foreground size-4" />
						Elija una fecha
					</legend>

					<p className="text-muted-foreground text-xs">
						Lunes a viernes, de 08:00 a 16:00. Los días sin horarios disponibles aparecen
						deshabilitados.
					</p>

					<div className="border-primary/30 bg-primary/5 grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
						<div className="flex items-center gap-2">
							<CalendarDays aria-hidden className="text-primary size-5 shrink-0" />
							<div>
								<p className="text-muted-foreground text-xs">Fecha</p>
								<p className={fecha ? "text-primary font-semibold" : "text-muted-foreground"}>
									{fechaSeleccionada
										? `${DIAS[fechaSeleccionada.getDay()]} ${fechaSeleccionada.getDate()} de ${MESES[fechaSeleccionada.getMonth()]} de ${fechaSeleccionada.getFullYear()}`
										: "Sin seleccionar"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Clock aria-hidden className="text-primary size-5 shrink-0" />
							<div>
								<p className="text-muted-foreground text-xs">Hora</p>
								<p className={hora ? "text-primary font-semibold" : "text-muted-foreground"}>
									{hora ?? "Sin seleccionar"}
								</p>
							</div>
						</div>
					</div>

					<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5 text-xs">
						<span className="font-semibold">Disponibilidad:</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden className="size-3 rounded-full bg-emerald-600" />
							Alta (≥50%)
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden className="size-3 rounded-full bg-amber-500" />
							Media (10–49%)
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden className="size-3 rounded-full bg-rose-600" />
							Baja (&lt;10%)
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden className="bg-muted-foreground/30 size-3 rounded-full" />
							Sin disponibilidad
						</span>
					</div>

					<div className="overflow-hidden rounded-2xl border shadow-lg">
						<div className="flex flex-col sm:flex-row">
							<div
								className={cn(
									"flex flex-col justify-center p-6 text-white transition-colors duration-300 sm:w-52",
									colorPanel,
								)}
							>
								{fechaSeleccionada ? (
									<>
										<p className="text-7xl leading-none font-bold tabular-nums">
											{String(fechaSeleccionada.getDate()).padStart(2, "0")}
										</p>
										<p className="mt-2 text-sm font-semibold tracking-widest uppercase">
											{DIAS[fechaSeleccionada.getDay()]}
										</p>
										<p className="mt-1 text-sm capitalize">
											{MESES[fechaSeleccionada.getMonth()]} {fechaSeleccionada.getFullYear()}
										</p>
									</>
								) : (
									<p className="text-sm leading-relaxed">
										Seleccione una fecha disponible del calendario
									</p>
								)}
							</div>

							<div className="bg-card flex-1 p-4 md:p-6">
								<div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-3">
									<span className="text-muted-foreground text-xl font-light">
										{mes.getFullYear()}
									</span>
									{MESES.map((nombre, indice) => {
										const destino = new Date(mes.getFullYear(), indice, 1)
										const activo = indice === mes.getMonth()
										const deshabilitado =
											destino < new Date(manana.getFullYear(), manana.getMonth(), 1) ||
											destino > ultimoDia
										return (
											<button
												key={nombre}
												type="button"
												disabled={deshabilitado}
												onClick={() => setMes(destino)}
												className={cn(
													"capitalize transition",
													activo
														? "text-primary text-base font-bold underline underline-offset-2"
														: deshabilitado
															? "text-muted-foreground/40 cursor-default text-xs"
															: "text-muted-foreground hover:text-foreground text-sm font-semibold",
												)}
											>
												{nombre.slice(0, 3)}
											</button>
										)
									})}
								</div>

								{isLoading && (
									<p className="text-muted-foreground mb-2 text-xs">Consultando disponibilidad…</p>
								)}

								<Calendar
									month={mes}
									onMonthChange={setMes}
									hideNavigation
									selected={fechaSeleccionada}
									onSelect={elegirFecha}
									startMonth={manana}
									endMonth={ultimoDia}
									disabled={(dia) => fueraDeVentana(dia) || sinHorarios(dia)}
									modifiers={{
										alta: diasPorNivel("alta"),
										media: diasPorNivel("media"),
										baja: diasPorNivel("baja"),
									}}
									modifiersClassNames={{
										alta: "[&>button]:rounded-full [&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-700 [&>button]:hover:text-white",
										media:
											"[&>button]:rounded-full [&>button]:bg-amber-500 [&>button]:text-slate-900 [&>button]:hover:bg-amber-600 [&>button]:hover:text-slate-900",
										baja: "[&>button]:rounded-full [&>button]:bg-rose-600 [&>button]:text-white [&>button]:hover:bg-rose-700 [&>button]:hover:text-white",
									}}
									className="mx-auto w-full p-0"
									classNames={{
										months: "w-full",
										month: "w-full mt-0",
										month_caption: "hidden",
										caption_label: "hidden",
										weekday: "text-muted-foreground text-center text-xs font-semibold uppercase",
										day_button: "mx-auto size-9 rounded-full p-0 text-sm font-semibold md:size-10",
									}}
								/>
							</div>
						</div>
					</div>
				</fieldset>

				{fecha && (
					<fieldset className="space-y-3">
						<legend className="text-sm font-medium">Elija un horario</legend>
						{horasDisponibles.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No hay horarios disponibles para este día.
							</p>
						) : (
							<div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
								{horasDisponibles.map((h) => {
									const seleccionado = h === hora
									return (
										<button
											key={h}
											type="button"
											onClick={() => {
												setHora(h)
												setFaltaHora(false)
												setErrorReserva(null)
											}}
											aria-pressed={seleccionado}
											className={cn(
												"rounded-lg border px-2 py-2 text-center text-sm tabular-nums transition-colors",
												seleccionado
													? "border-primary bg-primary text-primary-foreground"
													: "border-border hover:bg-muted",
											)}
										>
											{h}
										</button>
									)
								})}
							</div>
						)}
					</fieldset>
				)}

				<div className="bg-muted/40 flex items-start gap-3 rounded-lg p-4">
					<Droplet aria-hidden className="text-muted-foreground mt-0.5 size-5 shrink-0" />
					<p className="text-muted-foreground text-xs leading-relaxed">
						La toma de muestra es rápida y no duele. Recibirá esta fecha también por correo junto
						con la dirección del punto de recolección.
					</p>
				</div>

				<div className="flex justify-end">
					<Button
						type="submit"
						size="lg"
						disabled={!fecha || !hora || guardando || isLoading || deshabilitado}
					>
						{guardando ? "Reservando…" : etiquetaBoton}
					</Button>
				</div>
			</form>
		</div>
	)
}

export default SelectorCita
