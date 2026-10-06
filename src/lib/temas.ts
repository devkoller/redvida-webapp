/**
 * Las cuatro combinaciones de color que Red Vida puso a elegir.
 *
 * Aquí vive solo lo que la interfaz necesita para PRESENTARLAS (nombre, para
 * qué sirve cada una, muestras). Los valores que pinta el navegador están en
 * `src/paletas.css`, generado por `docs/paletas/generar_css.py`.
 *
 * `actual` no es una propuesta: es el rojo institucional que la página ya usa.
 * Se deja en la lista para poder comparar contra lo que hay hoy, y es lo que
 * se ve mientras nadie elija otra cosa.
 */
export const PALETAS = [
	{
		id: "actual",
		nombre: "Actual",
		resumen: "Rojo institucional",
		detalle: "Lo que la página usa hoy. Sirve de referencia para comparar.",
		muestras: ["#FFFFFF", "#F4F4F5", "#7B0D1E", "#7B0D1E"],
	},
	{
		id: "clinica",
		nombre: "Clínica y tecnológica",
		resumen: "Azul petróleo",
		detalle: "Seria y sanitaria. La más neutra de las cuatro.",
		muestras: ["#F8FAF9", "#ECF1F2", "#123C4A", "#FC4B08"],
	},
	{
		id: "biotec",
		nombre: "Biotecnología y vida",
		resumen: "Verde petróleo",
		detalle: "Más orgánica; el verde apunta a regeneración.",
		muestras: ["#FAFAF7", "#E4EEEB", "#174C45", "#FC4B08"],
	},
	{
		id: "premium",
		nombre: "Moderna y premium",
		resumen: "Azul noche",
		detalle: "Institución médica de gama alta. La de más contraste.",
		muestras: ["#FAF9F7", "#F1EFEC", "#182A3A", "#FC4B08"],
	},
	{
		id: "limpia",
		nombre: "Limpia y médica",
		resumen: "Gris frío",
		detalle: "Luminosa y minimalista. El naranja resalta más aquí.",
		muestras: ["#FFFFFF", "#EEF2F3", "#163A4A", "#FC4B08"],
	},
] as const

export type PaletaId = (typeof PALETAS)[number]["id"]

export const PALETA_POR_OMISION: PaletaId = "actual"

export function esPaleta(valor: string | null): valor is PaletaId {
	return PALETAS.some((p) => p.id === valor)
}
