import { MailCheck } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ENDPOINTS } from "@/api/config"
import type { ApiError } from "@/api/fetchApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePost } from "@/hooks/usePost"
import { usePortalStore } from "@/stores/portalStore"
import { useRegistroStore } from "@/stores/registroStore"
import type { RespuestaVerificacion } from "@/types/api"
import { ErrorSummary } from "./error-summary"

const SEGUNDOS_REENVIO = 60

export function PasoOtp() {
	const { datos, otpEnviado, setEmailVerificado, setPaso } = useRegistroStore()
	const [otp, setOtp] = useState("")
	const [restante, setRestante] = useState(SEGUNDOS_REENVIO)
	const inputRef = useRef<HTMLInputElement>(null)

	const verificar = usePost<RespuestaVerificacion>()
	const reenviar = usePost<{ otp_enviado: boolean }>()
	const apiError = verificar.error as ApiError | null

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	// Contador de reenvío: evita que se martillee el endpoint y, de paso, que
	// alguien use el reenvío para bombardear de correos a un tercero.
	useEffect(() => {
		if (restante <= 0) return
		const id = setTimeout(() => setRestante((v) => v - 1), 1000)
		return () => clearTimeout(id)
	}, [restante])

	const enviar = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!/^\d{6}$/.test(otp)) return

		try {
			const respuesta = await verificar.execute({
				url: ENDPOINTS.verifyOtp,
				body: { email: datos.email, otp },
			})
			// A partir de aquí el wizard actúa con la sesión del donador.
			if (respuesta.token) usePortalStore.getState().iniciar(respuesta.token)
			setEmailVerificado(true)
		} catch {
			// Se muestra en ErrorSummary.
		}
	}

	const solicitarNuevo = async () => {
		try {
			const respuesta = await reenviar.execute({
				url: ENDPOINTS.requestOtp,
				body: { email: datos.email },
			})
			if (respuesta.otp_enviado) toast.success("Le enviamos un código nuevo")
			else toast.error("El código fue generado, pero el servidor no pudo enviarlo por correo")
			setRestante(SEGUNDOS_REENVIO)
			setOtp("")
			verificar.reset()
			inputRef.current?.focus()
		} catch {
			toast.error("No fue posible reenviar el código. Intente más tarde")
		}
	}

	// Agotar los intentos quema el código: hay que pedir uno nuevo.
	const intentosAgotados = apiError?.status === 429

	return (
		<div className="space-y-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<span
					aria-hidden
					className="bg-primary/10 text-primary-accent grid size-14 place-items-center rounded-full"
				>
					<MailCheck className="size-7" />
				</span>
				<h2 className="text-xl font-semibold">Confirme su correo electrónico</h2>
				<p className="text-muted-foreground max-w-md text-sm leading-relaxed">
					Enviamos un código de 6 dígitos a{" "}
					<strong className="text-foreground break-all">{datos.email}</strong>. Captúrelo aquí para
					continuar.
				</p>
			</div>

			<ErrorSummary
				mensaje={
					apiError?.message ||
					(otpEnviado === false
						? "No fue posible enviar el código a su correo. Intente reenviarlo más tarde o contacte al equipo de RedVida."
						: undefined)
				}
			/>

			<form onSubmit={enviar} noValidate className="mx-auto max-w-xs space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="otp">Código de verificación</Label>
					<Input
						id="otp"
						ref={inputRef}
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						placeholder="000000"
						value={otp}
						// Solo dígitos: pegar un código con espacios o guiones es
						// más común de lo que parece.
						onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
						className="text-center font-mono text-2xl tracking-[0.5em]"
						aria-describedby="otp-ayuda"
					/>
					<p id="otp-ayuda" className="text-muted-foreground text-xs">
						El código vence 10 minutos después de enviarse.
					</p>
				</div>

				<Button
					type="submit"
					size="lg"
					className="w-full"
					disabled={verificar.loading || otp.length !== 6 || intentosAgotados}
				>
					{verificar.loading ? "Verificando…" : "Verificar"}
				</Button>
			</form>

			<div className="space-y-3 text-center">
				<Button
					variant="ghost"
					onClick={solicitarNuevo}
					disabled={(restante > 0 && !intentosAgotados) || reenviar.loading}
				>
					{restante > 0 && !intentosAgotados
						? `Reenviar código en ${restante}s`
						: "Reenviar el código"}
				</Button>

				<p className="text-muted-foreground text-xs">
					¿El correo no llegó? Revise la carpeta de correo no deseado.
				</p>

				<Button variant="link" size="sm" onClick={() => setPaso(1)}>
					Corregir mi correo electrónico
				</Button>
			</div>
		</div>
	)
}

export default PasoOtp
