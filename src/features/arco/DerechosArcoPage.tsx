import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Copy, Loader2, Search } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
	ETIQUETA_ESTATUS,
	ETIQUETA_TIPO,
	type AcuseSolicitud,
	type TipoArco,
	consultarFolio,
	crearSolicitud,
	listarDerechos,
} from "./api"

const esquema = z.object({
	tipo: z.string().min(1, "Elija el derecho que desea ejercer"),
	solicitante_nombre: z.string().trim().min(3, "Escriba su nombre completo"),
	solicitante_email: z.string().trim().email("Escriba un correo electrónico válido"),
	solicitante_telefono: z.string().trim().optional(),
	codigo_registro: z.string().trim().optional(),
	descripcion: z.string().trim().min(10, "Describa su solicitud con al menos 10 caracteres"),
})

type Formulario = z.infer<typeof esquema>

export function DerechosArcoPage() {
	const [acuse, setAcuse] = useState<AcuseSolicitud | null>(null)

	const { data: derechos } = useQuery({
		queryKey: ["arco", "derechos"],
		queryFn: listarDerechos,
		staleTime: 60 * 60 * 1000,
	})

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { tipo: "" } })

	const tipoElegido = watch("tipo")

	const mutacion = useMutation({
		mutationFn: (datos: Formulario) => crearSolicitud(datos as never),
		onSuccess: (datos) => {
			setAcuse(datos)
			window.scrollTo({ top: 0, behavior: "smooth" })
		},
		onError: (error) => {
			toast.error(
				error instanceof ApiError ? error.message : "No fue posible enviar su solicitud",
			)
		},
	})

	if (acuse) return <Acuse acuse={acuse} />

	return (
		<div className="mx-auto max-w-3xl px-4 py-12">
			<h1 className="text-3xl font-bold tracking-tight">Sus derechos sobre sus datos</h1>
			<p className="text-muted-foreground mt-3">
				Los datos que nos dio son suyos, no nuestros. Puede pedirnos verlos, corregirlos,
				eliminarlos o salir del registro cuando quiera, sin dar explicaciones y sin costo.
			</p>

			<form onSubmit={handleSubmit((d) => mutacion.mutate(d))} className="mt-10 space-y-8" noValidate>
				<fieldset>
					<legend className="text-lg font-semibold">¿Qué desea hacer?</legend>
					<RadioGroup
						className="mt-4 space-y-3"
						value={tipoElegido}
						onValueChange={(valor) => setValue("tipo", valor, { shouldValidate: true })}
					>
						{derechos?.map((derecho) => (
							<label
								key={derecho.clave}
								htmlFor={`derecho-${derecho.clave}`}
								className="hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors"
							>
								<RadioGroupItem
									value={derecho.clave}
									id={`derecho-${derecho.clave}`}
									className="mt-1"
								/>
								<span className="block">
									<span className="block font-medium">{derecho.titulo}</span>
									<span className="text-muted-foreground mt-0.5 block text-sm">
										{derecho.descripcion}
									</span>
								</span>
							</label>
						))}
					</RadioGroup>
					{errors.tipo && (
						<p role="alert" className="text-destructive mt-2 text-sm">
							{errors.tipo.message}
						</p>
					)}
				</fieldset>

				<Separator />

				<div className="grid gap-5 sm:grid-cols-2">
					<Campo
						id="solicitante_nombre"
						etiqueta="Nombre completo"
						error={errors.solicitante_nombre?.message}
						registro={register("solicitante_nombre")}
						autoComplete="name"
					/>
					<Campo
						id="solicitante_email"
						etiqueta="Correo electrónico"
						ayuda="Aquí le enviaremos su folio y nuestra respuesta."
						error={errors.solicitante_email?.message}
						registro={register("solicitante_email")}
						autoComplete="email"
						type="email"
					/>
					<Campo
						id="solicitante_telefono"
						etiqueta="Teléfono (opcional)"
						error={errors.solicitante_telefono?.message}
						registro={register("solicitante_telefono")}
						autoComplete="tel"
					/>
					<Campo
						id="codigo_registro"
						etiqueta="Código de registro (opcional)"
						ayuda="Si lo conserva, nos ayuda a localizar su expediente más rápido."
						error={errors.codigo_registro?.message}
						registro={register("codigo_registro")}
						placeholder="RVMX-…"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="descripcion" className="block">
						Cuéntenos qué necesita
					</Label>
					<textarea
						id="descripcion"
						rows={5}
						className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
						aria-invalid={!!errors.descripcion}
						aria-describedby={errors.descripcion ? "error-descripcion" : undefined}
						{...register("descripcion")}
					/>
					{errors.descripcion && (
						<p id="error-descripcion" role="alert" className="text-destructive text-sm">
							{errors.descripcion.message}
						</p>
					)}
				</div>

				<div className="bg-muted/50 rounded-lg border p-4 text-sm">
					<p>
						Antes de resolver, tendremos que confirmar que usted es la persona titular de los
						datos. Podremos pedirle una identificación oficial por un medio seguro; nunca se
						la pediremos por correo electrónico ni por teléfono.
					</p>
				</div>

				<Button type="submit" size="lg" disabled={mutacion.isPending}>
					{mutacion.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
					Enviar solicitud
				</Button>
			</form>

			<Separator className="my-12" />
			<ConsultaPorFolio />
		</div>
	)
}

function Campo({
	id,
	etiqueta,
	ayuda,
	error,
	registro,
	...resto
}: {
	id: string
	etiqueta: string
	ayuda?: string
	error?: string
	registro: ReturnType<ReturnType<typeof useForm<Formulario>>["register"]>
} & React.InputHTMLAttributes<HTMLInputElement>) {
	const idAyuda = ayuda ? `${id}-ayuda` : undefined
	const idError = error ? `${id}-error` : undefined

	return (
		<div className="space-y-2">
			<Label htmlFor={id} className="block">
				{etiqueta}
			</Label>
			<Input
				id={id}
				aria-invalid={!!error}
				aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
				{...registro}
				{...resto}
			/>
			{ayuda && (
				<p id={idAyuda} className="text-muted-foreground text-xs">
					{ayuda}
				</p>
			)}
			{error && (
				<p id={idError} role="alert" className="text-destructive text-sm">
					{error}
				</p>
			)}
		</div>
	)
}

/** Acuse de recibo. El folio es lo único que el titular necesita conservar. */
function Acuse({ acuse }: { acuse: AcuseSolicitud }) {
	const copiar = async () => {
		await navigator.clipboard.writeText(acuse.folio)
		toast.success("Folio copiado")
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-16">
			<div className="flex flex-col items-center text-center">
				<CheckCircle2 className="text-primary-accent size-12" aria-hidden="true" />
				<h1 className="mt-4 text-3xl font-bold tracking-tight">Recibimos su solicitud</h1>
				<p className="text-muted-foreground mt-3">
					También le enviamos este folio a su correo electrónico.
				</p>
			</div>

			<Card className="mt-8">
				<CardContent className="space-y-4 pt-6">
					<div>
						<p className="text-muted-foreground text-sm">Su folio</p>
						<div className="mt-1 flex items-center gap-3">
							<p className="font-mono text-2xl font-semibold tracking-wider">{acuse.folio}</p>
							<Button variant="ghost" size="sm" onClick={copiar}>
								<Copy className="size-4" aria-hidden="true" />
								<span className="sr-only sm:not-sr-only">Copiar</span>
							</Button>
						</div>
					</div>
					<Separator />
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-sm">Derecho ejercido</p>
							<p className="font-medium">{ETIQUETA_TIPO[acuse.tipo]}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Le responderemos antes del</p>
							<p className="font-medium">{acuse.fecha_limite_respuesta}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<p className="text-muted-foreground mt-6 text-center text-sm">
				Guarde el folio: con él puede consultar el avance de su solicitud en cualquier momento.
			</p>
		</div>
	)
}

function ConsultaPorFolio() {
	const [folio, setFolio] = useState("")
	const [consultado, setConsultado] = useState<string | null>(null)

	const { data, error, isFetching } = useQuery({
		queryKey: ["arco", "folio", consultado],
		queryFn: () => consultarFolio(consultado!),
		enabled: !!consultado,
		retry: false,
	})

	return (
		<section>
			<h2 className="text-2xl font-bold tracking-tight">Consultar una solicitud</h2>
			<p className="text-muted-foreground mt-2 text-sm">
				Si ya presentó una solicitud, escriba el folio que le enviamos.
			</p>

			<form
				className="mt-4 flex flex-col gap-3 sm:flex-row"
				onSubmit={(evento) => {
					evento.preventDefault()
					setConsultado(folio.trim().toUpperCase() || null)
				}}
			>
				<div className="flex-1">
					<Label htmlFor="folio" className="sr-only">
						Folio de la solicitud
					</Label>
					<Input
						id="folio"
						value={folio}
						onChange={(evento) => setFolio(evento.target.value)}
						placeholder="ARCO-2026-XXXXXXXX"
						className="font-mono"
					/>
				</div>
				<Button type="submit" variant="outline" disabled={isFetching}>
					<Search className="size-4" aria-hidden="true" />
					Consultar
				</Button>
			</form>

			{error && (
				<p role="alert" className="text-destructive mt-4 text-sm">
					{error instanceof ApiError ? error.message : "No fue posible consultar el folio"}
				</p>
			)}

			{data && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="font-mono text-lg">{data.folio}</CardTitle>
						<CardDescription>
							{ETIQUETA_TIPO[data.tipo]} · presentada el{" "}
							{new Date(data.fecha_solicitud).toLocaleDateString("es-MX")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div>
							<p className="text-muted-foreground text-sm">Estado</p>
							<p className="font-medium">{ETIQUETA_ESTATUS[data.estatus]}</p>
						</div>
						{data.respuesta ? (
							<div>
								<p className="text-muted-foreground text-sm">Nuestra respuesta</p>
								<p className="mt-1 whitespace-pre-line">{data.respuesta}</p>
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								Le responderemos a más tardar el {data.fecha_limite_respuesta}.
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</section>
	)
}

/** Se reexporta para que la ruta no dependa del nombre interno del archivo. */
export type { TipoArco }
