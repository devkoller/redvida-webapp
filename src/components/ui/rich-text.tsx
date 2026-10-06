import Quill from "quill"
import "quill/dist/quill.snow.css"
import "./rich-text.css"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

type Encabezado = 2 | 3 | 4

export interface RichTextProps {
	/** HTML actual. */
	value: string
	onChange: (html: string) => void
	/** `id` de la etiqueta que nombra al editor (un contenteditable no admite `htmlFor`). */
	labelledBy?: string
	/** Niveles de título que ofrece la barra. Deben coincidir con la lista blanca del servidor. */
	encabezados?: Encabezado[]
	/** Cita en bloque y línea horizontal (solo el aviso de privacidad las admite). */
	extras?: boolean
	readOnly?: boolean
	/** Alto mínimo del área de escritura, en unidades de la escala (`min-h-*`). */
	className?: string
}

/**
 * Editor de texto enriquecido (Quill 2).
 *
 * Emite **HTML semántico** (`<p>`, `<strong>`, `<ul><li>`…) con
 * `getSemanticHTML()`: el HTML interno de Quill usa `<ol data-list="bullet">`,
 * que el sitio no sabría pintar. La barra solo ofrece lo que la lista blanca
 * del servidor (`sanitizar.ts`) conserva; lo demás se descartaría al guardar,
 * y es mejor no ofrecerlo que prometerlo y perderlo.
 *
 * Los botones llevan `aria-label` en español y el área de escritura se asocia a
 * su etiqueta con `aria-labelledby`.
 */
export function RichText({
	value,
	onChange,
	labelledBy,
	encabezados = [3, 4],
	extras = false,
	readOnly = false,
	className,
}: RichTextProps) {
	const barra = useRef<HTMLDivElement>(null)
	const area = useRef<HTMLDivElement>(null)
	const quill = useRef<Quill | null>(null)
	const ultimo = useRef(value)
	const alCambiar = useRef(onChange)
	alCambiar.current = onChange

	useEffect(() => {
		if (!barra.current || !area.current || quill.current) return
		const q = new Quill(area.current, {
			theme: "snow",
			modules: { toolbar: barra.current },
			formats: [
				"bold",
				"italic",
				"underline",
				"link",
				"list",
				"header",
				...(extras ? ["blockquote"] : []),
			],
		})
		quill.current = q

		q.root.setAttribute("role", "textbox")
		q.root.setAttribute("aria-multiline", "true")
		if (labelledBy) q.root.setAttribute("aria-labelledby", labelledBy)

		const pegar = (html: string) => {
			q.setContents(q.clipboard.convert({ html }), "silent")
		}
		pegar(value)

		q.on("text-change", (_delta, _previo, origen) => {
			if (origen !== "user") return
			const html = q.getText().trim().length === 0 && q.getLength() <= 1 ? "" : q.getSemanticHTML()
			// Quill rellena con &nbsp; los espacios dobles y finales; en HTML da igual.
			const limpio = html.replace(/&nbsp;/g, " ").replace(/<p><\/p>/g, "")
			ultimo.current = limpio
			alCambiar.current(limpio)
		})

		return () => {
			quill.current = null
		}
		// El editor se crea una vez; los cambios externos de `value` se tratan abajo.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Cambios que no vienen del teclado (restablecer, cargar otra versión).
	useEffect(() => {
		const q = quill.current
		if (!q || value === ultimo.current) return
		ultimo.current = value
		q.setContents(q.clipboard.convert({ html: value }), "silent")
	}, [value])

	useEffect(() => {
		quill.current?.enable(!readOnly)
	}, [readOnly])

	const boton = (clase: string, etiqueta: string, valor?: string | number) => (
		<button type="button" className={clase} value={valor} aria-label={etiqueta} title={etiqueta} />
	)

	return (
		<div className={cn("rich-text", readOnly && "rich-text--solo-lectura", className)}>
			<div ref={barra} role="toolbar" aria-label="Formato del texto">
				<span className="ql-formats">
					{encabezados.map((n) => (
						<span key={n}>{boton("ql-header", `Título nivel ${n}`, n)}</span>
					))}
				</span>
				<span className="ql-formats">
					{boton("ql-bold", "Negrita")}
					{boton("ql-italic", "Cursiva")}
					{boton("ql-underline", "Subrayado")}
					{boton("ql-link", "Enlace")}
				</span>
				<span className="ql-formats">
					{boton("ql-list", "Lista con viñetas", "bullet")}
					{boton("ql-list", "Lista numerada", "ordered")}
					{extras && boton("ql-blockquote", "Cita")}
				</span>
				<span className="ql-formats">{boton("ql-clean", "Quitar formato")}</span>
			</div>
			<div ref={area} />
		</div>
	)
}
