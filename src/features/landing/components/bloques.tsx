import { Link } from "@tanstack/react-router"
import * as Iconos from "lucide-react"
import { Fragment } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { anclaDe } from "../data/navegacion"
import type { BloqueBase } from "../data/tipos"

/**
 * Mapeo de cada tipo de bloque del CMS a su componente.
 *
 * El HTML que llega del CMS **ya viene sanitizado del servidor** —lista blanca
 * de etiquetas, sin `<script>` ni atributos de evento— así que
 * `dangerouslySetInnerHTML` aquí es seguro. Sanitizar de nuevo en el cliente
 * daría una falsa sensación de defensa: si el servidor fallara, cualquier otro
 * consumidor de la misma tabla ya estaría comprometido.
 */

const Html = ({ html, className }: { html?: string; className?: string }) =>
  html ? (
    <div className={cn("contenido-rico", className)} dangerouslySetInnerHTML={{ __html: html }} />
  ) : null

/**
 * Título de sección con el acento subrayado del Figma: una barra corta de
 * color de marca justo debajo, no a lo ancho de todo el título. Se repite en
 * casi todas las secciones del diseño, así que vive en un solo lugar.
 */
function TituloSeccion({
  children,
  className,
  centrado = false,
  conAcento = true,
  mayusculas = false,
}: {
  children: React.ReactNode
  className?: string
  centrado?: boolean
  /** El Figma no pone el acento bajo todos los títulos — "Cómo donar" no lo lleva. */
  conAcento?: boolean
  mayusculas?: boolean
}) {
  if (!children) return null
  return (
    <div className={cn(centrado && "text-center", className)}>
      <h2 className={cn("text-3xl font-bold tracking-tight", mayusculas && "uppercase")}>
        {children}
      </h2>
      {conAcento && (
        <span
          aria-hidden
          className={cn("bg-primary mt-3 block h-1 w-14 rounded-full", centrado && "mx-auto")}
        />
      )}
    </div>
  )
}

/** Resuelve un icono de lucide por nombre; cae en un punto si no existe. */
function Icono({ nombre, className }: { nombre?: string; className?: string }) {
  const Componente = (
    Iconos as unknown as Record<string, React.ComponentType<{ className?: string }>>
  )[nombre ?? ""]
  if (!Componente) return <Iconos.Circle className={className} />
  return <Componente className={className} />
}

/** Enlace interno o externo según la URL. */
function BotonCta({ texto, url }: { texto?: string; url?: string }) {
  if (!texto) return null
  const destino = url || "/registro"
  const esInterno = destino.startsWith("/")

  return (
    <Button asChild size="lg" className="text-base">
      {esInterno ? (
        <Link to={destino}>{texto}</Link>
      ) : (
        <a href={destino} rel="noopener noreferrer">
          {texto}
        </a>
      )}
    </Button>
  )
}

/**
 * Foto de un bloque, o un marcador neutro mientras no exista.
 *
 * Ningún texto de "falta la imagen": eso es información de trabajo interno,
 * no algo que deba leer quien visita el sitio público. El marcador se lee
 * como una superficie decorativa a propósito, no como un error.
 */
function Foto({ url, alt, className }: { url?: string; alt: string; className?: string }) {
  if (!url) {
    return (
      <div
        aria-hidden
        className={cn(
          "bg-muted border-border/60 grid place-items-center rounded-xl border",
          className,
        )}
      >
        <Iconos.Image className="text-muted-foreground/40 size-10" />
      </div>
    )
  }
  return (
    <img src={url} alt={alt} className={cn("rounded-xl object-cover", className)} loading="lazy" />
  )
}

function Hero({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="from-primary/5 border-border/60 border-b bg-gradient-to-b to-transparent">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-primary-accent text-sm font-semibold tracking-wide uppercase">
            Registro público de donadores
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {contenido.titulo}
          </h1>
          <Html
            html={contenido.subtitulo}
            className="text-muted-foreground mt-5 max-w-xl text-lg leading-relaxed"
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BotonCta texto={contenido.cta_texto} url={contenido.cta_url} />
            <Button asChild size="lg" variant="outline" className="text-base">
              <a href="#contenido-1">Quiero saber más</a>
            </Button>
          </div>
          {contenido.nota && <p className="text-muted-foreground mt-4 text-sm">{contenido.nota}</p>}
        </div>

        <Foto
          url={contenido.imagen_url}
          alt=""
          // Coincide con la proporción real de hero.png (1019x680 ≈ 3:2). Antes
          // forzaba 4:3 y además cuadrado en escritorio, que recortaba de más
          // una foto pensada para verse horizontal.
          className="aspect-3/2 w-full"
        />
      </div>
    </section>
  )
}

/**
 * Texto acompañado de una foto a un lado. A diferencia de `Texto`, que es de
 * ancho de columna única, este bloque necesita su propio componente: hay que
 * decidir en qué columna cae cada cosa según `posicion_imagen`, y una foto
 * ausente tiene que dejar el marcador en el lado correcto igual.
 */
function TextoImagen({ contenido }: { contenido: Record<string, any> }) {
  const imagenALaIzquierda = contenido.posicion_imagen === "izquierda"

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <Foto
          url={contenido.imagen_url}
          alt=""
          // Coincide con celulas.png (564x317 ≈ 16:9).
          className={cn("aspect-video w-full", imagenALaIzquierda ? "lg:order-1" : "lg:order-2")}
        />
        <div className={imagenALaIzquierda ? "lg:order-2" : "lg:order-1"}>
          {/* Sin el acento subrayado: confirmado contra el Figma, esta
					    cabecera no lo lleva — a diferencia de "Beneficios" y
					    "Preguntas frecuentes", que sí. */}
          <TituloSeccion conAcento={false}>{contenido.titulo}</TituloSeccion>
          <Html
            html={contenido.contenido}
            className="text-muted-foreground mt-4 space-y-4 leading-relaxed"
          />
        </div>
      </div>
    </section>
  )
}

function Estadisticas({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="border-border/60 border-b py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <TituloSeccion className="mb-6">{contenido.titulo}</TituloSeccion>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {(contenido.cifras ?? []).map((cifra: any) => (
            <div
              key={cifra.etiqueta}
              className="bg-muted/40 flex items-center gap-4 rounded-xl p-5"
            >
              {/* El ícono es decorativo y opcional: una cifra sin `icono` no
							    debe cargar un círculo vacío de todos modos. */}
              {cifra.icono && (
                <span
                  aria-hidden
                  className="bg-secondary/10 text-secondary-accent grid size-12 shrink-0 place-items-center rounded-full"
                >
                  <Icono nombre={cifra.icono} className="size-6" />
                </span>
              )}
              <div>
                <p className="text-secondary-accent text-2xl font-bold tracking-tight">
                  {cifra.valor}
                </p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-snug">
                  {cifra.etiqueta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Texto({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {contenido.titulo && (
          <h2 className="text-3xl font-bold tracking-tight">{contenido.titulo}</h2>
        )}
        <Html
          html={contenido.contenido}
          className="text-muted-foreground mt-4 space-y-4 leading-relaxed"
        />
      </div>
    </section>
  )
}

/**
 * "Cómo donar", calcado del Figma: números grandes en vez de insignia con
 * ícono, sin tarjeta ni fondo, unidos por una línea corta entre cada par. No
 * lleva el acento subrayado del título — el Figma no lo pone aquí, a
 * diferencia de las demás secciones.
 *
 * Los números y las líneas van en una fila propia (flexbox, para que cada
 * línea tenga un ancho fijo y no se reparta el espacio con los números) y los
 * títulos/descripciones en una cuadrícula aparte debajo, con el mismo número
 * de columnas — así quedan centrados bajo su número sin acoplar ambas filas
 * a un único layout rígido.
 */
function Timeline({ contenido }: { contenido: Record<string, any> }) {
  const pasos: any[] = contenido.pasos ?? []

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <TituloSeccion centrado conAcento={false} mayusculas>
          {contenido.titulo}
        </TituloSeccion>
        <Html
          html={contenido.descripcion}
          className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center"
        />

        <div className="mt-10">
          <div className="hidden items-center sm:flex" aria-hidden="true">
            {pasos.map((_, indice) => (
              <Fragment key={indice}>
                {indice > 0 && <span className="bg-border mx-2 h-px w-8 shrink-0 lg:w-12" />}
                <span className="text-primary flex-1 text-center text-4xl font-extrabold lg:text-5xl">
                  {indice + 1}
                </span>
              </Fragment>
            ))}
          </div>

          <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-4 sm:grid-cols-4">
            {pasos.map((paso, indice) => (
              <li key={paso.titulo} className="text-center">
                {/* El número se repite aquí, sin la fila de conectores: en
								    móvil (donde esa fila se oculta) sigue siendo un paso
								    numerado y no un título suelto. */}
                <span className="text-primary block text-3xl font-extrabold sm:hidden">
                  {indice + 1}
                </span>
                <h3 className="text-sm font-bold tracking-wide uppercase sm:text-base">
                  {paso.titulo}
                </h3>
                <Html
                  html={paso.texto}
                  className="text-muted-foreground mt-2 text-sm leading-relaxed"
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Tarjetas({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <TituloSeccion centrado>{contenido.titulo}</TituloSeccion>
        <Html
          html={contenido.descripcion}
          className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center"
        />

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(contenido.tarjetas ?? []).map((tarjeta: any) => (
            <li key={tarjeta.titulo} className="bg-muted/40 rounded-xl p-6">
              {/* El ícono es opcional a propósito: estas tarjetas se usan
							    tanto con insignia (p. ej. "Requisitos") como sin ella
							    (p. ej. "Beneficios"), y forzar un círculo vacío se ve
							    peor que no tener nada. */}
              {tarjeta.icono && (
                <span
                  aria-hidden
                  className="bg-primary/10 text-primary-accent mb-4 grid h-11 w-11 shrink-0 place-items-center rounded-lg"
                >
                  <Icono nombre={tarjeta.icono} className="size-5" />
                </span>
              )}
              <h3 className="font-semibold">{tarjeta.titulo}</h3>
              <Html
                html={tarjeta.texto}
                className="text-muted-foreground mt-1.5 text-sm leading-relaxed"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Faq({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <TituloSeccion>{contenido.titulo}</TituloSeccion>
        {/* Cada pregunta es su propia tarjeta, con aire entre ellas — el Figma
				    no usa un acordeón de divisores como el shadcn por omisión, sino
				    una lista de cajas separadas. `border-0` quita la línea que trae
				    `AccordionItem` por defecto, que aquí sobraría junto al fondo. */}
        <Accordion type="single" collapsible className="mt-8 space-y-3">
          {(contenido.preguntas ?? []).map((item: any, indice: number) => (
            <AccordionItem
              key={item.pregunta}
              value={`p-${indice}`}
              className="bg-muted/40 rounded-xl border-0 px-5"
            >
              <AccordionTrigger className="text-left text-base font-semibold">
                {item.pregunta}
              </AccordionTrigger>
              <AccordionContent>
                <Html
                  html={item.respuesta}
                  className="text-muted-foreground space-y-3 text-base leading-relaxed"
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function Cta({ contenido }: { contenido: Record<string, any> }) {
  // Con foto: el Figma pone el texto en azul marino, directo sobre la
  // imagen, alineado a la izquierda — no centrado ni en blanco, que fue mi
  // primer intento antes de tener la foto real.
  //
  // Con la foto puesta (vida.png) medí el contraste real, no solo el peor
  // caso teórico: el marino sobre el promedio de la mitad izquierda de la
  // foto da 11.4:1, pero hay un parche oscuro real (sombra de nube, hacia el
  // borde derecho de esa mitad) que sin nada encima se queda en 1.77:1 — muy
  // por debajo de AA. Un velo NEGRO habría tapado la foto (el Figma la deja
  // ver completa); en vez de eso lleva un velo BLANCO con meseta —opaco al
  // 70% en toda la franja donde cae el texto, no un degradado lineal que se
  // iría diluyendo antes de cubrir ese parche— y se desvanece del todo hacia
  // la derecha, donde está ella y donde el Figma no pone texto encima.
  // Verificado con el archivo real: 70% sobre ese parche da 8.98:1.
  //
  // ⚠️ Esto se verificó contra `vida.png` en las proporciones de escritorio.
  // `object-cover` recorta distinto en pantallas angostas; conviene revisar
  // visualmente en móvil una vez desplegado, por si el recorte responsivo
  // deja el texto sobre una zona que aquí no se midió.
  if (contenido.imagen_url) {
    return (
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={contenido.imagen_url}
              alt=""
              aria-hidden
              className="aspect-21/9 w-full object-cover sm:aspect-8/3"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.70) 55%, rgba(255,255,255,0) 85%)",
              }}
            />
            <div className="absolute inset-0 flex items-center">
              {/* Color fijo, no `text-foreground`: el velo de abajo es blanco
                  sin importar el tema, así que el texto tiene que seguir
                  siendo oscuro también sin importarlo. `text-foreground` se
                  invierte a casi blanco en modo oscuro y desaparece contra el
                  velo — el contraste medido arriba (8.98:1) era solo para
                  claro. */}
              <div className="max-w-md px-8 sm:px-12" style={{ color: "#15272F" }}>
                <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                  {contenido.titulo}
                </h2>
                <Html html={contenido.texto} className="mt-4 leading-relaxed opacity-80" />
                <div className="mt-8">
                  <Button asChild size="lg" className="text-base">
                    <Link to={contenido.cta_url || "/registro"}>{contenido.cta_texto}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Bloque grande => color ancla (el 30%), no el de marca. El naranja
				    de Red Vida está calibrado para el 10%: a pantalla completa satura,
				    y además no admite texto blanco encima (3.42:1). */}
        <Card className="bg-contraste text-contraste-foreground border-0">
          <CardContent className="p-8 text-center sm:p-12">
            <Iconos.CheckCircle2 aria-hidden className="mx-auto size-10 opacity-90" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-balance">
              {contenido.titulo}
            </h2>
            <Html html={contenido.texto} className="mt-4 leading-relaxed opacity-90" />
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="text-base">
                <Link to={contenido.cta_url || "/registro"}>{contenido.cta_texto}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function HtmlLibre({ contenido }: { contenido: Record<string, any> }) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Html html={contenido.html} />
      </div>
    </section>
  )
}

const COMPONENTES: Record<string, React.ComponentType<{ contenido: Record<string, any> }>> = {
  hero: Hero,
  estadisticas: Estadisticas,
  texto: Texto,
  texto_imagen: TextoImagen,
  timeline: Timeline,
  tarjetas: Tarjetas,
  faq: Faq,
  cta: Cta,
  html: HtmlLibre,
}

/**
 * Renderiza un bloque.
 *
 * Un tipo desconocido **no rompe la página**: se omite en silencio. Es lo que
 * permite publicar un tipo nuevo en el servidor antes de desplegar el
 * componente que lo dibuja, sin dejar el sitio en blanco entre ambos pasos.
 */
export function RenderBloque({ bloque, indice }: { bloque: BloqueBase; indice: number }) {
  const Componente = COMPONENTES[bloque.tipo]
  if (!Componente) {
    if (import.meta.env.DEV) {
      console.warn(`[cms] tipo de bloque sin componente: "${bloque.tipo}"`)
    }
    return null
  }
  return (
    <div id={anclaDe(bloque, indice)} className="scroll-mt-20">
      <Componente contenido={bloque.contenido} />
    </div>
  )
}

export default RenderBloque
