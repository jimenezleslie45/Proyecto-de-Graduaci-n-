import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'

const Habitaciones = () => {
  const [habitaciones, setHabitaciones] = useState([])
  const [tiposHabitacion, setTiposHabitacion] = useState([])
  const [estados, setEstados] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHabitacion, setEditingHabitacion] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPiso, setFilterPiso] = useState('')
  const [formData, setFormData] = useState({
    numero: '',
    piso: 1,
    id_tipo_habitacion: '',
    id_estado: '',
    descripcion: '',
    tiene_balcon: false,
    tiene_vista: false,
    capacidad: '',
    precio_base: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [habitacionesRes, tiposRes, estadosRes] = await Promise.all([
        api.get('/habitaciones'),
        api.get('/habitaciones/tipos'),
        api.get('/habitaciones/estados')
      ])
      setHabitaciones(habitacionesRes.data.data || habitacionesRes.data)
      setTiposHabitacion(tiposRes.data.data || tiposRes.data)
      setEstados(estadosRes.data.data || estadosRes.data)
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        numero: formData.numero,
        piso: parseInt(formData.piso),
        descripcion: formData.descripcion || '',
        capacidad: formData.capacidad ? parseInt(formData.capacidad) : null,
        tarifa_base: formData.precio_base !== '' ? parseFloat(formData.precio_base) : null
      }

      if (editingHabitacion) {
        payload.id_tipo_habitacion = parseInt(formData.id_tipo_habitacion)
        payload.id_estado_actual = parseInt(formData.id_estado)
        await api.put(`/habitaciones/${editingHabitacion.id}`, payload)
        toast.success('Habitación actualizada')
      } else {
        payload.id_tipo_habitacion = parseInt(formData.id_tipo_habitacion)
        payload.id_estado_actual = parseInt(formData.id_estado)
        await api.post('/habitaciones', payload)
        toast.success('Habitación creada')
      }
      setShowModal(false)
      fetchData()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta habitación?')) return
    try {
      await api.delete(`/habitaciones/${id}`)
      toast.success('Habitación eliminada')
      fetchData()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const resetForm = () => {
    setFormData({
      numero: '',
      piso: 1,
      id_tipo_habitacion: '',
      id_estado: '',
      descripcion: '',
      tiene_balcon: false,
      tiene_vista: false,
      capacidad: '',
      precio_base: ''
    })
    setEditingHabitacion(null)
  }

  const openEdit = (habitacion) => {
    setEditingHabitacion(habitacion)
    const tipoId = habitacion.tipo_habitacion?.id ?? habitacion.id_tipo_habitacion ?? habitacion.id_tipo
    const estadoId = habitacion.estado?.id ?? habitacion.id_estado ?? habitacion.id_estado_actual
    setFormData({
      numero: habitacion.numero,
      piso: habitacion.piso,
      id_tipo_habitacion: String(tipoId),
      id_estado: String(estadoId),
      descripcion: habitacion.descripcion || '',
      tiene_balcon: habitacion.tiene_balcon,
      tiene_vista: habitacion.tiene_vista,
      capacidad: habitacion.capacidad ?? habitacion.tipo_habitacion?.capacidad ?? '',
      precio_base: habitacion.precio_base ?? habitacion.tipo_habitacion?.precio_base ?? ''
    })
    setShowModal(true)
  }

  const getEstadoColor = (estado) => {
    const nombre = typeof estado === 'object' ? estado?.nombre : estado
    const colors = {
      'Disponible': 'bg-green-100 text-green-800',
      'DISPONIBLE': 'bg-green-100 text-green-800',
      'Ocupada': 'bg-red-100 text-red-800',
      'OCUPADA': 'bg-red-100 text-red-800',
      'Limpieza': 'bg-yellow-100 text-yellow-800',
      'PENDIENTE_LIMPIEZA': 'bg-yellow-100 text-yellow-800',
      'SUCIA': 'bg-yellow-100 text-yellow-800',
      'Mantenimiento': 'bg-orange-100 text-orange-800',
      'EN_MANTENIMIENTO': 'bg-orange-100 text-orange-800',
      'Bloqueada': 'bg-gray-100 text-gray-800',
      'INSPECCION': 'bg-gray-100 text-gray-800'
    }
    return colors[nombre] || 'bg-gray-100 text-gray-800'
  }

  const getEstadoNombre = (estado) => {
    if (typeof estado === 'object' && estado !== null) return estado.nombre || estado.descripcion
    return estado
  }

  const filteredHabitaciones = habitaciones.filter((hab) => {
    const tipoNombre = typeof hab.tipo_habitacion === 'object' && hab.tipo_habitacion
      ? hab.tipo_habitacion.nombre
      : (hab.tipo_habitacion || '')
    const matchSearch =
      hab.numero.toString().includes(searchTerm) ||
      String(tipoNombre).toLowerCase().includes(searchTerm.toLowerCase())

    const tipoId = hab.tipo_habitacion?.id ?? hab.id_tipo_habitacion ?? hab.id_tipo;
    const matchTipo = !filterTipo || String(tipoId) === filterTipo;

    const estadoId = hab.estado?.id ?? hab.id_estado ?? hab.id_estado_actual
    const matchEstado = !filterEstado || String(estadoId) === filterEstado

    const matchPiso = !filterPiso || hab.piso.toString() === filterPiso

    return matchSearch && matchTipo && matchEstado && matchPiso
  })

  const getCapacidad = (hab) => hab.capacidad ?? hab.tipo_habitacion?.capacidad ?? '-'
  const getTarifa = (hab) => hab.precio_base ?? hab.tipo_habitacion?.precio_base ?? '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Habitaciones</h1>
          <p className="text-gray-500">Gestión del inventario de habitaciones del hotel</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          + Nueva Habitación
        </button>
      </div>

      {/* Filtros y buscador */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex-1 w-full">
            <label className="label">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número de habitación..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-full md:w-40">
              <label className="label">Piso</label>
              <select
                className="input"
                value={filterPiso}
                onChange={(e) => setFilterPiso(e.target.value)}
              >
                <option value="">Todos</option>
                {[...new Set(habitaciones.map(h => h.piso))].sort((a, b) => a - b).map(piso => (
                  <option key={piso} value={String(piso)}>Piso {piso}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="label">Tipo</label>
              <select
                className="input"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
              >
                <option value="">Todos</option>
                {tiposHabitacion.map(tipo => (
                  <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="label">Estado</label>
              <select
                className="input"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
              >
                <option value="">Todos</option>
                {estados.map(estado => (
                  <option key={estado.id} value={String(estado.id)}>{estado.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de habitaciones */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-left">
                <th className="px-4 py-3 font-semibold">Número</th>
                <th className="px-4 py-3 font-semibold">Piso</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Capacidad</th>
                <th className="px-4 py-3 font-semibold">Tarifa Base</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredHabitaciones.map((habitacion) => (
                <tr key={habitacion.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    Hab {habitacion.numero}
                  </td>
                  <td className="px-4 py-3 text-gray-600">Piso {habitacion.piso}</td>
                  <td className="px-4 py-3">
                    {typeof habitacion.tipo_habitacion === 'object'
                      ? habitacion.tipo_habitacion.nombre
                      : habitacion.tipo_habitacion}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{getCapacidad(habitacion)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {getTarifa(habitacion) !== '-' ? `$${Number(getTarifa(habitacion)).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(habitacion.estado)}`}>
                      {getEstadoNombre(habitacion.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(habitacion)}
                        className="btn btn-secondary text-sm py-1 px-3"
                      >
                        <Pencil className="w-4 h-4 mr-1 inline" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(habitacion.id)}
                        className="btn btn-danger text-sm py-1 px-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHabitaciones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay habitaciones que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingHabitacion ? 'Editar Habitación' : 'Nueva Habitación'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Número de habitación</label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Piso</label>
                <input
                  type="number"
                  value={formData.piso}
                  onChange={(e) => setFormData({ ...formData, piso: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="label">Tipo de Habitación</label>
                <select
                  value={formData.id_tipo_habitacion || ''}
                  onChange={(e) => setFormData({ ...formData, id_tipo_habitacion: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {tiposHabitacion.map((tipo) => (
                    <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  value={formData.id_estado}
                  onChange={(e) => setFormData({ ...formData, id_estado: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {estados.map(estado => (
                    <option key={estado.id} value={String(estado.id)}>{estado.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Capacidad (Personas)</label>
                <input
                  type="number"
                  value={formData.capacidad}
                  onChange={(e) => setFormData({ ...formData, capacidad: e.target.value })}
                  className="input"
                  min="1"
                  placeholder="Ej: 2"
                />
              </div>
              <div>
                <label className="label">Tarifa Base ($ por noche)</label>
                <input
                  type="number"
                  value={formData.precio_base}
                  onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                  className="input"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 150.00"
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="input"
                  rows="2"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Habitaciones
