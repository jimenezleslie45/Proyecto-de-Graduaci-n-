import { useState, useEffect } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Shield } from 'lucide-react'

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [roles, setRoles] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    id_empleado: '',
    id_rol: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usuariosRes, rolesRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/usuarios/roles')
      ])
      setUsuarios(usuariosRes.data.data?.users || [])
      setRoles(rolesRes.data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.put(`/usuarios/${editingUser.id}`, formData)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/usuarios', formData)
        toast.success('Usuario creado')
      }
      setShowModal(false)
      fetchData()
      resetForm()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return
    try {
      await api.delete(`/usuarios/${id}`)
      toast.success('Usuario eliminado')
      fetchData()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      id_empleado: '',
      id_rol: ''
    })
    setEditingUser(null)
  }

  const openEdit = (usuario) => {
    setEditingUser(usuario)
    setFormData({
      username: usuario.username,
      password: '',
      id_empleado: usuario.id_empleado,
      id_rol: usuario.id_rol
    })
    setShowModal(true)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500">Gestión de usuarios y roles</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Último ingreso</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{usuario.username}</td>
                  <td className="px-4 py-3">{usuario.nombre_empleado}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-primary-600" />
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {usuario.ultimo_login ? new Date(usuario.ultimo_login).toLocaleString() : 'Nunca'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      usuario.bloqueado ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {usuario.bloqueado ? 'Bloqueado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(usuario)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 && (
            <p className="text-center py-8 text-gray-500">No hay usuarios registrados</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Usuario</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">
                  Contraseña {editingUser && '(dejar vacío para mantener)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  value={formData.id_rol}
                  onChange={(e) => setFormData({ ...formData, id_rol: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Usuarios
