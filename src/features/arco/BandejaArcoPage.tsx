import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2, ShieldOff } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ApiError } from "@/api/fetchApi"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { usePermission } from "@/stores/sessionStore"
import {
	ETIQUETA_ESTATUS,
	ETIQUETA_TIPO,
	type Semaforo,
	type SolicitudBandeja,
	listarBandeja,
	resolverSolicitud,
	resumenBandeja,
	revocar,
} from "./api"

/** El color no es el único indicador: cada estado lleva texto (WCAG 1.4.1). */
const SEMAFORO: Record<Semaforo, { texto: string; clase: string }> = {
	verde: { texto: "En plazo", clase: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" },
	ambar: { texto: "Por vencer", clase: "border-amber-500/40 bg-amber-500/10 text-amber-600" },
	rojo: { texto: "Vencida", clase: "border-destructive/40 bg-destructive/10 text-destructive" },
	cerrada: { texto: "Cerrada", clase: "border-muted-foreground/30 text-muted-foreground" },
}

export function BandejaArcoPage() {
	const [soloAbiertas, setSoloAbiertas] = useState(true)
	const [detalle, setDetalle] = useState<SolicitudBandeja | null>(null)
	const puedeResolver = usePermission("arco:resolve")

	const { data: resumen } = useQuery({
		queryKey: ["arco", "resumen"],
		queryFn: resumenBandeja,
	})

	const { data, isLoading } = useQuery({
		queryKey: ["arco", "bandeja", soloAbiertas],
		queryFn: () => listarBandeja({ abiertas: soloAbiertas }),
	})

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			<h1 className="text-3xl font-bold tracking-tight">Solicitudes de derechos ARCO</h1>
			<p className="text-muted-foreground mt-2">
				Cada solicitud tiene un plazo legal de respuesta. Vencerlo es una infracción, no un
				retraso.
			</p>

			{resumen?.requiere_atencion && (
				<div
					role="alert"
					className="border-destructive/40 bg-destructive/10 text-destructive mt-6 flex items-start gap-3 rounded-lg border p-4"
				>
					<AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
					<p className="text-sm">
						{resumen.rojo > 0 && (
							<strong>
								{resumen.rojo} solicitud{resumen.rojo === 1 ? "" : "es"} con el plazo vencido.{" "}
							</strong>
						)}
						{resumen.ambar > 0 &&
							`${resumen.ambar} vence${resumen.ambar === 1 ? "" : "n"} en tres días o menos.`}
					</p>
				</div>
			)}

			<div className="mt-6 flex items-center gap-3">
				<Button
					variant={soloAbiertas ? "default" : "outline"}
					size="sm"
					onClick={() => setSoloAbiertas(true)}
				>
					Abiertas {resumen ? `(${resumen.abiertas})` : ""}
				</Button>
				<Button
					variant={soloAbiertas ? "outline" : "default"}
					size="sm"
					onClick={() => setSoloAbiertas(false)}
				>
					Todas
				</Button>
			</div>

			<Card className="mt-4">
				<CardContent className="p-0">
					{isLoading ? (
						<p className="text-muted-foreground p-8 text-center text-sm">Cargando…</p>
					) : !data?.solicitudes.length ? (
						<p className="text-muted-foreground p-8 text-center text-sm">
							No hay solicitudes {soloAbiertas ? "abiertas" : "registradas"}.
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Folio</TableHead>
										<TableHead>Derecho</TableHead>
										<TableHead>Solicitante</TableHead>
										<TableHead>Estado</TableHead>
										<TableHead>Vence</TableHead>
										<TableHead>Plazo</TableHead>
										<TableHead className="text-right">Acción</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.solicitudes.map((solicitud) => (
										<TableRow key={solicitud.id}>
											<TableCell className="font-mono text-xs">{solicitud.folio}</TableCell>
											<TableCell>{ETIQUETA_TIPO[solicitud.tipo]}</TableCell>
											<TableCell>
												<span className="block">{solicitud.solicitante_nombre}</span>
												<span className="text-muted-foreground block text-xs">
													{solicitud.vinculada ? "Expediente vinculado" : "Sin vincular"}
												</span>
											</TableCell>
											<TableCell>{ETIQUETA_ESTATUS[solicitud.estatus]}</TableCell>
											<TableCell className="whitespace-nowrap">
												{solicitud.fecha_limite_respuesta}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={SEMAFORO[solicitud.semaforo].clase}>
													{SEMAFORO[solicitud.semaforo].texto}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												{puedeResolver && solicitud.semaforo !== "cerrada" && (
													<Button variant="outline" size="sm" onClick={() => setDetalle(solicitud)}>
														Atender
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{detalle && <PanelResolucion solicitud={detalle} alCerrar={() => setDetalle(null)} />}
		</div>
	)
}

function PanelResolucion({
	solicitud,
	alCerrar,
}: {
	solicitud: SolicitudBandeja
	alCerrar: () => void
}) {
	const queryClient = useQueryClient()
	const [respuesta, setRespuesta] = useState("")
	const [codigo, setCodigo] = useState("")
	const [confirmacion, setConfirmacion] = useState("")

	const esRevocacion = solicitud.tipo === "revocacion"

	const invalidar = () => {
		queryClient.invalidateQueries({ queryKey: ["arco"] })
		// El padrón y el tablero cambian tras una revocación.
		queryClient.invalidateQueries({ queryKey: ["dashboard"] })
		queryClient.invalidateQueries({ queryKey: ["donadores"] })
	}

	const resolver = useMutation({
		mutationFn: (estatus: "atendida" | "improcedente" | "en_analisis") =>
			resolverSolicitud(solicitud.id, {
				estatus,
				respuesta: respuesta.trim() || undefined,
				codigo_registro: codigo.trim() || undefined,
			}),
		onSuccess: () => {
			toast.success("Solicitud actualizada")
			invalidar()
			alCerrar()
		},
		onError: (error) =>
			toast.error(error instanceof ApiError ? error.message : "No fue posible actualizar"),
	})

	const ejecutarRevocacion = useMutation({
		mutationFn: () => revocar(solicitud.id, { alcance: "total", motivo: respuesta.trim() || undefined }),
		onSuccess: () => {
			toast.success("Revocación procesada. El donador salió de las búsquedas")
			invalidar()
			alCerrar()
		},
		onError: (error) =>
			toast.error(error instanceof ApiError ? error.message : "No fue posible revocar"),
	})

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-resolucion"
		>
			<Card className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto">
				<CardContent className="space-y-5 pt-6">
					<div>
						<h2 id="titulo-resolucion" className="text-xl font-semibold">
							{ETIQUETA_TIPO[solicitud.tipo]} · {solicitud.folio}
						</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							{solicitud.solicitante_nombre} · {solicitud.solicitante_email}
						</p>
					</div>

					{!solicitud.vinculada && (
						<div className="space-y-2 rounded-lg border p-4">
							<Label htmlFor="codigo-vincular" className="block">
								Vincular con un expediente
							</Label>
							<Input
								id="codigo-vincular"
								value={codigo}
								onChange={(e) => setCodigo(e.target.value)}
								placeholder="RVMX-…"
								className="font-mono"
							/>
							<p className="text-muted-foreground text-xs">
								Vincule solo después de haber acreditado que quien solicita es la persona
								titular. Es el paso que impide que alguien dé de baja a un tercero.
							</p>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="respuesta" className="block">
							{esRevocacion ? "Motivo y constancia" : "Respuesta al titular"}
						</Label>
						<textarea
							id="respuesta"
							rows={4}
							value={respuesta}
							onChange={(e) => setRespuesta(e.target.value)}
							className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
						/>
						<p className="text-muted-foreground text-xs">
							Se le envía por correo al titular y queda en el expediente.
						</p>
					</div>

					{esRevocacion && (
						<div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-lg border p-4">
							<div className="flex items-start gap-2">
								<ShieldOff className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
								<div className="text-sm">
									<p className="font-medium">Esto da de baja al donador de forma inmediata</p>
									<p className="text-muted-foreground mt-1">
										Su perfil HLA sale de todas las búsquedas de compatibilidad. La acción no se
										deshace desde el panel.
									</p>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="confirmar-revocacion" className="block text-sm">
									Escriba <strong>REVOCAR</strong> para confirmar
								</Label>
								<Input
									id="confirmar-revocacion"
									value={confirmacion}
									onChange={(e) => setConfirmacion(e.target.value)}
									autoComplete="off"
								/>
							</div>
						</div>
					)}

					<div className="flex flex-wrap justify-end gap-2">
						<Button variant="ghost" onClick={alCerrar}>
							Cancelar
						</Button>
						<Button
							variant="outline"
							onClick={() => resolver.mutate("en_analisis")}
							disabled={resolver.isPending}
						>
							Marcar en análisis
						</Button>
						<Button
							variant="outline"
							onClick={() => resolver.mutate("improcedente")}
							disabled={resolver.isPending || !respuesta.trim()}
						>
							Declarar improcedente
						</Button>
						{esRevocacion ? (
							<Button
								variant="destructive"
								onClick={() => ejecutarRevocacion.mutate()}
								disabled={ejecutarRevocacion.isPending || confirmacion !== "REVOCAR"}
							>
								{ejecutarRevocacion.isPending && (
									<Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
								)}
								Procesar revocación
							</Button>
						) : (
							<Button
								onClick={() => resolver.mutate("atendida")}
								disabled={resolver.isPending || !respuesta.trim()}
							>
								Marcar como atendida
							</Button>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
