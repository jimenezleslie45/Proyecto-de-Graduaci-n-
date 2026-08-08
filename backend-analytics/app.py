from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from datetime import datetime
import sys
import os

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

from src.analytics.kpi_calculator import get_all_kpis
from src.reports.report_generator import generate_report
from src.api.routes import api_bp

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def index():
    return jsonify({
        'service': 'Hotel Analytics API',
        'version': '1.0.0',
        'status': 'running'
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': str(datetime.now())
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
