from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from src.analytics.kpi_calculator import get_all_kpis

api_bp = Blueprint('api', __name__)

@api_bp.route('/kpis')
def kpis():
    """Get KPIs dashboard data"""
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    
    if not fecha_inicio:
        fecha_inicio = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not fecha_fin:
        fecha_fin = datetime.now().strftime('%Y-%m-%d')
    
    data = get_all_kpis(fecha_inicio, fecha_fin)
    return jsonify(data)

@api_bp.route('/reportes/generar', methods=['POST'])
def generar_reporte():
    """Generate a report"""
    data = request.get_json()
    tipo = data.get('tipo')
    fecha_inicio = data.get('fecha_inicio')
    fecha_fin = data.get('fecha_fin')
    formato = data.get('formato', 'pdf')
    
    from src.reports.report_generator import generate_report
    result = generate_report(tipo, fecha_inicio, fecha_fin, formato)
    
    return jsonify(result)

@api_bp.route('/reportes/ocupacion')
def reporte_ocupacion():
    """Get occupancy report"""
    año = request.args.get('año', datetime.now().year, type=int)
    mes = request.args.get('mes', datetime.now().month, type=int)
    
    from src.reports.report_generator import generate_occupancy_report
    result = generate_occupancy_report(año, mes)
    
    return jsonify(result)
