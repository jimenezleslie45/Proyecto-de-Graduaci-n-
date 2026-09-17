import { useState, useEffect, useMemo } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Search,
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
import { motion } from 'framer-motion'

const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia']
const IMPUESTO = 0.13

const CheckOut = () => {
  const [estadasActivas, setEstadasActivas] = useState([])
  const [historialFacturas, setHistorialFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEstadia, setSelectedEstadia] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [extending, setExtending] = useState(false)
  const [showExtender, setShowExtender] = useState(false)
  const [nuevaFechaSalida, setNuevaFechaSalida] = useState('')

  const [formData, setFormData] = useState({
    fecha_salida: '',
    hora_salida: '',
    metodo_pago: '',
    referencia: '',
    numero_factura: '',
    genera_factura: true,
    observaciones: ''
  })

  const [cargos, setCargos] = useState([])

  useEffect(() => {
    fetchEstadasActivas()
    fetchFacturas()
  }, [])

  const fetchEstadasActivas = async () => {
    try {
      const response = await api.get('/operaciones/checkin')
      setEstadasActivas(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error:', error)
      setEstadasActivas([])
    }
  }

  const fetchFacturas = async () => {
    try {
      const response = await api.get('/facturas')
      setHistorialFacturas(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error:', error)
      setHistorialFacturas([])
    } finally {
      setLoading(false)
    }
  }

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

  const selectEstadia = (estadia) => {
    setSelectedEstadia(estadia)
    setCargos([])
    setFormData({
      fecha_salida: '',
      hora_salida: '',
      metodo_pago: '',
      referencia: '',
      numero_factura: '',
      genera_factura: true,
      observaciones: ''
    })
  }

  const agregarCargo = (tipo) => {
    setCargos([...cargos, { id: Date.now(), tipo, descripcion: '', cantidad: '', precio: '' }])
  }

  const actualizarCargo = (id, campo, valor) => {
    setCargos(cargos.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)))
  }

  const eliminarCargo = (id) => {
    setCargos(cargos.filter((c) => c.id !== id))
  }

  const calcularNoches = () => {
    if (!selectedEstadia?.fecha_checkin) return 1

    const checkin = new Date(selectedEstadia.fecha_checkin)
    const checkout = formData.fecha_salida
      ? new Date(`${formData.fecha_salida}T${formData.hora_salida || '12:00'}`)
      : new Date(selectedEstadia.fecha_checkout_prevista || selectedEstadia.fecha_checkin)

    const diff = Math.round((checkout - checkin) / 86400000)
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
      toast.success(`Descargando factura #${idFactura}`)
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

      setSelectedEstadia(null)
      setCargos([])
      setSearchTerm('')
      setFormData({
        fecha_salida: '',
        hora_salida: '',
        metodo_pago: '',
        referencia: '',
        numero_factura: '',
        genera_factura: true,
        observaciones: ''
      })

      await fetchEstadasActivas()
      await fetchFacturas()

      if (idFacturaGenerada) {
        descargarPDF(idFacturaGenerada)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar el check-out')
    } finally {
      setProcesando(false)
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
    <div className="space-y-6 animate-fade-in">
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
        <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar huésped o habitación"
            className="w-full border-0 bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Información del Huésped</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-900">{`${selectedEstadia.nombres || ''} ${selectedEstadia.apellidos || ''}`.trim() || ''}</span></div>
                    <div><span className="font-medium text-gray-700">Documento:</span> <span className="text-gray-900">{selectedEstadia.numero_documento || ''}</span></div>
                    <div><span className="font-medium text-gray-700">Contacto:</span> <span className="text-gray-900">{selectedEstadia.telefono || selectedEstadia.contacto || ''}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Documento:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Contacto:</span> <span className="text-gray-500">&nbsp;</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Detalles de la Estancia</div>
              <div className="space-y-2 text-sm">
                {selectedEstadia ? (
                  <>
                    <div><span className="font-medium text-gray-700">Check-in:</span> <span className="text-gray-900">{selectedEstadia.fecha_checkin ? new Date(selectedEstadia.fecha_checkin).toLocaleDateString() : ''}</span></div>
                    <div><span className="font-medium text-gray-700">Check-out:</span> <span className="text-gray-900">{selectedEstadia.fecha_checkout_prevista ? new Date(selectedEstadia.fecha_checkout_prevista).toLocaleDateString() : ''}</span></div>
                    <div><span className="font-medium text-gray-700">Noches:</span> <span className="text-gray-900">{calcularNoches()}</span></div>
                  </>
                ) : (
                  <>
                    <div><span className="font-medium text-gray-700">Check-in:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Check-out:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Noches:</span> <span className="text-gray-500">&nbsp;</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Cargos Adicionales</div>
              <div className="space-y-2">
                {cargos.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">Sin cargos adicionales</div>
                ) : (
                  cargos.map((cargo) => (
                    <div key={cargo.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input type="text" value={cargo.descripcion || ''} onChange={(e) => actualizarCargo(cargo.id, 'descripcion', e.target.value)} placeholder="" className="input text-sm" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" value={cargo.cantidad || ''} min="1" onChange={(e) => actualizarCargo(cargo.id, 'cantidad', e.target.value)} className="input text-sm" />
                      </div>
                      <div className="col-span-3">
                        <input type="number" value={cargo.precio || ''} min="0" step="0.01" onChange={(e) => actualizarCargo(cargo.id, 'precio', e.target.value)} placeholder="" className="input text-sm" />
                      </div>
                      <div className="col-span-1 text-right">
                        <button type="button" onClick={() => eliminarCargo(cargo.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => agregarCargo('Minibar')} className="btn btn-secondary btn-sm flex items-center gap-1"><Wine className="w-4 h-4" />Minibar</button>
                <button type="button" onClick={() => agregarCargo('Servicio')} className="btn btn-secondary btn-sm flex items-center gap-1"><BellRing className="w-4 h-4" />Servicio</button>
                <button type="button" onClick={() => agregarCargo('Otros')} className="btn btn-secondary btn-sm flex items-center gap-1"><Plus className="w-4 h-4" />Otro</button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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
                    <div><span className="font-medium text-gray-700">Número:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Tipo:</span> <span className="text-gray-500">&nbsp;</span></div>
                    <div><span className="font-medium text-gray-700">Piso:</span> <span className="text-gray-500">&nbsp;</span></div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Método de Pago</div>
              <select value={formData.metodo_pago} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })} className="input">
                <option value="">Seleccione</option>
                {METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="font-semibold text-gray-900 mb-3">Número de Factura</div>
              <input type="text" value={formData.numero_factura} onChange={(e) => setFormData({ ...formData, numero_factura: e.target.value })} placeholder="" className="input" />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="font-semibold text-amber-800 mb-2 flex items-center gap-2"><Calculator className="w-5 h-5" />Cálculo del Total</div>
              <div className="space-y-1 text-sm text-amber-700">
                <div className="flex justify-between"><span>Alojamiento ({calcularNoches()} noche(s) × Q{getPrecioNoche()})</span><span>Q{calcularSubtotalAlojamiento().toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Cargos adicionales</span><span>Q{calcularSubtotalCargos().toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Impuesto ({IMPUESTO * 100}%)</span><span>Q{impuesto.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-amber-900 mt-2 pt-2 border-t border-amber-200 text-base">
                  <span>Total a pagar</span>
                  <span>Q{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={registrarCheckout} className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
                <LogOut className="w-5 h-5" />
                Registrar Check-out
              </button>

              <button type="button" onClick={() => setShowExtender((prev) => !prev)} className="btn btn-secondary w-full flex items-center justify-center gap-2 py-3 text-base">
                <Calendar className="w-5 h-5" />
                Extender estadía
              </button>

              {showExtender && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Nueva fecha de salida</label>
                  <input
                    type="date"
                    value={nuevaFechaSalida}
                    onChange={(e) => setNuevaFechaSalida(e.target.value)}
                    className="input"
                  />
                  <button type="button" onClick={extenderEstadia} disabled={extending} className="btn btn-primary w-full">
                    {extending ? 'Extending...' : 'Confirmar extensión'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
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
                <th className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {historialFacturas.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-500" colSpan="6">No hay facturas.</td>
                </tr>
              )}
              {historialFacturas.map((factura) => (
                <tr key={factura.id_factura || factura.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{factura.id_factura || factura.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div>{factura.nombre_cliente || factura.cliente || 'Cliente'}</div>
                    <div className="text-xs text-gray-500">{factura.documento_cliente || factura.documento || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{factura.numero_habitacion || factura.habitacion || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">Q{Number(factura.total || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button type="button" onClick={() => descargarPDF(factura.id_factura || factura.id)} className="btn btn-secondary btn-sm flex items-center gap-2"><Download className="w-4 h-4" />PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default CheckOut
