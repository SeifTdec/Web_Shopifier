const API_BASE_URL = 'http://localhost:5000/api';

const currentVendor = {
    id: null,
    name: '',
    email: ''
};

const vendorStore = {
    allProducts: [],
    get products() {
        return this.allProducts;
    },
    currentView: 'products',
    searchQuery: '',
    categoryFilter: 'all'
};

const utils = {
    formatPrice: (price) => `$${parseFloat(price).toFixed(2)}`,
    
    getStockStatus: (stock) => {
        if (stock === 0) return { class: 'stock-low', text: 'Out of Stock' };
        if (stock <= 10) return { class: 'stock-low', text: `${stock} units` };
        if (stock <= 30) return { class: 'stock-medium', text: `${stock} units` };
        return { class: 'stock-high', text: `${stock} units` };
    },
    
    showNotification: (message, type = 'success') => {
        $('.notification').remove();
        
        const bgColor = type === 'success' ? '#329d9c' : '#f44336';
        
        $('<div class="notification"></div>')
            .text(message)
            .css({ background: bgColor })
            .appendTo('body')
            .fadeOut(3000, function() { $(this).remove(); });
    },
    
    updateVendorInfo: () => {
        $('.vendor-name').text(`Welcome, ${currentVendor.name}`);
    }
};

const authManager = {
    checkAuth: async () => {
        // For demo purposes, auto-login with vendor 1
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: 'electronics@tvendor.com',
                    password: '147258369@#W'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                currentVendor.id = data.vendor.id;
                currentVendor.name = data.vendor.business_name;
                currentVendor.email = data.vendor.email;
                utils.updateVendorInfo();
                return true;
            }
        } catch (err) {
            console.error('Auth error:', err);
        }
        return false;
    },
    
    logout: async () => {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Logout error:', err);
        }
    }
};

const viewManager = {
    switchView: (viewName) => {
        vendorStore.currentView = viewName;
        
        $('.view-section').removeClass('active');
        $(`#${viewName}View`).addClass('active');
        
        $('.nav-btn').removeClass('active');
        $(`.nav-btn[data-view="${viewName}"]`).addClass('active');
        
        if (viewName === 'products') {
            productManager.fetchProducts();
        } else if (viewName === 'stock') {
            stockManager.fetchProducts();
            stockManager.updateSummary();
        }
    }
};

const productManager = {
    fetchProducts: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/products`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                vendorStore.allProducts = data;
                productManager.renderProducts();
            } else {
                utils.showNotification('Failed to load products', 'error');
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            utils.showNotification('Failed to load products', 'error');
        }
    },
    
    filterProducts: () => {
        let filtered = vendorStore.products;
        
        if (vendorStore.categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === vendorStore.categoryFilter);
        }
        
        if (vendorStore.searchQuery) {
            const query = vendorStore.searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    },
    
    renderProducts: () => {
        const products = productManager.filterProducts();
        
        if (products.length === 0) {
            $('#productsTable').html('<div class="empty-state">No products found. Add your first product to get started!</div>');
            return;
        }
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Rating</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
                        const stockStatus = utils.getStockStatus(p.stock_quantity);
                        return `
                            <tr>
                                <td>${p.id}</td>
                                <td class="product-title-cell">${p.title}</td>
                                <td><span class="category-badge">${p.category}</span></td>
                                <td>${utils.formatPrice(p.price)}</td>
                                <td>⭐ ${p.rating}</td>
                                <td><span class="stock-badge ${stockStatus.class}">${stockStatus.text}</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-edit" data-id="${p.id}">Edit</button>
                                        <button class="btn-delete" data-id="${p.id}">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        $('#productsTable').html(tableHTML);
        productManager.attachEventListeners();
    },
    
    attachEventListeners: () => {
        $('.btn-edit').off('click').on('click', function() {
            const id = parseInt($(this).data('id'));
            productManager.openEditModal(id);
        });
        
        $('.btn-delete').off('click').on('click', function() {
            const id = parseInt($(this).data('id'));
            productManager.deleteProduct(id);
        });
    },
    
    openEditModal: (id) => {
        const product = vendorStore.allProducts.find(p => p.id === id);
        if (!product) {
            utils.showNotification('Product not found', 'error');
            return;
        }
        
        $('#editProductId').val(product.id);
        $('#editProductTitle').val(product.title);
        $('#editProductCategory').val(product.category);
        $('#editProductPrice').val(product.price);
        $('#editProductRating').val(product.rating);
        $('#editProductDescription').val(product.description);
        
        $('#editModal').addClass('active');
        $('body').css('overflow', 'hidden');
    },
    
    closeEditModal: () => {
        $('#editModal').removeClass('active');
        $('body').css('overflow', 'auto');
    },
    
    updateProduct: async (formData) => {
        const id = parseInt(formData.id);
        
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: formData.title,
                    category: formData.category,
                    price: parseFloat(formData.price),
                    rating: parseFloat(formData.rating),
                    description: formData.description
                })
            });
            
            if (response.ok) {
                utils.showNotification('Product updated successfully!');
                productManager.fetchProducts();
                productManager.closeEditModal();
            } else {
                const error = await response.json();
                utils.showNotification(error.error || 'Failed to update product', 'error');
            }
        } catch (err) {
            console.error('Update error:', err);
            utils.showNotification('Failed to update product', 'error');
        }
    },
    
    deleteProduct: async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/products/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                utils.showNotification('Product deleted successfully!');
                productManager.fetchProducts();
            } else {
                const error = await response.json();
                utils.showNotification(error.error || 'Failed to delete product', 'error');
            }
        } catch (err) {
            console.error('Delete error:', err);
            utils.showNotification('Failed to delete product', 'error');
        }
    },
    
    addProduct: async (formData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: formData.title,
                    category: formData.category,
                    price: parseFloat(formData.price),
                    description: formData.description,
                    stock: parseInt(formData.stock),
                    image_url: formData.image_url || ''
                })
            });
            
            if (response.ok) {
                utils.showNotification('Product added successfully!');
                $('#addProductForm')[0].reset();
                setTimeout(() => viewManager.switchView('products'), 1500);
            } else {
                const error = await response.json();
                utils.showNotification(error.error || 'Failed to add product', 'error');
            }
        } catch (err) {
            console.error('Add product error:', err);
            utils.showNotification('Failed to add product', 'error');
        }
    }
};

const stockManager = {
    fetchProducts: async () => {
        await productManager.fetchProducts();
        stockManager.renderStock();
    },
    
    renderStock: () => {
        const products = vendorStore.products;
        
        if (products.length === 0) {
            $('#stockTable').html('<div class="empty-state">No products available to manage stock</div>');
            return;
        }
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Status</th>
                        <th>Update Stock</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
                        const stockStatus = utils.getStockStatus(p.stock_quantity);
                        return `
                            <tr>
                                <td>${p.id}</td>
                                <td class="product-title-cell">${p.title}</td>
                                <td><span class="category-badge">${p.category}</span></td>
                                <td><strong>${p.stock_quantity}</strong> units</td>
                                <td><span class="stock-badge ${stockStatus.class}">${stockStatus.text}</span></td>
                                <td>
                                    <div class="stock-controls">
                                        <input type="number" class="stock-input" value="${p.stock_quantity}" min="0" data-id="${p.id}">
                                        <button class="btn-stock-update" data-id="${p.id}">Update</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        $('#stockTable').html(tableHTML);
        stockManager.attachEventListeners();
    },
    
    attachEventListeners: () => {
        $('.btn-stock-update').off('click').on('click', function() {
            const id = parseInt($(this).data('id'));
            const newStock = parseInt($(`.stock-input[data-id="${id}"]`).val());
            stockManager.updateStock(id, newStock);
        });
    },
    
    updateStock: async (id, newStock) => {
        try {
            const response = await fetch(`${API_BASE_URL}/vendor/products/${id}/stock`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ stock: newStock })
            });
            
            if (response.ok) {
                utils.showNotification('Stock updated successfully!');
                stockManager.fetchProducts();
                stockManager.updateSummary();
            } else {
                const error = await response.json();
                utils.showNotification(error.error || 'Failed to update stock', 'error');
            }
        } catch (err) {
            console.error('Update stock error:', err);
            utils.showNotification('Failed to update stock', 'error');
        }
    },
    
    updateSummary: () => {
        const products = vendorStore.products;
        const totalProducts = products.length;
        const lowStockItems = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
        const outOfStockItems = products.filter(p => p.stock_quantity === 0).length;
        
        $('#totalProducts').text(totalProducts);
        $('#lowStockItems').text(lowStockItems);
        $('#outOfStockItems').text(outOfStockItems);
    }
};

function initEventListeners() {
    $('.nav-btn').on('click', function() {
        const view = $(this).data('view');
        viewManager.switchView(view);
    });
    
    $('#vendorSearchInput').on('input', function() {
        vendorStore.searchQuery = $(this).val();
        productManager.renderProducts();
    });
    
    $('#categoryFilter').on('change', function() {
        vendorStore.categoryFilter = $(this).val();
        productManager.renderProducts();
    });
    
    $('#addProductForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            title: $('#productTitle').val(),
            category: $('#productCategory').val(),
            price: $('#productPrice').val(),
            stock: $('#productStock').val(),
            description: $('#productDescription').val(),
            image_url: $('#productImage').val()
        };
        
        productManager.addProduct(formData);
    });
    
    $('#editProductForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            id: $('#editProductId').val(),
            title: $('#editProductTitle').val(),
            category: $('#editProductCategory').val(),
            price: $('#editProductPrice').val(),
            rating: $('#editProductRating').val(),
            description: $('#editProductDescription').val()
        };
        
        productManager.updateProduct(formData);
    });
    
    $('#closeEditModal, #cancelEdit').on('click', () => {
        productManager.closeEditModal();
    });
    
    $('#editModal').on('click', function(e) {
        if ($(e.target).is('#editModal')) {
            productManager.closeEditModal();
        }
    });
    
    $('#logoutBtn').on('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            authManager.logout();
        }
    });
}

async function init() {
    const isAuthenticated = await authManager.checkAuth();
    
    if (!isAuthenticated) {
        window.location.href = 'index.html';
        return;
    }
    
    utils.updateVendorInfo();
    await productManager.fetchProducts();
    stockManager.updateSummary();
    initEventListeners();
    
    console.log(`Logged in as: ${currentVendor.name} (ID: ${currentVendor.id})`);
    console.log(`Managing ${vendorStore.products.length} products`);
}

$(document).ready(init);
