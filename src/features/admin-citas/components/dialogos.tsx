import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import fetchApi from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { diaCorto, nombreDonador, type Cita, type ConfigAgenda } from "../data/citas"

const mensaje = (e: unknown, defecto: string) => (e instanceof Error && e.message ? e.message : defecto)

function Pie({
	guardando,
	onCancelar,
	onGuardar,
	etiqueta,
	destructivo,
}: {
	guardando: boolean
	onCancelar: () => void
	onGuardar: () => void
	etiqueta: string
	destructivo?: boolean
}) {
	return (
		<DialogFooter>
			<Button variant="outline" onClick={onCancelar} disabled={guardando}>
				Cancelar
			</Button>
			<Button variant={destructivo ? "destructive" : "default"} onClick={onGuardar} disabled={guardando}>
				{guardando && <Loader2 className="size-4 animate-spin" />}
				{etiqueta}
			</Button>
		</DialogFooter>
	)
}

function Campo({
	id,
	label,
	error,
	children,
}: {
	id: string
	label: string
	error?: string
	children: React.ReactNode
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			{children}
			<p className="text-destructive min-h-5 text-xs">{error ?? ""}</p>
		</div>
	)
}

/** Atender, cancelar o reprogramar una cita. Cabe sin scroll: es un modal. */
export type AccionCita = { tipo: "atendida" | "cancelar" | "reprogramar"; cita: Cita }

export function DialogoAccionCita({
	accion,
	config,
	hoy,
	onCerrar,
}: {
	accion: AccionCita | null
	config?: ConfigAgenda
	hoy: string
	onCerrar: () => void
}) {
	const queryClient = useQueryClient()
	const [guardando, setGuardando] = useState(false)
	const [motivo, setMotivo] = useState("")
	const [fecha, setFecha] = useState("")
	const [hora, setHora] = useState("")
	const [intentado, setIntentado] = useState(false)
	const [abiertaId, setAbiertaId] = useState<string | null>(null)

	// Reinicia el formulario al abrir una acción distinta.
	const llave = accion ? `${accion.tipo}-${accion.cita.id}` : null
	if (llave !== abiertaId) {
		setAbiertaId(llave)
		setMotivo("")
		setIntentado(false)
		setFecha(accion?.cita.fecha ?? "")
		setHora(accion?.cita.hora.slice(0, 5) ?? "")
	}

	if (!accion) return null
	const { tipo, cita } = accion
	const quien = `${nombreDonador(cita.donador)} (${cita.donador.codigo_registro})`
	const cuando = `${diaCorto(cita.fecha)} · ${cita.hora.slice(0, 5)}`

	const enviar = async (cuerpo: object, exito: string) => {
		setGuardando(true)
		try {
			await fetchApi.patch(ENDPOINTS.adminCita(cita.id), cuerpo)
			toast.success(exito)
			await queryClient.invalidateQueries({ queryKey: ["admin-citas"] })
			onCerrar()
		} catch (e) {
			toast.error(mensaje(e, "No fue posible actualizar la cita"))
		} finally {
			setGuardando(false)
		}
	}

	const confirmar = () => {
		setIntentado(true)
		if (tipo === "atendida") return enviar({ estatus: "atendida" }, "Cita marcada como atendida")
		if (tipo === "cancelar") {
			if (!motivo.trim()) return
			return enviar({ estatus: "cancelada", motivo: motivo.trim() }, "Cita cancelada")
		}
		if (!fecha || !hora) return
		return enviar({ fecha, hora }, "Cita reprogramada")
	}

	const titulos = {
		atendida: ["Marcar cita como atendida", "Confirma que el donador acudió y se tomó la muestra."],
		cancelar: ["Cancelar cita", "La franja queda libre para otro donador. El motivo queda registrado."],
		reprogramar: ["Reprogramar cita", "Elija una franja libre dentro del horario operativo."],
	} as const

	return (
		<Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{titulos[tipo][0]}</DialogTitle>
					<DialogDescription>
						{quien} · {cuando}. {titulos[tipo][1]}
					</DialogDescription>
				</DialogHeader>

				{tipo === "cancelar" && (
					<Campo
						id="motivo-cita"
						label="Motivo"
						error={intentado && !motivo.trim() ? "El motivo es obligatorio." : undefined}
					>
						<Textarea
							id="motivo-cita"
							rows={3}
							value={motivo}
							onChange={(e) => setMotivo(e.target.value)}
							aria-invalid={intentado && !motivo.trim()}
							placeholder="Por qué se cancela esta cita"
						/>
					</Campo>
				)}

				{tipo === "reprogramar" && (
					<div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
						<Campo id="nueva-fecha" label="Fecha" error={intentado && !fecha ? "Indique la fecha." : undefined}>
							<Input
								id="nueva-fecha"
								type="date"
								min={hoy}
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
								className="bg-card"
							/>
						</Campo>
						<Campo id="nueva-hora" label="Hora" error={intentado && !hora ? "Indique la hora." : undefined}>
							<Input
								id="nueva-hora"
								type="time"
								min={config?.hora_inicio.slice(0, 5)}
								step={(config?.intervalo_minutos ?? 20) * 60}
								value={hora}
								onChange={(e) => setHora(e.target.value)}
								className="bg-card"
							/>
						</Campo>
					</div>
				)}

				<Pie
					guardando={guardando}
					onCancelar={onCerrar}
					onGuardar={confirmar}
					destructivo={tipo === "cancelar"}
					etiqueta={
						tipo === "atendida" ? "Marcar atendida" : tipo === "cancelar" ? "Cancelar cita" : "Guardar cambio"
					}
				/>
			</DialogContent>
		</Dialog>
	)
}

/** Horario operativo de la agenda. */
export function DialogoHorario({
	abierto,
	onAbiertoChange,
	config,
}: {
	abierto: boolean
	onAbiertoChange: (v: boolean) => void
	config?: ConfigAgenda
}) {
	const queryClient = useQueryClient()
	const [guardando, setGuardando] = useState(false)
	const [inicio, setInicio] = useState(config?.hora_inicio.slice(0, 5) ?? "08:00")
	const [fin, setFin] = useState(config?.hora_fin.slice(0, 5) ?? "16:00")
	const [intervalo, setIntervalo] = useState(String(config?.intervalo_minutos ?? 20))

	const guardar = async () => {
		setGuardando(true)
		try {
			await fetchApi.patch(ENDPOINTS.adminConfiguracionCitas, {
				hora_inicio: inicio,
				hora_fin: fin,
				intervalo_minutos: Number(intervalo),
			})
			toast.success("Horario operativo actualizado")
			await queryClient.invalidateQueries({ queryKey: ["admin-citas-configuracion"] })
			onAbiertoChange(false)
		} catch (e) {
			toast.error(mensaje(e, "No fue posible actualizar el horario"))
		} finally {
			setGuardando(false)
		}
	}

	return (
		<Dialog open={abierto} onOpenChange={onAbiertoChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Horario operativo</DialogTitle>
					<DialogDescription>
						Por seguridad, solo se puede cambiar cuando no hay citas programadas a futuro.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
					<Campo id="hora-inicio" label="Inicio">
						<Input id="hora-inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className="bg-card" />
					</Campo>
					<Campo id="hora-fin" label="Fin">
						<Input id="hora-fin" type="time" value={fin} onChange={(e) => setFin(e.target.value)} className="bg-card" />
					</Campo>
					<Campo id="intervalo" label="Cada">
						<Select value={intervalo} onValueChange={setIntervalo}>
							<SelectTrigger id="intervalo" className="bg-card w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[10, 15, 20, 30, 40, 60].map((m) => (
									<SelectItem key={m} value={String(m)}>
										{m} min
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Campo>
				</div>
				<Pie guardando={guardando} onCancelar={() => onAbiertoChange(false)} onGuardar={guardar} etiqueta="Guardar horario" />
			</DialogContent>
		</Dialog>
	)
}

/** Bloquea un día completo o una sola franja. */
export function DialogoBloqueo({
	abierto,
	onAbiertoChange,
	hoy,
}: {
	abierto: boolean
	onAbiertoChange: (v: boolean) => void
	hoy: string
}) {
	const queryClient = useQueryClient()
	const [guardando, setGuardando] = useState(false)
	const [fecha, setFecha] = useState(hoy)
	const [hora, setHora] = useState("")
	const [motivo, setMotivo] = useState("")

	const guardar = async () => {
		setGuardando(true)
		try {
			await fetchApi.post(ENDPOINTS.adminBloqueosCitas, {
				fecha,
				...(hora ? { hora } : {}),
				...(motivo.trim() ? { motivo: motivo.trim() } : {}),
			})
			toast.success(hora ? "Horario bloqueado" : "Día bloqueado")
			await queryClient.invalidateQueries({ queryKey: ["admin-citas"] })
			onAbiertoChange(false)
		} catch (e) {
			toast.error(mensaje(e, "No fue posible bloquear el horario"))
		} finally {
			setGuardando(false)
		}
	}

	return (
		<Dialog open={abierto} onOpenChange={onAbiertoChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Bloquear agenda</DialogTitle>
					<DialogDescription>
						Sin hora se bloquea el día completo. Una cita existente debe cancelarse o reprogramarse antes.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
					<Campo id="fecha-bloqueo" label="Fecha">
						<Input id="fecha-bloqueo" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-card" />
					</Campo>
					<Campo id="hora-bloqueo" label="Hora (opcional)">
						<Input id="hora-bloqueo" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="bg-card" />
					</Campo>
				</div>
				<Campo id="motivo-bloqueo" label="Motivo (opcional)">
					<Textarea id="motivo-bloqueo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
				</Campo>
				<Pie
					guardando={guardando}
					onCancelar={() => onAbiertoChange(false)}
					onGuardar={guardar}
					etiqueta={hora ? "Bloquear horario" : "Bloquear día"}
				/>
			</DialogContent>
		</Dialog>
	)
}
