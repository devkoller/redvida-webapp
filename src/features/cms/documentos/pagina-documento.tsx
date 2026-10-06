import { Link } from "@tanstack/react-router"
import { ExternalLink, FilePlus2 } from "lucide-react"

import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState, TablaSkeleton } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePermission } from "@/stores/sessionStore"
import { fechaHora } from "../data/formato"
import { useVersionesDocumento } from "./api"
import type { ConfigDocumento } from "./config"

/** Historial del aviso de privacidad. Cambiarlo siempre crea una versión nueva. */
export function PaginaDocumento({ doc }: { doc: ConfigDocumento }) {
	const puedePublicar = usePermission("cms:publish")
	const { data, isPending, isError, refetch } = useVersionesDocumento(doc)

	return (
		<PageShell width="narrow">
			<PageHeader
				breadcrumb={<BackLink to="/admin/contenido">Contenido del sitio</BackLink>}
				title={doc.titulo}
				description={doc.descripcion}
				actions={
					<>
						<Button asChild variant="outline">
							<a href={doc.rutaPublica} target="_blank" rel="noopener noreferrer">
								<ExternalLink className="size-4" />
								{doc.etiquetaPublica}
							</a>
						</Button>
						{puedePublicar && (
							<Button asChild>
								<Link to={`${doc.rutaAdmin}/nueva` as never}>
									<FilePlus2 className="size-4" />
									Nueva versión
								</Link>
							</Button>
						)}
					</>
				}
			/>

			<div role="note" className="bg-muted/50 rounded-md border p-4 text-sm">
				<p className="font-medium">Cómo funciona</p>
				<p className="text-muted-foreground mt-1 text-xs">{doc.efecto}</p>
			</div>

			<Card className="gap-0 py-0">
				<CardContent className="p-0">
					{isPending ? (
						<TablaSkeleton rows={4} />
					) : isError ? (
						<ErrorState onRetry={() => refetch()} />
					) : data.length === 0 ? (
						<EmptyState title="Aún no hay versiones publicadas" />
					) : (
						<Table className="table-fixed">
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="text-muted-foreground w-36 px-4 text-xs">Versión</TableHead>
									<TableHead className="text-muted-foreground w-44 px-4 text-xs">Vigente desde</TableHead>
									<TableHead className="text-muted-foreground w-44 px-4 text-xs">Hasta</TableHead>
									<TableHead className="text-muted-foreground px-4 text-xs">Huella SHA-256</TableHead>
									<TableHead className="w-44 px-4">
										<span className="sr-only">Acciones</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.map((v) => (
									<TableRow key={v.id} className="h-12">
										<TableCell className="px-4">
											<span className="flex items-center gap-2 font-medium">
												{v.version}
												{v.vigente && <Badge className="bg-success text-success-foreground">Vigente</Badge>}
											</span>
										</TableCell>
										<TableCell className="px-4 text-xs">{fechaHora(v.vigente_desde)}</TableCell>
										<TableCell className="px-4 text-xs">
											{fechaHora(v.vigente_hasta) ?? <span className="text-muted-foreground">—</span>}
										</TableCell>
										<TableCell className="truncate px-4 font-mono text-xs" title={v.hash_contenido}>
											{v.hash_contenido.slice(0, 16)}…
										</TableCell>
										<TableCell className="px-4 text-right">
											{puedePublicar && (
												<Button asChild variant="outline" size="sm">
													<Link to={`${doc.rutaAdmin}/nueva` as never} search={{ base: v.version } as never}>
														Usar como base
													</Link>
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
		</PageShell>
	)
}
