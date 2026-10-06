import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, FlaskConical, Loader2, ShieldAlert, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import fetchApi, { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface Politica {
	id: number
	entidad: string
	descripcion: string
	periodo_meses: number
	accion_al_vencer: "bloquear" | "suprimir" | "anonimizar"
	fundamento_legal: string | null
	fundamento_confirmado: boolean
	activo: boolean
	candidatos: number
	ultima_ejecucion: string | null
}

interface Simulacion {
	simulacion_id: string
	politica: {
		id: number
		entidad: string
		descripcion: string
		periodo_meses: number
		accion: string
		fundamento_legal: string | null
		fundamento_confirmado: boolean
	}
	huella: string
	total_afectados: number
	muestra: { id: string; etiqueta: string }[]
	muestra_truncada: boolean
	aplicable: boolean
	impedimento: string | null
}

interface Ejecucion {
	id: string
	entidad: string
	accion: string
	simulacion: boolean
	total_afectados: number
	simulacion_id: string | null
	usuario_nombre: string | null
	createdAt: string
}

const ETIQUETA_ACCION: Record<string, string> = {
	bloquear: "Bloquear",
	suprimir: "Suprimir",
	anonimizar: "Anonimizar",
}

export function RetencionPage() {
	const queryClient = useQueryClient()
	const [simulacion, setSimulacion] = useState<Simulacion | null>(null)
	const [confirmacion, setConfirmacion] = useState("")

	const { data: politicas, isLoading } = useQuery({
		queryKey: ["retencion", "politicas"],
		queryFn: () => fetchApi.get<Politica[]>(ENDPOINTS.retencionPoliticas),
	})

	const { data: historial } = useQuery({
		queryKey: ["retencion", "historial"],
		queryFn: () => fetchApi.get<Ejecucion[]>(ENDPOINTS.retencionHistorial),
	})

	const simular = useMutation({
		mutationFn: (politicaId: number) =>
			fetchApi.post<Simulacion>(ENDPOINTS.retencionSimular(politicaId)),
		onSuccess: (datos) => {
			setSimulacion(datos)
			setConfirmacion("")
			queryClient.invalidateQueries({ queryKey: ["retencion", "historial"] })
		},
		onError: (error) =>
			toast.error(error instanceof ApiError ? error.message : "No fue posible simular"),
	})

	const aplicar = useMutation({
		mutationFn: (simulacionId: string) =>
			fetchApi.post<{ politica: string; accion: string; afectados: number }>(
				ENDPOINTS.retencionAplicar,
				{ simulacion_id: Number(simulacionId) },
			),
		onSuccess: (datos) => {
			toast.success(
				`${ETIQUETA_ACCION[datos.accion] ?? datos.accion}: ${datos.afectados} registros de ${datos.politica}`,
			)
			setSimulacion(null)
			queryClient.invalidateQueries({ queryKey: ["retencion"] })
		},
		onError: (error) =>
			toast.error(error instanceof ApiError ? error.message : "No fue posible aplicar", {
				duration: 8000,
			}),
	})

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<h1 className="text-3xl font-bold tracking-tight">Retención del dato</h1>
			<p className="text-muted-foreground mt-2">
				Cuánto tiempo se conserva cada tipo de dato y qué se hace al vencer el plazo. Nada se
				aplica sin simularlo antes.
			</p>

			<h2 className="mt-8 text-lg font-semibold">Políticas</h2>
			<div className="mt-3 space-y-3">
				{isLoading && <p className="text-muted-foreground text-sm">Cargando…</p>}
				{politicas?.map((politica) => (
					<Card key={politica.id}>
						<CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="font-medium">{politica.descripcion}</h3>
									<Badge variant="outline">{ETIQUETA_ACCION[politica.accion_al_vencer]}</Badge>
									{!politica.fundamento_confirmado && (
										<Badge
											variant="outline"
											className="border-amber-500/40 bg-amber-500/10 text-amber-600"
										>
											Fundamento por definir
										</Badge>
									)}
								</div>
								<p className="text-muted-foreground mt-1 font-mono text-xs">{politica.entidad}</p>
								<p className="text-muted-foreground mt-2 text-sm">
									Se conserva {politica.periodo_meses} meses · {politica.candidatos} registro
									{politica.candidatos === 1 ? "" : "s"} con el plazo vencido
									{politica.ultima_ejecucion &&
										` · última corrida ${new Date(politica.ultima_ejecucion).toLocaleDateString("es-MX")}`}
								</p>
								{politica.fundamento_legal && (
									<p className="text-muted-foreground mt-1 text-xs">
										Fundamento: {politica.fundamento_legal}
									</p>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => simular.mutate(politica.id)}
								disabled={simular.isPending || !politica.activo}
							>
								{simular.isPending && simular.variables === politica.id ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<FlaskConical className="size-4" aria-hidden="true" />
								)}
								Simular
							</Button>
						</CardContent>
					</Card>
				))}
			</div>

			{simulacion && (
				<>
					<Separator className="my-8" />
					<ResultadoSimulacion
						simulacion={simulacion}
						confirmacion={confirmacion}
						alConfirmar={setConfirmacion}
						alAplicar={() => aplicar.mutate(simulacion.simulacion_id)}
						aplicando={aplicar.isPending}
						alDescartar={() => setSimulacion(null)}
					/>
				</>
			)}

			<Separator className="my-8" />
			<h2 className="text-lg font-semibold">Historial de corridas</h2>
			<Card className="mt-3">
				<CardContent className="pt-6">
					{!historial?.length ? (
						<p className="text-muted-foreground text-sm">Todavía no se ha ejecutado ninguna.</p>
					) : (
						<ul className="space-y-2 text-sm">
							{historial.slice(0, 15).map((ejecucion) => (
								<li key={ejecucion.id} className="flex flex-wrap items-center gap-2">
									<Badge variant={ejecucion.simulacion ? "outline" : "default"}>
										{ejecucion.simulacion ? "Simulación" : "Aplicada"}
									</Badge>
									<span className="font-mono text-xs">{ejecucion.entidad}</span>
									<span className="text-muted-foreground">
										{ejecucion.total_afectados} registro
										{ejecucion.total_afectados === 1 ? "" : "s"}
									</span>
									{ejecucion.simulacion_id && (
										<span className="text-muted-foreground text-xs">
											← simulación #{ejecucion.simulacion_id}
										</span>
									)}
									<span className="text-muted-foreground ml-auto text-xs">
										{new Date(ejecucion.createdAt).toLocaleString("es-MX")}
										{ejecucion.usuario_nombre && ` · ${ejecucion.usuario_nombre}`}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function ResultadoSimulacion({
	simulacion,
	confirmacion,
	alConfirmar,
	alAplicar,
	aplicando,
	alDescartar,
}: {
	simulacion: Simulacion
	confirmacion: string
	alConfirmar: (valor: string) => void
	alAplicar: () => void
	aplicando: boolean
	alDescartar: () => void
}) {
	const palabra = simulacion.politica.accion.toUpperCase()
	const destructiva = simulacion.politica.accion !== "bloquear"

	return (
		<section aria-labelledby="titulo-simulacion">
			<h2 id="titulo-simulacion" className="text-lg font-semibold">
				Resultado de la simulación
			</h2>
			<p className="text-muted-foreground mt-1 text-sm">
				Esto es lo que ocurriría. Todavía no se ha modificado nada.
			</p>

			<Card className="mt-3">
				<CardContent className="space-y-4 pt-6">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="text-3xl font-bold">{simulacion.total_afectados}</span>
						<span className="text-muted-foreground">
							registros de <span className="font-mono">{simulacion.politica.entidad}</span> se
							van a <strong>{ETIQUETA_ACCION[simulacion.politica.accion]?.toLowerCase()}</strong>
						</span>
					</div>

					{simulacion.impedimento && (
						<div
							role="alert"
							className="border-amber-500/40 bg-amber-500/10 flex items-start gap-2 rounded-md border p-3 text-sm"
						>
							<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
							<span>{simulacion.impedimento}</span>
						</div>
					)}

					{!!simulacion.muestra.length && (
						<div>
							<p className="text-muted-foreground text-sm">
								Registros afectados
								{simulacion.muestra_truncada && " (primeros 50)"}
							</p>
							<ul className="bg-muted mt-2 max-h-64 overflow-y-auto rounded-md p-3 font-mono text-xs">
								{simulacion.muestra.map((item) => (
									<li key={item.id}>{item.etiqueta}</li>
								))}
							</ul>
						</div>
					)}

					{simulacion.aplicable && (
						<div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-4">
							<div className="flex items-start gap-2">
								<ShieldAlert className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
								<p className="text-sm">
									{destructiva
										? "Esta acción no se deshace. Revise la lista de arriba antes de continuar."
										: "Los registros quedarán bloqueados: dejan de tratarse, pero siguen existiendo."}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmar-retencion" className="block text-sm">
									Escriba <strong>{palabra}</strong> para confirmar
								</Label>
								<Input
									id="confirmar-retencion"
									value={confirmacion}
									onChange={(e) => alConfirmar(e.target.value)}
									autoComplete="off"
									className="max-w-xs"
								/>
							</div>
						</div>
					)}

					<div className="flex flex-wrap justify-end gap-2">
						<Button variant="ghost" onClick={alDescartar}>
							Descartar
						</Button>
						<Button
							variant="destructive"
							onClick={alAplicar}
							disabled={!simulacion.aplicable || aplicando || confirmacion !== palabra}
						>
							{aplicando ? (
								<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							) : (
								<Trash2 className="size-4" aria-hidden="true" />
							)}
							Aplicar a {simulacion.total_afectados} registros
						</Button>
					</div>
				</CardContent>
			</Card>
		</section>
	)
}
