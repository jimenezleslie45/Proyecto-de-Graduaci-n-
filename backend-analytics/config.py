import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server Configuration
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Database Configuration (SQL Server)
    DB_SERVER = os.getenv('DB_SERVER', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 1433))
    DB_NAME = os.getenv('DB_NAME', 'HotelAutomation')
    DB_USER = os.getenv('DB_USER', 'sa')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'your_password_here')
    
    # Node.js API Configuration
    NODE_API_URL = os.getenv('NODE_API_URL', 'http://localhost:3000')
    NODE_API_KEY = os.getenv('NODE_API_KEY', 'your_node_api_key')
    
    # Report Configuration
    REPORT_OUTPUT_PATH = os.getenv('REPORT_OUTPUT_PATH', './reports')
    
    # Email Configuration (for sending reports)
    SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    EMAIL_FROM = os.getenv('EMAIL_FROM', 'noreply@hotel.com')
