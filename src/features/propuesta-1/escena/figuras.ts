/**
 * Dónde se planta cada persona · RV-L2.10
 *
 * **Este archivo es para mover a las dos figuras.** Antes sus posiciones salían
 * de la luz que declaraba cada sección en `guion.ts`, que servía a la vez de
 * destino de la esfera y de sitio de la persona. Eso está bien mientras las dos
 * cosas coincidan, pero deja de estarlo en cuanto hay que separar una de la
 * otra — y para acomodarlas hacía falta editar el guion, que es contenido.
 *
 * ---
 *
 * ## Los tres números
 *
 * `sitio` es `[x, y, z]` en metros, **respecto de la cámara** en el momento que
 * indique `momento`, no respecto del mundo. Es lo que hace que la figura siga en
 * cuadro cuando la cámara baja quince metros y da media vuelta: si fueran
 * coordenadas del mundo, habría que volver a calcularlas cada vez que se toca
 * `camara.ts`.
 *
 * - **`x`** — a la derecha del encuadre. Negativo, a la izquierda. El texto vive
 *   en la mitad izquierda, así que la figura del hero va en positivo. **En
 *   pantalla vertical esto casi no se usa**: ahí la columna ocupa todo el ancho
 *   y la figura se separa del texto por abajo, no por el lado.
 * - **`y`** — hacia arriba desde la altura de la cámara. `0` la deja a la altura
 *   del objetivo; `−0.1` es lo que había.
 * - **`z`** — **a qué distancia de la cámara**, hacia adelante. Es el mando que
 *   resuelve que una hebra del ADN se cruce por delante: la hélice tiene 8 m de
 *   radio y la cámara orbita a 6, así que **acercar la figura la saca de entre
 *   las hebras**. Con 6.2 queda justo pasado el eje; con 4 queda claramente por
 *   delante de todo.
 *
 * `sitio` marca **el pecho**, no los pies: es de donde sale la esfera y a donde
 * llega, y es lo que decide el encuadre. Los pies caen 1.12 m más abajo, en
 * vertical del mundo — por mucho que se incline la cámara, una persona sigue de
 * pie.
 *
 * `giro` son grados sobre su eje vertical: hacia dónde mira la persona.
 *
 * ## Dos formatos
 *
 * Cada figura declara **dos sitios**, uno por perfil de pantalla (ver `Perfil`
 * en `camara.ts`). No es una copia con otros números: en apaisado la figura se
 * aparta al margen contrario al texto, y en vertical se hunde por debajo de él,
 * porque en una pantalla estrecha la columna ocupa el ancho entero y no hay
 * margen contrario al que apartarse.
 *
 * ## Cuándo
 *
 * `momento` es el punto del scroll —de 0 a 1— cuyo encuadre se usa para colocar
 * la figura. Si se omite, se usa **el momento en que su sección está centrada**,
 * que es casi siempre lo que se quiere: la figura del hero aparece con el hero y
 * la del encuentro con el encuentro.
 *
 * Tras cualquier cambio:
 *
 *     npx tsx src/features/propuesta-1/escena/puesta.check.ts
 *
 * Mide si cada figura está en cuadro cuando le toca, y **si el ADN se le cruza
 * por delante**, que es lo que no se ve en un número pero sí en la pantalla.
 */

import type { Perfil } from "./camara"

export interface Figura {
	/** El pecho, respecto de la cámara: `[derecha, arriba, distancia]` en metros. */
	sitio: [number, number, number]
	/** Grados sobre el eje vertical. Hacia dónde mira. */
	giro: number
	/** Progreso del scroll cuyo encuadre la coloca. Por omisión, el de su sección. */
	momento?: number
}

/**
 * La del hero: erguida, brazos en la cintura, y de ella sale la luz.
 *
 * Va a la derecha porque el titular ocupa la izquierda — y esa no es una
 * decisión estética sino de contraste: el halo suma luz sobre lo que haya
 * debajo, y sobre el texto lo dejaría por debajo del 4.5:1 que exige WCAG AA.
 */
export const FIGURA_A: Record<Perfil, Figura> = {
	ancho: {
		sitio: [2.0, 0, 5.5],
		giro: -20,
	},
	/**
	 * En vertical no hay «al otro lado del texto»: la columna ocupa el ancho
	 * entero de la pantalla, así que apartar la figura a un margen solo la saca
	 * del encuadre —era exactamente lo que pasaba— sin ganar nada a cambio.
	 *
	 * **La separación pasa a ser vertical.** La figura se hunde por debajo del
	 * bloque de texto y se queda casi centrada de lado: ahí no compite con la
	 * lectura, que en una pantalla alta es una cuestión de arriba y abajo, no de
	 * izquierda y derecha.
	 *
	 * Los tres números salen de una cuenta, no del ojo. **La distancia (6.8 m)**
	 * la fija el alto: ahí el encuadre abarca 7.5 m, y una persona de 1.72 ocupa
	 * menos de una cuarta parte — cabe entera bajo el bloque de texto. **El fondo
	 * (−1.5)** la hunde hasta que la cabeza queda justo por debajo del último
	 * párrafo y los pies por encima del borde inferior; los botones le pasan por
	 * delante, y eso se lee como profundidad, no como estorbo. **Y el lateral
	 * (0.5)** es casi nada a propósito: no hay margen al que apartarse, así que se
	 * queda cerca del centro y solo lo justo para no partir la composición.
	 *
	 * Que no se cruce una hebra por delante también está medido: la cámara orbita
	 * a 9.5 m del eje y la hélice tiene 1.36 m de radio, así que a 6.8 m de la
	 * cámara la figura queda a 2.7 m del eje, holgadamente fuera. Lo comprueba
	 * `puesta.check.ts alto`.
	 */
	alto: {
		sitio: [0.5, -1.5, 6.8],
		giro: -20,
	},
}

/**
 * La del encuentro: aparece agotada y se endereza cuando le llega la luz.
 *
 * Al otro lado, porque el texto de esas secciones va a la derecha.
 */
export const FIGURA_B: Record<Perfil, Figura> = {
	ancho: {
		sitio: [-1.3, -0.6, 5.2],
		giro: 100,
	},
	/** Mismo criterio que la A: abajo y casi centrada. Ver ahí el porqué. */
	alto: {
		sitio: [-0.5, -1.5, 6.8],
		giro: 100,
	},
}

/** Del pecho a los pies, en metros. */
export const PECHO = 1.12
