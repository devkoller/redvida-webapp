import { createFileRoute } from "@tanstack/react-router"
import { AdminCitasPage } from "@/features/admin-citas"
import { RequierePermiso } from "@/features/auth/RequierePermiso"
export const Route = createFileRoute("/admin/citas")({ component: () => <RequierePermiso permisos={["donador:read"]}><AdminCitasPage /></RequierePermiso> })
