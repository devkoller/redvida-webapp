/**
 * Pantalla de carga de la escena 3D · RV-L2.11 · RV-L2.12
 *
 * Antes, mientras `three` y el modelo llegaban por red, este hueco quedaba en
 * blanco —o dejaba ver la cabecera y el primer acto detrás del anillo, porque
 * vivía dentro del hueco del héroe en vez de por delante de la página entera.
 * En una conexión lenta eso podía durar segundos así.
 *
 * Ahora cubre la pantalla completa —`position: fixed` en el CSS— y es lo
 * único visible mientras existe: aparece en cuanto se sabe que habrá lienzo y
 * se retira, con el mismo cruce de opacidades que usan las demás capas, en
 * cuanto el modelo está listo y pintado.
 *
 * El color sale de `--primary`, así que sigue la paleta activa en vez de un
 * naranja fijo, igual que hace la esfera de la escena.
 */

const RADIO = 46
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export function CargaEscena({ progreso, oculta = false }: { progreso: number; oculta?: boolean }) {
	const clamped = Math.min(1, Math.max(0, progreso))
	const recorrido = CIRCUNFERENCIA * (1 - clamped)

	return (
		<div
			className="pantalla-carga bg-background grid place-items-center"
			data-oculta={oculta ? "true" : undefined}
			aria-hidden="true"
		>
			<div className="anillo-carga">
				<svg viewBox="0 0 100 100" width="132" height="132">
					<circle
						className="anillo-carga__pista"
						cx="50"
						cy="50"
						r={RADIO}
						fill="none"
						strokeWidth="3"
					/>
					<circle
						className="anillo-carga__trazo"
						cx="50"
						cy="50"
						r={RADIO}
						fill="none"
						strokeWidth="3"
						strokeLinecap="round"
						strokeDasharray={CIRCUNFERENCIA}
						strokeDashoffset={recorrido}
					/>
				</svg>
				<div className="anillo-carga__texto">
					<span className="anillo-carga__porcentaje">{Math.round(clamped * 100)}%</span>
					<span className="anillo-carga__leyenda">Cargando la escena</span>
				</div>
			</div>
		</div>
	)
}

export default CargaEscena
