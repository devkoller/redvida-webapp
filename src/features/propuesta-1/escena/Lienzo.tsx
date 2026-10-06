import { Canvas, useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"

import { Escena } from "./Escena"
import { useColorDeFondo, useColorDeToken } from "./colores"
import type { EstadoEscena } from "./estado"
import { precargarEscena } from "./modelos"

/**
 * Avisa cuando la escena ha dibujado de verdad.
 *
 * **Tener los archivos no es tenerlos en pantalla.** Entre que la última
 * descarga termina y que se ve algo hay un tramo que no es instantáneo: three
 * tiene que interpretar el glTF, subir las mallas y las texturas a la tarjeta y
 * compilar los materiales, y todo eso ocurre durante los primeros cuadros. Si la
 * pantalla de carga se retira en cuanto la promesa se resuelve, se retira justo
 * al principio de ese tramo — y lo que queda a la vista es el fondo vacío.
 *
 * Contar cuadros dentro del lienzo es la forma directa de esperar a lo que
 * realmente importa: no «los datos están», sino «esto ya se ha pintado».
 */
function AvisoDeCuadro({ alDibujar }: { alDibujar: () => void }) {
	const cuadros = useRef(0)
	const avisado = useRef(false)

	useFrame(() => {
		if (avisado.current) return
		cuadros.current += 1
		// Tres: el primero suele ser el que paga la compilación de materiales y la
		// subida de texturas, y sale largo. Al tercero la escena ya va sola.
		if (cuadros.current >= 3) {
			avisado.current = true
			alDibujar()
		}
	})

	return null
}

/**
 * Lienzo 3D · RV-L2.1
 *
 * Se importa con `lazy()` desde la página: este archivo y todo lo que arrastra
 * —three, la escena, los modelos— queda en un *chunk* aparte que no forma parte
 * del camino crítico. Quien pide menos movimiento o llega con un equipo modesto
 * no lo descarga nunca (RV-L5.1, RV-L5.2).
 *
 * El lienzo es **decoración**: `aria-hidden` y sin eventos de puntero. Todo lo
 * que comunica está en el DOM.
 */
export default function Lienzo({
	estado,
	alEstarListo,
	alProgreso,
}: {
	estado: React.RefObject<EstadoEscena>
	/** Se avisa cuando la primera figura está cargada y pintada. */
	alEstarListo?: () => void
	/** Avance de la descarga del modelo, de 0 a 1. */
	alProgreso?: (valor: number) => void
}) {
	const contenedor = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(true)
	const [listo, setListo] = useState(false)
	/** Todos los archivos de la escena están descargados. */
	const [descargado, setDescargado] = useState(false)
	/** La escena ya ha pintado sus primeros cuadros. */
	const [dibujado, setDibujado] = useState(false)
	const colorFondo = useColorDeFondo(contenedor)
	// El color de marca de la paleta activa. La esfera lo necesita para tener
	// cuerpo cuando el fondo es claro: ahí la luz aditiva no suma nada.
	const colorMarca = useColorDeToken(contenedor, "--primary", "#ff9d5c")

	/**
	 * La secuencia de carga · RV-L2.11c
	 *
	 * Son **dos condiciones, no una**, y hasta ahora solo se comprobaba media:
	 *
	 * 1. **Que esté todo descargado.** Antes se esperaba solo a `personaje.glb` y
	 *    la utilería no contaba, con la hélice pesando prácticamente lo mismo. El
	 *    anillo marcaba 100 % a mitad de la descarga real. Ahora
	 *    `precargarEscena()` espera a todos los archivos que declara la escena.
	 * 2. **Que se haya dibujado.** Aunque el 100 % fuera exacto, interpretar el
	 *    glTF, subir las mallas y compilar los materiales lleva unos cuadros más.
	 *    `<AvisoDeCuadro>` espera a que la escena haya pintado tres antes de dar
	 *    el aviso.
	 *
	 * Solo cuando se cumplen las dos se retira la pantalla de carga.
	 */
	useEffect(() => {
		let cancelado = false
		precargarEscena((valor) => {
			if (!cancelado) alProgreso?.(valor)
		}).then(() => {
			if (!cancelado) setDescargado(true)
		})
		return () => {
			cancelado = true
		}
	}, [alProgreso])

	/**
	 * Red de seguridad: la pantalla de carga no puede quedarse para siempre.
	 *
	 * `<AvisoDeCuadro>` espera a que la escena pinte, y si no pinta nunca no avisa
	 * nunca. Eso pasa de verdad: **un lienzo que no está a la vista no dibuja** —
	 * lo detiene el `frameloop="never"` de más abajo, que es justo lo que se
	 * quiere para no gastar GPU en balde—, así que abrir la página en una pestaña
	 * de segundo plano deja el anillo clavado en 100 % hasta que alguien la mire.
	 * Y una pérdida del contexto WebGL lo dejaría clavado del todo.
	 *
	 * Pasado un segundo desde que está todo descargado se sigue adelante sin el
	 * aviso. En el peor caso se ve la escena posarse un instante más tarde; lo que
	 * no puede ocurrir es que la página se quede detrás de una pantalla de carga
	 * que ya no espera nada.
	 */
	useEffect(() => {
		if (!descargado || dibujado) return
		const plazo = setTimeout(() => setDibujado(true), 1000)
		return () => clearTimeout(plazo)
	}, [descargado, dibujado])

	useEffect(() => {
		if (!descargado || !dibujado) return
		// El anillo llega al 100 % en el mismo instante en que la descarga termina,
		// pero su propio trazo tarda un poco en cerrarse (`stroke-dashoffset` anima
		// en 200ms). Esta pausa es solo para eso; era de 350ms y se quedó en 150
		// porque cada milisegundo de aquí es tiempo mirando un 100 % quieto.
		const temporizador = setTimeout(() => {
			setListo(true)
			alEstarListo?.()
		}, 150)
		return () => clearTimeout(temporizador)
	}, [descargado, dibujado, alEstarListo])

	// Un lienzo fuera de pantalla o en una pestaña de fondo no debe consumir GPU.
	// `frameloop="never"` detiene el bucle por completo, no solo lo oculta.
	useEffect(() => {
		const elemento = contenedor.current
		if (!elemento) return

		const observador = new IntersectionObserver(([entrada]) => setVisible(entrada.isIntersecting), {
			threshold: 0,
		})
		observador.observe(elemento)

		const alCambiarVisibilidad = () => {
			if (document.hidden) setVisible(false)
			else setVisible(Boolean(elemento.getBoundingClientRect().height))
		}
		document.addEventListener("visibilitychange", alCambiarVisibilidad)

		return () => {
			observador.disconnect()
			document.removeEventListener("visibilitychange", alCambiarVisibilidad)
		}
	}, [])

	return (
		<div
			ref={contenedor}
			className="capa capa-lienzo"
			data-listo={listo ? "true" : undefined}
			aria-hidden="true"
		>
			<Canvas
				frameloop={visible ? "always" : "never"}
				/*
				 * **Bajado de 1.75 a 1.5, y se queda ahí.**
				 *
				 * Entró para aliviar el campo de estrellas a pantalla completa, que ya
				 * no existe —lo sustituyó el polvo de luz de `Lucecitas.tsx`, que
				 * cuesta una fracción—, así que podría volver a subirse. No se sube:
				 * el ahorro no era solo del cielo. Esta cifra multiplica al cuadrado
				 * **todos** los píxeles de la escena, hélice y figuras incluidas, y de
				 * 1.75 a 1.5 son un 27 % menos en cada cuadro. En una pantalla Retina
				 * la diferencia de nitidez no se aprecia; la de fluidez, sí.
				 */
				dpr={[1, 1.5]}
				/*
				 * **`alpha: true` es lo que deja ver el fondo vivo.** Antes el lienzo se
				 * limpiaba con un color opaco igual al de la página, y mientras el fondo
				 * era plano eso daba exactamente el mismo resultado que ser transparente
				 * — por eso estaba así, y por eso salía más barato. Ahora detrás hay un
				 * campo de luz que cambia por capítulo (`components/Ambiente.tsx`), y un
				 * lienzo opaco lo taparía entero: la escena volvería a flotar sobre un
				 * color liso. Con alfa, las figuras se recortan contra ese fondo y el
				 * aire alrededor es el de la página.
				 */
				gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
				camera={{ fov: 32, position: [0, 1.25, 6.4], near: 0.1, far: 40 }}
			>
				<Escena estado={estado} colorFondo={colorFondo} colorMarca={colorMarca} />
				<AvisoDeCuadro alDibujar={() => setDibujado(true)} />
			</Canvas>
		</div>
	)
}
