import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import axios from "axios"
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"

import { API_URL, ENDPOINTS } from "@/api/config"
import { PageHeader, PageShell } from "@/components/layout/Page"
import { EmptyState, ErrorState, TablaSkeleton } from "@/components/layout/States"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { EstatusBadge } from "./components/estatus-badge"
import { edadDe, nombreCompleto } from "./data/formato"
import { ESTATUS_DONADOR, type DonadorListado } from "./data/schema"

const POR_PAGINA = 20

/**
 * Padrón de donadores.
 *
 * **La paginación y los filtros son del lado del servidor.** Traer el padrón
 * completo al navegador para filtrarlo ahí movería miles de registros con datos
 * personales a un equipo que puede ser compartido.
 *
 * La búsqueda acepta código de registro o CURP **exactos**, no nombre: buscar
 * por nombre convertiría el padrón en algo explorable. Y vive en estado local,
 * no en la URL: una CURP en la URL queda en el historial y en los logs.
 */
export function AdminDonadoresPage() {
	const navegar = useNavigate()
	const [page, setPage] = useState(1)
	const [busqueda, setBusqueda] = useState("")
	const [terminoAplicado, setTerminoAplicado] = useState("")
	const [estatus, setEstatus] = useState("")
	const [conTipificacion, setConTipificacion] = useState("")

	const { data, isPending, isError, isFetching, refetch } = useQuery({
		queryKey: ["admin-donadores", page, terminoAplicado, estatus, conTipificacion],
		queryFn: async () => {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.adminDonadores}`, {
				params: {
					page,
					limit: POR_PAGINA,
					...(terminoAplicado ? { busqueda: terminoAplicado } : {}),
					...(estatus ? { estatus } : {}),
					...(conTipificacion ? { con_tipificacion: conTipificacion } : {}),
				},
			})
			return { donadores: (data?.data ?? []) as DonadorListado[], meta: data?.meta }
		},
		// Conserva la tabla anterior al paginar o filtrar: sin parpadeo de "sin resultados".
		placeholderData: keepPreviousData,
	})

	const donadores = data?.donadores ?? []
	const meta = data?.meta
	const activos = [
		terminoAplicado && {
			key: "busqueda",
			label: `Búsqueda: ${terminoAplicado}`,
			quitar: () => {
				setBusqueda("")
				setTerminoAplicado("")
			},
		},
		estatus && {
			key: "estatus",
			label: `Estatus: ${ESTATUS_DONADOR[estatus as keyof typeof ESTATUS_DONADOR]?.etiqueta ?? estatus}`,
			quitar: () => setEstatus(""),
		},
		conTipificacion && {
			key: "hla",
			label: conTipificacion === "true" ? "Con perfil HLA" : "Sin perfil HLA",
			quitar: () => setConTipificacion(""),
		},
	].filter(Boolean) as { key: string; label: string; quitar: () => void }[]
	const hayFiltros = activos.length > 0

	const limpiar = () => {
		setBusqueda("")
		setTerminoAplicado("")
		setEstatus("")
		setConTipificacion("")
		setPage(1)
	}

	const abrir = (codigo: string) =>
		navegar({ to: "/admin/donadores/$codigo", params: { codigo } })

	return (
		<PageShell>
			<PageHeader
				title="Padrón de donadores"
				description="Incluye bloqueados y suprimidos, por eso el total puede diferir del tablero, que solo cuenta datos activos."
			/>

			<Card>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-2">
						<SlidersHorizontal className="text-muted-foreground size-4" aria-hidden="true" />
						<h2 className="text-sm font-medium">Filtros</h2>
					</div>

					<form
						className="flex flex-wrap items-end gap-3"
						onSubmit={(e) => {
							e.preventDefault()
							setTerminoAplicado(busqueda.trim())
							setPage(1)
						}}
					>
						<div className="w-full space-y-2 sm:w-80">
							<Label htmlFor="buscar" className="text-muted-foreground text-xs">
								Código de registro o CURP (exactos)
							</Label>
							<div className="flex gap-2">
								<Input
									id="buscar"
									type="search"
									value={busqueda}
									onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
									placeholder="RVMX-XXXXXXXXXXXX o CURP"
									autoComplete="off"
									className="bg-card font-mono"
								/>
								<Button type="submit" size="icon" aria-label="Buscar">
									<Search className="size-4" />
								</Button>
							</div>
						</div>

						<div className="w-44 space-y-2">
							<Label htmlFor="filtro-estatus" className="text-muted-foreground text-xs">
								Estatus
							</Label>
							<Select
								value={estatus || "todos"}
								onValueChange={(valor) => {
									setEstatus(valor === "todos" ? "" : valor)
									setPage(1)
								}}
							>
								<SelectTrigger id="filtro-estatus" className="bg-card w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="todos">Todos</SelectItem>
									{Object.entries(ESTATUS_DONADOR).map(([clave, valor]) => (
										<SelectItem key={clave} value={clave}>
											{valor.etiqueta}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="w-44 space-y-2">
							<Label htmlFor="filtro-hla" className="text-muted-foreground text-xs">
								Tipificación
							</Label>
							<Select
								value={conTipificacion || "todos"}
								onValueChange={(valor) => {
									setConTipificacion(valor === "todos" ? "" : valor)
									setPage(1)
								}}
							>
								<SelectTrigger id="filtro-hla" className="bg-card w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="todos">Todas</SelectItem>
									<SelectItem value="true">Con perfil HLA</SelectItem>
									<SelectItem value="false">Sin perfil HLA</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<Button
							type="button"
							variant="ghost"
							className="ms-auto"
							onClick={limpiar}
							disabled={!hayFiltros}
						>
							Limpiar
						</Button>
					</form>

					{/* min-h reservado: la barra no cambia de alto con o sin filtros */}
					<div className="flex min-h-6 flex-wrap items-center gap-2">
						{activos.map((filtro) => (
							<Badge key={filtro.key} variant="secondary" className="gap-1">
								{filtro.label}
								<button
									type="button"
									onClick={() => {
										filtro.quitar()
										setPage(1)
									}}
									aria-label={`Quitar filtro ${filtro.label}`}
								>
									<X className="size-3" />
								</button>
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			<Card className="gap-0 py-0">
				<CardContent className="p-0">
					{isPending ? (
						<TablaSkeleton rows={8} />
					) : isError ? (
						<ErrorState onRetry={() => refetch()} />
					) : donadores.length === 0 ? (
						<EmptyState
							title={hayFiltros ? "Ningún donador coincide con los filtros" : "Aún no hay donadores"}
							description={
								hayFiltros
									? "Pruebe con otro código o CURP, o quite algún filtro."
									: "Los registros aparecerán aquí cuando alguien complete el registro."
							}
							action={
								hayFiltros && (
									<Button size="sm" variant="outline" onClick={limpiar}>
										Limpiar filtros
									</Button>
								)
							}
						/>
					) : (
						<>
							{/* Escritorio: tabla */}
							<div className="max-md:hidden">
								<Table className="table-fixed">
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead className="text-muted-foreground w-44 px-4 text-xs">
												Código
											</TableHead>
											<TableHead className="text-muted-foreground w-44 px-4 text-xs">
												CURP
											</TableHead>
											<TableHead className="text-muted-foreground px-4 text-xs">Nombre</TableHead>
											<TableHead className="text-muted-foreground w-16 px-4 text-right text-xs">
												Edad
											</TableHead>
											<TableHead className="text-muted-foreground w-44 px-4 text-xs">
												Estatus
											</TableHead>
											<TableHead className="text-muted-foreground w-20 px-4 text-right text-xs">
												Loci HLA
											</TableHead>
											<TableHead className="w-10 px-4">
												<span className="sr-only">Abrir</span>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{donadores.map((d) => (
											<TableRow
												key={d.codigo_registro}
												className="h-12 cursor-pointer"
												onClick={() => abrir(d.codigo_registro)}
											>
												<TableCell className="px-4 font-mono text-xs">
													<a
														href={`/admin/donadores/${encodeURIComponent(d.codigo_registro)}`}
														onClick={(e) => {
															e.preventDefault()
															abrir(d.codigo_registro)
														}}
														className="hover:underline"
													>
														{d.codigo_registro}
													</a>
												</TableCell>
												<TableCell className="truncate px-4 font-mono text-xs" title={d.curp ?? ""}>
													{d.curp ?? <span className="text-muted-foreground">—</span>}
												</TableCell>
												<TableCell className="truncate px-4" title={nombreCompleto(d)}>
													{nombreCompleto(d)}
												</TableCell>
												<TableCell className="px-4 text-right tabular-nums">
													{edadDe(d.fecha_nacimiento)}
												</TableCell>
												<TableCell className="px-4">
													<EstatusBadge estatus={d.estatus} cicloDato={d.ciclo_dato} />
												</TableCell>
												<TableCell className="px-4 text-right tabular-nums">
													{d.loci_tipificados > 0 ? d.loci_tipificados : "—"}
												</TableCell>
												<TableCell className="px-4">
													<ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Móvil: lista de cards, sin scroll horizontal */}
							<ul className="divide-y md:hidden">
								{donadores.map((d) => (
									<li key={d.codigo_registro}>
										<button
											type="button"
											onClick={() => abrir(d.codigo_registro)}
											className="hover:bg-muted/50 flex w-full flex-col gap-2 px-4 py-4 text-left"
										>
											<span className="font-mono text-xs">{d.codigo_registro}</span>
											<span className="text-sm">{nombreCompleto(d)}</span>
											<span className="text-muted-foreground font-mono text-xs">
												{d.curp ?? "—"}
											</span>
											<EstatusBadge estatus={d.estatus} cicloDato={d.ciclo_dato} />
										</button>
									</li>
								))}
							</ul>
						</>
					)}
				</CardContent>
			</Card>

			{meta && (
				<div className="flex items-center justify-between gap-3">
					<p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
						{meta.total} donadores · página {meta.page} de {Math.max(meta.paginas, 1)}
						{isFetching && " · actualizando…"}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
							aria-label="Página anterior"
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setPage((p) => p + 1)}
							disabled={page >= meta.paginas}
							aria-label="Página siguiente"
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</PageShell>
	)
}

export default AdminDonadoresPage
