export type EstatusCita = "programada" | "atendida" | "cancelada"
/** `por_cerrar`: la cita ya debió ocurrir y sigue "programada" — nadie la marcó atendida ni cancelada. */
export type EstatusEfectivo = EstatusCita | "por_cerrar"

export interface Cita {
	id: number
	fecha: string
	hora: string
	estatus: EstatusCita
	motivo_cancelacion?: string | null
	donador: {
		codigo_registro: string
		nombre: string
		apellido_pat: string
		apellido_mat?: string | null
	}
}

export interface ConfigAgenda {
	hora_inicio: string
	hora_fin: string
	intervalo_minutos: number
}

export const ESTATUS_CITA: Record<
	EstatusEfectivo,
	{ etiqueta: string; variante: "default" | "secondary" | "destructive" | "outline"; clase?: string; barra: string; trazo: string }
> = {
	programada: { etiqueta: "Programada", variante: "secondary", barra: "bg-primary", trazo: "stroke-primary" },
	atendida: {
		etiqueta: "Atendida",
		variante: "default",
		clase: "bg-success text-success-foreground",
		barra: "bg-success",
		trazo: "stroke-success",
	},
	por_cerrar: {
		etiqueta: "Por cerrar",
		variante: "default",
		clase: "bg-warning text-warning-foreground",
		barra: "bg-warning",
		trazo: "stroke-warning",
	},
	cancelada: { etiqueta: "Cancelada", variante: "destructive", barra: "bg-destructive", trazo: "stroke-destructive" },
}

/** Fecha local `YYYY-MM-DD`. `toISOString()` da la fecha en UTC y de noche en México ya es "mañana". */
export const ymd = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export const sumarDias = (d: Date, dias: number) => {
	const r = new Date(d)
	r.setDate(r.getDate() + dias)
	return r
}

/** Una fecha sin hora se fija a mediodía local para que ninguna zona horaria la corra de día. */
export const aFecha = (fecha: string) => new Date(`${fecha}T12:00:00`)

export const inicioDe = (c: Pick<Cita, "fecha" | "hora">) => new Date(`${c.fecha}T${c.hora.slice(0, 5)}:00`)

export const estatusEfectivo = (c: Cita, ahora: Date): EstatusEfectivo =>
	c.estatus === "programada" && inicioDe(c) < ahora ? "por_cerrar" : c.estatus

const min = (hora: string) => {
	const [h, m] = hora.slice(0, 5).split(":").map(Number)
	return h * 60 + m
}

/** Franjas por día laborable según la configuración de la agenda. */
export const franjasPorDia = (c?: ConfigAgenda) =>
	c ? Math.floor((min(c.hora_fin) - min(c.hora_inicio)) / c.intervalo_minutos) : 0

export const esLaborable = (d: Date) => d.getDay() >= 1 && d.getDay() <= 5

export const nombreDonador = (d: Cita["donador"]) =>
	[d.nombre, d.apellido_pat, d.apellido_mat].filter(Boolean).join(" ")

export const diaCorto = (fecha: string) =>
	aFecha(fecha).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
