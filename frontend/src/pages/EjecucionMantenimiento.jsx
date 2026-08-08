import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  MapPin,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  Star,
  Wrench,
  X
} from 'lucide-react'

// Meta de mantenimiento: 60 min estándar
const META_MINUTOS = 60 // Rojo > 60 min
const META_MS = META_MINUTOS * 60 * 1000
const ADVERTENCIA_MS = 50 * 60 * 1000 // Amarillo desde 50 min

const formatHHMMSS = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const getTimerColor = (ms, estado) => {
  if (estado === 'no_iniciado') return 'text-gray-400'
  if (estado === 'pausado') return 'text-gray-500'
  if (ms > META_MS) return 'text-red-600'
  if (ms >= ADVERTENCIA_MS) return 'text-yellow-500'
  return 'text-green-600'
}

const getTimerBg = (ms, estado) => {
  if (estado === 'no_iniciado' || estado === 'pausado') return 'bg-gray-100 border-gray-200'
  if (ms > META_MS) return 'bg-red-50 border-red-200'
  if (ms >= ADVERTENCIA_MS) return 'bg-yellow-50 border-yellow-200'
  return 'bg-green-50 border-green-200'
}

const getPrioridad = (p) => {
  const labels = { 1: 'Urgente', 2: 'Media', 3: 'Baja', 4: 'Crítica' }
  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-yellow-100 text-yellow-700',
    3: 'bg-gray-100 text-gray-600',
    4: 'bg-purple-100 text-purple-700'
  }
  return { label: labels[p] || 'Media', color: colors[p] || 'bg-yellow-100 text-yellow-700' }
}

const formatFecha = (fecha) => {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const EjecucionMantenimiento = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Timer
  const [estadoTimer, setEstadoTimer] = useState('no_iniciado') // no_iniciado | corriendo | pausado | finalizado
  const [tiempoMs, setTiempoMs] = useState(0)
  const [pausadoEn, setPausadoEn] = useState(0)
  const startTsRef = useRef(null)
  const intervalRef = useRef(null)

  // Formulario
  const [materiales, setMateriales] = useState([{ nombre: '', cantidad: 1, costo_unitario: 0 }])
  const [observaciones, setObservaciones] = useState('')
  const [estadoPosterior, setEstadoPosterior] = useState('Disponible')

  useEffect(() => {
    fetchTickets()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await api.get('/mantenimiento/tickets')
      const payload = response.data?.data ?? response.data
      const list = Array.isArray(payload) ? payload : (payload?.tickets ?? payload?.data ?? [])
      setTickets(list)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const detenerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Efecto del timer: actualiza el tiempo transcurrido mientras corre
  useEffect(() => {
    if (estadoTimer !== 'corriendo') return
    detenerInterval()
    intervalRef.current = setInterval(() => {
      if (startTsRef.current) {
        setTiempoMs(Date.now() - startTsRef.current)
      }
    }, 1000)
    return () => detenerInterval()
  }, [estadoTimer])

  const pausarTimer = () => {
    if (estadoTimer !== 'corriendo') return
    setPausadoEn(tiempoMs)
    setEstadoTimer('pausado')
    detenerInterval()
  }

  const reanudarTimer = () => {
    if (estadoTimer !== 'pausado') return
    startTsRef.current = Date.now() - pausadoEn
    setEstadoTimer('corriendo')
  }

  const seleccionarTicket = (ticket) => {
    setSelectedTicket(ticket)
    detenerInterval()
    setTiempoMs(0)
    setEstadoTimer('no_iniciado')
    startTsRef.current = null
    setPausadoEn(0)
    setMateriales([{ nombre: '', cantidad: 1, costo_unitario: 0 }])
    setObservaciones(ticket.observaciones || '')
    setEstadoPosterior('Disponible')
  }

  const limpiarSeleccion = () => {
    setSelectedTicket(null)
    detenerInterval()
    setTiempoMs(0)
    setEstadoTimer('no_iniciado')
    startTsRef.current = null
    setPausadoEn(0)
  }

  const iniciarTicket = async () => {
    if (!selectedTicket) return
    try {
      await api.put(`/mantenimiento/tickets/${selectedTicket.id}`, {
        estado: 'EnProceso',
        fecha_inicio: new Date().toISOString()
      })
      toast.success('Mantenimiento iniciado')
      startTsRef.current = Date.now()
      setTiempoMs(0)
      setEstadoTimer('corriendo')
      fetchTickets()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al iniciar mantenimiento')
    }
  }

  const agregarMaterial = () => {
    setMateriales([...materiales, { nombre: '', cantidad: 1, costo_unitario: 0 }])
  }

  const actualizarMaterial = (index, field, value) => {
    const nuevosMateriales = [...materiales]
    nuevosMateriales[index][field] = value
    setMateriales(nuevosMateriales)
  }

  const eliminarMaterial = (index) => {
    if (materiales.length === 1) {
      toast.error('Debe haber al menos un material')
      return
    }
    setMateriales(materiales.filter((_, i) => i !== index))
  }

  // Total = suma de subtotales
  const totalMateriales = materiales.reduce((sum, m) => {
    const cantidad = parseFloat(m.cantidad) || 0
    const costo = parseFloat(m.costo_unitario) || 0
    return sum + (cantidad * costo)
  }, 0)

  const guardarReparacion = async () => {
    if (!selectedTicket) return
    if (estadoTimer === 'no_iniciado') {
      toast.error('Debe iniciar el mantenimiento antes de guardar')
      return
    }

    const duracionMin = Math.max(0, Math.round(tiempoMs / 60000))
    // Materiales con contenido
    const materialesValidos = materiales.filter(m => m.nombre && m.nombre.trim() !== '')

    try {
      await api.put(`/mantenimiento/tickets/${selectedTicket.id}`, {
        estado: 'Completado',
        costo_real: totalMateriales,
        observaciones,
        materiales: materialesValidos,
        estado_posterior: estadoPosterior
      })
      toast.success(
        estadoPosterior === 'Limpieza'
          ? 'Reparación guardada. Se generó tarea de limpieza automática'
          : 'Reparación guardada. Habitación DISPONIBLE'
      )
      setSelectedTicket(null)
      setEstadoTimer('finalizado')
      detenerInterval()
      setTiempoMs(0)
      setMateriales([{ nombre: '', cantidad: 1, costo_unitario: 0 }])
      setObservaciones('')
      setEstadoPosterior('Disponible')
      fetchTickets()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar reparación')
    }
  }

  const calcularDur = (ms) => {
    const min = Math.max(0, Math.round(ms / 60000))
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0 ? `${h} h` : `${h} h ${m} min`
  }

  const ticketsPendientes = tickets.filter(t => t.estado === 'Pendiente' || t.estado === 'ABIERTO')
  const ticketsEnProceso = tickets.filter(t => (t.estado === 'EnProceso' || t.estado === 'ABIERTO') && t.fecha_inicio)

  const getNombreHabitacion = (t) => t.numero_habitacion || t.habitacion?.numero || t.id_habitacion
  const getCategoria = (t) => t.categoria_nombre || t.categoria?.nombre || t.categoria || '—'
  const getReporta = (t) => t.reporta_por || t.asignado_a || '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const prio = getPrioridad(selectedTicket?.prioridad)
  const timerColor = getTimerColor(tiempoMs, estadoTimer)
  const timerBg = getTimerBg(tiempoMs, estadoTimer)
  const estadoTimerLabel =
    estadoTimer === 'no_iniciado' ? 'NO INICIADO'
    : estadoTimer === 'pausado' ? 'PAUSADO'
    : estadoTimer === 'finalizado' ? 'FINALIZADO'
    : 'EN PROGRESO'

  // KPI vs estándar (60 min)
  const estaDentro = tiempoMs <= META_MS
  const diferenciaMs = tiempoMs - META_MS
  const diferenciaLabel = estaDentro
    ? `${calcularDur(Math.abs(diferenciaMs))} por debajo`
    : `${calcularDur(Math.abs(diferenciaMs))} por encima`

  const progreso = Math.min(100, Math.round((tiempoMs / META_MS) * 100))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ejecución de Mantenimiento</h1>
        <p className="text-gray-500">Pantalla 9 · Ejecución de reparación de mantenimiento</p>
      </div>

      {/* Selector de tickets */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-700">Seleccionar ticket de mantenimiento</h2>
          </div>
          {selectedTicket && (
            <button onClick={limpiarSeleccion} className="btn btn-secondary flex items-center gap-1">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🔵 Pendientes</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {ticketsPendientes.map(t => {
            const activo = selectedTicket?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => seleccionarTicket(t)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${activo
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'}`}
              >
                #{t.numero_ticket} · Hab #{getNombreHabitacion(t)} · {getCategoria(t)}
              </button>
            )
          })}
          {ticketsPendientes.length === 0 && (
            <span className="text-sm text-gray-400">No hay tickets pendientes</span>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🟡 En Proceso</p>
        <div className="flex flex-wrap gap-2">
          {ticketsEnProceso.map(t => {
            const activo = selectedTicket?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => seleccionarTicket(t)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${activo
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:border-blue-400'}`}
              >
                #{t.numero_ticket} · Hab #{getNombreHabitacion(t)} · {getCategoria(t)}
              </button>
            )
          })}
          {ticketsEnProceso.length === 0 && (
            <span className="text-sm text-gray-400">No hay tickets en proceso</span>
          )}
        </div>
      </div>

      {/* Si no hay ticket seleccionado */}
      {!selectedTicket && (
        <div className="card border-2 border-dashed border-gray-300 text-center py-10">
          <p className="text-gray-500 text-lg">👇 Haga clic en un ticket de arriba para cargar la ejecución</p>
          <p className="text-sm text-gray-400 mt-2">
            {ticketsPendientes.length + ticketsEnProceso.length > 0
              ? `${ticketsPendientes.length + ticketsEnProceso.length} ticket(s) disponible(s)`
              : 'No hay tickets disponibles por el momento'}
          </p>
        </div>
      )}

      {/* Panel de ejecución */}
      {selectedTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Info + Timer + Controles */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header con información del ticket */}
            <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Ticket</p>
                  <p className="font-bold text-lg">#{selectedTicket.numero_ticket}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Habitación</p>
                  <p className="font-bold text-lg">#{getNombreHabitacion(selectedTicket)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Categoría</p>
                <p className="font-semibold">{getCategoria(selectedTicket)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Prioridad</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${prio.color}`}>
                  {prio.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Reportado por</p>
                  <p className="font-semibold">{getReporta(selectedTicket)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha</p>
                  <p className="font-semibold">{formatFecha(selectedTicket.fecha_reportado)}</p>
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Descripción</p>
                <p className="font-medium text-gray-700">{selectedTicket.descripcion}</p>
              </div>
            </div>

            {/* TIMER DIGITAL */}
            <div className={`card border-2 ${timerBg}`}>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className={`w-5 h-5 ${timerColor}`} />
                  <span className={`text-sm font-semibold uppercase tracking-widest ${timerColor}`}>{estadoTimerLabel}</span>
                </div>
                <div className={`font-mono text-7xl font-bold tracking-tight tabular-nums ${timerColor}`}>
                  {formatHHMMSS(tiempoMs)}
                </div>
                <p className="mt-2 text-sm text-gray-500">Meta: {META_MINUTOS}:00</p>
              </div>
            </div>

            {/* Botones INICIAR / PAUSAR / FINALIZAR */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={iniciarTicket}
                disabled={estadoTimer === 'corriendo' || estadoTimer === 'finalizado'}
                className="btn btn-primary py-4 text-lg flex flex-col items-center gap-2 disabled:opacity-40"
              >
                <Play className="w-7 h-7" />
                INICIAR
              </button>
              <button
                onClick={estadoTimer === 'pausado' ? reanudarTimer : pausarTimer}
                disabled={estadoTimer === 'no_iniciado' || estadoTimer === 'finalizado'}
                className="btn bg-yellow-500 text-white hover:bg-yellow-600 py-4 text-lg flex flex-col items-center gap-2 disabled:opacity-40"
              >
                {estadoTimer === 'pausado' ? <RotateCcw className="w-7 h-7" /> : <Pause className="w-7 h-7" />}
                {estadoTimer === 'pausado' ? 'REANUDAR' : 'PAUSAR'}
              </button>
              <button
                onClick={guardarReparacion}
                disabled={estadoTimer === 'no_iniciado' || estadoTimer === 'finalizado'}
                className="btn bg-green-600 text-white hover:bg-green-700 py-4 text-lg flex flex-col items-center gap-2 disabled:opacity-40"
              >
                <CheckCircle className="w-7 h-7" />
                FINALIZAR
              </button>
            </div>

            {/* Barra de progreso vs meta */}
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Progreso vs Meta</h3>
                <span className="text-sm font-semibold text-gray-600">{progreso}%</span>
              </div>
              <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${tiempoMs > META_MS ? 'bg-red-500' : tiempoMs >= ADVERTENCIA_MS ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 min</span>
                <span className={tiempoMs > META_MS ? 'text-red-600 font-semibold' : ''}>60 min (meta)</span>
              </div>
            </div>

            {/* Tabla dinámica de materiales */}
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold">Materiales utilizados</h3>
                <button onClick={agregarMaterial} className="btn btn-primary flex items-center gap-1 text-sm">
                  <Plus className="w-4 h-4" />
                  Agregar material
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b">
                      <th className="py-2 pr-2">Nombre</th>
                      <th className="py-2 pr-2 w-24">Cantidad</th>
                      <th className="py-2 pr-2 w-28">Costo unit.</th>
                      <th className="py-2 pr-2 w-28 text-right">Subtotal</th>
                      <th className="py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((material, index) => {
                      const subtotal = (parseFloat(material.cantidad) || 0) * (parseFloat(material.costo_unitario) || 0)
                      return (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="Nombre del material"
                              value={material.nombre}
                              onChange={(e) => actualizarMaterial(index, 'nombre', e.target.value)}
                              className="input w-full"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              placeholder="Cant"
                              value={material.cantidad}
                              onChange={(e) => actualizarMaterial(index, 'cantidad', e.target.value)}
                              className="input w-full"
                              min="1"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              placeholder="Precio"
                              value={material.costo_unitario}
                              onChange={(e) => actualizarMaterial(index, 'costo_unitario', e.target.value)}
                              className="input w-full"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="py-2 pr-2 text-right font-medium tabular-nums">
                            ${subtotal.toFixed(2)}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              onClick={() => eliminarMaterial(index)}
                              className="text-red-500 hover:text-red-700"
                              title="Eliminar material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="py-3 text-right font-bold text-gray-700">TOTAL</td>
                      <td className="py-3 text-right font-bold text-primary-600 text-lg tabular-nums">
                        ${totalMateriales.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* KPI comparación con estándar */}
            <div className={`card border-2 ${estaDentro ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {estaDentro ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                <h3 className="font-semibold">KPI - Duración</h3>
              </div>
              <p className={`text-3xl font-bold ${estaDentro ? 'text-green-700' : 'text-red-700'}`}>
                {formatHHMMSS(tiempoMs)}
              </p>
              <p className={`text-sm font-medium ${estaDentro ? 'text-green-700' : 'text-red-700'}`}>
                Meta: {META_MINUTOS}:00 · {diferenciaLabel}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-green-600">
                <Star className="w-3.5 h-3.5" /> {estaDentro ? 'DENTRO DE META' : 'EXCEDIDO'}
              </div>
              <p className="mt-2 text-xs text-gray-500">Duración: {calcularDur(tiempoMs)}</p>
            </div>

            {/* Observaciones técnicas */}
            <div className="card">
              <label className="label">Observaciones técnicas</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="input"
                rows="4"
                placeholder="Describa trabajos realizados, recomendaciones, etc..."
              />
            </div>

            {/* Selector de estado posterior */}
            <div className="card">
              <h3 className="font-semibold mb-3">Estado posterior de la habitación</h3>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${estadoPosterior === 'Disponible' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                  <input
                    type="radio"
                    name="estadoPosterior"
                    value="Disponible"
                    checked={estadoPosterior === 'Disponible'}
                    onChange={(e) => setEstadoPosterior(e.target.value)}
                    className="w-4 h-4 text-green-600"
                  />
                  <div>
                    <p className="font-medium text-gray-800">Lista para uso (DISPONIBLE)</p>
                    <p className="text-xs text-gray-500">Habitación lista para nuevos huéspedes</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${estadoPosterior === 'Limpieza' ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                  <input
                    type="radio"
                    name="estadoPosterior"
                    value="Limpieza"
                    checked={estadoPosterior === 'Limpieza'}
                    onChange={(e) => setEstadoPosterior(e.target.value)}
                    className="w-4 h-4 text-yellow-600"
                  />
                  <div>
                    <p className="font-medium text-gray-800">Requiere limpieza (LIMPIEZA)</p>
                    <p className="text-xs text-gray-500">Se generará una tarea de limpieza automática</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Botón Guardar Reparación */}
            <button
              onClick={guardarReparacion}
              disabled={estadoTimer === 'no_iniciado' || estadoTimer === 'finalizado'}
              className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <CheckCircle className="w-6 h-6" />
              Guardar Reparación
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EjecucionMantenimiento
