import { Link } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Contenedor del área de trabajo del panel. El `<main>` del AdminShell solo
 * reserva la sidebar: el padding de página, el ancho máximo y el ritmo vertical
 * viven aquí, una sola vez. Ver DESIGN.md §4 y §5.
 */
export function PageShell({
	children,
	className,
	width = "default",
}: {
	children: ReactNode
	className?: string
	/** 'default' listados y tableros · 'narrow' formularios y detalles · 'full' tablas muy anchas */
	width?: "default" | "narrow" | "full"
}) {
	return (
		<div
			className={cn(
				"mx-auto w-full space-y-6 px-4 py-6 sm:px-6",
				width === "default" && "max-w-6xl",
				width === "narrow" && "max-w-4xl",
				className,
			)}
		>
			{children}
		</div>
	)
}

/** Encabezado único de la pantalla. `min-h-16` evita saltos si una acción aparece o desaparece. */
export function PageHeader({
	title,
	description,
	actions,
	breadcrumb,
}: {
	title: ReactNode
	description?: ReactNode
	actions?: ReactNode
	breadcrumb?: ReactNode
}) {
	return (
		<div className="flex min-h-16 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 space-y-1">
				{breadcrumb}
				<h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
				{description && <p className="text-muted-foreground text-sm">{description}</p>}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	)
}

/** Sección con título dentro de una página. Alternativa plana a anidar cards. */
export function PageSection({
	title,
	description,
	actions,
	children,
}: {
	title?: string
	description?: string
	actions?: ReactNode
	children: ReactNode
}) {
	return (
		<section className="space-y-4">
			{(title || actions) && (
				<div className="flex items-center justify-between gap-3">
					<div className="space-y-1">
						{title && <h2 className="text-base font-semibold">{title}</h2>}
						{description && <p className="text-muted-foreground text-xs">{description}</p>}
					</div>
					{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
				</div>
			)}
			{children}
		</section>
	)
}

/** Enlace de regreso para el breadcrumb de detalle y formularios. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
	return (
		<Link
			to={to}
			className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
		>
			<ChevronLeft className="size-4" aria-hidden="true" />
			{children}
		</Link>
	)
}
