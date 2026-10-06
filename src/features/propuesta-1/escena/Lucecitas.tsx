import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

import { EJE, ESTACIONES, encuadre } from "./camara"
import { tonoDeAvance } from "./climas"
import type { EstadoEscena } from "./estado"

/**
 * El polvo de luz de la escena · RV-L4.6
 *
 * Puntos de luz pequeños repartidos por todo el volumen que recorre la cámara,
 * meciéndose despacio. Es lo mismo que hace la esfera —un resplandor aditivo—
 * pero diminuto y muchas veces, y con el mismo vaivén lento que llevan los
 * objetos de la utilería.
 *
 * ---
 *
 * ## Por qué sustituye al campo de estrellas
 *
 * Antes esto era un shader a pantalla completa (el «Galaxy» de ReactBits,
 * portado). Se le bajó la resolución a la mitad y se le puso a recalcularse a 30
 * Hz, y aun así seguía costando: **el problema era de fondo, no de ajuste**. Un
 * shader de estrellas evalúa, en **cada píxel de la pantalla**, un vecindario de
 * celdas para ver qué estrellas caen cerca — unas veintisiete evaluaciones por
 * píxel. Que en la pantalla haya cuatrocientos puntos de luz o ninguno no le
 * ahorra ni un ciclo: paga por píxel, no por estrella.
 *
 * Esto paga por estrella. Son 420 puntos: **420 vértices**, y cada uno se
 * dibuja como un cuadradito de unos pocos píxeles. El trabajo total baja en dos
 * órdenes de magnitud, y de propina se ganan cosas que el shader no podía dar:
 *
 * - **Tienen sitio en el mundo.** El campo de estrellas era una imagen pegada al
 *   fondo; estos puntos están *dentro* de la escena, así que la hélice los tapa
 *   cuando pasa por delante y se acercan y se alejan al bajar la cámara. El
 *   paralaje sale gratis porque es real.
 * - **Se mecen como todo lo demás.** El vaivén es el mismo lenguaje que usa la
 *   utilería, y se calcula en el vértice: 420 senos por cuadro en la tarjeta, no
 *   en el hilo principal.
 *
 * ## El color sigue mandándolo el guion
 *
 * Igual que hacía el cielo: el tono sale de `climas.ts`, el mismo número exacto
 * que tiñe el degradado del DOM. Aquí es más directo que antes —el shader de
 * estrellas obligaba a hablarle en desplazamientos sobre un tono propio suyo, y
 * eso costó un cielo verde—; un punto de luz se pinta del color que se le diga.
 */

/**
 * Cuántos.
 *
 * Cuatrocientos veinte llenan el volumen sin que se lea el patrón. El coste es
 * tan bajo que este número no es el que hay que tocar si algo va lento: mil
 * seguirían siendo mil vértices.
 */
const CANTIDAD = 420

/** El volumen que se siembra, alrededor del eje de la hélice. */
const VOLUMEN = {
	/** No se siembra por dentro: ahí está la hélice. */
	radioMinimo: 2.2,
	radioMaximo: 13,
	/** Cubre el descenso entero de la cámara, con margen por arriba y por abajo. */
	suelo: -21,
	techo: 7,
}

/**
 * A cuánto puede acercarse un punto al recorrido de la cámara.
 *
 * Sin esto, tarde o temprano uno cae justo encima del trayecto y pasa por
 * delante del objetivo como un fogonazo. Es el mismo cuidado que ya tiene la
 * esfera —`puesta.check.ts` comprueba que nunca se pega a la cámara—, y aquí se
 * resuelve al sembrar: se descarta el candidato y se prueba otro.
 */
const DISTANCIA_MINIMA = 2.0

/** Dónde se apagan por distancia. Más allá del segundo, no se dibujan. */
const NIEBLA: [number, number] = [16, 30]

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uEscala;
uniform vec2 uNiebla;

attribute float fase;
attribute float amplitud;
attribute float brillo;
attribute float tamano;

varying float vBrillo;

void main() {
  // El vaivén, en el vértice. Tres frecuencias distintas y desfasadas por punto:
  // con una sola, los 420 se mecerían al unísono y se leería como que tiembla la
  // pantalla, no como que flotan.
  vec3 p = position;
  p.x += sin(uTime * 0.21 + fase) * amplitud;
  p.y += cos(uTime * 0.17 + fase * 1.4) * amplitud * 0.7;
  p.z += sin(uTime * 0.13 + fase * 0.8) * amplitud;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;

  // Tamaño con perspectiva: los de cerca, mayores. El tope evita que uno que se
  // acerque mucho se coma media pantalla.
  gl_PointSize = clamp(tamano * uEscala / max(0.1, dist), 1.0, 64.0);

  // Se apagan con la distancia, como la niebla de la escena: sin esto, el fondo
  // del volumen se ve tan brillante como el frente y se pierde la profundidad.
  float lejania = 1.0 - smoothstep(uNiebla.x, uNiebla.y, dist);
  // Un latido lento y suave. Es lo que los separa de un cielo pintado.
  float latido = 0.78 + 0.22 * sin(uTime * 0.9 + fase * 3.1);

  vBrillo = brillo * lejania * latido;
  gl_Position = projectionMatrix * mv;
}
`

const fragmentShader = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform float uIntensidad;

varying float vBrillo;

void main() {
  // El resplandor, calculado en vez de leído de una textura. Es la misma curva
  // que dibuja \`halo.ts\` para la esfera —caída suave, sin borde en ninguna
  // parte— pero sin gastar una textura ni atarse a su color naranja: aquí el
  // tono lo pone el capítulo.
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float halo = 1.0 - smoothstep(0.0, 1.0, d);
  halo *= halo;
  // El núcleo, mucho más pequeño y mucho más brillante: es lo que hace que se
  // lea como un punto de luz y no como una mancha.
  float nucleo = 1.0 - smoothstep(0.0, 0.32, d);

  float a = (halo * 0.55 + nucleo * 0.9) * vBrillo * uIntensidad;
  if (a <= 0.001) discard;

  // Aditivo con alfa premultiplicado: el color ya viene multiplicado por su
  // fuerza, así que el búfer recibe justo la luz que suma este punto.
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * Siembra los puntos.
 *
 * Determinista: con `Math.random()` el campo cambiaría en cada montaje y en cada
 * recarga, y una escena que se compone a mano tiene que verse igual siempre.
 */
function sembrar() {
	// mulberry32 con semilla fija. Ver `components/Ambiente.tsx`, mismo motivo.
	let semilla = 0x1a2b3c4d
	const azar = () => {
		semilla = (semilla + 0x6d2b79f5) | 0
		let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	// El recorrido de la cámara en los dos perfiles, muestreado. Se usa para
	// descartar los puntos que caerían encima del trayecto.
	const trayecto: THREE.Vector3[] = []
	for (const perfil of Object.keys(ESTACIONES) as (keyof typeof ESTACIONES)[]) {
		for (let i = 0; i <= 40; i++) {
			trayecto.push(new THREE.Vector3(...encuadre(i / 40, perfil).posicion))
		}
	}

	const posiciones = new Float32Array(CANTIDAD * 3)
	const fases = new Float32Array(CANTIDAD)
	const amplitudes = new Float32Array(CANTIDAD)
	const brillos = new Float32Array(CANTIDAD)
	const tamanos = new Float32Array(CANTIDAD)

	const punto = new THREE.Vector3()
	let escritos = 0
	let intentos = 0

	while (escritos < CANTIDAD && intentos < CANTIDAD * 40) {
		intentos++

		const angulo = azar() * Math.PI * 2
		// Raíz del azar para que la densidad sea pareja por área y no se
		// amontonen todos cerca del eje.
		const radio = Math.sqrt(
			azar() * (VOLUMEN.radioMaximo ** 2 - VOLUMEN.radioMinimo ** 2) + VOLUMEN.radioMinimo ** 2,
		)
		punto.set(
			EJE[0] + Math.cos(angulo) * radio,
			VOLUMEN.suelo + azar() * (VOLUMEN.techo - VOLUMEN.suelo),
			EJE[1] + Math.sin(angulo) * radio,
		)

		let cerca = false
		for (const ojo of trayecto) {
			if (punto.distanceTo(ojo) < DISTANCIA_MINIMA) {
				cerca = true
				break
			}
		}
		if (cerca) continue

		posiciones[escritos * 3] = punto.x
		posiciones[escritos * 3 + 1] = punto.y
		posiciones[escritos * 3 + 2] = punto.z
		fases[escritos] = azar() * Math.PI * 2
		// Los de cerca se mecen menos, o el movimiento se lee exagerado.
		amplitudes[escritos] = (0.12 + azar() * 0.5) * Math.min(1, radio / 6)
		brillos[escritos] = 0.35 + azar() * 0.65
		// Unos pocos bastante mayores: un campo con todos iguales se lee plano.
		tamanos[escritos] = azar() < 0.12 ? 26 + azar() * 22 : 8 + azar() * 12
		escritos++
	}

	const geometria = new THREE.BufferGeometry()
	geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3))
	geometria.setAttribute("fase", new THREE.BufferAttribute(fases, 1))
	geometria.setAttribute("amplitud", new THREE.BufferAttribute(amplitudes, 1))
	geometria.setAttribute("brillo", new THREE.BufferAttribute(brillos, 1))
	geometria.setAttribute("tamano", new THREE.BufferAttribute(tamanos, 1))
	// El vaivén mueve los puntos fuera de su caja, y three descartaría el campo
	// entero en algunos encuadres si se fiara de ella.
	geometria.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity)

	return geometria
}

export function Lucecitas({
	estado,
	claridad,
}: {
	estado: React.RefObject<EstadoEscena>
	/** Cuánto tira a claro el fondo del tema, de 0 a 1. En claro no se dibujan. */
	claridad: number
}) {
	const tamano = useThree((s) => s.size)
	const dpr = useThree((s) => s.viewport.dpr)

	const geometria = useMemo(sembrar, [])

	const material = useMemo(
		() =>
			new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				uniforms: {
					uTime: { value: 0 },
					uEscala: { value: 300 },
					uColor: { value: new THREE.Color("#ffd6a0") },
					uIntensidad: { value: 1 },
					uNiebla: { value: new THREE.Vector2(...NIEBLA) },
				},
				transparent: true,
				blending: THREE.AdditiveBlending,
				// **Con test de profundidad, sin escritura.** Que la hélice tape los
				// puntos que quedan detrás es la mitad del efecto: es lo que los pone
				// dentro de la escena en vez de encima. Escribir profundidad, en
				// cambio, haría que se taparan entre ellos, y la luz no se tapa.
				depthTest: true,
				depthWrite: false,
				toneMapped: false,
			}),
		[],
	)

	useEffect(() => {
		return () => {
			geometria.dispose()
			material.dispose()
		}
	}, [geometria, material])

	const color = useMemo(() => new THREE.Color(), [])

	useFrame((estadoR3F, delta) => {
		const u = material.uniforms
		u.uTime.value += delta

		/**
		 * El tamaño en píxeles de un punto depende del alto del lienzo y de cuánto
		 * abre el objetivo, y las dos cosas cambian: el objetivo con la proporción
		 * de la pantalla (ver `fovPara` en `camara.ts`) y el alto al girar el
		 * teléfono. Sin recalcularlo, las luces salen del tamaño equivocado en
		 * cuanto la ventana deja de ser la que era al montar.
		 */
		const camara = estadoR3F.camera as THREE.PerspectiveCamera
		if (camara.isPerspectiveCamera) {
			const altoPx = tamano.height * dpr
			u.uEscala.value = altoPx / (2 * Math.tan(((camara.fov / 2) * Math.PI) / 180))
		}

		// El tono lo manda el capítulo que se está leyendo, igual que el degradado
		// del DOM. Ver `climas.ts`.
		const s = estado.current
		color.setHSL(tonoDeAvance(s.hitos, s.crudo) / 360, 0.55, 0.72)
		u.uColor.value.copy(color)

		u.uIntensidad.value = Math.max(0, 1 - claridad)
	})

	// En los temas claros la luz aditiva no suma nada sobre papel blanco: no se
	// vería, y se pagaría igual.
	if (claridad >= 1) return null

	return <points geometry={geometria} material={material} frustumCulled={false} />
}

export default Lucecitas
