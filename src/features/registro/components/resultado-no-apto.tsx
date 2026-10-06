import { Link } from "@tanstack/react-router"
import { CalendarClock, HeartHandshake } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRegistroStore } from "@/stores/registroStore"
import { CompartirRedes } from "./compartir-redes"

const formatearFecha = (iso: string | null) => {
	if (!iso) return ""
	const fecha = new Date(`${iso}T12:00:00Z`)
	return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
}

/**
 * Resultado del cuestionario cuando no es "apto". Se muestra en el propio
 * paso 3 —no hay un paso aparte para esto— porque quien queda diferido o
 * descartado nunca debería llegar a agendar cita ni a firmar consentimiento.
 *
 * Las dos variantes están escritas con cuidado: quien acaba de dedicar cinco
 * minutos a intentar salvar una vida no debe encontrarse un "no apto" seco. Se
 * da la fecha exacta cuando aplica y se ofrece otra forma de ayudar. **No se
 * muestran los motivos**: son datos de salud de la persona y no deben quedar
 * en pantalla.
 */
export function ResultadoNoApto() {
	const { codigoRegistro, elegibilidad, limpiar } = useRegistroStore()
	const resultado = elegibilidad?.resultado

	if (resultado === "no_apto_temporal") {
		return (
			<div className="space-y-6 text-center">
				<span
					aria-hidden
					className="bg-warning/15 text-warning-foreground mx-auto grid size-14 place-items-center rounded-full"
				>
					<CalendarClock className="size-7" />
				</span>
				<div>
					<h2 className="text-2xl font-semibold">Aún no, pero pronto sí</h2>
					<p className="text-muted-foreground mx-auto mt-3 max-w-lg leading-relaxed">
						Por ahora necesita esperar un periodo antes de poder donar. Es una medida temporal de
						seguridad; no es un rechazo.
					</p>
				</div>

				<Card className="mx-auto max-w-md">
					<CardContent className="p-6">
						<p className="text-muted-foreground text-sm">Podrá registrarse a partir del</p>
						<p className="text-primary-accent mt-1 text-2xl font-bold">
							{formatearFecha(elegibilidad?.bloqueado_hasta ?? null)}
						</p>
					</CardContent>
				</Card>

				{codigoRegistro && (
					<p className="text-muted-foreground text-sm">
						Conserve su código: <strong className="text-foreground">{codigoRegistro}</strong>
					</p>
				)}

				<CompartirRedes />

				<Button asChild variant="outline" onClick={() => limpiar()}>
					<Link to="/">Volver al inicio</Link>
				</Button>
			</div>
		)
	}

	// ------------------------------------------------------------- No apto permanente
	return (
		<div className="space-y-6 text-center">
			<span
				aria-hidden
				className="bg-muted text-muted-foreground mx-auto grid size-14 place-items-center rounded-full"
			>
				<HeartHandshake className="size-7" />
			</span>
			<div>
				<h2 className="text-2xl font-semibold">Gracias por querer ayudar</h2>
				<p className="text-muted-foreground mx-auto mt-3 max-w-lg leading-relaxed">
					Por sus antecedentes de salud, en este momento no es posible incorporarlo al registro de
					donadores. Esta decisión protege tanto su salud como la de quien recibiría el trasplante.
				</p>
			</div>

			<CompartirRedes />

			<Button asChild variant="outline" onClick={() => limpiar()}>
				<Link to="/">Volver al inicio</Link>
			</Button>
		</div>
	)
}

export default ResultadoNoApto
