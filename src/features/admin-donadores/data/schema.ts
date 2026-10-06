export type EstatusDonador =
	| "pre_registro"
	| "verificado"
	| "elegible"
	| "tipificado"
	| "disponible"
	| "suspendido"
	| "baja"

export interface DonadorListado {
	id: number
	codigo_registro: string
	nombre: string
	apellido_pat: string
	apellido_mat: string | null
	curp: string | null
	fecha_nacimiento: string
	sexo_id: number | null
	estado_id: number | null
	estatus: EstatusDonador
	email_verificado: boolean
	activo: boolean
	ciclo_dato: string
	createdAt: string
	loci_tipificados: number
}

/**
 * Colores por estatus.
 *
 * `disponible` va en verde y no con la variante `default`: ésta pinta el rojo
 * institucional y se confundiría con `baja` (`destructive`) de un vistazo.
 */
export const ESTATUS_DONADOR: Record<
	EstatusDonador,
	{
		etiqueta: string
		variante: "default" | "secondary" | "destructive" | "outline"
		clase?: string
	}
> = {
	pre_registro: { etiqueta: "Pre-registro", variante: "outline" },
	verificado: { etiqueta: "Verificado", variante: "secondary" },
	elegible: { etiqueta: "Elegible", variante: "secondary" },
	tipificado: { etiqueta: "Tipificado", variante: "secondary" },
	disponible: {
		etiqueta: "Disponible",
		variante: "outline",
		clase: "border-success/40 bg-success/10 text-success",
	},
	suspendido: {
		etiqueta: "Suspendido",
		variante: "outline",
		clase: "border-warning/50 bg-warning/10",
	},
	baja: { etiqueta: "Baja", variante: "destructive" },
}

export interface DetalleDonador {
	donador: DonadorListado & {
		email: string
		telefono: string | null
		celular: string | null
		direccion: string | null
		codigo_postal: string | null
		motivo_baja: string | null
		grupo_sanguineo: string | null
		rh: string | null
		peso_kg: string | null
		cmv_serologia: string | null
	}
	elegibilidades: {
		id: string
		resultado: string
		motivos: { clave: string; descripcion: string }[]
		bloqueado_hasta: string | null
		version_cuestionario: string
		createdAt: string
	}[]
	consentimientos: {
		id: string
		version_documento: string
		hash_documento: string
		pdf_hash: string | null
		fecha_aceptacion: string
	}[]
	hla: {
		perfiles: {
			locus: string
			alelo_1_raw: string
			alelo_2_raw: string
			resolucion: string
			metodo: string
			laboratorio: string | null
			fecha_tipificacion: string
			disponible: boolean
		}[]
		completo_10_10: boolean
		loci_faltantes: string[]
	}
	muestras: {
		id: number
		folio_muestra: string
		tipo_muestra: string
		clues_toma: string | null
		fecha_toma: string
		responsable_toma: string | null
		estatus: string
	}[]
}
