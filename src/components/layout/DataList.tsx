import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const SPAN = {
	2: "sm:col-span-2",
	3: "sm:col-span-3",
	4: "sm:col-span-4",
	6: "sm:col-span-6",
	12: "sm:col-span-12",
} as const

/** Datos en solo lectura, en la misma rejilla de 12 columnas que el formulario. */
export function DataList({ children }: { children: ReactNode }) {
	return <dl className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-12">{children}</dl>
}

export function DataItem({
	label,
	value,
	span = 6,
	mono,
}: {
	label: string
	value: ReactNode
	span?: keyof typeof SPAN
	/** Códigos, CURP, hashes. */
	mono?: boolean
}) {
	const vacio = value === null || value === undefined || value === ""
	return (
		<div className={cn("min-w-0 space-y-1", SPAN[span])}>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			{/* min-h-5: el renglón existe aunque el dato venga vacío, para no desalinear la rejilla */}
			<dd className={cn("min-h-5 text-sm break-words", mono && "font-mono")}>
				{vacio ? <span className="text-muted-foreground">—</span> : value}
			</dd>
		</div>
	)
}
