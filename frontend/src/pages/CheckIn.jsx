import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Search,
  User,
  UserPlus,
  BedDouble,
  Calendar,
  Users,
  CreditCard,
  StickyNote,
  Calculator,
  LogIn,
  Phone,
  Mail,
  FileText,
  X,
  Building2,
  DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']

const CheckIn = () => {
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState([])
  const [huesped, setHuesped] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHabitacion, setSelectedHabitacion] = useState(null)
  const [showNuevoHuesped, setShowNuevoHuesped] = useState(false)
  const [nuevoHuesped, setNuevoHuesped] = useState({
    nombres: '',
    apellidos: '',
    tipo_documento: 'CI',
    numero_documento: '',
    email: '',
    telefono: ''
  })
  const [formData, setFormData] = useState({
    fecha_checkin: '',
    hora_checkin: '',
    numero_personas: 1,
    metodo_pago: 'Efectivo',
    notas: ''
  })

  useEffect(() => {
    fetchHabitacionesDisponibles()
  }, [])

  const fetchHabitacionesDisponibles = async () => {
    try {
      const response = await api.get('/habitaciones/disponibles')
      setHabitacionesDisponibles(response.data.data || response.data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar habitaciones disponibles')
    } finally {
      setLoading(false)
    }
  }

  // Buscar huésped por nombre, documento o teléfono
  const searchHuesped = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    try {
      const response = await api.get(`/operaciones/huesped/buscar?search=${encodeURIComponent(searchTerm)}`)
      const data = response.data.data || response.data
      if (Array.isArray(data) && data.length > 0) {
        setHuesped(data[0])
        toast.success('Huésped encontrado')
      } else {
        setHuesped(null)
        toast.error('Huésped no encontrado')
      }
    } catch (error) {
      setHuesped(null)
      toast.error('Huésped no encontrado')
    }
  }

// Guardar nuevo huésped en el backend
  const handleNuevoHuesped = async (e) => {
    e.preventDefault()
    if (!nuevoHuesped.nombres || !nuevoHuesped.apellidos || !nuevoHuesped.numero_documento) {
      toast.error('Complete los campos obligatorios (nombres, apellidos, documento)')
      return
    }

    try {
      const response = await api.post('/operaciones/huesped', nuevoHuesped)
      const nuevo = response.data.data || response.data
      setHuesped(nuevo)
      setShowNuevoHuesped(false)
      toast.success('Huésped registrado exitosamente')
      // Reset form
      setNuevoHuesped({
        nombres: '',
        apellidos: '',
        tipo_documento: 'CI',
        numero_documento: '',
        email: '',
        telefono: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear huésped')
    }
  }

  // Calcular cargo estimado
  const calcularCargoEstimado = () => {
    if (!selectedHabitacion) return 0
    const tarifa = selectedHabitacion.tipo_habitacion?.precio_base
      ?? selectedHabitacion.precio_base
      ?? selectedHabitacion.precio
      ?? 0
    const noches = calcularNoches()
    return tarifa * noches
  }

  const calcularNoches = () => {
    if (!formData.fecha_checkin || !formData.hora_checkin) return 1
    const checkin = new Date(`${formData.fecha_checkin}T${formData.hora_checkin || '15:00'}`)
    const hoy = new Date()
    const diff = Math.max(1, Math.ceil((hoy - checkin) / (1000 * 60 * 60 * 24)))
    return diff
  }

  const handleCheckIn = async (e) => {
    e.preventDefault()
    if (!selectedHabitacion || !huesped) {
      toast.error('Seleccione una habitación y un huésped')
      return
    }

    try {
      const payload = {
        id_habitacion: selectedHabitacion.id,
        id_huesped: huesped.id,
        fecha_checkout_prevista: formData.fecha_checkin,
        numero_adultos: formData.numero_personas,
        numero_ninos: 0,
        precio_noche: selectedHabitacion.tipo_habitacion?.precio_base
          ?? selectedHabitacion.precio_base
          ?? selectedHabitacion.precio
          ?? 0,
        observaciones: formData.notas || '',
        metodo_pago: formData.metodo_pago,
        email_huesped: huesped.email || ''
      }

      await api.post('/operaciones/checkin', payload)
      toast.success('Check-in registrado exitosamente')

      // Nota sobre envío de factura al correo
      if (huesped.email) {
        toast.success(`Factura se enviará al correo: ${huesped.email}`)
      }

      // Reset
      setHuesped(null)
      setSelectedHabitacion(null)
      setSearchTerm('')
      setFormData({
        fecha_checkin: '',
        hora_checkin: '',
        numero_personas: 1,
        metodo_pago: 'Efectivo',
        notas: ''
      })
      fetchHabitacionesDisponibles()
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al realizar el check-in'
      toast.error(msg)
      // Si el backend requiere id_huesped real o falla, mostrar sugerencia
      if (error.response?.status === 400 || error.response?.status === 500) {
        toast.error('Verifique que el huésped exista en la base de datos antes del check-in', { duration: 5000 })
      }
    }
  }

  const getTarifa = (hab) =>
    hab?.tipo_habitacion?.precio_base ?? hab?.precio_base ?? hab?.precio ?? 0

  const getTipoNombre = (hab) =>
    hab && typeof hab.tipo_habitacion === 'object' && hab.tipo_habitacion
      ? hab.tipo_habitacion.nombre
      : (hab?.tipo_habitacion || hab?.tipo || 'Habitación')

  const getCapacidad = (hab) =>
    hab?.tipo_habitacion?.capacidad ?? hab?.capacidad ?? '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary-100 text-primary-700">
          <LogIn className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Check-In</h1>
          <p className="text-gray-500">Registrar entrada de huéspedes y asignar habitación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Búsqueda y nuevo huésped */}
        <div className="space-y-6">
          {/* Buscar huésped */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Buscar Huésped</h2>
            </div>
            <form onSubmit={searchHuesped} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, documento o teléfono..."
                  className="input pl-10"
                />
              </div>
              <button type="submit" className="btn btn-primary flex items-center gap-1">
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </form>

            {/* Botón nuevo huésped */}
            <button
              onClick={() => setShowNuevoHuesped(true)}
              className="w-full btn btn-secondary flex items-center justify-center gap-2 border-dashed border-2"
            >
              <UserPlus className="w-5 h-5 text-primary-600" />
              + Nuevo Huésped
            </button>

            {/* Huésped encontrado */}
            {huesped && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg space-y-2 animate-slide-in">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-full">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-semibold text-green-800 text-lg">
                    {huesped.nombres} {huesped.apellidos}
                  </span>
                </div>
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {huesped.tipo_documento} - {huesped.numero_documento}
                </p>
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {huesped.telefono || '-'}
                </p>
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {huesped.email || huesped.correo || '-'}
                </p>
              </div>
            )}
          </div>

          {/* Habitaciones disponibles */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BedDouble className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Habitaciones Disponibles</h2>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {habitacionesDisponibles.map((habitacion) => (
                <motion.div
                  key={habitacion.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedHabitacion(habitacion)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedHabitacion?.id === habitacion.id
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-gray-400" />
                        Habitación {habitacion.numero}
                      </p>
                      <p className="text-sm text-gray-500">
                        Piso {habitacion.piso} - {getTipoNombre(habitacion)}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> Capacidad: {getCapacidad(habitacion)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Piso {habitacion.piso}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary-600 flex items-center justify-end gap-1">
                        <DollarSign className="w-4 h-4" />{getTarifa(habitacion)}
                      </p>
                      <p className="text-xs text-gray-500">por noche</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {habitacionesDisponibles.length === 0 && (
                <p className="text-gray-500 text-center py-4">No hay habitaciones disponibles</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Formulario de check-in */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <LogIn className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Registrar Check-In</h2>
          </div>

          {/* Card habitación seleccionada */}
          <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-4">
            {selectedHabitacion ? (
              <div>
                <p className="font-semibold text-primary-800 mb-2 flex items-center gap-2">
                  <BedDouble className="w-5 h-5" />
                  Habitación {selectedHabitacion.numero}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm text-primary-700">
                  <p><span className="font-medium">Tipo:</span> {getTipoNombre(selectedHabitacion)}</p>
                  <p><span className="font-medium">Piso:</span> {selectedHabitacion.piso}</p>
                  <p><span className="font-medium">Capacidad:</span> {getCapacidad(selectedHabitacion)}</p>
                  <p><span className="font-medium">Tarifa:</span> ${getTarifa(selectedHabitacion)} / noche</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                Seleccione una habitación disponible de la lista
              </p>
            )}
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4">
            {/* Fecha y hora de entrada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  Fecha de Entrada
                </label>
                <input
                  type="date"
                  value={formData.fecha_checkin}
                  onChange={(e) => setFormData({ ...formData, fecha_checkin: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  Hora de Entrada
                </label>
                <input
                  type="time"
                  value={formData.hora_checkin}
                  onChange={(e) => setFormData({ ...formData, hora_checkin: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>

            {/* Número de personas */}
            <div>
              <label className="label flex items-center gap-1">
                <Users className="w-4 h-4 text-primary-600" />
                Número de Personas
              </label>
              <input
                type="number"
                value={formData.numero_personas}
                onChange={(e) => setFormData({ ...formData, numero_personas: parseInt(e.target.value) || 1 })}
                className="input"
                min="1"
                max={getCapacidad(selectedHabitacion) === '-' ? 10 : getCapacidad(selectedHabitacion)}
                required
              />
            </div>

            {/* Método de pago */}
            <div>
              <label className="label flex items-center gap-1">
                <CreditCard className="w-4 h-4 text-primary-600" />
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {METODOS_PAGO.map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setFormData({ ...formData, metodo_pago: metodo })}
                    className={`p-2 border-2 rounded-lg text-sm font-medium transition-all ${
                      formData.metodo_pago === metodo
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-500 hover:border-primary-300'
                    }`}
                  >
                    {metodo === 'Efectivo' && '💵'}
                    {metodo === 'Tarjeta' && '💳'}
                    {metodo === 'Transferencia' && '🏦'}
                    {' '}{metodo}
                  </button>
                ))}
              </div>
            </div>

            {/* Notas adicionales */}
            <div>
              <label className="label flex items-center gap-1">
                <StickyNote className="w-4 h-4 text-primary-600" />
                Notas Adicionales
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="input"
                rows="2"
                placeholder="Observaciones sobre la estadía..."
              />
            </div>

            {/* Cálculo de cargo estimado */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5" />
                Cargo Estimado
              </p>
              <div className="flex justify-between text-sm text-amber-700">
                <span>Tarifa por noche:</span>
                <span>${selectedHabitacion ? getTarifa(selectedHabitacion) : 0}</span>
              </div>
              <div className="flex justify-between text-sm text-amber-700">
                <span>Noches estimadas:</span>
                <span>{selectedHabitacion ? calcularNoches() : 0}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-900 mt-2 pt-2 border-t border-amber-200">
                <span>Total estimado:</span>
                <span>${selectedHabitacion ? calcularCargoEstimado().toFixed(2) : '0.00'}</span>
              </div>
            </div>

            {/* Botón registrar */}
            <button
              type="submit"
              disabled={!selectedHabitacion || !huesped}
              className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <LogIn className="w-5 h-5" />
              Registrar Check-In
            </button>

            {!huesped && (
              <p className="text-xs text-center text-gray-400">
                Busque o registre un huésped para habilitar el botón
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Modal Nuevo Huésped */}
      <AnimatePresence>
        {showNuevoHuesped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-primary-600" />
                  Nuevo Huésped
                </h2>
                <button onClick={() => setShowNuevoHuesped(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleNuevoHuesped} className="space-y-4">
<div>
                  <label className="label flex items-center gap-1">
                    <User className="w-4 h-4 text-primary-600" />
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={nuevoHuesped.nombres}
                    onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, nombres: e.target.value })}
                    className="input"
                    placeholder="Nombres del huésped"
                    required
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <User className="w-4 h-4 text-primary-600" />
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={nuevoHuesped.apellidos}
                    onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, apellidos: e.target.value })}
                    className="input"
                    placeholder="Apellidos del huésped"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label flex items-center gap-1">
                      <FileText className="w-4 h-4 text-primary-600" />
                      Tipo Documento
                    </label>
                    <select
                      value={nuevoHuesped.tipo_documento}
                      onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, tipo_documento: e.target.value })}
                      className="input"
                    >
                      <option value="CI">CI</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="DPI">DPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1">
                      <FileText className="w-4 h-4 text-primary-600" />
                      N° Documento *
                    </label>
                    <input
                      type="text"
                      value={nuevoHuesped.numero_documento}
                      onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, numero_documento: e.target.value })}
                      className="input"
                      placeholder="Documento"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <Mail className="w-4 h-4 text-primary-600" />
                    Email (para factura)
                  </label>
                  <input
                    type="email"
                    value={nuevoHuesped.email}
                    onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, email: e.target.value })}
                    className="input"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <Phone className="w-4 h-4 text-primary-600" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={nuevoHuesped.telefono}
                    onChange={(e) => setNuevoHuesped({ ...nuevoHuesped, telefono: e.target.value })}
                    className="input"
                    placeholder="Teléfono de contacto"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowNuevoHuesped(false)} className="btn btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Guardar Huésped
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CheckIn
