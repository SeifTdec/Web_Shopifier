const API_BASE_URL = 'http://localhost:5000/api';

const store = {
    products: [],
    cart: [],
    currentCategory: 'all',
    searchQuery: '',
    sortBy: 'featured'
};

const utils = {
    formatPrice: (price) => `$${price.toFixed(2)}`,
    
    formatRating: (rating) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '⭐'.repeat(fullStars);
        if (hasHalfStar) stars += '⭐';
        return `${stars} (${rating})`;
    },
    
    saveCart: async () => {
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
    
    loadCart: async () => {
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
    fetchProducts: async () => {
        try {
            const params = new URLSearchParams({
                category: store.currentCategory,
                search: store.searchQuery,
                sort: store.sortBy
            });
            
            const response = await fetch(`${API_BASE_URL}/products?${params}`);
            const data = await response.json();
            store.products = data;
            productManager.renderProducts();
        } catch (err) {
            console.error('Error fetching products:', err);
            productManager.renderProducts();
        }
    },
    
    renderProducts: () => {
        const $grid = $('#productsGrid');
        
        if (store.products.length === 0) {
            $grid.html('<div class="no-products">No products found</div>');
            return;
        }
        
        const productsHtml = store.products.map(product => {
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
        
        $grid.html(productsHtml);
        productManager.attachProductEventListeners();
    },
    
    attachProductEventListeners: () => {
        $('.product-card').on('click', function(e) {
            if (!$(e.target).hasClass('add-to-cart-btn')) {
                const id = parseInt($(this).data('id'));
                productManager.showProductDetail(id);
            }
        });
        
        $('.add-to-cart-btn').on('click', function(e) {
            e.stopPropagation();
            const id = parseInt($(this).data('id'));
            cartManager.addToCart(id);
        });
    },
    
    showProductDetail: (id) => {
        const product = store.products.find(p => p.id === id);
        if (!product) return;
        
        const imageHtml = product.image_url 
            ? `<img src="${product.image_url}" alt="${product.title}" style="width:100%;height:400px;object-fit:cover;border-radius:8px;">` 
            : '<div class="product-detail-image">Placeholder</div>';
        
        const detailHtml = `
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
        
        $('#productDetail').html(detailHtml);
        
        $('#productDetail .add-to-cart-btn').on('click', function() {
            cartManager.addToCart(id);
        });
        
        modalManager.openModal('productModal');
    }
};

const cartManager = {
    addToCart: (productId) => {
        const product = store.products.find(p => p.id === productId);
        if (!product) return;
        
        if (product.stock_quantity <= 0) {
            cartManager.showNotification('Product is out of stock!', 'error');
            return;
        }
        
        const existingItem = store.cart.find(item => item.id === productId);
        
        if (existingItem) {
            if (existingItem.quantity >= product.stock_quantity) {
                cartManager.showNotification('Cannot add more than available stock!', 'error');
                return;
            }
            existingItem.quantity++;
        } else {
            const newItem = { ...product, quantity: 1 };
            store.cart.push(newItem);
        }
        
        cartManager.updateCartCount();
        utils.saveCart();
        cartManager.showNotification('Added to cart!');
    },
    
    removeFromCart: (productId) => {
        store.cart = store.cart.filter(item => item.id !== productId);
        cartManager.updateCartCount();
        cartManager.renderCart();
        utils.saveCart();
    },
    
    updateQuantity: (productId, change) => {
        const item = store.cart.find(item => item.id === productId);
        if (!item) return;
        
        const product = store.products.find(p => p.id === productId);
        
        if (change > 0 && product && item.quantity >= product.stock_quantity) {
            cartManager.showNotification('Cannot exceed available stock!', 'error');
            return;
        }
        
        item.quantity += change;
        
        if (item.quantity <= 0) {
            cartManager.removeFromCart(productId);
        } else {
            cartManager.updateCartCount();
            cartManager.renderCart();
            utils.saveCart();
        }
    },
    
    updateCartCount: () => {
        const count = store.cart.reduce((sum, item) => sum + item.quantity, 0);
        $('#cartCount').text(count);
    },
    
    renderCart: () => {
        const $cartItems = $('#cartItems');
        const $cartSummary = $('#cartSummary');
        
        if (store.cart.length === 0) {
            $cartItems.html('<div class="empty-cart">Your cart is empty</div>');
            $cartSummary.html('');
            return;
        }
        
        const itemsHtml = store.cart.map(item => {
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
        
        $cartItems.html(itemsHtml);
        
        const total = store.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const summaryHtml = `
            <div class="cart-total">
                <span>Total:</span>
                <span>${utils.formatPrice(total)}</span>
            </div>
            <button class="checkout-btn" id="checkoutBtn">Proceed to Checkout</button>
        `;
        
        $cartSummary.html(summaryHtml);
        cartManager.attachCartEventListeners();
    },
    
    attachCartEventListeners: () => {
        $('.quantity-btn').off('click').on('click', function() {
            const id = parseInt($(this).data('id'));
            const action = $(this).data('action');
            const change = action === 'increase' ? 1 : -1;
            cartManager.updateQuantity(id, change);
        });
        
        $('.remove-btn').off('click').on('click', function() {
            const id = parseInt($(this).data('id'));
            cartManager.removeFromCart(id);
        });
        
        $('#checkoutBtn').off('click').on('click', () => {
            cartManager.checkout();
        });
    },
    
    checkout: async () => {
        try {
            const authResponse = await fetch(`${API_BASE_URL}/auth/status`, {
                credentials: 'include'
            });
            const authData = await authResponse.json();
            
            if (!authData.authenticated || authData.type !== 'user') {
                if (confirm('You need to login to place an order. Would you like to login now?')) {
                    window.location.href = 'login.html';
                }
                return;
            }
            
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
                cartManager.showNotification('Order placed successfully!');
                store.cart = [];
                cartManager.updateCartCount();
                cartManager.renderCart();
                utils.saveCart();
                
                setTimeout(() => {
                    modalManager.closeModal('cartModal');
                }, 2000);
            } else {
                const error = await response.json();
                cartManager.showNotification(error.error || 'Checkout failed', 'error');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            cartManager.showNotification('Checkout failed. Please try again.', 'error');
        }
    },
    
    showNotification: (message, type) => {
        $('.notification').remove();
        
        const bgColor = type === 'error' ? '#f44336' : '#329d9c';
        
        $('<div class="notification"></div>')
            .text(message)
            .css({
                position: 'fixed',
                top: '80px',
                right: '20px',
                background: bgColor,
                color: 'white',
                padding: '1rem 2rem',
                borderRadius: '4px',
                zIndex: 3000,
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            })
            .appendTo('body')
            .delay(3000)
            .fadeOut(500, function() {
                $(this).remove();
            });
    }
};

const modalManager = {
    openModal: (modalId) => {
        $(`#${modalId}`).addClass('active');
        $('body').css('overflow', 'hidden');
    },
    
    closeModal: (modalId) => {
        $(`#${modalId}`).removeClass('active');
        $('body').css('overflow', 'auto');
    },
    
    init: () => {
        $('#closeProductModal').on('click', () => {
            modalManager.closeModal('productModal');
        });
        
        $('#closeCartModal').on('click', () => {
            modalManager.closeModal('cartModal');
        });
        
        $('.modal').on('click', function(e) {
            if ($(e.target).is('.modal')) {
                modalManager.closeModal($(this).attr('id'));
            }
        });
    }
};

function initEventListeners() {
    $('#searchBtn').on('click', () => {
        store.searchQuery = $('#searchInput').val();
        productManager.fetchProducts();
    });
    
    $('#searchInput').on('keypress', (e) => {
        if (e.key === 'Enter') {
            store.searchQuery = $('#searchInput').val();
            productManager.fetchProducts();
        }
    });
    
    $('.category-btn').on('click', function() {
        $('.category-btn').removeClass('active');
        $(this).addClass('active');
        store.currentCategory = $(this).data('category');
        productManager.fetchProducts();
    });
    
    $('#sortSelect').on('change', function() {
        store.sortBy = $(this).val();
        productManager.fetchProducts();
    });
    
    $('#cartBtn').on('click', () => {
        cartManager.renderCart();
        modalManager.openModal('cartModal');
    });
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated && data.type === 'user') {
            updateUIForLoggedInUser(data.user);
        } else if (data.authenticated && data.type === 'vendor') {
            window.location.href = 'vendor.html';
            return;
        }
    } catch (err) {
        console.error('Auth check error:', err);
    }
}

function updateUIForLoggedInUser(user) {
    const userInfoHtml = `
        <div style="color:white;margin-right:1rem;font-size:0.9rem;">
            Welcome, ${user.name}! | 
            <a href="#" id="logoutLink" style="color:#d4c5a0;text-decoration:none;">Logout</a>
        </div>
    `;
    
    $(userInfoHtml).insertBefore('#cartBtn');
    
    $('#logoutLink').on('click', async (e) => {
        e.preventDefault();
        await logout();
    });
}

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        window.location.href = 'login.html';
    } catch (err) {
        console.error('Logout error:', err);
    }
}

async function init() {
    await checkAuth();
    await productManager.fetchProducts();
    await utils.loadCart();
    cartManager.updateCartCount();
    modalManager.init();
    initEventListeners();
}

$(document).ready(init);