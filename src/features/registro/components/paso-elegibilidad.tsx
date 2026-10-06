import { useMemo, useState } from "react"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useFetch } from "@/hooks/useFetch"
import { usePost } from "@/hooks/usePost"
import { useRegistroStore } from "@/stores/registroStore"
import type {
	CuestionarioElegibilidad,
	PreguntaElegibilidad,
	RespuestaElegibilidad,
} from "@/types/api"
import { ErrorSummary } from "./error-summary"
import { ResultadoNoApto } from "./resultado-no-apto"
import { SiNoBotones } from "./si-no-botones"

/**
 * Cuestionario de elegibilidad.
 *
 * Las preguntas se renderizan desde `GET /donadores/elegibilidad/cuestionario`,
 * no desde una lista en el front: los criterios clínicos van a cambiar tras la
 * validación médica, y no debe hacer falta redesplegar la SPA para eso.
 */
export function PasoElegibilidad({ portal }: { portal?: { alTerminar: () => void } } = {}) {
	const { donadorId, elegibilidad, setElegibilidad, setPaso } = useRegistroStore()
	const [respuestas, setRespuestas] = useState<Record<string, boolean>>({})
	const [fechas, setFechas] = useState<Record<string, string>>({})
	const [faltantes, setFaltantes] = useState<string[]>([])

	const { response: cuestionario, loading } = useFetch<CuestionarioElegibilidad>({
		url: ENDPOINTS.cuestionario,
	})

	const demo = __DEMO__
	const { execute, loading: enviando, error } = usePost<RespuestaElegibilidad>()
	const apiError = error as ApiError | null

	const preguntas = useMemo(() => cuestionario?.preguntas ?? [], [cuestionario])

	// Se agrupa conservando el orden en que llega del servidor: 24 preguntas
	// seguidas se leen como un muro, y los títulos del documento de criterios
	// son justamente lo que les da sentido.
	const grupos = useMemo(() => {
		const mapa = new Map<string, PreguntaElegibilidad[]>()
		for (const pregunta of preguntas) {
			const lista = mapa.get(pregunta.seccion)
			if (lista) lista.push(pregunta)
			else mapa.set(pregunta.seccion, [pregunta])
		}
		return [...mapa.entries()]
	}, [preguntas])

	const hayPorConfirmar = preguntas.some((pregunta) => pregunta.porConfirmar)

	const responder = (clave: string, valor: boolean) => {
		setRespuestas((previo) => ({ ...previo, [clave]: valor }))
		setFaltantes((previo) => previo.filter((c) => c !== clave))
		// Si cambia a "no", la fecha del evento deja de tener sentido.
		if (!valor) setFechas((previo) => ({ ...previo, [clave]: "" }))
	}

	const enviar = async (event: React.FormEvent) => {
		event.preventDefault()

		const sinResponder = preguntas
			.filter((p) => typeof respuestas[p.clave] !== "boolean")
			.map((p) => p.clave)

		// En demostración no se retiene a nadie por dejar preguntas en blanco: se
		// está enseñando el recorrido, no evaluando a un donador.
		if (sinResponder.length > 0 && !demo) {
			setFaltantes(sinResponder)
			// Llevar el foco a la primera sin responder: en un cuestionario de 12
			// preguntas, decir "falta una" sin señalar cuál no ayuda a nadie.
			document.getElementById(`pregunta-${sinResponder[0]}`)?.scrollIntoView({ block: "center" })
			return
		}

		const fechasLimpias = Object.fromEntries(
			Object.entries(fechas).filter(([, valor]) => valor.length > 0),
		)

		try {
			// En el portal el donador sale de la sesión, nunca del cliente.
			const resultado = await execute({
				url: portal ? ENDPOINTS.portalElegibilidad : ENDPOINTS.elegibilidad,
				body: portal
					? { respuestas, fechas_evento: fechasLimpias }
					: { donador_id: donadorId, respuestas, fechas_evento: fechasLimpias },
			})
			if (portal) {
				portal.alTerminar()
				return
			}
			setElegibilidad({
				resultado: resultado.resultado,
				motivos: resultado.motivos,
				bloqueado_hasta: resultado.bloqueado_hasta,
			})
			// Solo quien resulta apto avanza a agendar su cita. A quien queda
			// diferido o descartado no se le manda a otro paso: este mismo
			// componente muestra el resultado a continuación, porque pedirle
			// que agende una cita o firme su ingreso a un registro del que ya
			// quedó fuera no tendría sentido.
			if (resultado.resultado === "apto") setPaso(4)
		} catch {
			// Se muestra en ErrorSummary.
		}
	}

	// Ya hay un resultado y no es "apto": se queda en este paso mostrando por
	// qué, en vez de navegar a uno aparte.
	if (!portal && elegibilidad && elegibilidad.resultado !== "apto") {
		return <ResultadoNoApto />
	}

	if (loading) {
		return <p className="text-muted-foreground py-12 text-center">Cargando cuestionario…</p>
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Algunas preguntas sobre su salud</h2>
				<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
					Sus respuestas son confidenciales y sirven para determinar si puede donar con seguridad,
					tanto para usted como para quien reciba el trasplante. Responda todas con honestidad.
				</p>
			</div>

			<ErrorSummary
				// Con preguntas pendientes el foco ya va a la primera sin responder; y
				// el contador baja con cada respuesta, sin que deba mover la pantalla.
				enfocar={faltantes.length === 0}
				mensaje={
					faltantes.length > 0
						? `Falta responder ${faltantes.length} ${faltantes.length === 1 ? "pregunta" : "preguntas"}`
						: apiError?.message
				}
			/>

			<form onSubmit={enviar} noValidate className="space-y-1">
				{grupos.map(([seccion, delGrupo]) => (
					<section key={seccion} className="pt-6 first:pt-0">
						<h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
							{seccion}
						</h3>

						{delGrupo.map((pregunta) => {
							const indice = preguntas.indexOf(pregunta)
							const respondida = respuestas[pregunta.clave]
							const falta = faltantes.includes(pregunta.clave)

							return (
								<div key={pregunta.clave}>
									{indice > 0 && <Separator className="my-1" />}
									<fieldset
										id={`pregunta-${pregunta.clave}`}
										className={`rounded-lg p-4 ${falta ? "bg-destructive/5 ring-destructive/30 ring-1" : ""}`}
									>
										<legend className="sr-only">{pregunta.texto}</legend>
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
											<p className="text-sm leading-relaxed">
												<span className="text-muted-foreground mr-2 tabular-nums">
													{indice + 1}.
												</span>
												{pregunta.texto}
												{/* Marca de revisión pendiente. El asterisco es una señal
												    aparte del color: quien no distingue el verde lo ve
												    igual, y el texto oculto lo dice para lectores de
												    pantalla (WCAG 1.4.1). */}
												{pregunta.porConfirmar && (
													<>
														<span aria-hidden className="text-success ml-1 font-bold">
															*
														</span>
														<span className="sr-only"> (pendiente de validación clínica)</span>
													</>
												)}
											</p>

											<SiNoBotones
												idBase={pregunta.clave}
												value={respondida}
												onChange={(valor) => responder(pregunta.clave, valor)}
												aria-label={pregunta.texto}
											/>
										</div>

										{/* La fecha solo aparece cuando hace falta: pedirla siempre
										    llenaría el formulario de campos irrelevantes. */}
										{pregunta.requiereFecha && respondida === true && (
											<div className="mt-4 max-w-xs space-y-1.5">
												<Label htmlFor={`fecha-${pregunta.clave}`} className="text-sm">
													¿En qué fecha ocurrió?
													<span className="text-destructive" aria-label="obligatorio">
														*
													</span>
												</Label>
												<Input
													id={`fecha-${pregunta.clave}`}
													type="date"
													max={new Date().toISOString().slice(0, 10)}
													value={fechas[pregunta.clave] ?? ""}
													onChange={(e) =>
														setFechas((previo) => ({
															...previo,
															[pregunta.clave]: e.target.value,
														}))
													}
													aria-describedby={`fecha-${pregunta.clave}-ayuda`}
												/>
												<p
													id={`fecha-${pregunta.clave}-ayuda`}
													className="text-muted-foreground text-xs"
												>
													La usamos para calcular desde cuándo podría donar.
												</p>
											</div>
										)}
									</fieldset>
								</div>
							)
						})}
					</section>
				))}

				{hayPorConfirmar && (
					<p className="text-muted-foreground border-border/60 mt-6 border-t pt-4 text-xs leading-relaxed">
						<span aria-hidden className="text-success font-bold">
							*
						</span>{" "}
						Criterio que no aparece en el documento de elegibilidad entregado por Red Vida y que
						espera confirmación del área médica.
					</p>
				)}

				<div className="flex justify-end pt-6">
					<Button type="submit" size="lg" disabled={enviando}>
						{enviando ? "Enviando…" : "Enviar respuestas"}
					</Button>
				</div>
			</form>
		</div>
	)
}

export default PasoElegibilidad
