import { Outlet } from 'react-router-dom'

const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a1628] relative overflow-hidden">

      {/* FONDO AZUL OSCURO PROFESIONAL */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,60,120,0.5),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(0,30,70,0.7),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,40,0.9),rgba(8,18,34,0.95))]" />

      {/* BRILLOS DORADOS SUTILES */}
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 h-96 w-[700px] bg-yellow-500 opacity-10 blur-3xl rounded-full" />
      <div className="absolute bottom-[-100px] right-[-80px] h-96 w-96 rounded-full bg-yellow-400 opacity-5 blur-3xl" />
      <div className="absolute bottom-10 left-[-80px] h-80 w-80 rounded-full bg-blue-600 opacity-20 blur-3xl" />

      {/* LÍNEAS DORADAS DECORATIVAS */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

      {/* CONTENIDO */}
      <div className="relative z-10 w-full flex items-center justify-center p-4">
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
