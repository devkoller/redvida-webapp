/**
 * Comprobaciones de las anclas y el menú.
 *
 *     npx tsx src/features/landing/data/navegacion.check.ts
 *
 * Existe porque el fallo que corrige no era visible: el menú apuntaba a cuatro
 * anclas que la portada nunca generó, y nada avisaba. Aquí se fija justo eso:
 * que las anclas que produce la página sean las que el menú enlaza.
 */
import { aAncla, anclaDe, menuDe } from "./navegacion"
import type { BloqueBase, ContenidoPagina } from "./tipos"

let fallos = 0
function exigir(condicion: boolean, mensaje: string) {
	if (condicion) return
	fallos++
	console.error(`  FALLA  ${mensaje}`)
}

// --- Slug -------------------------------------------------------------------
exigir(aAncla("¿Qué son las CMH?") === "que-son-las-cmh", "quita signos y acentos")
exigir(aAncla("Cómo donar") === "como-donar", "acentos fuera")
exigir(aAncla("  Requisitos  ") === "requisitos", "sin guiones sobrantes en los bordes")
exigir(aAncla("Paso 1 · 2 · 3") === "paso-1-2-3", "los separadores colapsan")

// --- Ancla de un bloque -----------------------------------------------------
const b = (contenido: Record<string, unknown>): BloqueBase => ({
	tipo: "texto",
	orden: 1,
	contenido,
})

exigir(
	anclaDe(b({ ancla: "requisitos", titulo: "¿Puedo ser donador?" }), 3) === "requisitos",
	"`ancla` explícita gana al título",
)
exigir(
	anclaDe(b({ titulo: "Preguntas frecuentes" }), 3) === "preguntas-frecuentes",
	"sin `ancla`, se deriva del título",
)
exigir(anclaDe(b({}), 3) === "contenido-3", "sin título, cae al índice")
exigir(anclaDe(b({ ancla: "  " }), 3) === "contenido-3", "un ancla en blanco no cuenta")
exigir(
	anclaDe(b({ ancla: "Requisitos 2024" }), 3) === "requisitos-2024",
	"el ancla también se normaliza",
)

// --- Menú -------------------------------------------------------------------
const pagina = (bloques: BloqueBase[]): ContenidoPagina => ({
	slug: "inicio",
	titulo: "RedVida",
	meta_descripcion: null,
	version: 1,
	publicado_en: "",
	bloques,
})

const menu = menuDe(
	pagina([
		b({ titulo: "Sé la coincidencia" }),
		b({ titulo: "¿Qué son las CMH?", ancla: "que-son", nav: "Qué son las CMH" }),
		b({ titulo: "Cómo funciona", ancla: "como-donar", nav: "Cómo donar" }),
		b({ titulo: "Sin etiqueta de menú", ancla: "suelto" }),
		b({ titulo: "Preguntas frecuentes", ancla: "preguntas", nav: "Preguntas" }),
	]),
)

exigir(menu.length === 3, `solo entran los bloques con \`nav\` (entraron ${menu.length})`)
exigir(menu[0].etiqueta === "Qué son las CMH", "conserva la etiqueta corta")
exigir(menu.map((m) => m.ancla).join() === "que-son,como-donar,preguntas", "y en orden")
exigir(menuDe(pagina([b({ titulo: "solo" })])).length === 0, "sin `nav`, menú vacío")

// --- Lo que de verdad se rompió: menú y página deben coincidir --------------
const bloques = [
	b({ titulo: "Portada" }),
	b({ titulo: "¿Qué son las CMH?", ancla: "que-son", nav: "Qué son las CMH" }),
	b({ titulo: "Preguntas frecuentes", ancla: "preguntas", nav: "Preguntas" }),
]
const idsEnLaPagina = new Set(bloques.map((bloque, i) => anclaDe(bloque, i)))
for (const entrada of menuDe(pagina(bloques))) {
	exigir(
		idsEnLaPagina.has(entrada.ancla),
		`el menú enlaza "#${entrada.ancla}" y la página no lo genera`,
	)
}

console.log(fallos === 0 ? "navegacion: todo en verde" : `navegacion: ${fallos} fallo(s)`)
process.exit(fallos === 0 ? 0 : 1)
