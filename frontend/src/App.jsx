import { Suspense } from 'react'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './stores/AppRoutes'

function App () {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1e293b', color: 'white' }}>Cargando...</div>}>
      <AppRoutes />
      <Toaster position="top-right" reverseOrder={false} />
    </Suspense>
  )
}

export default App