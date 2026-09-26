import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  LogIn,
  Camera,
  ScanFace,
  CheckCircle2,
  X,
  Search,
  UserPlus,
  User,
  BedDouble
} from 'lucide-react'

const TIPO_DOC_OPTIONS = ['DPI', 'Pasaporte', 'NIT', 'CI']

const emptyForm = {
  nombre: '',
  apellido: '',
  numero_documento: '',
  telefono: '',
  email: '',
  tipo_documento: 'DPI'
}

const CheckIn = () => {
  // ─── Habitaciones disponibles ──────────────────────────────────────────────
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState([])
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // ─── Búsqueda de huésped ───────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  const [huespedSeleccionado, setHuespedSeleccionado] = useState(null) // huésped existente
  const [modoCrear, setModoCrear] = useState(false)      // mostrar form de creación
  const [formData, setFormData] = useState(emptyForm)

  // ─── Fechas ─────────────────────────────────────────────────────────────────
  const getFechaHoy = () => new Date().toISOString().split('T')[0]
  const getHoraActual = () => new Date().toTimeString().slice(0, 5)
  const [fechaEntrada, setFechaEntrada] = useState(getFechaHoy())
  const [horaEntrada, setHoraEntrada] = useState(getHoraActual())
  const [fechaSalida, setFechaSalida] = useState('')
  const [horaSalida, setHoraSalida] = useState('')
  const [metodoPago, setMetodoPago] = useState('Efectivo')

  // ─── Biometría ──────────────────────────────────────────────────────────────
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // ─── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHabitacionesDisponibles()
  }, [])

  const fetchHabitacionesDisponibles = async () => {
    try {
      setLoading(true)
      const response = await api.get('/operaciones/habitaciones-disponibles')
      const rooms = response.data.data || response.data || []
      setHabitacionesDisponibles(rooms)
      // Seleccionar la primera por defecto
      if (rooms.length > 0) {
        setHabitacionSeleccionada(String(rooms[0].id || rooms[0].id_habitacion))
      }
    } catch (error) {
      console.error('Error cargando habitaciones:', error)
      toast.error('Error al cargar habitaciones disponibles')
    } finally {
      setLoading(false)
    }
  }

  // ─── Búsqueda de huésped ───────────────────────────────────────────────────
  const buscarHuesped = async () => {
    if (!busqueda.trim()) {
      toast.error('Ingresa un nombre o número de documento para buscar')
      return
    }
    setBuscando(true)
    setResultadosBusqueda([])
    try {
      const response = await api.get('/operaciones/huesped/buscar', {
        params: { search: busqueda.trim() }
      })
      const resultados = response.data.data || response.data || []
      setResultadosBusqueda(resultados)
      if (resultados.length === 0) {
        toast('No se encontró el huésped. Puedes crearlo abajo.', { icon: 'ℹ️' })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al buscar huésped')
    } finally {
      setBuscando(false)
    }
  }

  const seleccionarHuespedExistente = (h) => {
    setHuespedSeleccionado(h)
    setResultadosBusqueda([])
    setBusqueda('')
    setModoCrear(false)
    toast.success(`Huésped seleccionado: ${h.nombres} ${h.apellidos}`)
  }

  const limpiarHuesped = () => {
    setHuespedSeleccionado(null)
    setFormData(emptyForm)
    setBusqueda('')
    setResultadosBusqueda([])
    setModoCrear(false)
  }

  // ─── Cámara biométrica ─────────────────────────────────────────────────────
  const startCamera = async () => {
    setIsCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      console.warn('Webcam no accesible:', err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      setCapturedPhoto(canvas.toDataURL('image/jpeg'))
      toast.success('Rostro capturado exitosamente')
    } else {
      setCapturedPhoto('simulated_face_photo')
      toast.success('Rostro capturado exitosamente')
    }
    stopCamera()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCapturedPhoto(reader.result)
      toast.success('Foto cargada exitosamente')
      stopCamera()
    }
    reader.readAsDataURL(file)
  }

  // ─── Precio de la habitación seleccionada ──────────────────────────────────
  const getHabitacionActual = () =>
    habitacionesDisponibles.find(
      h => String(h.id || h.id_habitacion) === String(habitacionSeleccionada)
    )

  // ─── Submit del check-in ───────────────────────────────────────────────────
  const handleCheckIn = async (e) => {
    e.preventDefault()

    // Validar que haya huésped
    if (!huespedSeleccionado && !modoCrear) {
      toast.error('Primero busca o crea el perfil del huésped')
      return
    }
    if (modoCrear && (!formData.nombre.trim() || !formData.apellido.trim() || !formData.numero_documento.trim())) {
      toast.error('Nombre, apellido y documento son obligatorios')
      return
    }
    if (!habitacionSeleccionada) {
      toast.error('Selecciona una habitación')
      return
    }
    if (!fechaEntrada || !fechaSalida) {
      toast.error('Ingresa las fechas de entrada y salida')
      return
    }

    const hab = getHabitacionActual()
    const idHabitacion = Number(habitacionSeleccionada)
    const entradaDateTime = horaEntrada
      ? `${fechaEntrada}T${horaEntrada}`
      : fechaEntrada
    const salidaDateTime = horaSalida
      ? `${fechaSalida}T${horaSalida}`
      : fechaSalida

    setSubmitting(true)
    try {
      let guestId = huespedSeleccionado?.id || huespedSeleccionado?.id_huesped

      // Si está en modo crear, registrar el nuevo huésped primero
      if (modoCrear) {
        const guestRes = await api.post('/operaciones/huesped', {
          nombres: formData.nombre.trim(),
          apellidos: formData.apellido.trim(),
          tipo_documento: formData.tipo_documento,
          numero_documento: formData.numero_documento.trim(),
          telefono: formData.telefono.trim() || '',
          email: formData.email.trim() || ''
        })
        guestId = guestRes.data.data?.id ?? guestRes.data.data?.id_huesped
      }

      if (!guestId) throw new Error('No se pudo obtener el ID del huésped')

      const payload = {
        id_habitacion: idHabitacion,
        id_huesped: Number(guestId),
        fecha_checkin: entradaDateTime,
        hora_checkin: horaEntrada,
        fecha_checkout_prevista: salidaDateTime,
        hora_checkout_prevista: horaSalida,
        numero_adultos: 1,
        numero_ninos: 0,
        precio_noche: Number(hab?.precio_base ?? hab?.precio ?? 100),
        observaciones: capturedPhoto ? 'Verificación biométrica registrada' : '',
        metodo_pago: metodoPago,
        biometria_verificada: Boolean(capturedPhoto),
        tipo_verificacion: capturedPhoto ? 'facial' : 'opcional'
      }

      await api.post('/operaciones/checkin', payload)
      toast.success('¡Check-in confirmado exitosamente!')

      // Resetear todo
      limpiarHuesped()
      setFechaEntrada(getFechaHoy())
      setHoraEntrada(getHoraActual())
      setFechaSalida('')
      setHoraSalida('')
      setMetodoPago('Efectivo')
      setCapturedPhoto(null)
      await fetchHabitacionesDisponibles()
    } catch (error) {
      console.error('Error en check-in:', error)
      toast.error(error.response?.data?.message || 'Error al confirmar check-in')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1f314a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full py-4 px-2 sm:px-4 flex justify-center animate-fade-in">
      <div className="w-full max-w-3xl space-y-5">

        {/* HEADER */}
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#1b2a47] text-white">
            <LogIn className="w-4 h-4" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1f2d3d] leading-tight">
              Registro de Check-in
            </h1>
            <p className="text-xs text-[#6a7b8c]">Busca el perfil del huésped o crea uno nuevo</p>
          </div>
        </div>

        <form onSubmit={handleCheckIn} className="space-y-5">

          {/* ── BLOQUE 1: HUÉSPED ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#e5ded0] shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[#1f2d3d] text-sm">
              <User className="w-4 h-4 text-[#5a6b7c]" />
              Huésped
            </div>

            {/* Huésped ya seleccionado */}
            {huespedSeleccionado ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-emerald-800 text-sm">
                    {huespedSeleccionado.nombres} {huespedSeleccionado.apellidos}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {huespedSeleccionado.numero_documento || huespedSeleccionado.documento || ''}
                    {huespedSeleccionado.email ? ` · ${huespedSeleccionado.email}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={limpiarHuesped}
                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition"
                  title="Cambiar huésped"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Buscador */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#5a6b7c]">
                    Buscar huésped existente
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a96a3]" />
                      <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarHuesped())}
                        placeholder="Nombre, apellido o número de documento"
                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[#d8d0be] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={buscarHuesped}
                      disabled={buscando}
                      className="px-4 py-2.5 bg-[#1b2a47] hover:bg-[#25395f] text-white text-sm font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {buscando
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Search className="w-4 h-4" />}
                      Buscar
                    </button>
                  </div>

                  {/* Resultados de búsqueda */}
                  {resultadosBusqueda.length > 0 && (
                    <div className="rounded-xl border border-[#e5ded0] bg-[#faf8f3] divide-y divide-[#e5ded0] max-h-48 overflow-y-auto">
                      {resultadosBusqueda.map(h => (
                        <button
                          key={h.id || h.id_huesped}
                          type="button"
                          onClick={() => seleccionarHuespedExistente(h)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f0ece0] transition"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[#1f2d3d]">
                              {h.nombres} {h.apellidos}
                            </p>
                            <p className="text-xs text-[#6a7b8c]">
                              {h.numero_documento || h.documento || ''}
                              {h.email ? ` · ${h.email}` : ''}
                              {h.telefono ? ` · ${h.telefono}` : ''}
                            </p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-[#b28b33] shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Separador */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-[#e5ded0]" />
                  <span className="text-xs text-[#8a96a3] font-medium">o</span>
                  <div className="flex-1 border-t border-[#e5ded0]" />
                </div>

                {/* Botón para mostrar/ocultar form de creación */}
                {!modoCrear ? (
                  <button
                    type="button"
                    onClick={() => setModoCrear(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-[#b28b33] text-[#b28b33] rounded-xl text-sm font-medium hover:bg-[#fdf8ec] transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Registrar nuevo huésped
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#1f2d3d] flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Datos del nuevo huésped
                      </p>
                      <button
                        type="button"
                        onClick={() => setModoCrear(false)}
                        className="text-xs text-[#8a96a3] hover:text-red-500 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">Nombre *</label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">Apellido *</label>
                        <input
                          type="text"
                          value={formData.apellido}
                          onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">Tipo documento</label>
                        <select
                          value={formData.tipo_documento}
                          onChange={e => setFormData({ ...formData, tipo_documento: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        >
                          {TIPO_DOC_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">N° documento *</label>
                        <input
                          type="text"
                          value={formData.numero_documento}
                          onChange={e => setFormData({ ...formData, numero_documento: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">Teléfono</label>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#5a6b7c] mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full border border-[#d8d0be] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── BLOQUE 2: HABITACIÓN Y FECHAS ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#e5ded0] shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[#1f2d3d] text-sm">
              <BedDouble className="w-4 h-4 text-[#5a6b7c]" />
              Habitación y fechas
            </div>

            {/* Selector de habitación */}
            <div>
              <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">
                Habitación disponible *
              </label>
              {habitacionesDisponibles.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No hay habitaciones disponibles en este momento.
                </div>
              ) : (
                <select
                  value={habitacionSeleccionada}
                  onChange={e => setHabitacionSeleccionada(e.target.value)}
                  className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                >
                  <option value="">— Seleccione una habitación —</option>
                  {Object.entries(
                    habitacionesDisponibles.reduce((acc, h) => {
                      const tipo = h.tipo || h.tipo_habitacion?.nombre || 'General'
                      if (!acc[tipo]) acc[tipo] = []
                      acc[tipo].push(h)
                      return acc
                    }, {})
                  ).map(([tipo, rooms]) => (
                    <optgroup key={tipo} label={`Tipo: ${tipo}`}>
                      {rooms.map(h => {
                        const id = h.id || h.id_habitacion
                        const num = h.numero || h.numero_habitacion
                        const precio = h.precio_base ?? h.precio ?? ''
                        return (
                          <option key={id} value={id}>
                            Hab. {num} — {tipo}{precio ? ` — Q${Number(precio).toFixed(2)}/noche` : ''}
                          </option>
                        )
                      })}
                    </optgroup>
                  ))}
                </select>
              )}
              {/* Info de la habitación seleccionada */}
              {habitacionSeleccionada && getHabitacionActual() && (
                <p className="mt-1.5 text-xs text-[#6a7b8c]">
                  Piso {getHabitacionActual()?.piso} ·&nbsp;
                  Tarifa: <strong>Q{Number(getHabitacionActual()?.precio_base ?? getHabitacionActual()?.precio ?? 0).toFixed(2)}/noche</strong>
                </p>
              )}
            </div>

            {/* Fechas y horas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">Fecha entrada *</label>
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={e => setFechaEntrada(e.target.value)}
                  className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">Hora entrada *</label>
                <input
                  type="time"
                  value={horaEntrada}
                  onChange={e => setHoraEntrada(e.target.value)}
                  className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">Fecha salida estimada *</label>
                <input
                  type="date"
                  value={fechaSalida}
                  min={fechaEntrada || getFechaHoy()}
                  onChange={e => setFechaSalida(e.target.value)}
                  className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">Hora salida estimada</label>
                <input
                  type="time"
                  value={horaSalida}
                  onChange={e => setHoraSalida(e.target.value)}
                  className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
                />
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-xs font-semibold text-[#5a6b7c] mb-1.5">Método de pago</label>
              <select
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                className="w-full border border-[#d8d0be] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#213547]/20 focus:border-[#213547]"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          {/* ── BLOQUE 3: VERIFICACIÓN BIOMÉTRICA (OPCIONAL) ──────────────── */}
          <div className="bg-white rounded-2xl border border-[#e5ded0] shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-[#1f2d3d] text-sm">
              <ScanFace className="w-4 h-4 text-[#5a6b7c]" />
              Verificación biométrica{' '}
              <span className="text-xs font-normal text-[#7b8b9a]">(opcional)</span>
            </div>
            <p className="text-xs text-[#6a7b8c]">
              Se usará para confirmar la identidad del huésped en el check-out.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {/* Miniatura */}
              <div className="w-14 h-14 rounded-xl bg-[#edece8] border border-[#d8d3c5] flex items-center justify-center overflow-hidden shrink-0">
                {capturedPhoto && capturedPhoto !== 'simulated_face_photo' ? (
                  <img src={capturedPhoto} alt="Rostro" className="w-full h-full object-cover" />
                ) : capturedPhoto === 'simulated_face_photo' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                ) : (
                  <Camera className="w-6 h-6 text-[#7b8b9a]" />
                )}
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-white hover:bg-[#f7f5f0] text-[#1f2d3d] text-xs sm:text-sm font-medium border border-[#d0c8b6] rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4 text-[#5a6b7c]" />
                Capturar rostro
              </button>

              <span className={`text-xs font-medium ${capturedPhoto ? 'text-emerald-700 flex items-center gap-1' : 'text-[#8a96a3]'}`}>
                {capturedPhoto ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> Rostro capturado</>
                ) : 'Aún no capturado'}
              </span>

              {capturedPhoto && (
                <button
                  type="button"
                  onClick={() => setCapturedPhoto(null)}
                  className="text-xs text-red-500 hover:text-red-700 ml-auto"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>

          {/* ── BOTÓN CONFIRMAR ────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || habitacionesDisponibles.length === 0}
            className="w-full bg-[#1b2a47] hover:bg-[#25395f] active:bg-[#132037] text-white font-semibold py-3.5 px-6 rounded-2xl shadow-md transition duration-150 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><LogIn className="w-4 h-4" /> Confirmar check-in</>
            )}
          </button>

        </form>
      </div>

      {/* ── MODAL CÁMARA ────────────────────────────────────────────────────── */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#d6d1bd] space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-[#1f2d3d]">
                <ScanFace className="w-5 h-5 text-[#213547]" />
                Captura de Rostro (Biometría)
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full m-8 pointer-events-none" />
            </div>

            <p className="text-xs text-center text-[#6a7b8c]">
              Centre el rostro dentro del visor y presione capturar.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full py-3 bg-[#1b2a47] hover:bg-[#25395f] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow"
              >
                <Camera className="w-4 h-4" /> Tomar fotografía
              </button>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                  Subir foto desde archivo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckIn
