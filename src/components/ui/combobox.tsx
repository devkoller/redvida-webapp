import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface OpcionCombobox {
	value: string
	label: string
}

/** Minúsculas y sin acentos: "mexico" debe encontrar "México". */
const normalizar = (texto: string) =>
	texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()

interface ComboboxProps {
	id?: string
	value: string
	onValueChange: (valor: string) => void
	opciones: OpcionCombobox[]
	placeholder?: string
	placeholderBusqueda?: string
	sinResultados?: string
	disabled?: boolean
	className?: string
}

/**
 * Select con búsqueda. Para listas largas —2,700 municipios— un select
 * normal obliga a desplazarse; aquí se escribe parte del nombre y se filtra.
 * Patrón WAI-ARIA combobox con listbox: el foco se queda en el campo de
 * búsqueda y la opción activa se anuncia con `aria-activedescendant`.
 */
export function Combobox({
	id,
	value,
	onValueChange,
	opciones,
	placeholder = "Seleccione",
	placeholderBusqueda = "Buscar…",
	sinResultados = "Sin resultados",
	disabled,
	className,
}: ComboboxProps) {
	const [abierto, setAbierto] = React.useState(false)
	const [busqueda, setBusqueda] = React.useState("")
	const [activo, setActivo] = React.useState(0)
	const lista = React.useRef<HTMLUListElement>(null)
	const campo = React.useRef<HTMLInputElement>(null)
	const idLista = React.useId()

	const filtradas = React.useMemo(() => {
		const q = normalizar(busqueda.trim())
		return q ? opciones.filter((o) => normalizar(o.label).includes(q)) : opciones
	}, [opciones, busqueda])

	const seleccionada = opciones.find((o) => o.value === value)

	React.useEffect(() => {
		if (!abierto) return
		setBusqueda("")
		const i = opciones.findIndex((o) => o.value === value)
		setActivo(Math.max(i, 0))
		// Solo al abrir: no debe reiniciar la búsqueda mientras se escribe.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [abierto])

	React.useEffect(() => {
		lista.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" })
	}, [activo, abierto])

	const elegir = (opcion: OpcionCombobox) => {
		onValueChange(opcion.value)
		setAbierto(false)
	}

	const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault()
			setActivo((i) => Math.min(i + 1, filtradas.length - 1))
		} else if (e.key === "ArrowUp") {
			e.preventDefault()
			setActivo((i) => Math.max(i - 1, 0))
		} else if (e.key === "Enter") {
			// Enter dentro del formulario lo enviaría.
			e.preventDefault()
			const opcion = filtradas[activo]
			if (opcion) elegir(opcion)
		}
	}

	return (
		<Popover open={abierto} onOpenChange={setAbierto}>
			<PopoverTrigger
				id={id}
				type="button"
				role="combobox"
				aria-expanded={abierto}
				aria-controls={idLista}
				disabled={disabled}
				className={cn(
					"border-input dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
					!seleccionada && "text-muted-foreground",
					className,
				)}
			>
				<span className="line-clamp-1 text-left">{seleccionada?.label ?? placeholder}</span>
				<ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-50" />
			</PopoverTrigger>

			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) min-w-56 p-0"
				// Radix enfoca el contenedor al abrir; el foco debe ir al buscador.
				onOpenAutoFocus={(e) => {
					e.preventDefault()
					campo.current?.focus()
				}}
			>
				<input
					type="text"
					role="searchbox"
					aria-label={placeholderBusqueda}
					aria-controls={idLista}
					aria-activedescendant={filtradas[activo] ? `${idLista}-${activo}` : undefined}
					ref={campo}
					autoComplete="off"
					spellCheck={false}
					value={busqueda}
					placeholder={placeholderBusqueda}
					onChange={(e) => {
						setBusqueda(e.target.value)
						setActivo(0)
					}}
					onKeyDown={alTeclear}
					className="placeholder:text-muted-foreground w-full border-b bg-transparent px-3 py-2.5 text-sm outline-none"
				/>

				<ul id={idLista} ref={lista} role="listbox" className="max-h-60 overflow-y-auto p-1">
					{filtradas.length === 0 && (
						<li className="text-muted-foreground px-3 py-6 text-center text-sm">{sinResultados}</li>
					)}
					{filtradas.map((opcion, i) => (
						<li
							key={opcion.value}
							id={`${idLista}-${i}`}
							data-indice={i}
							role="option"
							aria-selected={opcion.value === value}
							onMouseMove={() => setActivo(i)}
							onClick={() => elegir(opcion)}
							className={cn(
								"flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
								i === activo && "bg-accent text-accent-foreground",
							)}
						>
							<span>{opcion.label}</span>
							{opcion.value === value && <Check aria-hidden className="size-4 shrink-0" />}
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	)
}
