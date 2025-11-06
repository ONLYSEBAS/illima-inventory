"""
Script para crear usuario administrador inicial
"""
from werkzeug.security import generate_password_hash
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def create_admin():
    """Crear usuario admin"""
    username = input("Ingrese nombre de usuario admin: ")
    password = input("Ingrese contraseña: ")
    
    if not username or not password:
        print("Usuario y contraseña requeridos")
        return
    
    db_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/illima_db')
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        hashed_password = generate_password_hash(password)
        
        cursor.execute('''
            INSERT INTO users (username, password, role)
            VALUES (%s, %s, 'administrador')
            ON CONFLICT (username) DO NOTHING
        ''', (username, hashed_password))
        
        conn.commit()
        print(f"Usuario administrador '{username}' creado exitosamente")
        
        cursor.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    create_admin()
