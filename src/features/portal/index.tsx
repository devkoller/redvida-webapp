import { Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import {
	AlertTriangle,
	CalendarCheck,
	CalendarX2,
	ClipboardList,
	Download,
	LogOut,
	MailCheck,
	ShieldAlert,
	UserRound,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import fetchApi, { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { usePortalStore } from "@/stores/portalStore"
import { ErrorSummary } from "../registro/components/error-summary"
import { PasoElegibilidad } from "../registro/components/paso-elegibilidad"
import { SelectorCita } from "../registro/components/selector-cita"

interface ResumenPortal {
	nombre: string
	codigo_registro: string
	estatus: string
	elegibilidad: {
		resultado: "apto" | "no_apto_temporal" | "no_apto_permanente"
		bloqueado_hasta: string | null
	} | null
	cita: { folio: string; fecha: string; hora: string; vencida: boolean } | null
	baja_solicitada: { folio: string } | null
}

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const SEGUNDOS_REENVIO = 60

const fechaLarga = (fecha: string) =>
	new Date(`${fecha}T12:00:00`).toLocaleDateString("es-MX", { dateStyle: "full" })

const mensaje = (error: unknown, defecto: string) =>
	error instanceof Error ? error.message : defecto

/**
 * Portal del donador: ver o cambiar la cita, reimprimir el comprobante,
 * contestar el cuestionario pendiente o pedir la baja de los datos.
 *
 * El acceso es por código enviado al correo (OTP), igual que el portal de citas
 * del banco de sangre. La sesión vive solo en memoria: recargar la página la
 * cierra.
 */
export function PortalPage() {
	const token = usePortalStore((estado) => estado.token)

	return (
		<div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
			<header className="mb-8">
				<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi cita y mis datos</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Consulte o cambie su cita, descargue su comprobante o solicite la baja de sus datos.
				</p>
			</header>
			{token ? <Panel /> : <Acceso />}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Acceso por OTP
// ---------------------------------------------------------------------------

function Acceso() {
	const iniciar = usePortalStore((estado) => estado.iniciar)
	const [email, setEmail] = useState("")
	const [otp, setOtp] = useState("")
	const [enviado, setEnviado] = useState(false)
	const [restante, setRestante] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const [cargando, setCargando] = useState(false)
	const codigoRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (restante <= 0) return
		const id = setTimeout(() => setRestante((v) => v - 1), 1000)
		return () => clearTimeout(id)
	}, [restante])

	useEffect(() => {
		if (enviado) codigoRef.current?.focus()
	}, [enviado])

	const pedirCodigo = async (event?: React.FormEvent) => {
		event?.preventDefault()
		if (!RE_EMAIL.test(email.trim())) return setError("Escriba un correo electrónico válido")
		setError(null)
		setCargando(true)
		try {
			await fetchApi.post(ENDPOINTS.portalOtp, { email: email.trim() })
			setEnviado(true)
			setOtp("")
			setRestante(SEGUNDOS_REENVIO)
		} catch (e) {
			setError(mensaje(e, "No fue posible enviar el código"))
		} finally {
			setCargando(false)
		}
	}

	const entrar = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!/^\d{6}$/.test(otp)) return
		setError(null)
		setCargando(true)
		try {
			const { token } = await fetchApi.post<{ token: string }>(ENDPOINTS.portalSesion, {
				email: email.trim(),
				otp,
			})
			iniciar(token)
		} catch (e) {
			setError(mensaje(e, "No fue posible iniciar sesión"))
		} finally {
			setCargando(false)
		}
	}

	return (
		<Card className="mx-auto max-w-md">
			<CardContent className="space-y-6 p-6">
				<div className="flex flex-col items-center gap-3 text-center">
					<span
						aria-hidden
						className="bg-primary/10 text-primary-accent grid size-14 place-items-center rounded-full"
					>
						<MailCheck className="size-7" />
					</span>
					<h2 className="text-xl font-semibold">Iniciar sesión</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{enviado ? (
							<>
								Si <strong className="text-foreground break-all">{email}</strong> está registrado,
								le enviamos un código de 6 dígitos.
							</>
						) : (
							"Escriba el correo con el que se registró y le enviaremos un código para entrar."
						)}
					</p>
				</div>

				<ErrorSummary mensaje={error ?? undefined} />

				{!enviado ? (
					<form onSubmit={pedirCodigo} noValidate className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="portal-email">Correo electrónico</Label>
							<Input
								id="portal-email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="w-full"
							disabled={cargando || email.trim() === ""}
						>
							{cargando ? "Enviando…" : "Enviar código"}
						</Button>
					</form>
				) : (
					<>
						<form onSubmit={entrar} noValidate className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="portal-otp">Código de verificación</Label>
								<Input
									id="portal-otp"
									ref={codigoRef}
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									placeholder="000000"
									value={otp}
									onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
									className="text-center font-mono text-2xl tracking-[0.5em]"
								/>
								<p className="text-muted-foreground text-xs">
									El código vence 10 minutos después de enviarse.
								</p>
							</div>
							<Button
								type="submit"
								size="lg"
								className="w-full"
								disabled={cargando || otp.length !== 6}
							>
								{cargando ? "Verificando…" : "Entrar"}
							</Button>
						</form>
						<div className="space-y-1 text-center">
							<Button
								variant="ghost"
								onClick={() => pedirCodigo()}
								disabled={restante > 0 || cargando}
							>
								{restante > 0 ? `Reenviar código en ${restante}s` : "Reenviar el código"}
							</Button>
							<Button
								variant="link"
								size="sm"
								onClick={() => {
									setEnviado(false)
									setError(null)
								}}
							>
								Usar otro correo
							</Button>
						</div>
					</>
				)}

				<p className="text-muted-foreground text-center text-xs">
					¿Aún no se registra?{" "}
					<Link to="/registro" className="text-primary-accent underline underline-offset-2">
						Hágalo aquí
					</Link>
				</p>
			</CardContent>
		</Card>
	)
}

// ---------------------------------------------------------------------------
// Panel con sesión
// ---------------------------------------------------------------------------

type Vista = "inicio" | "reagendar" | "cuestionario" | "baja"

function Panel() {
	const cerrar = usePortalStore((estado) => estado.cerrar)
	const cliente = useQueryClient()
	const [vista, setVista] = useState<Vista>("inicio")

	const { data, isLoading, error } = useQuery({
		queryKey: ["portal", "me"],
		queryFn: () => fetchApi.get<ResumenPortal>(ENDPOINTS.portalMe),
		retry: false,
	})

	// Sesión vencida o inválida: de vuelta al acceso.
	useEffect(() => {
		if (error instanceof ApiError && error.status === 401) {
			toast.error(error.message)
			cerrar()
		}
	}, [error, cerrar])

	const refrescar = () => cliente.invalidateQueries({ queryKey: ["portal", "me"] })
	const volver = () => {
		setVista("inicio")
		window.scrollTo({ top: 0 })
	}

	if (isLoading) return <p className="text-muted-foreground py-12 text-center">Cargando…</p>
	if (error || !data)
		return <ErrorSummary mensaje={mensaje(error, "No fue posible cargar su información")} />

	const terminarSesion = () => {
		cliente.removeQueries({ queryKey: ["portal"] })
		cerrar()
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span
						aria-hidden
						className="bg-primary/10 text-primary-accent grid size-10 place-items-center rounded-full"
					>
						<UserRound className="size-5" />
					</span>
					<div>
						<p className="font-semibold">Hola, {data.nombre}</p>
						<p className="text-muted-foreground text-xs">
							Código de registro: <code className="font-mono">{data.codigo_registro}</code>
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" onClick={terminarSesion}>
					<LogOut className="size-4" />
					Cerrar sesión
				</Button>
			</div>

			{vista === "inicio" && <Inicio datos={data} ir={setVista} refrescar={refrescar} />}

			{vista === "reagendar" && (
				<Seccion titulo={data.cita ? "Cambiar mi cita" : "Agendar mi cita"} volver={volver}>
					<SelectorCita
						etiquetaBoton={data.cita ? "Confirmar cambio" : "Confirmar cita"}
						alConfirmar={async (fecha, hora) => {
							await fetchApi.put(ENDPOINTS.portalCita, { fecha, hora })
							await refrescar()
							toast.success("Su cita quedó registrada. Le enviamos el comprobante por correo")
							volver()
						}}
					/>
				</Seccion>
			)}

			{vista === "cuestionario" && (
				<Seccion titulo="Cuestionario de elegibilidad" volver={volver}>
					<PasoElegibilidad
						portal={{
							alTerminar: async () => {
								await refrescar()
								volver()
							},
						}}
					/>
				</Seccion>
			)}

			{vista === "baja" && (
				<Seccion titulo="Solicitar la baja de mis datos" volver={volver}>
					<FormularioBaja
						alTerminar={async () => {
							await refrescar()
							volver()
						}}
					/>
				</Seccion>
			)}
		</div>
	)
}

function Seccion({
	titulo,
	volver,
	children,
}: {
	titulo: string
	volver: () => void
	children: React.ReactNode
}) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-3">
				<h2 className="text-xl font-semibold">{titulo}</h2>
				<Button variant="ghost" size="sm" onClick={volver}>
					← Volver
				</Button>
			</div>
			{children}
		</div>
	)
}

function Inicio({
	datos,
	ir,
	refrescar,
}: {
	datos: ResumenPortal
	ir: (v: Vista) => void
	refrescar: () => Promise<unknown>
}) {
	const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
	const [descargando, setDescargando] = useState(false)

	const cancelar = useMutation({
		mutationFn: () => fetchApi.delete(ENDPOINTS.portalCita),
		onSuccess: async () => {
			await refrescar()
			setConfirmandoCancelar(false)
			toast.success("Su cita fue cancelada")
		},
		onError: (e) => toast.error(mensaje(e, "No fue posible cancelar la cita")),
	})

	const descargar = async () => {
		setDescargando(true)
		try {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.portalComprobante}`, {
				responseType: "blob",
				headers: { Authorization: `Bearer ${usePortalStore.getState().token}` },
			})
			const url = URL.createObjectURL(data)
			const a = document.createElement("a")
			a.href = url
			a.download = `${datos.cita?.folio ?? "comprobante"}.pdf`
			a.click()
			URL.revokeObjectURL(url)
		} catch {
			toast.error("No fue posible descargar el comprobante")
		} finally {
			setDescargando(false)
		}
	}

	const { elegibilidad, cita } = datos
	const sinCuestionario = !elegibilidad
	const noApto = elegibilidad && elegibilidad.resultado !== "apto"
	const puedeReintentar = elegibilidad?.resultado === "no_apto_temporal"
	const apto = elegibilidad?.resultado === "apto"

	return (
		<div className="space-y-4">
			{datos.baja_solicitada && (
				<Aviso
					icono={<ShieldAlert className="size-5" />}
					tono="aviso"
					titulo="Su solicitud de baja está en trámite"
				>
					Folio <code className="font-mono font-semibold">{datos.baja_solicitada.folio}</code>. Le
					avisaremos por correo cuando se resuelva. Su cita fue cancelada.
				</Aviso>
			)}

			{sinCuestionario && (
				<Aviso
					icono={<ClipboardList className="size-5" />}
					tono="aviso"
					titulo="Falta contestar el cuestionario de salud"
				>
					Lo necesitamos para saber si puede donar con seguridad. Después podrá agendar su cita.
					<div className="mt-3">
						<Button size="sm" onClick={() => ir("cuestionario")}>
							Contestar cuestionario
						</Button>
					</div>
				</Aviso>
			)}

			{noApto && (
				<Aviso
					icono={<AlertTriangle className="size-5" />}
					tono="aviso"
					titulo={puedeReintentar ? "Por ahora no puede donar" : "Su registro no puede continuar"}
				>
					{puedeReintentar ? (
						<>
							Su resultado es temporal
							{elegibilidad.bloqueado_hasta ? (
								<>
									{" "}
									y puede cambiar a partir del{" "}
									{new Date(elegibilidad.bloqueado_hasta).toLocaleDateString("es-MX", {
										dateStyle: "long",
									})}
								</>
							) : null}
							. Cuando cambie su situación puede contestar el cuestionario de nuevo.
						</>
					) : (
						"De acuerdo con sus respuestas no es posible continuar. Gracias por su interés."
					)}
					{puedeReintentar && (
						<div className="mt-3">
							<Button size="sm" variant="outline" onClick={() => ir("cuestionario")}>
								Contestar de nuevo
							</Button>
						</div>
					)}
				</Aviso>
			)}

			{apto && (
				<Card>
					<CardContent className="space-y-4 p-6">
						<div className="flex items-center gap-2">
							{cita ? (
								<CalendarCheck aria-hidden className="text-primary size-5" />
							) : (
								<CalendarX2 aria-hidden className="text-muted-foreground size-5" />
							)}
							<h2 className="text-lg font-semibold">Mi cita</h2>
						</div>

						{cita ? (
							<>
								<div className="bg-muted/40 rounded-lg p-4">
									<p className="text-muted-foreground text-xs">Folio</p>
									<p className="text-primary font-mono text-xl font-bold tracking-wide">
										{cita.folio}
									</p>
									<p className="mt-3 text-sm font-medium capitalize">{fechaLarga(cita.fecha)}</p>
									<p className="text-sm font-medium">{cita.hora} h</p>
								</div>

								{cita.vencida && (
									<p
										role="status"
										className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
									>
										Su cita ya pasó y no quedó registrada su asistencia. Puede reagendarla sin
										problema.
									</p>
								)}

								<div className="flex flex-wrap gap-2">
									<Button onClick={() => ir("reagendar")}>
										{cita.vencida ? "Reagendar cita" : "Cambiar fecha u hora"}
									</Button>
									<Button variant="outline" onClick={descargar} disabled={descargando}>
										<Download className="size-4" />
										{descargando ? "Generando…" : "Descargar comprobante"}
									</Button>
									{!confirmandoCancelar ? (
										<Button variant="ghost" onClick={() => setConfirmandoCancelar(true)}>
											Cancelar cita
										</Button>
									) : (
										<span className="flex items-center gap-2">
											<span className="text-sm">¿Cancelar su cita?</span>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => cancelar.mutate()}
												disabled={cancelar.isPending}
											>
												Sí, cancelar
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setConfirmandoCancelar(false)}
											>
												No
											</Button>
										</span>
									)}
								</div>
							</>
						) : (
							<>
								<p className="text-muted-foreground text-sm">No tiene una cita programada.</p>
								<Button onClick={() => ir("reagendar")}>Agendar cita</Button>
							</>
						)}
					</CardContent>
				</Card>
			)}

			{!datos.baja_solicitada && (
				<Card>
					<CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
						<div>
							<h2 className="text-lg font-semibold">Baja de mis datos</h2>
							<p className="text-muted-foreground mt-1 max-w-md text-sm">
								Si ya no desea participar, puede pedir que se eliminen sus datos del registro. Se
								cancelará su cita.
							</p>
						</div>
						<Button variant="outline" onClick={() => ir("baja")}>
							Solicitar baja
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	)
}

function Aviso({
	icono,
	titulo,
	tono: _tono,
	children,
}: {
	icono: React.ReactNode
	titulo: string
	tono: "aviso"
	children: React.ReactNode
}) {
	return (
		<div
			role="status"
			className={cn("flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm")}
		>
			<span aria-hidden className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
				{icono}
			</span>
			<div className="leading-relaxed">
				<p className="font-semibold">{titulo}</p>
				<div className="text-muted-foreground mt-1">{children}</div>
			</div>
		</div>
	)
}

function FormularioBaja({ alTerminar }: { alTerminar: () => Promise<void> }) {
	const [motivo, setMotivo] = useState("")
	const [entiendo, setEntiendo] = useState(false)
	const [folio, setFolio] = useState<string | null>(null)

	const enviar = useMutation({
		mutationFn: () => fetchApi.post<{ folio: string }>(ENDPOINTS.portalBaja, { motivo }),
		onSuccess: (r) => setFolio(r.folio),
	})

	if (folio) {
		return (
			<div className="space-y-4 text-center">
				<h3 className="text-lg font-semibold">Solicitud recibida</h3>
				<p className="text-muted-foreground text-sm">
					Su folio es <code className="text-foreground font-mono font-semibold">{folio}</code>. Le
					enviamos un acuse a su correo y le avisaremos cuando se resuelva. Su cita fue cancelada.
				</p>
				<Button onClick={alTerminar}>Entendido</Button>
			</div>
		)
	}

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault()
				if (entiendo) enviar.mutate()
			}}
		>
			<ErrorSummary
				mensaje={
					enviar.error ? mensaje(enviar.error, "No fue posible enviar la solicitud") : undefined
				}
			/>
			<p className="text-muted-foreground text-sm leading-relaxed">
				Su solicitud se tramita como cancelación de datos (derechos ARCO): se revisa y, de proceder,
				sus datos dejan de formar parte del registro. Mientras tanto, su cita se cancela.
			</p>
			<div className="space-y-1.5">
				<Label htmlFor="baja-motivo">Motivo (opcional)</Label>
				<textarea
					id="baja-motivo"
					rows={3}
					maxLength={1000}
					value={motivo}
					onChange={(e) => setMotivo(e.target.value)}
					className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
				/>
			</div>
			<label className="flex items-start gap-2 text-sm">
				<input
					type="checkbox"
					checked={entiendo}
					onChange={(e) => setEntiendo(e.target.checked)}
					className="mt-1"
				/>
				Entiendo que dejaré de aparecer en el registro de donadores y que mi cita se cancelará.
			</label>
			<div className="flex justify-end">
				<Button type="submit" variant="destructive" disabled={!entiendo || enviar.isPending}>
					{enviar.isPending ? "Enviando…" : "Solicitar baja"}
				</Button>
			</div>
		</form>
	)
}

export default PortalPage
