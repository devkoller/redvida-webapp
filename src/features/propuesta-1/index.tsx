import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"

import { useContenidoPagina } from "@/features/landing/data/contenido"
import { cn } from "@/lib/utils"
import { Ambiente, Grano } from "./components/Ambiente"
import { CargaEscena } from "./components/CargaEscena"
import { FondoEstatico } from "./components/FondoEstatico"
import { RenderSeccion } from "./components/secciones"
import { aplicarCms } from "./data/desdeCms"
import { GUION } from "./data/guion"
import { ProveedorEscena, useEscena } from "./escena/estado"
import { useAnimacionActiva } from "./escena/preferencias"
import "./propuesta.css"

/**
 * Landing narrativa · ruta `/`
 *
 * Es la portada del sitio. Antes vivía en `/propuesta-1` como propuesta de
 * rediseño; aprobada, sustituyó a la portada de bloques del CMS. La carpeta
 * conserva el nombre de la propuesta por historia: renombrarla movería decenas
 * de archivos sin cambiar nada de lo que hace.
 *
 * **Los textos salen del CMS** (página `propuesta-1`, editable en
 * /admin/contenido); la estructura y la coreografía, del guion.
 *
 * Orden de lectura recomendado para entender la pieza:
 *
 * 1. `data/guion.ts` — la historia, acto por acto.
 * 2. `escena/estado.tsx` — cómo el scroll se convierte en un número.
 * 3. `escena/Figura.tsx` — cómo ese número mueve al monigote.
 *
 * La página **está completa sin la escena 3D**. El lienzo es una capa
 * decorativa que se monta solo si la persona quiere movimiento y el equipo da
 * para ello; si no, se pinta `<FondoEstatico>` y no se descarga three.
 */

// Cargado aparte: three y react-three-fiber no deben pesar en el arranque.
const Lienzo = lazy(() => import("./escena/Lienzo"))

/** Espera a que el hilo principal esté ocioso para montar el lienzo. */
function useMontarDiferido(activo: boolean) {
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!activo) return
    const ventana = window as Window & {
      requestIdleCallback?: (cb: () => void, opciones?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (ventana.requestIdleCallback) {
      const id = ventana.requestIdleCallback(() => setListo(true), { timeout: 1500 })
      return () => ventana.cancelIdleCallback?.(id)
    }
    // Safari no tiene `requestIdleCallback`. Un respiro basta: lo que importa
    // es no competir con el primer pintado.
    const id = setTimeout(() => setListo(true), 400)
    return () => clearTimeout(id)
  }, [activo])

  return listo
}

function Escenario({
  alEstarListo,
  alProgreso,
}: {
  alEstarListo: () => void
  alProgreso: (valor: number) => void
}) {
  const { estado, refEscenario } = useEscena()
  const { escena, movimiento } = useAnimacionActiva()
  const montar = useMontarDiferido(escena)

  // Los textos salen del CMS (`/admin/contenido`); la estructura y la
  // coreografía, del guion. Ver `data/desdeCms.ts`.
  const { data: cms, isPending: cargandoTextos } = useContenidoPagina("propuesta-1")
  const secciones = useMemo(() => (cms ? aplicarCms(GUION, cms.bloques) : GUION), [cms])

  // Si el CMS no responde, la página no puede quedarse en blanco: pasado un
  // momento se muestran los textos del guion. Si luego llegan los del CMS, se
  // sustituyen (es raro y es preferible a una página invisible).
  const [esperaAgotada, setEsperaAgotada] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setEsperaAgotada(true), 2500)
    return () => clearTimeout(id)
  }, [])
  const reservando = cargandoTextos && !esperaAgotada

  return (
    <div className="escenario" data-lienzo={escena ? "si" : "no"} ref={refEscenario as any}>
      {/* El hueco de 100dvh existe desde el primer pintado: el contenido lo
			    recupera con un margen negativo, y si apareciera más tarde la página
			    daría un salto. */}
      <div className="lienzo" aria-hidden="true">
        {/*
				 * El fondo vivo va **debajo de todo lo demás**, y ese orden es la
				 * pieza: el lienzo 3D se dibuja con alfa, así que estas luces se ven
				 * alrededor de las figuras en vez de quedar tapadas por ellas. Se
				 * monta siempre —haya escena o no, se quiera movimiento o no—, porque
				 * es el fondo de la página y no un adorno de la escena.
				 *
				 * El polvo en suspensión es la excepción: solo se monta **cuando no
				 * va a haber escena**. Donde hay lienzo, quien pone los puntos de luz
				 * es el campo de estrellas (`escena/Galaxia.tsx`), y sumarle otro
				 * enjambre de motas por delante sería un segundo sistema de
				 * partículas moviéndose a otra velocidad sobre el primero.
				 */}
        <Ambiente conPolvo={movimiento && !escena} />

        {/*
				 * La ilustración plana **solo se muestra a quien no va a ver la
				 * escena**. Cuando el lienzo sí va a montarse, enseñarla primero y
				 * sustituirla después se lee como un error: aparecen dos figuras
				 * planas y una esfera, y un segundo más tarde salta otra cosa. Es
				 * mejor un fondo vacío durante ese segundo que un anticipo falso de
				 * lo que se va a ver.
				 */}
        {!escena && <FondoEstatico />}
        {escena && montar && (
          <Suspense fallback={null}>
            <Lienzo estado={estado} alEstarListo={alEstarListo} alProgreso={alProgreso} />
          </Suspense>
        )}

        {/* Y el grano, por delante de todo: es lo que hace que la escena y el
				    fondo se lean como una sola superficie. */}
        <Grano />
      </div>

      {/* Mientras llegan los textos del CMS el contenido se reserva sin verse
			    (`invisible` conserva el espacio): así nadie lee un instante el
			    texto de respaldo y ve cómo cambia. Si el CMS falla, se muestra el
			    del guion. */}
      <div className={cn("contenido", reservando && "invisible")} aria-busy={reservando}>
        {secciones.map((seccion, indice) => (
          <RenderSeccion key={seccion.id} seccion={seccion} indice={indice} />
        ))}
      </div>
    </div>
  )
}

/**
 * **Esta ruta ya no fuerza el modo oscuro, y quitarlo arregló dos cosas.**
 *
 * Lo hacía escribiendo la clase directamente sobre `<html>` al montar, por
 * detrás del proveedor de tema. Como el proveedor no se enteraba, su estado y el
 * DOM decían cosas distintas, y de ahí salían los dos síntomas que se veían:
 *
 * - **La preferencia no sobrevivía a recargar.** Se elegía claro, el proveedor
 *   lo guardaba y lo aplicaba, y un instante después esta ruta volvía a poner
 *   `dark` encima. Al recargar parecía que no se hubiera guardado nada.
 * - **Había que pulsar el interruptor dos veces.** El botón decide a qué modo ir
 *   mirando el estado del proveedor, que creía estar en claro mientras el DOM
 *   estaba en oscuro: el primer clic pedía "oscuro" —que ya estaba— y no se veía
 *   nada, y solo el segundo movía algo.
 *
 * La escena sigue estando pensada para un escenario a oscuras, pero eso lo
 * decide quien mira, no la ruta.
 */
export function Propuesta1Page() {
  const { escena } = useAnimacionActiva()
  const [listo, setListo] = useState(false)
  const [progreso, setProgreso] = useState(0)

  // Referencias estables a propósito: `Lienzo` reinicia su efecto de carga
  // cada vez que estas funciones cambian de identidad, y sin `useCallback`
  // cambiaban en cada evento de progreso —el propio evento causaba el
  // re-render que las recreaba—, cortando en seco la pausa de 500ms que
  // separa el 100% del cruce hacia la escena.
  const alEstarListo = useCallback(() => setListo(true), [])

  return (
    <div className="propuesta text-foreground">
      <ProveedorEscena>
        <Escenario alEstarListo={alEstarListo} alProgreso={setProgreso} />
      </ProveedorEscena>
      {/*
			 * Pantalla completa, por encima de la cabecera y del contenido · RV-L2.12
			 *
			 * Antes el anillo vivía dentro del lienzo, así que mientras cargaba se
			 * veían la cabecera, el texto del primer acto y el botón del pie
			 * asomando alrededor: el anillo era un elemento más de una página ya
			 * visible, no una pantalla de carga. `position: fixed` lo saca de ese
			 * flujo y lo pone por delante de todo —cabecera incluida—, así que
			 * mientras exista solo se ve él.
			 *
			 * Se monta en cuanto se sabe que habrá lienzo, antes incluso de que el
			 * *chunk* de three.js llegue a pedirse.
			 */}
      {escena && <CargaEscena progreso={progreso} oculta={listo} />}
    </div>
  )
}

export default Propuesta1Page
