import fetchApi from "@/api/fetchApi"
import { ENDPOINTS } from "@/api/config"
import { useRegistroStore } from "@/stores/registroStore"
import { SelectorCita } from "./selector-cita"

/**
 * Paso 4 — Cita para la toma de muestra.
 *
 * A diferencia de una donación de sangre, aquí solo hace falta **una**
 * muestra para obtener el perfil HLA: no es una cita que la persona vaya a
 * repetir. El texto lo dice explícitamente para que nadie llegue pensando
 * que esto es el primero de varios trámites.
 */
export function PasoCita() {
	const { setCita, donadorId } = useRegistroStore()

	const confirmar = async (fecha: string, hora: string) => {
		if (!donadorId) {
			throw new Error(
				"No encontramos su registro en esta sesión. Vuelva al inicio del registro e inténtelo de nuevo.",
			)
		}
		await fetchApi.post(ENDPOINTS.citas, { donador_id: donadorId, fecha, hora })
		setCita({ fecha, hora })
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Agende su cita para la toma de muestra</h2>
				<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
					Solo necesitamos una muestra —un hisopado de mejilla— para obtener su perfil genético
					(HLA) y poder buscar coincidencias con pacientes. No es como donar sangre: es una sola
					cita, no un compromiso recurrente.
				</p>
			</div>
			<SelectorCita alConfirmar={confirmar} />
		</div>
	)
}

export default PasoCita
