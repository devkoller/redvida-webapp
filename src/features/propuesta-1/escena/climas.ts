import { GUION, type ClaveAmbiente } from "../data/guion"

/**
 * El clima del fondo, en un punto del recorrido · RV-L4.4
 *
 * Vive aquí, y no dentro del componente que lo usa, porque **lo consultan dos
 * cosas que no se conocen entre sí**: el campo de color en DOM
 * (`components/Ambiente.tsx`, que lo convierte en variables CSS) y el campo de
 * estrellas dentro de la escena 3D (`escena/Galaxia.tsx`, que lo convierte en
 * un matiz). Si cada uno llevara su propia cuenta acabarían discrepando en
 * cuanto alguien tocara el guion, y se vería: el color del aire y el de las
 * estrellas irían por libre.
 */

/** Lo que necesita saberse de un bloque para repartir climas. */
export interface HitoMedido {
	/** Índice en el guion, en orden de documento. */
	indice: number
	/** Centro vertical del bloque, en progreso normalizado del escenario (0..1). */
	centro: number
	/** Alto del bloque respecto al alto total del escenario. */
	alto: number
}

/**
 * Matiz de cada clima, en grados de la rueda de color.
 *
 * Es el recorrido de color de la página: el rojo de marca abre, el ámbar
 * acompaña la explicación, el violeta cubre el tramo largo del proceso, el azul
 * frío las secciones que tranquilizan y el naranja cierra. Lo usan **las dos
 * capas del fondo**: el degradado del DOM lo mete directamente en un `oklch()`,
 * y el campo de estrellas lo convierte a lo que su shader entiende.
 */
export const MATIZ_DE_CLIMA: Record<ClaveAmbiente, number> = {
	/** Rojo de marca. */
	brasa: 352,
	/** Ámbar cálido. */
	ambar: 34,
	/** Rojo profundo. */
	urgencia: 6,
	/** Violeta. */
	trayecto: 288,
	/** Azul frío. */
	confianza: 214,
	/** Naranja del cierre. */
	amanecer: 22,
}

/**
 * Coseno y seno de cada clima, precalculados.
 *
 * `tonoDeAvance` se llama **una vez por cuadro desde el shader y otra desde el
 * scroll**. Sin esta tabla haría dos llamadas trigonométricas por sección y por
 * llamada —veintiséis por cuadro, con trece secciones— para volver a calcular
 * siempre exactamente los mismos seis pares de números.
 */
const VECTOR_DE_CLIMA = Object.fromEntries(
	Object.entries(MATIZ_DE_CLIMA).map(([clave, grados]) => {
		const radianes = (grados * Math.PI) / 180
		return [clave, [Math.cos(radianes), Math.sin(radianes)]]
	}),
) as Record<ClaveAmbiente, [number, number]>

/**
 * Tono resultante en un punto del recorrido, en grados.
 *
 * ---
 *
 * **Cómo se reparte.** Cada sección aporta una campana centrada en sí misma y
 * de ancho proporcional a su propio alto, de modo que una sección larga tiñe más
 * recorrido. Las de un mismo capítulo suman, y el cruce entre capítulos sale
 * continuo sin un salto en la frontera. Todo sale de los hitos ya medidos —dónde
 * cae cada sección y cuánto ocupa— y no de umbrales escritos a mano: cambiar el
 * orden del guion, alargar una sección o añadir otra recoloca los climas sola,
 * igual que ya le pasa a la curva de la esfera.
 *
 * **Media circular, no aritmética.** El tono es un ángulo: entre el rojo de
 * apertura (352°) y el ámbar del capítulo siguiente (34°) hay 42 grados, no 318.
 * Promediando los números a secas, el cruce entre esos dos capítulos daría el
 * punto medio por el lado largo de la rueda —un verde que no aparece en ninguno
 * de los dos—. Sumando vectores unitarios el paso va por donde tiene que ir.
 *
 * Y como lo que se busca es el **ángulo** de la suma, no hace falta normalizar
 * los pesos: dividir `x` e `y` por la misma constante no mueve un `atan2`.
 *
 * ---
 *
 * **No reserva memoria, y eso importa aquí.** Esta función corre en el bucle de
 * cuadros. La primera versión construía un `Map` con los pesos, lo recorría dos
 * veces para normalizarlo y devolvía el objeto: eso son un mapa y varios
 * iteradores por llamada, dos llamadas por cuadro, ciento veinte veces por
 * segundo. Nada de eso es caro por separado; todo junto es basura constante que
 * el recolector acaba teniendo que barrer, y un barrido a mitad de un scroll es
 * exactamente el tirón que aparece «de vez en cuando». Ahora todo son sumas
 * sobre dos números locales.
 */
export function tonoDeAvance(hitos: HitoMedido[], avance: number): number {
	let x = 0
	let y = 0

	// Bucle indexado y no `for...of`: sobre un array este no reserva iterador.
	for (let i = 0; i < hitos.length; i++) {
		const hito = hitos[i]
		const seccion = GUION[hito.indice]
		if (!seccion) continue

		// El ancho de la campana es el alto de la propia sección.
		const sigma = Math.max(0.05, hito.alto * 0.62)
		const d = (avance - hito.centro) / sigma
		const peso = Math.exp(-d * d)

		const vector = VECTOR_DE_CLIMA[seccion.ambiente]
		x += vector[0] * peso
		y += vector[1] * peso
	}

	if (x === 0 && y === 0) return MATIZ_DE_CLIMA.brasa
	const grados = (Math.atan2(y, x) * 180) / Math.PI
	return (grados + 360) % 360
}
