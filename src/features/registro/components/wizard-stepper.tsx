import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PasoRegistro } from "@/stores/registroStore"

const PASOS = [
	{ numero: 1, etiqueta: "Tus datos" },
	{ numero: 2, etiqueta: "Verificación" },
	{ numero: 3, etiqueta: "Salud" },
	{ numero: 4, etiqueta: "Cita" },
	{ numero: 5, etiqueta: "Consentimiento" },
] as const

/**
 * Indicador de avance del wizard.
 *
 * Es `<ol>` y no una fila de `<div>`: para un lector de pantalla esto es una
 * lista ordenada de pasos, y `aria-current="step"` es lo que anuncia dónde
 * está la persona.
 */
export function WizardStepper({
	pasoActual,
	alElegirPaso,
}: {
	pasoActual: PasoRegistro
	/**
	 * Si se pasa, cada paso se vuelve pulsable. Solo lo usa el modo
	 * demostración: en el recorrido real no se puede saltar un paso, porque
	 * cada uno depende de lo que devolvió el anterior.
	 */
	alElegirPaso?: (paso: PasoRegistro) => void
}) {
	return (
		<nav aria-label="Avance del registro">
			<ol className="flex items-center gap-2 sm:gap-3">
				{PASOS.map((paso) => {
					const completado = paso.numero < pasoActual
					const activo = paso.numero === pasoActual
					// Un `div` no navegable con teclado deja de serlo en cuanto se
					// vuelve pulsable: por eso pasa a ser `button` y no un `div`
					// con `onClick`.
					const Envoltura = alElegirPaso ? "button" : "div"

					return (
						<li key={paso.numero} className="flex flex-1 items-center gap-2 sm:gap-3">
							<Envoltura
								{...(alElegirPaso
									? {
											type: "button" as const,
											onClick: () => alElegirPaso(paso.numero),
											"aria-label": `Ir al paso ${paso.numero}: ${paso.etiqueta}`,
										}
									: {})}
								className={cn(
									"flex min-w-0 flex-1 flex-col gap-1.5",
									alElegirPaso && "rounded-md text-left",
								)}
							>
								<div className="flex items-center gap-2">
									<span
										aria-hidden
										className={cn(
											"grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
											completado && "bg-primary text-primary-foreground",
											activo && "bg-primary text-primary-foreground ring-primary/25 ring-4",
											!completado && !activo && "bg-muted text-muted-foreground",
										)}
									>
										{completado ? <Check className="size-3.5" /> : paso.numero}
									</span>
									<span
										className={cn(
											"hidden truncate text-sm sm:inline",
											activo ? "text-foreground font-medium" : "text-muted-foreground",
										)}
									>
										{paso.etiqueta}
									</span>
								</div>
								{/* Barra de avance visible también en móvil, donde la
								    etiqueta se oculta por espacio. */}
								<span
									aria-hidden
									className={cn(
										"h-1 rounded-full transition-colors",
										completado || activo ? "bg-primary" : "bg-muted",
									)}
								/>
							</Envoltura>
							{/* Texto solo para lectores de pantalla */}
							<span className="sr-only" {...(activo ? { "aria-current": "step" } : {})}>
								Paso {paso.numero} de {PASOS.length}: {paso.etiqueta}
								{completado ? " (completado)" : ""}
							</span>
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

export default WizardStepper
