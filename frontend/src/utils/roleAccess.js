const ROLE_ACCESS = {
  '/panel': ['admin', 'recepcion', 'limpieza'],
  '/habitaciones': ['admin'],
  '/reservas': ['admin', 'recepcion'],
  '/registro': ['admin', 'recepcion'],
  '/salidas': ['admin', 'recepcion'],
  '/monitor': ['admin', 'recepcion', 'limpieza'],
  '/limpieza': ['admin', 'limpieza'],
  '/limpieza/ejecutar': ['admin', 'limpieza'],
  '/mantenimiento': ['admin', 'recepcion', 'limpieza'],
  '/mantenimiento/ejecutar': ['admin', 'limpieza'],
  '/reportes': ['admin', 'recepcion'],
  '/usuarios': ['admin']
}

export const normalizeRole = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase()
  return normalizedRole === 'recepcionista' ? 'recepcion' : normalizedRole
}

export const canAccessRoute = (role, path) => {
  const allowedRoles = ROLE_ACCESS[path]
  return Boolean(allowedRoles?.includes(normalizeRole(role)))
}
