export type CriterioBusqueda = "8/8" | "10/10" | "12/12"
export type TipoCoincidencia = "alelica" | "alta" | "potencial"

export interface DetalleLocus {
	locus: string
	match: 0 | 1 | 2
	tipo: TipoCoincidencia
	paciente: [string, string]
	donador: [string, string]
	mismatch?: { paciente: string; donador: string }
}

export interface ResultadoDonador {
	codigo_registro: string
	grado: string
	puntaje: number
	maximo: number
	detalle: DetalleLocus[]
	requiere_confirmacion: boolean
	edad_donador: number | null
	sexo_donador: number | null
	fecha_tipificacion: string | null
}

export interface RespuestaBusqueda {
	busqueda_id: string
	criterio: CriterioBusqueda
	total_resultados: number
	donadores_evaluados: number
	mejor_grado: number | null
	duracion_ms: number
	resultados: ResultadoDonador[]
}

export interface IdentidadRevelada {
	codigo_registro: string
	nombre: string
	apellido_pat: string
	apellido_mat: string | null
	email: string
	telefono: string | null
	celular: string | null
	fecha_nacimiento: string
	estatus: string
	revelacion_registrada: boolean
}

/** Loci de cada criterio. Debe coincidir con `rv_cat_locus_hla`. */
export const LOCI_POR_CRITERIO: Record<CriterioBusqueda, string[]> = {
	"8/8": ["A", "B", "C", "DRB1"],
	"10/10": ["A", "B", "C", "DRB1", "DQB1"],
	"12/12": ["A", "B", "C", "DRB1", "DQB1", "DPB1"],
}

export const JUSTIFICACION_MINIMA = 20
