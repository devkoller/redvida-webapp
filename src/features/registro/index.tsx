import { Link } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { PasoConsentimiento } from "@/features/consentimiento"
import { useRegistroStore } from "@/stores/registroStore"
import { PasoCita } from "./components/paso-cita"
import { PasoDatos } from "./components/paso-datos"
import { PasoElegibilidad } from "./components/paso-elegibilidad"
import { PantallaGracias } from "./components/pantalla-gracias"
import { PasoOtp } from "./components/paso-otp"
import { WizardStepper } from "./components/wizard-stepper"

/**
 * Wizard de registro de donador.
 *
 * El paso vive en un store en memoria, no en la URL ni en el almacenamiento del
 * navegador: recargar reinicia el registro (ver `registroStore`) y tampoco se
 * puede saltar un paso escribiendo una URL, que es lo que pasaría con rutas
 * por paso. Para retomar un trámite está el portal `/mi-cita`.
 */
export function RegistroPage() {
	const paso = useRegistroStore((estado) => estado.paso)
	const setPaso = useRegistroStore((estado) => estado.setPaso)
	const declino = useRegistroStore((estado) => estado.declino)
	const encabezado = useRef<HTMLHeadingElement>(null)

	// `__DEMO__` se usa directo, y no a través de una función: el minificador no
	// cruza la llamada, y con el literal a la vista puede eliminar la rama entera
	// —y con ella los datos de ejemplo— de la compilación de producción.
	const demo = __DEMO__

	// Al avanzar de paso hay que volver arriba y llevar el foco al encabezado.
	// Sin esto, quien viene del paso 1 —un formulario largo— aterriza en el
	// paso 2 con la vista a media página y cree que no pasó nada; y quien
	// navega con lector de pantalla se queda leyendo donde estaba, sin enterarse
	// de que el contenido cambió por completo.
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "instant" })
		encabezado.current?.focus()
	}, [paso, declino])

	return (
		<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
			{declino ? (
				<PantallaGracias />
			) : (
				<>
					<header className="mb-8">
						<h1
							ref={encabezado}
							tabIndex={-1}
							className="text-2xl font-bold tracking-tight outline-none sm:text-3xl"
						>
							Registro de donador voluntario
						</h1>
						<p className="text-muted-foreground mt-2 text-sm">
							Toma alrededor de tres minutos. Puede retirarse del registro cuando quiera.{" "}
							<Link to="/mi-cita" className="text-primary-accent underline underline-offset-2">
								¿Ya se registró? Administre su cita
							</Link>
						</p>
					</header>

					<div className="mb-10">
						{/* En demostración se puede saltar a cualquier paso: enseñar la
				    pantalla 4 no debería obligar a recorrer las tres anteriores. */}
						<WizardStepper pasoActual={paso} alElegirPaso={demo ? setPaso : undefined} />
					</div>

					{paso === 1 && <PasoDatos />}
					{paso === 2 && <PasoOtp />}
					{paso === 3 && <PasoElegibilidad />}
					{paso === 4 && <PasoCita />}
					{paso === 5 && <PasoConsentimiento />}
				</>
			)}
		</div>
	)
}

export default RegistroPage
