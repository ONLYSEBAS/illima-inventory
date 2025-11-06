"""
Script para inicializar la base de datos con todas las tablas
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def init_database():
    """Crear todas las tablas necesarias"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/illima_db')
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Tabla de usuarios
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'usuario',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de categorías
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de insumos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS supplies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category_id INTEGER REFERENCES categories(id),
                unit VARCHAR(50) NOT NULL,
                stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
                min_stock DECIMAL(10, 2) DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de productos
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category_id INTEGER REFERENCES categories(id),
                image_path VARCHAR(255),
                description TEXT,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de relación producto-insumo
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_supplies (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                supply_id INTEGER REFERENCES supplies(id),
                quantity DECIMAL(10, 2) NOT NULL,
                optional BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de ventas
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                product_id INTEGER REFERENCES products(id),
                quantity INTEGER NOT NULL DEFAULT 1,
                sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        ''')
        
        # Tabla de descartables usados
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS supplies_used (
                id SERIAL PRIMARY KEY,
                sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
                supply_id INTEGER REFERENCES supplies(id),
                quantity DECIMAL(10, 2) NOT NULL,
                used_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Tabla de historial de inventario
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory_history (
                id SERIAL PRIMARY KEY,
                supply_id INTEGER REFERENCES supplies(id),
                quantity_change DECIMAL(10, 2) NOT NULL,
                type VARCHAR(50) NOT NULL,
                description TEXT,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        print("Base de datos inicializada correctamente")
        
        # Insertar categorías
        cursor.execute('''
            INSERT INTO categories (name, description) VALUES
            ('Insumos ya preparados', 'Pasteles, brownies y postres pre-hechos'),
            ('Culinaria', 'Panes y productos de panadería'),
            ('Lácteos', 'Productos lácteos'),
            ('Dulces y snacks', 'Dulces y snacks variados'),
            ('Insumos de productos', 'Ingredientes para preparación'),
            ('Jugos', 'Frutas para jugos'),
            ('Descartables', 'Vasos, bolsas, servilletas, cucharas'),
            ('Bebidas', 'Bebidas envasadas'),
            ('Insumos otros', 'Otros insumos'),
            ('Artículos de limpieza', 'Productos de limpieza')
            ON CONFLICT (name) DO NOTHING
        ''')
        
        conn.commit()
        print("Categorías insertadas")
        
        # Insertar insumos por categoría
        supplies_data = [
            # Insumos ya preparados
            ('Torta chocolate (55% cacao)', 1, 'porciones', 0),
            ('Torta de naranja con arándanos', 1, 'porciones', 0),
            ('Torta de arándanos', 1, 'porciones', 0),
            ('Brownie chocolate blanco', 1, 'unidades', 0),
            ('Torta de zanahoria', 1, 'porciones', 0),
            ('Keke limón', 1, 'porciones', 0),
            ('Pye de manzana', 1, 'porciones', 0),
            ('Alfajores', 1, 'unidades', 0),
            ('Brownies trozo chocolate', 1, 'unidades', 0),
            ('Brownie clásico', 1, 'unidades', 0),
            
            # Culinaria
            ('Croissants', 2, 'unidades', 0),
            ('Rejilla de cacao y almendras', 2, 'unidades', 0),
            ('Donuts natural', 2, 'unidades', 0),
            ('Ciabatta', 2, 'unidades', 0),
            ('Panini', 2, 'unidades', 0),
            
            # Lácteos
            ('Leche entera', 3, 'cajas', 0),
            ('Leche sin lactosa', 3, 'cajas', 0),
            ('Leche Triple Zero', 3, 'cajas', 0),
            
            # Dulces y snacks
            ('Chocolates Ibérica', 4, 'unidades', 0),
            ('Chocolates Sublime', 4, 'unidades', 0),
            ('Chocolate Sneakers', 4, 'unidades', 0),
            ('Chicle Trident', 4, 'unidades', 0),
            ('Halls negro', 4, 'unidades', 0),
            ('Halls barra verde', 4, 'unidades', 0),
            ('Cabanossi', 4, 'unidades', 0),
            
            # Insumos de productos
            ('Paltas', 5, 'porciones', 0),
            ('Pollos', 5, 'porciones', 0),
            ('Chicharron', 5, 'porciones', 0),
            ('Splenda', 5, 'unidades', 0),
            ('Jamón pizzero', 5, 'unidades', 0),
            ('Jamón inglés', 5, 'unidades', 0),
            ('Jamón crocante', 5, 'unidades', 0),
            ('Prosciutto', 5, 'unidades', 0),
            ('Queso Edam', 5, 'unidades', 0),
            ('Huevos', 5, 'unidades', 0),
            
            # Jugos
            ('Arandanos', 6, 'porciones', 0),
            ('Papaya', 6, 'porciones', 0),
            ('Piña', 6, 'porciones', 0),
            ('Naranjas', 6, 'porciones', 0),
            ('Guanabanas', 6, 'porciones', 0),
            ('Fresas', 6, 'porciones', 0),
            
            # Descartables
            ('Sapitos', 7, 'unidades', 0),
            ('Vasos de cafe 8oz', 7, 'unidades', 0),
            ('Vasos de cafe 12oz', 7, 'unidades', 0),
            ('Domos 16oz', 7, 'unidades', 0),
            ('Bolsa de papel N° 10', 7, 'unidades', 0),
            ('Bolsa de papel N° 20', 7, 'unidades', 0),
            ('Servilletas', 7, 'unidades', 0),
            ('Cucharas', 7, 'unidades', 0),
            ('Removedores de papel', 7, 'unidades', 0),
            ('Cañitas', 7, 'unidades', 0),
            
            # Bebidas
            ('Agua cielo 350ml', 8, 'unidades', 0),
            ('Inca Kola 350ml', 8, 'unidades', 0),
            ('CocaCola 350ml', 8, 'unidades', 0),
            ('Mr perkins pink botella', 8, 'unidades', 0),
            ('Mr perkins pink lata', 8, 'unidades', 0),
            ('Mr perkins blossom', 8, 'unidades', 0),
            ('Mr perkins pineapple punch', 8, 'unidades', 0),
            ('Mr perkins sunset soda', 8, 'unidades', 0),
            ('Mr perkins amazónico', 8, 'unidades', 0),
            
            # Insumos otros
            ('Aceite', 9, 'ml', 0),
            ('Sal', 9, 'kg', 0),
            ('Azucar', 9, 'kg', 0),
            ('Azucar impalpable', 9, 'gr', 0),
            ('Canela', 9, 'gr', 0),
            ('Cocoa', 9, 'gr', 0),
            ('Clavo de olor', 9, 'gr', 0),
            ('Harina', 9, 'gr', 0),
            ('Bolsa de cafe', 9, 'unidades', 0),
            ('Bidones de agua', 9, 'unidades', 0),
            
            # Artículos de limpieza
            ('Poet', 10, 'ml', 0),
            ('Par de guantes', 10, 'unidades', 0),
            ('Esponjas', 10, 'unidades', 0),
            ('Secadores', 10, 'unidades', 0),
            ('Lejia', 10, 'ml', 0),
        ]
        
        for name, cat_id, unit, stock in supplies_data:
            cursor.execute('''
                INSERT INTO supplies (name, category_id, unit, stock)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            ''', (name, cat_id, unit, stock))
        
        conn.commit()
        print("Insumos insertados")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"Error inicializando BD: {e}")

if __name__ == '__main__':
    init_database()
