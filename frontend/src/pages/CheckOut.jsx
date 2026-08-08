import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Search,
  DollarSign,
  Download,
  LogOut,
  Calendar,
  Receipt,
  Plus,
  Trash2,
  FileText,
  Wine,
  BellRing,
  User,
  BedDouble,
  Clock,
  Calculator
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']
const IMPUESTO = 0.13 // 13%

const CheckOut = () => {
  const [estadasActivas, setEstadasActivas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEstadia, setSelectedEstadia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [historialFacturas, setHistorialFacturas] = useState([])
  const [procesando, setProcesando] = useState(false)

  const [formData, setFormData] = useState({
    fecha_salida: '',
    hora_salida: '',
    metodo_pago: 'Efectivo',
    referencia: '',
    numero_factura: '',
    genera_factura: true,
    observaciones: ''
  })
  const [cargos, setCargos] = useState([])

  useEffect(() => {
    fetchEstadasActivas()
  }, [])

  const fetchEstadasActivas = async () => {
    try {
      const response = await api.get('/operaciones/checkin')
      const facturasRes = await api.get('/facturas')
      setEstadasActivas(response.data.data || response.data)
      setHistorialFacturas(facturasRes.data.data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar estadías activas')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar en tiempo real por habitación O huésped
  const filteredEstadias = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return estadasActivas
    return estadasActivas.filter((e) => {
      const habitacion = String(e.numero_habitacion || '').toLowerCase()
      const nombre = `${e.nombres || ''} ${e.apellidos || ''}`.toLowerCase()
      const documento = String(e.numero_documento || e.numero_documento || '').toLowerCase()
      const numeroEstadia = String(e.numero_estadia || e.id || '').toLowerCase()
      return (
        habitacion.includes(term) ||
        nombre.includes(term) ||
        documento.includes(term) ||
        numeroEstadia.includes(term)
      )
    })
  }, [estadasActivas, searchTerm])

  const selectEstadia = (estadia) => {
    setSelectedEstadia(estadia)
    setCargos([])
    setFormData({
      fecha_salida: estadia.fecha_checkout_prevista
        ? estadia.fecha_checkout_prevista.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      hora_salida: new Date().toTimeString().slice(0, 5),
      metodo_pago: 'Efectivo',
      referencia: '',
      numero_factura: '',
      genera_factura: true,
      observaciones: ''
    })
  }

  // Cargos adicionales
  const agregarCargo = (tipo) => {
    setCargos([
      ...cargos,
      { id: Date.now(), tipo, descripcion: '', cantidad: 1, precio: 0 }
    ])
  }

  const actualizarCargo = (id, campo, valor) => {
    setCargos(cargos.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)))
  }

  const eliminarCargo = (id) => {
    setCargos(cargos.filter((c) => c.id !== id))
  }

  // Cálculo de noches basado en fecha de salida real
  const calcularNoches = () => {
    if (!selectedEstadia?.fecha_checkin) return 1
    const checkin = new Date(selectedEstadia.fecha_checkin)
    const checkout = formData.fecha_salida
      ? new Date(`${formData.fecha_salida}T${formData.hora_salida || '12:00'}`)
      : new Date()
    const diff = Math.round((checkout - checkin) / 86400000)
    return Math.max(1, diff)
  }

  const getPrecioNoche = () =>
    selectedEstadia?.precio_noche ??
    selectedEstadia?.total_cargo ??
    selectedEstadia?.precio ??
    0

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
      const response = await api.get(`/facturas/${idFactura}/descargar`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `factura-${idFactura}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Descargando factura #${idFactura}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al descargar PDF')
    }
  }

  const registrarCheckout = async (e) => {
    e.preventDefault()
    if (!selectedEstadia) {
      toast.error('Seleccione una estadía activa')
      return
    }

    setProcesando(true)
    const idEstadia = selectedEstadia.id_estadia || selectedEstadia.id

    const cargosDetalle = cargos
      .filter((c) => c.descripcion.trim() && Number(c.precio) > 0)
      .map((c) => ({
        descripcion: c.descripcion.trim(),
        cantidad: Math.max(1, Number(c.cantidad) || 1),
        precio_unitario: Number(c.precio) || 0
      }))

    try {
      // 1. Registrar el check-out (automatiza estado a limpieza + tarea de limpieza)
      const checkoutPayload = {
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        observaciones: formData.observaciones,
        fecha_salida: formData.fecha_salida,
        hora_salida: formData.hora_salida,
        cargos_adicionales: cargosDetalle,
        genera_factura: formData.genera_factura,
        numero_factura: formData.numero_factura,
        total: Number(total.toFixed(2))
      }
      await api.put(`/operaciones/checkout/${idEstadia}`, checkoutPayload)
      toast.success('Check-out registrado. Habitación enviada a limpieza y tarea creada.')

      // 2. Generar factura si está marcado
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
        idFacturaGenerada = response.data.data?.id_factura
        toast.success(`Factura #${idFacturaGenerada} generada correctamente`)
      }

      // Reset
      setSelectedEstadia(null)
      setCargos([])
      setSearchTerm('')
      setFormData({
        fecha_salida: '',
        hora_salida: '',
        metodo_pago: 'Efectivo',
        referencia: '',
        numero_factura: '',
        genera_factura: true,
        observaciones: ''
      })
      await fetchEstadasActivas()

      if (idFacturaGenerada) {
        descargarPDF(idFacturaGenerada)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el check-out')
    } finally {
      setProcesando(false)
    }
  }

  const filteredFacturas = historialFacturas.filter(
    (factura) =>
      (factura.nombre_cliente &&
        factura.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (factura.id_factura && factura.id_factura.toString().includes(searchTerm))
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
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary-100 text-primary-700">
          <LogOut className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Salidas</h1>
          <p className="text-gray-500">Registrar check-out de huéspedes y generar facturación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estadías activas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Buscador de Estadía Activa</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Busque por habitación, huésped, documento o número de estadía
          </p>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Habitación, huésped o documento..."
              className="input pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredEstadias.map((estadia) => (
              <motion.div
                key={estadia.id_estadia || estadia.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => selectEstadia(estadia)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedEstadia?.id_estadia === estadia.id_estadia ||
                  selectedEstadia?.id === estadia.id
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-gray-400" />
                    <p className="font-medium">Habitación {estadia.numero_habitacion}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Activa
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {`${estadia.nombres || ''} ${estadia.apellidos || ''}`.trim() ||
                    'Huésped sin nombre'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Ingreso: {new Date(estadia.fecha_checkin).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Salida: {new Date(estadia.fecha_checkout_prevista).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredEstadias.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {searchTerm ? 'Sin resultados para la búsqueda' : 'No hay estadías activas'}
              </p>
            )}
          </div>
        </div>

        {/* Detalles / Formulario de check-out */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <LogOut className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Registrar Check-out</h2>
          </div>

          {selectedEstadia ? (
            <form onSubmit={registrarCheckout} className="space-y-4">
              {/* Card resumen estadía */}
              <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5 text-primary-700" />
                  <p className="font-semibold text-primary-800">
                    Habitación {selectedEstadia.numero_habitacion}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-primary-700">
                  <div>
                    <p className="font-medium">Huésped</p>
                    <p>{`${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Documento</p>
                    <p>{selectedEstadia.numero_documento || '-'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Ingreso</p>
                    <p>{new Date(selectedEstadia.fecha_checkin).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Salida prevista</p>
                    <p>{new Date(selectedEstadia.fecha_checkout_prevista).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Noches</p>
                    <p>{calcularNoches()}</p>
                  </div>
                  <div>
                    <p className="font-medium">Precio/noche</p>
                    <p>${getPrecioNoche()}</p>
                  </div>
                </div>
              </div>

              {/* Fecha/hora de salida */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    Fecha de Salida
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_salida}
                    onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary-600" />
                    Hora de Salida
                  </label>
                  <input
                    type="time"
                    value={formData.hora_salida}
                    onChange={(e) => setFormData({ ...formData, hora_salida: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Cargos adicionales */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary-600" />
                    Cargos Adicionales
                  </p>
                  <div className="flex gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => agregarCargo('Minibar')}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                    >
                      <Wine className="w-4 h-4" /> Minibar
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => agregarCargo('Servicio a habitación')}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                    >
                      <BellRing className="w-4 h-4" /> Servicio
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => agregarCargo('Otros')}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Otros
                    </motion.button>
                  </div>
                </div>

                {cargos.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2">
                    Sin cargos adicionales registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cargos.map((cargo) => (
                      <div key={cargo.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={cargo.descripcion || cargo.tipo}
                            onChange={(e) =>
                              actualizarCargo(cargo.id, 'descripcion', e.target.value)
                            }
                            placeholder={cargo.tipo}
                            className="input text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={cargo.cantidad}
                            min="1"
                            onChange={(e) =>
                              actualizarCargo(cargo.id, 'cantidad', e.target.value)
                            }
                            className="input text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={cargo.precio}
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              actualizarCargo(cargo.id, 'precio', e.target.value)
                            }
                            placeholder="0.00"
                            className="input text-sm"
                          />
                        </div>
                        <div className="col-span-2 text-right text-sm font-medium">
                          ${((Number(cargo.cantidad) || 0) * (Number(cargo.precio) || 0)).toFixed(2)}
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
                    ))}
                  </div>
                )}
              </div>

              {/* Cálculo automático del total */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-800 flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5" />
                  Cálculo del Total
                </p>
                <div className="space-y-1 text-sm text-amber-700">
                  <div className="flex justify-between">
                    <span>Alojamiento ({calcularNoches()} noche(s) × ${getPrecioNoche()})</span>
                    <span>${calcularSubtotalAlojamiento().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cargos adicionales</span>
                    <span>${calcularSubtotalCargos().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuesto ({IMPUESTO * 100}%)</span>
                    <span>${impuesto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-900 mt-2 pt-2 border-t border-amber-200 text-base">
                    <span>Total a pagar</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="label flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-primary-600" />
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
                      {metodo === 'Transferencia' && '🏦'} {metodo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Referencia (voucher/tarjeta)</label>
                <input
                  type="text"
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  className="input"
                  placeholder="Número de voucher/tarjeta"
                />
              </div>

              {/* Generar factura + número */}
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.genera_factura}
                    onChange={(e) =>
                      setFormData({ ...formData, genera_factura: e.target.checked })
                    }
                    className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <span className="font-medium flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600" />
                    ¿Generar factura?
                  </span>
                </label>
                {formData.genera_factura && (
                  <div>
                    <label className="label">Número de Factura</label>
                    <input
                      type="text"
                      value={formData.numero_factura}
                      onChange={(e) =>
                        setFormData({ ...formData, numero_factura: e.target.value })
                      }
                      className="input"
                      placeholder="N° de factura (opcional, se autogenera)"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Notas sobre la salida..."
                />
              </div>

              <button
                type="submit"
                disabled={procesando}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
              >
                <LogOut className="w-5 h-5" />
                {procesando ? 'Procesando...' : 'Registrar Check-out'}
              </button>
            </form>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <LogOut className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Seleccione una estadía activa para registrar el check-out
            </div>
          )}
        </div>
      </div>

      {/* Historial de Facturas */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Historial de Facturas</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura N°</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFacturas.map((factura) => (
                <tr key={factura.id_factura} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{factura.id_factura}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{factura.nombre_cliente}</div>
                    <div className="text-xs text-gray-500">{factura.documento_cliente}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{factura.numero_habitacion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(factura.fecha_emision).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${Number(factura.total).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => descargarPDF(factura.id_factura)}
                      className="btn btn-secondary btn-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredFacturas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron facturas.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckOut
