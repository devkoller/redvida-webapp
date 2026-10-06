import {
	esLaborable,
	estatusEfectivo,
	franjasPorDia,
	inicioDe,
	sumarDias,
	ymd,
	type Cita,
	type ConfigAgenda,
	type EstatusEfectivo,
} from "./citas"

export type Conteo = Record<EstatusEfectivo, number>
const vacio = (): Conteo => ({ programada: 0, atendida: 0, por_cerrar: 0, cancelada: 0 })

/** Todo se calcula sobre las citas ya descargadas: son agregados, no consultas nuevas. */
export function calcularMetricas(citas: Cita[], config: ConfigAgenda | undefined, ahora: Date) {
	const hoy = ymd(ahora)
	const franjas = franjasPorDia(config)
	const efectivas = citas.map((c) => ({ c, e: estatusEfectivo(c, ahora) }))

	// --- KPIs
	const deHoy = efectivas.filter(({ c, e }) => c.fecha === hoy && e !== "cancelada")
	const hoyAtendidas = deHoy.filter(({ e }) => e === "atendida").length

	const limite7 = ymd(sumarDias(ahora, 7))
	const proximas7 = efectivas.filter(({ c, e }) => e === "programada" && c.fecha >= hoy && c.fecha <= limite7).length
	let capacidad7 = 0
	for (let i = 0; i < 7; i++) if (esLaborable(sumarDias(ahora, i))) capacidad7 += franjas

	const yaOcurridas = efectivas.filter(({ e }) => e === "atendida" || e === "por_cerrar")
	const atendidas = yaOcurridas.filter(({ e }) => e === "atendida").length
	const asistencia = yaOcurridas.length ? Math.round((atendidas / yaOcurridas.length) * 100) : null

	const porCerrar = efectivas.filter(({ e }) => e === "por_cerrar").length

	// --- Total por estatus
	const total = vacio()
	for (const { e } of efectivas) total[e]++
	const conCancel = total.cancelada
	const tasaCancelacion = citas.length ? Math.round((conCancel / citas.length) * 100) : null

	// --- Próximos 10 días laborables: programadas contra capacidad
	const dias: { fecha: string; total: number; capacidad: number }[] = []
	for (let i = 0; dias.length < 10 && i < 30; i++) {
		const d = sumarDias(ahora, i)
		if (!esLaborable(d)) continue
		const fecha = ymd(d)
		dias.push({
			fecha,
			total: efectivas.filter(({ c, e }) => c.fecha === fecha && e === "programada").length,
			capacidad: franjas,
		})
	}

	// --- Semanas (lunes a domingo): 7 hacia atrás y 2 hacia adelante
	const lunes = (d: Date) => sumarDias(d, -((d.getDay() + 6) % 7))
	const base = lunes(ahora)
	const semanas = Array.from({ length: 10 }, (_, i) => {
		const inicio = sumarDias(base, (i - 7) * 7)
		const ini = ymd(inicio)
		const fin = ymd(sumarDias(inicio, 6))
		const conteo = vacio()
		for (const { c, e } of efectivas) if (c.fecha >= ini && c.fecha <= fin) conteo[e]++
		return { inicio: ini, conteo, actual: i === 7 }
	})

	// --- Horarios más solicitados (sin canceladas), por hora del día
	const porHora = new Map<number, number>()
	for (const { c, e } of efectivas) {
		if (e === "cancelada") continue
		const h = inicioDe(c).getHours()
		porHora.set(h, (porHora.get(h) ?? 0) + 1)
	}
	const horas = [...porHora.entries()].sort((a, b) => a[0] - b[0]).map(([hora, total]) => ({ hora, total }))

	return {
		kpis: {
			hoy: deHoy.length,
			hoyAtendidas,
			proximas7,
			ocupacion7: capacidad7 ? Math.round((proximas7 / capacidad7) * 100) : null,
			asistencia,
			yaOcurridas: yaOcurridas.length,
			atendidas,
			porCerrar,
			tasaCancelacion,
		},
		total,
		dias,
		semanas,
		horas,
		sinDatos: citas.length === 0,
	}
}
