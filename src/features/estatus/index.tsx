import { Check, Circle, Search } from "lucide-react"
import { useState } from "react"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFetch } from "@/hooks/useFetch"
import { cn } from "@/lib/utils"
import type { EstatusDonador, EstatusRegistro } from "@/types/api"

/**
 * Etapas del recorrido del donador, en orden. Corresponden a los valores de
 * `rv_donador.estatus`; `suspendido` y `baja` se tratan aparte porque no son
 * un punto del recorrido sino una salida de él.
 */
const ETAPAS: { estatus: EstatusDonador; titulo: string; descripcion: string }[] = [
	{
		estatus: "pre_registro",
		titulo: "Registro recibido",
		descripcion: "Capturamos sus datos.",
	},
	{
		estatus: "verificado",
		titulo: "Correo verificado",
		descripcion: "Confirmó su dirección de correo electrónico.",
	},
	{
		estatus: "elegible",
		titulo: "Cuestionario aprobado",
		descripcion: "Cumple los criterios de salud para donar.",
	},
	{
		estatus: "tipificado",
		titulo: "Muestra analizada",
		descripcion: "El laboratorio determinó su perfil HLA.",
	},
	{
		estatus: "disponible",
		titulo: "Disponible en el registro",
		descripcion: "Su perfil participa en las búsquedas de compatibilidad.",
	},
]

const ORDEN: EstatusDonador[] = ETAPAS.map((etapa) => etapa.estatus)

const formatearFecha = (iso: string) =>
	new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })

export function EstatusPage() {
	const [codigo, setCodigo] = useState("")
	const [consultado, setConsultado] = useState<string | null>(null)

	const { response, loading, error } = useFetch<EstatusRegistro>({
		url: ENDPOINTS.estatusPorCodigo(consultado ?? ""),
		enabled: Boolean(consultado),
	})
	const apiError = error as ApiError | null

	const buscar = (event: React.FormEvent) => {
		event.preventDefault()
		const limpio = codigo.trim().toUpperCase()
		if (limpio.length > 0) setConsultado(limpio)
	}

	const indiceActual = response ? ORDEN.indexOf(response.estatus) : -1
	const fueraDelRecorrido =
		response?.estatus === "suspendido" || response?.estatus === "baja"

	return (
		<div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
			<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Consultar mi registro</h1>
			<p className="text-muted-foreground mt-2 text-sm">
				Capture el código que recibió al terminar su registro para ver en qué punto va.
			</p>

			<form onSubmit={buscar} noValidate className="mt-8 space-y-1.5">
				<Label htmlFor="codigo">Código de registro</Label>
				<div className="flex gap-2">
					<Input
						id="codigo"
						value={codigo}
						onChange={(e) => setCodigo(e.target.value.toUpperCase())}
						placeholder="RVMX-XXXXXXXXXXXX"
						className="font-mono"
						spellCheck={false}
						aria-describedby="codigo-ayuda"
					/>
					<Button type="submit" disabled={loading || codigo.trim().length === 0}>
						<Search className="size-4" />
						<span className="sr-only sm:not-sr-only">Consultar</span>
					</Button>
				</div>
				<p id="codigo-ayuda" className="text-muted-foreground text-xs">
					Empieza con <code>RVMX-</code> seguido de 12 caracteres.
				</p>
			</form>

			{loading && <p className="text-muted-foreground mt-8 text-sm">Consultando…</p>}

			{apiError && (
				<div
					role="alert"
					className="border-destructive/40 bg-destructive/5 mt-8 rounded-lg border p-4"
				>
					<p className="text-destructive text-sm font-medium">{apiError.message}</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Verifique que el código esté completo y correctamente capturado.
					</p>
				</div>
			)}

			{response && (
				<div className="mt-8 space-y-6">
					<Card>
						<CardContent className="p-5">
							<p className="text-muted-foreground text-sm">Código de registro</p>
							<p className="text-primary-accent mt-0.5 font-mono text-lg font-bold">
								{response.codigo_registro}
							</p>
							<p className="text-muted-foreground mt-3 text-sm">
								Registrado el {formatearFecha(response.fecha_registro)}
							</p>
						</CardContent>
					</Card>

					{fueraDelRecorrido ? (
						<Card>
							<CardContent className="p-5">
								<p className="font-medium">
									{response.estatus === "suspendido"
										? "Su registro está suspendido"
										: "Su registro fue dado de baja"}
								</p>
								<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
									{response.elegibilidad?.resultado === "no_apto_permanente"
										? "Según el cuestionario de salud, en este momento no es posible incorporarlo al registro de donadores."
										: "Si considera que se trata de un error, comuníquese con el equipo del registro."}
								</p>
							</CardContent>
						</Card>
					) : (
						<ol className="space-y-1">
							{ETAPAS.map((etapa, indice) => {
								const completada = indice <= indiceActual
								const actual = indice === indiceActual

								return (
									<li key={etapa.estatus} className="flex gap-4">
										<div className="flex flex-col items-center">
											<span
												aria-hidden
												className={cn(
													"grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
													completada
														? "bg-primary border-primary text-primary-foreground"
														: "border-border text-muted-foreground",
													actual && "ring-primary/25 ring-4",
												)}
											>
												{completada ? <Check className="size-4" /> : <Circle className="size-2.5" />}
											</span>
											{indice < ETAPAS.length - 1 && (
												<span
													aria-hidden
													className={cn(
														"my-1 w-0.5 flex-1",
														indice < indiceActual ? "bg-primary" : "bg-border",
													)}
												/>
											)}
										</div>

										<div className={cn("pb-6", !completada && "opacity-55")}>
											<p className="font-medium">
												{etapa.titulo}
												{actual && (
													<span className="bg-primary/10 text-primary-accent ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
														Actual
													</span>
												)}
											</p>
											<p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
												{etapa.descripcion}
											</p>
										</div>
									</li>
								)
							})}
						</ol>
					)}

					{response.elegibilidad?.resultado === "no_apto_temporal" &&
						response.elegibilidad.bloqueado_hasta && (
							<Card className="bg-muted/40 border-0">
								<CardContent className="p-5">
									<p className="text-sm font-medium">Diferimiento temporal</p>
									<p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
										Podrá continuar su registro a partir del{" "}
										<strong className="text-foreground">
											{formatearFecha(`${response.elegibilidad.bloqueado_hasta}T12:00:00Z`)}
										</strong>
										.
									</p>
								</CardContent>
							</Card>
						)}
				</div>
			)}
		</div>
	)
}

export default EstatusPage
