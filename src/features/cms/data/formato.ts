export const fechaHora = (iso: string | null | undefined) =>
	iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : null

/** Texto corto para reconocer un bloque en la lista: su título, o el primer texto que tenga. */
export const resumenBloque = (contenido: Record<string, any> | null | undefined) => {
	if (!contenido) return ""
	const crudo =
		contenido.titulo ??
		Object.values(contenido).find((v) => typeof v === "string" && v.trim().length > 0) ??
		""
	const texto = String(crudo)
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 120)
	// Los bloques de lista (preguntas, tarjetas, pasos…) dicen cuántos elementos traen.
	const lista = Object.entries(contenido).find(([, v]) => Array.isArray(v))
	const cuenta = lista ? ` · ${(lista[1] as unknown[]).length} ${lista[0].replace(/_/g, " ")}` : ""
	return texto + cuenta
}
