import { create } from "zustand"

import { usePortalStore } from "./portalStore"

/**
 * Estado del wizard de registro.
 *
 * Vive **solo en memoria**: no se persiste en sessionStorage ni en
 * localStorage. Aquí hay datos personales a medio capturar (nombre, CURP,
 * correo) y, tras el alta, un `donadorId` con el que se llega a pasos que hoy
 * confían en él. Recargar la página reinicia el registro: es lo correcto para
 * un flujo público que puede usarse desde un equipo compartido, y evita que
 * quien termina de registrarse deje la sesión abierta en pantalla.
 *
 * Quien necesite retomar su trámite (agendar, cambiar la cita, contestar el
 * cuestionario) entra al portal `/mi-cita` con un código enviado a su correo.
 */

/** 1 datos · 2 OTP · 3 salud · 4 cita para toma de muestra · 5 consentimiento */
export type PasoRegistro = 1 | 2 | 3 | 4 | 5

export interface DatosPersonales {
	nombre: string
	apellido_pat: string
	apellido_mat: string
	fecha_nacimiento: string
	sexo_id: string
	curp: string
	email: string
	telefono: string
	celular: string
	direccion: string
	codigo_postal: string
	pais_id: string
	estado_id: string
	municipio_id: string
}

export interface ResultadoElegibilidad {
	resultado: "apto" | "no_apto_temporal" | "no_apto_permanente"
	motivos: { clave: string; descripcion: string; bloqueado_hasta?: string }[]
	bloqueado_hasta: string | null
}

export interface DatosConsentimiento {
	id: string
	fechaAceptacion: string
}

/** Cita para la toma de muestra de ADN de la que se obtiene el perfil HLA. */
export interface DatosCita {
	fecha: string
	hora: string
}

interface RegistroState {
	paso: PasoRegistro
	datos: Partial<DatosPersonales>
	donadorId: number | null
	codigoRegistro: string | null
	emailVerificado: boolean
	/** Indica si el proveedor confirmó el envío inicial del OTP. */
	otpEnviado: boolean | null
	elegibilidad: ResultadoElegibilidad | null
	cita: DatosCita | null
	consentimiento: DatosConsentimiento | null
	/** Respondió "No" a donar a cualquier paciente compatible: no hay registro. */
	declino: boolean

	setPaso: (paso: PasoRegistro) => void
	setDatos: (datos: Partial<DatosPersonales>) => void
	setAlta: (payload: { donadorId: number; codigoRegistro: string; otpEnviado: boolean }) => void
	setEmailVerificado: (verificado: boolean) => void
	setElegibilidad: (resultado: ResultadoElegibilidad) => void
	setCita: (cita: DatosCita) => void
	setConsentimiento: (datos: DatosConsentimiento) => void
	setDeclino: (declino: boolean) => void
	limpiar: () => void
}

const ESTADO_INICIAL = {
	paso: 1 as PasoRegistro,
	datos: {},
	donadorId: null,
	codigoRegistro: null,
	emailVerificado: false,
	otpEnviado: null,
	elegibilidad: null,
	cita: null,
	consentimiento: null,
	declino: false,
}

export const useRegistroStore = create<RegistroState>()((set) => ({
	...ESTADO_INICIAL,

	setPaso: (paso) => set({ paso }),
	setDatos: (datos) => set((estado) => ({ datos: { ...estado.datos, ...datos } })),
	setAlta: ({ donadorId, codigoRegistro, otpEnviado }) =>
		set({ donadorId, codigoRegistro, otpEnviado, paso: 2 }),
	setEmailVerificado: (emailVerificado) => set({ emailVerificado, paso: 3 }),
	setElegibilidad: (elegibilidad) => set({ elegibilidad }),
	// Solo quien resulta apto llega aquí: agendar la cita avanza al
	// último paso, el consentimiento.
	setCita: (cita) => set({ cita, paso: 5 }),
	// Firmar es lo último: no hay paso siguiente, así que no avanza el
	// wizard. El propio paso de consentimiento muestra la confirmación
	// en cuanto `consentimiento` deja de ser `null`.
	setConsentimiento: (consentimiento) => set({ consentimiento }),
	// Quien declina no se registra: se descartan los datos a medio capturar.
	setDeclino: (declino) => {
		// Quien declina no se registra: tampoco conserva sesión.
		if (declino) usePortalStore.getState().cerrar()
		set(declino ? { ...ESTADO_INICIAL, declino } : { declino })
	},
	limpiar: () => {
		usePortalStore.getState().cerrar()
		set(ESTADO_INICIAL)
	},
}))
