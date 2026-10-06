import { Check, Copy, KeyRound } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/**
 * Muestra una contraseña temporal EXACTAMENTE una vez, igual que los códigos
 * de respaldo de MFA (`EnrolamientoInicial`): después de cerrar este modal ya
 * no hay forma de volver a verla, solo de generar una nueva.
 *
 * Exige marcar "ya la copié" antes de poder cerrar, para que a quien está
 * creando la cuenta no se le escape sin haberla guardado.
 */
export function ModalPasswordTemporal({
	titulo,
	usuario,
	password,
	onCerrar,
}: {
	titulo: string
	usuario: string
	password: string
	onCerrar: () => void
}) {
	const [copiado, setCopiado] = useState(false)
	const [confirmado, setConfirmado] = useState(false)

	const copiar = async () => {
		await navigator.clipboard.writeText(password)
		setCopiado(true)
		toast.success("Contraseña copiada")
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="titulo-password-temporal"
		>
			<Card className="w-full max-w-md">
				<CardContent className="space-y-4 pt-6">
					<div className="flex items-center gap-3">
						<span className="bg-primary/10 text-primary-accent flex size-10 shrink-0 items-center justify-center rounded-full">
							<KeyRound className="size-5" aria-hidden="true" />
						</span>
						<div>
							<h2 id="titulo-password-temporal" className="text-lg font-semibold">
								{titulo}
							</h2>
							<p className="text-muted-foreground text-sm">
								Cuenta <span className="font-medium">{usuario}</span>
							</p>
						</div>
					</div>

					<div>
						<Label className="text-xs">Contraseña temporal</Label>
						<div className="mt-1.5 flex items-center gap-2">
							<code className="bg-muted flex-1 truncate rounded-md px-3 py-2 text-sm font-medium">
								{password}
							</code>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={copiar}
								aria-label="Copiar contraseña"
							>
								{copiado ? (
									<Check className="size-4 text-emerald-600" aria-hidden="true" />
								) : (
									<Copy className="size-4" aria-hidden="true" />
								)}
							</Button>
						</div>
					</div>

					<p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
						Esta contraseña <strong>no se volverá a mostrar</strong>. Comuníquela a la persona por un
						canal seguro (nunca por el mismo correo donde se avisa el usuario). Deberá cambiarla en
						su primer inicio de sesión.
					</p>

					<label className="flex items-start gap-2 text-sm">
						<Checkbox
							checked={confirmado}
							onCheckedChange={(valor) => setConfirmado(valor === true)}
							className="mt-0.5"
						/>
						Ya copié o comuniqué esta contraseña
					</label>

					<div className="flex justify-end">
						<Button onClick={onCerrar} disabled={!confirmado}>
							Cerrar
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
