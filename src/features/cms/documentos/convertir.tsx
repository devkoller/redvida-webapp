import { renderToStaticMarkup } from "react-dom/server"
import Markdown from "react-markdown"

/**
 * Lleva el texto de una versión al formato del editor (HTML).
 *
 * Las versiones iniciales del aviso son Markdown; las que se editan desde el
 * panel ya son HTML. El editor trabaja en HTML, así que el Markdown se
 * convierte una sola vez, al abrirlo. El `<h1>` del documento pasa a `<h2>`:
 * la página pública ya pone su propio título de primer nivel.
 */
export function aHtmlEditable(contenido: string): string {
	if (contenido.trimStart().startsWith("<")) return contenido
	return renderToStaticMarkup(<Markdown>{contenido}</Markdown>)
		.replace(/<h1>/g, "<h2>")
		.replace(/<\/h1>/g, "</h2>")
		.replace(/<\/?code>/g, "")
}
