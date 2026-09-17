import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { CalendarRange, BedDouble, UserPlus, Search, CheckCircle2, ArrowRightLeft, Plus } from 'lucide-react'

const initialGuestForm = {
  nombre: '',
  apellido: '',
  tipo_documento: 'CI',
  numero_documento: '',
  email: '',
  telefono: ''
}

const initialReservaForm = {
  id_habitacion: '',
  fecha_entrada: '',
  fecha_salida: '',
  cantidad_personas: 2,
  metodo_pago: 'Efectivo',
  monto_adelanto: '',
  total_estimado: '',
  observaciones: ''
}

const Reservas = () => {
  const [habitaciones, setHabitaciones] = useState([])
  const [reservas, setReservas] = useState([])
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState([])
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [guestForm, setGuestForm] = useState(initialGuestForm)
  const [reservaForm, setReservaForm] = useState(initialReservaForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [roomsRes, reservasRes] = await Promise.all([
        api.get('/operaciones/habitaciones-disponibles'),
        api.get('/reservas')
      ])

      const rooms = roomsRes.data.data || roomsRes.data || []
      const reservasData = reservasRes.data.data || reservasRes.data || []
      setHabitaciones(rooms)
      setReservas(reservasData)
      if (rooms.length > 0 && !reservaForm.id_habitacion) {
        setReservaForm((prev) => ({ ...prev, id_habitacion: String(rooms[0].id || rooms[0].id_habitacion) }))
      }
    } catch (error) {
      console.error('Error cargando reservas', error)
      toast.error('Error al cargar reservas')
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
    if (!guestForm.nombre.trim() || !guestForm.apellido.trim() || !guestForm.numero_documento.trim()) {
      toast.error('Completa nombre, apellido y documento del huésped')
      return
    }

    try {
      const payload = {
        nombres: guestForm.nombre,
        apellidos: guestForm.apellido,
        tipo_documento: guestForm.tipo_documento,
        numero_documento: guestForm.numero_documento,
        email: guestForm.email,
        telefono: guestForm.telefono
      }

      const response = await api.post('/operaciones/huesped', payload)
      const guest = response.data.data
      setSelectedGuest(guest)
      setGuestForm(initialGuestForm)
      setGuestSearch('')
      setGuestResults([])
      toast.success('Huésped listo para la reserva')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear huésped')
    }
  }

  const calcularTotalEstimado = useMemo(() => {
    if (!reservaForm.id_habitacion || !reservaForm.fecha_entrada || !reservaForm.fecha_salida) return 0

    const habitacion = habitaciones.find((h) => String(h.id || h.id_habitacion) === String(reservaForm.id_habitacion))
    const tarifa = Number(habitacion?.precio_base ?? habitacion?.precio ?? 0)
    const diff = Math.max(1, Math.round((new Date(reservaForm.fecha_salida) - new Date(reservaForm.fecha_entrada)) / 86400000))
    return Number((diff * tarifa).toFixed(2))
  }, [habitaciones, reservaForm])

  useEffect(() => {
    if (!reservaForm.total_estimado && calcularTotalEstimado > 0) {
      setReservaForm((prev) => ({ ...prev, total_estimado: String(calcularTotalEstimado) }))
    }
  }, [calcularTotalEstimado, reservaForm.total_estimado])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedGuest) {
      toast.error('Debes seleccionar o crear un huésped')
      return
    }

    if (!reservaForm.id_habitacion || !reservaForm.fecha_entrada || !reservaForm.fecha_salida) {
      toast.error('Selecciona la habitación y el rango de fechas')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        id_habitacion: Number(reservaForm.id_habitacion),
        id_huesped: Number(selectedGuest.id || selectedGuest.id_huesped),
        fecha_entrada: reservaForm.fecha_entrada,
        fecha_salida: reservaForm.fecha_salida,
        cantidad_personas: Number(reservaForm.cantidad_personas || 1),
        metodo_pago: reservaForm.metodo_pago,
        monto_adelanto: reservaForm.monto_adelanto ? Number(reservaForm.monto_adelanto) : null,
        total_estimado: reservaForm.total_estimado ? Number(reservaForm.total_estimado) : calcularTotalEstimado,
        observaciones: reservaForm.observaciones
      }

      await api.post('/reservas', payload)
      toast.success('Reserva creada correctamente')
      setSelectedGuest(null)
      setGuestSearch('')
      setGuestForm(initialGuestForm)
      setReservaForm(initialReservaForm)
      await fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear la reserva')
    } finally {
      setSubmitting(false)
    }
  }

  const convertirACheckin = async (id) => {
    try {
      await api.post(`/reservas/${id}/convertir`)
      toast.success('Reserva convertida a check-in')
      await fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo convertir la reserva')
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
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-[#d6d1bd] p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#c8b77a] bg-[#f8f4dc]">
              <CalendarRange className="w-5 h-5 text-[#b28b33]" />
            </span>
            <div>
              <h1 className="text-[30px] font-semibold leading-none text-[#253C59]">Reservas</h1>
              <p className="mt-2 text-[#51646e]">Gestiona reservas y conviértelas a check-in</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 rounded-2xl border border-[#e5dfd1] bg-[#faf8f3] p-5">
              <div className="flex items-center gap-2 font-semibold text-[#253C59]">
                <UserPlus className="w-4 h-4" /> Huésped
              </div>

              <div className="flex gap-2">
                <input
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  placeholder="Buscar huésped por nombre o documento"
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
                      onClick={() => setSelectedGuest(guest)}
                      className="w-full rounded-xl border border-[#d6d1bd] bg-white p-3 text-left hover:bg-[#f8f4dc]"
                    >
                      <div className="font-semibold text-[#253C59]">{guest.nombres} {guest.apellidos}</div>
                      <div className="text-sm text-[#51646e]">{guest.numero_documento || guest.documento || guest.numero_huesped}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={guestForm.nombre} onChange={(e) => setGuestForm({ ...guestForm, nombre: e.target.value })} placeholder="Nombre" className="input" />
                <input value={guestForm.apellido} onChange={(e) => setGuestForm({ ...guestForm, apellido: e.target.value })} placeholder="Apellido" className="input" />
                <select value={guestForm.tipo_documento} onChange={(e) => setGuestForm({ ...guestForm, tipo_documento: e.target.value })} className="input">
                  <option value="CI">CI</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
                <input value={guestForm.numero_documento} onChange={(e) => setGuestForm({ ...guestForm, numero_documento: e.target.value })} placeholder="N° documento" className="input" />
                <input value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} placeholder="Email" className="input md:col-span-2" />
                <input value={guestForm.telefono} onChange={(e) => setGuestForm({ ...guestForm, telefono: e.target.value })} placeholder="Teléfono" className="input md:col-span-2" />
              </div>

              <button type="button" onClick={crearHuesped} className="btn btn-secondary w-full">Crear huésped y usarlo en la reserva</button>

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

              <select value={reservaForm.id_habitacion} onChange={(e) => setReservaForm({ ...reservaForm, id_habitacion: e.target.value })} className="input">
                <option value="">Seleccione habitación</option>
                {habitaciones.map((h) => (
                  <option key={h.id || h.id_habitacion} value={h.id || h.id_habitacion}>
                    Hab. {h.numero || h.numero_habitacion} - {h.tipo || h.tipo_habitacion?.nombre || 'Habitación'}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="date" value={reservaForm.fecha_entrada} onChange={(e) => setReservaForm({ ...reservaForm, fecha_entrada: e.target.value })} className="input" />
                <input type="date" value={reservaForm.fecha_salida} onChange={(e) => setReservaForm({ ...reservaForm, fecha_salida: e.target.value })} className="input" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="number" min="1" value={reservaForm.cantidad_personas} onChange={(e) => setReservaForm({ ...reservaForm, cantidad_personas: e.target.value })} className="input" placeholder="Personas" />
                <select value={reservaForm.metodo_pago} onChange={(e) => setReservaForm({ ...reservaForm, metodo_pago: e.target.value })} className="input">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
                <input type="number" min="0" step="0.01" value={reservaForm.monto_adelanto} onChange={(e) => setReservaForm({ ...reservaForm, monto_adelanto: e.target.value })} placeholder="Monto adelanto" className="input" />
                <input type="number" min="0" step="0.01" value={reservaForm.total_estimado} onChange={(e) => setReservaForm({ ...reservaForm, total_estimado: e.target.value })} placeholder="Total estimado" className="input" />
              </div>

              <textarea value={reservaForm.observaciones} onChange={(e) => setReservaForm({ ...reservaForm, observaciones: e.target.value })} placeholder="Observaciones" className="input min-h-[90px]" />

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Total estimado sugerido: <strong>Q{Number(calcularTotalEstimado || reservaForm.total_estimado || 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {submitting ? 'Creando...' : 'Crear reserva'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-[#d6d1bd] shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
          <Search className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-[#253C59]">Reservas próximas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserva</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Huésped</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Habitación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-sm text-gray-500">No hay reservas próximas.</td>
                </tr>
              )}

              {reservas.map((reserva) => (
                <tr key={reserva.id || reserva.id_reserva} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reserva.numero_reserva || `R-${reserva.id || reserva.id_reserva}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{reserva.nombres || ''} {reserva.apellidos || ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reserva.numero_habitacion || reserva.id_habitacion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reserva.fecha_entrada ? new Date(reserva.fecha_entrada).toLocaleDateString() : '-'}
                    <span className="mx-2">→</span>
                    {reserva.fecha_salida ? new Date(reserva.fecha_salida).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 font-medium">{reserva.estado || 'CONFIRMADA'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {String(reserva.estado || '').toUpperCase() === 'CONFIRMADA' && (
                      <button type="button" onClick={() => convertirACheckin(reserva.id || reserva.id_reserva)} className="inline-flex items-center gap-2 rounded-xl bg-[#173f62] px-3 py-2 text-white hover:bg-[#123b63]">
                        <ArrowRightLeft className="w-4 h-4" /> Convertir a check-in
                      </button>
                    )}
                    {String(reserva.estado || '').toUpperCase() !== 'CONFIRMADA' && (
                      <span className="inline-flex items-center gap-2 text-gray-500"><CheckCircle2 className="w-4 h-4" /> {reserva.estado}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reservas
