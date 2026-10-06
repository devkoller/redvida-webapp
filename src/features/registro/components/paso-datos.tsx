import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Minus } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { Controller, useForm } from "react-hook-form"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useFetch } from "@/hooks/useFetch"
import { usePost } from "@/hooks/usePost"
import { cn } from "@/lib/utils"
import { useRegistroStore } from "@/stores/registroStore"
import type { EstadoCatalogo, MunicipioCatalogo, OpcionCatalogo, RespuestaAlta } from "@/types/api"
import {
	EDAD_MAXIMA,
	EDAD_MINIMA,
	aPayloadAlta,
	calcularEdad,
	datosPersonalesSchema,
	type DatosPersonalesForm,
} from "../data/schema"
import { ErrorSummary } from "./error-summary"
import { SiNoBotones } from "./si-no-botones"

/** Los catálogos casi no cambian; 10 minutos evita repedirlos en cada paso. */
const STALE_CATALOGOS = 10 * 60 * 1000

export function PasoDatos() {
	const { datos, setDatos, setAlta, setDeclino } = useRegistroStore()

	const { response: sexos } = useFetch<OpcionCatalogo[]>({
		url: ENDPOINTS.catalogo("sexo"),
		staleTime: STALE_CATALOGOS,
	})
	const { response: paises } = useFetch<OpcionCatalogo[]>({
		url: ENDPOINTS.catalogo("pais"),
		staleTime: STALE_CATALOGOS,
	})

	// En demostración el formulario se envía como esté: el objetivo es recorrer
	// las pantallas, no capturar a nadie.
	const demo = __DEMO__

	const form = useForm<DatosPersonalesForm>({
		resolver: demo ? undefined : zodResolver(datosPersonalesSchema),
		mode: "onBlur",
		defaultValues: {
			nombre: "",
			apellido_pat: "",
			apellido_mat: "",
			fecha_nacimiento: "",
			sexo_id: "",
			curp: "",
			email: "",
			telefono: "",
			celular: "",
			direccion: "",
			codigo_postal: "",
			pais_id: "",
			estado_id: "",
			municipio_id: "",
			...datos,
		},
	})

	const paisId = form.watch("pais_id")
	const estadoId = form.watch("estado_id")

	// Selects dependientes: los estados solo se piden cuando hay país.
	const { response: estados } = useFetch<EstadoCatalogo[]>({
		url: ENDPOINTS.estadosPorPais(paisId || 0),
		enabled: Boolean(paisId),
		staleTime: STALE_CATALOGOS,
	})
	const { response: municipios } = useFetch<MunicipioCatalogo[]>({
		url: ENDPOINTS.municipiosPorEstado(estadoId || 0),
		enabled: Boolean(estadoId),
		staleTime: STALE_CATALOGOS,
	})

	// Cambiar de país invalida el estado elegido, y con él el municipio. Sin
	// esto quedaría un municipio de Jalisco bajo un país distinto.
	useEffect(() => {
		if (form.formState.dirtyFields.pais_id) {
			form.setValue("estado_id", "")
			form.setValue("municipio_id", "")
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paisId])

	useEffect(() => {
		if (form.formState.dirtyFields.estado_id) form.setValue("municipio_id", "")
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [estadoId])

	const { execute, loading, error } = usePost<RespuestaAlta>()
	const apiError = error as ApiError | null

	// La edad se recalcula al vuelo desde el campo de fecha: el requisito se
	// muestra cumplido en cuanto la persona escribe una fecha válida, sin
	// esperar al envío.
	const edad = calcularEdad(form.watch("fecha_nacimiento") ?? "")
	const edadCumple = edad !== null && edad >= EDAD_MINIMA && edad <= EDAD_MAXIMA

	// Honeypot: campo señuelo que solo un bot rellena. Se lee del DOM al enviar
	// en vez de pasar por react-hook-form, para que no aparezca en el estado del
	// formulario ni se persista en el store.
	const trampaRef = useRef<HTMLInputElement>(null)

	const onSubmit = async (valores: DatosPersonalesForm) => {
		setDatos(valores)
		try {
			const respuesta = await execute({
				url: ENDPOINTS.donadores,
				body: { ...aPayloadAlta(valores), sitio_web: trampaRef.current?.value ?? "" },
			})
			setAlta({
				donadorId: respuesta.id,
				codigoRegistro: respuesta.codigo_registro,
				otpEnviado: respuesta.otp_enviado,
			})
			if (respuesta.reanudado) {
				toast.info("Usted ya había iniciado su registro", {
					description: respuesta.otp_enviado
						? "Le enviamos otro código a su correo para que confirme su cuenta."
						: "Generamos un código nuevo, pero no pudimos enviarlo por correo.",
					duration: 10000,
				})
			}
		} catch {
			// El error ya está en `apiError`; se pinta con ErrorSummary. Los
			// errores por campo del backend se marcan abajo, en cada input.
		}
	}

	// Quien responde "No" a donar a cualquier paciente compatible no puede
	// registrarse, y pedirle que antes corrija CURP o teléfono para decirle que
	// no sería un trato digno: se salta la validación, no se envía nada y se
	// pasa a la pantalla de agradecimiento.
	const alEnviar = (evento: React.FormEvent<HTMLFormElement>) => {
		if (form.getValues("acepta_donar") === false) {
			evento.preventDefault()
			setDeclino(true)
			return
		}
		return form.handleSubmit(onSubmit)(evento)
	}

	/** Mensaje del backend para un campo concreto, si lo hubo. */
	const errorDeCampo = (campo: string) => apiError?.errores.find((e) => e.campo === campo)?.mensaje

	const mensajeError = (campo: keyof DatosPersonalesForm) =>
		form.formState.errors[campo]?.message || errorDeCampo(campo)

	return (
		<form onSubmit={alEnviar} noValidate className="space-y-6">
			{/* Honeypot. Oculto para personas —incluidos lectores de pantalla, por
			    `aria-hidden` y `tabindex="-1"`— pero visible para un bot que
			    rellena todos los inputs del DOM. No se usa `type="hidden"`: los
			    bots suelen ignorarlos. */}
			<div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
				<label htmlFor="sitio_web">No llene este campo</label>
				<input
					id="sitio_web"
					ref={trampaRef}
					type="text"
					name="sitio_web"
					tabIndex={-1}
					autoComplete="off"
					defaultValue=""
				/>
			</div>

			<ErrorSummary
				mensaje={apiError?.message}
				errores={apiError?.errores.filter(
					(e) => !mensajeError(e.campo as keyof DatosPersonalesForm),
				)}
			/>

			<fieldset className="space-y-4">
				<legend className="text-base font-semibold">Datos personales</legend>

				<div className="grid gap-4 sm:grid-cols-3">
					<Campo etiqueta="Nombre(s)" requerido error={mensajeError("nombre")} htmlFor="nombre">
						<Input id="nombre" autoComplete="given-name" {...form.register("nombre")} />
					</Campo>
					<Campo
						etiqueta="Apellido paterno"
						requerido
						error={mensajeError("apellido_pat")}
						htmlFor="apellido_pat"
					>
						<Input
							id="apellido_pat"
							autoComplete="family-name"
							{...form.register("apellido_pat")}
						/>
					</Campo>
					<Campo
						etiqueta="Apellido materno"
						error={mensajeError("apellido_mat")}
						htmlFor="apellido_mat"
					>
						<Input id="apellido_mat" {...form.register("apellido_mat")} />
					</Campo>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Campo
						etiqueta="Fecha de nacimiento"
						requerido
						error={mensajeError("fecha_nacimiento")}
						htmlFor="fecha_nacimiento"
						ayuda="Debe tener entre 18 y 35 años cumplidos"
					>
						<Input
							id="fecha_nacimiento"
							type="date"
							autoComplete="bday"
							{...form.register("fecha_nacimiento")}
						/>
					</Campo>

					<Campo etiqueta="Sexo" requerido error={mensajeError("sexo_id")} htmlFor="sexo_id">
						<Select
							value={form.watch("sexo_id")}
							onValueChange={(valor) =>
								form.setValue("sexo_id", valor, { shouldValidate: true, shouldDirty: true })
							}
						>
							<SelectTrigger id="sexo_id" className="w-full">
								<SelectValue placeholder="Seleccione" />
							</SelectTrigger>
							<SelectContent>
								{(sexos ?? []).map((opcion) => (
									<SelectItem key={opcion.id} value={String(opcion.id)}>
										{opcion.nombre}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Campo>
				</div>

				<Campo
					etiqueta="CURP"
					requerido
					error={mensajeError("curp")}
					htmlFor="curp"
					ayuda="18 caracteres. Debe coincidir con su nombre, fecha de nacimiento y sexo"
				>
					<Input
						id="curp"
						maxLength={18}
						className="uppercase"
						autoCapitalize="characters"
						spellCheck={false}
						{...form.register("curp")}
					/>
				</Campo>
			</fieldset>

			<fieldset className="space-y-4">
				<legend className="text-base font-semibold">Contacto</legend>

				<Campo
					etiqueta="Correo electrónico"
					requerido
					error={mensajeError("email")}
					htmlFor="email"
					ayuda="Le enviaremos un código de verificación a esta dirección"
				>
					<Input id="email" type="email" autoComplete="email" {...form.register("email")} />
				</Campo>

				<div className="grid gap-4 sm:grid-cols-2">
					<Campo etiqueta="Teléfono" error={mensajeError("telefono")} htmlFor="telefono">
						<Input id="telefono" type="tel" autoComplete="tel" {...form.register("telefono")} />
					</Campo>
					<Campo etiqueta="Celular" error={mensajeError("celular")} htmlFor="celular">
						<Input id="celular" type="tel" {...form.register("celular")} />
					</Campo>
				</div>
			</fieldset>

			<fieldset className="space-y-4">
				<legend className="text-base font-semibold">Domicilio</legend>

				<div className="grid gap-4 sm:grid-cols-2">
					<Campo etiqueta="Calle y número" error={mensajeError("direccion")} htmlFor="direccion">
						<Input id="direccion" autoComplete="street-address" {...form.register("direccion")} />
					</Campo>
					<Campo
						etiqueta="Código postal"
						error={mensajeError("codigo_postal")}
						htmlFor="codigo_postal"
					>
						<Input
							id="codigo_postal"
							inputMode="numeric"
							autoComplete="postal-code"
							{...form.register("codigo_postal")}
						/>
					</Campo>
				</div>

				<div className="grid gap-4 sm:grid-cols-3">
					<Campo etiqueta="País" error={mensajeError("pais_id")} htmlFor="pais_id">
						<Combobox
							id="pais_id"
							value={form.watch("pais_id")}
							onValueChange={(valor) => form.setValue("pais_id", valor, { shouldDirty: true })}
							opciones={(paises ?? []).map((o) => ({ value: String(o.id), label: o.nombre }))}
							placeholder={"Seleccione"}
							placeholderBusqueda="Buscar pais…"
						/>
					</Campo>

					<Campo etiqueta="Estado" error={mensajeError("estado_id")} htmlFor="estado_id">
						<Combobox
							id="estado_id"
							value={form.watch("estado_id")}
							disabled={!paisId}
							onValueChange={(valor) => form.setValue("estado_id", valor, { shouldDirty: true })}
							opciones={(estados ?? []).map((o) => ({ value: String(o.id), label: o.nombre }))}
							placeholder={paisId ? "Seleccione" : "Elija país primero"}
							placeholderBusqueda="Buscar estado…"
						/>
					</Campo>

					<Campo etiqueta="Municipio" error={mensajeError("municipio_id")} htmlFor="municipio_id">
						<Combobox
							id="municipio_id"
							value={form.watch("municipio_id")}
							disabled={!estadoId || (municipios ?? []).length === 0}
							onValueChange={(valor) => form.setValue("municipio_id", valor, { shouldDirty: true })}
							opciones={(municipios ?? []).map((o) => ({ value: String(o.id), label: o.nombre }))}
							placeholder={estadoId ? "Seleccione" : "Elija estado primero"}
							placeholderBusqueda="Buscar municipio…"
						/>
					</Campo>
				</div>
			</fieldset>

			{/* Sección 1 del cuestionario de elegibilidad de Red Vida.
          Va al final del paso a propósito: es el compromiso que se asume justo
          antes de enviar, no un trámite que se despacha al principio. */}
			<fieldset className="space-y-4">
				<legend className="text-base font-semibold">Requisitos generales</legend>

				<div className="border-border/60 space-y-4 rounded-lg border p-4">
					{/* La edad no se pregunta: se comprueba. Se muestra ya resuelta para que
                    la persona vea el requisito cumplido, como en el formulario en papel. */}
					<div className="flex items-start gap-2.5 text-sm">
						{edadCumple ? (
							<Check aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
						) : (
							<Minus aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
						)}
						<p className={edadCumple ? "" : "text-muted-foreground"}>
							Tener entre {EDAD_MINIMA} y {EDAD_MAXIMA} años cumplidos.{" "}
							{edadCumple ? (
								<span className="text-success font-medium">Cumple: {edad} años.</span>
							) : (
								<span>Se comprueba con su fecha de nacimiento.</span>
							)}
						</p>
					</div>

					<Separator />

					<div className="space-y-3">
						<p id="acepta-donar-texto" className="text-sm">
							¿Tiene la disposición de donar células progenitoras o médula ósea para cualquier
							paciente compatible?
							<span className="text-destructive ml-1" aria-label="obligatorio">
								*
							</span>
						</p>

						<Controller
							control={form.control}
							name="acepta_donar"
							render={({ field }) => (
								<SiNoBotones
									idBase="acepta-donar"
									value={field.value}
									onChange={field.onChange}
									aria-labelledby="acepta-donar-texto"
								/>
							)}
						/>

						{mensajeError("acepta_donar") && (
							<p className="text-destructive text-xs font-medium">{mensajeError("acepta_donar")}</p>
						)}
					</div>
				</div>
			</fieldset>

			<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
				<Button type="submit" size="lg" disabled={loading}>
					{loading ? "Registrando…" : "Continuar"}
				</Button>
			</div>
		</form>
	)
}

/** Campo con etiqueta, ayuda y error correctamente asociados por `aria`. */
function Campo({
	etiqueta,
	htmlFor,
	error,
	ayuda,
	requerido,
	children,
}: {
	etiqueta: string
	htmlFor: string
	error?: string
	ayuda?: string
	requerido?: boolean
	children: React.ReactNode
}) {
	const idAyuda = ayuda ? `${htmlFor}-ayuda` : undefined
	const idError = error ? `${htmlFor}-error` : undefined

	return (
		<div className="space-y-1.5">
			<Label htmlFor={htmlFor}>
				{etiqueta}
				{requerido && (
					<span className="text-destructive" aria-label="obligatorio">
						*
					</span>
				)}
			</Label>
			<div
				className={cn("[&_input]:w-full", error && "[&_input]:border-destructive")}
				aria-describedby={[idAyuda, idError].filter(Boolean).join(" ") || undefined}
			>
				{children}
			</div>
			{ayuda && !error && (
				<p id={idAyuda} className="text-muted-foreground text-xs">
					{ayuda}
				</p>
			)}
			{error && (
				<p id={idError} className="text-destructive text-xs font-medium">
					{error}
				</p>
			)}
		</div>
	)
}

export default PasoDatos
