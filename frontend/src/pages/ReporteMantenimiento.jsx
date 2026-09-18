import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Wrench, Send, Camera, Image as ImageIcon, X, AlertTriangle } from 'lucide-react'

const CATEGORIAS_FIJAS = [
  { id: 1, nombre: 'Eléctrico' },
  { id: 2, nombre: 'Plomería' },
  { id: 3, nombre: 'Mobiliario' },
  { id: 4, nombre: 'AC' },
  { id: 5, nombre: 'Electrodomésticos' },
  { id: 6, nombre: 'Cerrajería' }
]

const PRIORIDADES = [
  { value: 1, label: 'Baja', color: 'text-gray-600', border: 'border-gray-400', bg: 'bg-gray-100' },
  { value: 2, label: 'Media', color: 'text-yellow-700', border: 'border-yellow-500', bg: 'bg-yellow-100' },
  { value: 3, label: 'Alta', color: 'text-orange-700', border: 'border-orange-500', bg: 'bg-orange-100' },
  { value: 4, label: 'Crítica', color: 'text-red-700', border: 'border-red-600', bg: 'bg-red-100' }
]

const ReporteMantenimiento = () => {
  const [habitaciones, setHabitaciones] = useState([])
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null)
  const [historial, setHistorial] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulario
  const [formData, setFormData] = useState({
    id_habitacion: '',
    id_categoria: '',
    titulo: '',
    descripcion: '',
    prioridad: 2,
    afecta_habitabilidad: false
  })
  const [fotos, setFotos] = useState([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetchHabitaciones()
    fetchNotificaciones()
  }, [])

  const fetchHabitaciones = async () => {
    try {
      const response = await api.get('/habitaciones')
      const payload = response.data?.data ?? response.data
      const list = Array.isArray(payload) ? payload : (payload?.habitaciones ?? [])
      setHabitaciones(list)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificaciones = async () => {
    try {
      const response = await api.get('/mantenimiento/notificaciones')
      const payload = response.data?.data ?? response.data
      setNotificaciones(Array.isArray(payload) ? payload : [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchHistorial = async (idHabitacion) => {
    try {
      const response = await api.get(`/mantenimiento/habitaciones/${idHabitacion}`)
      const payload = response.data?.data ?? response.data
      setHistorial(Array.isArray(payload) ? payload : [])
    } catch (error) {
      console.error('Error:', error)
      setHistorial([])
    }
  }

  const handleSeleccionHabitacion = (e) => {
    const id = e.target.value
    const hab = habitaciones.find(h => h.id === parseInt(id))
    setFormData({ ...formData, id_habitacion: id })
    setHabitacionSeleccionada(hab || null)
    if (hab) {
      fetchHistorial(hab.id)
    } else {
      setHistorial([])
    }
  }

  const handleAgregarFotos = (e) => {
    const files = Array.from(e.target.files || [])
    const disponibles = 3 - fotos.length
    const aAgregar = files.slice(0, disponibles)
    setFotos([...fotos, ...aAgregar])
  }

  const handleQuitarFoto = (index) => {
    setFotos(fotos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.id_habitacion) {
      toast.error('Seleccione una habitación')
      return
    }
    if (!formData.id_categoria) {
      toast.error('Seleccione una categoría de falla')
      return
    }
if (!formData.descripcion.trim()) {
      toast.error('Describa el problema')
      return
    }

    setEnviando(true)
    try {
      const payload = {
        id_habitacion: formData.id_habitacion,
        id_categoria: formData.id_categoria,
        titulo: formData.titulo || 'Reporte de mantenimiento',
        descripcion: formData.descripcion,
        prioridad: formData.prioridad,
        afecta_habitabilidad: formData.afecta_habitabilidad,
        fotos: fotos.map(f => f.name || 'foto')
      }

      const response = await api.post('/mantenimiento/tickets', payload)

      toast.success('Reporte enviado exitosamente. Ticket ABIERTO creado.')

      // Notificación de prioridad crítica
      if (parseInt(formData.prioridad) === 4) {
        toast(<div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <strong>Reporte CRÍTICO</strong>
            <p className="text-sm">Se notificó al personal de mantenimiento</p>
          </div>
        </div>, { duration: 6000 })
        fetchNotificaciones()
      }

      // Reset
      setFormData({
        id_habitacion: '',
        id_categoria: '',
        titulo: '',
        descripcion: '',
        prioridad: 2,
        afecta_habitabilidad: false
      })
      setFotos([])
      setHabitacionSeleccionada(null)
      setHistorial([])
      if (formData.id_habitacion) {
        fetchHistorial(formData.id_habitacion)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al enviar reporte')
    } finally {
      setEnviando(false)
    }
  }

  const getPrioridadLabel = (p) => {
    const labels = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
    return labels[p] || 'Media'
  }

  const getPrioridadClass = (p) => {
    const classes = {
      1: 'bg-gray-100 text-gray-700',
      2: 'bg-yellow-100 text-yellow-700',
      3: 'bg-orange-100 text-orange-700',
      4: 'bg-red-100 text-red-700'
    }
    return classes[p] || 'bg-gray-100 text-gray-700'
  }

  const getEstadoClass = (estado) => {
    const classes = {
      'ABIERTO': 'bg-green-100 text-green-700',
      'Pendiente': 'bg-gray-100 text-gray-700',
      'EnProceso': 'bg-blue-100 text-blue-700',
      'Completado': 'bg-green-100 text-green-700',
      'Cancelado': 'bg-red-100 text-red-700'
    }
    return classes[estado] || 'bg-gray-100 text-gray-700'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Mantenimiento</h1>
          <p className="text-gray-500">Reportar fallas en las habitaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary-600" />
          {notificaciones.length > 0 && (
            <div className="relative cursor-pointer" title="Notificaciones críticas">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notificaciones.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notificaciones críticas */}
      {notificaciones.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas Críticas
          </h3>
          <div className="mt-2 space-y-1">
            {notificaciones.slice(0, 3).map((n, i) => (
              <p key={i} className="text-sm text-red-700">
                ⚠️ {n.titulo} — {n.mensaje}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de reporte */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Nuevo Reporte</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de habitación */}
            <div>
              <label className="label">Habitación *</label>
              <select
                value={formData.id_habitacion}
                onChange={handleSeleccionHabitacion}
                className="input"
                required
              >
                <option value="">Seleccionar habitación...</option>
                {habitaciones.map(h => (
                  <option key={h.id} value={h.id}>
                    #{h.numero} - Piso {h.piso} ({h.estado?.nombre || ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Card de habitación seleccionada */}
            {habitacionSeleccionada && (
              <div className="border-2 border-primary-200 rounded-xl p-4 bg-primary-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary-700">Habitación #{habitacionSeleccionada.numero}</p>
                    <p className="text-sm text-gray-600">Piso {habitacionSeleccionada.piso}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium`}>
                      {habitacionSeleccionada.estado?.nombre || 'Sin estado'}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {habitacionSeleccionada.tipo_habitacion?.nombre || 'Tipo no especificado'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Categoría de falla */}
            <div>
              <label className="label">Categoría de falla *</label>
              <select
                value={formData.id_categoria}
                onChange={(e) => setFormData({ ...formData, id_categoria: e.target.value })}
                className="input"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {CATEGORIAS_FIJAS.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Título (opcional auto) */}
            <div>
              <label className="label">Título (opcional)</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="input"
                placeholder="Ej: Fuga de agua en el lavabo"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="label">Descripción del problema *</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="input"
                rows="4"
                required
                placeholder="Describa detalladamente el problema..."
              />
            </div>

            {/* Prioridad - radio buttons */}
            <div>
              <label className="label">Prioridad *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRIORIDADES.map(p => (
                  <label
                    key={p.value}
                    className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                      formData.prioridad === p.value
                        ? `${p.border} ${p.bg}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="prioridad"
                      value={p.value}
                      checked={formData.prioridad === p.value}
                      onChange={() => setFormData({ ...formData, prioridad: p.value })}
                      className="sr-only"
                    />
                    <span className={`font-medium ${p.color}`}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Checkbox habitabilidad */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.afecta_habitabilidad}
                onChange={(e) => setFormData({ ...formData, afecta_habitabilidad: e.target.checked })}
                className="w-5 h-5 text-primary-600"
              />
              <span className="text-sm font-medium text-gray-700">¿Afecta la habitabilidad?</span>
            </label>

            {/* Adjuntar fotos */}
            <div>
              <label className="label">Adjuntar fotos ({fotos.length}/3)</label>
              <div className="flex flex-wrap gap-3">
                {fotos.map((foto, index) => (
                  <div key={index} className="relative w-24 h-24 border rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(foto)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuitarFoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {fotos.length < 3 && (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500">
                    <Camera className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Agregar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAgregarFotos}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Botón enviar */}
            <button
              type="submit"
              disabled={enviando}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {enviando ? 'Enviando...' : 'Enviar Reporte'}
            </button>
          </form>
        </div>

        {/* Historial de reportes de la habitación */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Historial de reportes
            {habitacionSeleccionada && (
              <span className="text-primary-600"> — Habitación #{habitacionSeleccionada.numero}</span>
            )}
          </h2>

          {!habitacionSeleccionada ? (
            <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
              <ImageIcon className="w-10 h-10" />
              <p>Seleccione una habitación para ver su historial</p>
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay reportes para esta habitación
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {historial.map((ticket) => (
                <div key={ticket.id_ticket || ticket.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">#{ticket.id_ticket || ticket.id}</p>
                      <p className="text-sm text-gray-500">
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioridadClass(ticket.prioridad)}`}>
                        {getPrioridadLabel(ticket.prioridad)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoClass(ticket.estado)}`}>
                        {ticket.estado}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary-700">
                    {ticket.categoria_nombre || 'Categoría'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{ticket.tipo_falla || ticket.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReporteMantenimiento
