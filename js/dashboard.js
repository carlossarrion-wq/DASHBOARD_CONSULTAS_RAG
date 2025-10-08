// RAG Query Monitoring Dashboard - Main Logic
// This file contains the main dashboard logic with sample data

// Global variables
let allUsers = [];
let usersByTeam = {};
let userNames = {};
let userMetrics = {};
let teamMetrics = {};
let isConnected = false;

// Pagination variables
let userQueryCurrentPage = 1;
let userQueryPageSize = 10;
let userQueryTotalCount = 0;
let allUserQueryData = [];

let teamUsersCurrentPage = 1;
let teamUsersPageSize = 10;
let teamUsersTotalCount = 0;
let allTeamUsersData = [];

let requestsDetailsCurrentPage = 1;
let requestsDetailsPageSize = 10;
let requestsDetailsTotalCount = 0;
let allRequestsDetailsData = [];

let queryLogsCurrentPage = 1;
let queryLogsPageSize = 15;
let queryLogsTotalCount = 0;
let allQueryLogsData = [];
let filteredQueryLogsData = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing RAG Query Monitoring Dashboard...');
    loadDashboardData();
});

// Connection status management
function updateConnectionStatus(status, message) {
    const indicator = document.getElementById('connection-status');
    indicator.className = `connection-status ${status}`;
    
    switch(status) {
        case 'connected':
            indicator.innerHTML = '🟢 ' + (message || 'Connected to Data Source');
            break;
        case 'disconnected':
            indicator.innerHTML = '🔴 ' + (message || 'Disconnected from Data Source');
            break;
    }
}

// Tab management
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Activate selected button
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => {
        if (button.getAttribute('onclick').includes(tabId)) {
            button.classList.add('active');
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        updateConnectionStatus('connected', 'Loading data...');
        
        // Get data from data service
        const userData = await window.dataService.getUsers();
        allUsers = userData.allUsers;
        usersByTeam = userData.usersByTeam;
        userNames = userData.userNames;
        
        userMetrics = await window.dataService.getUserMetrics();
        teamMetrics = await window.dataService.getTeamMetrics();
        
        // Load all sections
        await loadUserRequestsTab();
        await loadTeamRequestsTab();
        await loadRequestsDetailsTab();
        await loadRequestsHistoryTab();
        
        isConnected = true;
        updateConnectionStatus('connected', 'Data loaded successfully');
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        updateConnectionStatus('disconnected', 'Failed to load data');
    }
}

// ========== USER REQUESTS TAB ==========

async function loadUserRequestsTab() {
    console.log('📊 Loading User Requests tab...');
    
    // Update metrics
    updateUserMetrics();
    
    // Load hourly histogram
    const hourlyData = await window.dataService.getHourlyMetrics();
    window.charts.updateHourlyHistogramChart(hourlyData);
    
    // Load user distribution
    const userDistribution = {};
    allUsers.forEach(user => {
        const dailyData = userMetrics[user]?.daily || [];
        userDistribution[user] = dailyData[10] || 0; // Today's data
    });
    window.charts.updateUserDistributionHistogram(userDistribution);
    
    // Load user daily chart
    loadUserDailyChart();
    
    // Load model usage distribution
    const modelUsage = await window.dataService.getModelUsage();
    window.charts.updateModelUsageDistributionChart(modelUsage);
    
    // Load user query table with pagination
    await loadUserQueryTableWithPagination();
    
    // Update alerts
    updateUserAlerts();
}

function updateUserMetrics() {
    let totalQueriesToday = 0;
    let activeUsersToday = 0;
    let totalResponseTime = 0;
    let activeUserCount = 0;
    
    allUsers.forEach(user => {
        const dailyData = userMetrics[user]?.daily || [];
        const todayQueries = dailyData[10] || 0;
        const responseTime = userMetrics[user]?.avgResponseTime || 0;
        
        totalQueriesToday += todayQueries;
        if (todayQueries > 0) {
            activeUsersToday++;
            totalResponseTime += responseTime;
            activeUserCount++;
        }
    });
    
    const avgQueriesPerUser = activeUsersToday > 0 ? Math.round(totalQueriesToday / activeUsersToday) : 0;
    const avgResponseTime = activeUserCount > 0 ? (totalResponseTime / activeUserCount).toFixed(2) : 0;
    
    document.getElementById('user-total-queries-today').textContent = totalQueriesToday;
    document.getElementById('user-active-users').textContent = activeUsersToday;
    document.getElementById('user-avg-queries').textContent = avgQueriesPerUser;
    document.getElementById('user-avg-response-time').textContent = avgResponseTime + 's';
    
    // Update change indicators
    document.getElementById('user-queries-change').innerHTML = '<span>↗</span> +12% vs yesterday';
    document.getElementById('user-users-change').innerHTML = '<span>↗</span> +3 active users';
    document.getElementById('user-avg-change').innerHTML = '<span>→</span> Stable';
    document.getElementById('user-response-change').innerHTML = '<span>↘</span> -0.2s faster';
}

function loadUserDailyChart() {
    const dateLabels = [];
    for (let i = 9; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        if (i === 0) {
            dateLabels.push('Today');
        } else {
            dateLabels.push(moment(date).format('D MMM'));
        }
    }
    
    const datasets = [];
    allUsers.slice(0, 5).forEach((user, index) => {
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const chartData = dailyData.slice(1, 11); // Last 10 days
        
        datasets.push({
            label: user.split('@')[0],
            data: chartData,
            borderColor: CHART_COLORS.primary[index],
            backgroundColor: CHART_COLORS.primary[index] + '33',
            tension: 0.4,
            fill: true
        });
    });
    
    window.charts.updateUserDailyChart({
        labels: dateLabels,
        datasets: datasets
    });
}

async function loadUserQueryTableWithPagination() {
    allUserQueryData = [];
    
    allUsers.forEach(user => {
        const name = userNames[user] || 'Unknown';
        let team = 'Unknown';
        for (const t in usersByTeam) {
            if (usersByTeam[t].includes(user)) {
                team = t;
                break;
            }
        }
        
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const dailyTotal = dailyData[10] || 0;
        const monthlyTotal = userMetrics[user]?.monthly || 0;
        const avgResponseTime = userMetrics[user]?.avgResponseTime || 0;
        
        const dailyLimit = DEFAULT_QUOTA_CONFIG.users.default.daily_limit;
        const monthlyLimit = DEFAULT_QUOTA_CONFIG.users.default.monthly_limit;
        
        const dailyPercentage = Math.round((dailyTotal / dailyLimit) * 100);
        const monthlyPercentage = Math.round((monthlyTotal / monthlyLimit) * 100);
        
        allUserQueryData.push({
            user,
            name,
            team,
            dailyTotal,
            dailyLimit,
            dailyPercentage,
            monthlyTotal,
            monthlyLimit,
            monthlyPercentage,
            avgResponseTime
        });
    });
    
    userQueryTotalCount = allUserQueryData.length;
    userQueryCurrentPage = 1;
    renderUserQueryPage();
}

function renderUserQueryPage() {
    const tableBody = document.querySelector('#user-query-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (userQueryCurrentPage - 1) * userQueryPageSize;
    const endIndex = Math.min(startIndex + userQueryPageSize, userQueryTotalCount);
    const pageData = allUserQueryData.slice(startIndex, endIndex);
    
    pageData.forEach(data => {
        tableBody.innerHTML += `
            <tr>
                <td>${data.user}</td>
                <td>${data.name}</td>
                <td>${data.team}</td>
                <td>${data.dailyTotal}</td>
                <td>${data.dailyLimit}</td>
                <td>${window.createPercentageIndicator(data.dailyPercentage)}</td>
                <td>${data.monthlyTotal}</td>
                <td>${data.monthlyLimit}</td>
                <td>${window.createPercentageIndicator(data.monthlyPercentage)}</td>
                <td>${data.avgResponseTime.toFixed(2)}s</td>
            </tr>
        `;
    });
    
    updateUserQueryPaginationInfo();
}

function updateUserQueryPaginationInfo() {
    const startIndex = (userQueryCurrentPage - 1) * userQueryPageSize;
    const endIndex = Math.min(startIndex + userQueryPageSize, userQueryTotalCount);
    const totalPages = Math.ceil(userQueryTotalCount / userQueryPageSize);
    
    document.getElementById('user-query-info').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${userQueryTotalCount} users`;
    document.getElementById('user-query-page-info').textContent = 
        `Page ${userQueryCurrentPage} of ${totalPages}`;
    
    document.getElementById('prev-user-query-btn').disabled = userQueryCurrentPage <= 1;
    document.getElementById('next-user-query-btn').disabled = userQueryCurrentPage >= totalPages;
}

function loadPreviousUserQueryPage() {
    if (userQueryCurrentPage > 1) {
        userQueryCurrentPage--;
        renderUserQueryPage();
    }
}

function loadNextUserQueryPage() {
    const totalPages = Math.ceil(userQueryTotalCount / userQueryPageSize);
    if (userQueryCurrentPage < totalPages) {
        userQueryCurrentPage++;
        renderUserQueryPage();
    }
}

function updateUserAlerts() {
    const alertsContainer = document.getElementById('user-alerts-container');
    alertsContainer.innerHTML = `
        <div class="alert info">
            <strong>System Status:</strong> Monitoring ${allUsers.length} users across ${ALL_TEAMS.length} teams
        </div>
    `;
    
    // Check for high usage users
    const highUsageUsers = allUserQueryData.filter(u => u.dailyPercentage >= 80);
    
    if (highUsageUsers.length > 0) {
        highUsageUsers.forEach(user => {
            const alertClass = user.dailyPercentage > 90 ? 'critical' : 'warning';
            alertsContainer.innerHTML += `
                <div class="alert ${alertClass}">
                    <strong>${user.dailyPercentage > 90 ? 'Critical' : 'Warning'}:</strong> 
                    ${user.user} (${user.name}) is at ${user.dailyPercentage}% of daily limit
                </div>
            `;
        });
    }
}

// ========== TEAM REQUESTS TAB ==========

async function loadTeamRequestsTab() {
    console.log('📊 Loading Team Requests tab...');
    
    // Load team monthly chart
    loadTeamMonthlyChart();
    
    // Load team daily chart
    loadTeamDailyChart();
    
    // Load team query table
    loadTeamQueryTable();
    
    // Load team users table with pagination
    await loadTeamUsersTableWithPagination();
    
    // Update team alerts
    updateTeamAlerts();
}

function loadTeamMonthlyChart() {
    const labels = [];
    const data = [];
    
    ALL_TEAMS.forEach(team => {
        labels.push(team);
        data.push(teamMetrics[team]?.monthly || 0);
    });
    
    window.charts.updateTeamMonthlyChart({
        labels: labels,
        datasets: [{
            label: 'Monthly Queries',
            data: data,
            backgroundColor: CHART_COLORS.teams,
            borderWidth: 1
        }]
    });
}

function loadTeamDailyChart() {
    const dateLabels = [];
    for (let i = 9; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        if (i === 0) {
            dateLabels.push('Today');
        } else {
            dateLabels.push(moment(date).format('D MMM'));
        }
    }
    
    const datasets = [];
    ALL_TEAMS.forEach((team, index) => {
        const dailyData = teamMetrics[team]?.daily || Array(11).fill(0);
        const chartData = dailyData.slice(1, 11);
        
        datasets.push({
            label: team,
            data: chartData,
            borderColor: CHART_COLORS.teams[index],
            backgroundColor: CHART_COLORS.teams[index] + '33',
            tension: 0.4,
            fill: true
        });
    });
    
    window.charts.updateTeamDailyChart({
        labels: dateLabels,
        datasets: datasets
    });
}

function loadTeamQueryTable() {
    const tableBody = document.querySelector('#team-query-table tbody');
    tableBody.innerHTML = '';
    
    ALL_TEAMS.forEach(team => {
        const dailyData = teamMetrics[team]?.daily || Array(11).fill(0);
        const dailyTotal = dailyData[10] || 0;
        const monthlyTotal = teamMetrics[team]?.monthly || 0;
        const avgResponseTime = teamMetrics[team]?.avgResponseTime || 0;
        
        const monthlyLimit = DEFAULT_QUOTA_CONFIG.teams.default.monthly_limit;
        const dailyLimit = Math.round(monthlyLimit / 30);
        
        const dailyPercentage = Math.round((dailyTotal / dailyLimit) * 100);
        const monthlyPercentage = Math.round((monthlyTotal / monthlyLimit) * 100);
        
        tableBody.innerHTML += `
            <tr>
                <td>${team}</td>
                <td>${dailyTotal}</td>
                <td>${window.createPercentageIndicator(dailyPercentage)}</td>
                <td>${monthlyTotal}</td>
                <td>${window.createPercentageIndicator(monthlyPercentage)}</td>
                <td>${avgResponseTime.toFixed(2)}s</td>
            </tr>
        `;
    });
}

async function loadTeamUsersTableWithPagination() {
    allTeamUsersData = [];
    
    ALL_TEAMS.forEach(team => {
        const teamUsers = usersByTeam[team] || [];
        const teamTotal = teamMetrics[team]?.monthly || 0;
        
        teamUsers.forEach(user => {
            const name = userNames[user] || 'Unknown';
            const monthlyQueries = userMetrics[user]?.monthly || 0;
            const percentage = teamTotal > 0 ? Math.round((monthlyQueries / teamTotal) * 100) : 0;
            
            allTeamUsersData.push({
                user,
                name,
                team,
                monthlyQueries,
                percentage
            });
        });
    });
    
    teamUsersTotalCount = allTeamUsersData.length;
    teamUsersCurrentPage = 1;
    renderTeamUsersPage();
}

function renderTeamUsersPage() {
    const tableBody = document.querySelector('#team-users-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (teamUsersCurrentPage - 1) * teamUsersPageSize;
    const endIndex = Math.min(startIndex + teamUsersPageSize, teamUsersTotalCount);
    const pageData = allTeamUsersData.slice(startIndex, endIndex);
    
    pageData.forEach(data => {
        tableBody.innerHTML += `
            <tr>
                <td>${data.user}</td>
                <td>${data.name}</td>
                <td>${data.team}</td>
                <td>${data.monthlyQueries}</td>
                <td>${data.percentage}%</td>
            </tr>
        `;
    });
    
    updateTeamUsersPaginationInfo();
}

function updateTeamUsersPaginationInfo() {
    const startIndex = (teamUsersCurrentPage - 1) * teamUsersPageSize;
    const endIndex = Math.min(startIndex + teamUsersPageSize, teamUsersTotalCount);
    const totalPages = Math.ceil(teamUsersTotalCount / teamUsersPageSize);
    
    document.getElementById('team-users-info').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${teamUsersTotalCount} users`;
    document.getElementById('team-users-page-info').textContent = 
        `Page ${teamUsersCurrentPage} of ${totalPages}`;
    
    document.getElementById('prev-team-users-btn').disabled = teamUsersCurrentPage <= 1;
    document.getElementById('next-team-users-btn').disabled = teamUsersCurrentPage >= totalPages;
}

function loadPreviousTeamUsersPage() {
    if (teamUsersCurrentPage > 1) {
        teamUsersCurrentPage--;
        renderTeamUsersPage();
    }
}

function loadNextTeamUsersPage() {
    const totalPages = Math.ceil(teamUsersTotalCount / teamUsersPageSize);
    if (teamUsersCurrentPage < totalPages) {
        teamUsersCurrentPage++;
        renderTeamUsersPage();
    }
}

function updateTeamAlerts() {
    const alertsContainer = document.getElementById('team-alerts-container');
    alertsContainer.innerHTML = `
        <div class="alert info">
            <strong>All Teams:</strong> Monitoring ${ALL_TEAMS.length} teams
        </div>
    `;
    
    // Check for high usage teams
    ALL_TEAMS.forEach(team => {
        const monthlyTotal = teamMetrics[team]?.monthly || 0;
        const monthlyLimit = DEFAULT_QUOTA_CONFIG.teams.default.monthly_limit;
        const percentage = Math.round((monthlyTotal / monthlyLimit) * 100);
        
        if (percentage >= 80) {
            const alertClass = percentage > 90 ? 'critical' : 'warning';
            alertsContainer.innerHTML += `
                <div class="alert ${alertClass}">
                    <strong>${percentage > 90 ? 'Critical' : 'Warning'}:</strong> 
                    ${team} has reached ${percentage}% of monthly limit
                </div>
            `;
        }
    });
}

// ========== REQUESTS DETAILS TAB ==========

async function loadRequestsDetailsTab() {
    console.log('📊 Loading Requests Details tab...');
    
    // Update date headers
    updateRequestsDetailsHeaders();
    
    // Load daily trend chart
    loadDailyTrendChart();
    
    // Load requests details table with pagination
    await loadRequestsDetailsTableWithPagination();
    
    // Load model usage table
    loadModelUsageTable();
    
    // Load model consumption evolution
    loadModelConsumptionEvolution();
    
    // Load response time evolution
    loadResponseTimeEvolution();
}

function updateRequestsDetailsHeaders() {
    for (let i = 0; i < 10; i++) {
        const date = new Date();
        const daysBack = 9 - i;
        date.setDate(date.getDate() - daysBack);
        
        const headerElement = document.getElementById(`day-${daysBack}`);
        if (headerElement) {
            if (daysBack === 0) {
                headerElement.textContent = 'Today';
            } else {
                headerElement.textContent = moment(date).format('D MMM');
            }
        }
    }
}

function loadDailyTrendChart() {
    const dailyTotals = Array(10).fill(0);
    
    allUsers.forEach(user => {
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        for (let i = 0; i < 10; i++) {
            dailyTotals[i] += dailyData[i + 1] || 0;
        }
    });
    
    window.charts.updateRequestsDetailsChart(dailyTotals);
}

async function loadRequestsDetailsTableWithPagination() {
    allRequestsDetailsData = [];
    
    allUsers.forEach(user => {
        const name = userNames[user] || 'Unknown';
        let team = 'Unknown';
        for (const t in usersByTeam) {
            if (usersByTeam[t].includes(user)) {
                team = t;
                break;
            }
        }
        
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const last10Days = dailyData.slice(1, 11);
        
        allRequestsDetailsData.push({
            user,
            name,
            team,
            dailyData: last10Days
        });
    });
    
    requestsDetailsTotalCount = allRequestsDetailsData.length;
    requestsDetailsCurrentPage = 1;
    renderRequestsDetailsPage();
}

function renderRequestsDetailsPage() {
    const tableBody = document.querySelector('#requests-details-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (requestsDetailsCurrentPage - 1) * requestsDetailsPageSize;
    const endIndex = Math.min(startIndex + requestsDetailsPageSize, requestsDetailsTotalCount);
    const pageData = allRequestsDetailsData.slice(startIndex, endIndex);
    
    pageData.forEach(data => {
        let rowHtml = `
            <tr>
                <td>${data.user}</td>
                <td>${data.name}</td>
                <td>${data.team}</td>
        `;
        
        data.dailyData.forEach(queries => {
            rowHtml += `<td>${queries}</td>`;
        });
        
        rowHtml += '</tr>';
        tableBody.innerHTML += rowHtml;
    });
    
    updateRequestsDetailsPaginationInfo();
}

function updateRequestsDetailsPaginationInfo() {
    const startIndex = (requestsDetailsCurrentPage - 1) * requestsDetailsPageSize;
    const endIndex = Math.min(startIndex + requestsDetailsPageSize, requestsDetailsTotalCount);
    const totalPages = Math.ceil(requestsDetailsTotalCount / requestsDetailsPageSize);
    
    document.getElementById('requests-details-info').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${requestsDetailsTotalCount} users`;
    document.getElementById('requests-details-page-info').textContent = 
        `Page ${requestsDetailsCurrentPage} of ${totalPages}`;
    
    document.getElementById('prev-requests-details-btn').disabled = requestsDetailsCurrentPage <= 1;
    document.getElementById('next-requests-details-btn').disabled = requestsDetailsCurrentPage >= totalPages;
}

function loadPreviousRequestsDetailsPage() {
    if (requestsDetailsCurrentPage > 1) {
        requestsDetailsCurrentPage--;
        renderRequestsDetailsPage();
    }
}

function loadNextRequestsDetailsPage() {
    const totalPages = Math.ceil(requestsDetailsTotalCount / requestsDetailsPageSize);
    if (requestsDetailsCurrentPage < totalPages) {
        requestsDetailsCurrentPage++;
        renderRequestsDetailsPage();
    }
}

function loadModelUsageTable() {
    const tableBody = document.querySelector('#model-usage-table tbody');
    tableBody.innerHTML = '';
    
    // Define models
    const models = [
        'eu.anthropic.claude-sonnet-4-20250514-v1:0',
        'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
        'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        'anthropic.claude-sonnet-4-20250514-v1:0',
        'anthropic.claude-3-sonnet-20240229-v1:0'
    ];
    
    let totalRow = Array(ALL_TEAMS.length).fill(0);
    
    // Generate data for each model (row)
    models.forEach(model => {
        let rowHtml = `<tr><td>${model}</td>`;
        let rowTotal = 0;
        
        // Generate usage for each team (column)
        ALL_TEAMS.forEach((team, index) => {
            const usage = Math.floor(Math.random() * 500);
            rowHtml += `<td>${usage}</td>`;
            rowTotal += usage;
            totalRow[index] += usage;
        });
        
        rowHtml += `<td><strong>${rowTotal}</strong></td></tr>`;
        tableBody.innerHTML += rowHtml;
    });
    
    // Add TOTAL row
    let totalRowHtml = '<tr style="font-weight: bold; background-color: #f0f0f0;"><td>TOTAL</td>';
    let grandTotal = 0;
    totalRow.forEach(teamTotal => {
        totalRowHtml += `<td>${teamTotal}</td>`;
        grandTotal += teamTotal;
    });
    totalRowHtml += `<td><strong>${grandTotal}</strong></td></tr>`;
    tableBody.innerHTML += totalRowHtml;
}

function loadModelConsumptionEvolution() {
    // Generate sample data for 3 main models over 10 days
    const modelData = {
        'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': [150, 180, 200, 170, 190, 210, 180, 160, 140, 120],
        'eu.anthropic.claude-sonnet-4-20250514-v1:0': [200, 220, 250, 230, 280, 300, 270, 250, 280, 300],
        'eu.anthropic.claude-sonnet-4-5-20250929-v1:0': [300, 350, 400, 380, 450, 500, 480, 520, 600, 800]
    };
    
    window.charts.updateModelConsumptionEvolutionChart(modelData);
}

function loadResponseTimeEvolution() {
    const responseTimeData = [1.5, 1.4, 1.6, 1.3, 1.2, 1.4, 1.3, 1.1, 1.2, 1.0];
    window.charts.updateResponseTimeEvolutionChart(responseTimeData);
}

// ========== REQUESTS HISTORY TAB ==========

async function loadRequestsHistoryTab() {
    console.log('📊 Loading Requests History tab...');
    
    // Generate sample query logs data
    generateQueryLogsData();
    
    // Populate filter dropdowns
    populateFilterDropdowns();
    
    // Load query logs table with pagination
    await loadQueryLogsTableWithPagination();
}

function generateQueryLogsData() {
    allQueryLogsData = [];
    
    const models = [
        'eu.anthropic.claude-sonnet-4-20250514-v1:0',
        'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
        'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        'anthropic.claude-sonnet-4-20250514-v1:0',
        'anthropic.claude-3-sonnet-20240229-v1:0'
    ];
    
    const knowledgeBases = [
        'KB-Technical-Docs',
        'KB-Product-Info',
        'KB-Customer-Support',
        'KB-Internal-Wiki',
        'KB-Training-Materials'
    ];
    
    const sampleQueries = [
        '¿Cómo puedo configurar el sistema de autenticación?',
        '¿Cuáles son las mejores prácticas para optimizar consultas?',
        'Explica el proceso de deployment en producción',
        '¿Qué documentación existe sobre la API REST?',
        'Necesito información sobre los requisitos de seguridad',
        '¿Cómo se integra con servicios externos?',
        'Describe el flujo de trabajo de aprobaciones',
        '¿Qué métricas de rendimiento debemos monitorear?',
        'Explica la arquitectura del sistema',
        '¿Cómo se gestionan los errores y excepciones?',
        'Información sobre políticas de backup',
        '¿Cuál es el proceso de onboarding para nuevos usuarios?',
        'Detalles sobre la configuración de red',
        '¿Cómo funciona el sistema de notificaciones?',
        'Requisitos para la migración de datos'
    ];
    
    const sampleResponses = [
        'Para configurar el sistema de autenticación, primero debes acceder al panel de administración y seguir los pasos de configuración OAuth2. Asegúrate de tener los permisos necesarios.',
        'Las mejores prácticas incluyen: usar índices apropiados, limitar el tamaño de los resultados, implementar caché cuando sea posible, y monitorear el rendimiento regularmente.',
        'El proceso de deployment incluye: 1) Validación de código, 2) Pruebas automatizadas, 3) Staging deployment, 4) Validación en staging, 5) Production deployment con rollback plan.',
        'La documentación de la API REST está disponible en el portal de desarrolladores. Incluye endpoints, métodos HTTP, parámetros requeridos, y ejemplos de respuesta.',
        'Los requisitos de seguridad incluyen: autenticación multifactor, encriptación de datos en tránsito y reposo, auditoría de accesos, y cumplimiento con estándares ISO 27001.'
    ];
    
    // Generate 100 sample query logs
    for (let i = 0; i < 100; i++) {
        const user = allUsers[Math.floor(Math.random() * allUsers.length)];
        const name = userNames[user] || 'Unknown';
        
        let team = 'Unknown';
        for (const t in usersByTeam) {
            if (usersByTeam[t].includes(user)) {
                team = t;
                break;
            }
        }
        
        const model = models[Math.floor(Math.random() * models.length)];
        const knowledgeBase = knowledgeBases[Math.floor(Math.random() * knowledgeBases.length)];
        const userQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
        const llmResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
        const status = Math.random() > 0.1 ? 'COMPLETED' : 'ERROR';
        
        // Generate timestamp within last 30 days
        const requestDate = new Date();
        requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 30));
        requestDate.setHours(Math.floor(Math.random() * 24));
        requestDate.setMinutes(Math.floor(Math.random() * 60));
        requestDate.setSeconds(Math.floor(Math.random() * 60));
        
        // Response timestamp (a few seconds after request)
        const processingTimeMs = Math.floor(Math.random() * 3000) + 500;
        const responseDate = new Date(requestDate.getTime() + processingTimeMs);
        
        // Calculate word and character counts
        const queryWordCount = userQuery.split(/\s+/).length;
        const queryCharCount = userQuery.length;
        const responseWordCount = llmResponse.split(/\s+/).length;
        const responseCharCount = llmResponse.length;
        
        const tokensUsed = Math.floor(Math.random() * 3000) + 500;
        const retrievedDocsCount = Math.floor(Math.random() * 10) + 1;
        const vectorDbTimeMs = Math.floor(Math.random() * 500) + 100;
        const llmProcessingTimeMs = processingTimeMs - vectorDbTimeMs;
        
        const errorMessage = status === 'ERROR' ? 
            ['Timeout error', 'Rate limit exceeded', 'Invalid query format', 'Knowledge base unavailable'][Math.floor(Math.random() * 4)] : 
            null;
        
        // Generate unique IDs
        const queryId = `query-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const conversationId = `conv-${Date.now()}-${Math.floor(i / 3)}-${Math.random().toString(36).substr(2, 9)}`;
        const lambdaRequestId = `lambda-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
        const apiGatewayRequestId = `apigw-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Generate IAM details
        const iamUsername = user.split('@')[0];
        const iamUserArn = `arn:aws:iam::123456789012:user/${iamUsername}`;
        const iamGroup = team.toLowerCase().replace(/\s+/g, '-');
        
        // Generate source IP
        const sourceIp = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        
        allQueryLogsData.push({
            // Legacy fields for backward compatibility
            id: `QL-${Date.now()}-${i}`,
            timestamp: requestDate,
            user,
            name,
            team,
            model,
            knowledgeBase,
            query: userQuery,
            status,
            tokens: tokensUsed,
            responseTime: (processingTimeMs / 1000).toFixed(2),
            errorMessage,
            expanded: false,
            
            // MySQL schema fields
            query_id: queryId,
            conversation_id: conversationId,
            iam_username: iamUsername,
            iam_user_arn: iamUserArn,
            iam_group: iamGroup,
            person: name,
            user_query: userQuery,
            llm_response: status === 'COMPLETED' ? llmResponse : null,
            query_word_count: queryWordCount,
            query_char_count: queryCharCount,
            response_word_count: status === 'COMPLETED' ? responseWordCount : 0,
            response_char_count: status === 'COMPLETED' ? responseCharCount : 0,
            tokens_used: tokensUsed,
            model_id: model,
            knowledge_base_id: knowledgeBase,
            request_timestamp: requestDate.toISOString(),
            response_timestamp: responseDate.toISOString(),
            processing_time_ms: processingTimeMs,
            vector_db_time_ms: vectorDbTimeMs,
            llm_processing_time_ms: llmProcessingTimeMs,
            error_message: errorMessage,
            lambda_request_id: lambdaRequestId,
            api_gateway_request_id: apiGatewayRequestId,
            source_ip: sourceIp,
            retrieved_documents_count: retrievedDocsCount,
            retrieval_only: Math.random() > 0.9 ? 1 : 0
        });
    }
    
    // Sort by timestamp descending (most recent first)
    allQueryLogsData.sort((a, b) => b.timestamp - a.timestamp);
    
    filteredQueryLogsData = [...allQueryLogsData];
}

function populateFilterDropdowns() {
    // Populate person dropdown
    const personSelect = document.getElementById('filter-person');
    personSelect.innerHTML = '<option value="">Todos</option>';
    const uniqueUsers = [...new Set(allQueryLogsData.map(log => log.user))].sort();
    uniqueUsers.forEach(user => {
        const name = userNames[user] || user;
        personSelect.innerHTML += `<option value="${user}">${name}</option>`;
    });
    
    // Populate team dropdown
    const teamSelect = document.getElementById('filter-team');
    teamSelect.innerHTML = '<option value="">Todos</option>';
    ALL_TEAMS.forEach(team => {
        teamSelect.innerHTML += `<option value="${team}">${team}</option>`;
    });
    
    // Populate model dropdown
    const modelSelect = document.getElementById('filter-model');
    modelSelect.innerHTML = '<option value="">Todos</option>';
    const uniqueModels = [...new Set(allQueryLogsData.map(log => log.model))].sort();
    uniqueModels.forEach(model => {
        modelSelect.innerHTML += `<option value="${model}">${model}</option>`;
    });
    
    // Populate knowledge base dropdown
    const kbSelect = document.getElementById('filter-kb');
    kbSelect.innerHTML = '<option value="">Todos</option>';
    const uniqueKBs = [...new Set(allQueryLogsData.map(log => log.knowledgeBase))].sort();
    uniqueKBs.forEach(kb => {
        kbSelect.innerHTML += `<option value="${kb}">${kb}</option>`;
    });
}

function applyFilters() {
    const searchText = document.getElementById('filter-search').value.toLowerCase();
    const person = document.getElementById('filter-person').value;
    const team = document.getElementById('filter-team').value;
    const model = document.getElementById('filter-model').value;
    const kb = document.getElementById('filter-kb').value;
    const status = document.getElementById('filter-status').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    filteredQueryLogsData = allQueryLogsData.filter(log => {
        // Search filter
        if (searchText && !log.query.toLowerCase().includes(searchText)) {
            return false;
        }
        
        // Person filter
        if (person && log.user !== person) {
            return false;
        }
        
        // Team filter
        if (team && log.team !== team) {
            return false;
        }
        
        // Model filter
        if (model && log.model !== model) {
            return false;
        }
        
        // Knowledge Base filter
        if (kb && log.knowledgeBase !== kb) {
            return false;
        }
        
        // Status filter
        if (status && log.status !== status) {
            return false;
        }
        
        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            if (log.timestamp < start) {
                return false;
            }
        }
        
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (log.timestamp > end) {
                return false;
            }
        }
        
        return true;
    });
    
    queryLogsCurrentPage = 1;
    renderQueryLogsPage();
}

function clearFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-person').value = '';
    document.getElementById('filter-team').value = '';
    document.getElementById('filter-model').value = '';
    document.getElementById('filter-kb').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    
    filteredQueryLogsData = [...allQueryLogsData];
    queryLogsCurrentPage = 1;
    renderQueryLogsPage();
}

async function loadQueryLogsTableWithPagination() {
    queryLogsTotalCount = filteredQueryLogsData.length;
    queryLogsCurrentPage = 1;
    renderQueryLogsPage();
}

function renderQueryLogsPage() {
    const tableBody = document.querySelector('#query-logs-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (queryLogsCurrentPage - 1) * queryLogsPageSize;
    const endIndex = Math.min(startIndex + queryLogsPageSize, filteredQueryLogsData.length);
    const pageData = filteredQueryLogsData.slice(startIndex, endIndex);
    
    pageData.forEach(log => {
        const statusClass = log.status === 'COMPLETED' ? 'status-completed' : 'status-error';
        const dateStr = moment(log.timestamp).format('DD/MM/YYYY HH:mm:ss');
        
        let rowHtml = `
            <tr id="log-row-${log.id}" style="cursor: pointer;" onclick="openQueryDetailModal('${log.id}')">
                <td>${dateStr}</td>
                <td>${log.name}</td>
                <td>${log.team}</td>
                <td class="query-cell">${log.query}</td>
                <td><span class="${statusClass}">${log.status}</span></td>
                <td>${log.tokens}</td>
                <td>${log.responseTime}s</td>
            </tr>
        `;
        
        tableBody.innerHTML += rowHtml;
    });
    
    updateQueryLogsPaginationInfo();
}

function toggleQueryDetails(logId) {
    const detailsRow = document.getElementById(`details-row-${logId}`);
    const expandIcon = document.getElementById(`expand-icon-${logId}`);
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        expandIcon.textContent = '▲';
    } else {
        detailsRow.style.display = 'none';
        expandIcon.textContent = '▼';
    }
}

function updateQueryLogsPaginationInfo() {
    const startIndex = (queryLogsCurrentPage - 1) * queryLogsPageSize;
    const endIndex = Math.min(startIndex + queryLogsPageSize, filteredQueryLogsData.length);
    const totalPages = Math.ceil(filteredQueryLogsData.length / queryLogsPageSize);
    
    document.getElementById('query-logs-info').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${filteredQueryLogsData.length} queries`;
    document.getElementById('query-logs-page-info').textContent = 
        `Page ${queryLogsCurrentPage} of ${totalPages}`;
    
    document.getElementById('prev-query-logs-btn').disabled = queryLogsCurrentPage <= 1;
    document.getElementById('next-query-logs-btn').disabled = queryLogsCurrentPage >= totalPages;
}

function loadPreviousQueryLogsPage() {
    if (queryLogsCurrentPage > 1) {
        queryLogsCurrentPage--;
        renderQueryLogsPage();
    }
}

function loadNextQueryLogsPage() {
    const totalPages = Math.ceil(filteredQueryLogsData.length / queryLogsPageSize);
    if (queryLogsCurrentPage < totalPages) {
        queryLogsCurrentPage++;
        renderQueryLogsPage();
    }
}

function refreshRequestsHistory() {
    loadRequestsHistoryTab();
}

function exportQueryLogsTable() {
    exportToCSV('query-logs-table', 'query-logs');
}

// ========== MODAL FUNCTIONS ==========

function openQueryDetailModal(logId) {
    const log = allQueryLogsData.find(l => l.id === logId);
    if (!log) return;
    
    // User Information Section
    document.getElementById('modal-query-id').textContent = log.query_id || '-';
    document.getElementById('modal-conversation-id').textContent = log.conversation_id || '-';
    document.getElementById('modal-iam-username').textContent = log.iam_username || '-';
    document.getElementById('modal-iam-user-arn').textContent = log.iam_user_arn || '-';
    document.getElementById('modal-iam-group').textContent = log.iam_group || '-';
    document.getElementById('modal-person').textContent = log.person || log.name || '-';
    document.getElementById('modal-team').textContent = log.team || '-';
    
    const statusSpan = document.getElementById('modal-status');
    statusSpan.textContent = log.status;
    statusSpan.className = log.status === 'COMPLETED' ? 'status-completed' : 'status-error';
    
    // Query and Response Section
    document.getElementById('modal-user-query').textContent = log.user_query || log.query || '-';
    document.getElementById('modal-llm-response').textContent = log.llm_response || 'No response available';
    
    // Statistics Section
    document.getElementById('modal-query-word-count').textContent = log.query_word_count || '-';
    document.getElementById('modal-query-char-count').textContent = log.query_char_count || '-';
    document.getElementById('modal-response-word-count').textContent = log.response_word_count || '-';
    document.getElementById('modal-response-char-count').textContent = log.response_char_count || '-';
    document.getElementById('modal-tokens-used').textContent = log.tokens_used || log.tokens || '-';
    document.getElementById('modal-retrieved-docs').textContent = log.retrieved_documents_count || '-';
    
    // Performance Metrics Section
    document.getElementById('modal-request-timestamp').textContent = 
        log.request_timestamp ? moment(log.request_timestamp).format('DD/MM/YYYY HH:mm:ss') : '-';
    document.getElementById('modal-response-timestamp').textContent = 
        log.response_timestamp ? moment(log.response_timestamp).format('DD/MM/YYYY HH:mm:ss') : '-';
    document.getElementById('modal-processing-time').textContent = 
        log.processing_time_ms ? `${log.processing_time_ms} ms` : '-';
    document.getElementById('modal-vector-db-time').textContent = 
        log.vector_db_time_ms ? `${log.vector_db_time_ms} ms` : '-';
    document.getElementById('modal-llm-processing-time').textContent = 
        log.llm_processing_time_ms ? `${log.llm_processing_time_ms} ms` : '-';
    document.getElementById('modal-retrieval-only').textContent = 
        log.retrieval_only ? 'Yes' : 'No';
    
    // Technical Details Section
    document.getElementById('modal-model-id').textContent = log.model_id || log.model || '-';
    document.getElementById('modal-kb-id').textContent = log.knowledge_base_id || log.knowledgeBase || '-';
    document.getElementById('modal-lambda-request-id').textContent = log.lambda_request_id || '-';
    document.getElementById('modal-api-gateway-request-id').textContent = log.api_gateway_request_id || '-';
    document.getElementById('modal-source-ip').textContent = log.source_ip || '-';
    
    // Error Section
    const errorSection = document.getElementById('modal-error-section');
    if (log.error_message || log.errorMessage) {
        errorSection.style.display = 'block';
        document.getElementById('modal-error-message').textContent = log.error_message || log.errorMessage;
    } else {
        errorSection.style.display = 'none';
    }
    
    // Show modal
    const modal = document.getElementById('query-detail-modal');
    modal.classList.add('show');
}

function closeQueryDetailModal() {
    const modal = document.getElementById('query-detail-modal');
    modal.classList.remove('show');
}

function generateConversationHistory(log) {
    const histories = [
        `=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===

Usuario: ¿Qué es ${log.knowledgeBase}?

Asistente: ${log.knowledgeBase} es un sistema de gestión de conocimiento que permite almacenar, organizar y recuperar información de manera eficiente. Se utiliza principalmente para documentación técnica, procedimientos operativos y mejores prácticas del equipo ${log.team}.

Usuario: ${log.query}

Asistente: Basándome en la información disponible en ${log.knowledgeBase}, puedo proporcionarte una respuesta detallada sobre tu consulta. Los documentos recuperados muestran que este tema está relacionado con las operaciones del equipo ${log.team} y las mejores prácticas establecidas en nuestros procedimientos estándar.`,

        `=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===

Usuario: Necesito ayuda con un problema técnico

Asistente: Por supuesto, estoy aquí para ayudarte. ¿Podrías describir el problema con más detalle?

Usuario: ${log.query}

Asistente: Entiendo tu consulta. He buscado en ${log.knowledgeBase} y encontré información relevante que puede ayudarte. Según la documentación disponible y las experiencias previas del equipo ${log.team}, hay varios enfoques que podemos considerar para resolver este problema.`,

        `=== HISTORIAL DE CONVERSACIÓN (CONTEXTO) ===

Usuario: ${log.query}

Asistente: He analizado tu consulta y he recuperado información relevante de ${log.knowledgeBase}. La documentación muestra que este es un tema importante para el equipo ${log.team}. Basándome en ${Math.floor(Math.random() * 10) + 1} documentos recuperados, puedo proporcionarte una respuesta completa que incluye procedimientos, mejores prácticas y ejemplos de implementación.`
    ];
    
    return histories[Math.floor(Math.random() * histories.length)];
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('query-detail-modal');
    if (event.target === modal) {
        closeQueryDetailModal();
    }
}

// ========== EXPORT FUNCTIONS ==========

function exportToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tr');
    let csvContent = '';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        
        cells.forEach(cell => {
            let text = cell.textContent.trim();
            if (text.includes(',')) {
                text = '"' + text + '"';
            }
            rowData.push(text);
        });
        
        csvContent += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportUserQueryTable() {
    exportToCSV('user-query-table', 'user-queries');
}

function exportTeamQueryTable() {
    exportToCSV('team-query-table', 'team-queries');
}

function exportTeamUsersTable() {
    exportToCSV('team-users-table', 'team-users');
}

function exportRequestsDetailsTable() {
    exportToCSV('requests-details-table', 'requests-details');
}

function exportModelUsageTable() {
    exportToCSV('model-usage-table', 'model-usage');
}

// ========== UTILITY FUNCTIONS ==========

function refreshRequestsDetails() {
    loadRequestsDetailsTab();
}

function logout() {
    alert('Logout functionality - implement your authentication logic here');
}

// Make functions globally available
window.showTab = showTab;
window.loadDashboardData = loadDashboardData;
window.loadPreviousUserQueryPage = loadPreviousUserQueryPage;
window.loadNextUserQueryPage = loadNextUserQueryPage;
window.loadPreviousTeamUsersPage = loadPreviousTeamUsersPage;
window.loadNextTeamUsersPage = loadNextTeamUsersPage;
window.loadPreviousRequestsDetailsPage = loadPreviousRequestsDetailsPage;
window.loadNextRequestsDetailsPage = loadNextRequestsDetailsPage;
window.exportUserQueryTable = exportUserQueryTable;
window.exportTeamQueryTable = exportTeamQueryTable;
window.exportTeamUsersTable = exportTeamUsersTable;
window.exportRequestsDetailsTable = exportRequestsDetailsTable;
window.exportModelUsageTable = exportModelUsageTable;
window.refreshRequestsDetails = refreshRequestsDetails;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.refreshRequestsHistory = refreshRequestsHistory;
window.toggleQueryDetails = toggleQueryDetails;
window.loadPreviousQueryLogsPage = loadPreviousQueryLogsPage;
window.loadNextQueryLogsPage = loadNextQueryLogsPage;
window.exportQueryLogsTable = exportQueryLogsTable;
window.openQueryDetailModal = openQueryDetailModal;
window.closeQueryDetailModal = closeQueryDetailModal;
window.logout = logout;

console.log('✅ Dashboard initialized successfully');
