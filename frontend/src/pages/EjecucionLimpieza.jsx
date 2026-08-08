import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Camera,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Star,
  BedDouble,
  Bath,
  Gift,
  Wind,
SearchCheck,
  Trash2,
  Sparkles,
  X
} from 'lucide-react'

const META_MINUTOS = 30 // Estándar de limpieza (meta)
const META_MS = META_MINUTOS * 60 * 1000
const ADVERTENCIA_MS = 25 * 60 * 1000 // Amarillo desde 25 min

const CHECKLIST_DEFAULT = [
  { key: 'cambiar_sabanas', label: 'Cambiar sábanas', icon: BedDouble },
  { key: 'limpiar_bano', label: 'Limpiar baño', icon: Bath },
  { key: 'reponer_amenidades', label: 'Reponer amenidades', icon: Gift },
  { key: 'aspirar', label: 'Aspirar', icon: Wind },
  { key: 'inspeccion', label: 'Inspección final', icon: SearchCheck }
]

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
  const labels = { 1: 'Urgente', 2: 'Normal', 3: 'Baja' }
  const colors = { 1: 'bg-red-100 text-red-700', 2: 'bg-yellow-100 text-yellow-700', 3: 'bg-gray-100 text-gray-600' }
  return { label: labels[p] || 'Normal', color: colors[p] || 'bg-gray-100 text-gray-600' }
}

const EjecucionLimpieza = () => {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTarea, setSelectedTarea] = useState(null)

  // Timer
  const [estadoTimer, setEstadoTimer] = useState('no_iniciado') // no_iniciado | corriendo | pausado | finalizado
  const [tiempoMs, setTiempoMs] = useState(0)
  const [pausadoEn, setPausadoEn] = useState(0)
  const startTsRef = useRef(null)
  const intervalRef = useRef(null)

  // Checklist y formulario
  const [checklist, setChecklist] = useState({})
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchTareas()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const fetchTareas = async () => {
    try {
      const response = await api.get('/limpieza/tareas')
      const payload = response.data?.data ?? response.data
      const list = Array.isArray(payload) ? payload : (payload?.tareas ?? payload?.tasks ?? payload?.data ?? [])
      setTareas(list)
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

  const resetearTimer = () => {
    detenerInterval()
    setTiempoMs(0)
    setEstadoTimer('no_iniciado')
    startTsRef.current = null
    setPausadoEn(0)
  }

  const seleccionarTarea = (tarea) => {
    setSelectedTarea(tarea)
    resetearTimer()
    setChecklist({})
    setObservaciones(tarea.observaciones || '')
    setFotos([])
  }

  const limpiarSeleccion = () => {
    setSelectedTarea(null)
    resetearTimer()
    setChecklist({})
    setObservaciones('')
    setFotos([])
  }

  const iniciarTarea = async () => {
    if (!selectedTarea) return
    try {
      await api.put(`/limpieza/tareas/${selectedTarea.id}`, {
        estado: 'EnProceso',
        fecha_inicio: new Date().toISOString()
      })
      toast.success('Limpieza iniciada')
      startTsRef.current = Date.now()
      setTiempoMs(0)
      setEstadoTimer('corriendo')
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al iniciar tarea')
    }
  }

  const finalizarTarea = async () => {
    if (!selectedTarea) return
    if (estadoTimer === 'no_iniciado') {
      toast.error('Debe iniciar la limpieza antes de finalizar')
      return
    }
    const completados = CHECKLIST_DEFAULT.filter(item => checklist[item.key]).length
    const total = CHECKLIST_DEFAULT.length
    if (completados < total) {
      toast.error(`Complete el checklist (${completados}/${total}) antes de finalizar`)
      return
    }

    try {
      await api.put(`/limpieza/tareas/${selectedTarea.id}`, {
        estado: 'Completada',
        observaciones,
        fecha_fin: new Date().toISOString()
      })
      toast.success('Tarea finalizada. Habitación DISPONIBLE')
      limpiarSeleccion()
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al finalizar tarea')
    }
  }

  const agregarFotos = (e) => {
    const archivos = Array.from(e.target.files || [])
    const disponibles = 3 - fotos.length
    const nuevos = archivos.slice(0, disponibles)
    if (archivos.length > disponibles) {
      toast.error(`Solo puede adjuntar ${disponibles} foto(s) más`)
    }
    setFotos(prev => [...prev, ...nuevos])
    e.target.value = ''
  }

  const quitarFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  // Progreso visual (0-100) basado en la meta de 30 min
  const progreso = Math.min(100, Math.round((tiempoMs / META_MS) * 100))
  const progresoColor = tiempoMs > META_MS ? 'bg-red-500' : tiempoMs >= ADVERTENCIA_MS ? 'bg-yellow-500' : 'bg-green-500'

  // KPI comparación con estándar
  const estaDentro = tiempoMs <= META_MS
  const diferenciaMs = tiempoMs - META_MS
  const diferenciaLabel = estaDentro
    ? `${Math.round(Math.abs(diferenciaMs) / 60000)} min por debajo`
    : `${Math.round(Math.abs(diferenciaMs) / 60000)} min por encima`

  const tareasPendientes = tareas.filter(t => t.estado === 'Pendiente')
  const tareasEnProceso = tareas.filter(t => t.estado === 'EnProceso')

  const getNombreHabitacion = (t) => t.numero_habitacion || t.habitacion?.numero || t.id_habitacion
  const getPiso = (t) => t.piso || t.habitacion?.piso || '—'
  const getAsignado = (t) => t.nombre_empleado || t.empleado_asignado?.nombre || 'Sin asignar'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const prio = getPrioridad(selectedTarea?.prioridad)
  const completados = CHECKLIST_DEFAULT.filter(item => checklist[item.key]).length
  const totalCheck = CHECKLIST_DEFAULT.length
  const timerColor = getTimerColor(tiempoMs, estadoTimer)
  const timerBg = getTimerBg(tiempoMs, estadoTimer)
  const estadoTimerLabel =
    estadoTimer === 'no_iniciado' ? 'NO INICIADO'
    : estadoTimer === 'pausado' ? 'PAUSADO'
    : estadoTimer === 'finalizado' ? 'FINALIZADO'
    : 'EN PROGRESO'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ejecución de Limpieza</h1>
        <p className="text-gray-500">Pantalla 7 · Ejecución de tarea de limpieza</p>
      </div>

{/* Selector de tarea con botones clicables */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-700">Seleccionar tarea de limpieza</h2>
          </div>
          {selectedTarea && (
            <button onClick={limpiarSeleccion} className="btn btn-secondary flex items-center gap-1">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>

        {/* Tareas pendientes */}
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🔵 Pendientes</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {tareasPendientes.map(t => {
            const activo = selectedTarea?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => seleccionarTarea(t)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  activo
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                Hab #{getNombreHabitacion(t)} · {t.tipo_tarea} · Piso {getPiso(t)}
              </button>
            )
          })}
          {tareasPendientes.length === 0 && (
            <span className="text-sm text-gray-400">No hay tareas pendientes</span>
          )}
        </div>

        {/* Tareas en proceso */}
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🟡 En Proceso</p>
        <div className="flex flex-wrap gap-2">
          {tareasEnProceso.map(t => {
            const activo = selectedTarea?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => seleccionarTarea(t)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  activo
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:border-blue-400'
                }`}
              >
                Hab #{getNombreHabitacion(t)} · {t.tipo_tarea} · Piso {getPiso(t)}
              </button>
            )
          })}
          {tareasEnProceso.length === 0 && (
            <span className="text-sm text-gray-400">No hay tareas en proceso</span>
          )}
        </div>
      </div>

      {/* Si no hay tarea seleccionada */}
      {!selectedTarea && (
        <div className="card border-2 border-dashed border-gray-300 text-center py-10">
          <p className="text-gray-500 text-lg">👇 Haga clic en una tarea de arriba para cargar la ejecución</p>
          <p className="text-sm text-gray-400 mt-2">
            {tareasPendientes.length + tareasEnProceso.length > 0
              ? `${tareasPendientes.length + tareasEnProceso.length} tarea(s) disponible(s)`
              : 'No hay tareas disponibles por el momento'}
          </p>
        </div>
      )}

      {/* Panel de ejecución (siempre visible cuando hay tarea) */}
      {selectedTarea && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer + Controles + Progreso + Checklist */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header de información */}
            <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Habitación</p>
                  <p className="font-bold text-lg">#{getNombreHabitacion(selectedTarea)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
                <p className="font-semibold">{selectedTarea.tipo_tarea || 'Rutinaria'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Piso</p>
                <p className="font-semibold">Piso {getPiso(selectedTarea)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Prioridad</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${prio.color}`}>{prio.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Asignado a</p>
                  <p className="font-semibold">{getAsignado(selectedTarea)}</p>
                </div>
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

            {/* Botones grandes */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={iniciarTarea}
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
                onClick={finalizarTarea}
                disabled={estadoTimer === 'no_iniciado' || estadoTimer === 'finalizado'}
                className="btn bg-green-600 text-white hover:bg-green-700 py-4 text-lg flex flex-col items-center gap-2 disabled:opacity-40"
              >
                <CheckCircle className="w-7 h-7" />
                FINALIZAR
              </button>
            </div>

            {/* Barra de progreso visual */}
            <div className="card">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Progreso vs Meta</h3>
                <span className="text-sm font-semibold text-gray-600">{progreso}%</span>
              </div>
              <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${progresoColor} transition-all duration-1000`}
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 min</span>
                <span className={tiempoMs > META_MS ? 'text-red-600 font-semibold' : ''}>30 min (meta)</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Checklist de Limpieza</h3>
                <span className="text-sm text-gray-500">{completados}/{totalCheck}</span>
              </div>
              <div className="space-y-2">
                {CHECKLIST_DEFAULT.map((item) => {
                  const Icon = item.icon
                  const checked = checklist[item.key]
                  return (
                    <label key={item.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                        className="w-5 h-5 rounded text-green-600"
                      />
                      <Icon className={`w-5 h-5 ${checked ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className={`font-medium ${checked ? 'text-green-700 line-through' : 'text-gray-700'}`}>{item.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-6">
            {/* Badge comparación estándar */}
            <div className={`card border-2 ${estaDentro ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {estaDentro ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                <h3 className="font-semibold">Comparación con estándar</h3>
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
            </div>

            {/* Observaciones */}
            <div className="card">
              <label className="label">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="input"
                rows="4"
                placeholder="Escriba observaciones de la limpieza..."
              />
            </div>

            {/* Fotos */}
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Fotos de evidencia</h3>
                <span className="text-sm font-bold text-gray-600">{fotos.length}/3</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(foto)} alt={`foto ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => quitarFoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 3 - fotos.length) }).map((_, i) => (
                  <button
                    key={`empty-${i}`}
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-all"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs mt-1">Agregar</span>
                  </button>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={agregarFotos}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={fotos.length >= 3}
                className="btn btn-secondary w-full mt-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Camera className="w-4 h-4" /> Adjuntar foto ({fotos.length}/3)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EjecucionLimpieza
