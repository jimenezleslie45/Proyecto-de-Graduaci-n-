import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

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

const AppRoutes = () => {
  const { autenticado } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ingreso" element={!autenticado ? <Login /> : <Navigate to="/panel" />} />

        {/* Rutas Protegidas dentro del MainLayout */}
        <Route path="/" element={autenticado ? <MainLayout /> : <Navigate to="/ingreso" />}>
          <Route index element={<Navigate to="/panel" />} />
          <Route path="panel" element={<Panel />} /> 
          <Route path="habitaciones" element={<Habitaciones />} />
          <Route path="registro" element={<CheckIn />} />
          <Route path="reservas" element={<Reservas />} />
          <Route path="salidas" element={<CheckOut />} />
          <Route path="monitor" element={<Monitor />} />
          <Route path="limpieza" element={<GestionLimpieza />} />
          <Route path="limpieza/ejecutar" element={<EjecucionLimpieza />} />
          <Route path="mantenimiento" element={<ReporteMantenimiento />} />
          <Route path="mantenimiento/ejecutar" element={<EjecucionMantenimiento />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="usuarios" element={<Usuarios />} />
        </Route>

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to={autenticado ? '/panel' : '/ingreso'} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes