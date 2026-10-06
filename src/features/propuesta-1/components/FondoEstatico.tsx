/**
 * Respaldo estático de la escena · RV-L5.3
 *
 * Lo que ve quien pide menos movimiento, llega con un equipo modesto o no tiene
 * WebGL. **Tiene que verse intencional, no roto**: es la versión legítima de la
 * página para una parte real del público, no un hueco donde debería haber algo.
 *
 * Mismas dos figuras y la misma esfera, dibujadas de frente y quietas: el
 * momento exacto en que la luz va de una persona a la otra.
 */
export function FondoEstatico({ oculta = false }: { oculta?: boolean }) {
	return (
		<div
			className="capa capa-estatica grid place-items-center overflow-hidden"
			data-oculta={oculta ? "true" : undefined}
			aria-hidden="true"
		>
			<svg viewBox="0 0 900 520" className="h-full w-full opacity-90" role="presentation">
				<defs>
					<radialGradient id="rv-halo" cx="50%" cy="50%">
						<stop offset="0%" stopColor="#ffc98a" stopOpacity="0.95" />
						<stop offset="45%" stopColor="#ff9d5c" stopOpacity="0.35" />
						<stop offset="100%" stopColor="#ff9d5c" stopOpacity="0" />
					</radialGradient>
					<linearGradient id="rv-suelo" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#2a2733" stopOpacity="0.7" />
						<stop offset="100%" stopColor="#0b0a0d" stopOpacity="0" />
					</linearGradient>
				</defs>

				{/* Sin fondo propio: el color lo pone `<Ambiente>`, que queda por
				    detrás. Un rectángulo opaco aquí tapaba el campo de luz y dejaba
				    esta versión —la que ve quien pide menos movimiento— con el fondo
				    plano que se acaba de quitar. */}
				<ellipse cx="450" cy="470" rx="420" ry="60" fill="url(#rv-suelo)" />

				{/* Figura encendida */}
				<g stroke="#f4efe8" strokeWidth="13" strokeLinecap="round" fill="#f4efe8">
					<circle cx="235" cy="180" r="26" />
					<line x1="235" y1="212" x2="235" y2="315" />
					<line x1="235" y1="240" x2="192" y2="292" />
					<line x1="235" y1="240" x2="278" y2="292" />
					<line x1="235" y1="315" x2="205" y2="405" />
					<line x1="235" y1="315" x2="265" y2="405" />
				</g>

				{/* La esfera, a medio camino */}
				<circle cx="450" cy="250" r="120" fill="url(#rv-halo)" />
				<circle cx="450" cy="250" r="17" fill="#fff3e0" />

				{/* Figura apagada, encorvada */}
				<g stroke="#3a3740" strokeWidth="13" strokeLinecap="round" fill="#3a3740">
					<circle cx="672" cy="222" r="26" />
					<line x1="676" y1="252" x2="665" y2="330" />
					<line x1="674" y1="272" x2="712" y2="318" />
					<line x1="674" y1="272" x2="638" y2="322" />
					<line x1="665" y1="330" x2="645" y2="408" />
					<line x1="665" y1="330" x2="694" y2="405" />
				</g>
			</svg>
		</div>
	)
}

export default FondoEstatico
