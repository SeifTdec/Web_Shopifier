const API_BASE_URL = 'http://localhost:5000/api';

const store = {
    products: [],
    cart: [],
    currentCategory: 'all',
    searchQuery: '',
    sortBy: 'featured'
};

const utils = {
    formatPrice: function(price) {
        return `$${price.toFixed(2)}`;
    },
    formatRating: function(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '⭐'.repeat(fullStars);
        if (hasHalfStar) stars += '⭐';
        return `${stars} (${rating})`;
    },
    saveCart: async function() {
        try {
            await fetch(`${API_BASE_URL}/cart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ cart: store.cart })
            });
        } catch (err) {
            console.error('Error saving cart:', err);
        }
    },
    loadCart: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/cart`, {
                credentials: 'include'
            });
            const data = await response.json();
            store.cart = data.cart || [];
            cartManager.updateCartCount();
        } catch (err) {
            console.error('Error loading cart:', err);
        }
    }
};

const productManager = {
    fetchProducts: async function() {
        try {
            const params = new URLSearchParams({
                category: store.currentCategory,
                search: store.searchQuery,
                sort: store.sortBy
            });
            
            const response = await fetch(`${API_BASE_URL}/products?${params}`);
            const data = await response.json();
            store.products = data;
            this.renderProducts();
        } catch (err) {
            console.error('Error fetching products:', err);
            this.renderProducts();
        }
    },
    
    renderProducts: function() {
        var self = this;
        const grid = document.getElementById('productsGrid');
        
        if (store.products.length === 0) {
            grid.innerHTML = '<div class="no-products">No products found</div>';
            return;
        }
        
        grid.innerHTML = store.products.map(function(product) {
            const imageHtml = product.image_url 
                ? `<img src="${product.image_url}" alt="${product.title}" style="width:100%;height:250px;object-fit:cover;">` 
                : '<div class="product-image">Placeholder</div>';
            
            return `
            <div class="product-card" data-id="${product.id}">
                ${imageHtml}
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <div class="product-title">${product.title}</div>
                    <div class="product-rating">${utils.formatRating(product.rating)}</div>
                    <div class="product-price">${utils.formatPrice(product.price)}</div>
                    <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
            `;
        }).join('');
        
        this.attachProductEventListeners();
    },
    
    attachProductEventListeners: function() {
        var self = this;
        
        document.querySelectorAll('.product-card').forEach(function(card) {
            card.addEventListener('click', function(e) {
                if (!e.target.classList.contains('add-to-cart-btn')) {
                    const id = parseInt(card.dataset.id);
                    self.showProductDetail(id);
                }
            });
        });
        
        document.querySelectorAll('.add-to-cart-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                cartManager.addToCart(id);
            });
        });
    },
    
    showProductDetail: function(id) {
        const product = store.products.find(function(p) { return p.id === id; });
        if (!product) return;
        
        const imageHtml = product.image_url 
            ? `<img src="${product.image_url}" alt="${product.title}" style="width:100%;height:400px;object-fit:cover;border-radius:8px;">` 
            : '<div class="product-detail-image">Placeholder</div>';
        
        const detailContainer = document.getElementById('productDetail');
        detailContainer.innerHTML = `
            ${imageHtml}
            <div class="product-detail-info">
                <div class="product-detail-category">${product.category}</div>
                <h2>${product.title}</h2>
                <div class="product-detail-rating">${utils.formatRating(product.rating)}</div>
                <div class="product-detail-price">${utils.formatPrice(product.price)}</div>
                <div class="product-detail-description">${product.description}</div>
                <div style="color:#666;margin-bottom:1rem;">Sold by: ${product.vendor_name}</div>
                <div style="color:#666;margin-bottom:1rem;">Stock: ${product.stock_quantity} available</div>
                <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
            </div>
        `;
        
        detailContainer.querySelector('.add-to-cart-btn').addEventListener('click', function() {
            cartManager.addToCart(id);
        });
        
        modalManager.openModal('productModal');
    }
};

const cartManager = {
    addToCart: function(productId) {
        const product = store.products.find(function(p) { return p.id === productId; });
        if (!product) return;
        
        if (product.stock_quantity <= 0) {
            this.showNotification('Product is out of stock!', 'error');
            return;
        }
        
        const existingItem = store.cart.find(function(item) { return item.id === productId; });
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock_quantity) {
                this.showNotification('Cannot add more than available stock!', 'error');
                return;
            }
            existingItem.quantity++;
        } else {
            const newItem = Object.assign({}, product);
            newItem.quantity = 1;
            store.cart.push(newItem);
        }
        
        this.updateCartCount();
        utils.saveCart();
        this.showNotification('Added to cart!');
    },
    
    removeFromCart: function(productId) {
        store.cart = store.cart.filter(function(item) { return item.id !== productId; });
        this.updateCartCount();
        this.renderCart();
        utils.saveCart();
    },
    
    updateQuantity: function(productId, change) {
        const item = store.cart.find(function(item) { return item.id === productId; });
        if (!item) return;
        
        const product = store.products.find(function(p) { return p.id === productId; });
        
        if (change > 0 && product && item.quantity >= product.stock_quantity) {
            this.showNotification('Cannot exceed available stock!', 'error');
            return;
        }
        
        item.quantity += change;
        
        if (item.quantity <= 0) {
            this.removeFromCart(productId);
        } else {
            this.updateCartCount();
            this.renderCart();
            utils.saveCart();
        }
    },
    
    updateCartCount: function() {
        const count = store.cart.reduce(function(sum, item) {
            return sum + item.quantity;
        }, 0);
        document.getElementById('cartCount').textContent = count;
    },
    
    renderCart: function() {
        var self = this;
        const cartItemsContainer = document.getElementById('cartItems');
        const cartSummaryContainer = document.getElementById('cartSummary');
        
        if (store.cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
            cartSummaryContainer.innerHTML = '';
            return;
        }
        
        cartItemsContainer.innerHTML = store.cart.map(function(item) {
            const imageHtml = item.image_url 
                ? `<img src="${item.image_url}" alt="${item.title}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;">` 
                : '<div class="cart-item-image">Item</div>';
            
            return `
            <div class="cart-item">
                ${imageHtml}
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.title}</div>
                    <div class="cart-item-price">${utils.formatPrice(item.price)}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" data-id="${item.id}" data-action="decrease">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn" data-id="${item.id}" data-action="increase">+</button>
                        <button class="remove-btn" data-id="${item.id}">Remove</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        const total = store.cart.reduce(function(sum, item) {
            return sum + (item.price * item.quantity);
        }, 0);
        
        cartSummaryContainer.innerHTML = `
            <div class="cart-total">
                <span>Total:</span>
                <span>${utils.formatPrice(total)}</span>
            </div>
            <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
        `;
        
        this.attachCartEventListeners();
    },
    
    attachCartEventListeners: function() {
        var self = this;
        
        document.querySelectorAll('.quantity-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const id = parseInt(btn.dataset.id);
                const action = btn.dataset.action;
                const change = action === 'increase' ? 1 : -1;
                self.updateQuantity(id, change);
            });
        });
        
        document.querySelectorAll('.remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const id = parseInt(btn.dataset.id);
                self.removeFromCart(id);
            });
        });
        
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                self.checkout();
            });
        }
    },
    
    checkout: async function() {
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    items: store.cart,
                    shipping_address: '123 Main St',
                    payment_method: 'credit_card'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showNotification('Order placed successfully!');
                store.cart = [];
                this.updateCartCount();
                this.renderCart();
                utils.saveCart();
                
                setTimeout(function() {
                    modalManager.closeModal('cartModal');
                }, 2000);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Checkout failed', 'error');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            this.showNotification('Checkout failed. Please try again.', 'error');
        }
    },
    
    showNotification: function(message, type) {
        const existingNotif = document.querySelector('.notification');
        if (existingNotif) existingNotif.remove();
        
        const bgColor = type === 'error' ? '#f44336' : '#329d9c';
        
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        notif.style.cssText = `position:fixed;top:80px;right:20px;background:${bgColor};color:white;padding:1rem 2rem;border-radius:4px;z-index:3000;box-shadow:0 4px 8px rgba(0,0,0,0.2);`;
        document.body.appendChild(notif);
        
        setTimeout(function() {
            notif.remove();
        }, 3000);
    }
};

const modalManager = {
    openModal: function(modalId) {
        document.getElementById(modalId).classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    closeModal: function(modalId) {
        document.getElementById(modalId).classList.remove('active');
        document.body.style.overflow = 'auto';
    },
    
    init: function() {
        var self = this;
        
        document.getElementById('closeProductModal').addEventListener('click', function() {
            self.closeModal('productModal');
        });
        
        document.getElementById('closeCartModal').addEventListener('click', function() {
            self.closeModal('cartModal');
        });
        
        document.querySelectorAll('.modal').forEach(function(modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    self.closeModal(modal.id);
                }
            });
        });
    }
};

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', function() {
        store.searchQuery = searchInput.value;
        productManager.fetchProducts();
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            store.searchQuery = searchInput.value;
            productManager.fetchProducts();
        }
    });
    
    document.querySelectorAll('.category-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            store.currentCategory = btn.dataset.category;
            productManager.fetchProducts();
        });
    });
    
    document.getElementById('sortSelect').addEventListener('change', function(e) {
        store.sortBy = e.target.value;
        productManager.fetchProducts();
    });
    
    document.getElementById('cartBtn').addEventListener('click', function() {
        cartManager.renderCart();
        modalManager.openModal('cartModal');
    });
}

async function init() {
    await productManager.fetchProducts();
    await utils.loadCart();
    cartManager.updateCartCount();
    modalManager.init();
    initEventListeners();
}

init();
