import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import {
  LogIn,
  Lock,
  User,
  Shield,
  Bell,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { motion } from 'framer-motion'

const Login = () => {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rolSeleccionado, setRolSeleccionado] = useState(null)

  const {
    iniciarSesion,
    cargando,
    error,
    limpiarError,
    usuario: usuarioActual,
  } = useAuthStore()

  const navigate = useNavigate()

  const roles = [
    { id: 'admin', nombre: 'Administrador', icon: Shield },
    { id: 'recepcionista', nombre: 'Recepcionista', icon: Bell },
    { id: 'limpieza', nombre: 'Limpieza', icon: Sparkles },
    { id: 'mantenimiento', nombre: 'Mantenimiento', icon: Wrench },
  ]

  const getHomeRoute = (rol) => {
    const rolNormalizado = rol == null ? null : String(rol).trim()
    if (rolNormalizado === 'Limpieza') return '/limpieza'
    if (rolNormalizado === 'Mantenimiento') return '/mantenimiento'
    return '/panel'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    limpiarError()
    const success = await iniciarSesion(usuario, contrasena)
    if (success) {
      toast.success('Inicio de sesión exitoso')
      const destino = getHomeRoute(usuarioActual?.rol)
      navigate(destino, { replace: true })
    } else {
      toast.error(error || 'No se pudo iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#060d1f] relative overflow-hidden p-4">

      {/* FONDO AZUL OSCURO ELEGANTE */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(30,80,160,0.45),transparent_50%),radial-gradient(circle_at_80%_90%,rgba(10,40,90,0.6),transparent_50%)]" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-96 w-[720px] bg-yellow-400 opacity-[0.07] blur-3xl rounded-full" />
      <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-yellow-300 opacity-[0.05] blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]" />

{/* LÍNEA DORADA SUPERIOR */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent" />

      {/* TARJETA CUADRADA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-[430px] max-w-full"
      >
<div className="relative w-full bg-[#0a1730]/40 backdrop-blur-md border-2 border-yellow-200/70 shadow-[0_0_80px_rgba(0,0,0,0.7),0_0_40px_rgba(253,224,71,0.15)] overflow-hidden flex flex-col rounded-3xl">

          {/* BORDE SUPERIOR ORO */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-300/80 via-yellow-100/90 to-yellow-300/80 shrink-0" />

          {/* BORDE LATERAL DERECHO CURVADO ORO */}
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-b from-yellow-300/80 via-yellow-100/90 to-yellow-300/80 rounded-l-2xl shadow-[-3px_0_20px_rgba(253,224,71,0.2)]" />

          {/* BORDE LATERAL IZQUIERDO CURVADO ORO */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-yellow-300/80 via-yellow-100/90 to-yellow-300/80 rounded-r-2xl shadow-[3px_0_20px_rgba(253,224,71,0.2)]" />

          {/* BORDE INFERIOR ORO */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-300/80 via-yellow-100/90 to-yellow-300/80 shrink-0" />

          {/* CONTENIDO */}
          <div className="flex-1 px-10 py-7 flex flex-col overflow-y-auto">

            {/* HEADER */}
            <div className="flex flex-col items-center text-center mb-5">
<div className="mb-3 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-200/50 to-amber-300/40 flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.15)]">
                <Shield className="h-8 w-8 text-yellow-200/80" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-yellow-200/60 font-semibold mb-1">
                Hotel Los Arcos
              </p>
              <h1 className="text-3xl font-bold text-yellow-200/90 mb-1 tracking-wide">
                Iniciar Sesión
              </h1>
              <p className="mt-1 text-xs text-slate-300">
                Gestión profesional · Seleccione su rol
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-4 border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 rounded">
                {error}
              </div>
            )}

            {/* SELECCIÓN DE ROLES */}
            <div className="mb-5">
              <div className="grid grid-cols-2 gap-2.5">
                {roles.map((rol) => {
                  const IconComponent = rol.icon
                  const isSelected = rolSeleccionado === rol.id
                  return (
                    <motion.button
                      key={rol.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setRolSeleccionado(rol.id)}
                      className={`relative p-3 border-2 rounded-lg transition-all duration-300 flex flex-col items-center gap-2 group ${
isSelected
                          ? 'border-yellow-200/60 bg-yellow-200/10 shadow-[0_0_20px_rgba(250,204,21,0.1)]'
                          : 'border-slate-600/50 bg-slate-700/20 hover:border-yellow-200/40 hover:bg-yellow-200/5'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg transition-all ${
isSelected
                          ? 'bg-gradient-to-br from-yellow-200/70 to-amber-300/50'
                          : 'bg-yellow-200/10 group-hover:bg-yellow-200/20'
                      }`}>
                        <IconComponent className={`h-5 w-5 ${isSelected ? 'text-[#0a1730]' : 'text-yellow-200/80'}`} />
                      </div>
                      <span className={`text-[11px] font-semibold text-center leading-tight ${isSelected ? 'text-yellow-200' : 'text-slate-300'}`}>
                        {rol.nombre}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-3">

              {/* USUARIO */}
              <div className="relative">
<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-200/50" />
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Usuario"
                  required
className="w-full bg-slate-800/60 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg border border-slate-600/50 placeholder:text-slate-500 text-sm focus:outline-none focus:border-yellow-200/60 focus:ring-1 focus:ring-yellow-200/30 transition-colors"
                />
              </div>

              {/* CONTRASEÑA */}
              <div className="relative">
<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-200/50" />
                <input
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Contraseña"
                  required
className="w-full bg-slate-800/60 text-slate-100 pl-10 pr-4 py-2.5 rounded-lg border border-slate-600/50 placeholder:text-slate-500 text-sm focus:outline-none focus:border-yellow-200/60 focus:ring-1 focus:ring-yellow-200/30 transition-colors"
                />
              </div>

              {/* BOTÓN INGRESAR */}
              <button
                type="submit"
                disabled={cargando || !usuario || !contrasena}
className="w-full h-11 mt-3 rounded-lg bg-gradient-to-r from-yellow-200/70 via-amber-200/60 to-yellow-200/70 text-[#0a1730] font-bold uppercase tracking-[0.12em] text-sm shadow-[0_8px_25px_rgba(250,204,21,0.12)] transition-all duration-300 hover:shadow-[0_12px_35px_rgba(250,204,21,0.2)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0a1730] border-t-transparent"></div>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Ingresar
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
