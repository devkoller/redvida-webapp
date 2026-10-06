import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { DayPicker } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: React.ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			mode="single"
			locale={es}
			components={{
				Chevron: ({ orientation = "left", className: claseIcono }) =>
					orientation === "right" ? (
						<ChevronRight className={cn("size-4", claseIcono)} />
					) : (
						<ChevronLeft className={cn("size-4", claseIcono)} />
					),
			}}
			classNames={{
				months: "flex flex-col gap-2",
				month: "flex flex-col gap-4",
				month_caption: "flex justify-center pt-1 relative items-center w-full capitalize",
				caption_label: "text-sm font-medium",
				nav: "flex items-center gap-1",
				button_previous: cn(
					buttonVariants({ variant: "outline" }),
					"absolute left-1 top-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				button_next: cn(
					buttonVariants({ variant: "outline" }),
					"absolute right-1 top-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				),
				month_grid: "w-full border-collapse",
				weekdays: "grid grid-cols-7",
				weekday: "text-muted-foreground text-center text-xs font-medium",
				week: "mt-1 grid grid-cols-7",
				day: "p-0 text-center text-sm",
				day_button: cn(
					buttonVariants({ variant: "ghost" }),
					"mx-auto size-9 rounded-full p-0 font-normal aria-selected:opacity-100",
				),
				// Un anillo, no un color de fondo: el fondo ya lo puede estar usando
				// un modificador de disponibilidad (verde/ámbar/rojo), y el anillo
				// se ve encima de cualquiera de los tres sin competir por la misma
				// propiedad.
				selected:
					"[&>button]:ring-foreground [&>button]:ring-2 [&>button]:ring-offset-2 [&>button]:ring-offset-background",
				today: "[&>button]:ring-primary/40 [&>button]:ring-2",
				outside: "text-muted-foreground opacity-50",
				disabled: "text-muted-foreground opacity-30",
				hidden: "invisible",
				...classNames,
			}}
			{...props}
		/>
	)
}

export { Calendar }
