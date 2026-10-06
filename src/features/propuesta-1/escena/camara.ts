import * as THREE from "three"

/**
 * El recorrido de la cámara · RV-L2.8
 *
 * **Este archivo es para retocar.** La cámara **baja girando alrededor del eje
 * de la hélice**, atada al scroll. Son seis números: dónde empieza y dónde acaba
 * el giro, el radio y la altura.
 *
 * ---
 *
 * ## El tercer intento, y por qué este sí
 *
 * Van dos intentos de mover esta cámara y los dos se revirtieron. Están
 * documentados en `Escena.tsx`:
 *
 * 1. **Un paneo lateral arrastraba a los personajes.** Trasladar la cámara de
 *    lado sin cambiar a dónde mira hace que todo se deslice por la pantalla. Un
 *    giro **alrededor de** algo es otra cosa: la cámara rodea al sujeto en vez de
 *    resbalar por delante de él.
 *
 * 2. **El descenso en hélice no se veía.** Bajaba 26 unidades y daba 1.35
 *    vueltas —medido— alrededor de un cilindro liso. Y un cilindro liso se ve
 *    igual desde cualquier ángulo: sin superficies con detalle que pasen de
 *    largo no hay paralaje, y sin paralaje no hay movimiento. **Ese es el punto
 *    que cambió**: ahora el pilar central es una hélice de ADN de cincuenta
 *    metros, con hebras y pasos que sí pasan de largo y sí delatan el giro.
 *
 * O sea que la idea del descenso helicoidal no era mala; le faltaba alrededor de
 * qué girar.
 *
 * ## El modelo: un círculo, un centro y un ascensor
 *
 * La cámara recorre el **perímetro de un círculo** centrado en el eje de la
 * hélice, mirando siempre hacia el eje, y a la vez **baja**. Nada más.
 *
 * La primera versión de esto tenía un fallo de planteamiento: la mira era un
 * punto fijo del espacio, a una altura escrita a mano. Como la cámara bajaba y
 * el punto no, **la cámara se iba inclinando hacia arriba** conforme descendía —
 * en vez de bajar por un ascensor mirando al eje, acababa mirando hacia donde
 * estaba el centro al empezar. Ahora la mira **va colgada de la cámara**: baja
 * con ella, y el descenso es un descenso y no un cabeceo.
 *
 * Se coloca en **coordenadas cilíndricas alrededor del eje**, que es lo que
 * convierte «gira un poco más» en cambiar un número en vez de recalcular tres:
 *
 * - **`giro`** — grados alrededor del eje. Positivo lleva la cámara hacia la
 *   derecha de la escena. Con 20° la rotación ya se lee sin marear.
 * - **`radio`** — a qué distancia del eje. **Es el mando delicado**, y está
 *   medido: con radio 6.95 una hebra pasa a **9 cm** del objetivo y se corta
 *   contra el plano cercano; con 6.4 pasa a 50 cm y llena el encuadre; con 6.0
 *   pasa a 89 cm, que es el margen con el que está puesto. Bajarlo aleja de las
 *   hebras y acerca a las figuras — no se puede tener todo.
 * - **`altura`** — la altura de la cámara. Bajar es lo que hace que la escena
 *   crezca: las figuras se ven desde algo más abajo y ganan estatura.
 * - **`inclinacion`** — grados de cabeceo. **Cero mira horizontal**, al eje y a
 *   la altura de la cámara: es el ascensor puro, y es lo que hay que dejar si lo
 *   que se quiere es que se note que baja. Positivo levanta la vista, negativo la
 *   hunde. Un grado ya se nota; con cinco la escena se ve claramente desde abajo.
 *
 * Tras cualquier retoque, la comprobación mide el recorrido entero —no solo los
 * extremos— y avisa si algún objeto se sale o si una hebra se pega al objetivo:
 *
 *     npx tsx src/features/propuesta-1/escena/utileria.check.ts
 */

/** Dónde está clavado el eje de la hélice, en `[lateral, profundidad]`. */
export const EJE: [number, number] = [0, -0.55]

export interface Estacion {
	/** Grados alrededor del eje. */
	giro: number
	/** Distancia al eje, en metros. */
	radio: number
	/** Altura de la cámara, en metros. */
	altura: number
	/** Cabeceo en grados. 0 = horizontal hacia el eje, a la altura de la cámara. */
	inclinacion: number
}

/**
 * Los dos formatos de pantalla · RV-L2.13
 *
 * **`alto` no es «móvil», es «vertical», y la diferencia importa.** Lo que
 * rompía el encuadre no era el tamaño del aparato sino la proporción: la cámara
 * tiene un campo de visión **vertical** fijo, así que en una pantalla apaisada
 * el campo horizontal sale ancho y en una vertical sale angosto. Con 32° de
 * campo vertical y la proporción de un teléfono en pie, el campo horizontal se
 * queda en **15 grados**, y en 15 grados a seis metros del eje caben metro y
 * medio de mundo. La hélice mide 2.72 m de ancha: no cabía. Por eso en móvil se
 * veían dos hebras gigantes cruzando la pantalla y ninguna de las dos figuras —
 * no estaban fuera de la escena, estaban fuera del encuadre.
 *
 * Un iPad en horizontal usa el perfil ancho y el mismo iPad en vertical usa el
 * alto, que es exactamente lo que hay que hacer.
 */
export type Perfil = "ancho" | "alto"

/** Qué perfil le toca a una proporción de pantalla. */
export function perfilPara(aspecto: number): Perfil {
	return aspecto < 1 ? "alto" : "ancho"
}

/**
 * Campo de visión **horizontal** de referencia, en grados.
 *
 * Es el que da la composición aprobada: 32° verticales sobre una pantalla 16:9
 * son exactamente estos 54 horizontales. Se declara así —horizontal y no
 * vertical— porque es el que manda: lo que hay que garantizar es que quepan de
 * lado a lado la hélice y las dos figuras.
 */
export const FOV_HORIZONTAL = 54

/**
 * Tope del campo vertical, en grados.
 *
 * Mantener los 54° horizontales en una pantalla de teléfono exigiría **96
 * verticales**, y eso ya no es una cámara: es un ojo de pez. Las líneas rectas
 * se curvan, las figuras de los bordes se estiran y la hélice se retuerce. Así
 * que a partir de cierta estrechez se deja de ensanchar el ángulo y se resuelve
 * por el otro lado — alejando la cámara, que es lo que hace el perfil `alto`.
 */
export const FOV_VERTICAL_MAXIMO = 58

/**
 * El campo vertical que le toca a una proporción de pantalla.
 *
 * En 16:9 devuelve 32.0, que es el valor que había escrito a mano: la fórmula no
 * cambia nada de lo que ya estaba aprobado, solo deja de romperse cuando la
 * pantalla es estrecha.
 */
export function fovPara(aspecto: number): number {
	const horizontal = (FOV_HORIZONTAL * Math.PI) / 180
	const vertical = 2 * Math.atan(Math.tan(horizontal / 2) / Math.max(0.2, aspecto))
	return Math.min(FOV_VERTICAL_MAXIMO, (vertical * 180) / Math.PI)
}

/** Al empezar el scroll. Es el encuadre que estuvo fijo hasta ahora. */
export const INICIO: Estacion = { giro: 0, radio: 6.0, altura: 1.25, inclinacion: -1.2 }

/**
 * Al final. Veintiséis grados de giro, ochenta centímetros de descenso y un
 * radio algo menor — que acerca la cámara al eje y, por lo tanto, **la aleja de
 * las hebras**, que es donde estaba el riesgo de que una barriera el objetivo.
 *
 * Acaba con la vista **horizontal** —`inclinacion: 0`—, que es lo que hace que
 * el descenso se lea como un descenso. Los 1.2° negativos del inicio no son un
 * capricho: reproducen el encuadre fijo que había antes, mirando un poco hacia
 * abajo, para que el arranque de la página no cambie.
 *
 * **El giro es el mando de la velocidad.** Lo que se percibe como «el ADN gira
 * al hacer scroll» es en realidad esta cámara rodeando el eje de la hélice: el
 * objeto está quieto. Como el recorrido dura siempre lo mismo —el alto de la
 * página—, subir los grados es subir la velocidad. Estaba en 90; 112 es la misma
 * bajada girando algo menos de un cuarto de vuelta más.
 */
export const FIN: Estacion = { giro: 90, radio: 6.0, altura: -15, inclinacion: 0 }

/**
 * El recorrido en pantalla vertical.
 *
 * Con el campo topado en 58° verticales, una pantalla de teléfono da unos 28.7°
 * horizontales. **Lo que falta de ángulo se compensa con distancia**: a nueve
 * metros y medio del eje, esos 28.7° abarcan 4.86 m de mundo, y la hélice —2.72 m—
 * ocupa poco más de la mitad del ancho. Se ve la espiral entera girando, que es justamente lo
 * que en móvil no se veía.
 *
 * **Y la cámara empieza y termina más abajo que en apaisado.** No es un capricho
 * de composición: una pantalla vertical ve mucho más alto que ancho —a ocho
 * metros abarca 8.9 m de altura frente a los 3.4 de la apaisada— y con la altura
 * de escritorio se veían casi tres metros de vacío por encima de la punta de la
 * hélice. Bajando el ojo, la hélice llena el alto en vez de acabarse a media
 * pantalla.
 */
export const ESTACIONES: Record<Perfil, { inicio: Estacion; fin: Estacion }> = {
	ancho: { inicio: INICIO, fin: FIN },
	alto: {
		inicio: { giro: 0, radio: 9.5, altura: -1.2, inclinacion: -1.2 },
		fin: { giro: 90, radio: 9.5, altura: -13, inclinacion: 0 },
	},
}

/**
 * Suavizado del recorrido.
 *
 * Sin él la cámara arranca de golpe al empezar el scroll y se detiene igual de
 * seco. Es la misma curva que usa la coreografía para todo lo demás, y por eso
 * el conjunto se siente de una pieza.
 */
const suave = (t: number) => t * t * (3 - 2 * t)

const mezclar = (a: number, b: number, t: number) => a + (b - a) * t

const GRADOS = Math.PI / 180

export interface Encuadre {
	posicion: [number, number, number]
	mira: [number, number, number]
}

/**
 * Dónde está la cámara y a dónde mira para un progreso de scroll de 0 a 1.
 *
 * Se exporta aparte de `recorrer` para que la comprobación pueda recorrer el
 * trayecto entero sin montar una escena: **es la misma función que usa la
 * pantalla**, así que lo que mide es lo que se ve, no una reconstrucción
 * parecida.
 */
export function encuadre(progreso: number, perfil: Perfil = "ancho"): Encuadre {
	const t = suave(Math.min(1, Math.max(0, progreso)))
	const { inicio, fin } = ESTACIONES[perfil]

	const giro = mezclar(inicio.giro, fin.giro, t) * GRADOS
	const radio = mezclar(inicio.radio, fin.radio, t)

	const altura = mezclar(inicio.altura, fin.altura, t)

	return {
		posicion: [EJE[0] + Math.sin(giro) * radio, altura, EJE[1] + Math.cos(giro) * radio],
		// La mira cuelga de la cámara: su misma altura, más lo que levante el
		// cabeceo. Se calcula sobre el radio para que la inclinación signifique lo
		// mismo esté la cámara cerca o lejos del eje.
		mira: [
			EJE[0],
			altura + Math.tan(mezclar(inicio.inclinacion, fin.inclinacion, t) * GRADOS) * radio,
			EJE[1],
		],
	}
}

/**
 * El encuadre para el que se escribió la puesta en escena · RV-L2.9
 *
 * Las posiciones de `guion.ts` —la luz de cada sección, los pechos de las dos
 * figuras— se eligieron **mirando una pantalla con la cámara quieta aquí**, y
 * ahí se midió que la luz nunca pisa el texto, que es un requisito de contraste
 * y no una preferencia.
 *
 * Se conserva como referencia para poder traducir aquellas coordenadas a
 * «tantos metros a la derecha, tantos hacia arriba y tantos al fondo **de la
 * cámara**». Con esa traducción, la composición aprobada se mantiene aunque la
 * cámara baje quince metros y dé media vuelta: lo que estaba a la derecha del
 * encuadre sigue a la derecha del encuadre.
 */
const REFERENCIA = {
	posicion: new THREE.Vector3(0, 1.25, 6.4),
	mira: new THREE.Vector3(0, 1.12, 0),
}

/** Ejes de una cámara: a dónde cae su derecha, su arriba y su frente. */
function ejes(posicion: THREE.Vector3, mira: THREE.Vector3) {
	const frente = mira.clone().sub(posicion).normalize()
	const derecha = frente
		.clone()
		.cross(new THREE.Vector3(0, 1, 0))
		.normalize()
	const arriba = derecha.clone().cross(frente).normalize()
	return { frente, derecha, arriba }
}

/**
 * Coordenadas de un punto del mundo **respecto al encuadre de referencia**:
 * `[derecha, arriba, fondo]` en metros.
 */
export function aRelativo(mundo: [number, number, number]): [number, number, number] {
	const { frente, derecha, arriba } = ejes(REFERENCIA.posicion, REFERENCIA.mira)
	const v = new THREE.Vector3(...mundo).sub(REFERENCIA.posicion)
	return [v.dot(derecha), v.dot(arriba), v.dot(frente)]
}

/**
 * Y la vuelta: dónde cae ese `[derecha, arriba, fondo]` cuando la cámara está en
 * el punto `progreso` de su recorrido.
 *
 * Es la función que mantiene la escena delante de la cámara. Sin ella, mover la
 * cámara deja atrás a las figuras y a la esfera — que es exactamente lo que
 * pasó.
 */
export function aMundo(
	relativo: [number, number, number],
	progreso: number,
	destino = new THREE.Vector3(),
	perfil: Perfil = "ancho",
): THREE.Vector3 {
	const { posicion, mira } = encuadre(progreso, perfil)
	const ojo = new THREE.Vector3(...posicion)
	const { frente, derecha, arriba } = ejes(ojo, new THREE.Vector3(...mira))

	return destino
		.copy(ojo)
		.addScaledVector(derecha, relativo[0])
		.addScaledVector(arriba, relativo[1])
		.addScaledVector(frente, relativo[2])
}

/**
 * Cuánto se encoge el zigzag lateral en pantalla vertical.
 *
 * Los puntos por los que pasa la esfera se declaran en `guion.ts` a ±2.0 m del
 * centro, que es lo que la aparta del texto en una pantalla apaisada. En una
 * vertical ese mismo desplazamiento **la saca del encuadre**: a seis metros del
 * ojo, un campo horizontal de 28.7° abarca 1.56 m a cada lado, y 2.0 se queda
 * fuera. Con las trece secciones. `puesta.check.ts alto` lo cantaba.
 *
 * A la mitad, la esfera pasa a 1.0 m del centro: sigue claramente en el margen
 * que le toca —la comprobación verifica que nunca cae del lado de su texto— y
 * cabe con medio metro de sobra.
 *
 * ⚠️ **Lo que este número NO resuelve.** En apaisado, apartar la esfera al margen
 * contrario es lo que garantiza el contraste AA del texto: está medido que el
 * resplandor, siendo luz aditiva, hunde el texto secundario por debajo de 4.5:1
 * si le pasa por encima, y que ningún velo razonable lo compensa. **Ese
 * argumento no se sostiene en vertical**, porque ahí la columna ocupa el ancho
 * entero y no hay margen contrario: por mucho que la esfera se aparte, pasa por
 * detrás de la columna. Lo único que la protege es el panel de lectura al 82 %,
 * que se calibró contra la escena pero **no contra el resplandor encima**.
 *
 * Antes de publicar esta ruta hay que medir el contraste en vertical con la
 * esfera detrás del texto. Si no da, la salida es bajar el resplandor exterior
 * en este perfil (`Esfera.tsx`), no volver a apartar la esfera: no hay a dónde.
 */
export const LATERAL_EN_VERTICAL = 0.5

/**
 * Adapta un punto relativo a la cámara al perfil de pantalla.
 *
 * En apaisado no toca nada: la composición aprobada es esa.
 */
export function aPerfil(
	relativo: [number, number, number],
	perfil: Perfil,
): [number, number, number] {
	if (perfil === "ancho") return relativo
	return [relativo[0] * LATERAL_EN_VERTICAL, relativo[1], relativo[2]]
}

/** Punto al que mira la cámara. Reutilizado entre cuadros para no generar basura. */
const objetivo = new THREE.Vector3()

/**
 * Coloca la cámara según el progreso del scroll.
 *
 * Se llama desde el único `useFrame` de la escena. **La cámara no se anima
 * sola**: como la pose del personaje, va atada al scroll, así que se detiene
 * donde uno pare y vuelve atrás si uno sube.
 */
export function recorrer(camara: THREE.Camera, progreso: number, perfil: Perfil = "ancho") {
	const { posicion, mira } = encuadre(progreso, perfil)
	camara.position.set(posicion[0], posicion[1], posicion[2])
	objetivo.set(mira[0], mira[1], mira[2])
	camara.lookAt(objetivo)
}
