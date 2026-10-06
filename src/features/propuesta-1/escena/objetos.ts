/**
 * La utilería de la escena · RV-L2.7
 *
 * **Este archivo es para editar.** Cada entrada de `OBJETOS` es una cosa que
 * aparece en la escena; añadir una línea añade un objeto, borrarla lo quita. No
 * hay que tocar ningún componente para mover, escalar o girar nada.
 *
 * ```ts
 * { archivo: "jeringa", tamano: 0.22, posicion: [1.9, 1.05, -0.8], rotacion: [0, -25, 40] }
 * ```
 *
 * ---
 *
 * ## Las cuatro cosas que hay que decidir
 *
 * **`archivo`** — el nombre, sin `.glb`, de un modelo en `public/modelos/`.
 * Antes de ponerlo ahí tiene que pasar por `./optimizar_props.sh`, en la raíz
 * del repositorio: estos tres llegaron pesando 60 MB entre los tres —casi todo
 * textura PNG de 4K— y salieron en 721 kB. Sin ese paso, la página tarda un
 * minuto en cargar con buena conexión.
 *
 * **`tamano`** — cuánto mide **su lado más largo, en metros**. Es la única forma
 * cómoda de escalar: los modelos vienen con la escala que tuviera quien los
 * exportó —estos tres miden casi 2 unidades de largo, o sea dos metros— y
 * corregir eso a base de multiplicadores es adivinar. Aquí se dice cuánto mide
 * de verdad el objeto y el componente calcula el factor. Una jeringa son 22 cm.
 *
 * **`posicion`** — dónde va, en metros: `[lateral, altura, profundidad]`.
 *
 * - **lateral**: negativo a la izquierda, positivo a la derecha. El texto de la
 *   página ocupa la izquierda, así que la utilería vive de −2.6 a 2.6 y esquiva
 *   el centro.
 * - **altura**: 0 es el suelo, 1.12 la altura del pecho de las figuras, 1.72 la
 *   coronilla. Un objeto flotando a 1.2 está a la altura de la mirada.
 * - **profundidad**: la cámara está en 6.4 mirando al origen. **Positivo es
 *   hacia la cámara** y negativo hacia el fondo. Más allá de −3 la niebla se lo
 *   empieza a comer, y por delante de 3 queda tan cerca que se sale de cuadro.
 *
 * **`rotacion`** — en **grados**, opcional: `[x, y, z]`. `y` es el giro sobre el
 * eje vertical, que es el que casi siempre se quiere. Los otros dos vuelcan el
 * objeto hacia adelante y de lado.
 *
 * ---
 *
 * ## Cómo se coloca algo nuevo sin pelearse
 *
 * 1. Empiece con `posicion: [0, 1.2, 0]` y el `tamano` real del objeto. Va a
 *    aparecer en el centro, a la altura de la vista: se ve seguro.
 * 2. Muévalo al lado que le toque —el lateral primero, que es lo que más cambia
 *    la composición—, y luego la profundidad.
 * 3. La rotación al final, cuando ya sabe desde dónde se lo va a ver.
 *
 * Si algo **no aparece**, casi siempre es una de tres: el nombre del archivo no
 * coincide, el `tamano` es tan pequeño que el objeto es un punto, o está detrás
 * de la cámara (profundidad mayor que 6.4).
 */

export interface Objeto {
	/** Nombre del archivo en `public/modelos/`, sin extensión. */
	archivo: string
	/** Cuánto mide su lado más largo, en metros. */
	tamano: number
	/** `[lateral, altura, profundidad]` en metros. */
	posicion: [number, number, number]
	/** `[x, y, z]` en grados. `y` gira sobre el eje vertical. */
	rotacion?: [number, number, number]
	/**
	 * Cuánto se mece, en grados. Cero lo deja completamente quieto.
	 *
	 * Es un balanceo lentísimo y desfasado entre objetos, para que la utilería no
	 * parezca pegada al aire con cinta. Las figuras humanas no lo llevan: en un
	 * cuerpo, cualquier movimiento de más se lee como respiración o como tic.
	 */
	vaiven?: number
	/**
	 * Marca esto como **escenografía**, no como utilería.
	 *
	 * Un objeto enorme que envuelve la escena —una hélice de cincuenta metros
	 * cruzando el encuadre de lado a lado— juega con otras reglas: puede pasar por
	 * detrás del texto, puede hundirse por debajo del suelo y puede atravesar a
	 * las figuras, porque no se lee como una cosa puesta ahí sino como el sitio
	 * donde pasa todo.
	 *
	 * La comprobación deja de exigirle lo que le exige a un hisopo. Lo único que
	 * le sigue midiendo es que se vea.
	 */
	fondo?: boolean
	/**
	 * Momento del scroll —de 0 a 1— al que se **ancla** el objeto · RV-L2.9
	 *
	 * Sin esto, un objeto se queda clavado en su punto del mundo. Con la cámara
	 * quieta daba igual; ahora que baja quince metros, la utilería colocada para el
	 * arranque desaparece en cuanto empieza el descenso — medido: el hisopo se ve
	 * en 1 de 9 paradas del recorrido.
	 *
	 * Poniendo `anclaje: 0.5`, las mismas coordenadas se leen **como se verían
	 * desde la cámara a mitad de recorrido**: el objeto conserva su composición
	 * —igual de a la derecha, igual de arriba, igual de lejos— pero aparece cuando
	 * la cámara pasa por ahí. Es lo mismo que hace la escena con las dos figuras y
	 * con la luz de cada sección.
	 *
	 * Repartir tres objetos en `0`, `0.4` y `0.8` es lo que puebla un descenso
	 * entero en vez de amontonar todo al principio.
	 */
	anclaje?: number
}

/**
 * Lo que hay en la escena, además de las dos figuras y la esfera.
 *
 * **Los tres viven en la mitad derecha**, que es donde no hay texto: la columna
 * de la izquierda es del titular y de los párrafos, y un objeto ahí se lee como
 * una mancha encima de las letras. La primera versión puso el ADN a la izquierda
 * y quedó atravesando el titular del hero.
 *
 * A distintas profundidades a propósito: el hisopo y la jeringa por delante de
 * la figura, el ADN detrás. Es lo que hace que el encuadre tenga fondo en vez de
 * parecer un friso.
 */
export const OBJETOS: Objeto[] = [
	{
		// **Escenografía, no utilería**: una hélice centrada en el origen, que
		// envuelve la escena entera en vez de estar puesta en un sitio.
		//
		// **`adn-alto` son tres copias del modelo unidas por las puntas**, no un
		// ADN distinto. Sale de `blender/apilar_adn.py`, y existe porque la
		// hélice tuvo que achicarse para que se reconociera qué era —de grande
		// se leía como una mancha abstracta— y al achicarla dejó de llegar
		// abajo. Ahí está explicado por qué no vale ni estirarla en altura ni
		// superponer las copias sin más.
		//
		// **Por eso `tamano` es 20 y no 8.** `tamano` es el lado más largo en
		// metros, y el modelo nuevo es 2.41 veces más largo que el viejo; con el
		// 8 de antes saldría igual de alto y 2.41 veces más flaco.
		//
		// **Y por eso está hundido siete metros.** `tamano` crece hacia los dos
		// lados por igual, así que de lo que se gana, la mitad se iría hacia
		// arriba — donde la cámara ya no mira. Hundiéndolo, el alto extra va
		// abajo, que es donde faltaba: la cámara baja hasta −15 y así la hélice
		// la acompaña hasta el final en vez de acabarse a media bajada.
		archivo: "adn-alto",
		tamano: 20,
		posicion: [0, -7, -0.55],
		rotacion: [0, 0, 0],
		vaiven: 0,
		fondo: true,
	},
	// {
	// 	archivo: "hisopo",
	// 	tamano: 0.3,
	// 	posicion: [2.6, 0.72, 0.9],
	// 	rotacion: [0, -40, 62],
	// 	vaiven: 2,
	// },
	// {
	// 	archivo: "jeringa",
	// 	tamano: 0.26,
	// 	posicion: [1.25, 2.1, 1.0],
	// 	rotacion: [0, -20, 35],
	// 	vaiven: 2,
	// },
]

// {
// 		// **Escenografía, no utilería**: cincuenta metros de hélice centrada en el
// 		// origen, que envuelve la escena entera en vez de estar puesta en un sitio.
// 		archivo: "adn",
// 		tamano: 50,
// 		posicion: [0, 0, -0.55],
// 		rotacion: [0, 0, 0],
// 		vaiven: 1.1,
// 		fondo: true,
// 	},
