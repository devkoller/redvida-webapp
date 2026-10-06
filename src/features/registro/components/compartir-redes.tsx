import {
	Check,
	Copy,
	Facebook,
	Linkedin,
	Mail,
	MessageCircle,
	Send,
	Share2,
	Twitter,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const TITULO = "RedVida MX"
const MENSAJE =
	"Hay pacientes que esperan un donador de células madre para seguir con vida. Conoce RedVida MX y, si puedes, regístrate como donador voluntario."

/**
 * Tarjeta para difundir RedVida: redes sociales, copiar enlace y menú nativo.
 * La usan las pantallas a las que llega quien no continúa con el registro
 * (respondió "No", o no resultó apto): ayudar a difundirlo es lo que sí puede hacer.
 */
export function CompartirRedes() {
	const [copiado, setCopiado] = useState(false)

	// La página que se comparte es la de inicio, no esta: el registro a medias
	// no le dice nada a quien lo recibe.
	const enlace = `${window.location.origin}/`
	const url = encodeURIComponent(enlace)
	const texto = encodeURIComponent(MENSAJE)

	const redes = [
		{
			nombre: "WhatsApp",
			icono: MessageCircle,
			href: `https://wa.me/?text=${encodeURIComponent(`${MENSAJE} ${enlace}`)}`,
		},
		{
			nombre: "Facebook",
			icono: Facebook,
			href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
		},
		{
			nombre: "X",
			icono: Twitter,
			href: `https://twitter.com/intent/tweet?text=${texto}&url=${url}`,
		},
		{
			nombre: "LinkedIn",
			icono: Linkedin,
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
		},
		{
			nombre: "Telegram",
			icono: Send,
			href: `https://t.me/share/url?url=${url}&text=${texto}`,
		},
		{
			nombre: "Correo",
			icono: Mail,
			href: `mailto:?subject=${encodeURIComponent(TITULO)}&body=${encodeURIComponent(`${MENSAJE}\n\n${enlace}`)}`,
		},
	]

	const copiar = async () => {
		try {
			await navigator.clipboard.writeText(enlace)
			setCopiado(true)
			setTimeout(() => setCopiado(false), 2500)
		} catch {
			// Sin permiso de portapapeles el enlace sigue visible para copiarlo a mano.
		}
	}

	// Menú nativo de compartir en móviles; en escritorio no existe y no se muestra.
	const puedeCompartirNativo = typeof navigator !== "undefined" && "share" in navigator

	return (
		<Card className="mx-auto max-w-xl text-left">
			<CardContent className="space-y-4 p-6">
				<div>
					<h3 className="font-medium">Usted puede ayudar de otra forma</h3>
					<p className="text-muted-foreground mt-1 text-sm leading-relaxed">
						Cada persona que conoce el registro es un posible donador más. Comparta RedVida con
						quienes sí puedan ayudar.
					</p>
				</div>

				<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Compartir en">
					{redes.map(({ nombre, icono: Icono, href }) => (
						<li key={nombre}>
							<Button asChild variant="outline" className="w-full justify-start gap-2">
								<a
									href={href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={`Compartir en ${nombre} (se abre en una pestaña nueva)`}
								>
									<Icono aria-hidden className="size-4" />
									{nombre}
								</a>
							</Button>
						</li>
					))}
				</ul>

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button type="button" variant="secondary" className="gap-2" onClick={copiar}>
						{copiado ? (
							<Check aria-hidden className="size-4" />
						) : (
							<Copy aria-hidden className="size-4" />
						)}
						{copiado ? "Enlace copiado" : "Copiar enlace"}
					</Button>
					{puedeCompartirNativo && (
						<Button
							type="button"
							variant="secondary"
							className="gap-2"
							onClick={() =>
								navigator.share({ title: TITULO, text: MENSAJE, url: enlace }).catch(() => {})
							}
						>
							<Share2 aria-hidden className="size-4" />
							Más opciones
						</Button>
					)}
				</div>
				<p aria-live="polite" className="sr-only">
					{copiado ? "Enlace copiado al portapapeles" : ""}
				</p>
			</CardContent>
		</Card>
	)
}

export default CompartirRedes
