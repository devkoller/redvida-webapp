import { Image as ImageIcon } from "lucide-react"

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
import { LOGOS, type LogoId } from "@/lib/logos"

/**
 * Elige cuál de las 3 propuestas de logo se usa en toda la página.
 *
 * Mismo patrón que `SelectorPaleta`: es una herramienta para decidir la
 * identidad de Red Vida, no una preferencia de quien visita, así que muestra
 * cada logo en miniatura y no solo su nombre.
 *
 * Cambia el logo en encabezado, pie, panel administrativo y el ícono de la
 * pestaña del navegador — los cuatro leen el mismo estado desde
 * `ThemeProvider`, así que esta es la única pieza que necesita saber que
 * existen esas cuatro ubicaciones.
 */
export function SelectorLogo() {
	const { logo, setLogo } = useTheme()
	const actual = LOGOS.find((l) => l.id === logo) ?? LOGOS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={`Logo: ${actual.nombre}`}>
					<ImageIcon className="size-4" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Logo</DropdownMenuLabel>
				<DropdownMenuSeparator />

				<DropdownMenuRadioGroup value={logo} onValueChange={(v) => setLogo(v as LogoId)}>
					{LOGOS.map((l) => (
						<DropdownMenuRadioItem key={l.id} value={l.id} className="items-center py-2">
							<span className="flex min-w-0 flex-1 items-center gap-3">
								<span
									aria-hidden
									className="bg-muted/60 grid size-8 shrink-0 place-items-center rounded-md"
								>
									{l.archivo ? (
										<img src={l.archivo} alt="" className="size-6 object-contain" />
									) : (
										<span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded text-[10px] font-bold">
											RV
										</span>
									)}
								</span>
								<span className="font-medium">{l.nombre}</span>
							</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export default SelectorLogo
