import type { DonadorListado } from "./schema"

export const nombreCompleto = (d: Pick<DonadorListado, "nombre" | "apellido_pat" | "apellido_mat">) =>
	[d.nombre, d.apellido_pat, d.apellido_mat].filter(Boolean).join(" ")

/** Fecha larga en español. Una fecha sin hora se fija a mediodía UTC para que la zona horaria no la corra un día. */
export const fechaLarga = (valor: string | null | undefined) => {
	if (!valor) return null
	const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00Z` : valor
	return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
}

export const edadDe = (fechaNacimiento: string) => {
	const nacimiento = new Date(`${fechaNacimiento.slice(0, 10)}T12:00:00Z`)
	const hoy = new Date()
	let años = hoy.getUTCFullYear() - nacimiento.getUTCFullYear()
	const mes = hoy.getUTCMonth() - nacimiento.getUTCMonth()
	if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nacimiento.getUTCDate())) años--
	return años
}
