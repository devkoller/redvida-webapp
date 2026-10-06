import { getRouteApi } from "@tanstack/react-router"
import { RotateCcw } from "lucide-react"
import { useState } from "react"

import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState, TablaSkeleton } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePermission } from "@/stores/sessionStore"
import { useBorrador, useOperacionesPagina, useVersiones } from "../api"
import { DialogoRevertir } from "../components/dialogos"
import { fechaHora } from "../data/formato"

const ruta = getRouteApi("/admin/contenido/$paginaId/versiones")

/** Historial de publicaciones de una página, con opción de revertir. */
export function VersionesCmsPage() {
	const paginaId = Number(ruta.useParams().paginaId)
	const puedePublicar = usePermission("cms:publish")
	const { data: borrador } = useBorrador(paginaId)
	const { data: versiones, isPending, isError, refetch } = useVersiones(paginaId)
	const { revertir } = useOperacionesPagina(paginaId)
	const [aRevertir, setARevertir] = useState<{ id: number; numero_version: number } | null>(null)

	return (
		<PageShell width="narrow">
			<PageHeader
				breadcrumb={
					<BackLink to={`/admin/contenido/${paginaId}`}>{borrador?.pagina.titulo ?? "Página"}</BackLink>
				}
				title="Historial de versiones"
				description="Cada publicación queda registrada. Revertir crea una versión nueva; nada se borra."
			/>

			<Card className="gap-0 py-0">
				<CardContent className="p-0">
					{isPending ? (
						<TablaSkeleton rows={5} />
					) : isError ? (
						<ErrorState onRetry={() => refetch()} />
					) : versiones.length === 0 ? (
						<EmptyState title="Esta página aún no se ha publicado" description="Las versiones aparecerán aquí al publicar." />
					) : (
						<Table className="table-fixed">
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="text-muted-foreground w-24 px-4 text-xs">Versión</TableHead>
									<TableHead className="text-muted-foreground w-48 px-4 text-xs">Publicada</TableHead>
									<TableHead className="text-muted-foreground px-4 text-xs">Comentario</TableHead>
									<TableHead className="w-32 px-4">
										<span className="sr-only">Acciones</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{versiones.map((v) => (
									<TableRow key={v.id} className="h-12">
										<TableCell className="px-4">
											<span className="flex items-center gap-2 font-medium tabular-nums">
												v{v.numero_version}
											</span>
										</TableCell>
										<TableCell className="px-4 text-xs">
											{v.es_vigente && (
												<Badge className="bg-success text-success-foreground mb-1 block w-fit">Vigente</Badge>
											)}
											{fechaHora(v.fecha_publicacion)}
										</TableCell>
										<TableCell className="truncate px-4 text-xs" title={v.comentario ?? ""}>
											{v.comentario ?? <span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="px-4 text-right">
											{puedePublicar && !v.es_vigente && (
												<Button variant="outline" size="sm" onClick={() => setARevertir(v)}>
													<RotateCcw className="size-4" />
													Revertir
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<DialogoRevertir
				version={aRevertir}
				pendiente={revertir.isPending}
				onCerrar={() => setARevertir(null)}
				onConfirmar={(id) => revertir.mutate(id, { onSuccess: () => setARevertir(null) })}
			/>
		</PageShell>
	)
}
