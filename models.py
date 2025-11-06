import psycopg2
from datetime import datetime
import os

class Database:
    def __init__(self):
        self.connection = None
    
    def connect(self):
        """Conectar a la base de datos PostgreSQL"""
        try:
            db_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/illima_db')
            self.connection = psycopg2.connect(db_url)
            return self.connection
        except psycopg2.Error as e:
            print(f"Error conectando a BD: {e}")
            return None
    
    def close(self):
        """Cerrar conexión"""
        if self.connection:
            self.connection.close()
    
    def execute_query(self, query, params=None, fetch=False):
        """Ejecutar query"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch:
                result = cursor.fetchall()
                cursor.close()
                return result
            else:
                self.connection.commit()
                cursor.close()
                return True
        except psycopg2.Error as e:
            self.connection.rollback()
            print(f"Error en query: {e}")
            return None

# Inicializar BD
db = Database()
