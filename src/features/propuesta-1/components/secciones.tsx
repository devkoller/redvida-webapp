import { Link } from "@tanstack/react-router"
import * as Iconos from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Seccion } from "../data/guion"
import { useHito } from "../escena/estado"
import { Revelar } from "../escena/Revelar"

/**
 * Secciones de la landing narrativa · RV-L1.4 · RV-L4.2
 *
 * Cada sección se registra como **hito** de la escena. De esas posiciones salen
 * la curva que recorre la esfera y los umbrales de la coreografía.
 *
 * **Todo el contenido vive en una columna a media anchura que alterna de lado**,
 * y la esfera va siempre al margen contrario. No es una decisión estética: el
 * halo suma luz sobre lo que tenga debajo, y sobre el texto lo hunde por debajo
 * del 4.5:1 de WCAG AA sin que ningún velo razonable pueda compensarlo. La única
 * solución es que no se pisen.
 *
 * Consecuencia: **nada se maqueta a tres o cuatro columnas.** Las cifras, los
 * pasos y las tarjetas se apilan dentro de la columna. Ocupan más scroll, que es
 * precisamente lo que la animación necesita.
 */

function Icono({ nombre, className }: { nombre?: string; className?: string }) {
	const Componente = (
		Iconos as unknown as Record<string, React.ComponentType<{ className?: string }>>
	)[nombre ?? ""]
	if (!Componente) return <Iconos.Circle className={className} />
	return <Componente className={className} />
}

/**
 * Texto que viene del CMS: HTML ya sanitizado en el servidor (Quill). El guion
 * de respaldo, escrito a mano, es texto plano; se envuelve en un párrafo para
 * que ambos caminos pasen por el mismo componente.
 */
function Rico({ html, className }: { html?: string; className?: string }) {
	if (!html) return null
	const contenido = html.trimStart().startsWith("<")
		? html
		: `<p>${html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
	return <div className={cn("contenido-rico", className)} dangerouslySetInnerHTML={{ __html: contenido }} />
}

function Cta({ texto, url }: { texto?: string; url?: string }) {
	if (!texto) return null
	const destino = url || "/registro"
	return (
		<Button asChild size="lg" className="text-base">
			{destino.startsWith("/") ? (
				<Link to={destino}>{texto}</Link>
			) : (
				<a href={destino} rel="noopener noreferrer">
					{texto}
				</a>
			)}
		</Button>
	)
}

/** Rótulo de capítulo. Es lo que hace evidente que empezó otra cosa. */
function Capitulo({ texto }: { texto?: string }) {
	if (!texto) return null
	return (
		<Revelar variante="profundidad" className="border-primary/60 mb-8 border-t pt-4">
			<span className="text-primary-accent text-xs font-semibold tracking-[0.2em] uppercase">
				{texto}
			</span>
		</Revelar>
	)
}

/**
 * Envoltorio común: registra el hito, coloca la columna y pinta el velo.
 *
 * El velo (`::before`, en `propuesta.css`) oscurece el lado del texto. No basta
 * por sí solo —eso lo resuelve la separación de lados—, pero recoge el borde
 * difuso del halo cuando la esfera pasa cerca del centro.
 *
 * El texto se alinea a la izquierda **siempre**, aunque la columna esté a la
 * derecha: un párrafo alineado a la derecha obliga al ojo a buscar el inicio de
 * cada renglón, y estos párrafos son largos.
 */
function Bloque({
	seccion,
	indice,
	children,
}: {
	seccion: Seccion
	indice: number
	children: ReactNode
}) {
	const ref = useHito(seccion.id, indice)
	return (
		<section
			ref={ref as any}
			id={seccion.id}
			data-acto={seccion.acto}
			data-lado={seccion.lado}
			style={{ minHeight: `${(seccion.alto ?? 1) * 100}dvh` }}
			className="bloque relative flex flex-col justify-center px-6 py-20"
		>
			{/*
			 * `max-w-xl` y no más. Con 672 px la columna cruzaba el centro del
			 * viewport y se metía en la zona por la que pasa la esfera; a 576 px
			 * quedan ~280 px de margen entre el borde del texto y el núcleo del
			 * halo. Además da una medida de línea de unos 60 caracteres, que es
			 * donde la lectura va cómoda.
			 */}
			<div
				className={`columna w-full max-w-xl ${seccion.lado === "izquierda" ? "mr-auto" : "ml-auto"}`}
			>
				<Capitulo texto={seccion.capitulo} />
				{children}
			</div>
		</section>
	)
}

/** Cuerpo con subtítulos, en una sola columna. */
function Apartados({ apartados }: { apartados?: any[] }) {
	if (!apartados?.length) return null
	return (
		<div className="mt-10 space-y-7">
			{apartados.map((apartado: any, i: number) => (
				<Revelar key={apartado.subtitulo} variante="margen" retraso={i * 110}>
					<h3 className="text-primary-accent text-lg font-semibold tracking-tight text-balance">
						{apartado.subtitulo}
					</h3>
					<Rico html={apartado.texto} className="text-muted-foreground mt-2 leading-relaxed text-pretty" />
				</Revelar>
			))}
		</div>
	)
}

// -----------------------------------------------------------------------------

function Hero({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="p"
				className="text-primary-accent text-sm font-semibold tracking-widest uppercase"
			>
				{c.antetitulo}
			</Revelar>
			<Revelar
				como="h1"
				retraso={80}
				className="mt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl"
			>
				{c.titulo}
			</Revelar>
			<Revelar como="div"
				retraso={160}
				className="text-muted-foreground mt-5 text-lg leading-relaxed text-pretty sm:text-xl"
			>
				<Rico html={c.subtitulo} />
			</Revelar>
			<Revelar retraso={240} className="mt-8 flex flex-col gap-3 sm:flex-row">
				<Cta texto={c.cta_texto} url={c.cta_url} />
				<Button asChild size="lg" variant="outline" className="text-base">
					<a href="#manifiesto">Quiero saber más</a>
				</Button>
			</Revelar>
			{c.nota && (
				<Revelar como="p" retraso={320} className="text-muted-foreground mt-5 text-sm">
					{c.nota}
				</Revelar>
			)}
		</Bloque>
	)
}

/** Una sola frase, a toda página. El respiro entre el hero y el cuerpo. */
function Manifiesto({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar como="div"
				variante="enfoque"
				className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl"
			>
				<Rico html={c.texto} />
			</Revelar>
			{c.pie && (
				<Revelar como="div"
					retraso={200}
					className="text-muted-foreground mt-8 text-lg leading-relaxed text-pretty"
				>
				<Rico html={c.pie} />
			</Revelar>
			)}
		</Bloque>
	)
}

function Texto({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			{c.entrada && (
				<Revelar como="div"
					retraso={100}
					className="text-muted-foreground mt-5 text-xl leading-relaxed text-pretty"
				>
				<Rico html={c.entrada} />
			</Revelar>
			)}
			<Apartados apartados={c.apartados} />
		</Bloque>
	)
}

/** Cifras apiladas. En tres columnas ocupaban todo el ancho y no dejaban sitio. */
function Estadisticas({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			{c.descripcion && (
				<Revelar como="div" retraso={100} className="text-muted-foreground mt-5 text-lg">
				<Rico html={c.descripcion} />
			</Revelar>
			)}
			<dl className="mt-10 space-y-6">
				{(c.cifras ?? []).map((cifra: any, i: number) => (
					<Revelar
						key={cifra.valor}
						variante="pivote"
						retraso={i * 140}
						className="border-border flex items-baseline gap-6 border-t pt-5"
					>
						<dt className="text-primary-accent shrink-0 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
							{cifra.valor}
						</dt>
						<dd className="text-muted-foreground leading-snug text-pretty">{cifra.etiqueta}</dd>
					</Revelar>
				))}
			</dl>
		</Bloque>
	)
}

/** Pasos apilados, con la numeración marcando el avance. */
function Timeline({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			{c.descripcion && (
				<Revelar como="div" retraso={80} className="text-muted-foreground mt-5 text-lg">
				<Rico html={c.descripcion} />
			</Revelar>
			)}

			<ol className="mt-10 space-y-6">
				{(c.pasos ?? []).map((paso: any, i: number) => (
					<Revelar
						como="li"
						key={paso.titulo}
						variante="margen"
						retraso={i * 130}
						className="flex gap-5"
					>
						<span
							aria-hidden
							className="bg-primary/25 text-primary-accent ring-primary/50 grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 backdrop-blur-sm"
						>
							<Icono nombre={paso.icono} className="size-5" />
						</span>
						<div>
							<p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
								Paso {i + 1}
							</p>
							<h3 className="mt-1 text-lg font-semibold text-balance">{paso.titulo}</h3>
							<Rico html={paso.texto} className="text-muted-foreground mt-2 leading-relaxed text-pretty" />
						</div>
					</Revelar>
				))}
			</ol>
		</Bloque>
	)
}

function Lista({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			{c.descripcion && (
				<Revelar como="div" retraso={100} className="text-muted-foreground mt-5 text-lg">
				<Rico html={c.descripcion} />
			</Revelar>
			)}
			<ul className="mt-10 space-y-5">
				{(c.puntos ?? []).map((punto: string, i: number) => (
					<Revelar como="li" key={i} variante="margen" retraso={i * 110} className="flex gap-4">
						<Iconos.Check aria-hidden className="text-primary-accent mt-1 size-5 shrink-0" />
						<Rico html={punto} className="text-lg leading-relaxed text-pretty" />
					</Revelar>
				))}
			</ul>
			{c.nota && (
				<Revelar como="p" retraso={500} className="text-muted-foreground mt-10 text-sm">
					{c.nota}
				</Revelar>
			)}
		</Bloque>
	)
}

function Tarjetas({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			<ul className="mt-10 space-y-7">
				{(c.tarjetas ?? []).map((tarjeta: any, i: number) => (
					<Revelar
						como="li"
						key={tarjeta.titulo}
						variante="margen"
						retraso={i * 120}
						className="flex gap-5"
					>
						<span
							aria-hidden
							className="bg-primary/15 text-primary-accent ring-primary/20 grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1"
						>
							<Icono nombre={tarjeta.icono} className="size-5" />
						</span>
						<div>
							<h3 className="text-lg font-semibold">{tarjeta.titulo}</h3>
							<Rico html={tarjeta.texto} className="text-muted-foreground mt-2 leading-relaxed text-pretty" />
						</div>
					</Revelar>
				))}
			</ul>
		</Bloque>
	)
}

/** El momento previo al encuentro. Escueto: aquí manda la escena. */
function Cierre({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="enfoque"
				className="text-4xl font-bold tracking-tight text-balance sm:text-6xl"
			>
				{c.titulo}
			</Revelar>
			<Revelar como="div"
				retraso={160}
				className="text-muted-foreground mt-8 text-lg leading-relaxed text-pretty"
			>
				<Rico html={c.texto} />
			</Revelar>
		</Bloque>
	)
}

function CtaFinal({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const c = seccion.contenido
	return (
		<Bloque seccion={seccion} indice={indice}>
			<Revelar
				como="h2"
				variante="profundidad"
				className="text-3xl font-bold tracking-tight text-balance sm:text-5xl"
			>
				{c.titulo}
			</Revelar>
			<Revelar como="div" retraso={120} className="text-muted-foreground mt-5 text-lg">
				<Rico html={c.texto} />
			</Revelar>
			<Revelar retraso={220} className="mt-10">
				<Cta texto={c.cta_texto} url={c.cta_url} />
			</Revelar>
			{c.nota && (
				<Revelar como="p" retraso={300} className="text-muted-foreground mt-5 text-sm">
					{c.nota}
				</Revelar>
			)}
		</Bloque>
	)
}

const COMPONENTES: Record<
	Seccion["tipo"],
	React.ComponentType<{ seccion: Seccion; indice: number }>
> = {
	hero: Hero,
	manifiesto: Manifiesto,
	texto: Texto,
	estadisticas: Estadisticas,
	timeline: Timeline,
	tarjetas: Tarjetas,
	lista: Lista,
	cierre: Cierre,
	cta: CtaFinal,
}

export function RenderSeccion({ seccion, indice }: { seccion: Seccion; indice: number }) {
	const Componente = COMPONENTES[seccion.tipo]
	if (!Componente) return null
	return <Componente seccion={seccion} indice={indice} />
}
