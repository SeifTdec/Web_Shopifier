CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    vendor_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('electronics', 'clothing', 'books', 'home', 'sports')),
    price REAL NOT NULL CHECK(price >= 0),
    rating REAL DEFAULT 4.0 CHECK(rating >= 0 AND rating <= 5),
    description TEXT NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT,
    payment_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    price REAL NOT NULL CHECK(price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Insert sample users
INSERT OR IGNORE INTO users (id, name, email, password) VALUES
(1, 'John Doe', 'john@example.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');

-- Insert three vendor records
INSERT OR IGNORE INTO vendors (id, business_name, email, password, phone, address) VALUES
(1, 'T-Electronics', 'electronics@tvendor.com', '147258369@#W', '555-0100', '123 Tech Street'),
(2, 'T-Clothes', 'clothes@tvendor.com', '147258369@#W', '555-0200', '456 Fashion Ave'),
(3, 'T-Mart', 'mart@tvendor.com', '147258369@#W', '555-0300', '789 Market Blvd');

-- Insert products attributed to specific vendors
-- Electronics products for T-Electronics (vendor_id = 1)
INSERT OR IGNORE INTO products (vendor_id, vendor_name, title, category, price, rating, description, stock_quantity, image_url) VALUES
(1, 'T-Electronics', 'Wireless Bluetooth Headphones', 'electronics', 79.99, 4.5, 'High-quality wireless headphones with noise cancellation and 30-hour battery life.', 45, 'https://i5.walmartimages.com/seo/VILINICE-Noise-Cancelling-Headphones-Wireless-Bluetooth-Over-Ear-Headphones-with-Microphone-Black-Q8_b994b99c-835f-42fc-8094-9f6be0f9273b.be59955399cdbd1c25011d4a4251ba9b.jpeg'),
(1, 'T-Electronics', 'Smart Watch Pro', 'electronics', 299.99, 4.8, 'Advanced fitness tracking, heart rate monitor, and smartphone notifications.', 30, 'https://istarmax.com/wp-content/uploads/2024/01/gts7-pro-smart-watch-view-6-en-jpg.webp'),
(1, 'T-Electronics', '4K Webcam', 'electronics', 149.99, 4.4, 'Ultra HD webcam with auto-focus and built-in microphone.', 20, 'https://m.media-amazon.com/images/I/61bCeQBjUwL._AC_SL1500_.jpg');

-- Clothing products for T-Clothes (vendor_id = 2)
INSERT OR IGNORE INTO products (vendor_id, vendor_name, title, category, price, rating, description, stock_quantity, image_url) VALUES
(2, 'T-Clothes', 'Premium Cotton T-Shirt', 'clothing', 24.99, 4.3, 'Comfortable, breathable cotton t-shirt available in multiple colors.', 120, 'https://cdn11.bigcommerce.com/s-sqq00r7/images/stencil/1280x1280/products/11853/4143/7682_source_1489853294__16055.1760460857.jpg?c=2'),
(2, 'T-Clothes', 'Designer Jeans', 'clothing', 89.99, 4.2, 'Stylish and comfortable denim jeans with a modern fit.', 55, 'https://rddesignerwear.com/cdn/shop/files/465_bcb8b2b8-8719-4600-955e-cde4e55bfbb9.jpg?v=1763653950'),
(2, 'T-Clothes', 'Winter Jacket', 'clothing', 159.99, 4.5, 'Warm, waterproof jacket perfect for cold weather.', 40, 'https://m.media-amazon.com/images/I/71Dfk6NTq7L._AC_SL1500_.jpg');

-- Books, Home, and Sports products for T-Mart (vendor_id = 3)
INSERT OR IGNORE INTO products (vendor_id, vendor_name, title, category, price, rating, description, stock_quantity, image_url) VALUES
(3, 'T-Mart', 'The Great Mann', 'books', 14.99, 4.7, 'A captivating story that will keep you reading until the end.', 8, 'https://images.penguinrandomhouse.com/cover/9780593800867'),
(3, 'T-Mart', 'Cookbook Collection', 'books', 29.99, 4.5, 'Over 200 delicious recipes from around the world.', 18, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQDLM2C_liz5UYzrpu_-IcpDLsgSn_oF11Yow&s'),
(3, 'T-Mart', 'Mystery Thriller Book', 'books', 12.99, 4.3, 'A gripping mystery that will keep you guessing.', 15, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTppmlJCAIpQlyNO__0qckkzZcP7SVedH74VQ&s'),
(3, 'T-Mart', 'Stainless Steel Cookware Set', 'home', 129.99, 4.6, 'Professional-grade 10-piece cookware set for all your cooking needs.', 25, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm4domLFBE6SjQEsvPDhq62ZSpJB_slNpXZA&s'),
(3, 'T-Mart', 'Coffee Maker Deluxe', 'home', 79.99, 4.7, 'Programmable coffee maker with thermal carafe and auto-brew.', 32, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdJzcUjqHsjnK9-g1deAeBV1FCvzLD-0YEtQ&s'),
(3, 'T-Mart', 'Blender Pro 3000', 'home', 99.99, 4.8, 'Powerful blender for smoothies, soups, and more.', 28, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_nMzJ52mZMS9GgWc3hb0SIHCnQXVN9Xa7yw&s'),
(3, 'T-Mart', 'Yoga Mat Premium', 'sports', 34.99, 4.4, 'Non-slip, eco-friendly yoga mat with carrying strap.', 3, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtlx6JeE7oi-SVA4tDgv8XMAwWNacvQkk09g&s'),
(3, 'T-Mart', 'Running Shoes', 'sports', 119.99, 4.6, 'Lightweight, cushioned running shoes for maximum comfort.', 67, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLB446Y1kg-qWoxATC0S5oxHId6hX3POmKJw&s'),
(3, 'T-Mart', 'Tennis Racket', 'sports', 89.99, 4.5, 'Professional-grade tennis racket with graphite frame.', 22, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6cmu3NS7k_dm0SG18I9StYcI1wvdVbY5_0A&s');

CREATE VIEW IF NOT EXISTS product_details AS
SELECT 
    p.id,
    p.title,
    p.category,
    p.price,
    p.rating,
    p.description,
    p.stock_quantity,
    p.vendor_name,
    v.business_name as vendor_business
FROM products p
JOIN vendors v ON p.vendor_id = v.id;