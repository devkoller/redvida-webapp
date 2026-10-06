import { AlertCircle, FileX } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Skeleton con la forma de la tabla final: mismas filas (`h-12`), sin saltos al cargar. */
export function TablaSkeleton({ rows = 8 }: { rows?: number }) {
	return (
		<div className="divide-y" aria-hidden="true">
			{Array.from({ length: rows }, (_, i) => (
				<div key={i} className="flex h-12 items-center gap-4 px-4">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-4 w-44" />
					<Skeleton className="h-4 flex-1" />
					<Skeleton className="h-5 w-24" />
				</div>
			))}
		</div>
	)
}

export function EmptyState({
	title,
	description,
	action,
	compact,
}: {
	title: string
	description?: string
	action?: ReactNode
	compact?: boolean
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3 text-center",
				compact ? "py-8" : "py-12",
			)}
		>
			<FileX className="text-muted-foreground size-10" strokeWidth={1.5} aria-hidden="true" />
			<div className="space-y-1">
				<p className="text-sm font-medium">{title}</p>
				{description && <p className="text-muted-foreground text-xs">{description}</p>}
			</div>
			{action}
		</div>
	)
}

export function ErrorState({
	title = "No pudimos cargar la información.",
	description = "Revise su conexión e inténtelo de nuevo.",
	onRetry,
}: {
	title?: string
	description?: string
	onRetry?: () => void
}) {
	return (
		<div role="alert" className="flex flex-col items-center justify-center gap-3 py-12 text-center">
			<AlertCircle className="text-destructive size-10" strokeWidth={1.5} aria-hidden="true" />
			<div className="space-y-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			{onRetry && (
				<Button size="sm" variant="outline" onClick={onRetry}>
					Reintentar
				</Button>
			)}
		</div>
	)
}
