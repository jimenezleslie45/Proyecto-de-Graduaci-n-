import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  RefreshCw,
  Download,
  Calendar,
  Clock,
  Wrench,
  Sparkles,
  BedDouble,
  TrendingUp,
  Users,
  AlertTriangle,
  DoorOpen,
  Settings,
  Save,
  FileBarChart,
  Timer,
  Zap,
  Receipt
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4']

const PERIODOS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'personalizado', label: 'Personalizado' }
]

const Reportes = () => {
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('hoy')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [historialFacturas, setHistorialFacturas] = useState([])
  const [loadingFacturas, setLoadingFacturas] = useState(false)

  // Configuración de reportes programados
  const [config, setConfig] = useState({
    frecuencia: 'diario',
    formato: 'pdf',
    destinatarios: ''
  })

  const fetchKpis = useCallback(async () => {
    try {
      const params = {}
      if (periodo === 'personalizado') {
        params.fecha_inicio = fechaInicio
        params.fecha_fin = fechaFin
      }
      const response = await api.get('/reportes/kpis', { params })
      setKpis(response.data.data || response.data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar KPIs')
    } finally {
      setLoading(false)
    }
  }, [periodo, fechaInicio, fechaFin])

  useEffect(() => {
    fetchKpis()
  }, [fetchKpis])

  // Polling cada 5 minutos para actualizar KPIs
  useEffect(() => {
    const interval = setInterval(() => {
      fetchKpis()
    }, 300000) // 5 minutos
    return () => clearInterval(interval)
  }, [fetchKpis])

  const fetchFacturas = useCallback(async () => {
    setLoadingFacturas(true)
    try {
      const response = await api.get('/facturas')
      setHistorialFacturas(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error al cargar facturas:', error)
      setHistorialFacturas([])
    } finally {
      setLoadingFacturas(false)
    }
  }, [])

  useEffect(() => {
    fetchFacturas()
  }, [fetchFacturas])

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

  const exportarReporte = async (formato) => {
    try {
      const { data } = await api.post('/reportes/exportar', {
        tipo: 'gerencial',
        formato,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      }, { responseType: 'blob' })

      const mime = formato === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
      const blob = new Blob([data], { type: mime })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = formato === 'excel' ? 'xlsx' : 'pdf'
      a.download = `dashboard_gerencial.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const msg = error?.response?.data?.message || `Error al exportar ${formato.toUpperCase()}`
      toast.error(msg)
    }
  }

  const guardarProgramacion = async () => {
    try {
      await api.post('/reportes/generar', {
        tipo: 'programado',
        frecuencia: config.frecuencia,
        formato: config.formato,
        destinatarios: config.destinatarios.split(',').map(e => e.trim()).filter(Boolean)
      })
      toast.success('Programación guardada correctamente')
    } catch (error) {
      toast.error('Error al guardar la programación')
    }
  }

  // ====== DATOS DERIVADOS ======
  const totalHabitaciones = kpis?.habitaciones_totales || 20
  const disponibles = kpis?.habitaciones_disponibles || 12
  const tasaOcupacion = kpis?.porcentaje_ocupacion ?? (kpis?.ocupacion?.tasa_ocupacion || 0)
  const tiempoLimpieza = kpis?.tiempo_promedio_limpieza ?? kpis?.limpieza?.tiempo_promedio_minutos ?? 28
  const tiempoReparacion = kpis?.tiempo_promedio_mantenimiento ?? kpis?.mantenimiento?.tiempo_promedio ?? 55

  // Ocupación últimos 7 días (bar chart)
  const ocupacion7Dias = [
    { name: 'Lun', ocupacion: 22 },
    { name: 'Mar', ocupacion: 25 },
    { name: 'Mié', ocupacion: 30 },
    { name: 'Jue', ocupacion: 28 },
    { name: 'Vie', ocupacion: 35 },
    { name: 'Sáb', ocupacion: 42 },
    { name: 'Dom', ocupacion: 38 }
  ]

  // Eficiencia por empleado (horizontal bar)
  const eficienciaEmpleados = [
    { name: 'Empleado 1', eficiencia: 92 },
    { name: 'Empleado 2', eficiencia: 88 },
    { name: 'Empleado 3', eficiencia: 84 },
    { name: 'Empleado 4', eficiencia: 79 },
    { name: 'Empleado 5', eficiencia: 75 }
  ]

  // Categorías de mantenimiento más frecuentes (pie chart)
  const categoriasMantenimiento = [
    { name: 'Eléctrica', value: 5 },
    { name: 'Plomería', value: 4 },
    { name: 'A/A', value: 3 },
    { name: 'Mobiliario', value: 3 }
  ]

  // Top empleados por productividad
  const topEmpleados = [
    { nombre: '', tareas: 20, tiempo_promedio: 26, eficiencia: 92 },
    { nombre: '', tareas: 18, tiempo_promedio: 30, eficiencia: 88 },
    { nombre: '', tareas: 15, tiempo_promedio: 33, eficiencia: 84 },
    { nombre: '', tareas: 12, tiempo_promedio: 38, eficiencia: 79 },
    { nombre: '', tareas: 10, tiempo_promedio: 41, eficiencia: 75 }
  ]

  // Alertas activas (tiempos excedidos)
  const alertasActivas = [
    { tipo: 'Limpieza', habitacion: '104', tiempo: 45, estandar: 30 },
    { tipo: 'Mantenimiento', habitacion: '203', tiempo: 95, estandar: 60 },
    { tipo: 'Limpieza', habitacion: '107', tiempo: 38, estandar: 30 }
  ]

  // Habitaciones fuera de servicio
  const fueraServicio = [
    { numero: '203', motivo: 'Mantenimiento', tiempo: '2 días' },
    { numero: '305', motivo: 'Reparación eléctrica', tiempo: '1 día' }
  ]

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
      <div className="card bg-gradient-to-r from-violet-700 via-fuchsia-700 to-pink-600 text-white shadow-xl shadow-pink-500/20">
        <div className="flex flex-col gap-4 p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
            <FileBarChart className="h-4 w-4" />
            10. Reportes Automatizados y KPIs
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Gerencial</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                KPIs en tiempo real, gráficos y reportes programados para la toma de decisiones.
                {lastUpdate && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    <Timer className="h-3 w-3" /> Actualizado: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchKpis}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-semibold transition"
              >
                <RefreshCw className="h-4 w-4" /> Actualizar
              </button>
              <button
                onClick={() => exportarReporte('pdf')}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-4 py-2 text-sm font-semibold hover:bg-violet-50 transition"
              >
                <Download className="h-4 w-4" /> Exportar PDF
              </button>
              <button
                onClick={() => exportarReporte('excel')}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold transition"
              >
                <Download className="h-4 w-4" /> Exportar Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE PERIODO */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  periodo === p.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <>
              <div>
                <label className="label">Desde</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Hasta</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Período: {PERIODOS.find(p => p.id === periodo)?.label}
          </div>
        </div>
      </div>

      {/* CONTENIDO GRID: PRINCIPAL + PANEL LATERAL */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* ===== COLUMNA PRINCIPAL ===== */}
        <div className="space-y-6">

          {/* SECCIÓN 1: KPIs EN TIEMPO REAL */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">KPIs en tiempo real</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tiempo promedio limpieza */}
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-gray-500">Tiempo prom. limpieza</p>
                  </div>
                </div>
                <p className={`mt-3 text-3xl font-bold ${tiempoLimpieza <= 30 ? 'text-green-600' : 'text-red-600'}`}>
                  {tiempoLimpieza}
                  <span className="text-base font-medium text-gray-400"> min</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">Meta: ≤30 min</p>
              </div>

              {/* Tiempo promedio reparación */}
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <p className="text-sm text-gray-500">Tiempo prom. reparación</p>
                </div>
                <p className={`mt-3 text-3xl font-bold ${tiempoReparacion <= 60 ? 'text-green-600' : 'text-red-600'}`}>
                  {tiempoReparacion}
                  <span className="text-base font-medium text-gray-400"> min</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">Meta: ≤60 min</p>
              </div>

              {/* Tasa de ocupación */}
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-gray-500">Tasa de ocupación</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-primary-600">{tasaOcupacion}%</p>
                <p className="mt-1 text-xs text-gray-500">En tiempo real</p>
              </div>

              {/* Habitaciones disponibles */}
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-violet-600" />
                  <p className="text-sm text-gray-500">Habitaciones disponibles</p>
                </div>
                <p className="mt-3 text-3xl font-bold text-violet-600">
                  {disponibles}
                  <span className="text-base font-medium text-gray-400">/{totalHabitaciones}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">Del total del hotel</p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: GRÁFICOS */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Gráficos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ocupación últimos 7 días */}
              <div className="card">
                <h3 className="text-md font-semibold mb-4">Ocupación últimos 7 días</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ocupacion7Dias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="ocupacion" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Eficiencia por empleado (horizontal bar) */}
              <div className="card">
                <h3 className="text-md font-semibold mb-4">Eficiencia por empleado</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={eficienciaEmpleados}
                    margin={{ left: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={90} />
                    <Tooltip />
                    <Bar dataKey="eficiencia" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Categorías de mantenimiento (pie chart) */}
              <div className="card lg:col-span-2">
                <h3 className="text-md font-semibold mb-4">Categorías de mantenimiento más frecuentes</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoriasMantenimiento}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#36363b"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoriasMantenimiento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: TABLAS EXPORTABLES */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Tablas exportables</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top empleados por productividad */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-md font-semibold">Top empleados por productividad</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">Empleado</th>
                        <th className="pb-2">Tareas</th>
                        <th className="pb-2">Eficiencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topEmpleados.map((e, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2 font-medium">{e.nombre}</td>
                          <td className="py-2">{e.tareas}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Zap className="h-3 w-3" />{e.eficiencia}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alertas activas */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="text-md font-semibold">Alertas activas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Hab.</th>
                        <th className="pb-2">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertasActivas.map((a, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              a.tipo === 'Limpieza' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {a.tipo === 'Limpieza' ? <Sparkles className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                              {a.tipo}
                            </span>
                          </td>
                          <td className="py-2 font-medium">{a.habitacion}</td>
                          <td className="py-2 text-red-600">
                            {a.tiempo}/{a.estandar} min
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Habitaciones fuera de servicio */}
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <DoorOpen className="h-5 w-5 text-orange-600" />
                  <h3 className="text-md font-semibold">Habitaciones fuera de servicio</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-2">Hab.</th>
                        <th className="pb-2">Motivo</th>
                        <th className="pb-2">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
{fueraServicio.map((h, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2 font-medium">{h.numero}</td>
                          <td className="py-2">{h.motivo}</td>
                          <td className="py-2 text-orange-600">{h.tiempo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: HISTORIAL DE FACTURAS */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Historial de Facturas emitidas</h2>
              <button
                onClick={fetchFacturas}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition"
              >
                <RefreshCw className="h-3 w-3" /> Actualizar
              </button>
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Factura N°</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Habitación</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {loadingFacturas ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                            Cargando facturas...
                          </div>
                        </td>
                      </tr>
                    ) : historialFacturas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center">
                          <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm text-gray-500">No hay facturas emitidas aún.</p>
                        </td>
                      </tr>
                    ) : (
                      historialFacturas.map((factura) => (
                        <tr key={factura.id_factura || factura.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-primary-700">
                            {factura.numero_factura || `FAC-${String(factura.id_factura || factura.id).padStart(4, '0')}`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{factura.nombre_cliente || factura.cliente || 'Cliente'}</div>
                            <div className="text-xs text-gray-400">{factura.documento_cliente || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{factura.numero_habitacion || factura.habitacion || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">Q{Number(factura.total || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => descargarPDF(factura.id_factura || factura.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 hover:bg-primary-100 hover:text-primary-700 px-3 py-1.5 text-xs font-medium transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

</div>

{/* ===== PANEL LATERAL: CONFIGURACIÓN REPORTES PROGRAMADOS ===== */}
        <aside className="space-y-6">
          <div className="card sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-primary-600" />
              <h3 className="text-md font-semibold">Reportes programados</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Frecuencia</label>
                <select
                  value={config.frecuencia}
                  onChange={(e) => setConfig({ ...config, frecuencia: e.target.value })}
                  className="input"
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>

              <div>
                <label className="label">Formato</label>
                <select
                  value={config.formato}
                  onChange={(e) => setConfig({ ...config, formato: e.target.value })}
                  className="input"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div>
                <label className="label">Destinatarios (emails)</label>
                <textarea
                  value={config.destinatarios}
                  onChange={(e) => setConfig({ ...config, destinatarios: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="admin@hotel.com, gerente@hotel.com"
                />
              </div>

              <button
                onClick={guardarProgramacion}
                className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" /> Guardar programación
              </button>

              <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                <Clock className="h-3 w-3 inline mr-1" />
                Los KPIs se actualizan automáticamente cada 5 minutos.
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}

export default Reportes
