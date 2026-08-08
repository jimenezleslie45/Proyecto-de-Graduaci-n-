# TODO - PANTALLA 9: EJECUCIÓN DE MANTENIMIENTO

## Backend
- [x] 1. `mantenimientoController.js`: `update` acepta `materiales` y `estado_posterior`
- [x] 2. `mantenimientoController.js`: persistir materiales en `TicketMaterial` (DB) y demo
- [x] 3. `mantenimientoController.js`: cálculo de costo_real (suma subtotales) y duración/KPI
- [x] 4. `mantenimientoController.js`: automatización estado posterior (Disponible / Limpieza + auto tarea limpieza)
- [x] 5. `validator.js`: reglas `materiales` (array) y `estado_posterior` en `maintenanceRules.update`

## Frontend
- [x] 6. `EjecucionMantenimiento.jsx`: header ticket (ID, habitación, categoría, prioridad, reportado por, fecha)
- [x] 7. `EjecucionMantenimiento.jsx`: timer digital grande HH:MM:SS con colores verde/amarillo/rojo
- [x] 8. `EjecucionMantenimiento.jsx`: botones INICIAR / PAUSAR / FINALIZAR
- [x] 9. `EjecucionMantenimiento.jsx`: tabla dinámica de materiales + botón "Agregar material" + total auto
- [x] 10. `EjecucionMantenimiento.jsx`: campo observaciones técnicas (textarea)
- [x] 11. `EjecucionMantenimiento.jsx`: selector estado posterior (Disponible / Limpieza)
- [x] 12. `EjecucionMantenimiento.jsx`: botón "Guardar Reparación"
- [x] 13. `EjecucionMantenimiento.jsx`: cálculo de duración y KPI mostrado
