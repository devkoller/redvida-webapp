import { Link } from "@tanstack/react-router"
import { HeartHandshake } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useRegistroStore } from "@/stores/registroStore"
import { CompartirRedes } from "./compartir-redes"

/**
 * Pantalla a la que llega quien responde "No" a donar a cualquier paciente
 * compatible. No se le registra, pero tampoco se le despide: el mayor obstáculo
 * de la donación es que la gente no sabe que existe, así que se le invita a
 * difundirla.
 */
export function PantallaGracias() {
	const { setDeclino, limpiar } = useRegistroStore()

	return (
		<div className="space-y-8 text-center">
			<span
				aria-hidden
				className="bg-primary/10 text-primary mx-auto grid size-14 place-items-center rounded-full"
			>
				<HeartHandshake className="size-7" />
			</span>

			<div>
				<h2 className="text-2xl font-semibold">Gracias por su tiempo</h2>
				<p className="text-muted-foreground mx-auto mt-3 max-w-lg leading-relaxed">
					Respetamos su decisión: la donación es voluntaria y solo tiene sentido si es de corazón.
					No guardamos ninguno de sus datos.
				</p>
			</div>

			<CompartirRedes />

			<div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
				<Button asChild variant="outline" onClick={() => limpiar()}>
					<Link to="/">Volver al inicio</Link>
				</Button>
				<Button type="button" variant="ghost" onClick={() => setDeclino(false)}>
					Cambié de opinión
				</Button>
			</div>
		</div>
	)
}

export default PantallaGracias
