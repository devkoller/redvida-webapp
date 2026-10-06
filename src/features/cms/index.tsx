import { Link } from "@tanstack/react-router"
import { Lock, Pencil } from "lucide-react"

import { PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState, TablaSkeleton } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePaginas } from "./api"
import { DOCUMENTOS } from "./documentos/config"
import { EstadoPagina } from "./components/estado-pagina"
import { fechaHora } from "./data/formato"

/**
 * Páginas del sitio. Cada una se edita en su **propia ruta**
 * (`/admin/contenido/$paginaId`), de modo que "atrás" del navegador regresa a
 * donde estaba la persona y no la saca de la sección.
 *
 * Editar no publica: el sitio público no cambia hasta pulsar Publicar.
 */
export function CmsPage() {
	const { data: todas, isPending, isError, refetch } = usePaginas()
	// El aviso de privacidad es un documento versionado con su propio editor: va abajo, en «Documentos legales».
	const paginas = todas?.filter((p) => !esAviso(p.slug))

	return (
		<PageShell>
			<PageHeader
				title="Contenido del sitio"
				description="Los cambios se guardan como borrador. El sitio público no cambia hasta que se publique la página."
			/>

			<Card className="gap-0 py-0">
				<CardContent className="p-0">
					{isPending ? (
						<TablaSkeleton rows={5} />
					) : isError ? (
						<ErrorState onRetry={() => refetch()} />
					) : paginas!.length === 0 ? (
						<EmptyState title="No hay páginas administrables" />
					) : (
						<>
							<div className="max-md:hidden">
								<Table className="table-fixed">
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-muted-foreground px-4 text-xs">Página</TableHead>
											<TableHead className="text-muted-foreground w-40 px-4 text-xs">Estado</TableHead>
											<TableHead className="text-muted-foreground w-24 px-4 text-right text-xs">Bloques</TableHead>
											<TableHead className="text-muted-foreground w-48 px-4 text-xs">Última edición</TableHead>
											<TableHead className="w-32 px-4">
												<span className="sr-only">Acciones</span>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginas!.map((p) => (
											<TableRow key={p.id} className="h-14">
												<TableCell className="px-4">
													<span className="block truncate font-medium">{p.titulo}</span>
													<code className="text-muted-foreground text-xs">/{p.slug}</code>
												</TableCell>
												<TableCell className="px-4">
													<EstadoPagina pagina={p} />
												</TableCell>
												<TableCell className="px-4 text-right tabular-nums">
													{p.total_bloques}
												</TableCell>
												<TableCell className="px-4 text-xs">
													{fechaHora(p.ultima_edicion) ?? <span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="px-4 text-right">
													<AccionPagina editable={p.editable} id={p.id} titulo={p.titulo} slug={p.slug} />
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							<ul className="divide-y md:hidden">
								{paginas!.map((p) => (
									<li key={p.id} className="space-y-3 px-4 py-4">
										<div className="space-y-1">
											<p className="text-sm font-medium">{p.titulo}</p>
											<code className="text-muted-foreground text-xs">/{p.slug}</code>
										</div>
										<EstadoPagina pagina={p} />
										<p className="text-muted-foreground text-xs">
											{p.total_bloques} bloques · {fechaHora(p.ultima_edicion) ?? "sin ediciones"}
										</p>
										<AccionPagina editable={p.editable} id={p.id} titulo={p.titulo} slug={p.slug} />
									</li>
								))}
							</ul>
						</>
					)}
				</CardContent>
			</Card>

			<section className="space-y-4" aria-labelledby="documentos-legales">
				<div className="space-y-1">
					<h2 id="documentos-legales" className="text-base font-semibold">
						Documentos legales
					</h2>
					<p className="text-muted-foreground text-xs">
						Se versionan: cada edición publica una versión nueva y las anteriores quedan intactas.
					</p>
				</div>
				<Card className="gap-0 py-0">
					<CardContent className="p-0">
						<ul className="divide-y">
							{DOCUMENTOS.map((d) => (
								<li key={d.clave} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
									<div className="min-w-0 space-y-1">
										<p className="text-sm font-medium">{d.titulo}</p>
										<p className="text-muted-foreground text-xs">
											{d.clave === "aviso-privacidad"
												? "Se muestra en /aviso-privacidad."
												: "Se lee y firma en el paso 5 del registro."}
										</p>
									</div>
									<div className="flex items-center gap-3">
										<Badge variant="outline">Documento legal</Badge>
										<Button asChild variant="outline" size="sm" aria-label={`Editar ${d.titulo}`}>
											<Link to={d.rutaAdmin as never}>
												<Pencil className="size-4" />
												Editar
											</Link>
										</Button>
									</div>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</section>

			{paginas?.some((p) => !p.editable) && (
				<p className="text-muted-foreground flex items-center gap-2 text-xs">
					<Lock className="size-4" aria-hidden="true" />
					Las páginas no editables (derechos ARCO) tienen efectos legales y requieren revisión jurídica.
				</p>
			)}
		</PageShell>
	)
}

/** El aviso de privacidad no es una página de bloques: es un documento versionado con su propio editor. */
const esAviso = (slug: string) => slug === "aviso-privacidad"

function AccionPagina({
	editable,
	id,
	titulo,
}: {
	editable: boolean
	id: number
	titulo: string
	slug: string
}) {
	if (!editable)
		return (
			<span className="text-muted-foreground inline-flex items-center gap-2 text-xs">
				<Lock className="size-4" aria-hidden="true" />
				No editable
			</span>
		)
	return (
		<Button asChild variant="outline" size="sm" aria-label={`Editar la página ${titulo}`}>
			<Link to="/admin/contenido/$paginaId" params={{ paginaId: String(id) }}>
				<Pencil className="size-4" />
				Editar
			</Link>
		</Button>
	)
}

export default CmsPage
