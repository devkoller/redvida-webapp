import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router"
import { Eye, EyeOff, GripVertical, History, Pencil, Plus, Rocket, Trash2 } from "lucide-react"
import { useState } from "react"

import { BackLink, PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState } from "@/components/layout/States"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermission } from "@/stores/sessionStore"
import { useBorrador, useOperacionesPagina } from "../api"
import { DialogoAgregarBloque, DialogoEliminarBloque, DialogoPublicar } from "../components/dialogos"
import { EstadoPagina } from "../components/estado-pagina"
import { resumenBloque } from "../data/formato"
import { SLUG_NARRATIVA, TIPOS_BLOQUE, type BloqueCms } from "../data/schema"

const ruta = getRouteApi("/admin/contenido/$paginaId/")

/** Vista de una página: sus bloques en orden, con lo necesario para publicarla. */
export function PaginaCmsPage() {
	const paginaId = Number(ruta.useParams().paginaId)
	const navegar = useNavigate()
	const permisoEscribir = usePermission("cms:write")
	const puedePublicar = usePermission("cms:publish")
	const { data, isPending, isError, refetch } = useBorrador(paginaId)
	const ops = useOperacionesPagina(paginaId)

	const [publicando, setPublicando] = useState(false)
	const [agregando, setAgregando] = useState(false)
	const [eliminar, setEliminar] = useState<BloqueCms | null>(null)

	const breadcrumb = <BackLink to="/admin/contenido">Contenido del sitio</BackLink>

	if (isPending)
		return (
			<PageShell>
				<PageHeader breadcrumb={breadcrumb} title="Cargando página…" />
				<Skeleton className="h-24 rounded-xl" />
				<Skeleton className="h-72 rounded-xl" />
			</PageShell>
		)

	if (isError)
		return (
			<PageShell>
				<PageHeader breadcrumb={breadcrumb} title="Página" />
				<Card>
					<CardContent>
						<ErrorState onRetry={() => refetch()} />
					</CardContent>
				</Card>
			</PageShell>
		)

	const { pagina, bloques } = data
	// La landing narrativa tiene estructura fija (la escena 3D está construida
	// sobre sus secciones): aquí se editan textos, no se agregan, quitan ni
	// reordenan bloques. Editar el texto de un bloque sí requiere `cms:write`.
	const fija = pagina.slug === SLUG_NARRATIVA
	const puedeEscribir = permisoEscribir && !fija

	if (!pagina.editable)
		return (
			<PageShell>
				<PageHeader breadcrumb={breadcrumb} title={pagina.titulo} description={`/${pagina.slug}`} />
				<Card>
					<CardContent>
						<EmptyState
							title="Esta página no es editable"
							description="Su contenido tiene efectos legales y requiere revisión jurídica."
						/>
					</CardContent>
				</Card>
			</PageShell>
		)

	const alSoltar = (r: DropResult) => {
		if (!r.destination || r.destination.index === r.source.index) return
		const nuevos = [...bloques]
		const [movido] = nuevos.splice(r.source.index, 1)
		nuevos.splice(r.destination.index, 0, movido!)
		ops.reordenar.mutate(nuevos.map((b) => b.id))
	}

	return (
		<PageShell>
			<PageHeader
				breadcrumb={breadcrumb}
				title={pagina.titulo}
				description={
					<span className="flex flex-wrap items-center gap-2">
						<code>/{pagina.slug}</code>
						<EstadoPagina pagina={pagina} />
					</span>
				}
				actions={
					<>
						<Button asChild variant="outline">
							<Link to="/admin/contenido/$paginaId/versiones" params={{ paginaId: String(paginaId) }}>
								<History className="size-4" />
								Versiones
							</Link>
						</Button>
						{puedePublicar && (
							<Button onClick={() => setPublicando(true)}>
								<Rocket className="size-4" />
								Publicar
							</Button>
						)}
					</>
				}
			/>

			{fija && (
				<div role="note" className="bg-muted/50 rounded-md border p-4 text-xs">
					<p className="text-sm font-medium">Estructura fija</p>
					<p className="text-muted-foreground mt-1">
						Esta página tiene una animación construida sobre sus secciones, así que aquí se editan
						los <strong>textos</strong>; no se agregan, quitan ni reordenan bloques. Para eso hace falta un
						cambio en el código.
					</p>
				</div>
			)}

			{pagina.tiene_cambios_sin_publicar && (
				<div role="status" className="border-warning/50 bg-warning/10 rounded-md border p-4 text-sm">
					<p className="font-medium">Hay cambios sin publicar</p>
					<p className="text-muted-foreground text-xs">
						{pagina.version_publicada
							? `El sitio público sigue mostrando la versión ${pagina.version_publicada.numero_version}.`
							: "Esta página aún no se ha publicado en el sitio."}
					</p>
				</div>
			)}

			<Card className="gap-0 py-0">
				<div className="flex items-center justify-between gap-3 border-b px-6 py-4">
					<div className="space-y-1">
						<h2 className="text-base font-semibold">Bloques</h2>
						<p className="text-muted-foreground text-xs">
							Se muestran en el sitio en este orden. Arrastre para reordenar.
						</p>
					</div>
					{puedeEscribir && (
						<Button variant="outline" onClick={() => setAgregando(true)}>
							<Plus className="size-4" />
							Agregar bloque
						</Button>
					)}
				</div>
				<CardContent className="p-0">
					{bloques.length === 0 ? (
						<EmptyState title="Esta página aún no tiene bloques" description="Agregue el primero para empezar a armarla." />
					) : (
						<DragDropContext onDragEnd={alSoltar}>
							<Droppable droppableId="bloques">
								{(provided) => (
									<ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y">
										{bloques.map((b, i) => (
											<Draggable key={b.id} draggableId={String(b.id)} index={i} isDragDisabled={!puedeEscribir}>
												{(arrastre, snapshot) => (
													<li
														ref={arrastre.innerRef}
														{...arrastre.draggableProps}
														className={`bg-card flex items-center gap-3 px-4 py-3 ${snapshot.isDragging ? "shadow-md" : ""}`}
													>
														{puedeEscribir && (
															<span
																{...arrastre.dragHandleProps}
																className="text-muted-foreground flex size-10 shrink-0 cursor-grab items-center justify-center"
																aria-label={`Reordenar el bloque ${TIPOS_BLOQUE[b.tipo]?.etiqueta ?? b.tipo}`}
															>
																<GripVertical className="size-4" />
															</span>
														)}
														<div className={`min-w-0 flex-1 space-y-1 ${b.visible ? "" : "opacity-60"}`}>
															<div className="flex flex-wrap items-center gap-2">
																<span className="text-sm font-medium">
																	{TIPOS_BLOQUE[b.tipo]?.etiqueta ?? b.tipo}
																</span>
																{!b.visible && <Badge variant="secondary">Oculto</Badge>}
															</div>
															<p className="text-muted-foreground truncate text-xs">
																{resumenBloque(b.contenido) || "Sin texto"}
															</p>
														</div>
														<div className="flex shrink-0 items-center gap-1">
															{puedeEscribir && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={b.visible ? "Ocultar del sitio" : "Mostrar en el sitio"}
																		title={b.visible ? "Ocultar del sitio" : "Mostrar en el sitio"}
																		onClick={() => ops.alternarVisible.mutate({ id: b.id, visible: !b.visible })}
																	>
																		{b.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		className="text-destructive"
																		aria-label={`Eliminar el bloque ${TIPOS_BLOQUE[b.tipo]?.etiqueta ?? b.tipo}`}
																		onClick={() => setEliminar(b)}
																	>
																		<Trash2 className="size-4" />
																	</Button>
																</>
															)}
															<Button asChild variant="outline" size="sm">
																<Link
																	to="/admin/contenido/$paginaId/bloques/$bloqueId"
																	params={{ paginaId: String(paginaId), bloqueId: String(b.id) }}
																>
																	<Pencil className="size-4" />
																	{permisoEscribir ? "Editar" : "Ver"}
																</Link>
															</Button>
														</div>
													</li>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</ul>
								)}
							</Droppable>
						</DragDropContext>
					)}
				</CardContent>
			</Card>

			<DialogoPublicar
				abierto={publicando}
				onAbiertoChange={setPublicando}
				titulo={pagina.titulo}
				pendiente={ops.publicar.isPending}
				onPublicar={(comentario) => ops.publicar.mutate(comentario, { onSuccess: () => setPublicando(false) })}
			/>
			<DialogoAgregarBloque
				abierto={agregando}
				onAbiertoChange={setAgregando}
				pendiente={ops.crearBloque.isPending}
				onAgregar={(tipo) =>
					ops.crearBloque.mutate(tipo, {
						onSuccess: (nuevo) => {
							setAgregando(false)
							// El bloque nace con contenido mínimo: se lleva a editarlo.
							if (nuevo?.id)
								navegar({
									to: "/admin/contenido/$paginaId/bloques/$bloqueId",
									params: { paginaId: String(paginaId), bloqueId: String(nuevo.id) },
								})
						},
					})
				}
			/>
			<DialogoEliminarBloque
				bloque={eliminar}
				pendiente={ops.eliminarBloque.isPending}
				onCerrar={() => setEliminar(null)}
				onConfirmar={(id) => ops.eliminarBloque.mutate(id, { onSuccess: () => setEliminar(null) })}
			/>
		</PageShell>
	)
}
