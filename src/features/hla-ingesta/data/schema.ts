/** Tipos del módulo de ingesta HLA. */

export type EstatusLote = "pendiente" | "validando" | "procesando" | "completado" | "fallido"

export interface ErrorFila {
	linea: number
	codigo_registro?: string
	locus?: string
	campo?: string
	mensaje: string
}

export interface ResultadoIngesta {
	lote_id: number
	estatus: "completado" | "fallido"
	total_registros: number
	procesados: number
	errores: number
	detalle_errores: ErrorFila[]
	donadores_actualizados: string[]
}

export interface Lote {
	id: number
	nombre_archivo: string
	formato: "CSV" | "XLSX" | "HML"
	laboratorio: string | null
	total_registros: number
	procesados: number
	errores: number
	estatus: EstatusLote
	procesado_en: string | null
	createdAt: string
}

/**
 * Etiquetas y color de cada estatus.
 *
 * "Completado" **no** usa la variante `default`: ésa pinta el rojo institucional
 * y quedaría casi idéntica a "Fallido" (`destructive`). En una tabla cuyo
 * propósito es distinguir de un vistazo qué lotes fallaron, eso es inservible.
 * Se usa el verde de `--success` con clases explícitas.
 */
export const ESTATUS_LOTE: Record<
	EstatusLote,
	{
		etiqueta: string
		variante: "default" | "secondary" | "destructive" | "outline"
		clase?: string
	}
> = {
	pendiente: { etiqueta: "Pendiente", variante: "outline" },
	validando: { etiqueta: "Validando", variante: "secondary" },
	procesando: { etiqueta: "Procesando", variante: "secondary" },
	completado: {
		etiqueta: "Completado",
		variante: "outline",
		clase: "border-success/40 bg-success/10 text-success",
	},
	fallido: { etiqueta: "Fallido", variante: "destructive" },
}
