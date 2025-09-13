// Portal Raportowy - Employee Management Module

// Global variables
let currentEmployees = [];
let selectedEmployeeId = null;

// Load dashboard data
async function loadDashboardData() {
    try {
        const user = PortalUtils.getCurrentUser();
        if (!user) return;

        // Load my reports count
        const myReportsResponse = await PortalUtils.apiRequest(`/reports/user/${user.id}?limit=1`);
        document.getElementById('myReportsCount').textContent = myReportsResponse.pagination?.total || 0;

        // Load all reports count (for coordinators/admins)
        if (user.role === 'coordinator' || user.role === 'administrator') {
            const allReportsResponse = await PortalUtils.apiRequest('/reports?limit=1');
            document.getElementById('allReportsCount').textContent = allReportsResponse.pagination?.total || 0;
        }

        // Load employees count (for coordinators/admins)
        if (user.role === 'coordinator' || user.role === 'administrator') {
            const employeesResponse = await PortalUtils.apiRequest('/employees/stats');
            document.getElementById('employeesCount').textContent = employeesResponse.stats?.active || 0;
        }

        // Load users count (for admins)
        if (user.role === 'administrator') {
            const usersResponse = await PortalUtils.apiRequest('/users/stats');
            document.getElementById('usersCount').textContent = usersResponse.stats?.active || 0;
        }

        // Load recent reports
        await loadRecentReports();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        PortalUtils.handleApiError(error);
    }
}

// Load recent reports for dashboard
async function loadRecentReports() {
    try {
        const user = PortalUtils.getCurrentUser();
        if (!user) return;

        const response = await PortalUtils.apiRequest(`/reports/user/${user.id}?limit=5`);
        const recentReportsList = document.getElementById('recentReportsList');
        
        if (!response.reports || response.reports.length === 0) {
            recentReportsList.innerHTML = '<p class="no-data">Brak raportów do wyświetlenia.</p>';
            return;
        }

        recentReportsList.innerHTML = response.reports.map(report => `
            <div class="report-item">
                <div class="report-header">
                    <h4>${report.objectName}</h4>
                    <span class="status-badge status-${report.status}">${getStatusText(report.status)}</span>
                </div>
                <p class="report-date">${PortalUtils.formatDate(report.reportDate)}</p>
                <p class="report-work">${report.workPerformed.substring(0, 100)}${report.workPerformed.length > 100 ? '...' : ''}</p>
                <div class="report-actions">
                    <button class="btn btn-text" onclick="viewReport('${report.id}')">Zobacz</button>
                    ${report.status === 'draft' ? `<button class="btn btn-text" onclick="editReport('${report.id}')">Edytuj</button>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recent reports:', error);
        document.getElementById('recentReportsList').innerHTML = '<p class="error">Błąd podczas ładowania raportów.</p>';
    }
}

// Load all reports
async function loadReports(filters = {}) {
    try {
        PortalUtils.showLoading();
        
        const queryParams = new URLSearchParams({
            page: filters.page || 1,
            limit: filters.limit || 20,
            ...filters
        });

        const response = await PortalUtils.apiRequest(`/reports?${queryParams}`);
        
        displayReportsTable(response.reports);
        displayReportsPagination(response.pagination);

    } catch (error) {
        console.error('Error loading reports:', error);
        PortalUtils.handleApiError(error);
        document.getElementById('reportsTable').innerHTML = '<p class="error">Błąd podczas ładowania raportów.</p>';
    } finally {
        PortalUtils.hideLoading();
    }
}

// Display reports table
function displayReportsTable(reports) {
    const tableContainer = document.getElementById('reportsTable');
    
    if (!reports || reports.length === 0) {
        tableContainer.innerHTML = '<p class="no-data">Brak raportów do wyświetlenia.</p>';
        return;
    }

    const user = PortalUtils.getCurrentUser();
    const isAdmin = user?.role === 'administrator';
    const isCoordinator = user?.role === 'coordinator';

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Obiekt</th>
                    ${(isAdmin || isCoordinator) ? '<th>Autor</th>' : ''}
                    <th>Status</th>
                    <th>Wersja</th>
                    <th>Utworzony</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(report => `
                    <tr>
                        <td>${PortalUtils.formatDate(report.reportDate)}</td>
                        <td>${report.objectName}</td>
                        ${(isAdmin || isCoordinator) ? `<td>${report.authorName || 'Nieznany'}</td>` : ''}
                        <td><span class="status-badge status-${report.status}">${getStatusText(report.status)}</span></td>
                        <td>v${report.version}</td>
                        <td>${PortalUtils.formatDateTime(report.createdAt)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-text" onclick="viewReport('${report.id}')">Zobacz</button>
                                ${(report.authorId === user?.id || isAdmin) && report.status === 'draft' ? 
                                    `<button class="btn btn-text" onclick="editReport('${report.id}')">Edytuj</button>` : ''}
                                <button class="btn btn-text" onclick="exportReport('${report.id}')">Eksportuj</button>
                                ${report.authorId === user?.id || isAdmin ? 
                                    `<button class="btn btn-text btn-danger" onclick="deleteReport('${report.id}')">Usuń</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;
}

// Display reports pagination
function displayReportsPagination(pagination) {
    const paginationContainer = document.getElementById('reportsPagination');
    
    if (!pagination || pagination.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button ${!pagination.hasPrev ? 'disabled' : ''} 
                onclick="loadReports({page: ${pagination.page - 1}})">
            Poprzednia
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);
    
    if (startPage > 1) {
        paginationHTML += `<button onclick="loadReports({page: 1})">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button ${i === pagination.page ? 'class="active"' : ''} 
                    onclick="loadReports({page: ${i}})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            paginationHTML += '<span>...</span>';
        }
        paginationHTML += `<button onclick="loadReports({page: ${pagination.totalPages}})">${pagination.totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button ${!pagination.hasNext ? 'disabled' : ''} 
                onclick="loadReports({page: ${pagination.page + 1}})">
            Następna
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// New report functionality
async function showNewReportModal() {
    selectedEmployeeId = null;
    
    // Reset form
    const form = document.getElementById('reportForm');
    form.reset();
    
    // Set default date to today
    document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];
    
    // Load employees for selection
    await loadEmployeeOptions();
    
    // Reset employee entries
    resetEmployeeEntries();
    
    document.getElementById('reportModalTitle').textContent = 'Nowy raport';
    PortalUtils.showModal('reportModal');
}

async function loadEmployeeOptions() {
    try {
        const response = await PortalUtils.apiRequest('/employees/active');
        const employees = response.employees || [];
        
        // Update all employee select elements
        document.querySelectorAll('.employee-select').forEach(select => {
            select.innerHTML = '<option value="">Wybierz pracownika</option>' +
                employees.map(emp => 
                    `<option value="${emp.id}">${emp.fullName} ${emp.position ? `(${emp.position})` : ''}</option>`
                ).join('');
        });
        
        return employees;
    } catch (error) {
        console.error('Error loading employees:', error);
        PortalUtils.showToast('Błąd podczas ładowania listy pracowników.', 'error');
        return [];
    }
}

function resetEmployeeEntries() {
    const container = document.getElementById('employeesContainer');
    container.innerHTML = `
        <div class="employee-entry">
            <select class="employee-select" required>
                <option value="">Wybierz pracownika</option>
            </select>
            <input type="time" class="start-time" placeholder="Godz. rozpoczęcia" required>
            <input type="time" class="end-time" placeholder="Godz. zakończenia" required>
            <button type="button" class="btn btn-text remove-employee" onclick="removeEmployeeEntry(this)">Usuń</button>
        </div>
    `;
    
    // Reload employee options
    loadEmployeeOptions();
}

function addEmployeeEntry() {
    const container = document.getElementById('employeesContainer');
    const newEntry = document.createElement('div');
    newEntry.className = 'employee-entry';
    newEntry.innerHTML = `
        <select class="employee-select" required>
            <option value="">Wybierz pracownika</option>
        </select>
        <input type="time" class="start-time" placeholder="Godz. rozpoczęcia" required>
        <input type="time" class="end-time" placeholder="Godz. zakończenia" required>
        <button type="button" class="btn btn-text remove-employee" onclick="removeEmployeeEntry(this)">Usuń</button>
    `;
    
    container.appendChild(newEntry);
    
    // Load employee options for the new select
    loadEmployeeOptions();
}

function removeEmployeeEntry(button) {
    const entry = button.closest('.employee-entry');
    const container = document.getElementById('employeesContainer');
    
    // Don't remove if it's the last entry
    if (container.children.length > 1) {
        entry.remove();
    } else {
        PortalUtils.showToast('Musi być co najmniej jeden pracownik.', 'warning');
    }
}

// Handle report form submission
async function handleReportSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    
    if (!PortalUtils.validateForm(form)) {
        PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
        return;
    }

    // Collect employee data
    const employeeEntries = document.querySelectorAll('.employee-entry');
    const employees = [];
    
    for (const entry of employeeEntries) {
        const employeeId = entry.querySelector('.employee-select').value;
        const startTime = entry.querySelector('.start-time').value;
        const endTime = entry.querySelector('.end-time').value;
        
        if (!employeeId || !startTime || !endTime) {
            PortalUtils.showToast('Wypełnij wszystkie pola dla każdego pracownika.', 'warning');
            return;
        }
        
        // Validate time range
        if (startTime >= endTime) {
            PortalUtils.showToast('Czas zakończenia musi być późniejszy niż rozpoczęcia.', 'warning');
            return;
        }
        
        employees.push({
            employeeId,
            startTime,
            endTime
        });
    }

    // Prepare form data for submission
    const formData = new FormData();
    formData.append('reportDate', form.reportDate.value);
    formData.append('objectName', form.objectName.value);
    formData.append('workPerformed', form.workPerformed.value);
    formData.append('notesProblems', form.notesProblems.value);
    formData.append('employees', JSON.stringify(employees));
    
    // Add files
    const files = form.files.files;
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
        PortalUtils.showLoading();
        
        const endpoint = selectedEmployeeId ? `/reports/${selectedEmployeeId}` : '/reports';
        const method = selectedEmployeeId ? 'PUT' : 'POST';
        
        const response = await PortalUtils.apiRequest(endpoint, {
            method,
            body: formData
        });

        PortalUtils.hideModal('reportModal');
        PortalUtils.showToast(
            selectedEmployeeId ? 'Raport został zaktualizowany pomyślnie.' : 'Raport został utworzony pomyślnie.',
            'success'
        );
        
        // Reload reports list
        await loadReports();
        
        // Send email notification (for new reports)
        if (!selectedEmployeeId) {
            sendReportNotification(response.report);
        }
        
    } catch (error) {
        console.error('Error saving report:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// View report details
async function viewReport(reportId) {
    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest(`/reports/${reportId}`);
        const report = response.report;
        
        showReportDetailsModal(report);
        
    } catch (error) {
        console.error('Error loading report details:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

function showReportDetailsModal(report) {
    const modalHTML = `
        <div id="reportDetailsModal" class="modal active">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Szczegóły raportu</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="report-details">
                        <div class="detail-group">
                            <h4>Informacje podstawowe</h4>
                            <p><strong>Data raportu:</strong> ${PortalUtils.formatDate(report.reportDate)}</p>
                            <p><strong>Autor:</strong> ${report.author?.fullName || 'Nieznany'}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${getStatusText(report.status)}</span></p>
                            <p><strong>Wersja:</strong> v${report.version}</p>
                            <p><strong>Utworzony:</strong> ${PortalUtils.formatDateTime(report.createdAt)}</p>
                        </div>
                        
                        <div class="detail-group">
                            <h4>Nazwa obiektu</h4>
                            <p>${report.objectName}</p>
                        </div>
                        
                        <div class="detail-group">
                            <h4>Wykonane prace</h4>
                            <p>${report.workPerformed}</p>
                        </div>
                        
                        ${report.notesProblems ? `
                            <div class="detail-group">
                                <h4>Uwagi/Problemy</h4>
                                <p>${report.notesProblems}</p>
                            </div>
                        ` : ''}
                        
                        ${report.employees && report.employees.length > 0 ? `
                            <div class="detail-group">
                                <h4>Współpracownicy</h4>
                                <div class="employees-list">
                                    ${report.employees.map(emp => `
                                        <div class="employee-item">
                                            <strong>${emp.fullName}</strong>
                                            ${emp.position ? `<span>(${emp.position})</span>` : ''}
                                            <span class="work-hours">${emp.startTime} - ${emp.endTime}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${report.files && report.files.length > 0 ? `
                            <div class="detail-group">
                                <h4>Załączniki</h4>
                                <div class="files-list">
                                    ${report.files.map(file => `
                                        <div class="file-item">
                                            <a href="/uploads/${file.storedFilename}" target="_blank">
                                                ${file.originalFilename}
                                            </a>
                                            <span class="file-size">(${(file.fileSize / 1024).toFixed(1)} KB)</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeReportDetailsModal()">Zamknij</button>
                    <button class="btn btn-primary" onclick="exportReport('${report.id}')">Eksportuj</button>
                    ${(report.authorId === PortalUtils.getCurrentUser()?.id || PortalUtils.getCurrentUser()?.role === 'administrator') && report.status === 'draft' ? 
                        `<button class="btn btn-warning" onclick="editReport('${report.id}')">Edytuj</button>` : ''}
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('reportDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup close handlers
    const modal = document.getElementById('reportDetailsModal');
    modal.querySelector('.modal-close').addEventListener('click', closeReportDetailsModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReportDetailsModal();
        }
    });
}

function closeReportDetailsModal() {
    const modal = document.getElementById('reportDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Edit report
async function editReport(reportId) {
    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest(`/reports/${reportId}`);
        const report = response.report;
        
        // Fill form with report data
        selectedEmployeeId = reportId;
        document.getElementById('reportDate').value = report.reportDate;
        document.getElementById('objectName').value = report.objectName;
        document.getElementById('workPerformed').value = report.workPerformed;
        document.getElementById('notesProblems').value = report.notesProblems || '';
        
        // Setup employee entries
        await setupEmployeeEntriesForEdit(report.employees || []);
        
        document.getElementById('reportModalTitle').textContent = `Edytuj raport (v${report.version + 1})`;
        PortalUtils.showModal('reportModal');
        
        // Close details modal if open
        closeReportDetailsModal();
        
    } catch (error) {
        console.error('Error loading report for edit:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

async function setupEmployeeEntriesForEdit(employees) {
    const container = document.getElementById('employeesContainer');
    container.innerHTML = '';
    
    // Load employee options first
    await loadEmployeeOptions();
    
    if (employees.length === 0) {
        resetEmployeeEntries();
        return;
    }
    
    employees.forEach(emp => {
        const entry = document.createElement('div');
        entry.className = 'employee-entry';
        entry.innerHTML = `
            <select class="employee-select" required>
                <option value="">Wybierz pracownika</option>
            </select>
            <input type="time" class="start-time" placeholder="Godz. rozpoczęcia" required value="${emp.startTime}">
            <input type="time" class="end-time" placeholder="Godz. zakończenia" required value="${emp.endTime}">
            <button type="button" class="btn btn-text remove-employee" onclick="removeEmployeeEntry(this)">Usuń</button>
        `;
        
        container.appendChild(entry);
        
        // Set selected employee
        const select = entry.querySelector('.employee-select');
        loadEmployeeOptions().then(() => {
            select.value = emp.id;
        });
    });
}

// Export report
async function exportReport(reportId) {
    try {
        await PortalUtils.exportToExcel(`/reports/${reportId}/export`);
    } catch (error) {
        console.error('Error exporting report:', error);
        PortalUtils.handleApiError(error);
    }
}

// Export all reports
async function exportAllReports() {
    try {
        // Get current filters
        const filters = getCurrentFilters();
        
        const response = await fetch(`${API_BASE_URL}/reports/export`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PortalUtils.getAuthToken()}`
            },
            body: JSON.stringify(filters)
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `raporty_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        PortalUtils.showToast('Raporty zostały wyeksportowane pomyślnie.', 'success');
    } catch (error) {
        console.error('Error exporting all reports:', error);
        PortalUtils.handleApiError(error);
    }
}

// Delete report
async function deleteReport(reportId) {
    if (!confirm('Czy na pewno chcesz usunąć ten raport?')) {
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/reports/${reportId}`, {
            method: 'DELETE'
        });

        PortalUtils.showToast('Raport został usunięty pomyślnie.', 'success');
        
        // Reload reports list
        await loadReports();
        
    } catch (error) {
        console.error('Error deleting report:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Apply filters
function applyFilters() {
    const filters = getCurrentFilters();
    loadReports(filters);
}

function getCurrentFilters() {
    return {
        startDate: document.getElementById('startDateFilter').value || null,
        endDate: document.getElementById('endDateFilter').value || null,
        status: document.getElementById('statusFilter').value || null
    };
}

function clearFilters() {
    document.getElementById('startDateFilter').value = '';
    document.getElementById('endDateFilter').value = '';
    document.getElementById('statusFilter').value = '';
    loadReports();
}

// Send report notification
async function sendReportNotification(report) {
    try {
        // This would be handled automatically by the backend
        // But we can show a toast to let user know
        PortalUtils.showToast('Powiadomienie email zostało wysłane.', 'info');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'draft': 'Szkic',
        'submitted': 'Wysłany',
        'archived': 'Archiwalny'
    };
    return statusMap[status] || status;
}

// Setup employee module event handlers
document.addEventListener('DOMContentLoaded', function() {
    // New report button
    const newReportBtn = document.getElementById('newReportBtn');
    if (newReportBtn) {
        newReportBtn.addEventListener('click', showNewReportModal);
    }

    // Export reports button
    const exportReportsBtn = document.getElementById('exportReportsBtn');
    if (exportReportsBtn) {
        exportReportsBtn.addEventListener('click', exportAllReports);
    }

    // Report form
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Add employee button
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', addEmployeeEntry);
    }

    // Filter buttons
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
});

// Export employee functions
window.EmployeeModule = {
    loadDashboardData,
    loadReports,
    showNewReportModal,
    viewReport,
    editReport,
    deleteReport,
    exportReport,
    exportAllReports,
    addEmployeeEntry,
    removeEmployeeEntry,
    applyFilters,
    clearFilters
};