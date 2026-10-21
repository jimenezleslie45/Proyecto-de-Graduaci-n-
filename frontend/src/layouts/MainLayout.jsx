import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  LayoutDashboard,
  DoorOpen,
  LogIn,
  LogOut,
  Monitor,
  Sparkles,
  Wrench,
  FileBarChart,
  Users,
  Play,
  Menu,
  CalendarRange
} from 'lucide-react'

import { useState } from 'react'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Button } from '../components/ui/Button'
import { canAccessRoute, normalizeRole } from '../utils/roleAccess'

const navigation = [
  { name: 'Panel', href: '/panel', icon: LayoutDashboard },
  { name: 'Reservas', href: '/reservas', icon: CalendarRange },
  { name: 'Registro', href: '/registro', icon: LogIn },
  { name: 'Salidas', href: '/salidas', icon: LogOut },
  { name: 'Habitaciones', href: '/habitaciones', icon: DoorOpen },
  { name: 'Monitor', href: '/monitor', icon: Monitor },
  { name: 'Gestión de Tareas de Limpieza', href: '/limpieza', icon: Sparkles },
  { name: 'Ejecución Limpieza', href: '/limpieza/ejecutar', icon: Play },
  { name: 'Reporte Mantenimiento', href: '/mantenimiento', icon: Wrench },
  { name: 'Ejecución Mantenimiento', href: '/mantenimiento/ejecutar', icon: Play },
  { name: 'Reportes Automatizados y KPIs', href: '/reportes', icon: FileBarChart },
  { name: 'Usuarios', href: '/usuarios', icon: Users },
]

const MainLayout = () => {
  const { usuario, cerrarSesion } = useAuthStore()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const rolActual = normalizeRole(usuario?.rol || usuario?.role)

  const handleLogout = () => {
    cerrarSesion()
    navigate('/ingreso')
  }

  const filteredNavigation = navigation.filter((item) =>
    canAccessRoute(rolActual, item.href)
  )

return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f3e7] via-[#e8ddbc] to-[#cba96d]/30 backdrop-blur-xl">

      {/* MOBILE SIDEBAR */}

      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>

        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="fixed inset-y-0 left-0 w-[280px]">

          <SidebarContent navigation={filteredNavigation} />

        </div>

      </div>

      {/* DESKTOP SIDEBAR */}

      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-[280px]">

        <SidebarContent navigation={filteredNavigation} />

      </div>

      {/* MAIN CONTENT */}

      <div className="lg:pl-[280px]">

        {/* HEADER */}

        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur-xl">

          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-4 ml-auto">

            <div className="hidden md:flex flex-col items-end">

              <span className="text-sm font-semibold text-slate-800">
                {usuario?.nombre}
              </span>

              <span className="text-xs text-slate-500">
                {usuario?.rol}
              </span>

            </div>

            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 rounded-xl"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>

          </div>

        </header>

        {/* PAGE */}

        <main className="p-6 lg:p-8">

          <Outlet />

        </main>

      </div>

    </div>
  )
}

const SidebarContent = ({ navigation }) => (
<div className="flex h-full flex-col bg-gradient-to-b from-[#173f62] via-[#123b63] to-[#0d2d4f] backdrop-blur-xl border-r border-[#8acaff]/50 shadow-[0_0_70px_rgba(37,99,235,0.25)]">

    {/* TOP BRAND */}
    <div className="px-6 pt-5 pb-3">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#285a81] via-[#123b63] to-[#071a2d] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.35)]">
          <div className="h-10 w-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-inner shadow-[#092143]/40">
            <span className="text-2xl">🏨</span>
          </div>
        </div>

        <div className="text-white">
          <div className="text-sm font-bold leading-tight text-white">SISTEMA HOTELERO</div>
          <div className="text-xs text-blue-100 mt-1">Gestión Hotelera</div>
        </div>
      </div>
    </div>

    <div className="px-4 pb-2">
      <div className="rounded-xl bg-white/15 backdrop-blur-md p-2 text-blue-50 text-sm shadow-sm ring-1 ring-white/20">Bienvenido</div>
    </div>

    {/* NAVIGATION */}
    <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto space-y-2 custom-scrollbar">
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) =>
            `group flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 transform ${
              isActive
                ? 'bg-white text-[#123b63] border-l-4 border-[#8acaff] shadow-[0_12px_30px_rgba(37,99,235,0.35)] scale-[1.01]'
                : 'text-blue-50 hover:bg-white hover:text-[#123b63] hover:translate-x-1'
            }`
          }
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 group-hover:bg-black/5 transition">
            <item.icon className="h-5 w-5 text-blue-100 group-hover:text-[#123b63]" />
          </div>

          <span className="tracking-wide flex-1">{item.name}</span>

          {/* subtle chevron for active */}
          <div className="opacity-0 group-hover:opacity-100 transition text-blue-200">›</div>
        </NavLink>
      ))}
    </nav>

    {/* FOOTER */}
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-3 bg-white/10 backdrop-blur-md p-2 rounded-xl">
        <div className="text-sm text-blue-100">Hotel System</div>
        <div className="text-xs text-blue-200/80">v1.0</div>
      </div>
    </div>
  </div>
)

export default MainLayout