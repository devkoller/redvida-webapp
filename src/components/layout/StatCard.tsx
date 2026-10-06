import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"

/** KPI de altura fija: etiqueta arriba, valor grande, apoyo abajo. */
export function StatCard({
	label,
	value,
	hint,
	icon,
	tone,
}: {
	label: string
	value: ReactNode
	hint?: ReactNode
	icon?: ReactNode
	/** `warning` cuando el número pide atención. El color nunca es la única señal: el hint lo explica. */
	tone?: "warning"
}) {
	return (
		<Card className="gap-2 py-4">
			<CardContent className="space-y-2">
				<div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
					<span>{label}</span>
					{icon}
				</div>
				<p className="flex min-h-8 items-center gap-2 text-2xl font-semibold tabular-nums">
					{tone === "warning" && (
						<span className="bg-warning size-2 shrink-0 rounded-full" aria-hidden="true" />
					)}
					{value}
				</p>
				<p className="text-muted-foreground min-h-8 text-xs">{hint}</p>
			</CardContent>
		</Card>
	)
}
