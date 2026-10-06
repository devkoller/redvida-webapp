import type { Acto } from "../data/guion"
import { ACTOS } from "../data/guion"

/**
 * La coreografía, como función pura · RV-L3.4 · RV-L4.5
 *
 * Dado el progreso de scroll, devuelve el estado de todo lo que se mueve. Sin
 * three, sin React, sin DOM: solo números. Se comprueba con
 * `coreografia.check.ts`, que es donde se atrapan los fallos que en pantalla se
 * confunden con un tirón de rendimiento.
 *
 * ---
 *
 * **Dos decisiones de fondo, tomadas tras ver la primera versión en marcha:**
 *
 * 1. **La cámara no se mueve.** Antes viajaba de una figura a la otra, y era ese
 *    paneo el que arrastraba a los personajes por la pantalla: parecían
 *    deslizarse de lado mientras uno hacía scroll. Ahora el escenario está
 *    quieto y cada figura se **ancla a su sección**, subiendo con el scroll
 *    igual que lo hace el texto que le corresponde. Un personaje se comporta
 *    como un elemento más de la página, que es justo lo que se esperaba de él.
 *
 * 2. **Los umbrales salen del contenido, no de constantes.** `calcularMarcas()`
 *    los deriva de dónde caen realmente las secciones en el scroll. Alargar un
 *    texto, agregar un capítulo o abrir la página en un viewport más bajo ya no
 *    descuadra la animación: la esfera sale al terminar el hero porque el hero
 *    termina ahí, no porque alguien escribiera 0.1.
 */

/** Alto del escenario visible, en unidades de mundo. Ver `Escena.tsx`. */
export const ALTO_ESTADIO = 3.67

const limitar = (v: number) => Math.min(1, Math.max(0, v))

/** Progreso normalizado dentro de un tramo. */
export const entre = (v: number, [a, b]: readonly [number, number]) =>
	b === a ? (v >= b ? 1 : 0) : limitar((v - a) / (b - a))

/** Suavizado de entrada y salida. */
export const suave = (t: number) => t * t * (3 - 2 * t)

const mezcla = (a: number, b: number, t: number) => a + (b - a) * t

export interface Marcas {
	/** Progreso en que la esfera empieza a salir del pecho de la figura A. */
	salida: number
	/** Progreso en que ya ha salido del todo. */
	emitida: number
	/** Progreso en que alcanza el pecho de la figura B. */
	llegada: number
	transformacion: [number, number]
	resolucion: [number, number]
	/** Progreso en que la figura B queda en su sitio definitivo. */
	anclaB: number
	/** Cuántas unidades de mundo se desplaza el escenario por unidad de progreso. */
	unidadesPorProgreso: number
	/** Pares `[progreso, t]` que atan cada sección a su punto de la curva. */
	anclas: Array<[number, number]>
}

/**
 * Deriva los umbrales de la historia a partir de dónde caen las secciones.
 *
 * @param centros posición de cada sección en el scroll, 0..1
 * @param actos   acto al que pertenece cada sección, en el mismo orden
 * @param viewports altura total de la página medida en pantallas
 */
export function calcularMarcas(centros: number[], actos: Acto[], viewports: number): Marcas {
	const n = centros.length
	const iEncuentro = Math.max(1, actos.indexOf(ACTOS.encuentro))
	const iResolucion = Math.max(iEncuentro + 1, actos.indexOf(ACTOS.resolucion))

	const heroFin = centros[1] ?? 1

	// La esfera asoma en cuanto el hero empieza a irse, **no cuando ya se fue**.
	//
	// Es un equilibrio entre dos cosas que se estorban: no debe distraer mientras
	// se lee el título, pero tiene que nacer del pecho de la figura A *mientras la
	// figura A todavía se ve*. Si se retrasa más, la persona ya salió por arriba y
	// la esfera aparece de la nada en mitad de la pantalla — que es justo lo que
	// pasaba con 0.45.
	const salida = mezcla(centros[0] ?? 0, heroFin, 0.14)
	const emitida = mezcla(centros[0] ?? 0, heroFin, 0.5)

	// Llega al pecho de B cuando la sección del encuentro ya cedió el paso a la
	// del cierre: la esfera entra, y solo entonces la persona se transforma.
	const encuentro = centros[iEncuentro] ?? 0.8
	const resolucion = centros[iResolucion] ?? 1
	const tramoFinal = Math.max(0.02, resolucion - encuentro)
	// La esfera llega pronto dentro del acto final, no al borde. Lo que viene
	// después —la persona enderezándose— es el momento que justifica la pieza
	// entera y necesita cerca de dos pantallas de scroll para leerse; si la esfera
	// entra tarde, no queda recorrido y la transformación sale a trompicones.
	const llegada = encuentro + tramoFinal * 0.4

	// Las anclas: la esfera está en el punto de luz de cada sección justo cuando
	// esa sección está centrada en pantalla. Es lo que hace que acompañe al texto
	// en vez de pasarle por detrás en un momento cualquiera.
	const anclas: Array<[number, number]> = [[salida, 0]]
	for (let i = 1; i <= iResolucion; i++) {
		anclas.push([centros[i] ?? i / n, i / iResolucion])
	}
	// Y el remate: llega al pecho antes de que termine la última sección.
	anclas[anclas.length - 1] = [llegada, 1]

	return {
		salida,
		emitida,
		llegada,
		// El fogonazo arranca **antes** de que la esfera se apague del todo.
		transformacion: [llegada - tramoFinal * 0.2, llegada + tramoFinal * 0.45],
		/**
		 * Y el enderezamiento empieza aún antes.
		 *
		 * Encadenados —primero la esfera se extingue, después la persona reacciona—
		 * se leen como dos sucesos sin relación: la luz desaparece y un momento más
		 * tarde, por su cuenta, alguien se ilumina. Solapándolos, la persona empieza
		 * a incorporarse *mientras* la luz entra en su pecho, y la causa queda a la
		 * vista. El relevo tiene que verse, no deducirse.
		 */
		resolucion: [llegada - tramoFinal * 0.65, 1],
		anclaB: encuentro,
		unidadesPorProgreso: viewports * ALTO_ESTADIO,
		anclas,
	}
}

/** Interpola el parámetro de la curva pasando exactamente por cada ancla. */
function parametro(p: number, anclas: Array<[number, number]>): number {
	if (p <= anclas[0][0]) return 0
	const ultima = anclas[anclas.length - 1]
	if (p >= ultima[0]) return 1

	for (let i = 0; i < anclas.length - 1; i++) {
		const [pa, ta] = anclas[i]
		const [pb, tb] = anclas[i + 1]
		if (p >= pa && p < pb) {
			// Suavizado por tramo: la esfera se detiene un instante en cada sección
			// y vuelve a arrancar. Sin esto el recorrido es una deriva uniforme que
			// no se relaciona con lo que se está leyendo.
			return mezcla(ta, tb, suave(entre(p, [pa, pb])))
		}
	}
	return 1
}

export interface EstadoFigura {
	/** 0 = hundido y apagado · 1 = erguido y brillando. */
	animo: number
	destello: number
	/** Desplazamiento vertical respecto a su sitio, en unidades de mundo. */
	desplazamientoY: number
	/**
	 * Presencia, 0..1. Es lo que hace aparecer a la segunda figura.
	 *
	 * **No se mueve verticalmente para entrar.** Antes subía desde debajo del
	 * encuadre y el efecto era el contrario del buscado: parecía que emergía del
	 * suelo. La persona no llega, **ya estaba ahí**, a oscuras — solo que no se la
	 * veía. Así que se revela con opacidad, quieta en su sitio.
	 */
	presencia: number
}

export interface Coreografia {
	/** Parámetro de la curva, 0..1. La escena lo convierte en posición. */
	t: number
	esfera: {
		presencia: number
		/** Cuánto sigue la esfera al pecho de A mientras nace de él. */
		pesoOrigen: number
	}
	figuraA: EstadoFigura
	/**
	 * La figura B es **una sola**, y se endereza.
	 *
	 * Hubo un tiempo en que eran dos mallas cruzándose bajo el fogonazo de la
	 * esfera, porque los modelos no tenían esqueleto y la pose no se podía
	 * interpolar. Con `personaje.glb` sí se puede: `animo` es el tiempo del clip
	 * que va de agotado a erguido, así que la transformación es un movimiento
	 * atado al scroll y no queda corte que tapar.
	 *
	 * El fogonazo se queda, pero ya no esconde nada: subraya.
	 */
	figuraB: EstadoFigura
}

export function calcular(p: number, m: Marcas): Coreografia {
	const emision = entre(p, [m.salida, m.emitida])
	const entrada = entre(p, [m.llegada - (m.llegada - m.emitida) * 0.08, m.llegada])

	// El fogonazo acompaña a la transformación: sube y baja en una campana cuyo
	// pico cae donde la persona se está enderezando. Ya no tapa nada —no hay
	// corte que tapar—, ahora subraya.
	const transformacion = entre(p, m.transformacion)
	const campana = Math.sin(transformacion * Math.PI)

	// La figura A sube con el hero, como el texto que la acompaña.
	//
	// **El signo importa y es contraintuitivo.** Al hacer scroll hacia abajo, el
	// contenido se desplaza hacia ARRIBA en pantalla; una figura anclada a su
	// sección tiene que hacer lo mismo, así que su Y de mundo **crece**. Con el
	// signo al revés la figura baja mientras el texto sube, y se lee exactamente
	// como lo que es: dos cosas que deberían ir juntas separándose.
	const desplazamientoA = Math.max(0, p) * m.unidadesPorProgreso

	return {
		t: parametro(p, m.anclas),
		esfera: {
			// Nace de cero y se apaga al entrar en el segundo pecho.
			presencia: suave(emision) * (1 - suave(entrada)),
			pesoOrigen: 1 - suave(emision),
		},
		figuraA: {
			// A se atenúa al entregar su luz, pero no se apaga ni se encorva: no
			// pierde nada por registrarse, y hundirla contaría lo contrario de lo
			// que queremos contar.
			animo: 1 - suave(emision) * 0.15,
			destello: 0,
			desplazamientoY: desplazamientoA,
			presencia: 1,
		},
		figuraB: {
			// Arranca en 0 —el clip entero, con las manos en las rodillas— y llega a
			// 1 en la resolución. Que ahí no se vea negra del todo no es cosa de este
			// número: `Personaje.tsx` no deja bajar la luz de un mínimo, porque una
			// figura completamente apagada se lee como un agujero y esta está
			// esperando, no ausente.
			animo: suave(entre(p, m.resolucion)),
			destello: campana * 0.8,
			desplazamientoY: 0,
			/**
			 * **Siempre presente, como cualquier otra cosa de la escena.**
			 *
			 * Antes se revelaba con opacidad al llegar a su sección, y se volvía a
			 * desvanecer al subir. Tenía su lógica mientras la cámara estaba quieta y
			 * las dos figuras compartían encuadre: sin ese velo, la segunda persona
			 * llevaba media página plantada en un rincón, esperando su turno a la
			 * vista.
			 *
			 * Con la cámara bajando quince metros eso ya no pasa —la figura vive en
			 * el fondo del descenso y no se la ve hasta llegar—, así que el
			 * desvanecido dejó de resolver nada y solo se notaba como lo que era: una
			 * persona que aparece y desaparece según se sube o se baja. Ahora está
			 * ahí, como el ADN o la jeringa; lo que cambia con el scroll es su pose y
			 * su luz, que es la transformación que cuenta la historia.
			 */
			presencia: 1,
		},
	}
}

/**
 * Vuelo de abeja · RV-L3.5
 *
 * Deriva orgánica que se suma a la posición de la esfera sobre su curva. Sin
 * ella el recorrido se lee como lo que es —un punto interpolando entre paradas—
 * y con ella parece que la luz tiene voluntad propia.
 *
 * **Depende del tiempo, no del scroll.** Es lo que la hace sentir viva cuando la
 * página está quieta: una esfera que solo se mueve al hacer scroll es un
 * indicador de progreso; una que sigue revoloteando es una criatura.
 *
 * Tres senos por eje, con frecuencias que no son múltiplos entre sí. Si lo
 * fueran, el patrón se repetiría cada pocos segundos y el ojo lo cazaría; con
 * periodos inconmensurables la trayectoria no se repite nunca de forma
 * apreciable. Es ruido barato: nueve senos por cuadro contra una textura de
 * ruido y su muestreo.
 *
 * @param t        segundos transcurridos
 * @param x        posición actual en el eje horizontal, para medir el margen
 * @param destino  vector donde escribir el desplazamiento
 */
export function vuelo(t: number, x: number, destino: { x: number; y: number; z: number }) {
	/**
	 * **La amplitud se apaga hacia el centro.**
	 *
	 * La regla de legibilidad dice que la esfera nunca pisa el texto, y el texto
	 * ocupa la banda central y el lado que le toque. Con la esfera en su margen
	 * (|x| ≈ 2) hay sitio de sobra para revolotear; conforme se acerca al centro
	 * —al nacer del pecho, al entrar en el otro— el margen desaparece y la deriva
	 * tiene que desaparecer con él. Así la regla se cumple por construcción y no
	 * por vigilancia.
	 */
	const margen = Math.min(1, Math.max(0, (Math.abs(x) - 0.9) / 1.1))
	const a = margen * margen

	/**
	 * **Tres escalas de velocidad, y la rápida es la que importa.**
	 *
	 * La primera versión solo tenía las dos lentas: 106 px de recorrido con un
	 * periodo de 8.6 segundos. Medido parecía correcto —la amplitud estaba ahí—
	 * pero en pantalla no se leía como vuelo sino como flotar, porque **una abeja
	 * no se distingue por cuánto se desplaza sino por lo brusco que cambia de
	 * dirección**. La amplitud era la magnitud equivocada.
	 *
	 * Ahora hay una deriva lenta que la pasea, una media que la hace dudar y una
	 * rápida y pequeña que da el nervio. Ninguna frecuencia es múltiplo de otra,
	 * así que el patrón no se repite de forma apreciable.
	 */
	destino.x =
		(Math.sin(t * 0.61) * 0.19 +
			Math.sin(t * 1.97 + 1.7) * 0.1 +
			Math.sin(t * 4.31 + 0.3) * 0.035) *
		a
	destino.y =
		(Math.sin(t * 0.53 + 0.4) * 0.15 +
			Math.sin(t * 2.29 + 2.9) * 0.08 +
			Math.sin(t * 5.07 + 1.1) * 0.03) *
		a
	// La profundidad puede permitirse más: acercarse y alejarse no invade a nadie
	// y es lo que convierte un vaivén plano en un vuelo.
	destino.z = (Math.sin(t * 0.43 + 2.2) * 0.34 + Math.sin(t * 1.63 + 0.8) * 0.18) * (0.4 + a * 0.6)
	return destino
}

/** Excursión máxima teórica del vuelo en cada eje, con margen pleno. */
export const VUELO_MAXIMO = { x: 0.33, y: 0.26, z: 0.52 }
