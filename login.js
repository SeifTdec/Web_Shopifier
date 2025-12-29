const API_BASE_URL = 'http://localhost:5000/api';

// Tab switching functionality
function initTabs() {
    $('.tab-btn').on('click', function() {
        const targetTab = $(this).data('tab');
        
        $('.tab-btn').removeClass('active');
        $('.tab-content').removeClass('active');
        
        $(this).addClass('active');
        $(`#${targetTab}`).addClass('active');
        
        hideAlert();
    });
    
    $('.link[data-switch]').on('click', function(e) {
        e.preventDefault();
        const targetTab = $(this).data('switch');
        $(`.tab-btn[data-tab="${targetTab}"]`).trigger('click');
    });
}

// Alert/notification functions
function showAlert(message, type = 'success') {
    $('#alertBox')
        .text(message)
        .removeClass()
        .addClass(`alert ${type} show`);
    
    setTimeout(() => {
        hideAlert();
    }, 5000);
}

function hideAlert() {
    $('#alertBox').removeClass('show');
}

// Customer Login
$('#customerLoginForm').on('submit', async function(e) {
    e.preventDefault();
    
    const email = $('#customerEmail').val();
    const password = $('#customerPassword').val();
    
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
$('#vendorLoginForm').on('submit', async function(e) {
    e.preventDefault();
    
    const email = $('#vendorEmail').val();
    const password = $('#vendorPassword').val();
    
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

// Customer Register
$('#customerRegisterForm').on('submit', async function(e) {
    e.preventDefault();
    
    const name = $('#customerRegisterName').val();
    const email = $('#customerRegisterEmail').val();
    const password = $('#customerRegisterPassword').val();
    const confirmPassword = $('#customerRegisterConfirmPassword').val();
    
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
            $('#customerRegisterForm')[0].reset();
            
            setTimeout(() => {
                $('.tab-btn[data-tab="customer-login"]').trigger('click');
                $('#customerEmail').val(email);
            }, 2000);
        } else {
            showAlert(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('Connection error. Please try again.', 'error');
    }
});

// Vendor Register
$('#vendorRegisterForm').on('submit', async function(e) {
    e.preventDefault();
    
    const businessName = $('#vendorRegisterBusinessName').val();
    const email = $('#vendorRegisterEmail').val();
    const phone = $('#vendorRegisterPhone').val();
    const address = $('#vendorRegisterAddress').val();
    const password = $('#vendorRegisterPassword').val();
    const confirmPassword = $('#vendorRegisterConfirmPassword').val();
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ businessName, email, phone, address, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Vendor registration successful! Please login.', 'success');
            $('#vendorRegisterForm')[0].reset();
            
            setTimeout(() => {
                $('.tab-btn[data-tab="vendor-login"]').trigger('click');
                $('#vendorEmail').val(email);
            }, 2000);
        } else {
            showAlert(data.error || 'Registration failed. Please try again.', 'error');
        }
    } catch (err) {
        console.error('Vendor registration error:', err);
        showAlert('Connection error. Please try again.', 'error');
    }
});

// Continue as Guest
$('#continueAsGuestBtn').on('click', function() {
    showAlert('Continuing as guest...', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
});

// Initialize on document ready
$(document).ready(function() {
    initTabs();
});