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
  Menu
} from 'lucide-react'

import { useState, useEffect } from 'react'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { Button } from '../components/ui/Button'

const navigation = [
  // 1) Panel (Dashboard visual) - Admin, Recepcionista
  { name: 'Panel', href: '/panel', icon: LayoutDashboard, roles: ['recepcion', 'admin'] },

  // 2) Gestión de Habitaciones - Admin, Recepcionista
  { name: 'Habitaciones', href: '/habitaciones', icon: DoorOpen, roles: ['admin', 'recepcion'] },

  // 3) Registro de Check-in - Admin, Recepcionista
  { name: 'Registro', href: '/registro', icon: LogIn, roles: ['recepcion', 'admin'] },

  // 4) Registro de Check-out - Admin, Recepcionista
  { name: 'Salidas', href: '/salidas', icon: LogOut, roles: ['recepcion', 'admin'] },

  // 5) Monitor de Estados - Todos los roles
  { name: 'Monitor', href: '/monitor', icon: Monitor, roles: ['recepcion', 'limpieza', 'mantenimiento', 'admin'] },

// 6) Gestión de Tareas de Limpieza - Admin, Recepción, Limpieza
  { name: 'Gestión de Tareas de Limpieza', href: '/limpieza', icon: Sparkles, roles: ['limpieza', 'recepcion', 'admin'] },

  // 7) Ejecución de Limpieza - Admin, Limpieza
  { name: 'Ejecución Limpieza', href: '/limpieza/ejecutar', icon: Play, roles: ['limpieza', 'admin'] },

  // 8) Reporte de Mantenimiento - Admin, Mantenimiento
  { name: 'Reporte Mantenimiento', href: '/mantenimiento', icon: Wrench, roles: ['mantenimiento', 'admin'] },

  // 9) Ejecución de Mantenimiento - Admin, Mantenimiento
  { name: 'Ejecución Mantenimiento', href: '/mantenimiento/ejecutar', icon: Play, roles: ['mantenimiento', 'admin'] },

// 10) Reportes y KPIs - Solo Admin
  { name: 'Reportes Automatizados y KPIs', href: '/reportes', icon: FileBarChart, roles: ['admin'] },

  // 11) Usuarios - Solo Admin
  { name: 'Usuarios', href: '/usuarios', icon: Users, roles: ['admin'] },
]



const MainLayout = () => {
  const { usuario, cerrarSesion } = useAuthStore()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    cerrarSesion()
    navigate('/ingreso')
  }

  // Pon esto justo abajo de donde declaras tus "const { usuario } = useAuthStore()"
  useEffect(() => {
    // Si la consola del backend ya sabe qué rol es pero el frontend no tiene token:
    if (!localStorage.getItem('token')) {
      // Le inyectamos un token temporal para que las peticiones de las habitaciones funcionen
      localStorage.setItem('token', 'token_desarrollo_simulado');
      localStorage.setItem('userRole', usuario?.rol || 'limpieza');
    }
  }, [usuario]);
  
  // ====== EN TU MAINLAYOUT.JSX ======
  
  // 1. Capturamos el rol real que está detectando tu consola
  const rolActual = usuario?.rol || usuario?.userRole || localStorage.getItem('userRole');
  
  // 2. Filtramos el menú de forma inteligente
  const filteredNavigation = navigation.filter(item => {
    // Si eres Admin, ves absolutamente todo (las 10 pantallas)
    if (rolActual === 'admin') return true;
  
    // Si no hay ningún rol detectado aún, por seguridad ocultamos hasta que cargue
    if (!rolActual) return false;
  
    // Normalizamos el texto (por si acaso viene como 'Limpieza' o 'recepcionista')
    let finalRole = rolActual.toString().toLowerCase().trim();
    if (finalRole === 'recepcionista') finalRole = 'recepcion';
  
    // Si el item de navegación incluye este rol, lo muestra.
    return item.roles.includes(finalRole);
  });

return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-300/60 backdrop-blur-xl">

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
<div className="flex h-full flex-col bg-gradient-to-b from-blue-900/70 via-blue-950/70 to-indigo-950/70 backdrop-blur-xl border-r border-blue-400/40 shadow-[0_0_70px_rgba(37,99,235,0.25)]">

    {/* TOP BRAND */}
    <div className="px-6 pt-5 pb-3">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.35)]">
          <div className="h-10 w-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-inner shadow-blue-900/40">
            <span className="text-2xl">🏨</span>
          </div>
        </div>

        <div className="text-white">
          <div className="text-lg font-bold leading-tight text-white">HOTEL LOS ARCOS</div>
          <div className="text-xs text-blue-200 mt-1">Sistema Administrativo</div>
        </div>
      </div>
    </div>

    <div className="px-4 pb-2">
      <div className="rounded-xl bg-white/20 backdrop-blur-md p-2 text-blue-50 text-sm shadow-sm ring-1 ring-white/30">Bienvenido</div>
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
                ? 'bg-white text-black border-l-4 border-blue-500 shadow-[0_12px_30px_rgba(37,99,235,0.35)] scale-[1.01]'
                : 'text-black hover:bg-white hover:text-black hover:translate-x-1'
            }`
          }
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 group-hover:bg-black/5 transition">
            <item.icon className="h-5 w-5 text-slate-700" />
          </div>

          <span className="tracking-wide flex-1">{item.name}</span>

          {/* subtle chevron for active */}
          <div className="opacity-0 group-hover:opacity-100 transition text-blue-500">›</div>
        </NavLink>
      ))}
    </nav>

    {/* FOOTER */}
    <div className="px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-3 bg-white/15 backdrop-blur-md p-2 rounded-xl">
        <div className="text-sm text-blue-100">Hotel System</div>
        <div className="text-xs text-blue-200/80">v1.0</div>
      </div>
    </div>
  </div>
)

export default MainLayout