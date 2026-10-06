import { AlertCircle } from "lucide-react"
import { useEffect, useRef } from "react"

import type { ErrorCampo } from "@/api/fetchApi"

/**
 * Resumen de errores al principio del formulario.
 *
 * En un formulario largo, marcar solo el campo no basta: si el error está
 * abajo, la persona pulsa "Continuar" y aparentemente no pasa nada. Este
 * resumen recibe el foco al aparecer y lo anuncia con `role="alert"`, que es
 * el patrón que recomienda WCAG 3.3.1.
 *
 * `enfocar={false}` lo deja solo como `role="alert"` (se anuncia, pero no roba
 * el foco ni mueve el scroll). Es para cuando el mensaje cambia mientras la
 * persona sigue contestando: enfocarlo la devolvería arriba en cada respuesta.
 */
export function ErrorSummary({
	mensaje,
	errores = [],
	enfocar = true,
}: {
	mensaje?: string | null
	errores?: ErrorCampo[]
	enfocar?: boolean
}) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (enfocar && (mensaje || errores.length > 0)) ref.current?.focus()
	}, [mensaje, errores.length, enfocar])

	if (!mensaje && errores.length === 0) return null

	return (
		<div
			ref={ref}
			tabIndex={-1}
			role="alert"
			className="border-destructive/40 bg-destructive/5 rounded-lg border p-4"
		>
			<div className="flex gap-3">
				<AlertCircle aria-hidden className="text-destructive mt-0.5 size-5 shrink-0" />
				<div className="min-w-0">
					<p className="text-destructive text-sm font-semibold">
						{mensaje || "Revise los datos capturados"}
					</p>
					{errores.length > 0 && (
						<ul className="text-destructive/90 mt-2 list-disc space-y-1 pl-4 text-sm">
							{errores.map((error) => (
								<li key={`${error.campo}-${error.mensaje}`}>{error.mensaje}</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	)
}

export default ErrorSummary
