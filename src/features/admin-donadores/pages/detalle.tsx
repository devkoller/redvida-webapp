import { useQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import axios from "axios"
import { Download, ShieldCheck, UserCog } from "lucide-react"
import { useState } from "react"

import { API_URL, ENDPOINTS } from "@/api/config"
import { DataItem, DataList } from "@/components/layout/DataList"
import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { usePermission } from "@/stores/sessionStore"
import { DialogoEstatus } from "../components/dialogo-estatus"
import { EliminarDonador } from "../components/eliminar-donador"
import { EstatusBadge } from "../components/estatus-badge"
import { edadDe, fechaLarga, nombreCompleto } from "../data/formato"
import type { DetalleDonador } from "../data/schema"

const ruta = getRouteApi("/admin/donadores/$codigo")

const SEMAFORO_OK = "bg-success text-success-foreground"

function Resumen({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
	return (
		<Card className="gap-2 py-4">
			<CardContent className="space-y-2">
				<p className="text-muted-foreground text-xs">{etiqueta}</p>
				<div className="flex min-h-8 items-center text-2xl font-semibold tabular-nums">
					{children}
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Detalle del donador. Solo lectura: lo único que modifica algo son los botones
 * del encabezado, y cada uno pide confirmación o motivo.
 */
export function DonadorDetallePage() {
	const { codigo } = ruta.useParams()
	const puedeEscribir = usePermission("donador:write")
	const puedeEliminar = usePermission("donador:delete")
	const [cambiandoEstatus, setCambiandoEstatus] = useState(false)

	const { data, isPending, isError, error, refetch } = useQuery<DetalleDonador>({
		queryKey: ["admin-donador", codigo],
		queryFn: async () => {
			const { data } = await axios.get(
				`${API_URL}${ENDPOINTS.adminDonadores}/${encodeURIComponent(codigo)}`,
			)
			return data.data
		},
		retry: false,
	})

	const breadcrumb = <BackLink to="/admin/donadores">Padrón de donadores</BackLink>

	if (isPending) {
		return (
			<PageShell>
				<PageHeader breadcrumb={breadcrumb} title={codigo} />
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
				<Skeleton className="h-96 rounded-xl" />
			</PageShell>
		)
	}

	if (isError) {
		const noExiste = axios.isAxiosError(error) && error.response?.status === 404
		return (
			<PageShell>
				<PageHeader breadcrumb={breadcrumb} title={codigo} />
				<Card>
					<CardContent>
						{noExiste ? (
							<EmptyState
								title="Este donador no existe"
								description="Puede que haya sido eliminado o que el código sea incorrecto."
							/>
						) : (
							<ErrorState onRetry={() => refetch()} />
						)}
					</CardContent>
				</Card>
			</PageShell>
		)
	}

	const { donador, elegibilidades, consentimientos, hla, muestras } = data
	const grupo = donador.grupo_sanguineo ? `${donador.grupo_sanguineo}${donador.rh ?? ""}` : null

	return (
		<PageShell>
			<PageHeader
				breadcrumb={breadcrumb}
				title={<span className="font-mono">{donador.codigo_registro}</span>}
				description={nombreCompleto(donador)}
				actions={
					<>
						{puedeEscribir && (
							<Button variant="outline" onClick={() => setCambiandoEstatus(true)}>
								<UserCog className="size-4" />
								Cambiar estatus
							</Button>
						)}
						{puedeEliminar && <EliminarDonador codigoRegistro={donador.codigo_registro} />}
					</>
				}
			/>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Resumen etiqueta="Estatus">
					<EstatusBadge estatus={donador.estatus} cicloDato={donador.ciclo_dato} />
				</Resumen>
				<Resumen etiqueta="Edad">{edadDe(donador.fecha_nacimiento)} años</Resumen>
				<Resumen etiqueta="Perfil HLA">
					{hla.perfiles.length > 0 ? `${hla.perfiles.length} loci` : "—"}
				</Resumen>
				<Resumen etiqueta="Grupo sanguíneo">{grupo ?? "—"}</Resumen>
			</div>

			<Tabs defaultValue="datos">
				<TabsList>
					<TabsTrigger value="datos">Datos</TabsTrigger>
					<TabsTrigger value="elegibilidad">Elegibilidad</TabsTrigger>
					<TabsTrigger value="consentimiento">Consentimiento</TabsTrigger>
					<TabsTrigger value="hla">HLA y muestras</TabsTrigger>
				</TabsList>

				{/* ------------------------------------------------------------- Datos */}
				<TabsContent value="datos" className="mt-4 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Identificación</CardTitle>
						</CardHeader>
						<CardContent>
							<DataList>
								<DataItem label="Nombre completo" span={6} value={nombreCompleto(donador)} />
								<DataItem label="CURP" span={6} mono value={donador.curp} />
								<DataItem
									label="Fecha de nacimiento"
									span={6}
									value={fechaLarga(donador.fecha_nacimiento)}
								/>
								<DataItem label="Registrado" span={6} value={fechaLarga(donador.createdAt)} />
							</DataList>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Contacto</CardTitle>
						</CardHeader>
						<CardContent>
							<DataList>
								<DataItem label="Correo" span={6} value={donador.email} />
								<DataItem
									label="Correo verificado"
									span={6}
									value={donador.email_verificado ? "Sí" : "No"}
								/>
								<DataItem label="Teléfono" span={6} value={donador.telefono} />
								<DataItem label="Celular" span={6} value={donador.celular} />
								<DataItem label="Domicilio" span={6} value={donador.direccion} />
								<DataItem label="Código postal" span={3} value={donador.codigo_postal} />
							</DataList>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Datos clínicos</CardTitle>
						</CardHeader>
						<CardContent>
							<DataList>
								<DataItem label="Grupo sanguíneo" span={3} value={grupo} />
								<DataItem
									label="Peso"
									span={3}
									value={donador.peso_kg ? `${donador.peso_kg} kg` : null}
								/>
								<DataItem label="Serología CMV" span={6} value={donador.cmv_serologia} />
							</DataList>
						</CardContent>
					</Card>

					{(donador.estatus === "baja" || donador.estatus === "suspendido" || donador.motivo_baja) && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Baja o suspensión</CardTitle>
							</CardHeader>
							<CardContent>
								<DataList>
									<DataItem
										label="Motivo"
										span={12}
										value={<span className="whitespace-pre-wrap">{donador.motivo_baja}</span>}
									/>
								</DataList>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* ------------------------------------------------------- Elegibilidad */}
				<TabsContent value="elegibilidad" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Evaluaciones de elegibilidad</CardTitle>
						</CardHeader>
						<CardContent>
							{elegibilidades.length === 0 ? (
								<EmptyState compact title="Sin evaluaciones registradas" />
							) : (
								<ul className="divide-y">
									{elegibilidades.map((e, i) => (
										<li key={e.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
											<div className="flex flex-wrap items-center gap-2">
												<Badge
													variant={e.resultado === "apto" ? "default" : "destructive"}
													className={e.resultado === "apto" ? SEMAFORO_OK : undefined}
												>
													{e.resultado}
												</Badge>
												{i === 0 && <Badge variant="secondary">vigente</Badge>}
												<span className="text-muted-foreground text-xs">
													{fechaLarga(e.createdAt)} · cuestionario {e.version_cuestionario}
												</span>
											</div>
											{e.motivos.length > 0 && (
												<ul className="text-muted-foreground list-disc ps-5 text-xs">
													{e.motivos.map((m) => (
														<li key={m.clave}>{m.descripcion}</li>
													))}
												</ul>
											)}
											{e.bloqueado_hasta && (
												<p className="text-muted-foreground text-xs">
													Diferido hasta {fechaLarga(e.bloqueado_hasta)}
												</p>
											)}
										</li>
									))}
								</ul>
							)}
							<p className="text-muted-foreground mt-4 border-t pt-4 text-xs">
								El histórico completo se conserva: cada evaluación inserta una fila nueva.
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				{/* ----------------------------------------------------- Consentimiento */}
				<TabsContent value="consentimiento" className="mt-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Consentimientos firmados</CardTitle>
						</CardHeader>
						<CardContent>
							{consentimientos.length === 0 ? (
								<EmptyState compact title="Sin consentimiento firmado" />
							) : (
								<ul className="divide-y">
									{consentimientos.map((c) => (
										<li
											key={c.id}
											className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="min-w-0 space-y-1">
												<p className="flex items-center gap-2 text-sm font-medium">
													<ShieldCheck className="size-4" aria-hidden="true" />
													Versión {c.version_documento} · {fechaLarga(c.fecha_aceptacion)}
												</p>
												<p className="text-muted-foreground font-mono text-xs break-all">
													SHA-256 {c.hash_documento}
												</p>
											</div>
											<Button asChild variant="outline" className="shrink-0">
												<a href={`${API_URL}${ENDPOINTS.constancia(c.id)}`} download>
													<Download className="size-4" />
													Descargar constancia
												</a>
											</Button>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* ---------------------------------------------------- HLA y muestras */}
				<TabsContent value="hla" className="mt-4 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Perfil HLA</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-wrap items-center gap-2">
								<Badge
									variant={hla.completo_10_10 ? "default" : "secondary"}
									className={hla.completo_10_10 ? SEMAFORO_OK : undefined}
								>
									{hla.completo_10_10 ? "Perfil 10/10 completo" : "Perfil incompleto"}
								</Badge>
								{hla.loci_faltantes.length > 0 && (
									<span className="text-muted-foreground text-xs">
										Faltan: {hla.loci_faltantes.join(", ")}
									</span>
								)}
							</div>
							{hla.perfiles.length === 0 ? (
								<EmptyState compact title="Sin tipificación registrada" />
							) : (
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="text-muted-foreground px-4 text-xs">Locus</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Alelo 1</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Alelo 2</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">
													Resolución
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{hla.perfiles.map((p) => (
												<TableRow key={p.locus} className="h-12">
													<TableCell className="px-4 font-medium">{p.locus}</TableCell>
													<TableCell className="px-4 font-mono text-xs">{p.alelo_1_raw}</TableCell>
													<TableCell className="px-4 font-mono text-xs">{p.alelo_2_raw}</TableCell>
													<TableCell className="px-4">{p.resolucion}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Muestras</CardTitle>
						</CardHeader>
						<CardContent>
							{muestras.length === 0 ? (
								<EmptyState compact title="Sin muestras registradas" />
							) : (
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="text-muted-foreground px-4 text-xs">Folio</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Tipo</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Estatus</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">Toma</TableHead>
												<TableHead className="text-muted-foreground px-4 text-xs">
													Responsable
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{muestras.map((m) => (
												<TableRow key={m.id} className="h-12">
													<TableCell className="px-4 font-mono text-xs">{m.folio_muestra}</TableCell>
													<TableCell className="px-4">{m.tipo_muestra}</TableCell>
													<TableCell className="px-4">{m.estatus}</TableCell>
													<TableCell className="px-4">{fechaLarga(m.fecha_toma)}</TableCell>
													<TableCell className="px-4">{m.responsable_toma ?? "—"}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<DialogoEstatus
				codigoRegistro={donador.codigo_registro}
				abierto={cambiandoEstatus}
				onAbiertoChange={setCambiandoEstatus}
			/>
		</PageShell>
	)
}
