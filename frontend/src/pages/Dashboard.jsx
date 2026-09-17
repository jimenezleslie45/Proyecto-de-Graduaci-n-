import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  DoorOpen,
  Users,
  Sparkles,
  Wrench,
  TrendingUp,
  Activity,
  Building,
  Layers,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { motion } from 'framer-motion'

const Dashboard = () => {
  const [rooms, setRooms] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    disponibles: 0,
    ocupadas: 0,
    limpieza: 0,
    mantenimiento: 0,
    piso1: { total: 0, disponibles: 0, ocupadas: 0, limpieza: 0, mantenimiento: 0, capacidad: 50 },
    piso2: { total: 0, disponibles: 0, ocupadas: 0, limpieza: 0, mantenimiento: 0, capacidad: 50 },
    hoy: { checkins_hoy: 0, checkouts_hoy: 0, limpieza_completada: 0, tasa_ocupacion: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 1. Obtener estados de habitaciones y datos del dashboard
      const [monitorRes, dashboardRes, checkinRes] = await Promise.allSettled([
        api.get('/monitor/estados'),
        api.get('/monitor/dashboard'),
        api.get('/operaciones/checkin')
      ])

      let roomList = []
      if (monitorRes.status === 'fulfilled') {
        const payload = monitorRes.value.data?.data ?? monitorRes.value.data
        roomList = payload?.rooms || (Array.isArray(payload) ? payload : [])
      }

      let hoyData = { checkins_hoy: 0, checkouts_hoy: 0, tareas_completadas_hoy: 0 }
      if (dashboardRes.status === 'fulfilled') {
        const dashPayload = dashboardRes.value.data?.data ?? dashboardRes.value.data
        if (dashPayload?.hoy) {
          hoyData = dashPayload.hoy
        }
      }

      let activeStaysCount = 0
      if (checkinRes.status === 'fulfilled') {
        const checkinPayload = checkinRes.value.data?.data ?? checkinRes.value.data
        activeStaysCount = Array.isArray(checkinPayload) ? checkinPayload.length : 0
      }

      setRooms(roomList)

      // Cálculos globales
      const total = roomList.length
      const disponibles = roomList.filter((r) => (r.estado || '').toUpperCase() === 'DISPONIBLE').length
      const ocupadas = Math.max(
        activeStaysCount,
        roomList.filter((r) => (r.estado || '').toUpperCase() === 'OCUPADA').length
      )
      const limpieza = roomList.filter((r) =>
        ['SUCIA', 'PENDIENTE_LIMPIEZA', 'LIMPIEZA'].includes((r.estado || '').toUpperCase())
      ).length
      const mantenimiento = roomList.filter((r) =>
        ['EN_MANTENIMIENTO', 'MANTENIMIENTO', 'BLOQUEADA'].includes((r.estado || '').toUpperCase())
      ).length

      // Desglose Piso 1
      const p1Rooms = roomList.filter((r) => String(r.piso) === '1')
      const p1Disponibles = p1Rooms.filter((r) => (r.estado || '').toUpperCase() === 'DISPONIBLE').length
      const p1Ocupadas = p1Rooms.filter((r) => (r.estado || '').toUpperCase() === 'OCUPADA').length
      const p1Limpieza = p1Rooms.filter((r) =>
        ['SUCIA', 'PENDIENTE_LIMPIEZA', 'LIMPIEZA'].includes((r.estado || '').toUpperCase())
      ).length
      const p1Mantenimiento = p1Rooms.filter((r) =>
        ['EN_MANTENIMIENTO', 'MANTENIMIENTO', 'BLOQUEADA'].includes((r.estado || '').toUpperCase())
      ).length

      // Desglose Piso 2
      const p2Rooms = roomList.filter((r) => String(r.piso) === '2')
      const p2Disponibles = p2Rooms.filter((r) => (r.estado || '').toUpperCase() === 'DISPONIBLE').length
      const p2Ocupadas = p2Rooms.filter((r) => (r.estado || '').toUpperCase() === 'OCUPADA').length
      const p2Limpieza = p2Rooms.filter((r) =>
        ['SUCIA', 'PENDIENTE_LIMPIEZA', 'LIMPIEZA'].includes((r.estado || '').toUpperCase())
      ).length
      const p2Mantenimiento = p2Rooms.filter((r) =>
        ['EN_MANTENIMIENTO', 'MANTENIMIENTO', 'BLOQUEADA'].includes((r.estado || '').toUpperCase())
      ).length

      const tasaOcupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0

      setStats({
        total,
        disponibles,
        ocupadas,
        limpieza,
        mantenimiento,
        piso1: {
          total: p1Rooms.length,
          disponibles: p1Disponibles,
          ocupadas: p1Ocupadas,
          limpieza: p1Limpieza,
          mantenimiento: p1Mantenimiento,
          capacidad: 50
        },
        piso2: {
          total: p2Rooms.length,
          disponibles: p2Disponibles,
          ocupadas: p2Ocupadas,
          limpieza: p2Limpieza,
          mantenimiento: p2Mantenimiento,
          capacidad: 50
        },
        hoy: {
          checkins_hoy: hoyData.checkins_hoy || activeStaysCount,
          checkouts_hoy: hoyData.checkouts_hoy || 0,
          limpieza_completada: hoyData.tareas_completadas_hoy || 0,
          tasa_ocupacion: tasaOcupacion
        }
      })
    } catch (error) {
      console.error('Error al cargar datos del panel:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Disponibles',
      value: stats.disponibles,
      total: stats.total,
      icon: DoorOpen,
      color: 'green'
    },
    {
      name: 'Ocupadas',
      value: stats.ocupadas,
      total: stats.total,
      icon: Users,
      color: 'red'
    },
    {
      name: 'Limpieza',
      value: stats.limpieza,
      total: stats.total,
      icon: Sparkles,
      color: 'yellow'
    },
    {
      name: 'Mantenimiento',
      value: stats.mantenimiento,
      total: stats.total,
      icon: Wrench,
      color: 'orange'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const baseTotal = stats.total > 0 ? stats.total : 1

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel</h1>
          <p className="text-gray-500">Resumen del estado y capacidad del hotel</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1f2d3d] bg-white border border-[#e5ded0] rounded-xl px-4 py-2 shadow-sm">
          <Building className="w-4 h-4 text-[#8a7647]" />
          Capacidad Total: <span className="text-[#8a7647] font-bold">100 Habitaciones</span> (Piso 1: 50 | Piso 2: 50)
        </div>
      </div>

      {/* CUADRÍCULA DE MÉTRICAS PRINCIPALES */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <StatCard
              icon={stat.icon}
              value={stat.value}
              label={stat.name}
              color={stat.color}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* DETALLES POR PISOS (PISO 1 Y PISO 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PISO 1 */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5ded0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-800 font-bold text-sm">P1</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Primer Piso</h3>
                <p className="text-xs text-gray-500">Capacidad máxima: 50 habitaciones</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-100/80 text-amber-900 rounded-full">
              {stats.piso1.total} de 50 ingresadas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-emerald-800">Disponibles</span>
              <span className="text-xl font-bold text-emerald-700">{stats.piso1.disponibles}</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-rose-800">Ocupadas</span>
              <span className="text-xl font-bold text-rose-700">{stats.piso1.ocupadas}</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-amber-800">Limpieza</span>
              <span className="text-xl font-bold text-amber-700">{stats.piso1.limpieza}</span>
            </div>
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-orange-800">Mantenim.</span>
              <span className="text-xl font-bold text-orange-700">{stats.piso1.mantenimiento}</span>
            </div>
          </div>
        </div>

        {/* PISO 2 */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5ded0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-800 font-bold text-sm">P2</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Segundo Piso</h3>
                <p className="text-xs text-gray-500">Capacidad máxima: 50 habitaciones</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-blue-100/80 text-blue-900 rounded-full">
              {stats.piso2.total} de 50 ingresadas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-emerald-800">Disponibles</span>
              <span className="text-xl font-bold text-emerald-700">{stats.piso2.disponibles}</span>
            </div>
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-rose-800">Ocupadas</span>
              <span className="text-xl font-bold text-rose-700">{stats.piso2.ocupadas}</span>
            </div>
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-amber-800">Limpieza</span>
              <span className="text-xl font-bold text-amber-700">{stats.piso2.limpieza}</span>
            </div>
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3 text-center">
              <span className="block text-xs font-medium text-orange-800">Mantenim.</span>
              <span className="text-xl font-bold text-orange-700">{stats.piso2.mantenimiento}</span>
            </div>
          </div>
        </div>

      </div>

      {/* RESUMEN GENERAL E INDICADORES HOY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ESTADO DE HABITACIONES */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5ded0] shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Estado de Habitaciones</h2>
            </div>
            <span className="text-xs font-semibold text-gray-500">
              Total Ingresadas: <strong className="text-gray-800">{stats.total}</strong>
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Disponibles */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Disponibles</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.disponibles / baseTotal) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-emerald-700 w-6 text-right">{stats.disponibles}</span>
              </div>
            </div>

            {/* Ocupadas */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Ocupadas</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.ocupadas / baseTotal) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-rose-700 w-6 text-right">{stats.ocupadas}</span>
              </div>
            </div>

            {/* En Limpieza */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">En Limpieza</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.limpieza / baseTotal) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-amber-700 w-6 text-right">{stats.limpieza}</span>
              </div>
            </div>

            {/* En Mantenimiento */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">En Mantenimiento</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.mantenimiento / baseTotal) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-orange-700 w-6 text-right">{stats.mantenimiento}</span>
              </div>
            </div>
          </div>
        </div>

        {/* INDICADORES HOY */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5ded0] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Indicadores Hoy</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entradas Activas</p>
              <p className="text-2xl font-bold text-primary-600">{stats.ocupadas}</p>
            </div>

            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Disponibilidad</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.total > 0 ? `${Math.round((stats.disponibles / stats.total) * 100)}%` : '0%'}
              </p>
            </div>

            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tareas Limpieza</p>
              <p className="text-2xl font-bold text-amber-600">{stats.limpieza}</p>
            </div>

            <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tasa Ocupación</p>
              <p className="text-2xl font-bold text-[#b88a34]">{stats.hoy.tasa_ocupacion}%</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
