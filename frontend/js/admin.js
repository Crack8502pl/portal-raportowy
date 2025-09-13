// Portal Raportowy - Administrator Module

// Global variables
let currentUsersList = [];
let selectedUserForEdit = null;

// Load users data
async function loadUsers(filters = {}) {
    try {
        PortalUtils.showLoading();
        
        const queryParams = new URLSearchParams({
            page: filters.page || 1,
            limit: filters.limit || 20,
            ...filters
        });

        const response = await PortalUtils.apiRequest(`/users?${queryParams}`);
        currentUsersList = response.users || [];
        
        displayUsersTable(currentUsersList, response.pagination);

    } catch (error) {
        console.error('Error loading users:', error);
        PortalUtils.handleApiError(error);
        document.getElementById('usersTable').innerHTML = '<p class="error">Błąd podczas ładowania użytkowników.</p>';
    } finally {
        PortalUtils.hideLoading();
    }
}

// Display users table
function displayUsersTable(users, pagination) {
    const tableContainer = document.getElementById('usersTable');
    
    if (!users || users.length === 0) {
        tableContainer.innerHTML = '<p class="no-data">Brak użytkowników do wyświetlenia.</p>';
        return;
    }

    const currentUser = PortalUtils.getCurrentUser();

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nazwa użytkownika</th>
                    <th>Imię i nazwisko</th>
                    <th>Email</th>
                    <th>Rola</th>
                    <th>Status</th>
                    <th>Data utworzenia</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td><strong>${user.username}</strong></td>
                        <td>${user.fullName || `${user.firstName} ${user.lastName}`}</td>
                        <td>${user.email}</td>
                        <td>
                            <span class="role-badge role-${user.role}">
                                ${getRoleText(user.role)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${user.isActive ? 'status-submitted' : 'status-archived'}">
                                ${user.isActive ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                        </td>
                        <td>${PortalUtils.formatDate(user.createdAt)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-text" onclick="viewUserDetails('${user.id}')">Szczegóły</button>
                                ${user.id !== currentUser.id ? `
                                    <button class="btn btn-text" onclick="editUser('${user.id}')">Edytuj</button>
                                    <button class="btn btn-text btn-warning" onclick="changeUserPassword('${user.id}')">Hasło</button>
                                    ${user.isActive ? 
                                        `<button class="btn btn-text btn-warning" onclick="deactivateUser('${user.id}')">Dezaktywuj</button>` :
                                        `<button class="btn btn-text btn-success" onclick="activateUser('${user.id}')">Aktywuj</button>`
                                    }
                                    <button class="btn btn-text btn-danger" onclick="deleteUser('${user.id}')">Usuń</button>
                                ` : '<span class="text-muted">To Twoje konto</span>'}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${pagination ? displayUsersPagination(pagination) : ''}
    `;

    tableContainer.innerHTML = tableHTML;
}

// Display users pagination
function displayUsersPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
        return '';
    }

    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    paginationHTML += `
        <button ${!pagination.hasPrev ? 'disabled' : ''} 
                onclick="loadUsers({page: ${pagination.page - 1}})">
            Poprzednia
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button ${i === pagination.page ? 'class="active"' : ''} 
                    onclick="loadUsers({page: ${i}})">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button ${!pagination.hasNext ? 'disabled' : ''} 
                onclick="loadUsers({page: ${pagination.page + 1}})">
            Następna
        </button>
    `;
    
    paginationHTML += '</div>';
    return paginationHTML;
}

// Show new user modal
function showNewUserModal() {
    selectedUserForEdit = null;
    
    // Reset form
    const form = document.getElementById('userForm');
    form.reset();
    
    // Show password field for new users
    const passwordField = document.getElementById('userPassword').closest('.form-group');
    passwordField.style.display = 'block';
    
    document.getElementById('userModalTitle').textContent = 'Nowy użytkownik';
    PortalUtils.showModal('userModal');
}

// Handle user form submission
async function handleUserSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    if (!PortalUtils.validateForm(form)) {
        PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
        return;
    }

    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        role: formData.get('role')
    };

    // Add password for new users
    if (!selectedUserForEdit) {
        userData.password = formData.get('password');
        
        if (!userData.password || userData.password.length < 6) {
            PortalUtils.showToast('Hasło musi mieć co najmniej 6 znaków.', 'warning');
            return;
        }
    }

    try {
        PortalUtils.showLoading();
        
        const endpoint = selectedUserForEdit ? `/users/${selectedUserForEdit}` : '/users';
        const method = selectedUserForEdit ? 'PUT' : 'POST';
        
        await PortalUtils.apiRequest(endpoint, {
            method,
            body: JSON.stringify(userData)
        });

        PortalUtils.hideModal('userModal');
        PortalUtils.showToast(
            selectedUserForEdit ? 'Użytkownik został zaktualizowany pomyślnie.' : 'Użytkownik został utworzony pomyślnie.',
            'success'
        );
        
        // Reload users list
        await loadUsers();
        
    } catch (error) {
        console.error('Error saving user:', error);
        
        // Handle specific errors
        if (error.message.includes('Username already exists')) {
            PortalUtils.showToast('Nazwa użytkownika już istnieje.', 'error');
        } else if (error.message.includes('Email already exists')) {
            PortalUtils.showToast('Adres email już jest używany przez innego użytkownika.', 'error');
        } else {
            PortalUtils.handleApiError(error);
        }
    } finally {
        PortalUtils.hideLoading();
    }
}

// Edit user
async function editUser(userId) {
    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest(`/users/${userId}`);
        const user = response.user;
        
        // Fill form with user data
        selectedUserForEdit = userId;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userFirstName').value = user.firstName;
        document.getElementById('userLastName').value = user.lastName;
        document.getElementById('userRole').value = user.role;
        
        // Hide password field for existing users
        const passwordField = document.getElementById('userPassword').closest('.form-group');
        passwordField.style.display = 'none';
        
        document.getElementById('userModalTitle').textContent = 'Edytuj użytkownika';
        PortalUtils.showModal('userModal');
        
    } catch (error) {
        console.error('Error loading user for edit:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// View user details
async function viewUserDetails(userId) {
    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest(`/users/${userId}`);
        const user = response.user;
        
        showUserDetailsModal(user);
        
    } catch (error) {
        console.error('Error loading user details:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

function showUserDetailsModal(user) {
    const modalHTML = `
        <div id="userDetailsModal" class="modal active">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Szczegóły użytkownika</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="user-details">
                        <div class="detail-group">
                            <h4>Informacje podstawowe</h4>
                            <p><strong>Nazwa użytkownika:</strong> ${user.username}</p>
                            <p><strong>Imię i nazwisko:</strong> ${user.fullName || `${user.firstName} ${user.lastName}`}</p>
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Rola:</strong> <span class="role-badge role-${user.role}">${getRoleText(user.role)}</span></p>
                            <p><strong>Status:</strong> 
                                <span class="status-badge ${user.isActive ? 'status-submitted' : 'status-archived'}">
                                    ${user.isActive ? 'Aktywny' : 'Nieaktywny'}
                                </span>
                            </p>
                        </div>
                        
                        <div class="detail-group">
                            <h4>Informacje systemowe</h4>
                            <p><strong>Data utworzenia:</strong> ${PortalUtils.formatDateTime(user.createdAt)}</p>
                            <p><strong>Ostatnia aktualizacja:</strong> ${PortalUtils.formatDateTime(user.updatedAt)}</p>
                        </div>
                        
                        <div class="detail-group">
                            <h4>Uprawnienia</h4>
                            <div class="permissions-list">
                                ${getUserPermissions(user.role).map(permission => 
                                    `<div class="permission-item">${permission}</div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeUserDetailsModal()">Zamknij</button>
                    ${user.id !== PortalUtils.getCurrentUser()?.id ? `
                        <button class="btn btn-primary" onclick="editUser('${user.id}')">Edytuj</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('userDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup close handlers
    const modal = document.getElementById('userDetailsModal');
    modal.querySelector('.modal-close').addEventListener('click', closeUserDetailsModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeUserDetailsModal();
        }
    });
}

function closeUserDetailsModal() {
    const modal = document.getElementById('userDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Change user password
async function changeUserPassword(userId) {
    const modalHTML = `
        <div id="changeUserPasswordModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Zmień hasło użytkownika</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <form id="changeUserPasswordForm" class="modal-body">
                    <div class="form-group">
                        <label for="newUserPassword">Nowe hasło</label>
                        <input type="password" id="newUserPassword" name="newPassword" required minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmUserPassword">Potwierdź nowe hasło</label>
                        <input type="password" id="confirmUserPassword" name="confirmPassword" required minlength="6">
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary modal-cancel">Anuluj</button>
                        <button type="submit" class="btn btn-primary">Zmień hasło</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('changeUserPasswordModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('changeUserPasswordModal');
    
    // Setup modal handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
        PortalUtils.hideModal('changeUserPasswordModal');
    });
    
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
        PortalUtils.hideModal('changeUserPasswordModal');
    });
    
    modal.querySelector('#changeUserPasswordForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (!PortalUtils.validateForm(form)) {
            PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            PortalUtils.showToast('Hasła nie są identyczne.', 'warning');
            return;
        }

        if (newPassword.length < 6) {
            PortalUtils.showToast('Hasło musi mieć co najmniej 6 znaków.', 'warning');
            return;
        }

        try {
            PortalUtils.showLoading();
            
            await PortalUtils.apiRequest(`/users/${userId}/change-password`, {
                method: 'POST',
                body: JSON.stringify({ newPassword })
            });

            PortalUtils.hideModal('changeUserPasswordModal');
            PortalUtils.showToast('Hasło użytkownika zostało zmienione pomyślnie.', 'success');
            
        } catch (error) {
            console.error('Error changing user password:', error);
            PortalUtils.handleApiError(error);
        } finally {
            PortalUtils.hideLoading();
        }
    });
    
    PortalUtils.showModal('changeUserPasswordModal');
}

// Activate user
async function activateUser(userId) {
    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/users/${userId}/activate`, {
            method: 'POST'
        });

        PortalUtils.showToast('Użytkownik został aktywowany pomyślnie.', 'success');
        
        // Reload users list
        await loadUsers();
        
    } catch (error) {
        console.error('Error activating user:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Deactivate user
async function deactivateUser(userId) {
    if (!confirm('Czy na pewno chcesz dezaktywować tego użytkownika?')) {
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/users/${userId}/deactivate`, {
            method: 'POST'
        });

        PortalUtils.showToast('Użytkownik został dezaktywowany pomyślnie.', 'success');
        
        // Reload users list
        await loadUsers();
        
    } catch (error) {
        console.error('Error deactivating user:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika? Ta operacja jest nieodwracalna.')) {
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/users/${userId}`, {
            method: 'DELETE'
        });

        PortalUtils.showToast('Użytkownik został usunięty pomyślnie.', 'success');
        
        // Reload users list
        await loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// System administration
async function showSystemAdminPanel() {
    const modalHTML = `
        <div id="systemAdminModal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Panel administracyjny systemu</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="admin-tabs">
                        <button class="admin-tab-btn active" onclick="showAdminTab('system-info')">Informacje o systemie</button>
                        <button class="admin-tab-btn" onclick="showAdminTab('email-settings')">Ustawienia email</button>
                        <button class="admin-tab-btn" onclick="showAdminTab('backup')">Kopia zapasowa</button>
                        <button class="admin-tab-btn" onclick="showAdminTab('logs')">Logi systemowe</button>
                    </div>
                    
                    <div class="admin-tab-content">
                        <div id="system-info-tab" class="admin-tab active">
                            <h4>Informacje o systemie</h4>
                            <div id="systemInfo">Ładowanie...</div>
                        </div>
                        
                        <div id="email-settings-tab" class="admin-tab">
                            <h4>Ustawienia email</h4>
                            <div class="email-settings">
                                <div class="form-group">
                                    <label>Test konfiguracji email</label>
                                    <div class="email-test-form">
                                        <input type="email" id="testEmailAddress" placeholder="Adres email do testu">
                                        <button class="btn btn-primary" onclick="testEmailConfiguration()">Wyślij test</button>
                                    </div>
                                </div>
                                
                                <div class="email-templates">
                                    <h5>Szablony email</h5>
                                    <p>Szablony są konfigurowane w pliku konfiguracyjnym serwera.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div id="backup-tab" class="admin-tab">
                            <h4>Kopia zapasowa danych</h4>
                            <div class="backup-section">
                                <button class="btn btn-primary" onclick="exportAllData()">Eksportuj wszystkie dane</button>
                                <button class="btn btn-secondary" onclick="generateSystemReport()">Wygeneruj raport systemu</button>
                            </div>
                        </div>
                        
                        <div id="logs-tab" class="admin-tab">
                            <h4>Logi systemowe</h4>
                            <div id="systemLogs">
                                <p>Logi systemowe są dostępne w konsoli przeglądarki i logach serwera.</p>
                                <button class="btn btn-secondary" onclick="downloadLogs()">Pobierz logi</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Zamknij</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('systemAdminModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup modal handlers
    const modal = document.getElementById('systemAdminModal');
    modal.querySelector('.modal-close').addEventListener('click', () => {
        PortalUtils.hideModal('systemAdminModal');
    });
    
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
        PortalUtils.hideModal('systemAdminModal');
    });
    
    // Load system information
    await loadSystemInfo();
    
    PortalUtils.showModal('systemAdminModal');
}

function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
}

async function loadSystemInfo() {
    try {
        const response = await PortalUtils.apiRequest('/health');
        
        const systemInfoDiv = document.getElementById('systemInfo');
        systemInfoDiv.innerHTML = `
            <div class="system-info-grid">
                <div class="info-item">
                    <strong>Status systemu:</strong> ${response.status}
                </div>
                <div class="info-item">
                    <strong>Wersja:</strong> ${response.version}
                </div>
                <div class="info-item">
                    <strong>Ostatnia aktualizacja:</strong> ${PortalUtils.formatDateTime(response.timestamp)}
                </div>
                <div class="info-item">
                    <strong>Baza danych:</strong> ${response.services?.database || 'Nieznany'}
                </div>
                <div class="info-item">
                    <strong>Email:</strong> ${response.services?.email || 'Nieskonfigurowany'}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading system info:', error);
        document.getElementById('systemInfo').innerHTML = '<p class="error">Błąd podczas ładowania informacji o systemie.</p>';
    }
}

async function testEmailConfiguration() {
    const emailAddress = document.getElementById('testEmailAddress').value;
    
    if (!emailAddress || !emailAddress.includes('@')) {
        PortalUtils.showToast('Wprowadź prawidłowy adres email.', 'warning');
        return;
    }

    try {
        PortalUtils.showLoading();
        
        // This would need to be implemented on the backend
        await PortalUtils.apiRequest('/admin/test-email', {
            method: 'POST',
            body: JSON.stringify({ email: emailAddress })
        });

        PortalUtils.showToast('Email testowy został wysłany pomyślnie.', 'success');
        
    } catch (error) {
        console.error('Error testing email:', error);
        PortalUtils.showToast('Błąd podczas wysyłania testu email.', 'error');
    } finally {
        PortalUtils.hideLoading();
    }
}

async function exportAllData() {
    try {
        PortalUtils.showLoading();
        
        // Export all reports with comprehensive data
        await PortalUtils.exportToExcel('/reports/export', {
            includeAll: true,
            format: 'comprehensive'
        });
        
    } catch (error) {
        console.error('Error exporting all data:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

async function generateSystemReport() {
    try {
        PortalUtils.showLoading();
        
        // Generate comprehensive system report
        const [usersStats, reportsStats, employeesStats] = await Promise.all([
            PortalUtils.apiRequest('/users/stats'),
            PortalUtils.apiRequest('/reports?limit=1'),
            PortalUtils.apiRequest('/employees/stats')
        ]);
        
        const reportData = {
            generated: new Date().toISOString(),
            users: usersStats.stats,
            reports: reportsStats.pagination?.total || 0,
            employees: employeesStats.stats
        };
        
        // Create and download report
        const reportContent = JSON.stringify(reportData, null, 2);
        const blob = new Blob([reportContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `system_report_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        PortalUtils.showToast('Raport systemu został wygenerowany.', 'success');
        
    } catch (error) {
        console.error('Error generating system report:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Utility functions
function getRoleText(role) {
    const roleMap = {
        'employee': 'Pracownik',
        'coordinator': 'Koordynator',
        'administrator': 'Administrator'
    };
    return roleMap[role] || role;
}

function getUserPermissions(role) {
    const permissions = {
        'employee': [
            'Tworzenie własnych raportów',
            'Edycja własnych raportów (szkice)',
            'Przeglądanie własnych raportów',
            'Eksport własnych raportów'
        ],
        'coordinator': [
            'Wszystkie uprawnienia pracownika',
            'Przeglądanie wszystkich raportów',
            'Eksport wszystkich raportów',
            'Zarządzanie pracownikami',
            'Zaawansowane raportowanie'
        ],
        'administrator': [
            'Wszystkie uprawnienia koordynatora',
            'Zarządzanie użytkownikami',
            'Zmiana haseł użytkowników',
            'Aktywacja/dezaktywacja kont',
            'Panel administracyjny',
            'Konfiguracja systemu'
        ]
    };
    
    return permissions[role] || [];
}

// Setup admin module event handlers
document.addEventListener('DOMContentLoaded', function() {
    // New user button
    const newUserBtn = document.getElementById('newUserBtn');
    if (newUserBtn) {
        newUserBtn.addEventListener('click', showNewUserModal);
    }

    // User form
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', handleUserSubmit);
    }

    // Add system admin button for administrators
    const user = PortalUtils.getCurrentUser();
    if (user && user.role === 'administrator') {
        addSystemAdminButton();
    }
});

function addSystemAdminButton() {
    const usersSection = document.getElementById('usersSection');
    const sectionActions = usersSection?.querySelector('.section-actions');
    
    if (sectionActions) {
        const systemAdminBtn = document.createElement('button');
        systemAdminBtn.className = 'btn btn-secondary';
        systemAdminBtn.textContent = 'Panel administracyjny';
        systemAdminBtn.addEventListener('click', showSystemAdminPanel);
        sectionActions.appendChild(systemAdminBtn);
    }
}

// Export admin functions
window.AdminModule = {
    loadUsers,
    showNewUserModal,
    editUser,
    viewUserDetails,
    changeUserPassword,
    activateUser,
    deactivateUser,
    deleteUser,
    showSystemAdminPanel,
    testEmailConfiguration,
    exportAllData,
    generateSystemReport
};