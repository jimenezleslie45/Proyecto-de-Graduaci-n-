import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import {
  Plus,
  Sparkles,
  User,
  Clock,
  MapPin,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Trash2,
  Play,
  UserPlus,
  ArrowUpDown,
  CheckCircle,
  X
} from 'lucide-react'

const GestionLimpieza = () => {
  const { usuario } = useAuthStore()
  const [tareas, setTareas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [habitaciones, setHabitaciones] = useState([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroTurno, setFiltroTurno] = useState('Todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null)
  const [formData, setFormData] = useState({
    id_habitacion: '',
    id_empleado_asignado: '',
    tipo_tarea: 'Rutinaria',
    prioridad: 2,
    observaciones: ''
  })
  const [formAsignacion, setFormAsignacion] = useState({
    id_empleado_asignado: '',
    prioridad: 2,
    notas: ''
  })
  const [buscarEmpleado, setBuscarEmpleado] = useState('')
  const [buscarEmpleadoAsig, setBuscarEmpleadoAsig] = useState('')
  const [showEmpSugg, setShowEmpSugg] = useState(false)
  const [showEmpSuggAsig, setShowEmpSuggAsig] = useState(false)

  const rolActual = (usuario?.rol || 'limpieza').toString().toLowerCase().trim()
  const esAdminORecpcion = rolActual === 'admin' || rolActual === 'recepcion'
  const esLimpieza = rolActual === 'limpieza'

  useEffect(() => {
    fetchTareas()
  }, [])

  const fetchTareas = async () => {
    try {
      const response = await api.get('/limpieza/tareas')
      const payload = response.data?.data ?? response.data
      const tasks = Array.isArray(payload) ? payload : (payload?.tasks ?? payload?.data ?? [])
      setTareas(tasks)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [empRes, habRes] = await Promise.all([
        api.get('/limpieza/staff'),
        api.get('/habitaciones')
      ])
      const empData = empRes.data?.data ?? empRes.data ?? []
      const habData = habRes.data?.data ?? habRes.data ?? []
      setEmpleados(Array.isArray(empData) ? empData : [])
      setHabitaciones(Array.isArray(habData) ? habData : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const openCreateModal = async () => {
    await fetchOptions()
    setFormData({
      id_habitacion: '',
      id_empleado_asignado: '',
      tipo_tarea: 'Rutinaria',
      prioridad: 2,
      observaciones: ''
    })
    setBuscarEmpleado('')
    setShowEmpSugg(false)
    setShowCreateModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const prioridadMap = { 1: 'Urgente', 2: 'Normal', 3: 'Baja' }
    const payload = {
      id_habitacion: formData.id_habitacion,
      id_empleado_asignado: formData.id_empleado_asignado || undefined,
      prioridad: prioridadMap[formData.prioridad] || 'Normal',
      observaciones: formData.observaciones
    }
    try {
      await api.post('/limpieza/tareas', payload)
      toast.success('Tarea creada exitosamente')
      setShowCreateModal(false)
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear tarea')
    }
  }

  const openAssignModal = (tarea) => {
    setTareaSeleccionada(tarea)
    setFormAsignacion({
      id_empleado_asignado: tarea.id_empleado_asignado || '',
      prioridad: tarea.prioridad || 2,
      notas: tarea.observaciones || ''
    })
    setBuscarEmpleadoAsig(tarea.nombre_asignado || '')
    setShowEmpSuggAsig(false)
    fetchOptions()
    setShowAssignModal(true)
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!tareaSeleccionada) return
    try {
      await api.post(`/limpieza/tareas/${tareaSeleccionada.id}/asignar`, {
        id_empleado_asignado: formAsignacion.id_empleado_asignado || null
      })
      // Cambiar prioridad si cambió
      if (formAsignacion.prioridad !== tareaSeleccionada.prioridad) {
        await api.put(`/limpieza/tareas/${tareaSeleccionada.id}/prioridad`, {
          prioridad: formAsignacion.prioridad
        })
      }
      toast.success('Tarea asignada exitosamente')
      toast.success('Personal notificado', { icon: '🔔' })
      setShowAssignModal(false)
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al asignar tarea')
    }
  }

  const openPriorityModal = (tarea) => {
    setTareaSeleccionada(tarea)
    setFormAsignacion((prev) => ({ ...prev, prioridad: tarea.prioridad || 2 }))
    setShowPriorityModal(true)
  }

  const handleChangePriority = async (e) => {
    e.preventDefault()
    if (!tareaSeleccionada) return
    try {
      await api.put(`/limpieza/tareas/${tareaSeleccionada.id}/prioridad`, {
        prioridad: formAsignacion.prioridad
      })
      toast.success('Prioridad actualizada exitosamente')
      setShowPriorityModal(false)
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar prioridad')
    }
  }

  const handleDelete = async (tarea) => {
    if (!window.confirm(`¿Eliminar la tarea de la habitación #${tarea.numero_habitacion || tarea.id_habitacion}?`)) return
    try {
      await api.delete(`/limpieza/tareas/${tarea.id}`)
      toast.success('Tarea eliminada exitosamente')
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar tarea')
    }
  }

  const handleIniciar = async (tarea) => {
    try {
      await api.put(`/limpieza/tareas/${tarea.id}`, { accion: 'iniciar' })
      toast.success('Tarea iniciada')
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al iniciar tarea')
    }
  }

  const handleCompletar = async (tarea) => {
    try {
      await api.put(`/limpieza/tareas/${tarea.id}`, { accion: 'completar' })
      toast.success('Tarea completada exitosamente')
      fetchTareas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al completar tarea')
    }
  }

  // ====== Helpers ======
  const getPrioridadLabel = (prioridad) => {
    const labels = { 1: 'Urgente', 2: 'Normal', 3: 'Baja' }
    return labels[prioridad] || 'Normal'
  }

  const getPrioridadColor = (prioridad) => {
    const colors = { 1: 'bg-red-100 text-red-700', 2: 'bg-yellow-100 text-yellow-700', 3: 'bg-gray-100 text-gray-600' }
    return colors[prioridad] || 'bg-gray-100 text-gray-600'
  }

  const getEstadoColor = (estado) => {
    const colors = {
      'Pendiente': 'bg-gray-100 text-gray-800',
      'EnProceso': 'bg-blue-100 text-blue-800',
      'Completada': 'bg-green-100 text-green-800'
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  const getTurnoFromHora = (fecha) => {
    if (!fecha) return 'Sin turno'
    const d = new Date(fecha)
    const h = d.getHours()
    if (h >= 6 && h < 12) return 'Mañana'
    if (h >= 12 && h < 18) return 'Tarde'
    return 'Noche'
  }

  const formatHora = (fecha) => {
    if (!fecha) return '—'
    const d = new Date(fecha)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const getTiempoPendiente = (tarea) => {
    if (tarea.estado === 'Completada') {
      return tarea.tiempo_minutos ? `${tarea.tiempo_minutos} min` : '—'
    }
    if (tarea.estado === 'EnProceso' && tarea.fecha_inicio) {
      const diff = Math.round((new Date() - new Date(tarea.fecha_inicio)) / 60000)
      return `${diff} min`
    }
    return '—'
  }

  // ====== Filtros ======
  const tareasFiltradas = useMemo(() => {
    return tareas.filter((t) => {
      const turno = getTurnoFromHora(t.fecha_asignacion)
      const estadoMatch = filtroEstado === 'Todos' || (t.estado || '') === filtroEstado
      const prioridadMatch = filtroPrioridad === 'Todas' || (t.prioridad || 2) === parseInt(filtroPrioridad)
      const turnoMatch = filtroTurno === 'Todos' || turno === filtroTurno
      return estadoMatch && prioridadMatch && turnoMatch
    })
  }, [tareas, filtroTurno, filtroPrioridad, filtroEstado])

  // Agrupación por prioridad (Urgentes=1, Normales=2, VIP/Baja=3)
  const urgentes = tareasFiltradas.filter(t => (t.prioridad || 2) === 1)
  const normales = tareasFiltradas.filter(t => (t.prioridad || 2) === 2)
  const vip = tareasFiltradas.filter(t => (t.prioridad || 2) === 3)

  // Contadores
  const contPendientes = tareas.filter(t => t.estado === 'Pendiente').length
  const contEnProceso = tareas.filter(t => t.estado === 'EnProceso').length
  const contCompletadas = tareas.filter(t => t.estado === 'Completada').length

  const renderTaskCard = (tarea) => {
    const numeroHab = tarea.numero_habitacion || tarea.habitacion?.numero || tarea.id_habitacion
    const piso = tarea.piso || tarea.habitacion?.piso || '—'
    const asignado = tarea.nombre_empleado || tarea.empleado_asignado?.nombre || (tarea.id_empleado_asignado ? null : 'Sin asignar')

    return (
      <div key={tarea.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all">
        {/* Header de la card */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-blue-600" />
                Hab #{numeroHab}
              </span>
              <span className="text-xs text-gray-400">Piso {piso}</span>
            </div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getPrioridadColor(tarea.prioridad)}`}>
              {getPrioridadLabel(tarea.prioridad)}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(tarea.estado)}`}>
            {tarea.estado || 'Pendiente'}
          </span>
        </div>

        {/* Asignado */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
          <User className="w-4 h-4 text-gray-400" />
          {asignado || 'Sin asignar'}
        </div>

        {/* Hora y tiempo */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Asignada: {formatHora(tarea.fecha_asignacion)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {getTurnoFromHora(tarea.fecha_asignacion)}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          ⏱ Tiempo: {getTiempoPendiente(tarea)}
        </div>

        {/* Botones según rol */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
{esAdminORecpcion && (
            <>
              <button
                onClick={() => openAssignModal(tarea)}
                className="btn btn-secondary px-2 py-1 text-xs flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                Asignar
              </button>
              <button
                onClick={() => openPriorityModal(tarea)}
                className="btn btn-secondary px-2 py-1 text-xs flex items-center gap-1"
              >
                <ArrowUpDown className="w-4 h-4" />
                Prioridad
              </button>
              <button
                onClick={() => handleDelete(tarea)}
                className="btn btn-danger px-2 py-1 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </>
          )}
          {esLimpieza && tarea.estado === 'Pendiente' && tarea.id_empleado_asignado && (
            <button
              onClick={() => handleIniciar(tarea)}
              className="btn btn-primary px-2 py-1 text-xs flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Iniciar
            </button>
          )}
          {esLimpieza && tarea.estado === 'EnProceso' && tarea.id_empleado_asignado && (
            <button
              onClick={() => handleCompletar(tarea)}
              className="btn px-2 py-1 text-xs flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Completar
            </button>
          )}
        </div>
      </div>
    )
  }

  const KanbanColumn = ({ title, color, tasks, emptyMsg }) => (
    <div className="bg-slate-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${color}`}>{title}</h3>
        <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600">{tasks.length}</span>
      </div>
      <div className="space-y-3 min-h-[100px]">
        {tasks.map(renderTaskCard)}
        {tasks.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">{emptyMsg}</p>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas de Limpieza</h1>
          <p className="text-gray-500">Gestión de tareas del área de housekeeping</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Contador de tareas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gray-50 border-gray-200">
          <p className="text-3xl font-bold text-gray-700">{contPendientes}</p>
          <p className="text-sm text-gray-500">Pendientes</p>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <p className="text-3xl font-bold text-blue-600">{contEnProceso}</p>
          <p className="text-sm text-blue-700">En Progreso</p>
        </div>
        <div className="card bg-green-50 border-green-200">
          <p className="text-3xl font-bold text-green-600">{contCompletadas}</p>
          <p className="text-sm text-green-700">Completadas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Turno</label>
          <select value={filtroTurno} onChange={(e) => setFiltroTurno(e.target.value)} className="input">
            <option value="Todos">Todos</option>
            <option value="Mañana">Mañana</option>
            <option value="Tarde">Tarde</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="input">
            <option value="Todas">Todas</option>
            <option value="1">Urgente</option>
            <option value="2">Normal</option>
            <option value="3">Baja</option>
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="input">
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="EnProceso">En Progreso</option>
            <option value="Completada">Completada</option>
          </select>
        </div>
      </div>

      {/* Vista Kanban agrupada por prioridad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KanbanColumn
          title="🔴 Urgentes"
          color="text-red-600"
          tasks={urgentes}
          emptyMsg="No hay tareas urgentes"
        />
        <KanbanColumn
          title="🟡 Normales"
          color="text-yellow-600"
          tasks={normales}
          emptyMsg="No hay tareas normales"
        />
        <KanbanColumn
          title="🟢 VIP / Baja"
          color="text-green-600"
          tasks={vip}
          emptyMsg="No hay tareas VIP/Baja"
        />
      </div>

      {/* Modal Nueva Tarea */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nueva Tarea de Limpieza</h2>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Habitación</label>
                <select
                  value={formData.id_habitacion}
                  onChange={(e) => setFormData({ ...formData, id_habitacion: e.target.value })}
                  className="input" required
                >
                  <option value="">Seleccionar...</option>
                  {habitaciones.map(h => (
                    <option key={h.id} value={h.id}>Habitación {h.numero} - Piso {h.piso}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="label">Empleado Asignado</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar por nombre..."
                  value={buscarEmpleado}
                  onChange={(e) => {
                    setBuscarEmpleado(e.target.value)
                    setFormData({ ...formData, id_empleado_asignado: '' })
                    setShowEmpSugg(true)
                  }}
                  onFocus={() => setShowEmpSugg(true)}
                  onBlur={() => setTimeout(() => setShowEmpSugg(false), 150)}
                  autoComplete="off"
                />
                {showEmpSugg && (
                  <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                    <li
                      className="px-3 py-2 text-sm text-gray-400 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={() => {
                        setBuscarEmpleado('')
                        setFormData({ ...formData, id_empleado_asignado: '' })
                        setShowEmpSugg(false)
                      }}
                    >
                      Sin asignar
                    </li>
                    {empleados
                      .filter(e => e.nombre?.toLowerCase().includes(buscarEmpleado.toLowerCase()))
                      .map(e => (
                        <li
                          key={e.id_empleado}
                          className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => {
                            setBuscarEmpleado(e.nombre)
                            setFormData({ ...formData, id_empleado_asignado: e.id_empleado })
                            setShowEmpSugg(false)
                          }}
                        >
                          {e.nombre}
                          <span className="ml-2 text-xs text-gray-400">{e.rol}</span>
                        </li>
                      ))}
                    {empleados.filter(e => e.nombre?.toLowerCase().includes(buscarEmpleado.toLowerCase())).length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
                    )}
                  </ul>
                )}
              </div>
              <div>
                <label className="label">Tipo de Tarea</label>
                <select
                  value={formData.tipo_tarea}
                  onChange={(e) => setFormData({ ...formData, tipo_tarea: e.target.value })}
                  className="input"
                >
                  <option value="Rutinaria">Rutinaria</option>
                  <option value="CheckOut">Salida</option>
                  <option value="Profunda">Profunda</option>
                </select>
              </div>
              <div>
                <label className="label">Prioridad</label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData({ ...formData, prioridad: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={1}>Urgente</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Baja</option>
                </select>
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="input" rows="2"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1">Crear Tarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignación */}
      {showAssignModal && tareaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Asignar Tarea</h2>
              <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Habitación #{tareaSeleccionada.numero_habitacion || tareaSeleccionada.id_habitacion}
            </p>
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="relative">
                <label className="label">Personal de Limpieza</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar por nombre..."
                  value={buscarEmpleadoAsig}
                  onChange={(e) => {
                    setBuscarEmpleadoAsig(e.target.value)
                    setFormAsignacion({ ...formAsignacion, id_empleado_asignado: '' })
                    setShowEmpSuggAsig(true)
                  }}
                  onFocus={() => setShowEmpSuggAsig(true)}
                  onBlur={() => setTimeout(() => setShowEmpSuggAsig(false), 150)}
                  autoComplete="off"
                />
                {showEmpSuggAsig && (
                  <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-44 overflow-y-auto">
                    <li
                      className="px-3 py-2 text-sm text-gray-400 hover:bg-slate-50 cursor-pointer"
                      onMouseDown={() => {
                        setBuscarEmpleadoAsig('')
                        setFormAsignacion({ ...formAsignacion, id_empleado_asignado: '' })
                        setShowEmpSuggAsig(false)
                      }}
                    >
                      Sin asignar
                    </li>
                    {empleados
                      .filter(e => e.nombre?.toLowerCase().includes(buscarEmpleadoAsig.toLowerCase()))
                      .map(e => (
                        <li
                          key={e.id_empleado}
                          className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => {
                            setBuscarEmpleadoAsig(e.nombre)
                            setFormAsignacion({ ...formAsignacion, id_empleado_asignado: e.id_empleado })
                            setShowEmpSuggAsig(false)
                          }}
                        >
                          {e.nombre}
                          <span className="ml-2 text-xs text-gray-400">{e.rol}</span>
                        </li>
                      ))}
                    {empleados.filter(e => e.nombre?.toLowerCase().includes(buscarEmpleadoAsig.toLowerCase())).length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
                    )}
                  </ul>
                )}
              </div>
              <div>
                <label className="label">Prioridad</label>
                <select
                  value={formAsignacion.prioridad}
                  onChange={(e) => setFormAsignacion({ ...formAsignacion, prioridad: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={1}>Urgente</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Baja</option>
                </select>
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea
                  value={formAsignacion.notas}
                  onChange={(e) => setFormAsignacion({ ...formAsignacion, notas: e.target.value })}
                  className="input" rows="2"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1">Asignar y Notificar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Prioridad */}
      {showPriorityModal && tareaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Cambiar Prioridad</h2>
              <button onClick={() => setShowPriorityModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Habitación #{tareaSeleccionada.numero_habitacion || tareaSeleccionada.id_habitacion}
            </p>
            <form onSubmit={handleChangePriority} className="space-y-4">
              <div>
                <label className="label">Prioridad</label>
                <select
                  value={formAsignacion.prioridad}
                  onChange={(e) => setFormAsignacion({ ...formAsignacion, prioridad: parseInt(e.target.value) })}
                  className="input"
                >
                  <option value={1}>Urgente</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Baja</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowPriorityModal(false)} className="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionLimpieza
