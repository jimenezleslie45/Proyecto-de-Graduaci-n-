import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  X
} from 'lucide-react'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']
const IMPUESTO = 0.13

const CheckOut = () => {
  const [estadasActivas, setEstadasActivas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEstadia, setSelectedEstadia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [extending, setExtending] = useState(false)
  const [showExtender, setShowExtender] = useState(false)
  const [nuevaFechaSalida, setNuevaFechaSalida] = useState('')
  const [successModal, setSuccessModal] = useState({ visible: false, numero_factura: '', id_factura: null })
  const searchRef = useRef(null)

  const [formData, setFormData] = useState({
    fecha_salida: '',
    hora_salida: '',
    metodo_pago: '',
    referencia: '',
    genera_factura: true,
    observaciones: ''
  })

  const [cargos, setCargos] = useState([])

  const fetchEstadasActivas = useCallback(async () => {
    try {
      const response = await api.get('/operaciones/checkin')
      setEstadasActivas(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error al cargar estadías activas:', error)
      setEstadasActivas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEstadasActivas()
  }, [fetchEstadasActivas])

  // Cerrar dropdown al hacer clic fuera del buscador
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredEstadias = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return estadasActivas

    return estadasActivas.filter((e) => {
      const habitacion = String(e.numero_habitacion || '').toLowerCase()
      const nombre = `${e.nombres || ''} ${e.apellidos || ''}`.toLowerCase()
      const documento = String(e.numero_documento || '').toLowerCase()
      const numeroEstadia = String(e.numero_estadia || e.id || '').toLowerCase()
      return habitacion.includes(term) || nombre.includes(term) || documento.includes(term) || numeroEstadia.includes(term)
    })
  }, [estadasActivas, searchTerm])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setShowDropdown(true)
    if (!e.target.value.trim()) {
      setSelectedEstadia(null)
      setShowDropdown(false)
    }
  }

  const selectEstadia = (estadia) => {
    setSelectedEstadia(estadia)
    setSearchTerm(`${estadia.nombres || ''} ${estadia.apellidos || ''} — Hab. ${estadia.numero_habitacion || ''}`.trim())
    setShowDropdown(false)
    setCargos([])
    setFormData({
      fecha_salida: '',
      hora_salida: '',
      metodo_pago: '',
      referencia: '',
      genera_factura: true,
      observaciones: ''
    })
  }

  const agregarCargo = (tipo) => {
    setCargos((prev) => [...prev, { id: Date.now(), tipo, descripcion: '', cantidad: '', precio: '' }])
  }

  const actualizarCargo = (id, campo, valor) => {
    setCargos((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)))
  }

  const eliminarCargo = (id) => {
    setCargos((prev) => prev.filter((c) => c.id !== id))
  }

  const calcularNoches = () => {
    if (!selectedEstadia?.fecha_checkin) return 1
    const checkin = new Date(selectedEstadia.fecha_checkin)
    const checkout = formData.fecha_salida
      ? new Date(`${formData.fecha_salida}T${formData.hora_salida || '12:00'}`)
      : new Date(selectedEstadia.fecha_checkout_prevista || selectedEstadia.fecha_checkin)
    const diff = Math.round((checkout.getTime() - checkin.getTime()) / 86400000)
    return Math.max(1, diff)
  }

  const getPrecioNoche = () => selectedEstadia?.precio_noche ?? selectedEstadia?.precio ?? 0

  const calcularSubtotalAlojamiento = () => {
    if (!selectedEstadia) return 0
    return calcularNoches() * getPrecioNoche()
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

      // 2. Generar factura si aplica — el backend genera y devuelve el número correlativo
      let numeroFacturaGenerada = null
      let idFacturaGenerada = null

      if (formData.genera_factura) {
        const facturaPayload = {
          id_habitacion: selectedEstadia.id_habitacion,
          nombre_cliente: `${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim(),
          documento_cliente: selectedEstadia.numero_documento,
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

      // 3. Limpiar formulario
      setSelectedEstadia(null)
      setCargos([])
      setSearchTerm('')
      setShowExtender(false)
      setFormData({
        fecha_salida: '',
        hora_salida: '',
        metodo_pago: '',
        referencia: '',
        genera_factura: true,
        observaciones: ''
      })

      await fetchEstadasActivas()

      // 4. Mostrar modal de éxito con el número de factura
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary-100 text-primary-700">
          <LogOut className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900"># Registro de Check-out</h1>
          <p className="text-gray-500">Búsqueda de huésped o habitación activa</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* BUSCADOR CON DROPDOWN */}
        <div className="relative" ref={searchRef}>
          <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm.trim()) setShowDropdown(true)
              }}
              placeholder="Buscar por nombre, documento o habitación..."
              className="w-full border-0 bg-transparent outline-none placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedEstadia(null)
                  setShowDropdown(false)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* DROPDOWN DE RESULTADOS */}
          {showDropdown && searchTerm.trim() && (
            <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 border-t-0 rounded-b-xl shadow-lg max-h-64 overflow-y-auto">
              {filteredEstadias.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  <Search className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                  No se encontraron resultados para &ldquo;<span className="font-medium text-gray-700">{searchTerm}</span>&rdquo;
                </div>
              ) : (
                filteredEstadias.map((estadia) => {
                  const estadiaId = estadia.id_estadia || estadia.id
                  return (
                    <button
                      key={estadiaId}
                      type="button"
                      onMouseDown={() => selectEstadia(estadia)}
                      className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {`${estadia.nombres || ''} ${estadia.apellidos || ''}`.trim()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Doc: {estadia.numero_documento || '-'} · Hab. {estadia.numero_habitacion || '-'}
                          </p>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-2 shrink-0">
                          {estadia.estado || 'Activa'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Check-in: {estadia.fecha_checkin ? new Date(estadia.fecha_checkin).toLocaleDateString() : '-'}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-4">
            {/* Información del Huésped */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Información del Huésped</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-900">{`${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim()}</span></div>
                    <div><span className="font-medium text-gray-700">Documento:</span> <span className="text-gray-900">{selectedEstadia.numero_documento || ''}</span></div>
                    <div><span className="font-medium text-gray-700">Contacto:</span> <span className="text-gray-900">{selectedEstadia.telefono || selectedEstadia.contacto || ''}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-400 italic text-xs">Seleccione una estadía</span></div>
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
                    <div><span className="font-medium text-gray-700">Check-in:</span> <span className="text-gray-900">{selectedEstadia.fecha_checkin ? new Date(selectedEstadia.fecha_checkin).toLocaleDateString() : ''}</span></div>
                    <div><span className="font-medium text-gray-700">Check-out previsto:</span> <span className="text-gray-900">{selectedEstadia.fecha_checkout_prevista ? new Date(selectedEstadia.fecha_checkout_prevista).toLocaleDateString() : ''}</span></div>
                    <div><span className="font-medium text-gray-700">Noches:</span> <span className="text-gray-900">{calcularNoches()}</span></div>
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
                      <div className="col-span-4">
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
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={cargo.precio || ''}
                          min="0"
                          step="0.01"
                          onChange={(e) => actualizarCargo(cargo.id, 'precio', e.target.value)}
                          placeholder="Precio"
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
                    <div><span className="font-medium text-gray-700">Número:</span> <span className="text-gray-900">{selectedEstadia.numero_habitacion || ''}</span></div>
                    <div><span className="font-medium text-gray-700">Tipo:</span> <span className="text-gray-900">{selectedEstadia.tipo_habitacion || ''}</span></div>
                    <div><span className="font-medium text-gray-700">Piso:</span> <span className="text-gray-900">{selectedEstadia.piso || ''}</span></div>
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

            {/* Método de Pago */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Método de Pago</div>
              <select
                value={formData.metodo_pago}
                onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                className="input"
              >
                <option value="">Seleccione</option>
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Cálculo del Total */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Cálculo del Total
              </div>
              <div className="space-y-1 text-sm text-amber-700">
                <div className="flex justify-between">
                  <span>Alojamiento ({calcularNoches()} noche(s) × Q{getPrecioNoche()})</span>
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

            {/* BOTONES LADO A LADO */}
            <div className="space-y-3">
              <div className="flex gap-3">
                {/* Extender estadía — izquierda */}
                <button
                  type="button"
                  onClick={() => setShowExtender((prev) => !prev)}
                  disabled={!selectedEstadia}
                  className="flex-1 btn btn-secondary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-4 h-4" />
                  Extender estadía
                </button>

                {/* Registrar Check-out — derecha */}
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

