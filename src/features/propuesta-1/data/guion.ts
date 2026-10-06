/**
 * Guion de la landing narrativa · RV-L0.1
 *
 * El contenido vive aquí **con la misma forma que tienen los bloques del CMS**
 * (`tipo` + `contenido`), para que conectarlo al snapshot publicado en la fase
 * L6 sea un cambio de origen de datos y no una reescritura de los componentes.
 *
 * Cada sección declara además cuatro cosas que no existen en el CMS:
 *
 * - **`acto`** — a qué momento de la historia pertenece. De ahí salen los
 *   umbrales de la coreografía, sin números mágicos.
 * - **`lado`** — de qué lado va el texto. La esfera se coloca **siempre en el
 *   margen contrario**, y el velo que garantiza el contraste se pinta del lado
 *   del texto. Una sola decisión gobierna composición y legibilidad.
 * - **`alto`** — cuántas pantallas ocupa. Es lo que le da tiempo a la animación.
 * - **`ambiente`** — qué clima de fondo le toca. Solo se declara donde cambia:
 *   las secciones de un mismo capítulo comparten fondo por herencia.
 *
 * ---
 *
 * ⚠️ **Los textos son un borrador de redacción, no contenido aprobado.** Las
 * cifras clínicas provienen de `plan_implementacion.md` §1. Antes de publicar
 * esto tiene que revisarlo el área médica y la jurídica: el bloqueante #1 del
 * `HANDOFF.md` sigue en pie.
 */

/** Los cinco momentos de la historia. Ver §1.1 de `plan_landing_3d.md`. */
export const ACTOS = {
	/** Figura A erguida y encendida. La esfera aún está dentro de su pecho. */
	reposo: 0,
	/** La esfera sale del pecho de A, que se va con el hero. */
	emision: 1,
	/** La esfera recorre la página acompañando cada sección. */
	trayecto: 2,
	/** Aparece la figura B, encorvada y apagada. La esfera entra en su pecho. */
	encuentro: 3,
	/** B se endereza y se enciende. Cae sobre el CTA final. */
	resolucion: 4,
} as const

export type Acto = (typeof ACTOS)[keyof typeof ACTOS]

/** Posición de la esfera en el escenario, que abarca `x ∈ [-3.3, 3.3]`. */
export type Luz = [x: number, y: number, z: number]

/** De qué lado se coloca el TEXTO. La esfera va siempre al contrario. */
export type Lado = "izquierda" | "derecha"

/**
 * X de la esfera según el lado del texto.
 *
 * **Es una regla de legibilidad, no de estética.** El halo usa mezcla aditiva:
 * suma luz sobre lo que haya debajo. Medido sobre el fondo definitivo, el texto
 * secundario aguanta un incremento de luminancia de 0.036 antes de bajar del
 * 4.5:1 que exige WCAG AA, y el color de acento apenas 0.005. Con el resplandor
 * pasando por encima del texto haría falta un velo del 95 % o más para
 * compensarlo — es decir, tapar la escena entera y quedarnos sin animación.
 *
 * No hay término medio: o la esfera no pisa el texto, o el texto deja de
 * cumplir. Por eso van a lados opuestos, siempre.
 *
 * El valor 2.0 es el máximo que admite el encuadre: más allá, el halo se corta
 * contra el borde de la pantalla en vez de desvanecerse.
 */
const X_SEGUN_LADO: Record<Lado, number> = {
	izquierda: 2.0,
	derecha: -2.0,
}

/**
 * Ambientes de fondo · RV-L4.4
 *
 * El fondo vivo de la página no cambia sección a sección: **cambia por
 * capítulo**. Trece fondos distintos en trece pantallas se leería como un
 * carrusel, y un solo fondo para toda la página es lo que hacía que el centro
 * del recorrido pareciera muerto. Las secciones se agrupan en seis climas, y
 * dentro de un clima el fondo solo respira.
 *
 * Cada clave se corresponde con un color y una posición declarados en
 * `propuesta.css` (`[data-ambiente="..."]`). Aquí solo se dice **dónde cambia
 * el clima**, que es una decisión del guion, no de la hoja de estilos.
 */
export type ClaveAmbiente =
	/** Apertura. El rojo de marca: la persona que ya está encendida. */
	| "brasa"
	/** La explicación. Ámbar cálido, la luz que acaba de salir. */
	| "ambar"
	/** Las cifras y la dificultad de coincidir. Se cierra y se enfría. */
	| "urgencia"
	/** El recorrido del proceso. Violeta: es el tramo largo, el viaje. */
	| "trayecto"
	/** Dudas y datos personales. Azul frío, el clima de lo que tranquiliza. */
	| "confianza"
	/** El cierre. Vuelve el calor, ya no como brasa sino como amanecer. */
	| "amanecer"

interface SeccionDeclarada {
	/** Ancla estable. Se usa para `id` del DOM y como clave de React. */
	id: string
	/** Coincide con los tipos de bloque del CMS salvo `manifiesto` y `lista`. */
	tipo:
		| "hero"
		| "manifiesto"
		| "texto"
		| "estadisticas"
		| "timeline"
		| "tarjetas"
		| "lista"
		| "cierre"
		| "cta"
	acto: Acto
	lado: Lado
	/** Rótulo de capítulo. Es lo que marca el cambio de sección al hacer scroll. */
	capitulo?: string
	/** Altura de la esfera. Por omisión 1.4. */
	altura?: number
	/** Profundidad de la esfera. Variarla evita que el zigzag se lea plano. */
	z?: number
	/** Posición explícita, solo para los pechos de las dos figuras. */
	luz?: Luz
	/**
	 * Alto en pantallas. Por omisión 1.
	 *
	 * Con todas las secciones a una pantalla, el último acto —la esfera llegando,
	 * la persona irguiéndose— se comprimía en el 8 % final del scroll y pasaba de
	 * largo. El clímax necesita recorrido propio, y el espacio oscuro de más
	 * forma parte del efecto.
	 */
	alto?: number
	/**
	 * Clima de fondo. **Solo se declara donde cambia**: una sección sin
	 * `ambiente` hereda el de la anterior, que es lo que hace que un capítulo
	 * entero comparta fondo sin repetir la clave en cada bloque.
	 */
	ambiente?: ClaveAmbiente
	contenido: Record<string, any>
}

export interface Seccion extends SeccionDeclarada {
	luz: Luz
	/** Ya resuelto: heredado de la sección anterior si no se declaró. */
	ambiente: ClaveAmbiente
}

const SECCIONES: SeccionDeclarada[] = [
	// ---------------------------------------------------------------- acto 0
	{
		id: "hero",
		ambiente: "brasa",
		tipo: "hero",
		acto: ACTOS.reposo,
		lado: "izquierda",
		// El pecho de la figura A: de ahí sale la esfera.
		luz: [2.0, 1.15, 0.2],
		contenido: {
			antetitulo: "Registro público de donadores · Jalisco",
			titulo: "Sé la coincidencia que alguien está esperando",
			subtitulo:
				"En algún hospital de este estado hay una persona cuya única cura es una célula que tú tienes. No hace falta que la conozcas. Hace falta que estés en la lista.",
			cta_texto: "Registrarme como donador",
			cta_url: "/registro",
			nota: "Gratuito · Voluntario · Puedes retirarte cuando quieras",
		},
	},

	// ---------------------------------------------------------------- acto 1
	{
		id: "manifiesto",
		tipo: "manifiesto",
		acto: ACTOS.emision,
		lado: "izquierda",
		altura: 1.75,
		z: 0.7,
		contenido: {
			texto: "Donar células madre no es dar algo que te falte después.",
			pie: "Tu cuerpo repone lo donado en unas semanas. La persona que lo recibe vive.",
		},
	},

	// ---------------------------------------------------------------- acto 2
	{
		id: "que-es",
		ambiente: "ambar",
		tipo: "texto",
		acto: ACTOS.trayecto,
		capitulo: "01 · Qué es RedVida",
		lado: "derecha",
		altura: 1.3,
		z: 0.4,
		contenido: {
			titulo: "Un registro público de donadores voluntarios",
			entrada:
				"RedVida es el padrón estatal de personas dispuestas a donar células madre hematopoyéticas en Jalisco.",
			apartados: [
				{
					subtitulo: "Registrarte no es donar",
					texto:
						"Es entrar en una lista. Si algún día tu perfil coincide con el de un paciente, el equipo clínico podrá encontrarte y preguntarte. Puedes decir que sí entonces, o no.",
				},
				{
					subtitulo: "Por qué hace falta que exista",
					texto:
						"Sin registro, encontrar un donador compatible depende de la familia y de la suerte. Con registro, depende de cuánta gente se apuntó antes. Es la diferencia entre esperar y buscar.",
				},
			],
		},
	},
	{
		id: "ciencia",
		tipo: "texto",
		acto: ACTOS.trayecto,
		capitulo: "02 · Qué son las células madre",
		lado: "izquierda",
		altura: 1.7,
		z: -0.2,
		contenido: {
			titulo: "La fábrica de tu sangre",
			entrada:
				"Las células madre hematopoyéticas viven en tu médula ósea y fabrican, todos los días, las tres cosas de las que está hecha tu sangre.",
			apartados: [
				{
					subtitulo: "Qué producen",
					texto:
						"Glóbulos rojos, que llevan oxígeno. Glóbulos blancos, que te defienden. Plaquetas, que cierran las heridas. Cientos de miles de millones cada día, sin que te enteres.",
				},
				{
					subtitulo: "Qué pasa cuando esa fábrica falla",
					texto:
						"En una leucemia, la médula produce células defectuosas y deja de producir las sanas. La quimioterapia puede vaciarla, pero luego hay que volver a llenarla: ahí entra un donador. Sus células repueblan la médula y vuelven a fabricar sangre sana.",
				},
				{
					subtitulo: "Para qué enfermedades sirve",
					texto:
						"El trasplante de células progenitoras hematopoyéticas es el único tratamiento curativo disponible para leucemias agudas y crónicas, linfomas, síndromes mielodisplásicos, aplasia medular severa e inmunodeficiencias congénitas.",
				},
			],
		},
	},
	{
		id: "cifras",
		ambiente: "urgencia",
		tipo: "estadisticas",
		acto: ACTOS.trayecto,
		capitulo: "03 · Por qué urge",
		lado: "derecha",
		altura: 1.1,
		z: 0.8,
		contenido: {
			titulo: "El problema, en tres números",
			descripcion: "Ninguno de los tres se arregla con dinero. Se arreglan con gente registrada.",
			cifras: [
				{
					valor: "30 %",
					etiqueta: "de los pacientes encuentra un donador compatible entre sus hermanos",
				},
				{
					valor: "70 %",
					etiqueta: "depende de que un desconocido se haya registrado antes que él",
				},
				{
					valor: "~2 000",
					etiqueta: "trasplantes se estiman necesarios cada año en México",
				},
			],
		},
	},
	{
		id: "compatibilidad",
		tipo: "texto",
		acto: ACTOS.trayecto,
		capitulo: "04 · Por qué es difícil coincidir",
		lado: "izquierda",
		altura: 1.55,
		z: -0.3,
		contenido: {
			titulo: "Diez marcadores tienen que encajar",
			entrada:
				"No la decide el tipo de sangre, sino el sistema HLA: los marcadores con los que tu cuerpo distingue lo propio de lo ajeno.",
			apartados: [
				{
					subtitulo: "El sistema más variable que tenemos",
					texto:
						"Es la región más variable del genoma humano: se conocen decenas de miles de variantes. Heredas la mitad de cada progenitor, y esa combinación es casi una firma.",
				},
				{
					subtitulo: "Qué significa un 10/10",
					texto:
						"Se evalúan cinco pares de marcadores. Que los diez coincidan es el estándar entre personas no emparentadas; cada desacuerdo sube el riesgo de rechazo.",
				},
				{
					subtitulo: "Por eso hacen falta muchos",
					texto:
						"Coincidir entre desconocidos es improbable, y deja de serlo cuando el padrón es grande. Un registro no busca al donador perfecto: hace probable que exista.",
				},
			],
		},
	},
	{
		id: "recorrido",
		ambiente: "trayecto",
		tipo: "timeline",
		acto: ACTOS.trayecto,
		capitulo: "05 · Cómo funciona",
		lado: "derecha",
		altura: 1.2,
		z: 0.5,
		alto: 1.3,
		contenido: {
			titulo: "Del registro al trasplante",
			descripcion: "Cuatro pasos. Solo el segundo es presencial, y dura menos que un café.",
			pasos: [
				{
					titulo: "Te registras en línea",
					texto: "Tus datos y tu consentimiento informado. Con tu CURP y un correo basta.",
					icono: "ClipboardCheck",
				},
				{
					titulo: "Das una muestra",
					texto:
						"Un hisopo por dentro de la mejilla. Sin agujas, sin ayuno, sin análisis de sangre.",
					icono: "TestTube",
				},
				{
					titulo: "Entras al padrón",
					texto:
						"El laboratorio determina tu perfil HLA y lo guarda bajo un código, separado de tu nombre.",
					icono: "Fingerprint",
				},
				{
					titulo: "Si coincides, te buscamos",
					texto: "Puede ser en un mes, en diez años o nunca. Las tres cosas están bien.",
					icono: "HeartHandshake",
				},
			],
		},
	},
	{
		id: "donacion",
		tipo: "texto",
		acto: ACTOS.trayecto,
		capitulo: "06 · Si algún día coincides",
		lado: "izquierda",
		altura: 1.6,
		z: 0.2,
		contenido: {
			titulo: "Cómo es donar, de verdad",
			entrada:
				"Casi todo lo que da miedo de donar viene de una imagen antigua: una aguja enorme en la columna. Hoy la mayoría de las donaciones no se parecen a eso.",
			apartados: [
				{
					subtitulo: "95 % de los casos: por la vena",
					texto:
						"Unos días de medicamento hacen que tus células madre pasen de la médula a la sangre. Después, una máquina las separa y te devuelve el resto: como donar plaquetas. Sales caminando el mismo día.",
				},
				{
					subtitulo: "5 % de los casos: punción de médula",
					texto:
						"Cuando el paciente lo requiere, se extrae del hueso de la cadera con anestesia general. Es ambulatoria; las molestias duran unos días.",
				},
				{
					subtitulo: "Tu cuerpo se repone",
					texto:
						"Lo donado se regenera en pocas semanas. No te quedas con menos defensas ni con menos sangre de la que necesitas.",
				},
			],
		},
	},
	{
		id: "requisitos",
		tipo: "lista",
		acto: ACTOS.trayecto,
		capitulo: "07 · Quién puede registrarse",
		lado: "derecha",
		altura: 1.45,
		z: -0.1,
		contenido: {
			titulo: "Los requisitos son pocos",
			descripcion: "Si cumples estos cuatro, ya puedes entrar al padrón hoy mismo.",
			puntos: [
				"Tener entre 18 y 35 años cumplidos.",
				"Gozar de buena salud general, sin enfermedades hematológicas ni oncológicas.",
				"No vivir con VIH ni con hepatitis B o C.",
				"Estar dispuesto a donar a quien lo necesite, sea quien sea.",
			],
			nota: "El cuestionario de elegibilidad al final del registro confirma el resto. Toma menos de dos minutos.",
		},
	},
	{
		id: "dudas",
		ambiente: "confianza",
		tipo: "tarjetas",
		acto: ACTOS.trayecto,
		capitulo: "08 · Lo que todos preguntan",
		lado: "izquierda",
		altura: 1.35,
		z: 0.6,
		alto: 1.3,
		contenido: {
			titulo: "Cuatro dudas, cuatro respuestas",
			tarjetas: [
				{
					titulo: "¿Me va a doler?",
					texto:
						"Registrarte, no: es un hisopo bucal. Y si algún día donas, en 19 de cada 20 casos es por vía intravenosa, sin cirugía.",
					icono: "ShieldCheck",
				},
				{
					titulo: "¿Cuesta algo?",
					texto:
						"Nada, en ninguna dirección. La Ley General de Salud prohíbe cualquier pago por donar tejidos.",
					icono: "BadgeCheck",
				},
				{
					titulo: "¿Puedo arrepentirme?",
					texto:
						"En cualquier momento y sin explicar por qué. Tus datos se bloquean y sales de las búsquedas de inmediato.",
					icono: "Undo2",
				},
				{
					titulo: "¿Voy a saber a quién ayudé?",
					texto:
						"Es anónima en ambos sentidos. Solo si las dos partes quieren, puede haber contacto tiempo después.",
					icono: "MailQuestion",
				},
			],
		},
	},
	{
		id: "privacidad",
		tipo: "texto",
		acto: ACTOS.trayecto,
		capitulo: "09 · Tus datos",
		lado: "derecha",
		altura: 1.5,
		z: 0.3,
		contenido: {
			titulo: "Tu genética y tu nombre no viven juntos",
			entrada:
				"Un perfil genético es un dato personal sensible. El sistema está construido para que no se pueda cruzar con tu identidad por accidente.",
			apartados: [
				{
					subtitulo: "Un código, no un nombre",
					texto:
						"Al registrarte se te asigna un código opaco. Tu perfil HLA se guarda bajo él, en una tabla sin tu nombre, tu CURP ni tu domicilio.",
				},
				{
					subtitulo: "Las búsquedas devuelven códigos",
					texto:
						"El sistema responde con códigos. Saber quién hay detrás de uno exige un permiso específico y una justificación escrita, y queda registrado.",
				},
				{
					subtitulo: "Tus derechos siguen siendo tuyos",
					texto:
						"Puedes acceder a tus datos, corregirlos, cancelarlos u oponerte a su tratamiento en cualquier momento. Y revocar tu consentimiento sin dar explicaciones.",
				},
			],
		},
	},

	// ---------------------------------------------------------------- acto 3
	{
		id: "espera",
		ambiente: "amanecer",
		tipo: "cierre",
		acto: ACTOS.encuentro,
		// Texto a la derecha porque la figura B espera a la izquierda.
		lado: "derecha",
		luz: [-2.0, 1.15, 0.3],
		// El tramo más largo: es donde la esfera cruza hacia la segunda persona.
		// La oscuridad de más es el silencio antes del final.
		alto: 1.9,
		contenido: {
			titulo: "Ahora mismo alguien está esperando",
			texto:
				"No sabe tu nombre. No sabe dónde vives. Solo necesita que diez marcadores de su sangre coincidan con los de la tuya.",
		},
	},

	// ---------------------------------------------------------------- acto 4
	{
		id: "cta",
		tipo: "cta",
		acto: ACTOS.resolucion,
		lado: "derecha",
		luz: [-2.0, 1.15, 0.2],
		alto: 1.4,
		contenido: {
			titulo: "Tres minutos hoy. Una vida entera para alguien más.",
			texto: "Solo necesitas tu CURP y un correo electrónico.",
			cta_texto: "Registrarme como donador",
			cta_url: "/registro",
			nota: "Puedes retirarte del registro cuando quieras, sin dar explicaciones.",
		},
	},
]

/**
 * Guion resuelto: la posición de la esfera se deriva del lado del texto.
 *
 * Que la X no se escriba a mano en cada sección es lo que garantiza la regla:
 * ninguna sección puede acabar, por descuido, con la luz encima de su propio
 * texto.
 */
let climaEnCurso: ClaveAmbiente = "brasa"

export const GUION: Seccion[] = SECCIONES.map((seccion) => {
	// El clima se arrastra hacia adelante: declararlo una vez basta para todas
	// las secciones del capítulo. Ver `ClaveAmbiente`.
	climaEnCurso = seccion.ambiente ?? climaEnCurso
	return {
		...seccion,
		ambiente: climaEnCurso,
		luz: seccion.luz ?? [X_SEGUN_LADO[seccion.lado], seccion.altura ?? 1.4, seccion.z ?? 0.3],
	}
})
