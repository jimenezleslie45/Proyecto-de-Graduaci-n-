import { useState, useEffect, lazy, Suspense } from 'react'
import api from '../services/api'
import { 
  DoorOpen, 
  Users, 
  Sparkles, 
  Wrench, 
  TrendingUp,
  Activity
} from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    habitaciones: { total: 0, disponibles: 0, ocupadas: 0, limpieza: 0, mantenimiento: 0 },
    limpieza: { pendientes: 0, enProceso: 0, completadas: 0 },
    mantenimiento: { pendientes: 0, enProceso: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/monitor/estados')
      // El backend devuelve { success: true, data: { ... } }
      // Aceptamos ambas formas por seguridad: response.data.data o response.data
      const payload = response.data?.data ?? response.data
      // En algunos endpoints demo la estructura puede variar; normalizamos campos esperados
      if (payload?.habitaciones) {
        setStats(payload)
      } else if (payload?.summary || payload?.rooms) {
        // Si viene resumen o lista, construimos un objeto mínimo compatible
        const habitacionesSummary = payload.summary || []
        const total = payload.total || habitacionesSummary.reduce((s, i) => s + (i.cantidad || 0), 0) || (payload.rooms ? payload.rooms.length : 0)
        setStats({
          habitaciones: { summary: habitacionesSummary, total, disponibles: 0, ocupadas: 0, limpieza: 0, mantenimiento: 0 },
          limpieza: { pendientes: 0, enProceso: 0, completadas: 0 },
          mantenimiento: { pendientes: 0, enProceso: 0 }
        })
      }
    } catch (error) {
      console.error('Error al cargar datos del panel:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { 
      name: 'Disponibles', 
      value: stats.habitaciones.disponibles, 
      total: stats.habitaciones.total,
      icon: DoorOpen, 
      color: 'bg-green-500' 
    },
    { 
      name: 'Ocupadas', 
      value: stats.habitaciones.ocupadas, 
      total: stats.habitaciones.total,
      icon: Users, 
      color: 'bg-red-500' 
    },
    { 
      name: 'Limpieza', 
      value: stats.limpieza.pendientes + stats.limpieza.enProceso, 
      icon: Sparkles, 
      color: 'bg-yellow-500' 
    },
    { 
      name: 'Mantenimiento', 
      value: stats.mantenimiento.pendientes + stats.mantenimiento.enProceso, 
      icon: Wrench, 
      color: 'bg-orange-500' 
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel</h1>
        <p className="text-gray-500">Resumen del estado del hotel</p>
      </div>

      {/* Cuadrícula de métricas */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <StatCard 
              icon={stat.icon} 
              value={stat.value}
              label={stat.name}
              color={stat.color === 'bg-green-500' ? 'green' : 'red'}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Estado de Habitaciones</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Disponibles</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${(stats.habitaciones.disponibles / stats.habitaciones.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{stats.habitaciones.disponibles}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Ocupadas</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full" 
                    style={{ width: `${(stats.habitaciones.ocupadas / stats.habitaciones.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{stats.habitaciones.ocupadas}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">En Limpieza</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full" 
                    style={{ width: `${(stats.habitaciones.limpieza / stats.habitaciones.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{stats.habitaciones.limpieza}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">En Mantenimiento</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 rounded-full" 
                    style={{ width: `${(stats.habitaciones.mantenimiento / stats.habitaciones.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{stats.habitaciones.mantenimiento}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Indicadores Hoy</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Entradas Hoy</p>
              <p className="text-2xl font-bold text-primary-600">12</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Salidas Hoy</p>
              <p className="text-2xl font-bold text-primary-600">8</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Limpieza Completada</p>
              <p className="text-2xl font-bold text-green-600">{stats.limpieza.completadas}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Tasa Ocupación</p>
              <p className="text-2xl font-bold text-[#b88a34]">
                {stats.habitaciones.total > 0 
                  ? Math.round((stats.habitaciones.ocupadas / stats.habitaciones.total) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
