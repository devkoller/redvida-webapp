import { useEffect, useMemo, useRef } from "react"

import { tonoDeAvance } from "../escena/climas"
import { useEscena } from "../escena/estado"

/**
 * El degradado de fondo · RV-L4.4
 *
 * **Un solo degradado a toda pantalla, y ya está.** Antes eran seis manchas
 * redondas y difusas que se cruzaban por detrás. Sostenían la página cuando no
 * había nada más, pero se leían por lo que eran —seis círculos borrosos— y
 * además eran seis capas de composición promovidas a la GPU **de forma
 * permanente**, moviéndose y desvaneciéndose mientras el campo de estrellas
 * competía por la misma tarjeta. Se fueron: un degradado no tiene forma que
 * reconocer y es una sola capa que no se mueve.
 *
 * Lo que queda es un color de ambiente que **gira con el capítulo**: el tono
 * sale de `escena/climas.ts`, el mismo número exacto que tiñe las estrellas, así
 * que el aire y el cielo no pueden discrepar. Se escribe como un ángulo en
 * `--amb-tono` y el degradado lo mete en un `oklch()`; el resto lo hace CSS.
 *
 * ---
 *
 * ## Lo que hay que saber
 *
 * **1. Es DOM y CSS, no otro lienzo.** Va por detrás del campo de estrellas, que
 * se dibuja dentro de la escena 3D que ya existía; el `<Canvas>` pasó a
 * dibujarse con alfa (ver `Lienzo.tsx`) y el shader deja transparente todo lo
 * que no es estrella. Tres capas —color, cielo, figuras— apiladas en ese orden,
 * cada una dejando ver la de debajo.
 *
 * **2. Y es el fondo completo para quien no ve la escena** —sin WebGL, con
 * equipo modesto o pidiendo menos movimiento—, que es la razón de que viva en el
 * DOM. Para esos casos conserva el polvo en suspensión; donde hay estrellas, el
 * polvo sobra y no se monta.
 *
 * **3. No toca el contraste.** El panel de lectura (`.columna::before`) se pinta
 * dentro de `.contenido`, que está por delante de `.lienzo`. Todo lo de aquí
 * queda por detrás de ese panel, así que la certificación AA del Sprint 8 sigue
 * midiendo lo mismo: texto sobre `--background`, no sobre este color.
 */

/**
 * Reparto de motas de polvo.
 *
 * Deterministas a propósito: con `Math.random()` cada render movería el polvo
 * entero de sitio, y basta con que React reconcilie por cualquier motivo para
 * que el fondo dé un salto que no lo ha pedido nadie.
 */
function generarMotas(cantidad: number) {
	// mulberry32 con semilla fija. No hace falta más: son puntos de luz.
	let semilla = 0x9e3779b9
	const azar = () => {
		semilla = (semilla + 0x6d2b79f5) | 0
		let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	return Array.from({ length: cantidad }, (_, i) => ({
		clave: i,
		x: `${(azar() * 104 - 2).toFixed(2)}%`,
		y: `${(azar() * 104 - 2).toFixed(2)}%`,
		tamano: `${(azar() * 2.6 + 1.1).toFixed(2)}px`,
		// Duraciones largas y dispares: si coinciden, el ojo ve la cuadrícula.
		duracion: `${(azar() * 26 + 22).toFixed(1)}s`,
		// Retraso negativo para que el campo arranque ya poblado, no vacío.
		retraso: `${(-azar() * 40).toFixed(1)}s`,
		deriva: `${(azar() * 8 - 4).toFixed(2)}vw`,
		opacidad: (azar() * 0.4 + 0.18).toFixed(2),
	}))
}

export function Ambiente({ conPolvo = true }: { conPolvo?: boolean }) {
	const raiz = useRef<HTMLDivElement>(null)
	const { estado } = useEscena()
	const motas = useMemo(() => (conPolvo ? generarMotas(34) : []), [conPolvo])

	/**
	 * El tono se escribe como variable CSS, no como estado.
	 *
	 * Es la misma regla que gobierna `escena/estado.tsx`: esto cambia con cada
	 * cuadro de scroll y no puede pasar por el ciclo de render de React. Se
	 * escribe **una sola propiedad** en un solo elemento y el resto lo resuelve
	 * el compositor.
	 */
	useEffect(() => {
		const nodo = raiz.current
		if (!nodo) return

		let cuadro: number | null = null
		let ultimoTono = Number.NaN

		const pintar = () => {
			cuadro = null
			const s = estado.current
			// `crudo` y no `suave`: el suavizado de la escena lo mantiene vivo un
			// bucle que se apaga solo al detenerse el scroll, y un degradado a
			// pantalla completa cambia tan despacio que el escalón no se percibe.
			//
			// **Redondeado a grados enteros, y esto no es cosmética: es la
			// diferencia entre repintar la pantalla entera en cada cuadro de scroll
			// o no hacerlo.** Cambiar el tono obliga al navegador a regenerar un
			// degradado que ocupa todo el viewport, y eso es pintura de verdad, no
			// composición. Con el valor a una décima cambiaba en cada cuadro y ese
			// repintado se sumaba al coste del scroll. A grados enteros el degradado
			// se rehace unas pocas veces por recorrido, y un grado de matiz no lo
			// distingue nadie.
			const tono = Math.round(tonoDeAvance(s.hitos, s.crudo))
			if (tono === ultimoTono) return
			ultimoTono = tono
			nodo.style.setProperty("--amb-tono", String(tono))
		}

		const programar = () => {
			if (cuadro === null) cuadro = requestAnimationFrame(pintar)
		}

		pintar()
		window.addEventListener("scroll", programar, { passive: true })
		window.addEventListener("resize", programar)
		// Los hitos se miden después del primer pintado y otra vez cuando las
		// fuentes terminan de cargar. Sin este repaso el fondo se quedaría con el
		// reparto provisional del primer cuadro.
		const repaso = setTimeout(pintar, 600)
		document.fonts?.ready.then(pintar)

		return () => {
			window.removeEventListener("scroll", programar)
			window.removeEventListener("resize", programar)
			clearTimeout(repaso)
			if (cuadro !== null) cancelAnimationFrame(cuadro)
		}
	}, [estado])

	return (
		<div className="capa ambiente" ref={raiz} aria-hidden="true">
			{motas.length > 0 && (
				<div className="ambiente__polvo">
					{motas.map((mota) => (
						<span
							key={mota.clave}
							className="ambiente__mota"
							style={
								{
									"--x": mota.x,
									"--y": mota.y,
									"--s": mota.tamano,
									"--d": mota.duracion,
									"--r": mota.retraso,
									"--deriva": mota.deriva,
									"--o": mota.opacidad,
								} as React.CSSProperties
							}
						/>
					))}
				</div>
			)}
		</div>
	)
}

/**
 * Grano y viñeta · va POR DELANTE del lienzo.
 *
 * Separado de `<Ambiente>` a propósito: el campo de luz tiene que quedar debajo
 * de las figuras, pero el grano tiene que caer sobre todo —figuras incluidas— o
 * se nota que la escena y el fondo son dos superficies distintas. Es el mismo
 * truco que usa el cine para que un compuesto no se lea como dos capas.
 *
 * No lleva nada que dependa del scroll, así que no necesita efecto ninguno.
 */
export function Grano() {
	return (
		<div className="capa grano-capa" aria-hidden="true">
			<div className="grano" />
			<div className="vineta" />
		</div>
	)
}

export default Ambiente
