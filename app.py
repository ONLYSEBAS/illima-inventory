from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import pandas as pd
from io import StringIO
import base64

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')

# Configuración de BD
def get_db():
    """Obtener conexión a la BD"""
    db_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/illima_db')
    return psycopg2.connect(db_url)

def login_required(f):
    """Decorador para rutas que requieren login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorador para rutas que requieren admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT role FROM users WHERE id = %s', (session['user_id'],))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or user['role'] != 'administrador':
            return jsonify({'error': 'Acceso denegado'}), 403
        
        return f(*args, **kwargs)
    return decorated_function

# === RUTAS DE AUTENTICACIÓN ===

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Página de login"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            return render_template('login.html', error='Usuario y contraseña requeridos')
        
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Usuario o contraseña incorrectos')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Cerrar sesión"""
    session.clear()
    return redirect(url_for('login'))

# === RUTAS PRINCIPALES ===

@app.route('/')
@login_required
def dashboard():
    """Panel principal"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Obtener todas las categorías con sus productos
    cursor.execute('''
        SELECT c.id, c.name, c.description,
               array_agg(json_build_object(
                   'id', p.id,
                   'name', p.name,
                   'image_path', p.image_path,
                   'category_id', p.category_id
               )) as products
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.active = true
        GROUP BY c.id, c.name, c.description
        ORDER BY c.id
    ''')
    
    categories = cursor.fetchall()
    
    # Obtener insumos bajos
    cursor.execute('''
        SELECT id, name, stock, min_stock, unit
        FROM supplies
        WHERE stock <= min_stock
        ORDER BY stock ASC
    ''')
    
    low_supplies = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return render_template('dashboard.html', categories=categories, low_supplies=low_supplies)

@app.route('/api/product/<int:product_id>')
@login_required
def get_product(product_id):
    """Obtener detalles de un producto y sus insumos"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute('SELECT * FROM products WHERE id = %s', (product_id,))
    product = cursor.fetchone()
    
    if not product:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Producto no encontrado'}), 404
    
    cursor.execute('''
        SELECT s.id, s.name, ps.quantity, ps.optional, s.stock
        FROM product_supplies ps
        JOIN supplies s ON ps.supply_id = s.id
        WHERE ps.product_id = %s
        ORDER BY ps.optional, s.name
    ''', (product_id,))
    
    supplies = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'product': product,
        'supplies': supplies
    })

@app.route('/api/sale', methods=['POST'])
@login_required
def register_sale():
    """Registrar una venta y descontar insumos"""
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    supplies_used = data.get('supplies_used', [])
    
    if not product_id:
        return jsonify({'error': 'Producto requerido'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener insumos del producto
        cursor.execute('''
            SELECT ps.supply_id, s.name, ps.quantity, s.stock, s.unit
            FROM product_supplies ps
            JOIN supplies s ON ps.supply_id = s.id
            WHERE ps.product_id = %s
        ''', (product_id,))
        
        product_supplies = cursor.fetchall()
        
        # Verificar stock disponible
        for ps in product_supplies:
            required = ps['quantity'] * quantity
            if ps['stock'] < required:
                cursor.close()
                conn.close()
                return jsonify({
                    'error': f"Stock insuficiente de {ps['name']}. Disponible: {ps['stock']} {ps['unit']}"
                }), 400
        
        # Crear venta
        cursor.execute('''
            INSERT INTO sales (user_id, product_id, quantity)
            VALUES (%s, %s, %s)
            RETURNING id
        ''', (session['user_id'], product_id, quantity))
        
        sale_id = cursor.fetchone()['id']
        
        # Descontar insumos de producto
        for ps in product_supplies:
            quantity_to_deduct = ps['quantity'] * quantity
            
            cursor.execute('''
                UPDATE supplies
                SET stock = stock - %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (quantity_to_deduct, ps['supply_id']))
            
            # Registrar en historial
            cursor.execute('''
                INSERT INTO inventory_history (supply_id, quantity_change, type, description, user_id)
                VALUES (%s, %s, 'venta', %s, %s)
            ''', (ps['supply_id'], -quantity_to_deduct, f"Venta de producto ID {product_id}", session['user_id']))
        
        # Descontar insumos adicionales (descartables)
        for supply_info in supplies_used:
            supply_id = supply_info.get('supply_id')
            qty = supply_info.get('quantity', 1)
            
            cursor.execute('''
                UPDATE supplies
                SET stock = stock - %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (qty, supply_id))
            
            cursor.execute('''
                INSERT INTO supplies_used (sale_id, supply_id, quantity)
                VALUES (%s, %s, %s)
            ''', (sale_id, supply_id, qty))
            
            cursor.execute('''
                INSERT INTO inventory_history (supply_id, quantity_change, type, description, user_id)
                VALUES (%s, %s, 'descartables', %s, %s)
            ''', (supply_id, -qty, f"Descartables para venta ID {sale_id}", session['user_id']))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'sale_id': sale_id})
    
    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': str(e)}), 500

# === RUTAS DE ADMINISTRACIÓN ===

@app.route('/admin/products', methods=['GET', 'POST'])
@admin_required
def manage_products():
    """Gestionar productos"""
    if request.method == 'POST':
        name = request.form.get('name')
        category_id = request.form.get('category_id')
        description = request.form.get('description')
        image = request.files.get('image')
        
        try:
            image_path = None
            if image and image.filename:
                filename = f"product_{datetime.now().timestamp()}_{image.filename}"
                image.save(os.path.join('static/uploads', filename))
                image_path = f"uploads/{filename}"
            
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO products (name, category_id, description, image_path)
                VALUES (%s, %s, %s, %s)
            ''', (name, category_id, description, image_path))
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute('SELECT * FROM categories ORDER BY name')
    categories = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return render_template('admin/products.html', categories=categories)

@app.route('/api/admin/product-supplies', methods=['POST'])
@admin_required
def set_product_supplies():
    """Configurar insumos para un producto"""
    data = request.get_json()
    product_id = data.get('product_id')
    supplies = data.get('supplies', [])
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Limpiar insumos anteriores
        cursor.execute('DELETE FROM product_supplies WHERE product_id = %s', (product_id,))
        
        # Insertar nuevos
        for supply in supplies:
            cursor.execute('''
                INSERT INTO product_supplies (product_id, supply_id, quantity, optional)
                VALUES (%s, %s, %s, %s)
            ''', (product_id, supply['supply_id'], supply['quantity'], supply.get('optional', False)))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/inventory')
@admin_required
def manage_inventory():
    """Gestionar inventario"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute('''
        SELECT s.id, s.name, s.stock, s.min_stock, s.unit, c.name as category
        FROM supplies s
        LEFT JOIN categories c ON s.category_id = c.id
        ORDER BY c.name, s.name
    ''')
    
    supplies = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return render_template('admin/inventory.html', supplies=supplies)

@app.route('/api/admin/supply/<int:supply_id>', methods=['PUT'])
@admin_required
def update_supply(supply_id):
    """Actualizar cantidad de insumo"""
    data = request.get_json()
    new_stock = data.get('stock')
    notes = data.get('notes', '')
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener stock anterior
        cursor.execute('SELECT stock FROM supplies WHERE id = %s', (supply_id,))
        current = cursor.fetchone()
        
        if current:
            difference = new_stock - current['stock']
            
            cursor.execute('''
                UPDATE supplies
                SET stock = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (new_stock, supply_id))
            
            # Registrar en historial
            cursor.execute('''
                INSERT INTO inventory_history (supply_id, quantity_change, type, description, user_id)
                VALUES (%s, %s, 'restock', %s, %s)
            ''', (supply_id, difference, notes or 'Actualización de inventario', session['user_id']))
            
            conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/export-csv')
@admin_required
def export_csv():
    """Exportar inventario a CSV"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT c.name as categoria, s.name as insumo, s.stock as cantidad_actual, 
                   s.unit as unidad, s.min_stock as stock_minimo
            FROM supplies s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        ''')
        
        supplies = cursor.fetchall()
        
        # Obtener ventas del día
        cursor.execute('''
            SELECT p.name as producto, COUNT(*) as cantidad_vendida, 
                   DATE(s.sale_date) as fecha
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE DATE(s.sale_date) = CURRENT_DATE
            GROUP BY p.name, DATE(s.sale_date)
            ORDER BY s.sale_date DESC
        ''')
        
        sales = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Crear DataFrames
        df_supplies = pd.DataFrame(supplies)
        df_sales = pd.DataFrame(sales)
        
        # Crear archivo Excel
        output = StringIO()
        
        # Usar BytesIO para crear archivo Excel binario
        from io import BytesIO
        excel_buffer = BytesIO()
        
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df_supplies.to_excel(writer, sheet_name='Inventario', index=False)
            df_sales.to_excel(writer, sheet_name='Ventas', index=False)
        
        excel_buffer.seek(0)
        
        from flask import send_file
        return send_file(
            excel_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'inventario_illima_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === RUTAS DE UTILIDAD ===

@app.route('/api/supplies')
@login_required
def get_supplies():
    """Obtener lista de insumos por categoría"""
    conn = get_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    cursor.execute('''
        SELECT id, name, stock, unit, category_id
        FROM supplies
        ORDER BY category_id, name
    ''')
    
    supplies = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify(supplies)

# === RUTAS DE ADMINISTRACIÓN (ENHANCED PRODUCT MANAGEMENT) ===

@app.route('/api/admin/products', methods=['GET'])
@admin_required
def list_all_products():
    """Obtener lista completa de productos con filtros"""
    category_id = request.args.get('category_id')
    search = request.args.get('search', '')
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT p.id, p.name, p.description, p.image_path, p.category_id, 
                   c.name as category_name, p.active, p.created_at,
                   COUNT(ps.supply_id) as supply_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_supplies ps ON p.id = ps.product_id
            WHERE 1=1
        '''
        params = []
        
        if category_id:
            query += ' AND p.category_id = %s'
            params.append(category_id)
        
        if search:
            query += ' AND (p.name ILIKE %s OR p.description ILIKE %s)'
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += ' GROUP BY p.id, c.name ORDER BY p.name'
        
        cursor.execute(query, params)
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/product', methods=['POST'])
@admin_required
def create_product():
    """Crear nuevo producto"""
    data = request.get_json()
    name = data.get('name')
    category_id = data.get('category_id')
    description = data.get('description', '')
    image_path = data.get('image_path')
    
    if not name or not category_id:
        return jsonify({'error': 'Nombre y categoría requeridos'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            INSERT INTO products (name, category_id, description, image_path)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, category_id, description, image_path, active, created_at
        ''', (name, category_id, description, image_path))
        
        product = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(product), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/product/<int:product_id>', methods=['GET', 'PUT', 'DELETE'])
@admin_required
def manage_single_product(product_id):
    """Obtener, actualizar o eliminar un producto"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'GET':
            cursor.execute('''
                SELECT p.id, p.name, p.description, p.image_path, p.category_id, 
                       c.name as category_name, p.active, p.created_at
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = %s
            ''', (product_id,))
            
            product = cursor.fetchone()
            if not product:
                cursor.close()
                conn.close()
                return jsonify({'error': 'Producto no encontrado'}), 404
            
            cursor.close()
            conn.close()
            return jsonify(product)
        
        elif request.method == 'PUT':
            data = request.get_json()
            name = data.get('name')
            category_id = data.get('category_id')
            description = data.get('description')
            image_path = data.get('image_path')
            active = data.get('active')
            
            cursor.execute('''
                UPDATE products
                SET name = COALESCE(%s, name),
                    category_id = COALESCE(%s, category_id),
                    description = COALESCE(%s, description),
                    image_path = COALESCE(%s, image_path),
                    active = COALESCE(%s, active)
                WHERE id = %s
                RETURNING id, name, category_id, description, image_path, active, created_at
            ''', (name, category_id, description, image_path, active, product_id))
            
            product = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify(product)
        
        elif request.method == 'DELETE':
            # Soft delete - mark as inactive
            cursor.execute('''
                UPDATE products
                SET active = false
                WHERE id = %s
            ''', (product_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': 'Producto eliminado'})
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/product/<int:product_id>/supplies', methods=['GET', 'POST'])
@admin_required
def manage_product_supplies_api(product_id):
    """Obtener o actualizar insumos de un producto (API)"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'GET':
            cursor.execute('''
                SELECT s.id, s.name, ps.quantity, ps.optional, s.unit, s.stock
                FROM product_supplies ps
                JOIN supplies s ON ps.supply_id = s.id
                WHERE ps.product_id = %s
                ORDER BY ps.optional, s.name
            ''', (product_id,))
            
            supplies = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return jsonify(supplies)
        
        elif request.method == 'POST':
            data = request.get_json()
            supplies = data.get('supplies', [])
            
            cursor.execute('DELETE FROM product_supplies WHERE product_id = %s', (product_id,))
            
            for supply in supplies:
                cursor.execute('''
                    INSERT INTO product_supplies (product_id, supply_id, quantity, optional)
                    VALUES (%s, %s, %s, %s)
                ''', (product_id, supply['supply_id'], supply['quantity'], supply.get('optional', False)))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'message': 'Insumos actualizados'})
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/products/bulk-update', methods=['PUT'])
@admin_required
def bulk_update_products():
    """Actualizar múltiples productos en masa"""
    data = request.get_json()
    product_ids = data.get('product_ids', [])
    updates = data.get('updates', {})
    
    if not product_ids or not updates:
        return jsonify({'error': 'IDs de productos y actualizaciones requeridas'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        for product_id in product_ids:
            set_clauses = []
            params = []
            
            if 'category_id' in updates:
                set_clauses.append('category_id = %s')
                params.append(updates['category_id'])
            
            if 'active' in updates:
                set_clauses.append('active = %s')
                params.append(updates['active'])
            
            if set_clauses:
                params.append(product_id)
                query = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = %s"
                cursor.execute(query, params)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'updated_count': len(product_ids)})
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

# === SISTEMA DE VENTAS CON DESCUENTOS ===

@app.route('/api/discounts', methods=['GET'])
@login_required
def get_discounts():
    """Obtener lista de descuentos disponibles"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT id, name, description, discount_type, discount_value, 
                   min_amount, active, created_at
            FROM discounts
            WHERE active = true
            ORDER BY discount_value DESC
        ''')
        
        discounts = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(discounts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/discount', methods=['POST'])
@admin_required
def create_discount():
    """Crear nuevo descuento"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    discount_type = data.get('discount_type')  # 'percentage' or 'fixed'
    discount_value = data.get('discount_value')
    min_amount = data.get('min_amount', 0)
    
    if not name or not discount_type or discount_value is None:
        return jsonify({'error': 'Datos requeridos faltantes'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            INSERT INTO discounts (name, description, discount_type, discount_value, min_amount)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, name, description, discount_type, discount_value, min_amount, active
        ''', (name, description, discount_type, discount_value, min_amount))
        
        discount = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify(discount), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/discount/<int:discount_id>', methods=['GET', 'PUT', 'DELETE'])
@admin_required
def manage_discount(discount_id):
    """Obtener, actualizar o eliminar descuento"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'GET':
            cursor.execute('SELECT * FROM discounts WHERE id = %s', (discount_id,))
            discount = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not discount:
                return jsonify({'error': 'Descuento no encontrado'}), 404
            
            return jsonify(discount)
        
        elif request.method == 'PUT':
            data = request.get_json()
            
            cursor.execute('''
                UPDATE discounts
                SET name = COALESCE(%s, name),
                    description = COALESCE(%s, description),
                    discount_type = COALESCE(%s, discount_type),
                    discount_value = COALESCE(%s, discount_value),
                    min_amount = COALESCE(%s, min_amount),
                    active = COALESCE(%s, active)
                WHERE id = %s
                RETURNING id, name, description, discount_type, discount_value, min_amount, active
            ''', (data.get('name'), data.get('description'), data.get('discount_type'),
                  data.get('discount_value'), data.get('min_amount'), data.get('active'), discount_id))
            
            discount = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify(discount)
        
        elif request.method == 'DELETE':
            cursor.execute('UPDATE discounts SET active = false WHERE id = %s', (discount_id,))
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True})
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sale-with-discount', methods=['POST'])
@login_required
def register_sale_with_discount():
    """Registrar venta con descuento aplicado"""
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    discount_id = data.get('discount_id')
    custom_discount = data.get('custom_discount')  # Descuento personalizado en pesos o %
    supplies_used = data.get('supplies_used', [])
    
    if not product_id:
        return jsonify({'error': 'Producto requerido'}), 400
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener producto
        cursor.execute('SELECT id, name FROM products WHERE id = %s', (product_id,))
        product = cursor.fetchone()
        if not product:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Producto no encontrado'}), 404
        
        # Obtener insumos del producto
        cursor.execute('''
            SELECT ps.supply_id, s.name, ps.quantity, s.stock, s.unit
            FROM product_supplies ps
            JOIN supplies s ON ps.supply_id = s.id
            WHERE ps.product_id = %s
        ''', (product_id,))
        
        product_supplies = cursor.fetchall()
        
        # Verificar stock disponible
        for ps in product_supplies:
            required = ps['quantity'] * quantity
            if ps['stock'] < required:
                cursor.close()
                conn.close()
                return jsonify({
                    'error': f"Stock insuficiente de {ps['name']}. Disponible: {ps['stock']} {ps['unit']}"
                }), 400
        
        # Obtener precio del producto (si existe)
        cursor.execute('SELECT price FROM products WHERE id = %s', (product_id,))
        price_row = cursor.fetchone()
        unit_price = price_row['price'] if price_row and price_row['price'] else 0
        
        # Calcular descuento
        discount_amount = 0
        discount_info = {'type': 'ninguno', 'value': 0}
        
        if discount_id:
            cursor.execute('SELECT discount_type, discount_value FROM discounts WHERE id = %s', (discount_id,))
            discount = cursor.fetchone()
            if discount:
                subtotal = unit_price * quantity
                if discount['discount_type'] == 'percentage':
                    discount_amount = (subtotal * discount['discount_value']) / 100
                    discount_info = {'type': 'porcentaje', 'value': discount['discount_value']}
                else:
                    discount_amount = discount['discount_value'] * quantity
                    discount_info = {'type': 'fijo', 'value': discount['discount_value']}
        elif custom_discount:
            subtotal = unit_price * quantity
            if isinstance(custom_discount, dict):
                if custom_discount.get('type') == 'percentage':
                    discount_amount = (subtotal * custom_discount.get('value', 0)) / 100
                    discount_info = custom_discount
                else:
                    discount_amount = custom_discount.get('value', 0)
                    discount_info = custom_discount
        
        total_amount = max(0, (unit_price * quantity) - discount_amount)
        
        # Crear venta
        cursor.execute('''
            INSERT INTO sales (user_id, product_id, quantity, discount_id, 
                             discount_amount, total_amount, discount_info)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (session['user_id'], product_id, quantity, discount_id, 
              discount_amount, total_amount, str(discount_info)))
        
        sale_id = cursor.fetchone()['id']
        
        # Descontar insumos
        for ps in product_supplies:
            quantity_to_deduct = ps['quantity'] * quantity
            
            cursor.execute('''
                UPDATE supplies
                SET stock = stock - %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (quantity_to_deduct, ps['supply_id']))
            
            cursor.execute('''
                INSERT INTO inventory_history (supply_id, quantity_change, type, description, user_id)
                VALUES (%s, %s, 'venta', %s, %s)
            ''', (ps['supply_id'], -quantity_to_deduct, f"Venta ID {sale_id}", session['user_id']))
        
        # Descontar insumos adicionales
        for supply_info in supplies_used:
            supply_id = supply_info.get('supply_id')
            qty = supply_info.get('quantity', 1)
            
            cursor.execute('''
                UPDATE supplies
                SET stock = stock - %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (qty, supply_id))
            
            cursor.execute('''
                INSERT INTO supplies_used (sale_id, supply_id, quantity)
                VALUES (%s, %s, %s)
            ''', (sale_id, supply_id, qty))
            
            cursor.execute('''
                INSERT INTO inventory_history (supply_id, quantity_change, type, description, user_id)
                VALUES (%s, %s, 'descartables', %s, %s)
            ''', (supply_id, -qty, f"Descartables venta ID {sale_id}", session['user_id']))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'sale_id': sale_id,
            'total_amount': total_amount,
            'discount_amount': discount_amount
        })
    
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/sales-report', methods=['GET'])
@admin_required
def get_sales_report():
    """Obtener reporte de ventas con descuentos"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT s.id, s.sale_date, p.name as product_name, s.quantity, 
                   s.total_amount, s.discount_amount, s.discount_info,
                   u.username as seller
            FROM sales s
            JOIN products p ON s.product_id = p.id
            JOIN users u ON s.user_id = u.id
            WHERE 1=1
        '''
        params = []
        
        if start_date:
            query += ' AND DATE(s.sale_date) >= %s'
            params.append(start_date)
        
        if end_date:
            query += ' AND DATE(s.sale_date) <= %s'
            params.append(end_date)
        
        query += ' ORDER BY s.sale_date DESC'
        
        cursor.execute(query, params)
        sales = cursor.fetchall()
        
        # Calcular totales
        total_sales = sum(s['total_amount'] for s in sales) if sales else 0
        total_discounts = sum(s['discount_amount'] for s in sales) if sales else 0
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'sales': sales,
            'totals': {
                'total_sales': total_sales,
                'total_discounts': total_discounts,
                'sales_count': len(sales)
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# === NUEVAS RUTAS ===

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    """Obtener lista completa de inventario"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('''
            SELECT s.id, s.name, s.stock, s.min_stock, s.unit, c.name as category
            FROM supplies s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        ''')
        
        supplies = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify(supplies)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard-stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """Obtener estadísticas del dashboard"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Total de productos activos
        cursor.execute('SELECT COUNT(*) as total FROM products WHERE active = true')
        total_products = cursor.fetchone()['total']
        
        # Total de ventas del mes
        cursor.execute('''
            SELECT COUNT(*) as total FROM sales 
            WHERE DATE_TRUNC('month', sale_date) = DATE_TRUNC('month', CURRENT_DATE)
        ''')
        total_sales = cursor.fetchone()['total']
        
        # Items con stock bajo
        cursor.execute('SELECT COUNT(*) as total FROM supplies WHERE stock <= min_stock')
        low_stock = cursor.fetchone()['total']
        
        # Ventas recientes
        cursor.execute('''
            SELECT s.id, p.name as product_name, s.quantity, s.total_amount, s.sale_date
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sale_date DESC
            LIMIT 10
        ''')
        recent_sales = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'totalProducts': total_products,
            'totalSales': total_sales,
            'lowStockItems': low_stock,
            'recentSales': recent_sales
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    """Obtener lista de categorías"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute('SELECT id, name FROM categories ORDER BY name')
        categories = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory-report', methods=['GET'])
@login_required
def get_inventory_report():
    """Obtener reporte detallado de inventario"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Inventario actual
        cursor.execute('''
            SELECT s.id, s.name, s.stock, s.min_stock, s.unit, 
                   c.name as category, s.updated_at,
                   CASE 
                     WHEN s.stock <= s.min_stock THEN 'bajo'
                     WHEN s.stock <= s.min_stock * 1.5 THEN 'medio'
                     ELSE 'bueno'
                   END as status
            FROM supplies s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY status, s.stock ASC
        ''')
        
        inventory = cursor.fetchall()
        
        # Historial de movimientos
        cursor.execute('''
            SELECT ih.id, s.name as supply_name, ih.quantity_change, ih.type, 
                   ih.description, ih.created_at, u.username
            FROM inventory_history ih
            JOIN supplies s ON ih.supply_id = s.id
            LEFT JOIN users u ON ih.user_id = u.id
            ORDER BY ih.created_at DESC
            LIMIT 50
        ''')
        
        history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'inventory': inventory,
            'history': history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory-history', methods=['GET'])
@login_required
def get_inventory_history():
    """Obtener historial de cambios de inventario"""
    supply_id = request.args.get('supply_id')
    days = request.args.get('days', 30)
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT ih.id, s.name, ih.quantity_change, ih.type, 
                   ih.description, ih.created_at, u.username
            FROM inventory_history ih
            JOIN supplies s ON ih.supply_id = s.id
            LEFT JOIN users u ON ih.user_id = u.id
            WHERE ih.created_at >= NOW() - INTERVAL '%s days'
        ''' % days
        
        params = []
        
        if supply_id:
            query += ' AND ih.supply_id = %s'
            params.append(supply_id)
        
        query += ' ORDER BY ih.created_at DESC'
        
        cursor.execute(query, params)
        history = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sales-by-product', methods=['GET'])
@login_required
def get_sales_by_product():
    """Obtener ventas agrupadas por producto"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT p.id, p.name, COUNT(s.id) as sales_count, 
                   SUM(s.quantity) as total_quantity, 
                   SUM(s.total_amount) as total_revenue,
                   SUM(s.discount_amount) as total_discount
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE 1=1
        '''
        params = []
        
        if start_date:
            query += ' AND DATE(s.sale_date) >= %s'
            params.append(start_date)
        
        if end_date:
            query += ' AND DATE(s.sale_date) <= %s'
            params.append(end_date)
        
        query += ' GROUP BY p.id, p.name ORDER BY total_revenue DESC'
        
        cursor.execute(query, params)
        sales = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(sales)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sales-by-date', methods=['GET'])
@login_required
def get_sales_by_date():
    """Obtener ventas agrupadas por fecha"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = '''
            SELECT DATE(s.sale_date) as date, COUNT(s.id) as sales_count,
                   SUM(s.total_amount) as total_revenue,
                   SUM(s.discount_amount) as total_discount
            FROM sales s
            WHERE 1=1
        '''
        params = []
        
        if start_date:
            query += ' AND DATE(s.sale_date) >= %s'
            params.append(start_date)
        
        if end_date:
            query += ' AND DATE(s.sale_date) <= %s'
            params.append(end_date)
        
        query += ' GROUP BY DATE(s.sale_date) ORDER BY date DESC'
        
        cursor.execute(query, params)
        sales = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(sales)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/inventory-forecast', methods=['GET'])
@login_required
def get_inventory_forecast():
    """Obtener predicción de stock basada en ventas"""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Calcular promedio diario de uso por insumo
        cursor.execute('''
            SELECT ps.supply_id, s.name, AVG(daily_usage) as avg_daily_usage, s.stock, s.min_stock
            FROM (
                SELECT ps.supply_id, COUNT(*) as daily_usage
                FROM product_supplies ps
                JOIN sales s ON ps.product_id = s.product_id
                WHERE s.sale_date >= NOW() - INTERVAL '30 days'
                GROUP BY ps.supply_id, DATE(s.sale_date)
            ) daily
            JOIN supplies s ON daily.supply_id = s.id
            JOIN product_supplies ps ON s.id = ps.supply_id
            GROUP BY ps.supply_id, s.name, s.stock, s.min_stock
            HAVING AVG(daily_usage) > 0
            ORDER BY (s.stock / NULLIF(AVG(daily_usage), 0)) ASC
        ''')
        
        forecast = cursor.fetchall()
        
        # Calcular días hasta agotar stock
        for item in forecast:
            if item['avg_daily_usage'] and item['avg_daily_usage'] > 0:
                days_to_empty = item['stock'] / item['avg_daily_usage']
                item['days_to_empty'] = round(days_to_empty, 1)
                item['needs_restock'] = days_to_empty <= 7
        
        cursor.close()
        conn.close()
        
        return jsonify(forecast)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-full-report', methods=['GET'])
@login_required
def generate_full_report():
    """Generar reporte completo en Excel"""
    from io import BytesIO
    from flask import send_file
    
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Inventario
        cursor.execute('''
            SELECT s.name, s.stock, s.min_stock, s.unit, c.name as category
            FROM supplies s
            LEFT JOIN categories c ON s.category_id = c.id
            ORDER BY c.name, s.name
        ''')
        inventory = cursor.fetchall()
        
        # Ventas del mes
        cursor.execute('''
            SELECT DATE(s.sale_date) as date, p.name as product, s.quantity, s.total_amount
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE DATE_TRUNC('month', s.sale_date) = DATE_TRUNC('month', CURRENT_DATE)
            ORDER BY s.sale_date DESC
        ''')
        sales = cursor.fetchall()
        
        df_inventory = pd.DataFrame(inventory)
        df_sales = pd.DataFrame(sales)
        
        excel_buffer = BytesIO()
        
        with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
            df_inventory.to_excel(writer, sheet_name='Inventario', index=False)
            df_sales.to_excel(writer, sheet_name='Ventas', index=False)
        
        excel_buffer.seek(0)
        cursor.close()
        conn.close()
        
        return send_file(
            excel_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'reporte_completo_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
