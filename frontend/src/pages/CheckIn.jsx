import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  User,
  BedDouble,
  Calendar,
  LogIn,
  Phone,
  Mail,
  FileText,
  Search,
  UserPlus,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

const CheckIn = () => {
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState([])
  const [selectedHabitacion, setSelectedHabitacion] = useState(null)
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState([])
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    tipo_documento: 'CI',
    numero_documento: '',
    email: '',
    telefono: '',
    fecha_entrada: '',
    fecha_salida_estimada: '',
    hora_registro: '',
    numero_adultos: 1,
    numero_ninos: 0,
    metodo_pago: 'Efectivo',
    observaciones: '',
    biometria_verificada: false,
    tipo_verificacion: 'opcional'
  })

  useEffect(() => {
    fetchHabitacionesDisponibles()
  }, [])

  const fetchHabitacionesDisponibles = async () => {
    try {
      const response = await api.get('/operaciones/habitaciones-disponibles')
      const rooms = response.data.data || response.data || []
      setHabitacionesDisponibles(rooms)
      if (rooms.length > 0 && !selectedHabitacion) {
        setSelectedHabitacion(rooms[0])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar habitaciones disponibles')
    } finally {
      setLoading(false)
    }
  }

  const buscarHuespedes = async () => {
    if (!guestSearch.trim()) {
      setGuestResults([])
      return
    }

    try {
      const response = await api.get('/operaciones/huesped/buscar', {
        params: { search: guestSearch }
      })
      setGuestResults(response.data.data || response.data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo buscar huésped')
    }
  }

  const crearHuesped = async () => {
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.numero_documento.trim()) {
      toast.error('Completa nombre, apellido y documento del huésped')
      return
    }

    try {
      const response = await api.post('/operaciones/huesped', {
        nombres: formData.nombre,
        apellidos: formData.apellido,
        tipo_documento: formData.tipo_documento,
        numero_documento: formData.numero_documento,
        email: formData.email,
        telefono: formData.telefono
      })
      const guest = response.data.data
      setSelectedGuest(guest)
      toast.success('Huésped registrado y listo para el check-in')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear huésped')
    }
  }

  const getTipoNombre = (hab) =>
    hab && typeof hab.tipo_habitacion === 'object' && hab.tipo_habitacion
      ? hab.tipo_habitacion.nombre
      : (hab?.tipo_habitacion || hab?.tipo || 'Habitación')

  const handleCheckIn = async (e) => {
    e.preventDefault()
    if (!selectedHabitacion) {
      toast.error('Seleccione una habitación disponible')
      return
    }

    let guestId = selectedGuest?.id ?? selectedGuest?.id_huesped
    if (!guestId) {
      if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.numero_documento.trim()) {
        toast.error('Debe seleccionar o crear un huésped antes del check-in')
        return
      }

      try {
        const response = await api.post('/operaciones/huesped', {
          nombres: formData.nombre,
          apellidos: formData.apellido,
          tipo_documento: formData.tipo_documento,
          numero_documento: formData.numero_documento,
          email: formData.email,
          telefono: formData.telefono
        })
        guestId = response.data.data?.id ?? response.data.data?.id_huesped
      } catch (error) {
        toast.error(error.response?.data?.message || 'No se pudo crear el huésped')
        return
      }
    }

    if (!formData.fecha_entrada || !formData.fecha_salida_estimada) {
      toast.error('Ingrese la fecha de entrada y salida estimada')
      return
    }

    try {
      const payload = {
        id_habitacion: Number(selectedHabitacion.id ?? selectedHabitacion.id_habitacion),
        id_huesped: Number(guestId),
        fecha_checkout_prevista: formData.fecha_salida_estimada,
        numero_adultos: Number(formData.numero_adultos || 1),
        numero_ninos: Number(formData.numero_ninos || 0),
        precio_noche: Number(selectedHabitacion.precio_base ?? selectedHabitacion.precio ?? 0),
        observaciones: formData.observaciones || (biometricEnabled ? 'Verificación biométrica realizada' : ''),
        metodo_pago: formData.metodo_pago || 'Efectivo',
        biometria_verificada: Boolean(biometricEnabled),
        tipo_verificacion: biometricEnabled ? (formData.tipo_verificacion || 'opcional') : null
      }

      await api.post('/operaciones/checkin', payload)
      toast.success('Check-in registrado exitosamente')
      setSelectedGuest(null)
      setGuestSearch('')
      setGuestResults([])
      setBiometricEnabled(false)
      setFormData((prev) => ({
        ...prev,
        nombre: '',
        apellido: '',
        numero_documento: '',
        email: '',
        telefono: '',
        fecha_entrada: '',
        fecha_salida_estimada: '',
        hora_registro: '',
        observaciones: '',
        biometria_verificada: false,
        tipo_verificacion: 'opcional'
      }))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al realizar el check-in')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-[#d6d1bd] p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#c8b77a] bg-[#f8f4dc]">
              <LogIn className="w-4 h-4 text-[#b28b33]" />
            </span>
            <h1 className="text-[30px] font-semibold leading-none text-[#253C59]">Registro de check-in</h1>
          </div>

          <button
            type="button"
            onClick={() => setSelectedGuest(null)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c8b77a] bg-[#f8f4dc] px-4 py-2 text-sm font-semibold text-[#253C59] shadow-sm transition hover:bg-[#e9d6a8]"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo huésped
          </button>
        </div>

        <form onSubmit={handleCheckIn} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 rounded-2xl border border-[#e5dfd1] bg-[#faf8f3] p-5">
              <div className="flex items-center gap-2 font-semibold text-[#253C59]">
                <User className="w-4 h-4" /> Huésped
              </div>

              <div className="flex gap-2">
                <input
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Buscar huésped existente"
                  className="input flex-1"
                />
                <button type="button" onClick={buscarHuespedes} className="btn btn-secondary">Buscar</button>
              </div>

              {guestResults.length > 0 && (
                <div className="space-y-2">
                  {guestResults.map((guest) => (
                    <button
                      key={guest.id || guest.id_huesped}
                      type="button"
                      onClick={() => {
                        setSelectedGuest(guest)
                        setGuestResults([])
                        setGuestSearch(`${guest.nombres || guest.nombre} ${guest.apellidos || guest.apellido}`)
                      }}
                      className="w-full rounded-xl border border-[#d6d1bd] bg-white p-3 text-left hover:bg-[#f8f4dc]"
                    >
                      <div className="font-semibold text-[#253C59]">{guest.nombres} {guest.apellidos}</div>
                      <div className="text-sm text-[#51646e]">{guest.numero_documento || guest.documento || guest.numero_huesped}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} placeholder="Nombre" className="input" />
                <input value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} placeholder="Apellido" className="input" />
                <select value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })} className="input">
                  <option value="CI">CI</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="DNI">DNI</option>
                </select>
                <input value={formData.numero_documento} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} placeholder="N° documento" className="input" />
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" className="input md:col-span-2" />
                <input type="tel" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} placeholder="Teléfono" className="input md:col-span-2" />
              </div>

              <button type="button" onClick={crearHuesped} className="btn btn-secondary w-full">Crear huésped y continuar</button>

              {selectedGuest && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Huésped seleccionado: <strong>{selectedGuest.nombres || selectedGuest.nombre} {selectedGuest.apellidos || selectedGuest.apellido}</strong>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-[#e5dfd1] bg-[#faf8f3] p-5">
              <div className="flex items-center gap-2 font-semibold text-[#253C59]">
                <BedDouble className="w-4 h-4" /> Habitación y fechas
              </div>

              <div className="flex flex-wrap gap-3">
                {habitacionesDisponibles.map((hab) => (
                  <button
                    key={hab.id || hab.id_habitacion}
                    type="button"
                    onClick={() => setSelectedHabitacion(hab)}
                    className={`min-w-[120px] px-4 py-3 rounded-xl border text-sm font-semibold transition ${
                      selectedHabitacion?.id === hab.id || selectedHabitacion?.id_habitacion === hab.id_habitacion
                        ? 'bg-[#dcedda] border-[#7aa86f] text-[#244b31] shadow-sm'
                        : 'bg-[#f9f8f6] border-[#c9c2ad] text-[#253C59] hover:bg-[#eef4f8]'
                    }`}
                  >
                    <span className="block">Hab. {hab.numero || hab.id || hab.id_habitacion} - {getTipoNombre(hab)}</span>
                    <span className="block mt-1 text-xs text-[#51646e]">{hab.precio_base ?? hab.precio ?? 'Precio'}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#52656c] mb-2">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#7c8d99]" /> Entrada</span>
                  </label>
                  <input type="date" value={formData.fecha_entrada} onChange={(e) => setFormData({ ...formData, fecha_entrada: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#52656c] mb-2">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#7c8d99]" /> Salida estimada</span>
                  </label>
                  <input type="date" value={formData.fecha_salida_estimada} onChange={(e) => setFormData({ ...formData, fecha_salida_estimada: e.target.value })} className="input" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="number" min="1" value={formData.numero_adultos} onChange={(e) => setFormData({ ...formData, numero_adultos: e.target.value })} placeholder="Adultos" className="input" />
                <input type="number" min="0" value={formData.numero_ninos} onChange={(e) => setFormData({ ...formData, numero_ninos: e.target.value })} placeholder="Niños" className="input" />
                <select value={formData.metodo_pago} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })} className="input">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div className="rounded-2xl border border-dashed border-[#d6d1bd] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#253C59] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#7c8d99]" /> Verificación biométrica
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={biometricEnabled} onChange={(e) => {
                      const checked = e.target.checked
                      setBiometricEnabled(checked)
                      setFormData((prev) => ({ ...prev, biometria_verificada: checked, tipo_verificacion: checked ? (prev.tipo_verificacion || 'opcional') : 'opcional' }))
                    }} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>

                {biometricEnabled && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select value={formData.tipo_verificacion} onChange={(e) => setFormData({ ...formData, tipo_verificacion: e.target.value })} className="input">
                      <option value="opcional">Opcional</option>
                      <option value="obligatoria">Obligatoria</option>
                    </select>
                    <input type="text" value={formData.hora_registro} onChange={(e) => setFormData({ ...formData, hora_registro: e.target.value })} placeholder="Hora de registro" className="input" />
                  </div>
                )}

                {!biometricEnabled && (
                  <p className="mt-3 text-sm text-[#51646e]">La verificación biométrica es opcional; puedes omitirla si no aplica.</p>
                )}
              </div>

              <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} placeholder="Observaciones" className="input min-h-[90px]" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#1f314a] hover:bg-[#243b59] px-6 py-3 text-white font-semibold shadow-lg">
              <CheckCircle2 className="w-5 h-5" /> Confirmar check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CheckIn
