import { create } from "zustand"

/**
 * Sesión del portal del donador. **Solo en memoria**, a propósito: recargar la
 * página o cerrar la pestaña la termina, igual que el wizard de registro. Es un
 * portal con datos personales que puede abrirse desde un equipo compartido.
 */
interface PortalState {
	token: string | null
	iniciar: (token: string) => void
	cerrar: () => void
}

export const usePortalStore = create<PortalState>()((set) => ({
	token: null,
	iniciar: (token) => set({ token }),
	cerrar: () => set({ token: null }),
}))
