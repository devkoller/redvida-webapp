import { Link } from "@tanstack/react-router"
import { CheckCircle2, Copy, Download, ShieldCheck } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import axios from "axios"
import { toast } from "sonner"

import { API_URL, ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useFetch } from "@/hooks/useFetch"
import { usePost } from "@/hooks/usePost"
import { usePortalStore } from "@/stores/portalStore"
import { useRegistroStore } from "@/stores/registroStore"
import type { DocumentoConsentimiento, RespuestaConsentimiento } from "@/types/api"
import { ErrorSummary } from "../registro/components/error-summary"
import { CanvasFirma, type CanvasFirmaHandle } from "./components/canvas-firma"
import { VisorDocumento } from "./components/visor-documento"

/**
 * Paso de consentimiento informado.
 *
 * Tres condiciones para poder aceptar, y las tres son obligatorias:
 * haber leído el documento completo, haber firmado, y marcar las dos casillas.
 * Ninguna viene premarcada: el consentimiento expreso que la ley exige para
 * datos sensibles no admite defaults.
 *
 * El `hash` que devuelve el servidor viaja de vuelta al firmar. Si el documento
 * cambió mientras la persona leía, el backend responde 409 y hay que recargar:
 * nadie debe quedar firmando un texto distinto del que vio.
 */
export function PasoConsentimiento() {
	const { donadorId, codigoRegistro, consentimiento, cita, setConsentimiento, limpiar } =
		useRegistroStore()

	const [leido, setLeido] = useState(false)
	const [tieneFirma, setTieneFirma] = useState(false)
	const [aceptaConsentimiento, setAceptaConsentimiento] = useState(false)
	const [aceptaAviso, setAceptaAviso] = useState(false)
	const firmaRef = useRef<CanvasFirmaHandle>(null)

	const {
		response: documento,
		loading: cargando,
		refetch,
	} = useFetch<DocumentoConsentimiento>({ url: ENDPOINTS.consentimientoVigente })

	const { execute, loading: enviando, error } = usePost<RespuestaConsentimiento>()
	const apiError = error as ApiError | null

	const marcarLeido = useCallback(() => setLeido(true), [])

	const puedeAceptar =
		leido && tieneFirma && aceptaConsentimiento && aceptaAviso && Boolean(documento)

	const enviar = async (evento: React.FormEvent) => {
		evento.preventDefault()
		if (!puedeAceptar || !documento) return

		try {
			const resultado = await execute({
				url: ENDPOINTS.consentimientoAceptar,
				body: {
					donador_id: donadorId,
					version: documento.version,
					hash_documento: documento.hash,
					acepta: true,
					acepta_aviso: true,
					firma_base64: firmaRef.current?.exportarPng(),
				},
			})
			setConsentimiento({
				id: resultado.id,
				fechaAceptacion: String(resultado.fecha_aceptacion),
			})
		} catch {
			// Se muestra en ErrorSummary. Si fue un 409 por cambio de documento,
			// se recarga para que la persona lea la versión nueva.
			if ((error as ApiError | null)?.status === 409) {
				setLeido(false)
				refetch()
			}
		}
	}

	const copiarCodigo = async () => {
		if (!codigoRegistro) return
		try {
			await navigator.clipboard.writeText(codigoRegistro)
			toast.success("Código copiado")
		} catch {
			toast.error("No fue posible copiar. Anótelo manualmente")
		}
	}

	// Último paso del wizard: en cuanto queda firmado no hay a dónde más
	// avanzar, así que la confirmación se muestra aquí mismo en vez de en un
	// paso aparte.
	if (consentimiento) {
		return (
			<div className="space-y-6 text-center">
				<span
					aria-hidden
					className="bg-success/15 text-success mx-auto grid size-14 place-items-center rounded-full"
				>
					<CheckCircle2 className="size-7" />
				</span>

				<div>
					<h2 className="text-2xl font-semibold">¡Su cita quedó agendada!</h2>
					<p className="text-muted-foreground mx-auto mt-3 max-w-lg leading-relaxed">
						{cita ? `Lo esperamos el ${cita.fecha} a las ${cita.hora} h. ` : ""}Le enviamos el comprobante con el
						folio y el código QR a su correo. Su incorporación al registro se concreta cuando se
						presente a la cita y se le tome la muestra.
					</p>
				</div>

				<Card className="mx-auto max-w-md">
					<CardContent className="p-6">
						<p className="text-muted-foreground text-sm">Su código de registro</p>
						<div className="mt-2 flex items-center justify-center gap-2">
							<code className="text-primary-accent font-mono text-xl font-bold tracking-wide">
								{codigoRegistro}
							</code>
							<Button
								variant="ghost"
								size="icon"
								onClick={copiarCodigo}
								aria-label="Copiar código de registro"
							>
								<Copy className="size-4" />
							</Button>
						</div>
						<p className="text-muted-foreground mt-3 text-xs leading-relaxed">
							Con él puede consultar el avance de su registro en cualquier momento.
						</p>
					</CardContent>
				</Card>

				<div className="flex flex-col justify-center gap-3 sm:flex-row">
					<DescargarConstancia consentimientoId={consentimiento.id} />
					<Button asChild variant="outline">
						<Link to="/registro/estatus">Consultar mi avance</Link>
					</Button>
					<Button asChild onClick={() => limpiar()}>
						<Link to="/">Volver al inicio</Link>
					</Button>
				</div>
			</div>
		)
	}

	if (cargando) {
		return <p className="text-muted-foreground py-12 text-center">Cargando documento…</p>
	}

	if (!documento) {
		return (
			<div role="alert" className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
				<p className="text-destructive text-sm font-medium">
					No fue posible cargar el documento de consentimiento.
				</p>
				<Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
					Reintentar
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Consentimiento informado</h2>
				<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
					Este es el último paso. Lea el documento completo, fírmelo y confirme su aceptación.
					Recibirá el comprobante de su cita, con folio y código QR, en su correo.
				</p>
			</div>

			<ErrorSummary mensaje={apiError?.message} />

			<VisorDocumento contenido={documento.contenido} leido={leido} onLeido={marcarLeido} />

			<form onSubmit={enviar} noValidate className="space-y-6">
				<fieldset className="space-y-2" disabled={!leido}>
					<legend className="text-sm font-medium">Su firma</legend>
					<p className="text-muted-foreground text-xs">
						Dibuje su firma como lo haría en papel. En un teléfono puede usar el dedo.
					</p>
					<div className={!leido ? "pointer-events-none opacity-50" : ""}>
						<CanvasFirma ref={firmaRef} onCambio={setTieneFirma} />
					</div>
				</fieldset>

				<fieldset className="space-y-3" disabled={!leido}>
					<legend className="sr-only">Confirmaciones</legend>

					<div className="flex items-start gap-3">
						<Checkbox
							id="acepta-consentimiento"
							checked={aceptaConsentimiento}
							onCheckedChange={(valor) => setAceptaConsentimiento(valor === true)}
							className="mt-0.5"
						/>
						{/* `block` es necesario: el Label de shadcn trae `flex items-center`,
						    que convierte cada nodo de texto y cada <strong> en un elemento
						    flex y parte la frase en columnas. */}
						<Label
							htmlFor="acepta-consentimiento"
							className="block text-sm leading-relaxed font-normal"
						>
							He leído y acepto el <strong>consentimiento informado</strong> para incorporarme al
							registro de donadores voluntarios de células madre hematopoyéticas.
						</Label>
					</div>

					<div className="flex items-start gap-3">
						<Checkbox
							id="acepta-aviso"
							checked={aceptaAviso}
							onCheckedChange={(valor) => setAceptaAviso(valor === true)}
							className="mt-0.5"
						/>
						<Label htmlFor="acepta-aviso" className="block text-sm leading-relaxed font-normal">
							He leído y acepto el{" "}
							<a
								href="/aviso-privacidad"
								target="_blank"
								rel="noreferrer"
								className="text-primary-accent underline underline-offset-2"
							>
								aviso de privacidad
							</a>{" "}
							y otorgo mi <strong>consentimiento expreso</strong> para el tratamiento de mis datos
							de salud y genéticos.
						</Label>
					</div>
				</fieldset>

				<div className="bg-muted/40 flex items-start gap-3 rounded-lg p-4">
					<ShieldCheck aria-hidden className="text-muted-foreground mt-0.5 size-5 shrink-0" />
					<p className="text-muted-foreground text-xs leading-relaxed">
						Se registrarán la fecha y hora, su dirección IP y la huella digital del documento
						(SHA-256 <code className="font-mono">{documento.hash.slice(0, 16)}…</code>). Esa huella
						permite acreditar en el futuro qué texto exacto aceptó. Puede revocar su consentimiento
						cuando quiera.
					</p>
				</div>

				<div className="flex justify-end">
					<Button type="submit" size="lg" disabled={!puedeAceptar || enviando}>
						{enviando ? "Firmando…" : "Aceptar y firmar"}
					</Button>
				</div>
			</form>
		</div>
	)
}

/**
 * Botón de descarga del comprobante. Se pide con la sesión del donador, por
 * eso no es un enlace: un `<a href>` no puede enviar el encabezado de
 * autorización.
 */
export function DescargarConstancia({ consentimientoId }: { consentimientoId: string }) {
	const [descargando, setDescargando] = useState(false)

	const descargar = async () => {
		setDescargando(true)
		try {
			const { data } = await axios.get(`${API_URL}${ENDPOINTS.constancia(consentimientoId)}`, {
				responseType: "blob",
				headers: { Authorization: `Bearer ${usePortalStore.getState().token}` },
			})
			const url = URL.createObjectURL(data)
			const enlace = document.createElement("a")
			enlace.href = url
			enlace.download = "comprobante-de-cita.pdf"
			enlace.click()
			URL.revokeObjectURL(url)
		} catch {
			toast.error("No fue posible descargar el comprobante. Revise su correo: también se lo enviamos.")
		} finally {
			setDescargando(false)
		}
	}

	return (
		<Button variant="outline" onClick={descargar} disabled={descargando}>
			<Download className="size-4" />
			{descargando ? "Descargando…" : "Descargar comprobante de cita"}
		</Button>
	)
}

export default PasoConsentimiento
