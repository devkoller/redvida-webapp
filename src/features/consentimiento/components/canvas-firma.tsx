import { Eraser } from "lucide-react"
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react"

import { Button } from "@/components/ui/button"

export interface CanvasFirmaHandle {
	/** PNG en base64 sin prefijo `data:`, o `null` si está vacío. */
	exportarPng: () => string | null
	limpiar: () => void
	estaVacio: () => boolean
}

/**
 * Canvas de firma con soporte de mouse y táctil.
 *
 * Usa **Pointer Events** en vez de pares mouse/touch: un solo juego de
 * manejadores cubre dedo, stylus y mouse, y `setPointerCapture` evita que el
 * trazo se corte si el dedo sale del canvas a media firma.
 *
 * El canvas se dimensiona por `devicePixelRatio`: sin eso, en pantallas Retina
 * la firma se guarda a la mitad de resolución y sale pixelada en el PDF.
 */
export function CanvasFirma({
	ref,
	onCambio,
}: {
	ref?: Ref<CanvasFirmaHandle>
	onCambio?: (tieneTrazo: boolean) => void
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const dibujando = useRef(false)
	const [vacio, setVacio] = useState(true)

	const contexto = useCallback(() => {
		const canvas = canvasRef.current
		return canvas?.getContext("2d") ?? null
	}, [])

	// Ajusta el buffer del canvas al tamaño real en pantalla.
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ajustar = () => {
			const ratio = window.devicePixelRatio || 1
			const rect = canvas.getBoundingClientRect()
			if (rect.width === 0) return

			canvas.width = Math.round(rect.width * ratio)
			canvas.height = Math.round(rect.height * ratio)

			const ctx = canvas.getContext("2d")
			if (!ctx) return
			ctx.scale(ratio, ratio)
			ctx.lineWidth = 2
			ctx.lineCap = "round"
			ctx.lineJoin = "round"
			// Negro fijo: la firma va a un PDF de fondo blanco, así que no hereda el
			// color del tema. Por eso el contenedor lleva fondo blanco fijo (papel):
			// en modo oscuro el trazo negro sería invisible sobre fondo oscuro.
			ctx.strokeStyle = "#111111"
		}

		ajustar()
		window.addEventListener("resize", ajustar)
		return () => window.removeEventListener("resize", ajustar)
	}, [])

	const posicion = (evento: React.PointerEvent<HTMLCanvasElement>) => {
		const rect = evento.currentTarget.getBoundingClientRect()
		return { x: evento.clientX - rect.left, y: evento.clientY - rect.top }
	}

	const iniciar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
		evento.preventDefault()
		const ctx = contexto()
		if (!ctx) return

		evento.currentTarget.setPointerCapture(evento.pointerId)
		dibujando.current = true
		const { x, y } = posicion(evento)
		ctx.beginPath()
		ctx.moveTo(x, y)
		// Un punto: firmar con un toque seco también debe dejar marca.
		ctx.lineTo(x + 0.1, y)
		ctx.stroke()

		if (vacio) {
			setVacio(false)
			onCambio?.(true)
		}
	}

	const mover = (evento: React.PointerEvent<HTMLCanvasElement>) => {
		if (!dibujando.current) return
		evento.preventDefault()
		const ctx = contexto()
		if (!ctx) return
		const { x, y } = posicion(evento)
		ctx.lineTo(x, y)
		ctx.stroke()
	}

	const terminar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
		if (!dibujando.current) return
		dibujando.current = false
		evento.currentTarget.releasePointerCapture?.(evento.pointerId)
		contexto()?.closePath()
	}

	const limpiar = useCallback(() => {
		const canvas = canvasRef.current
		const ctx = contexto()
		if (!canvas || !ctx) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		setVacio(true)
		onCambio?.(false)
	}, [contexto, onCambio])

	useImperativeHandle(
		ref,
		() => ({
			estaVacio: () => vacio,
			limpiar,
			exportarPng: () => {
				const canvas = canvasRef.current
				if (!canvas || vacio) return null
				return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "")
			},
		}),
		[vacio, limpiar],
	)

	return (
		<div className="space-y-2">
			<div className="relative rounded-lg border border-input bg-white">
				<canvas
					ref={canvasRef}
					// `touch-none` es imprescindible: sin él, arrastrar el dedo sobre
					// el canvas hace scroll de la página en vez de dibujar.
					className="h-40 w-full cursor-crosshair touch-none rounded-lg"
					onPointerDown={iniciar}
					onPointerMove={mover}
					onPointerUp={terminar}
					onPointerLeave={terminar}
					onPointerCancel={terminar}
					aria-label="Área para firmar. Dibuje su firma con el dedo o el mouse"
					role="img"
				/>
				{vacio && (
					<p className="pointer-events-none absolute inset-0 grid text-slate-500 place-items-center text-sm">
						Firme aquí con el dedo o el mouse
					</p>
				)}
				<div
					aria-hidden
					className="pointer-events-none absolute border-slate-400/60 right-6 bottom-8 left-6 border-b border-dashed"
				/>
			</div>

			<div className="flex justify-end">
				<Button type="button" variant="ghost" size="sm" onClick={limpiar} disabled={vacio}>
					<Eraser className="size-4" />
					Borrar y firmar de nuevo
				</Button>
			</div>
		</div>
	)
}

export default CanvasFirma
