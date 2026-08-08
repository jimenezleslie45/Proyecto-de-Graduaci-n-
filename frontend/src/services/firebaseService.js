// Firebase está deshabilitado para que el Login use únicamente el backend.
// Se deja este módulo para mantener compatibilidad con imports existentes.

export class ServicioFirebase {
  static async iniciarSesion() {
    throw new Error('Firebase deshabilitado')
  }

  static async cerrarSesion() {
    return
  }

  static observarEstadoAutenticacion() {
    return () => {}
  }

  static estaConfigurado() {
    return false
  }
}


