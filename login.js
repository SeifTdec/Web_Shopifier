const API_BASE_URL = 'http://localhost:5000/api';

// Tab switching functionality
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            hideAlert();
        });
    });
    
    // Link switching
    document.querySelectorAll('.link[data-switch]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = link.dataset.switch;
            const targetBtn = document.querySelector(`[data-tab="${targetTab}"]`);
            if (targetBtn) targetBtn.click();
        });
    });
}

// Alert/notification functions
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alertBox');
    alertBox.textContent = message;
    alertBox.className = `alert ${type} show`;
    
    setTimeout(() => {
        hideAlert();
    }, 5000);
}

function hideAlert() {
    const alertBox = document.getElementById('alertBox');
    alertBox.classList.remove('show');
}

// Customer Login
document.getElementById('customerLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('customerEmail').value;
    const password = document.getElementById('customerPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showAlert(data.error || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('Connection error. Please try again.', 'error');
    }
});

// Vendor Login
document.getElementById('vendorLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('vendorEmail').value;
    const password = document.getElementById('vendorPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Login successful! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                window.location.href = 'vendor.html';
            }, 1500);
        } else {
            showAlert(data.error || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (err) {
        console.error('Vendor login error:', err);
        showAlert('Connection error. Please try again.', 'error');
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Please login.', 'success');
            
            // Reset form
            document.getElementById('registerForm').reset();
            
            // Switch to login tab after 2 seconds
            setTimeout(() => {
                document.querySelector('[data-tab="customer-login"]').click();
                
                // Pre-fill email
                document.getElementById('customerEmail').value = email;
            }, 2000);
        } else {
            showAlert(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('Connection error. Please try again.', 'error');
    }
});

// Continue as Guest
document.getElementById('continueAsGuestBtn').addEventListener('click', () => {
    showAlert('Continuing as guest...', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

// Initialize
initTabs();