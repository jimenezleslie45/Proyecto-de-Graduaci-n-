import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api from '../services/api'
import { useAuthStore } from '../stores/authStore'
import {
  RefreshCw,
  Search,
  Filter,
  BedDouble,
  BedSingle,
  Sofa,
  Crown,
  Home,
  User,
  LogIn,
  LogOut,
  Sparkles,
  Wrench,
  Building2
} from 'lucide-react'

// Normaliza el estado de la habitación a los 4 estados del monitor
const normalizarEstado = (estado) => {
  const s = String(estado || '').trim().toUpperCase()
  const map = {
    'DISPONIBLE': 'Disponible',
    'OCUPADA': 'Ocupada',
    'LIMPI' : 'Sucia',
    'LIMPIEZA': 'Sucia',
    'PENDIENTE_LIMPIEZA': 'Sucia',
    'SUCIA': 'Sucia',
    'MANTENIMIENTO': 'Mantenimiento',
    'EN_MANTENIMIENTO': 'Mantenimiento',
    'BLOQUEADA': 'Bloqueada',
    'INSPECCION': 'Bloqueada'
  }
  return map[s] || 'Disponible'
}

// Icono según el tipo de habitación
const getTipoIcon = (tipo) => {
  const t = String(tipo || '').toLowerCase()
  if (t.includes('individual')) return BedSingle
  if (t.includes('doble') || t.includes('twin')) return BedDouble
  if (t.includes('suite presidencial')) return Crown
  if (t.includes('suite')) return Sofa
  if (t.includes('familiar')) return Home
  return Building2
}

// Colores (badge) por estado
const getEstadoBadge = (estado) => {
  const colors = {
    'Disponible': 'bg-green-100 text-green-800 border-green-300',
    'Ocupada': 'bg-red-100 text-red-800 border-red-300',
    'Sucia': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Mantenimiento': 'bg-orange-100 text-orange-800 border-orange-300',
    'Bloqueada': 'bg-gray-100 text-gray-800 border-gray-300'
  }
  return colors[estado] || 'bg-green-100 text-green-800 border-green-300'
}

// Colores (tarjeta) por estado
const getEstadoCard = (estado) => {
  const colors = {
    'Disponible': 'bg-green-50 border-green-200',
    'Ocupada': 'bg-red-50 border-red-200',
    'Sucia': 'bg-yellow-50 border-yellow-200',
    'Mantenimiento': 'bg-orange-50 border-orange-200',
    'Bloqueada': 'bg-gray-50 border-gray-200'
  }
  return colors[estado] || 'bg-green-50 border-green-200'
}

// Color del indicador (leyenda)
const getEstadoDot = (estado) => {
  const colors = {
    'Disponible': 'bg-green-500',
    'Ocupada': 'bg-red-500',
    'Sucia': 'bg-yellow-500',
    'Mantenimiento': 'bg-orange-500',
    'Bloqueada': 'bg-gray-500'
  }
  return colors[estado] || 'bg-green-500'
}

const ESTADOS_FILTRO = ['Todos', 'Disponible', 'Ocupada', 'Sucia', 'Mantenimiento']

const Monitor = () => {
  const navigate = useNavigate()
  const { usuario } = useAuthStore()

  const [habitaciones, setHabitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [conectado, setConectado] = useState(false)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroPiso, setFiltroPiso] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const rol = String(usuario?.rol || '').toLowerCase().trim() === 'recepcionista'
    ? 'recepcion'
    : String(usuario?.rol || '').toLowerCase().trim()

  const fetchHabitaciones = useCallback(async () => {
    try {
      const response = await api.get('/monitor/estados')
      const rawData = (response.data?.data?.rooms) || response.data?.data || response.data

      const data = Array.isArray(rawData) ? rawData : []

      const normalizadas = data.map(h => ({
        id: h.id,
        numero: h.numero,
        piso: h.piso,
        tipo_habitacion: h.tipo_habitacion || h.descripcion || 'Habitación',
        estado: normalizarEstado(
          h.estado_nombre ||
          (typeof h.estado === 'object' ? h.estado?.nombre : h.estado)
        ),
        color: h.color || (typeof h.estado === 'object' ? h.estado?.color : undefined),
        huesped: h.huesped_actual || h.nombre_huesped || null,
        fecha_checkin: h.fecha_checkin,
        fecha_checkout_prevista: h.fecha_checkout_prevista
      }))

      setHabitaciones(normalizadas)
      setUltimaActualizacion(new Date())
    } catch (error) {
      console.error('Error al cargar monitor:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial + auto-refresh cada 30 segundos
  useEffect(() => {
    fetchHabitaciones()
    const interval = setInterval(fetchHabitaciones, 30000)
    return () => clearInterval(interval)
  }, [fetchHabitaciones])

  // Actualización en tiempo real (WebSocket)
  useEffect(() => {
    const socket = io()
    socket.on('connect', () => setConectado(true))
    socket.on('disconnect', () => setConectado(false))
    socket.on('monitor:update', () => {
      fetchHabitaciones()
    })
    return () => {
      socket.disconnect()
    }
  }, [fetchHabitaciones])

  const habitacionesFiltradas = useMemo(() => {
    return habitaciones.filter(h => {
      const matchEstado = filtroEstado === 'Todos' || h.estado === filtroEstado
      const matchPiso = filtroPiso === 'todos' || String(h.piso) === filtroPiso
      const matchBusqueda = !busqueda || String(h.numero).includes(busqueda.trim())
      return matchEstado && matchPiso && matchBusqueda
    })
  }, [habitaciones, filtroEstado, filtroPiso, busqueda])

  // Agrupar por piso
  const pisosAgrupados = useMemo(() => {
    const grupos = {}
    habitacionesFiltradas.forEach(h => {
      if (!grupos[h.piso]) grupos[h.piso] = []
      grupos[h.piso].push(h)
    })
    return Object.keys(grupos)
      .map(Number)
      .sort((a, b) => a - b)
      .map(piso => ({ piso, habitaciones: grupos[piso] }))
  }, [habitacionesFiltradas])

  const pisos = useMemo(
    () => [...new Set(habitaciones.map(h => h.piso))].sort((a, b) => a - b),
    [habitaciones]
  )

  const stats = useMemo(() => ({
    total: habitaciones.length,
    disponibles: habitaciones.filter(h => h.estado === 'Disponible').length,
    ocupadas: habitaciones.filter(h => h.estado === 'Ocupada').length,
    sucia: habitaciones.filter(h => h.estado === 'Sucia').length,
    mantenimiento: habitaciones.filter(h => h.estado === 'Mantenimiento').length,
    bloqueadas: habitaciones.filter(h => h.estado === 'Bloqueada').length
  }), [habitaciones])

  // Acciones rápidas según rol
  const accionesPorRol = (habitacion) => {
    const acciones = []
    if (rol === 'recepcion' || rol === 'admin') {
      if (habitacion.estado === 'Disponible') {
        acciones.push(
          <button
            key="checkin"
            onClick={() => navigate('/registro')}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <LogIn className="w-3 h-3" /> Check-in
          </button>
        )
      }
      if (habitacion.estado === 'Ocupada') {
        acciones.push(
          <button
            key="checkout"
            onClick={() => navigate('/salidas')}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <LogOut className="w-3 h-3" /> Check-out
          </button>
        )
      }
    }
    if (rol === 'limpieza' && (habitacion.estado === 'Sucia' || habitacion.estado === 'Ocupada')) {
      acciones.push(
        <button
          key="limpieza"
          onClick={() => navigate('/limpieza/ejecutar')}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition"
        >
          <Sparkles className="w-3 h-3" /> Limpiar
        </button>
      )
    }
    if (rol === 'mantenimiento' && habitacion.estado === 'Mantenimiento') {
      acciones.push(
        <button
          key="mant"
          onClick={() => navigate('/mantenimiento/ejecutar')}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition"
        >
          <Wrench className="w-3 h-3" /> Atender
        </button>
      )
    }
    return acciones
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitor de Habitaciones</h1>
          <p className="text-gray-500 flex items-center gap-2">
            Última actualización: {ultimaActualizacion?.toLocaleTimeString() || 'Cargando...'}
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${conectado ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {conectado ? 'Tiempo real' : 'Sin conexión WS'}
            </span>
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchHabitaciones() }}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card text-center border-green-200 bg-green-50">
          <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
          <p className="text-sm text-green-700">Disponibles</p>
        </div>
        <div className="card text-center border-red-200 bg-red-50">
          <p className="text-2xl font-bold text-red-600">{stats.ocupadas}</p>
          <p className="text-sm text-red-700">Ocupadas</p>
        </div>
        <div className="card text-center border-yellow-200 bg-yellow-50">
          <p className="text-2xl font-bold text-yellow-600">{stats.sucia}</p>
          <p className="text-sm text-yellow-700">Sucias</p>
        </div>
        <div className="card text-center border-orange-200 bg-orange-50">
          <p className="text-2xl font-bold text-orange-600">{stats.mantenimiento}</p>
          <p className="text-sm text-orange-700">Mantenimiento</p>
        </div>
        <div className="card text-center border-gray-200 bg-gray-50">
          <p className="text-2xl font-bold text-gray-600">{stats.bloqueadas}</p>
          <p className="text-sm text-gray-700">Bloqueadas</p>
        </div>
      </div>

      {/* Filtros + Buscador */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de habitación..."
              className="input pl-10"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="w-full md:w-44 flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400 shrink-0" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="input w-full"
              >
                {ESTADOS_FILTRO.map(estado => (
                  <option key={estado} value={estado}>{estado === 'Todos' ? 'Todos los estados' : estado}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-44">
              <select
                value={filtroPiso}
                onChange={(e) => setFiltroPiso(e.target.value)}
                className="input w-full"
              >
                <option value="todos">Todos los pisos</option>
                {pisos.map(piso => (
                  <option key={piso} value={String(piso)}>Piso {piso}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="card p-3 flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-gray-600">Leyenda:</span>
        {ESTADOS_FILTRO.filter(e => e !== 'Todos').map(estado => (
          <span key={estado} className="flex items-center gap-1.5 text-sm text-gray-700">
            <span className={`w-3 h-3 rounded-full ${getEstadoDot(estado)}`} />
            {estado}
          </span>
        ))}
      </div>

      {/* Grid por piso */}
      {pisosAgrupados.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay habitaciones que coincidan con los filtros</p>
        </div>
      )}

      {pisosAgrupados.map(({ piso, habitaciones: habs }) => (
        <div key={piso} className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">
              Piso {piso}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              {habs.length} habitación{habs.length !== 1 ? 'es' : ''}
            </span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {habs.map((habitacion) => {
              const TipoIcon = getTipoIcon(habitacion.tipo_habitacion)
              const acciones = accionesPorRol(habitacion)
              return (
                <div
                  key={habitacion.id}
                  className={`p-4 rounded-xl border-2 ${getEstadoCard(habitacion.estado)} transition-all hover:shadow-md flex flex-col`}
                >
                  {/* Número + icono tipo */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold text-gray-900">#{habitacion.numero}</span>
                    <TipoIcon className="w-5 h-5 text-gray-500" />
                  </div>

                  <p className="text-xs text-gray-500 mb-2">{habitacion.tipo_habitacion}</p>

                  {/* Huésped si está ocupada */}
                  {habitacion.huesped && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-gray-700">
                      <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{habitacion.huesped}</span>
                    </div>
                  )}

                  {/* Badge de estado */}
                  <span className={`inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(habitacion.estado)}`}>
                    <span className={`w-2 h-2 rounded-full ${getEstadoDot(habitacion.estado)}`} />
                    {habitacion.estado}
                  </span>

                  {/* Acciones rápidas */}
                  {acciones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pt-2 border-t border-gray-200">
                      {acciones}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Monitor
