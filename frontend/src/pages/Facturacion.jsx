import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Download, Search } from 'lucide-react'

const Facturacion = () => {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchFacturas = async () => {
      try {
        const response = await api.get('/facturas')
        setFacturas(response.data.data || [])
      } catch (error) {
        toast.error('Error al cargar el historial de facturas.')
        console.error('Error fetching invoices:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFacturas()
  }, [])

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
      toast.error('Error al descargar el PDF.')
      console.error('Error downloading PDF:', error)
    }
  }

  const filteredFacturas = facturas.filter((factura) => {
    const term = searchTerm.toLowerCase()
    
    const matchesNombre = factura.nombre_cliente 
      ? factura.nombre_cliente.toLowerCase().includes(term) 
      : false
      
    const matchesDocumento = factura.documento_cliente 
      ? factura.documento_cliente.toLowerCase().includes(term) 
      : false
      
    const matchesId = factura.id_factura 
      ? factura.id_factura.toString().includes(term) 
      : false

    return matchesNombre || matchesDocumento || matchesId
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Facturación</h1>
        <p className="text-gray-500">Consulta y descarga las facturas emitidas.</p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por N° de factura, cliente o documento..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura N°</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitación</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFacturas.map((factura) => (
                <tr key={factura.id_factura} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{factura.id_factura}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="font-medium text-gray-900">{factura.nombre_cliente || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{factura.documento_cliente || 'Sin Documento'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {factura.numero_habitacion || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {factura.fecha_emision ? new Date(factura.fecha_emision).toLocaleDateString() : '---'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                    ${factura.total ? Number(factura.total).toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
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
      </div>

      {filteredFacturas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron facturas.</p>
        </div>
      )}
    </div>
  )
}

export default Facturacion