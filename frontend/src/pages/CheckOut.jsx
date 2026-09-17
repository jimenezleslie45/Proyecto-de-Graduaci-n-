import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Search,
  Download,
  LogOut,
  Calendar,
  Plus,
  Trash2,
  Wine,
  BellRing,
  Calculator,
  CheckCircle,
  X,
  User,
  BedDouble,
  Clock,
  ArrowRight,
  RefreshCw,
  Phone,
  FileText
} from 'lucide-react'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']
const IMPUESTO = 0.13

const CheckOut = () => {
  const [estadasActivas, setEstadasActivas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEstadia, setSelectedEstadia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [extending, setExtending] = useState(false)
  const [showExtender, setShowExtender] = useState(false)
  const [nuevaFechaSalida, setNuevaFechaSalida] = useState('')
  const [successModal, setSuccessModal] = useState({ visible: false, numero_factura: '', id_factura: null })

  const [formData, setFormData] = useState({
    fecha_salida: '',
    hora_salida: '',
    metodo_pago: 'Efectivo',
    referencia: '',
    genera_factura: true,
    observaciones: ''
  })

  const [cargos, setCargos] = useState([])

  const fetchEstadasActivas = useCallback(async () => {
    try {
      setLoading(true)
      let response
      try {
        response = await api.get('/operaciones/checkin/activos')
      } catch {
        response = await api.get('/operaciones/checkin')
      }
      const data = response.data?.data || response.data || []
      setEstadasActivas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar estadías activas:', error)
      toast.error('Error al cargar las estadías activas')
      setEstadasActivas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstadasActivas()
  }, [fetchEstadasActivas])

  // Cálculo de días hospedado desde el check-in hasta el momento actual
  const calcularDiasHospedado = (fechaCheckin) => {
    if (!fechaCheckin) return '-'
    const checkin = new Date(fechaCheckin)
    if (isNaN(checkin.getTime())) return '-'
    const ahora = new Date()
    const dCheckin = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate())
    const dAhora = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const diffMs = dAhora.getTime() - dCheckin.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Hoy (1er día)'
    if (diffDays === 1) return '1 día'
    return `${diffDays} días`
  }

  const formatFechaHora = (fecha) => {
    if (!fecha) return '-'
    const d = new Date(fecha)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFechaCorta = (fecha) => {
    if (!fecha) return '-'
    const d = new Date(fecha)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Filtrado en tiempo real sin requerir botón 'Buscar'
  const filteredEstadias = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return estadasActivas

    return estadasActivas.filter((e) => {
      const habitacion = String(e.numero_habitacion || e.habitacion?.numero || '').toLowerCase()
      const nombre = `${e.nombres || ''} ${e.apellidos || ''}`.toLowerCase()
      const documento = String(e.numero_documento || e.documento || '').toLowerCase()
      const numeroEstadia = String(e.numero_estadia || e.id_estadia || e.id || '').toLowerCase()
      return habitacion.includes(term) || nombre.includes(term) || documento.includes(term) || numeroEstadia.includes(term)
    })
  }, [estadasActivas, searchTerm])

  const selectEstadia = (estadia) => {
    setSelectedEstadia(estadia)
    setShowExtender(false)
    setNuevaFechaSalida('')
    setCargos([])

    const ahora = new Date()
    const fechaSalidaDefecto = ahora.toISOString().split('T')[0]
    const horaSalidaDefecto = ahora.toTimeString().slice(0, 5)

    setFormData({
      fecha_salida: fechaSalidaDefecto,
      hora_salida: horaSalidaDefecto,
      metodo_pago: estadia.metodo_pago || 'Efectivo',
      referencia: '',
      genera_factura: true,
      observaciones: ''
    })
  }

  const agregarCargo = (tipo) => {
    setCargos((prev) => [...prev, { id: Date.now(), tipo, descripcion: '', cantidad: 1, precio: '' }])
  }

  const actualizarCargo = (id, campo, valor) => {
    setCargos((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)))
  }

  const eliminarCargo = (id) => {
    setCargos((prev) => prev.filter((c) => c.id !== id))
  }

  const calcularNoches = () => {
    const checkinRaw = selectedEstadia?.fecha_checkin || selectedEstadia?.check_in
    if (!checkinRaw) return 1
    const checkin = new Date(checkinRaw)
    const checkoutPrevistoRaw = selectedEstadia?.fecha_checkout_prevista || selectedEstadia?.check_out || checkinRaw
    const checkout = formData.fecha_salida
      ? new Date(`${formData.fecha_salida}T${formData.hora_salida || '12:00'}`)
      : new Date(checkoutPrevistoRaw)
    const diff = Math.round((checkout.getTime() - checkin.getTime()) / 86400000)
    return Math.max(1, diff)
  }

  const getPrecioNoche = () =>
    selectedEstadia?.precio_noche ?? selectedEstadia?.tarifa_base ?? selectedEstadia?.precio ?? 0

  const calcularSubtotalAlojamiento = () => {
    if (!selectedEstadia) return 0
    return calcularNoches() * Number(getPrecioNoche() || 0)
  }

  const calcularSubtotalCargos = () =>
    cargos.reduce((sum, c) => sum + (Number(c.cantidad) || 0) * (Number(c.precio) || 0), 0)

  const subtotal = calcularSubtotalAlojamiento() + calcularSubtotalCargos()
  const impuesto = subtotal * IMPUESTO
  const total = subtotal + impuesto

  const descargarPDF = async (idFactura) => {
    try {
      const response = await api.get(`/facturas/${idFactura}/descargar`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `factura-${idFactura}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al descargar PDF')
    }
  }

  const extenderEstadia = async () => {
    if (!selectedEstadia || !nuevaFechaSalida) {
      toast.error('Seleccione una estadía y una nueva fecha de salida')
      return
    }
    setExtending(true)
    try {
      const idEstadia = selectedEstadia.id_estadia || selectedEstadia.id
      await api.put(`/operaciones/checkin/${idEstadia}/extender`, {
        nueva_fecha_check_out: nuevaFechaSalida
      })
      toast.success('Estadía extendida correctamente')
      setShowExtender(false)
      setNuevaFechaSalida('')
      await fetchEstadasActivas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al extender la estadía')
    } finally {
      setExtending(false)
    }
  }

  const registrarCheckout = async () => {
    if (!selectedEstadia) {
      toast.error('Seleccione una estadía activa')
      return
    }
    if (!formData.metodo_pago) {
      toast.error('Seleccione un método de pago')
      return
    }

    setProcesando(true)
    const idEstadia = selectedEstadia.id_estadia || selectedEstadia.id
    const cargosDetalle = cargos
      .filter((c) => c.descripcion && c.descripcion.trim() && Number(c.precio) > 0)
      .map((c) => ({
        descripcion: c.descripcion.trim(),
        cantidad: Math.max(1, Number(c.cantidad) || 1),
        precio_unitario: Number(c.precio) || 0
      }))

    try {
      // 1. Registrar el check-out en la estadía
      const checkoutPayload = {
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        observaciones: formData.observaciones,
        fecha_salida: formData.fecha_salida,
        hora_salida: formData.hora_salida,
        cargos_adicionales: cargosDetalle,
        genera_factura: formData.genera_factura,
        total: Number(total.toFixed(2))
      }

      await api.put(`/operaciones/checkout/${idEstadia}`, checkoutPayload)

      // 2. Generar factura si aplica
      let numeroFacturaGenerada = null
      let idFacturaGenerada = null

      if (formData.genera_factura) {
        const facturaPayload = {
          id_habitacion: selectedEstadia.id_habitacion,
          nombre_cliente: `${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim(),
          documento_cliente: selectedEstadia.numero_documento || selectedEstadia.documento,
          email_cliente: selectedEstadia.email || selectedEstadia.correo || '',
          subtotal: Number(subtotal.toFixed(2)),
          impuesto: Number(impuesto.toFixed(2)),
          total: Number(total.toFixed(2)),
          detalles: [
            {
              descripcion: `Estadía por ${calcularNoches()} noche(s) en Hab. ${selectedEstadia.numero_habitacion}`,
              cantidad: calcularNoches(),
              precio_unitario: getPrecioNoche()
            },
            ...cargosDetalle.map((c) => ({
              descripcion: c.descripcion,
              cantidad: c.cantidad,
              precio_unitario: c.precio_unitario
            }))
          ]
        }

        const response = await api.post('/facturas', facturaPayload)
        idFacturaGenerada = response.data?.data?.id_factura
        numeroFacturaGenerada = response.data?.data?.numero_factura || (idFacturaGenerada ? `FAC-${String(idFacturaGenerada).padStart(4, '0')}` : '')
      }

      // 3. Limpiar formulario y selección
      setSelectedEstadia(null)
      setCargos([])
      setSearchTerm('')
      setShowExtender(false)
      setFormData({
        fecha_salida: '',
        hora_salida: '',
        metodo_pago: 'Efectivo',
        referencia: '',
        genera_factura: true,
        observaciones: ''
      })

      await fetchEstadasActivas()

      // 4. Mostrar modal de éxito
      setSuccessModal({
        visible: true,
        numero_factura: numeroFacturaGenerada,
        id_factura: idFacturaGenerada
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el check-out')
    } finally {
      setProcesando(false)
    }
  }

  const cerrarSuccessModal = () => {
    setSuccessModal({ visible: false, numero_factura: '', id_factura: null })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-100 text-primary-700">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900"># Registro de Check-out</h1>
            <p className="text-gray-500">Gestión de salidas y liquidación de huéspedes hospedados</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchEstadasActivas}
          disabled={loading}
          className="btn btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar lista</span>
        </button>
      </div>

      {/* SECCIÓN 1: HUÉSPEDES ACTIVOS (POR DEFECTO) Y BUSCADOR */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Barra superior de búsqueda y conteo */}
        <div className="p-4 border-b bg-gray-50/75 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Huéspedes Hospedados Actualmente</h2>
            <span className="text-xs bg-primary-100 text-primary-800 font-semibold px-2.5 py-0.5 rounded-full">
              {filteredEstadias.length} {filteredEstadias.length === 1 ? 'activo' : 'activos'}
            </span>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, documento o habitación..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Contenido de huéspedes activos */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : estadasActivas.length === 0 ? (
            /* Mensaje amigable cuando no hay huéspedes activos */
            <div className="py-12 px-4 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BedDouble className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">No hay huéspedes hospedados actualmente</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                En este momento no hay estadías con estado activo en el hotel. Todas las habitaciones se encuentran desocupadas o pendientes de registro.
              </p>
            </div>
          ) : filteredEstadias.length === 0 ? (
            /* Mensaje cuando no hay resultados de búsqueda */
            <div className="py-10 px-4 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
              <Search className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <h3 className="text-sm font-semibold text-gray-800">No se encontraron huéspedes coincidentes</h3>
              <p className="text-xs text-gray-500 mt-1">
                No hay ninguna estadía activa que coincida con &ldquo;<span className="font-medium text-gray-700">{searchTerm}</span>&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-3 text-xs font-semibold text-primary-600 hover:underline"
              >
                Limpiar filtro de búsqueda
              </button>
            </div>
          ) : (
            /* Cuadrícula de tarjetas de huéspedes activos */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEstadias.map((estadia) => {
                const estadiaId = estadia.id_estadia || estadia.id
                const isSelected = (selectedEstadia?.id_estadia || selectedEstadia?.id) === estadiaId
                const nombreCompleto = `${estadia.nombres || ''} ${estadia.apellidos || ''}`.trim() || 'Huésped sin nombre'
                const fechaCheckin = estadia.fecha_checkin || estadia.check_in
                const fechaCheckoutPrevista = estadia.fecha_checkout_prevista || estadia.check_out

                return (
                  <div
                    key={estadiaId}
                    onClick={() => selectEstadia(estadia)}
                    className={`group relative rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-500 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-primary-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Cabecera de la tarjeta: Huésped + Habitación */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            isSelected ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'
                          }`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                              {nombreCompleto}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>Doc: {estadia.numero_documento || estadia.documento || '-'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-primary-100 text-primary-800">
                            Hab. {estadia.numero_habitacion || estadia.habitacion?.numero || '-'}
                          </span>
                          {estadia.tipo_habitacion && (
                            <p className="text-[11px] text-gray-500 mt-0.5">{estadia.tipo_habitacion}</p>
                          )}
                        </div>
                      </div>

                      {/* Detalles de la estadía */}
                      <div className="space-y-1.5 py-2 border-t border-b border-gray-100 text-xs">
                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>Entrada:</span>
                          </span>
                          <span className="font-medium text-gray-800">{formatFechaHora(fechaCheckin)}</span>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>Días hospedado:</span>
                          </span>
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {calcularDiasHospedado(fechaCheckin)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>Salida prevista:</span>
                          </span>
                          <span className="font-medium text-gray-800">{formatFechaHora(fechaCheckoutPrevista)}</span>
                        </div>

                        {estadia.telefono && (
                          <div className="flex items-center justify-between text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>Teléfono:</span>
                            </span>
                            <span className="font-medium text-gray-800">{estadia.telefono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón de selección */}
                    <div className="mt-3 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          selectEstadia(estadia)
                        }}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-primary-600 hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Huésped Seleccionado</span>
                          </>
                        ) : (
                          <>
                            <span>Seleccionar para Check-out</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 2: FORMULARIO DE CHECK-OUT Y LIQUIDACIÓN */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Banner de Huésped Seleccionado */}
        {selectedEstadia ? (
          <div className="p-4 bg-primary-50/80 border-b border-primary-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {selectedEstadia.nombres?.[0] || 'H'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {`${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim()}
                  </span>
                  <span className="text-xs bg-primary-600 text-white font-semibold px-2 py-0.5 rounded-full">
                    Hab. {selectedEstadia.numero_habitacion || selectedEstadia.habitacion?.numero}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Doc: {selectedEstadia.numero_documento || selectedEstadia.documento || '-'} · Estadía #{selectedEstadia.id_estadia || selectedEstadia.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEstadia(null)}
              className="btn btn-secondary btn-sm text-xs self-start sm:self-auto"
            >
              Cambiar huésped / Ver todos
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border-b text-center text-sm text-gray-500 font-medium">
            Selecciona un huésped de la lista superior para liquidar su cuenta y procesar la salida.
          </div>
        )}

        {/* CONTENIDO PRINCIPAL: 2 COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4">
            {/* Información del Huésped */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Información del Huésped</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Nombre:</span>{' '}
                      <span className="text-gray-900">{`${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Documento:</span>{' '}
                      <span className="text-gray-900">{selectedEstadia.numero_documento || selectedEstadia.documento || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Contacto:</span>{' '}
                      <span className="text-gray-900">{selectedEstadia.telefono || selectedEstadia.contacto || '-'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>{' '}
                      <span className="text-gray-900">{selectedEstadia.email || '-'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-400 italic text-xs">Seleccione un huésped</span></div>
                    <div><span className="font-medium text-gray-700">Documento:</span> <span className="text-gray-400">-</span></div>
                    <div><span className="font-medium text-gray-700">Contacto:</span> <span className="text-gray-400">-</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Detalles de la Estancia */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Detalles de la Estancia</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Check-in:</span>{' '}
                      <span className="text-gray-900">{formatFechaHora(selectedEstadia.fecha_checkin || selectedEstadia.check_in)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Check-out previsto:</span>{' '}
                      <span className="text-gray-900">{formatFechaHora(selectedEstadia.fecha_checkout_prevista || selectedEstadia.check_out)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Noches a liquidar:</span>{' '}
                      <span className="text-gray-900 font-semibold">{calcularNoches()} noche(s)</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tarifa por noche:</span>{' '}
                      <span className="text-gray-900">Q{Number(getPrecioNoche()).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Check-in:</span> <span className="text-gray-400">-</span></div>
                    <div><span className="font-medium text-gray-700">Check-out previsto:</span> <span className="text-gray-400">-</span></div>
                    <div><span className="font-medium text-gray-700">Noches:</span> <span className="text-gray-400">-</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Cargos Adicionales */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Cargos Adicionales</div>
              <div className="space-y-2">
                {cargos.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">Sin cargos adicionales</div>
                ) : (
                  cargos.map((cargo) => (
                    <div key={cargo.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={cargo.descripcion || ''}
                          onChange={(e) => actualizarCargo(cargo.id, 'descripcion', e.target.value)}
                          placeholder="Descripción"
                          className="input text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={cargo.cantidad || ''}
                          min="1"
                          onChange={(e) => actualizarCargo(cargo.id, 'cantidad', e.target.value)}
                          placeholder="Cant."
                          className="input text-sm"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={cargo.precio || ''}
                          min="0"
                          step="0.01"
                          onChange={(e) => actualizarCargo(cargo.id, 'precio', e.target.value)}
                          placeholder="Precio Q"
                          className="input text-sm"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => eliminarCargo(cargo.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => agregarCargo('Minibar')}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                >
                  <Wine className="w-4 h-4" />
                  Minibar
                </button>
                <button
                  type="button"
                  onClick={() => agregarCargo('Servicio')}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                >
                  <BellRing className="w-4 h-4" />
                  Servicio
                </button>
                <button
                  type="button"
                  onClick={() => agregarCargo('Otros')}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Otro
                </button>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-4">
            {/* Información de la Habitación */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Información de la Habitación</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Número:</span>{' '}
                      <span className="text-gray-900 font-bold">{selectedEstadia.numero_habitacion || selectedEstadia.habitacion?.numero || ''}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>{' '}
                      <span className="text-gray-900">{selectedEstadia.tipo_habitacion || ''}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Piso:</span>{' '}
                      <span className="text-gray-900">{selectedEstadia.piso || '-'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Número:</span> <span className="text-gray-400">-</span></div>
                    <div><span className="font-medium text-gray-700">Tipo:</span> <span className="text-gray-400">-</span></div>
                    <div><span className="font-medium text-gray-700">Piso:</span> <span className="text-gray-400">-</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Fecha y Hora de Salida */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Fecha y Hora de Salida Efectiva</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha_salida}
                    onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formData.hora_salida}
                    onChange={(e) => setFormData({ ...formData, hora_salida: e.target.value })}
                    className="input text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Método de Pago y Facturación */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="font-semibold text-gray-900 mb-2">Pago y Facturación</div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  value={formData.metodo_pago}
                  onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                  className="input text-sm"
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Referencia de Pago (opcional)</label>
                <input
                  type="text"
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  placeholder="Ej. Ref bancaria, voucher..."
                  className="input text-sm"
                />
              </div>

              <div className="pt-2 border-t border-gray-200">
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.genera_factura}
                    onChange={(e) => setFormData({ ...formData, genera_factura: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Generar factura comercial automáticamente</span>
                </label>
              </div>
            </div>

            {/* Cálculo del Total */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cálculo del Total
              </div>
              <div className="space-y-1 text-sm text-amber-700">
                <div className="flex justify-between">
                  <span>Alojamiento ({calcularNoches()} noche(s) × Q{Number(getPrecioNoche()).toFixed(2)})</span>
                  <span>Q{calcularSubtotalAlojamiento().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cargos adicionales</span>
                  <span>Q{calcularSubtotalCargos().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto ({IMPUESTO * 100}%)</span>
                  <span>Q{impuesto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 mt-2 pt-2 border-t border-amber-200 text-base">
                  <span>Total a pagar</span>
                  <span>Q{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="space-y-3">
              <div className="flex gap-3">
                {/* Extender estadía */}
                <button
                  type="button"
                  onClick={() => setShowExtender((prev) => !prev)}
                  disabled={!selectedEstadia}
                  className="flex-1 btn btn-secondary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  Extender estadía
                </button>

                {/* Registrar Check-out */}
                <button
                  type="button"
                  onClick={registrarCheckout}
                  disabled={procesando || !selectedEstadia}
                  className="flex-1 btn btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesando ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  {procesando ? 'Procesando...' : 'Registrar Check-out'}
                </button>
              </div>

              {/* Panel extender estadía */}
              {showExtender && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <label className="block text-sm font-semibold text-blue-800">Nueva fecha de salida</label>
                  <input
                    type="date"
                    value={nuevaFechaSalida}
                    onChange={(e) => setNuevaFechaSalida(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExtender(false)
                        setNuevaFechaSalida('')
                      }}
                      className="flex-1 btn btn-secondary text-sm py-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={extenderEstadia}
                      disabled={extending || !nuevaFechaSalida}
                      className="flex-1 btn btn-primary text-sm py-2 disabled:opacity-50"
                    >
                      {extending ? 'Guardando...' : 'Confirmar extensión'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODAL DE ÉXITO CON NÚMERO DE FACTURA */}
      {successModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Check-out registrado</h2>
            <p className="text-gray-500 text-sm mb-4">
              La habitación ha sido enviada a limpieza y la tarea fue creada automáticamente.
            </p>

            {successModal.numero_factura && (
              <div className="rounded-xl bg-primary-50 border border-primary-200 px-6 py-4 mb-6">
                <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-1">Número de Factura</p>
                <p className="text-3xl font-bold text-primary-700">{successModal.numero_factura}</p>
              </div>
            )}

            <div className="flex gap-3">
              {successModal.id_factura && (
                <button
                  type="button"
                  onClick={() => {
                    descargarPDF(successModal.id_factura)
                    cerrarSuccessModal()
                  }}
                  className="flex-1 btn btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
              )}
              <button
                type="button"
                onClick={cerrarSuccessModal}
                className="flex-1 btn btn-primary text-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckOut
