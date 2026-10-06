import { ENDPOINTS } from "./config"

/**
 * Modo demostración del registro.
 *
 * Permite recorrer el wizard completo sin servidor y sin llenar los campos,
 * para poder enseñarlo mientras el proyecto está a medio construir: la
 * validación no bloquea, las llamadas a la API se responden con datos de
 * ejemplo y se puede saltar de un paso a otro.
 *
 * **El único interruptor es `VITE_DEMO=1` en tiempo de compilación.**
 * `__DEMO__` queda como literal en el paquete (ver `vite.config.ts`), así que
 * no se puede encender desde el navegador: no hay parámetro en la URL ni
 * bandera en `sessionStorage` que valga. Una compilación de producción normal
 * —sin esa variable— no tiene forma de activarlo.
 *
 * Deliberadamente **no** hay aviso en pantalla: el proyecto se presenta por
 * partes durante dos meses y las pantallas deben verse como el producto que
 * serán, no como una maqueta. El aviso equivalente va a la consola, donde lo ve
 * quien desarrolla y no quien mira la presentación.
 *
 * Nada de lo que se captura en este modo sale del navegador.
 */

if (__DEMO__ && typeof console !== "undefined") {
	console.warn(
		"[RedVida] MODO DEMOSTRACIÓN ACTIVO: la validación del registro está " +
			"desactivada y las llamadas a la API se responden con datos de ejemplo. " +
			"Compilado con VITE_DEMO=1.",
	)
}

// -----------------------------------------------------------------------------
// Datos de ejemplo
//
// Solo lo que responde la API simulada. No hay datos de relleno para el
// formulario: sin validación se avanza con los campos vacíos, y un botón de
// "rellenar con ejemplo" delataba la demostración en la propia pantalla.
//
// El código de registro es verosímil a propósito: es la pantalla de cierre que
// se enseña y no contiene dato personal alguno.
// -----------------------------------------------------------------------------

const CODIGO_REGISTRO = "RV-2026-004821"

const catalogo = (...nombres: string[]) =>
	nombres.map((nombre, i) => ({ id: i + 1, clave: `c${i + 1}`, nombre, orden: i + 1 }))

// Espejo del cuestionario real, que desde RV-11 vive en `rv_cat_pregunta_elegibilidad`
// y se administra en `/admin/elegibilidad` (antes era un archivo de código,
// `elegibilidad.rules.ts`, ya eliminado). Esta copia es estática a propósito
// —el modo demo no llama a la API— así que un cambio hecho desde el panel NO
// se refleja aquí solo: si el cuestionario real cambia, hay que actualizar
// esto a mano o la demostración enseñará preguntas que ya no existen.
const CUESTIONARIO = {
	version: "v2",
	preguntas: [
		{
			clave: "cancer_5_anios",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto:
				"¿Ha tenido cáncer de la sangre, u otro cáncer diagnosticado en los últimos 5 años, o tratado con quimioterapia o radioterapia?",
		},
		{
			clave: "cardiopatia_cerebrovascular",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto: "¿Tiene o ha tenido enfermedades del corazón o cerebrovasculares?",
		},
		{
			clave: "trastorno_sangre_coagulacion",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto:
				"¿Tiene o ha tenido trastornos de la sangre o de la coagulación, aneurismas o trombosis venosa profunda?",
		},
		{
			clave: "neurologico",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto:
				"¿Le practicaron cirugía cerebral, ha tenido más de seis conmociones cerebrales o presenta síntomas neurológicos persistentes?",
		},
		{
			clave: "diabetes_insulina",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto: "¿Tiene diabetes tratada con insulina o con complicaciones?",
		},
		{
			clave: "dolor_cronico_severo",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto:
				"¿Tiene dolor crónico severo en cuello, espalda o columna que requiera analgésicos diarios o terapia física continua?",
		},
		{
			clave: "trasplante_previo",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			texto:
				"¿Ha recibido un trasplante de órgano sólido, de médula ósea o de células progenitoras?",
		},
		{
			clave: "vih",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			porConfirmar: true,
			texto: "¿Ha recibido un diagnóstico de VIH?",
		},
		{
			clave: "hepatitis_b_c",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			porConfirmar: true,
			texto: "¿Tiene hepatitis B o C activa?",
		},
		{
			clave: "drogas_intravenosas",
			seccion: "Condiciones médicas severas o crónicas",
			requiereFecha: false,
			porConfirmar: true,
			texto: "¿Ha usado drogas por vía intravenosa alguna vez?",
		},
		{
			clave: "med_anticoagulantes",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Toma anticoagulantes de forma habitual o diaria?",
		},
		{
			clave: "med_corazon",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Toma medicamentos para el corazón de forma habitual o diaria?",
		},
		{
			clave: "med_inmunosupresores",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Toma inmunosupresores o medicamentos biológicos de forma habitual o diaria?",
		},
		{
			clave: "med_quimioterapicos",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Toma quimioterápicos o medicamentos para el tratamiento del cáncer?",
		},
		{
			clave: "med_insulina",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Usa insulina de forma habitual o diaria?",
		},
		{
			clave: "med_corticosteroides",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Ha tomado corticosteroides orales por más de tres meses?",
		},
		{
			clave: "med_opioides",
			seccion: "Medicamentos de uso continuo",
			requiereFecha: false,
			texto: "¿Toma opioides o analgésicos de prescripción médica de uso diario o frecuente?",
		},
		{
			clave: "autoinmune_sistemica",
			seccion: "Enfermedades autoinmunes",
			requiereFecha: false,
			texto:
				"¿Padece alguna condición autoinmune sistémica o grave que afecte múltiples órganos o requiera tratamiento inmunosupresor intensivo?",
		},
		{
			clave: "embarazo",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Está embarazada o dio a luz recientemente?",
		},
		{
			clave: "cirugia_mayor",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Le practicaron una cirugía mayor recientemente?",
		},
		{
			clave: "tatuajes_perforacion",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Se hizo tatuajes o perforaciones recientemente?",
		},
		{
			clave: "transfusion",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Recibió una transfusión sanguínea recientemente?",
		},
		{
			clave: "vacunas_recientes",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Recibió alguna vacuna recientemente?",
		},
		{
			clave: "tratamiento_dental",
			seccion: "Situaciones recientes",
			requiereFecha: true,
			porConfirmar: true,
			texto: "¿Tuvo tratamiento dental recientemente?",
		},
	],
}

// El visor usa `react-markdown`, no HTML.
const CONSENTIMIENTO = {
	version: "2026.1",
	hash: "0".repeat(64),
	contenido: [
		"## Consentimiento informado",
		"",
		"### Qué acepta al registrarse",
		"",
		"Al incorporarse al registro, acepta que sus datos personales y su perfil",
		"HLA se utilicen para buscar compatibilidad con pacientes que necesitan un",
		"trasplante de células madre hematopoyéticas.",
		"",
		"### Qué implica ser compatible",
		"",
		"Si resulta compatible con un paciente, el centro de trasplantes se pondrá",
		"en contacto con usted. En ese momento se le explicará el procedimiento con",
		"detalle y se le realizarán estudios adicionales.",
		"",
		"1. Se le contacta por teléfono y correo electrónico.",
		"2. Se confirma la compatibilidad con una segunda muestra.",
		"3. Se valora su estado de salud.",
		"4. Se programa la donación.",
		"",
		"La donación **siempre es voluntaria**. Puede negarse en cualquier punto,",
		"incluso después de haber aceptado, sin tener que dar explicaciones y sin",
		"consecuencia alguna para usted.",
		"",
		"### Sus derechos",
		"",
		"Puede solicitar el acceso, la rectificación, la cancelación o la oposición",
		"al tratamiento de sus datos en cualquier momento. Retirarse del registro es",
		"un trámite de un solo paso y no requiere justificación.",
		"",
		"### Conservación de sus datos",
		"",
		"Sus datos se conservan mientras permanezca en el registro. Al retirarse se",
		"eliminan conforme a la política de retención vigente.",
		"",
		"---",
		"",
		"Al firmar declara que ha leído este documento, que ha entendido su",
		"contenido y que participa de forma libre y voluntaria.",
	].join("\n"),
}

/** Respuestas de ejemplo, por método y ruta. `null` = no hay simulación. */
function buscar(metodo: "get" | "post" | "patch", url: string): unknown | null {
	const es = (ruta: string) => url === ruta || url.startsWith(`${ruta}?`)

	if (metodo === "get") {
		if (es(ENDPOINTS.catalogo("sexo"))) return catalogo("Mujer", "Hombre")
		if (es(ENDPOINTS.catalogo("pais"))) return [{ id: 1, clave: "MX", nombre: "México", orden: 1 }]
		if (url.includes("/estados")) {
			return [{ id: 14, clave: "JAL", nombre: "Jalisco", pais_id: 1, abreviatura: "Jal." }]
		}
		if (url.includes("/municipios")) {
			return ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Tlajomulco"].map((nombre, i) => ({
				id: 39 + i,
				estado_id: 14,
				clave: `m${i}`,
				nombre,
			}))
		}
		if (es(ENDPOINTS.cuestionario)) return CUESTIONARIO
		if (es(ENDPOINTS.consentimientoVigente)) return CONSENTIMIENTO
		return null
	}

	if (es(ENDPOINTS.donadores)) return { id: 9001, codigo_registro: CODIGO_REGISTRO }
	if (es(ENDPOINTS.requestOtp)) return { enviado: true }
	if (es(ENDPOINTS.verifyOtp)) return { verificado: true }
	if (es(ENDPOINTS.elegibilidad)) return { resultado: "apto", motivos: [], bloqueado_hasta: null }
	if (es(ENDPOINTS.consentimientoAceptar)) {
		return {
			id: "00000000-0000-4000-8000-000000000000",
			codigo_registro: CODIGO_REGISTRO,
			version_documento: CONSENTIMIENTO.version,
			hash_documento: CONSENTIMIENTO.hash,
			pdf_hash: "0".repeat(64),
			fecha_aceptacion: new Date().toISOString(),
			estatus: "vigente",
		}
	}
	return null
}

/**
 * Respuesta simulada, o `null` si esta ruta no está cubierta y debe salir a la
 * red como siempre.
 *
 * Espera 350 ms a propósito: sin latencia no se ven los estados de carga, y al
 * enseñar la pantalla conviene que se comporte como se comportará de verdad.
 */
export async function respuestaDemo<T>(
	metodo: "get" | "post" | "patch",
	url: string,
): Promise<{ data: T } | null> {
	if (!__DEMO__) return null
	const data = buscar(metodo, url)
	if (data === null) return null
	await new Promise((listo) => setTimeout(listo, 350))
	return { data: data as T }
}
