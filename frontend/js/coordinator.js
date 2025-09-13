// Portal Raportowy - Coordinator Module

// Global variables
let currentEmployeesList = [];
let selectedEmployeeForEdit = null;

// Load employees data
async function loadEmployees(filters = {}) {
    try {
        PortalUtils.showLoading();
        
        const queryParams = new URLSearchParams({
            page: filters.page || 1,
            limit: filters.limit || 50,
            ...filters
        });

        const response = await PortalUtils.apiRequest(`/employees?${queryParams}`);
        currentEmployeesList = response.employees || [];
        
        displayEmployeesTable(currentEmployeesList);

    } catch (error) {
        console.error('Error loading employees:', error);
        PortalUtils.handleApiError(error);
        document.getElementById('employeesTable').innerHTML = '<p class="error">Błąd podczas ładowania pracowników.</p>';
    } finally {
        PortalUtils.hideLoading();
    }
}

// Display employees table
function displayEmployeesTable(employees) {
    const tableContainer = document.getElementById('employeesTable');
    
    if (!employees || employees.length === 0) {
        tableContainer.innerHTML = '<p class="no-data">Brak pracowników do wyświetlenia.</p>';
        return;
    }

    const user = PortalUtils.getCurrentUser();
    const isAdmin = user?.role === 'administrator';
    const isCoordinator = user?.role === 'coordinator';

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Imię i nazwisko</th>
                    <th>Stanowisko</th>
                    <th>Email</th>
                    <th>Telefon</th>
                    <th>Status</th>
                    <th>Data dodania</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map(employee => `
                    <tr>
                        <td><strong>${employee.fullName}</strong></td>
                        <td>${employee.position || '-'}</td>
                        <td>${employee.email || '-'}</td>
                        <td>${employee.phone || '-'}</td>
                        <td>
                            <span class="status-badge ${employee.isActive ? 'status-submitted' : 'status-archived'}">
                                ${employee.isActive ? 'Aktywny' : 'Nieaktywny'}
                            </span>
                        </td>
                        <td>${PortalUtils.formatDate(employee.createdAt)}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-text" onclick="viewEmployeeWorkHistory('${employee.id}')">Historia</button>
                                ${(isAdmin || isCoordinator) ? `
                                    <button class="btn btn-text" onclick="editEmployee('${employee.id}')">Edytuj</button>
                                    ${employee.isActive ? 
                                        `<button class="btn btn-text btn-warning" onclick="deactivateEmployee('${employee.id}')">Dezaktywuj</button>` :
                                        `<button class="btn btn-text btn-success" onclick="activateEmployee('${employee.id}')">Aktywuj</button>`
                                    }
                                    ${isAdmin ? `<button class="btn btn-text btn-danger" onclick="deleteEmployee('${employee.id}')">Usuń</button>` : ''}
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = tableHTML;
}

// Show new employee modal
function showNewEmployeeModal() {
    selectedEmployeeForEdit = null;
    
    // Reset form
    const form = document.getElementById('employeeForm');
    form.reset();
    
    document.getElementById('employeeModalTitle').textContent = 'Nowy pracownik';
    PortalUtils.showModal('employeeModal');
}

// Handle employee form submission
async function handleEmployeeSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    if (!PortalUtils.validateForm(form)) {
        PortalUtils.showToast('Wypełnij wszystkie wymagane pola.', 'warning');
        return;
    }

    const employeeData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        position: formData.get('position') || null
    };

    try {
        PortalUtils.showLoading();
        
        const endpoint = selectedEmployeeForEdit ? `/employees/${selectedEmployeeForEdit}` : '/employees';
        const method = selectedEmployeeForEdit ? 'PUT' : 'POST';
        
        await PortalUtils.apiRequest(endpoint, {
            method,
            body: JSON.stringify(employeeData)
        });

        PortalUtils.hideModal('employeeModal');
        PortalUtils.showToast(
            selectedEmployeeForEdit ? 'Pracownik został zaktualizowany pomyślnie.' : 'Pracownik został utworzony pomyślnie.',
            'success'
        );
        
        // Reload employees list
        await loadEmployees();
        
    } catch (error) {
        console.error('Error saving employee:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Edit employee
async function editEmployee(employeeId) {
    try {
        PortalUtils.showLoading();
        
        const response = await PortalUtils.apiRequest(`/employees/${employeeId}`);
        const employee = response.employee;
        
        // Fill form with employee data
        selectedEmployeeForEdit = employeeId;
        document.getElementById('employeeFirstName').value = employee.firstName;
        document.getElementById('employeeLastName').value = employee.lastName;
        document.getElementById('employeeEmail').value = employee.email || '';
        document.getElementById('employeePhone').value = employee.phone || '';
        document.getElementById('employeePosition').value = employee.position || '';
        
        document.getElementById('employeeModalTitle').textContent = 'Edytuj pracownika';
        PortalUtils.showModal('employeeModal');
        
    } catch (error) {
        console.error('Error loading employee for edit:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// View employee work history
async function viewEmployeeWorkHistory(employeeId) {
    try {
        PortalUtils.showLoading();
        
        const [employeeResponse, historyResponse] = await Promise.all([
            PortalUtils.apiRequest(`/employees/${employeeId}`),
            PortalUtils.apiRequest(`/employees/${employeeId}/work-history`)
        ]);
        
        const employee = employeeResponse.employee;
        const workHistory = historyResponse.workHistory;
        
        showWorkHistoryModal(employee, workHistory);
        
    } catch (error) {
        console.error('Error loading work history:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

function showWorkHistoryModal(employee, workHistory) {
    const modalHTML = `
        <div id="workHistoryModal" class="modal active">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Historia pracy - ${employee.fullName}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="employee-info">
                        <p><strong>Stanowisko:</strong> ${employee.position || 'Nie określono'}</p>
                        <p><strong>Email:</strong> ${employee.email || 'Brak'}</p>
                        <p><strong>Telefon:</strong> ${employee.phone || 'Brak'}</p>
                    </div>
                    
                    <div class="work-history">
                        <h4>Historia raportów</h4>
                        ${workHistory && workHistory.length > 0 ? `
                            <div class="history-list">
                                ${workHistory.map(entry => `
                                    <div class="history-item">
                                        <div class="history-header">
                                            <strong>${entry.report.objectName}</strong>
                                            <span class="history-date">${PortalUtils.formatDate(entry.workDetails.workDate)}</span>
                                        </div>
                                        <p><strong>Autor raportu:</strong> ${entry.report.authorName}</p>
                                        <p><strong>Godziny pracy:</strong> ${entry.workDetails.startTime} - ${entry.workDetails.endTime}</p>
                                        <p><strong>Wykonane prace:</strong> ${entry.report.workPerformed.substring(0, 150)}${entry.report.workPerformed.length > 150 ? '...' : ''}</p>
                                        <div class="history-actions">
                                            <button class="btn btn-text" onclick="EmployeeModule.viewReport('${entry.report.id}')">Zobacz raport</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="no-data">Brak historii pracy.</p>'}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeWorkHistoryModal()">Zamknij</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('workHistoryModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup close handlers
    const modal = document.getElementById('workHistoryModal');
    modal.querySelector('.modal-close').addEventListener('click', closeWorkHistoryModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeWorkHistoryModal();
        }
    });
}

function closeWorkHistoryModal() {
    const modal = document.getElementById('workHistoryModal');
    if (modal) {
        modal.remove();
    }
}

// Activate employee
async function activateEmployee(employeeId) {
    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/employees/${employeeId}/activate`, {
            method: 'POST'
        });

        PortalUtils.showToast('Pracownik został aktywowany pomyślnie.', 'success');
        
        // Reload employees list
        await loadEmployees();
        
    } catch (error) {
        console.error('Error activating employee:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Deactivate employee
async function deactivateEmployee(employeeId) {
    if (!confirm('Czy na pewno chcesz dezaktywować tego pracownika?')) {
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/employees/${employeeId}/deactivate`, {
            method: 'POST'
        });

        PortalUtils.showToast('Pracownik został dezaktywowany pomyślnie.', 'success');
        
        // Reload employees list
        await loadEmployees();
        
    } catch (error) {
        console.error('Error deactivating employee:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Delete employee
async function deleteEmployee(employeeId) {
    if (!confirm('Czy na pewno chcesz usunąć tego pracownika? Ta operacja jest nieodwracalna.')) {
        return;
    }

    try {
        PortalUtils.showLoading();
        
        await PortalUtils.apiRequest(`/employees/${employeeId}`, {
            method: 'DELETE'
        });

        PortalUtils.showToast('Pracownik został usunięty pomyślnie.', 'success');
        
        // Reload employees list
        await loadEmployees();
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Search employees
async function searchEmployees(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        await loadEmployees();
        return;
    }

    try {
        const response = await PortalUtils.apiRequest(`/employees/search?q=${encodeURIComponent(searchTerm)}`);
        displayEmployeesTable(response.employees || []);
    } catch (error) {
        console.error('Error searching employees:', error);
        PortalUtils.handleApiError(error);
    }
}

// Setup employee search handler
function setupEmployeeSearch() {
    const searchInput = document.getElementById('employeeSearch');
    if (!searchInput) return;

    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.trim();
            searchEmployees(searchTerm);
        }, 300);
    });
}

// Export employees to Excel
async function exportEmployees() {
    try {
        PortalUtils.showLoading();
        
        // Create a simple export of employees data
        const employees = currentEmployeesList;
        
        if (employees.length === 0) {
            PortalUtils.showToast('Brak danych do eksportu.', 'warning');
            return;
        }

        // Create CSV data
        const headers = ['Imię', 'Nazwisko', 'Stanowisko', 'Email', 'Telefon', 'Status', 'Data dodania'];
        const csvData = [
            headers,
            ...employees.map(emp => [
                emp.firstName,
                emp.lastName,
                emp.position || '',
                emp.email || '',
                emp.phone || '',
                emp.isActive ? 'Aktywny' : 'Nieaktywny',
                PortalUtils.formatDate(emp.createdAt)
            ])
        ];

        const csvContent = csvData.map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pracownicy_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        PortalUtils.showToast('Lista pracowników została wyeksportowana.', 'success');
        
    } catch (error) {
        console.error('Error exporting employees:', error);
        PortalUtils.showToast('Błąd podczas eksportu danych.', 'error');
    } finally {
        PortalUtils.hideLoading();
    }
}

// Advanced reporting for coordinators
async function showAdvancedReportsModal() {
    const modalHTML = `
        <div id="advancedReportsModal" class="modal">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Zaawansowane raportowanie</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="report-filters">
                        <h4>Filtry eksportu</h4>
                        
                        <div class="filter-group">
                            <label for="exportStartDate">Data od:</label>
                            <input type="date" id="exportStartDate">
                        </div>
                        
                        <div class="filter-group">
                            <label for="exportEndDate">Data do:</label>
                            <input type="date" id="exportEndDate">
                        </div>
                        
                        <div class="filter-group">
                            <label for="exportAuthor">Autor:</label>
                            <select id="exportAuthor">
                                <option value="">Wszyscy autorzy</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="exportStatus">Status:</label>
                            <select id="exportStatus">
                                <option value="">Wszystkie statusy</option>
                                <option value="draft">Szkice</option>
                                <option value="submitted">Wysłane</option>
                                <option value="archived">Archiwalne</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="export-options">
                        <h4>Opcje eksportu</h4>
                        
                        <label>
                            <input type="checkbox" id="includeFiles" checked>
                            Uwzględnij informacje o załącznikach
                        </label>
                        
                        <label>
                            <input type="checkbox" id="includeEmployees" checked>
                            Uwzględnij listę współpracowników
                        </label>
                        
                        <label>
                            <input type="checkbox" id="includeVersions">
                            Uwzględnij wszystkie wersje raportów
                        </label>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Anuluj</button>
                    <button class="btn btn-primary" onclick="executeAdvancedExport()">Eksportuj</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('advancedReportsModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load authors for filter
    await loadAuthorsForFilter();
    
    // Setup modal handlers
    const modal = document.getElementById('advancedReportsModal');
    modal.querySelector('.modal-close').addEventListener('click', () => {
        PortalUtils.hideModal('advancedReportsModal');
    });
    
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
        PortalUtils.hideModal('advancedReportsModal');
    });
    
    PortalUtils.showModal('advancedReportsModal');
}

async function loadAuthorsForFilter() {
    try {
        // This would typically be a separate endpoint, but we'll use users
        const response = await PortalUtils.apiRequest('/users');
        const users = response.users || [];
        
        const select = document.getElementById('exportAuthor');
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.fullName || `${user.firstName} ${user.lastName}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading authors:', error);
    }
}

async function executeAdvancedExport() {
    try {
        PortalUtils.showLoading();
        
        const filters = {
            startDate: document.getElementById('exportStartDate').value || null,
            endDate: document.getElementById('exportEndDate').value || null,
            authorId: document.getElementById('exportAuthor').value || null,
            status: document.getElementById('exportStatus').value || null
        };

        // Execute export with filters
        await PortalUtils.exportToExcel('/reports/export', filters);
        
        PortalUtils.hideModal('advancedReportsModal');
        
    } catch (error) {
        console.error('Error executing advanced export:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

// Generate reports summary for coordinators
async function generateReportsSummary() {
    try {
        PortalUtils.showLoading();
        
        const [reportsResponse, employeesResponse] = await Promise.all([
            PortalUtils.apiRequest('/reports?limit=1000'), // Get all reports for summary
            PortalUtils.apiRequest('/employees/stats')
        ]);
        
        const reports = reportsResponse.reports || [];
        const employeesStats = employeesResponse.stats || {};
        
        showReportsSummaryModal(reports, employeesStats);
        
    } catch (error) {
        console.error('Error generating reports summary:', error);
        PortalUtils.handleApiError(error);
    } finally {
        PortalUtils.hideLoading();
    }
}

function showReportsSummaryModal(reports, employeesStats) {
    // Calculate summary statistics
    const stats = calculateReportsStatistics(reports);
    
    const modalHTML = `
        <div id="reportsSummaryModal" class="modal active">
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>Podsumowanie raportów</h3>
                    <button class="modal-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="summary-cards">
                        <div class="summary-card">
                            <h4>Wszystkie raporty</h4>
                            <div class="summary-number">${stats.total}</div>
                        </div>
                        
                        <div class="summary-card">
                            <h4>W tym miesiącu</h4>
                            <div class="summary-number">${stats.thisMonth}</div>
                        </div>
                        
                        <div class="summary-card">
                            <h4>Szkice</h4>
                            <div class="summary-number">${stats.drafts}</div>
                        </div>
                        
                        <div class="summary-card">
                            <h4>Wysłane</h4>
                            <div class="summary-number">${stats.submitted}</div>
                        </div>
                    </div>
                    
                    <div class="summary-details">
                        <div class="detail-section">
                            <h4>Top autorzy raportów</h4>
                            <div class="authors-list">
                                ${stats.topAuthors.map(author => `
                                    <div class="author-item">
                                        <span>${author.name}</span>
                                        <span class="author-count">${author.count} raportów</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Aktywność w ostatnich 30 dniach</h4>
                            <div class="activity-chart">
                                ${stats.last30Days.map(day => `
                                    <div class="activity-day">
                                        <div class="day-date">${day.date}</div>
                                        <div class="day-count">${day.count}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeReportsSummaryModal()">Zamknij</button>
                    <button class="btn btn-primary" onclick="exportSummaryReport()">Eksportuj podsumowanie</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('reportsSummaryModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup close handlers
    const modal = document.getElementById('reportsSummaryModal');
    modal.querySelector('.modal-close').addEventListener('click', closeReportsSummaryModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeReportsSummaryModal();
        }
    });
}

function calculateReportsStatistics(reports) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const stats = {
        total: reports.length,
        thisMonth: 0,
        drafts: 0,
        submitted: 0,
        archived: 0,
        topAuthors: {},
        last30Days: []
    };
    
    // Count by status and date
    reports.forEach(report => {
        const reportDate = new Date(report.createdAt);
        
        if (reportDate >= thisMonth) {
            stats.thisMonth++;
        }
        
        stats[report.status] = (stats[report.status] || 0) + 1;
        
        // Count by author
        const authorName = report.authorName || 'Nieznany';
        stats.topAuthors[authorName] = (stats.topAuthors[authorName] || 0) + 1;
    });
    
    // Convert top authors to array and sort
    stats.topAuthors = Object.entries(stats.topAuthors)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    // Generate last 30 days activity (simplified)
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayReports = reports.filter(report => {
            const reportDate = new Date(report.createdAt);
            return reportDate.toDateString() === date.toDateString();
        });
        
        stats.last30Days.push({
            date: date.getDate().toString(),
            count: dayReports.length
        });
    }
    
    return stats;
}

function closeReportsSummaryModal() {
    const modal = document.getElementById('reportsSummaryModal');
    if (modal) {
        modal.remove();
    }
}

// Setup coordinator module event handlers
document.addEventListener('DOMContentLoaded', function() {
    // New employee button
    const newEmployeeBtn = document.getElementById('newEmployeeBtn');
    if (newEmployeeBtn) {
        newEmployeeBtn.addEventListener('click', showNewEmployeeModal);
    }

    // Employee form
    const employeeForm = document.getElementById('employeeForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleEmployeeSubmit);
    }

    // Employee search
    setupEmployeeSearch();

    // Add advanced reports button to reports section for coordinators
    const user = PortalUtils.getCurrentUser();
    if (user && (user.role === 'coordinator' || user.role === 'administrator')) {
        addAdvancedReportingButtons();
    }
});

function addAdvancedReportingButtons() {
    const reportsSection = document.getElementById('reportsSection');
    const sectionActions = reportsSection?.querySelector('.section-actions');
    
    if (sectionActions) {
        // Add advanced reports button
        const advancedBtn = document.createElement('button');
        advancedBtn.className = 'btn btn-secondary';
        advancedBtn.textContent = 'Zaawansowany eksport';
        advancedBtn.addEventListener('click', showAdvancedReportsModal);
        sectionActions.appendChild(advancedBtn);
        
        // Add summary button
        const summaryBtn = document.createElement('button');
        summaryBtn.className = 'btn btn-secondary';
        summaryBtn.textContent = 'Podsumowanie';
        summaryBtn.addEventListener('click', generateReportsSummary);
        sectionActions.appendChild(summaryBtn);
    }
}

// Export coordinator functions
window.CoordinatorModule = {
    loadEmployees,
    showNewEmployeeModal,
    editEmployee,
    viewEmployeeWorkHistory,
    activateEmployee,
    deactivateEmployee,
    deleteEmployee,
    searchEmployees,
    exportEmployees,
    showAdvancedReportsModal,
    generateReportsSummary
};