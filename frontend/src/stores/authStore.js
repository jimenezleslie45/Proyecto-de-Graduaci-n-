import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import { ServicioFirebase } from '../services/firebaseService'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      usuario: null,
      token: null,
      autenticado: false,
      cargando: false,
      error: null,

      iniciarSesion: async (usuario, contrasena) => {
        set({ cargando: true, error: null })
        try {
         

          
          // Nota: El backend espera { username, password }
          // Timeout para evitar que el login quede colgado indefinidamente
          const response = await api.post('http://localhost:3002/api/auth/login', { username: usuario, password: contrasena }, { timeout: 30000 })

          const payload = response.data?.data ?? response.data
          const { token, user } = payload

          // Normalizar rol para que coincida con la RBAC del frontend
          const rol = user?.rol || user?.role || user?.id_rol || user?.nombre_rol
          const rolNormalizado = rol == null ? null : String(rol).trim()
            
          set({ 
            usuario: {
              ...user,
              rol: rolNormalizado
            },
            token, 
            autenticado: true, 
            cargando: false 
          })
          return rolNormalizado; // Devolvemos el rol para la redirección
        } catch (error) {
          const mensajeError = error.response?.data?.message || error.message || 'Error al iniciar sesión';
          set({ 
            error: mensajeError,
            cargando: false 
          })
          return false
        }
      },

      cerrarSesion: async () => {
        if (ServicioFirebase.estaConfigurado()) {
          try {
            await ServicioFirebase.cerrarSesion()
          } catch (firebaseError) {
            console.warn('Error al cerrar sesión en Firebase:', firebaseError)
          }
        }

        set({ 
          usuario: null, 
          token: null, 
          autenticado: false 
        })
      },

      limpiarError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        usuario: state.usuario, 
        token: state.token, 
        autenticado: state.autenticado 
      })
    }
  )
)
