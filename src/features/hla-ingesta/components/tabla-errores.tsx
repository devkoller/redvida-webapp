import {
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Download, Filter, X } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import type { ErrorFila } from "../data/schema"
import { exportarErrores } from "../data/exportar"

/**
 * Reporte de errores de un lote rechazado.
 *
 * Es la pantalla que decide si la ingesta sirve: quien opera el laboratorio
 * necesita saber **qué línea del archivo corregir**, no que "el lote falló".
 * Por eso la columna de línea va primera y el filtro facetado permite aislar
 * un tipo de error cuando se repite en cientos de filas.
 */
export function TablaErrores({
	errores,
	nombreArchivo,
}: {
	errores: ErrorFila[]
	nombreArchivo: string
}) {
	const [sorting, setSorting] = useState<SortingState>([{ id: "linea", desc: false }])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [busqueda, setBusqueda] = useState("")

	const columnas = useMemo<ColumnDef<ErrorFila>[]>(
		() => [
			{
				accessorKey: "linea",
				header: "Línea",
				cell: ({ row }) => (
					<span className="font-mono tabular-nums">{row.original.linea}</span>
				),
				size: 70,
			},
			{
				accessorKey: "codigo_registro",
				header: "Código",
				cell: ({ row }) => (
					<span className="font-mono text-xs">{row.original.codigo_registro || "—"}</span>
				),
			},
			{
				accessorKey: "locus",
				header: "Locus",
				cell: ({ row }) =>
					row.original.locus ? (
						<Badge variant="outline">{row.original.locus}</Badge>
					) : (
						<span className="text-muted-foreground">—</span>
					),
				filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id) ?? "")),
			},
			{
				accessorKey: "campo",
				header: "Campo",
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">{row.original.campo || "—"}</span>
				),
				filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id) ?? "")),
			},
			{
				accessorKey: "mensaje",
				header: "Qué corregir",
				cell: ({ row }) => <span className="text-sm">{row.original.mensaje}</span>,
			},
		],
		[],
	)

	const tabla = useReactTable({
		data: errores,
		columns: columnas,
		state: { sorting, columnFilters, globalFilter: busqueda },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setBusqueda,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		initialState: { pagination: { pageSize: 15 } },
	})

	const hayFiltros = columnFilters.length > 0 || busqueda.length > 0

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<Input
					placeholder="Buscar en los errores…"
					value={busqueda}
					onChange={(e) => setBusqueda(e.target.value)}
					className="h-9 max-w-xs"
					aria-label="Buscar en los errores"
				/>

				<FiltroFacetado tabla={tabla} columna="locus" titulo="Locus" />
				<FiltroFacetado tabla={tabla} columna="campo" titulo="Campo" />

				{hayFiltros && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setColumnFilters([])
							setBusqueda("")
						}}
					>
						<X className="size-4" />
						Limpiar
					</Button>
				)}

				<Button
					variant="outline"
					size="sm"
					className="ml-auto"
					onClick={() => exportarErrores(errores, nombreArchivo)}
				>
					<Download className="size-4" />
					Exportar a Excel
				</Button>
			</div>

			<div className="overflow-x-auto rounded-lg border">
				<Table>
					<TableHeader>
						{tabla.getHeaderGroups().map((grupo) => (
							<TableRow key={grupo.id}>
								{grupo.headers.map((header) => (
									<TableHead
										key={header.id}
										onClick={header.column.getToggleSortingHandler()}
										className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
									>
										{flexRender(header.column.columnDef.header, header.getContext())}
										{{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{tabla.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={columnas.length} className="h-24 text-center">
									Ningún error coincide con el filtro.
								</TableCell>
							</TableRow>
						) : (
							tabla.getRowModel().rows.map((fila) => (
								<TableRow key={fila.id}>
									{fila.getVisibleCells().map((celda) => (
										<TableCell key={celda.id}>
											{flexRender(celda.column.columnDef.cell, celda.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-sm">
					{tabla.getFilteredRowModel().rows.length} de {errores.length}{" "}
					{errores.length === 1 ? "error" : "errores"}
				</p>
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-sm">
						Página {tabla.getState().pagination.pageIndex + 1} de {tabla.getPageCount() || 1}
					</span>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => tabla.previousPage()}
						disabled={!tabla.getCanPreviousPage()}
						aria-label="Página anterior"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						onClick={() => tabla.nextPage()}
						disabled={!tabla.getCanNextPage()}
						aria-label="Página siguiente"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}

/** Filtro por valores distintos de una columna, con el conteo de cada uno. */
function FiltroFacetado({
	tabla,
	columna,
	titulo,
}: {
	tabla: ReturnType<typeof useReactTable<ErrorFila>>
	columna: string
	titulo: string
}) {
	const col = tabla.getColumn(columna)
	if (!col) return null

	const valores = col.getFacetedUniqueValues()
	const seleccionados = new Set((col.getFilterValue() as string[]) ?? [])
	const opciones = [...valores.entries()].filter(([valor]) => valor).sort()

	if (opciones.length === 0) return null

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="h-9 border-dashed">
					<Filter className="size-3.5" />
					{titulo}
					{seleccionados.size > 0 && (
						<Badge variant="secondary" className="ml-1 rounded-sm px-1 font-normal">
							{seleccionados.size}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-52 p-2" align="start">
				<div className="space-y-1">
					{opciones.map(([valor, conteo]) => {
						const marcado = seleccionados.has(String(valor))
						return (
							<label
								key={String(valor)}
								className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
							>
								<Checkbox
									checked={marcado}
									onCheckedChange={(estado) => {
										const siguiente = new Set(seleccionados)
										if (estado === true) siguiente.add(String(valor))
										else siguiente.delete(String(valor))
										col.setFilterValue(siguiente.size > 0 ? [...siguiente] : undefined)
									}}
								/>
								<span className="flex-1 truncate">{String(valor)}</span>
								<span className="text-muted-foreground tabular-nums">{conteo}</span>
							</label>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export default TablaErrores
