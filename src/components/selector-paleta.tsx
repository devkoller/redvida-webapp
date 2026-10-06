import { Palette } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PALETAS, type PaletaId } from "@/lib/temas"

/**
 * Elige la combinación de color de toda la página.
 *
 * Es una herramienta para decidir la identidad de Red Vida, no una preferencia
 * de la persona que visita: por eso muestra las muestras de color de cada
 * opción y no solo su nombre. Quien compara necesita ver los colores.
 *
 * Va con semántica de radio (`menuitemradio`) y no con botones sueltos porque
 * las opciones son excluyentes; así un lector de pantalla anuncia cuál está
 * activa y cuántas hay.
 */
export function SelectorPaleta() {
	const { paleta, setPaleta } = useTheme()
	const actual = PALETAS.find((p) => p.id === paleta) ?? PALETAS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={`Combinación de color: ${actual.nombre}`}>
					<Palette className="size-4" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuLabel>Combinación de color</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<DropdownMenuRadioGroup value={paleta} onValueChange={(v) => setPaleta(v as PaletaId)}>
					{PALETAS.map((p) => (
						<DropdownMenuRadioItem key={p.id} value={p.id} className="items-start py-2">
							<span className="flex min-w-0 flex-1 flex-col gap-1.5">
								<span className="flex items-center justify-between gap-2">
									<span className="font-medium">{p.nombre}</span>
									{/* `aria-hidden`: el nombre y el detalle ya dicen lo mismo, y
									    una lista de hexadecimales leída en voz alta es ruido. */}
									<span aria-hidden className="flex shrink-0 gap-0.5">
										{/* Índice y no color como clave: una paleta puede repetir un
										    mismo tono en dos casillas (la institucional usa el rojo
										    como secundario y como marca). */}
										{p.muestras.map((c, i) => (
											<span
												key={i}
												style={{ background: c }}
												className="ring-foreground/15 size-3.5 rounded-[3px] ring-1 ring-inset"
											/>
										))}
									</span>
								</span>
								<span className="text-muted-foreground text-xs leading-snug text-balance">
									{p.detalle}
								</span>
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export default SelectorPaleta
