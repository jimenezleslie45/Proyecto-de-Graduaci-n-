import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { canAccessRoute } from '../utils/roleAccess'

// --- Layouts ---
import MainLayout from '../layouts/MainLayout'

// --- Páginas Públicas ---
import Login from '../pages/Login'

// --- Páginas Protegidas (Las 10 pantallas) ---
import Panel from '../pages/Dashboard' // Corregido: Panel es Dashboard.jsx
import Habitaciones from '../pages/Habitaciones' // Corregido: El componente se llama Habitaciones
import CheckIn from '../pages/CheckIn' // Corregido: La ruta no tiene 'Operaciones'
import CheckOut from '../pages/CheckOut' // Corregido: La ruta no tiene 'Operaciones'
import Monitor from '../pages/Monitor'
import GestionLimpieza from '../pages/GestionLimpieza' // Corregido: El componente se llama GestionLimpieza
import EjecucionLimpieza from '../pages/EjecucionLimpieza' // Corregido: La ruta no tiene 'Limpieza'
import ReporteMantenimiento from '../pages/ReporteMantenimiento' // Corregido: La ruta no tiene 'Mantenimiento'
import EjecucionMantenimiento from '../pages/EjecucionMantenimiento' // Corregido: La ruta no tiene 'Mantenimiento'
import Reportes from '../pages/Reportes' // Corregido: El componente se llama Reportes
import Usuarios from '../pages/Usuarios' // Corregido: El componente se llama Usuarios
import Reservas from '../pages/Reservas'

const ProtectedScreen = ({ path, children }) => {
  const { usuario } = useAuthStore()
  return canAccessRoute(usuario?.rol || usuario?.role, path)
    ? children
    : <Navigate to="/panel" replace />
}

const AppRoutes = () => {
  const { autenticado } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ingreso" element={!autenticado ? <Login /> : <Navigate to="/panel" />} />

        {/* Rutas Protegidas dentro del MainLayout */}
        <Route path="/" element={autenticado ? <MainLayout /> : <Navigate to="/ingreso" />}>
          <Route index element={<Navigate to="/panel" />} />
          <Route path="panel" element={<ProtectedScreen path="/panel"><Panel /></ProtectedScreen>} />
          <Route path="habitaciones" element={<ProtectedScreen path="/habitaciones"><Habitaciones /></ProtectedScreen>} />
          <Route path="reservas" element={<ProtectedScreen path="/reservas"><Reservas /></ProtectedScreen>} />
          <Route path="registro" element={<ProtectedScreen path="/registro"><CheckIn /></ProtectedScreen>} />
          <Route path="salidas" element={<ProtectedScreen path="/salidas"><CheckOut /></ProtectedScreen>} />
          <Route path="monitor" element={<ProtectedScreen path="/monitor"><Monitor /></ProtectedScreen>} />
          <Route path="limpieza" element={<ProtectedScreen path="/limpieza"><GestionLimpieza /></ProtectedScreen>} />
          <Route path="limpieza/ejecutar" element={<ProtectedScreen path="/limpieza/ejecutar"><EjecucionLimpieza /></ProtectedScreen>} />
          <Route path="mantenimiento" element={<ProtectedScreen path="/mantenimiento"><ReporteMantenimiento /></ProtectedScreen>} />
          <Route path="mantenimiento/ejecutar" element={<ProtectedScreen path="/mantenimiento/ejecutar"><EjecucionMantenimiento /></ProtectedScreen>} />
          <Route path="reportes" element={<ProtectedScreen path="/reportes"><Reportes /></ProtectedScreen>} />
          <Route path="usuarios" element={<ProtectedScreen path="/usuarios"><Usuarios /></ProtectedScreen>} />
        </Route>

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to={autenticado ? '/panel' : '/ingreso'} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes