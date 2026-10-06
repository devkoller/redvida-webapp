import { AlertTriangle, Eye, Search } from "lucide-react"
import { useState } from "react"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { usePost } from "@/hooks/usePost"
import { usePermission } from "@/stores/sessionStore"
import { DialogoRevelar } from "./components/dialogo-revelar"
import { MatrizCoincidencia } from "./components/matriz-coincidencia"
import {
	LOCI_POR_CRITERIO,
	type CriterioBusqueda,
	type RespuestaBusqueda,
} from "./data/schema"

/**
 * Búsqueda de compatibilidad HLA.
 *
 * La pantalla insiste en una idea: **el resultado no es una respuesta, es una
 * lista ordenada para que el equipo clínico decida**. Por eso el aviso de
 * apoyo a la decisión está siempre visible y los resultados a baja resolución
 * se marcan como potenciales sin excepción.
 */
export function CompatibilidadPage() {
	const [criterio, setCriterio] = useState<CriterioBusqueda>("10/10")
	const [alelos, setAlelos] = useState<Record<string, [string, string]>>({})
	const [puntajeMinimo, setPuntajeMinimo] = useState("8")
	const [referenciaCaso, setReferenciaCaso] = useState("")
	const [revelando, setRevelando] = useState<string | null>(null)
	const puedeRevelar = usePermission("donador:reveal")

	const { execute, response, loading, error } = usePost<RespuestaBusqueda>()
	const apiError = error as ApiError | null
	const loci = LOCI_POR_CRITERIO[criterio]

	const cambiarAlelo = (locus: string, indice: 0 | 1, valor: string) => {
		setAlelos((previo) => {
			const par = previo[locus] ?? ["", ""]
			const nuevo: [string, string] = [...par] as [string, string]
			nuevo[indice] = valor
			return { ...previo, [locus]: nuevo }
		})
	}

	const buscar = async (evento: React.FormEvent) => {
		evento.preventDefault()

		const hlaPaciente: Record<string, string[]> = {}
		for (const locus of loci) {
			const par = (alelos[locus] ?? ["", ""]).map((v) => v.trim()).filter(Boolean)
			if (par.length > 0) hlaPaciente[locus] = par
		}

		try {
			await execute({
				url: ENDPOINTS.buscarCompatibilidad,
				body: {
					hla_paciente: hlaPaciente,
					criterio,
					puntaje_minimo: Number(puntajeMinimo) || 0,
					referencia_caso: referenciaCaso.trim() || null,
				},
			})
		} catch {
			// Se muestra abajo.
		}
	}

	const maximo = loci.length * 2

	return (
		<div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
			<header className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
					Búsqueda de compatibilidad
				</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Capture el perfil HLA del paciente. Los resultados se ordenan por grado de coincidencia.
				</p>
			</header>

			{/* El aviso va arriba y siempre visible, no al pie de los resultados. */}
			<div className="border-warning/40 bg-warning/10 mb-8 flex gap-3 rounded-lg border p-4">
				<AlertTriangle aria-hidden className="text-warning mt-0.5 size-5 shrink-0" />
				<p className="text-sm leading-relaxed">
					<strong>Herramienta de apoyo a la decisión.</strong> El resultado es una lista ordenada de
					candidatos con el detalle de cada discordancia, no un dictamen de compatibilidad. La
					decisión clínica corresponde al equipo médico.
				</p>
			</div>

			<form onSubmit={buscar} className="space-y-6">
				<Card>
					<CardContent className="space-y-5 p-5 sm:p-6">
						<div className="grid gap-4 sm:grid-cols-3">
							<div className="space-y-1.5">
								<Label htmlFor="criterio">Criterio</Label>
								<Select
									value={criterio}
									onValueChange={(valor) => setCriterio(valor as CriterioBusqueda)}
								>
									<SelectTrigger id="criterio" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="8/8">8/8 — A, B, C, DRB1</SelectItem>
										<SelectItem value="10/10">10/10 — estándar de referencia</SelectItem>
										<SelectItem value="12/12">12/12 — incluye DPB1</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="puntaje">Puntaje mínimo</Label>
								<Input
									id="puntaje"
									type="number"
									min={0}
									max={maximo}
									value={puntajeMinimo}
									onChange={(e) => setPuntajeMinimo(e.target.value)}
									aria-describedby="puntaje-ayuda"
								/>
								<p id="puntaje-ayuda" className="text-muted-foreground text-xs">
									De 0 a {maximo}. Con {maximo - 2} se incluyen los {maximo - 1}/{maximo}.
								</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="referencia">Referencia del caso</Label>
								<Input
									id="referencia"
									value={referenciaCaso}
									onChange={(e) => setReferenciaCaso(e.target.value)}
									placeholder="Folio interno"
								/>
							</div>
						</div>

						<fieldset className="space-y-3">
							<legend className="text-sm font-medium">Perfil HLA del paciente</legend>
							<p className="text-muted-foreground text-xs">
								Formato de dos campos, por ejemplo <code className="font-mono">02:01</code>. Un solo
								alelo se interpreta como homocigoto.
							</p>

							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{loci.map((locus) => (
									<div key={locus} className="space-y-1.5">
										<Label htmlFor={`${locus}-1`}>HLA-{locus}</Label>
										<div className="flex gap-2">
											<Input
												id={`${locus}-1`}
												placeholder="02:01"
												className="font-mono"
												value={alelos[locus]?.[0] ?? ""}
												onChange={(e) => cambiarAlelo(locus, 0, e.target.value)}
												aria-label={`HLA-${locus} primer alelo`}
											/>
											<Input
												placeholder="11:01"
												className="font-mono"
												value={alelos[locus]?.[1] ?? ""}
												onChange={(e) => cambiarAlelo(locus, 1, e.target.value)}
												aria-label={`HLA-${locus} segundo alelo`}
											/>
										</div>
									</div>
								))}
							</div>
						</fieldset>

						{apiError && (
							<div role="alert" className="border-destructive/40 bg-destructive/5 rounded-lg border p-3">
								<p className="text-destructive text-sm">{apiError.message}</p>
							</div>
						)}

						<div className="flex justify-end">
							<Button type="submit" size="lg" disabled={loading}>
								<Search className="size-4" />
								{loading ? "Buscando…" : "Buscar donadores"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</form>

			{/* ------------------------------------------------------------ Resultados */}
			{response && (
				<section className="mt-8 space-y-4">
					<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
						<h2 className="text-lg font-semibold">
							{response.total_resultados}{" "}
							{response.total_resultados === 1 ? "candidato" : "candidatos"}
						</h2>
						<p className="text-muted-foreground text-sm">
							{response.donadores_evaluados} donadores evaluados · {response.duracion_ms} ms
						</p>
					</div>

					{response.resultados.length === 0 ? (
						<Card>
							<CardContent className="p-8 text-center">
								<p className="font-medium">Ningún donador alcanza el puntaje mínimo</p>
								<p className="text-muted-foreground mt-1.5 text-sm">
									Puede bajar el puntaje mínimo o cambiar a un criterio menos estricto.
								</p>
							</CardContent>
						</Card>
					) : (
						response.resultados.map((resultado) => (
							<Card key={resultado.codigo_registro}>
								<CardContent className="space-y-4 p-5">
									<div className="flex flex-wrap items-center gap-3">
										<code className="text-primary-accent font-mono text-sm font-bold">
											{resultado.codigo_registro}
										</code>
										<Badge
											variant="outline"
											className={
												resultado.puntaje === resultado.maximo
													? "border-success/40 bg-success/10 text-success font-semibold"
													: "font-semibold"
											}
										>
											{resultado.grado}
										</Badge>
										{resultado.edad_donador != null && (
											<span className="text-muted-foreground text-sm">
												{resultado.edad_donador} años
											</span>
										)}
										{resultado.requiere_confirmacion && (
											<Badge variant="outline" className="border-warning/50 bg-warning/10">
												<AlertTriangle className="size-3" />
												Requiere retipificación confirmatoria
											</Badge>
										)}
										{/* Sin `donador:reveal` el botón ni se muestra. El backend lo
										    deniega y lo audita igualmente, pero ofrecer una acción que
										    se sabe denegada solo invita a intentarla. */}
										{puedeRevelar && (
											<Button
												variant="outline"
												size="sm"
												className="ml-auto"
												onClick={() => setRevelando(resultado.codigo_registro)}
											>
												<Eye className="size-4" />
												Revelar identidad
											</Button>
										)}
									</div>

									<MatrizCoincidencia detalle={resultado.detalle} />

									{resultado.detalle.some((locus) => locus.mismatch) && (
										<ul className="text-muted-foreground space-y-0.5 text-xs">
											{resultado.detalle
												.filter((locus) => locus.mismatch)
												.map((locus) => (
													<li key={locus.locus}>
														<strong className="text-foreground">{locus.locus}</strong>: paciente{" "}
														<span className="font-mono">{locus.mismatch!.paciente}</span> vs donador{" "}
														<span className="font-mono">{locus.mismatch!.donador}</span>
													</li>
												))}
										</ul>
									)}
								</CardContent>
							</Card>
						))
					)}
				</section>
			)}

			{revelando && response && (
				<DialogoRevelar
					codigoRegistro={revelando}
					busquedaId={response.busqueda_id}
					onCerrar={() => setRevelando(null)}
				/>
			)}
		</div>
	)
}

export default CompatibilidadPage
