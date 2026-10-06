import { Check } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface SiNoBotonesProps {
	/** `undefined` = sin responder. */
	value: boolean | undefined
	onChange: (valor: boolean) => void
	/** Id del nombre accesible (etiqueta visible) del grupo. */
	"aria-labelledby"?: string
	"aria-label"?: string
	idBase: string
}

const OPCIONES = [
	{ valor: "si", etiqueta: "Sí" },
	{ valor: "no", etiqueta: "No" },
] as const

/**
 * Sí / No como dos botones. Sigue siendo un grupo de radio (flechas, Tab y
 * lectores de pantalla funcionan igual), pero la opción elegida se ve de un
 * vistazo: relleno sólido y una marca de verificación, que no depende solo del
 * color (WCAG 1.4.1).
 */
export function SiNoBotones({ value, onChange, idBase, ...aria }: SiNoBotonesProps) {
	return (
		<RadioGroupPrimitive.Root
			className="flex shrink-0 gap-2"
			value={value === undefined ? "" : value ? "si" : "no"}
			onValueChange={(v) => onChange(v === "si")}
			{...aria}
		>
			{OPCIONES.map(({ valor, etiqueta }) => (
				<RadioGroupPrimitive.Item
					key={valor}
					id={`${idBase}-${valor}`}
					value={valor}
					className={cn(
						"border-input text-foreground hover:bg-accent focus-visible:ring-ring/50 inline-flex h-10 min-w-20 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]",
						"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-sm",
					)}
				>
					<RadioGroupPrimitive.Indicator asChild>
						<Check aria-hidden className="size-4" />
					</RadioGroupPrimitive.Indicator>
					{etiqueta}
				</RadioGroupPrimitive.Item>
			))}
		</RadioGroupPrimitive.Root>
	)
}
