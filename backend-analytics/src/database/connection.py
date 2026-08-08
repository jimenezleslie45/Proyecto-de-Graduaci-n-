import pyodbc
from config import Config
import os

def get_connection():
    """Get database connection"""
    # FIX: Usar cadena de conexión desde variables de entorno
    # Se ajusta para usar las variables de entorno como fuente principal
    connection_string = (
        f"DRIVER={os.getenv('DB_DRIVER', '{SQL Server}')};" # Driver genérico
        f"SERVER={os.getenv('DB_SERVER', 'LAPTOP-2GA8BTIJ')};" # Servidor por defecto
        f"DATABASE={os.getenv('DB_DATABASE', 'SIGOH')};" # Base de datos por defecto
        f"Trusted_Connection={os.getenv('DB_TRUSTED_CONNECTION', 'yes')};" # Autenticación de Windows
    )
    return pyodbc.connect(connection_string)

def execute_query(query, params=None):
    """Execute a query and return results"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if cursor.description:
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
            return None
    finally:
        cursor.close()
        conn.close()

def execute_stored_procedure(procedure_name, params=None):
    """Execute a stored procedure"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        if params:
            cursor.execute(f"EXEC {procedure_name}", params)
        else:
            cursor.execute(f"EXEC {procedure_name}")
        
        if cursor.description:
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        else:
            conn.commit()
            return None
    finally:
        cursor.close()
        conn.close()
