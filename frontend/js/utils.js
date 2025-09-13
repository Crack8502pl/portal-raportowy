// Portal Raportowy - Utility Functions

// API Configuration
const API_BASE_URL = '/api';

// Global state
let currentUser = null;
let authToken = null;

// Utility Functions

// HTTP Request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add auth token if available
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Handle FormData (for file uploads)
    if (options.body instanceof FormData) {
        delete defaultOptions.headers['Content-Type'];
    }

    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Authentication helpers
function saveAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
}

function loadAuthToken() {
    authToken = localStorage.getItem('authToken');
    return authToken;
}

function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
}

// User helpers
function saveCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    updateUIForUserRole(user.role);
}

function loadCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUIForUserRole(currentUser.role);
    }
    return currentUser;
}

function clearCurrentUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.body.className = '';
}

function updateUIForUserRole(role) {
    document.body.className = `role-${role}`;
    
    // Update user display
    const userFullName = document.getElementById('userFullName');
    const userRole = document.getElementById('userRole');
    
    if (userFullName && currentUser) {
        userFullName.textContent = currentUser.fullName || `${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    if (userRole) {
        const roleNames = {
            'employee': 'Pracownik',
            'coordinator': 'Koordynator', 
            'administrator': 'Administrator'
        };
        userRole.textContent = roleNames[role] || role;
    }
}

// Loading state management
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Toast notifications
function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
}

// Modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setupModalCloseHandlers() {
    document.querySelectorAll('.modal').forEach(modal => {
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Close on close button click
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close on cancel button click
        const cancelBtn = modal.querySelector('.modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
}

// Navigation management
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Load section data
    loadSectionData(sectionName);
}

// Section data loading
async function loadSectionData(sectionName) {
    try {
        switch (sectionName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'reports':
                await loadReports();
                break;
            case 'employees':
                await loadEmployees();
                break;
            case 'users':
                await loadUsers();
                break;
        }
    } catch (error) {
        console.error(`Error loading ${sectionName} data:`, error);
        showToast(`Błąd podczas ładowania danych: ${error.message}`, 'error');
    }
}

// Form validation helpers
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
    });

    return isValid;
}

function setupCharacterCounters() {
    document.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(input => {
        const updateCounter = () => {
            const label = input.closest('.form-group')?.querySelector('label');
            const charLimit = label?.querySelector('.char-limit');
            
            if (charLimit) {
                const current = input.value.length;
                const max = input.maxLength;
                charLimit.textContent = `(${current}/${max})`;
                
                if (current > max * 0.9) {
                    charLimit.style.color = 'var(--danger-color)';
                } else if (current > max * 0.8) {
                    charLimit.style.color = 'var(--warning-color)';
                } else {
                    charLimit.style.color = 'var(--muted-color)';
                }
            }
        };

        input.addEventListener('input', updateCounter);
        updateCounter(); // Initial call
    });
}

// File upload helpers
function setupFileUploadHandlers() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const maxSize = 10 * 1024 * 1024; // 10MB
            const maxFiles = 5;

            // Check file count
            if (files.length > maxFiles) {
                showToast(`Maksymalnie ${maxFiles} plików można przesłać jednocześnie.`, 'warning');
                e.target.value = '';
                return;
            }

            // Check file sizes
            const oversizedFiles = files.filter(file => file.size > maxSize);
            if (oversizedFiles.length > 0) {
                showToast('Niektóre pliki są zbyt duże (max 10MB).', 'warning');
                e.target.value = '';
                return;
            }

            // Display file info
            displayFileInfo(files, input);
        });
    });
}

function displayFileInfo(files, inputElement) {
    let infoContainer = inputElement.parentElement.querySelector('.file-info');
    
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.className = 'file-info';
        inputElement.parentElement.appendChild(infoContainer);
    }

    infoContainer.innerHTML = files.map(file => `
        <div class="file-item">
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
    `).join('');
}

// Date formatting helpers
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL');
}

function formatTime(timeString) {
    if (!timeString) return '';
    return timeString.substring(0, 5); // HH:MM format
}

// Export helpers
async function exportToExcel(endpoint, filename) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'export.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('Plik został pobrany pomyślnie.', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast(`Błąd podczas eksportu: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Search and filter helpers
function setupSearchHandlers() {
    document.querySelectorAll('.search-input').forEach(input => {
        let searchTimeout;
        
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = e.target.value.trim();
                handleSearch(searchTerm, input.dataset.searchType);
            }, 300);
        });
    });
}

function handleSearch(searchTerm, searchType) {
    switch (searchType) {
        case 'employees':
            searchEmployees(searchTerm);
            break;
        case 'reports':
            searchReports(searchTerm);
            break;
        default:
            console.log('Search:', searchTerm);
    }
}

// Error handling
function handleApiError(error) {
    console.error('API Error:', error);
    
    if (error.message.includes('401') || error.message.includes('Token')) {
        // Token expired or invalid
        logout();
        showToast('Sesja wygasła. Zaloguj się ponownie.', 'warning');
        return;
    }
    
    if (error.message.includes('403')) {
        showToast('Brak uprawnień do wykonania tej operacji.', 'error');
        return;
    }
    
    if (error.message.includes('404')) {
        showToast('Nie znaleziono żądanych danych.', 'error');
        return;
    }
    
    showToast(`Wystąpił błąd: ${error.message}`, 'error');
}

// Initialize application
async function initializeApp() {
    try {
        hideLoading();
        
        // Load auth token and user
        loadAuthToken();
        loadCurrentUser();

        // Setup event handlers
        setupModalCloseHandlers();
        setupCharacterCounters();
        setupFileUploadHandlers();
        setupSearchHandlers();
        setupNavigationHandlers();

        // Check if user is authenticated
        if (authToken && currentUser) {
            await verifyAuthToken();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('Błąd podczas inicjalizacji aplikacji.', 'error');
        showLoginPage();
    }
}

function setupNavigationHandlers() {
    // Navigation menu handlers
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
        });
    });

    // Profile and logout handlers
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileBtn) {
        profileBtn.addEventListener('click', showProfileModal);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

async function verifyAuthToken() {
    try {
        const response = await apiRequest('/auth/verify-token');
        if (response.valid) {
            showMainApp();
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        showLoginPage();
    }
}

function showLoginPage() {
    clearAuthToken();
    clearCurrentUser();
    
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    
    // Load initial dashboard data
    showSection('dashboard');
}

async function logout() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        // Ignore logout errors
    } finally {
        clearAuthToken();
        clearCurrentUser();
        showLoginPage();
        showToast('Zostałeś wylogowany.', 'info');
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('Wystąpił nieoczekiwany błąd.', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    handleApiError(event.reason);
});

// Export functions for use in other scripts
window.PortalUtils = {
    apiRequest,
    showToast,
    showModal,
    hideModal,
    showSection,
    showLoading,
    hideLoading,
    formatDate,
    formatDateTime,
    formatTime,
    exportToExcel,
    handleApiError,
    validateForm,
    saveAuthToken,
    saveCurrentUser,
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken
};