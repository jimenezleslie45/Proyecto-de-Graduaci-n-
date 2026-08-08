import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor de solicitudes para agregar el token de autenticación

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor de respuestas para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Comment logout to avoid demo loop
    // if (error.response?.status === 401) {
    //   useAuthStore.getState().logout()
    //   window.location.href = '/login'
    // }
    return Promise.reject(error)
  }
)

export default api
