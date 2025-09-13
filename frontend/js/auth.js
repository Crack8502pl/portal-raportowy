// Portal Raportowy - Authentication Module

// Login functionality
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';

    try {
        showLoading();
        
        const response = await PortalUtils.apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

        // Save authentication data
        PortalUtils.saveAuthToken(response.token);
        PortalUtils.saveCurrentUser(response.user);

        // Show success message and redirect to main app
        PortalUtils.showToast('Pomyślnie zalogowano!', 'success');
        
        // Small delay to show success message
        setTimeout(() => {
            showMainApp();
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Błąd podczas logowania.';
        
        if (error.message.includes('Invalid credentials')) {
            errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło.';
        } else if (error.message.includes('Account is deactivated')) {
            errorMessage = 'Konto zostało dezaktywowane.';
        } else if (error.message.includes('Too many')) {
            errorMessage = 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.';
        }

        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    } finally {
        hideLoading();
    }
}

// Profile management
async function showProfileModal() {
    const currentUser = PortalUtils.getCurrentUser();
    if (!currentUser) return;

    // Fill form with current user data
    document.getElementById('profileFirstName').value = currentUser.firstName || '';
    document.getElementById('profileLastName').value = currentUser.lastName || '';
    document.getElementById('profileEmail').value = currentUser.email || '';

    PortalUtils.showModal('profileModal');
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const profileData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email')
    };

    if (!PortalUtils.validateForm(form)) {
        PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
        return;
    }

    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        // Update current user data
        PortalUtils.saveCurrentUser(response.user);

        PortalUtils.hideModal('profileModal');
        PortalUtils.showToast('Profil został zaktualizowany pomyślnie.', 'success');
        
    } catch (error) {
        console.error('Profile update error:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Change password functionality
async function showChangePasswordModal() {
    const modalHtml = `
        <div id="changePasswordModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Zmień hasło</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <form id="changePasswordForm" class="modal-body">
                    <div class="form-group">
                        <label for="currentPassword">Aktualne hasło</label>
                        <input type="password" id="currentPassword" name="currentPassword" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="newPassword">Nowe hasło</label>
                        <input type="password" id="newPassword" name="newPassword" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Potwierdź nowe hasło</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6">
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Anuluj</button>
                        <button type="submit" class="btn btn-primary">Zmień hasło</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add modal to DOM if not exists
    let modal = document.getElementById('changePasswordModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('changePasswordModal');
        
        // Setup modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            PortalUtils.hideModal('changePasswordModal');
        });
        
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            PortalUtils.hideModal('changePasswordModal');
        });
        
        modal.querySelector('#changePasswordForm').addEventListener('submit', handleChangePassword);
    }

    PortalUtils.showModal('changePasswordModal');
}

async function handleChangePassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    // Validate form
    if (!PortalUtils.validateForm(form)) {
        PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
        return;
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
        PortalUtils.showToast('Nowe hasła nie są identyczne.', 'warning');
        return;
    }

    // Check password strength
    if (newPassword.length < 6) {
        PortalUtils.showToast('Nowe hasło musi mieć co najmniej 6 znaków.', 'warning');
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        PortalUtils.hideModal('changePasswordModal');
        PortalUtils.showToast('Hasło zostało zmienione pomyślnie.', 'success');
        
        // Clear form
        form.reset();
        
    } catch (error) {
        console.error('Change password error:', error);
        
        if (error.message.includes('Current password is incorrect')) {
            PortalUtils.showToast('Aktualne hasło jest nieprawidłowe.', 'error');
        } else {
            PortalUtils.handleApiError(error);
        }
    } finally {
        PortalUtils.hideLoading();
    }
}

// User session management
async function refreshUserSession() {
    try {
        const response = await PortalUtils.apiRequest('/auth/refresh-token', {
            method: 'POST'
        });

        PortalUtils.saveAuthToken(response.token);
        PortalUtils.saveCurrentUser(response.user);
        
        console.log('User session refreshed');
    } catch (error) {
        console.error('Session refresh failed:', error);
        // If refresh fails, logout user
        logout();
    }
}

// Auto-refresh token every 20 minutes
setInterval(refreshUserSession, 20 * 60 * 1000);

// Check session on page focus
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && PortalUtils.getAuthToken()) {
        refreshUserSession();
    }
});

// Setup authentication event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Profile form handler
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Add change password button to profile modal
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        const modalFooter = profileModal.querySelector('.modal-footer');
        if (modalFooter) {
            const changePasswordBtn = document.createElement('button');
            changePasswordBtn.type = 'button';
            changePasswordBtn.className = 'btn btn-secondary';
            changePasswordBtn.textContent = 'Zmień hasło';
            changePasswordBtn.addEventListener('click', showChangePasswordModal);
            
            modalFooter.insertBefore(changePasswordBtn, modalFooter.firstChild);
        }
    }

    // Demo credentials click handlers
    const demoCredentials = document.querySelectorAll('.demo-credentials p');
    demoCredentials.forEach(p => {
        p.style.cursor = 'pointer';
        p.addEventListener('click', () => {
            const text = p.textContent;
            const match = text.match(/(\w+)\s*\/\s*(\w+)/);
            if (match) {
                const username = match[1];
                const password = match[2];
                
                document.getElementById('username').value = username;
                document.getElementById('password').value = password;
                
                PortalUtils.showToast('Dane logowania zostały wypełnione automatycznie.', 'info');
            }
        });
    });
});

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    strength = Object.values(checks).filter(Boolean).length;

    const strengthLevels = {
        0: { level: 'very-weak', text: 'Bardzo słabe' },
        1: { level: 'weak', text: 'Słabe' },
        2: { level: 'fair', text: 'Średnie' },
        3: { level: 'good', text: 'Dobre' },
        4: { level: 'strong', text: 'Silne' },
        5: { level: 'very-strong', text: 'Bardzo silne' }
    };

    return strengthLevels[strength] || strengthLevels[0];
}

function setupPasswordStrengthIndicator(passwordInputId, indicatorId) {
    const passwordInput = document.getElementById(passwordInputId);
    const indicator = document.getElementById(indicatorId);
    
    if (!passwordInput || !indicator) return;

    passwordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        const strength = checkPasswordStrength(password);
        
        indicator.className = `password-strength ${strength.level}`;
        indicator.textContent = strength.text;
    });
}

// Session timeout warning
let sessionTimeoutWarning = null;

function showSessionTimeoutWarning() {
    if (sessionTimeoutWarning) return;

    sessionTimeoutWarning = document.createElement('div');
    sessionTimeoutWarning.className = 'session-timeout-warning';
    sessionTimeoutWarning.innerHTML = `
        <div class="warning-content">
            <h4>Sesja wkrótce wygaśnie</h4>
            <p>Twoja sesja wygaśnie za 5 minut. Czy chcesz ją przedłużyć?</p>
            <div class="warning-actions">
                <button class="btn btn-primary" onclick="extendSession()">Przedłuż sesję</button>
                <button class="btn btn-secondary" onclick="dismissSessionWarning()">Zamknij</button>
            </div>
        </div>
    `;

    document.body.appendChild(sessionTimeoutWarning);
}

function extendSession() {
    refreshUserSession();
    dismissSessionWarning();
}

function dismissSessionWarning() {
    if (sessionTimeoutWarning) {
        sessionTimeoutWarning.remove();
        sessionTimeoutWarning = null;
    }
}

// Show session timeout warning 5 minutes before expiry (JWT expires in 24h by default)
setTimeout(showSessionTimeoutWarning, 23 * 60 * 60 * 1000); // 23 hours

// Export authentication functions
window.AuthModule = {
    handleLogin,
    showProfileModal,
    handleProfileUpdate,
    showChangePasswordModal,
    refreshUserSession,
    checkPasswordStrength,
    setupPasswordStrengthIndicator
};