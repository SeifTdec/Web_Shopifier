from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
import hashlib
from datetime import datetime
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'
CORS(app, supports_credentials=True, origins=['http://localhost:8000'])

DATABASE = 'shopifier.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema from db_schema.sql"""
    with open('db_schema.sql', 'r') as f:
        sql_script = f.read()
    
    conn = get_db()
    conn.executescript(sql_script)
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

# Authentication decorators
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def vendor_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'vendor_id' not in session:
            return jsonify({'error': 'Vendor authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Check authentication status
@app.route('/api/auth/status', methods=['GET'])
def check_auth_status():
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'type': 'user',
            'user': {
                'id': session['user_id'],
                'name': session.get('user_name', '')
            }
        }), 200
    elif 'vendor_id' in session:
        return jsonify({
            'authenticated': True,
            'type': 'vendor',
            'vendor': {
                'id': session['vendor_id'],
                'name': session.get('vendor_name', '')
            }
        }), 200
    else:
        return jsonify({'authenticated': False}), 200


@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not all([name, email, password]):
        return jsonify({'error': 'All fields are required'}), 400
    
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        conn = get_db()
        conn.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            (name, email, hashed_password)
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    
    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        (email, hashed_password)
    ).fetchone()
    conn.close()
    
    if user:
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_email'] = user['email']
        return jsonify({
            'message': 'Login successful',
            'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/vendor/register', methods=['POST'])
def register_vendor():
    data = request.json
    business_name = data.get('businessName')
    email = data.get('email')
    password = data.get('password')
    phone = data.get('phone', '')
    address = data.get('address', '')
    
    if not all([business_name, email, password]):
        return jsonify({'error': 'Business name, email, and password are required'}), 400
    
    try:
        conn = get_db()
        conn.execute(
            'INSERT INTO vendors (business_name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)',
            (business_name, email, password, phone, address)
        )
        conn.commit()
        conn.close()
        return jsonify({'message': 'Vendor registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already exists'}), 400

@app.route('/api/vendor/login', methods=['POST'])
def login_vendor():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db()
    vendor = conn.execute(
        'SELECT * FROM vendors WHERE email = ? AND password = ?',
        (email, password)
    ).fetchone()
    conn.close()
    
    if vendor:
        session['vendor_id'] = vendor['id']
        session['vendor_name'] = vendor['business_name']
        session['vendor_email'] = vendor['email']
        return jsonify({
            'message': 'Login successful',
            'vendor': {
                'id': vendor['id'],
                'business_name': vendor['business_name'],
                'email': vendor['email']
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category', 'all')
    search = request.args.get('search', '')
    sort = request.args.get('sort', 'featured')
    
    conn = get_db()
    query = 'SELECT * FROM products WHERE 1=1'
    params = []
    
    if category != 'all':
        query += ' AND category = ?'
        params.append(category)
    
    if search:
        query += ' AND (title LIKE ? OR description LIKE ?)'
        search_term = f'%{search}%'
        params.extend([search_term, search_term])
    
    if sort == 'price-low':
        query += ' ORDER BY price ASC'
    elif sort == 'price-high':
        query += ' ORDER BY price DESC'
    elif sort == 'rating':
        query += ' ORDER BY rating DESC'
    
    products = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(p) for p in products]), 200

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db()
    product = conn.execute(
        'SELECT * FROM products WHERE id = ?',
        (product_id,)
    ).fetchone()
    conn.close()
    
    if product:
        return jsonify(dict(product)), 200
    else:
        return jsonify({'error': 'Product not found'}), 404


@app.route('/api/vendor/products', methods=['GET'])
@vendor_required
def get_vendor_products():
    vendor_id = session['vendor_id']
    
    conn = get_db()
    products = conn.execute(
        'SELECT * FROM products WHERE vendor_id = ?',
        (vendor_id,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(p) for p in products]), 200

@app.route('/api/vendor/products', methods=['POST'])
@vendor_required
def add_product():
    vendor_id = session['vendor_id']
    vendor_name = session['vendor_name']
    
    data = request.json
    
    try:
        conn = get_db()
        cursor = conn.execute(
            '''INSERT INTO products 
            (vendor_id, vendor_name, title, category, price, description, stock_quantity, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (vendor_id, vendor_name, data['title'], data['category'],
             data['price'], data['description'], data['stock'], data.get('image_url', ''))
        )
        product_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Product added successfully', 'id': product_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/vendor/products/<int:product_id>', methods=['PUT'])
@vendor_required
def update_product(product_id):
    vendor_id = session['vendor_id']
    data = request.json
    
    conn = get_db()

    product = conn.execute(
        'SELECT * FROM products WHERE id = ? AND vendor_id = ?',
        (product_id, vendor_id)
    ).fetchone()
    
    if not product:
        conn.close()
        return jsonify({'error': 'Product not found or unauthorized'}), 404
    
    conn.execute(
        '''UPDATE products 
        SET title = ?, category = ?, price = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND vendor_id = ?''',
        (data['title'], data['category'], data['price'], data['description'], product_id, vendor_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Product updated successfully'}), 200

@app.route('/api/vendor/products/<int:product_id>', methods=['DELETE'])
@vendor_required
def delete_product(product_id):
    vendor_id = session['vendor_id']
    
    conn = get_db()
    result = conn.execute(
        'DELETE FROM products WHERE id = ? AND vendor_id = ?',
        (product_id, vendor_id)
    )
    conn.commit()
    
    if result.rowcount > 0:
        conn.close()
        return jsonify({'message': 'Product deleted successfully'}), 200
    else:
        conn.close()
        return jsonify({'error': 'Product not found or unauthorized'}), 404

@app.route('/api/vendor/products/<int:product_id>/stock', methods=['PUT'])
@vendor_required
def update_stock(product_id):
    vendor_id = session['vendor_id']
    data = request.json
    new_stock = data.get('stock')
    
    conn = get_db()
    result = conn.execute(
        'UPDATE products SET stock_quantity = ? WHERE id = ? AND vendor_id = ?',
        (new_stock, product_id, vendor_id)
    )
    conn.commit()
    
    if result.rowcount > 0:
        conn.close()
        return jsonify({'message': 'Stock updated successfully'}), 200
    else:
        conn.close()
        return jsonify({'error': 'Product not found or unauthorized'}), 404

# Order Routes (Auth required for users)
@app.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    user_id = session['user_id']
    data = request.json
    cart_items = data.get('items', [])
    
    if not cart_items:
        return jsonify({'error': 'Cart is empty'}), 400
    
    conn = get_db()
    
    # Calculate total
    total_amount = sum(item['price'] * item['quantity'] for item in cart_items)
    
    # Create order
    cursor = conn.execute(
        '''INSERT INTO orders 
        (user_id, total_amount, shipping_address, payment_method)
        VALUES (?, ?, ?, ?)''',
        (user_id, total_amount, data.get('shipping_address', ''),
         data.get('payment_method', 'credit_card'))
    )
    order_id = cursor.lastrowid
    
    # Create order items
    for item in cart_items:
        conn.execute(
            '''INSERT INTO order_items 
            (order_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?)''',
            (order_id, item['id'], item['quantity'], item['price'])
        )
        
        # Update product stock
        conn.execute(
            'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
            (item['quantity'], item['id'])
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Order created successfully', 'order_id': order_id}), 201

@app.route('/api/orders', methods=['GET'])
@login_required
def get_orders():
    user_id = session['user_id']
    
    conn = get_db()
    orders = conn.execute(
        '''SELECT o.*, GROUP_CONCAT(p.title) as products
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC''',
        (user_id,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(o) for o in orders]), 200

# Cart persistence (sessions)
@app.route('/api/cart', methods=['POST'])
def save_cart():
    data = request.json
    session['cart'] = data.get('cart', [])
    return jsonify({'message': 'Cart saved'}), 200

@app.route('/api/cart', methods=['GET'])
def get_cart():
    cart = session.get('cart', [])
    return jsonify({'cart': cart}), 200

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(debug=True, port=5000)