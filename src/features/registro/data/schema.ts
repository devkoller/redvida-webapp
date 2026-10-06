import { z } from "zod"

/**
 * Esquemas de validación del wizard.
 *
 * Duplican deliberadamente parte de lo que valida el backend. No es
 * desconfianza: es que corregir un campo sin esperar el viaje al servidor es la
 * diferencia entre completar el registro y abandonarlo. **El backend sigue
 * siendo la autoridad**; esto solo evita viajes de ida y vuelta obvios.
 */

export const EDAD_MINIMA = 18
export const EDAD_MAXIMA = 35

const RE_CURP = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/

/** Edad cumplida. Mismo cálculo que `calcularEdad` del backend. */
export function calcularEdad(fechaISO: string, referencia = new Date()): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null
	const nacimiento = new Date(`${fechaISO}T12:00:00Z`)
	if (Number.isNaN(nacimiento.getTime())) return null

	let edad = referencia.getUTCFullYear() - nacimiento.getUTCFullYear()
	const mes = referencia.getUTCMonth() - nacimiento.getUTCMonth()
	if (mes < 0 || (mes === 0 && referencia.getUTCDate() < nacimiento.getUTCDate())) edad -= 1
	return edad
}

const textoRequerido = (etiqueta: string, max: number) =>
	z
		.string()
		.trim()
		.min(1, `${etiqueta} es obligatorio`)
		.max(max, `${etiqueta} no puede exceder ${max} caracteres`)

export const datosPersonalesSchema = z.object({
	nombre: textoRequerido("El nombre", 50),
	apellido_pat: textoRequerido("El apellido paterno", 50),
	apellido_mat: z.string().trim().max(50, "El apellido materno no puede exceder 50 caracteres"),

	fecha_nacimiento: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento es obligatoria")
		.refine((valor) => {
			const edad = calcularEdad(valor)
			return edad !== null && edad >= EDAD_MINIMA && edad <= EDAD_MAXIMA
		}, `La donación de células madre requiere tener entre ${EDAD_MINIMA} y ${EDAD_MAXIMA} años cumplidos`),

	sexo_id: z.string().min(1, "Debe seleccionar el sexo"),

	curp: z
		.string()
		.trim()
		.toUpperCase()
		.length(18, "La CURP debe tener 18 caracteres")
		.regex(RE_CURP, "La CURP no tiene un formato válido"),

	email: z
		.string()
		.trim()
		.toLowerCase()
		.min(1, "El correo electrónico es obligatorio")
		.email("El correo electrónico no tiene un formato válido")
		.max(150, "El correo electrónico no puede exceder 150 caracteres"),

	telefono: z.string().trim().max(30, "El teléfono no puede exceder 30 caracteres"),
	celular: z.string().trim().max(30, "El celular no puede exceder 30 caracteres"),
	direccion: z.string().trim().max(255, "La dirección no puede exceder 255 caracteres"),
	codigo_postal: z.string().trim().max(10, "El código postal no puede exceder 10 caracteres"),
	pais_id: z.string(),
	estado_id: z.string(),
	municipio_id: z.string(),

	/**
	 * Sección 1 del cuestionario de elegibilidad de Red Vida.
	 *
	 * De los dos requisitos de esa sección solo se pregunta este. La edad no:
	 * ya se deriva de la fecha de nacimiento y de la CURP, y volver a
	 * preguntarla permitiría declarar algo que contradice los propios datos.
	 *
	 * `boolean()`: un "no" es una respuesta válida que lleva a la pantalla de
	 * agradecimiento (ver `PasoDatos`), no un error del formulario. Solo quien
	 * responde "sí" llega a enviar los datos; por eso el payload lo exige.
	 */
	acepta_donar: z.boolean({ message: "Responda si tiene disposición de donar" }),
})

export type DatosPersonalesForm = z.infer<typeof datosPersonalesSchema>

export const otpSchema = z.object({
	otp: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "El código debe tener 6 dígitos"),
})

export type OtpForm = z.infer<typeof otpSchema>

/** Convierte el formulario al payload que espera `POST /v1/donadores`. */
export function aPayloadAlta(datos: DatosPersonalesForm) {
	const opcional = (valor: string) => (valor.trim().length > 0 ? valor.trim() : undefined)
	const numero = (valor: string) => (valor.trim().length > 0 ? Number(valor) : undefined)

	return {
		nombre: datos.nombre.trim(),
		apellido_pat: datos.apellido_pat.trim(),
		apellido_mat: opcional(datos.apellido_mat),
		fecha_nacimiento: datos.fecha_nacimiento,
		sexo_id: Number(datos.sexo_id),
		curp: datos.curp.trim().toUpperCase(),
		email: datos.email.trim().toLowerCase(),
		telefono: opcional(datos.telefono),
		celular: opcional(datos.celular),
		direccion: opcional(datos.direccion),
		codigo_postal: opcional(datos.codigo_postal),
		pais_id: numero(datos.pais_id),
		estado_id: numero(datos.estado_id),
		municipio_id: numero(datos.municipio_id),
		acepta_donar: datos.acepta_donar,
	}
}
