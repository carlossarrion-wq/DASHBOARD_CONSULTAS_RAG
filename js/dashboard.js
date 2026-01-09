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

let trustByTeamCurrentPage = 1;
let trustByTeamPageSize = 10;
let trustByTeamTotalCount = 0;
let allTrustByTeamData = [];

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
    
    // Auto-load Trust Details when tab is shown
    if (tabId === 'trust-details') {
        refreshTrustDetails();
    }
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
        
        const metricsData = await window.dataService.getUserMetrics();
        userMetrics = metricsData.userMetrics || {};
        const hourlyDataToday = metricsData.hourlyDataToday || Array(24).fill(0);
        
        // Store hourly data globally for use in loadUserRequestsTab
        window.hourlyDataToday = hourlyDataToday;
        
        teamMetrics = await window.dataService.getTeamMetrics();
        
        // Load all sections
        await loadUserRequestsTab();
        await loadTeamRequestsTab();
        await loadRequestsDetailsTab();
        await loadRequestsHistoryTab();
        await loadTrustDetailsTab();
        
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
    
    // Load hourly histogram - use data from getUserMetrics (already calculated)
    const hourlyData = window.hourlyDataToday || Array(24).fill(0);
    window.charts.updateHourlyHistogramChart(hourlyData);
    
    // Load user distribution - use same data as User Query Details table (daily queries from userMetrics)
    const userDistribution = {};
    
    // Use the same daily data that's shown in the User Query Details table
    Object.keys(userMetrics).forEach(user => {
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const dailyTotal = dailyData[10] || 0; // Today's queries (index 10 = today)
        
        if (dailyTotal > 0) {
            userDistribution[user] = dailyTotal;
        }
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

async function updateUserMetrics() {
    try {
        // Get real data from query logs for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Filter logs for today
        const todayLogs = queryLogs.filter(log => {
            const logDate = new Date(log.request_timestamp);
            return logDate >= today && logDate < tomorrow;
        });
        
        // Calculate metrics
        let totalQueriesToday = todayLogs.length;
        const activeUsersSet = new Set();
        let totalResponseTime = 0;
        
        todayLogs.forEach(log => {
            if (log.person) {
                activeUsersSet.add(log.person);
            }
            if (log.processing_time_ms) {
                totalResponseTime += log.processing_time_ms;
            }
        });
        
        const activeUsersToday = activeUsersSet.size;
        const avgQueriesPerUser = activeUsersToday > 0 ? Math.round(totalQueriesToday / activeUsersToday) : 0;
        const avgResponseTime = totalQueriesToday > 0 ? (totalResponseTime / totalQueriesToday / 1000).toFixed(2) : 0;
        
        document.getElementById('user-total-queries-today').textContent = totalQueriesToday;
        document.getElementById('user-active-users').textContent = activeUsersToday;
        document.getElementById('user-avg-queries').textContent = avgQueriesPerUser;
        document.getElementById('user-avg-response-time').textContent = avgResponseTime + 's';
        
        // Calculate change indicators based on yesterday's data
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayLogs = queryLogs.filter(log => {
            const logDate = new Date(log.request_timestamp);
            return logDate >= yesterday && logDate < today;
        });
        
        const yesterdayTotal = yesterdayLogs.length;
        const changePercent = yesterdayTotal > 0 ? Math.round(((totalQueriesToday - yesterdayTotal) / yesterdayTotal) * 100) : 0;
        const changeIcon = changePercent > 0 ? '↗' : changePercent < 0 ? '↘' : '→';
        const changeClass = changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : '';
        
        document.getElementById('user-queries-change').innerHTML = `<span>${changeIcon}</span> ${changePercent > 0 ? '+' : ''}${changePercent}% vs yesterday`;
        document.getElementById('user-users-change').innerHTML = `<span>→</span> ${activeUsersToday} active users`;
        document.getElementById('user-avg-change').innerHTML = '<span>→</span> Stable';
        document.getElementById('user-response-change').innerHTML = `<span>→</span> ${avgResponseTime}s avg`;
        
    } catch (error) {
        console.error('Error updating user metrics:', error);
        document.getElementById('user-total-queries-today').textContent = '0';
        document.getElementById('user-active-users').textContent = '0';
        document.getElementById('user-avg-queries').textContent = '0';
        document.getElementById('user-avg-response-time').textContent = '0s';
    }
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
    
    // Get users with metrics and sort by today's queries (descending)
    const usersWithMetrics = Object.keys(userMetrics).map(user => {
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const todayQueries = dailyData[10] || 0; // Index 10 = today
        return { user, todayQueries };
    });
    
    // Sort by today's queries and take top 5
    usersWithMetrics.sort((a, b) => b.todayQueries - a.todayQueries);
    const topUsers = usersWithMetrics.slice(0, 5);
    
    topUsers.forEach((userObj, index) => {
        const user = userObj.user;
        const dailyData = userMetrics[user]?.daily || Array(11).fill(0);
        const chartData = dailyData.slice(1, 11); // Last 10 days (indices 1-10)
        
        // Get user display name (handle cases where user might not have @ symbol)
        const displayName = user.includes('@') ? user.split('@')[0] : user;
        
        datasets.push({
            label: displayName,
            data: chartData,
            borderColor: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
            backgroundColor: CHART_COLORS.primary[index % CHART_COLORS.primary.length] + '33',
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
    
    // Use userMetrics to ensure we include ALL users with metrics
    const usersWithMetrics = Object.keys(userMetrics);
    
    usersWithMetrics.forEach(user => {
        const name = userNames[user] || user; // Use user as fallback
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
    
    // Sort by dailyTotal descending (users with most queries today appear first)
    allUserQueryData.sort((a, b) => b.dailyTotal - a.dailyTotal);
    
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
    
    // Get teams from teamMetrics (real data) instead of ALL_TEAMS (static list)
    const teamsWithData = Object.keys(teamMetrics).filter(team => {
        return teamMetrics[team]?.monthly > 0;
    }).sort();
    
    teamsWithData.forEach(team => {
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
    
    // Get teams from teamMetrics (real data) instead of ALL_TEAMS (static list)
    const teamsWithData = Object.keys(teamMetrics).sort();
    
    teamsWithData.forEach((team, index) => {
        const dailyData = teamMetrics[team]?.daily || Array(11).fill(0);
        const chartData = dailyData.slice(1, 11);
        
        datasets.push({
            label: team,
            data: chartData,
            borderColor: CHART_COLORS.teams[index % CHART_COLORS.teams.length],
            backgroundColor: CHART_COLORS.teams[index % CHART_COLORS.teams.length] + '33',
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
    
    // Get teams from teamMetrics (real data) instead of ALL_TEAMS (static list)
    const teamsWithData = Object.keys(teamMetrics).sort();
    
    teamsWithData.forEach(team => {
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
    
    // Get teams from teamMetrics (real data) instead of ALL_TEAMS (static list)
    const teamsWithData = Object.keys(teamMetrics).sort();
    
    // We need to fetch query logs to get user_name and person_name for each person
    try {
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Build a map of person_name -> {user_name, iam_group}
        // Note: In the database, the fields are user_name, person_name, and iam_group
        const personMap = {};
        queryLogs.forEach(log => {
            // person_name is the key in userMetrics
            const personName = log.person_name || log.person;
            const userName = log.user_name || log.iam_username;
            const team = log.iam_group || log.team || 'Unknown';
            
            if (personName && !personMap[personName]) {
                personMap[personName] = {
                    userName: userName || personName,
                    team: team
                };
            }
        });
        
        teamsWithData.forEach(team => {
            // Calculate team total by summing all users in this team
            let teamTotal = 0;
            const teamUsers = [];
            
            // First pass: collect all users for this team and calculate real team total
            Object.keys(userMetrics).forEach(personName => {
                const metrics = userMetrics[personName];
                const personInfo = personMap[personName];
                
                if (personInfo && personInfo.team === team) {
                    const monthlyQueries = metrics?.monthly || 0;
                    teamTotal += monthlyQueries;
                    
                    teamUsers.push({
                        userName: personInfo.userName,
                        personName: personName,
                        monthlyQueries: monthlyQueries
                    });
                }
            });
            
            // Second pass: calculate percentages with correct team total
            teamUsers.forEach(user => {
                const percentage = teamTotal > 0 ? Math.round((user.monthlyQueries / teamTotal) * 100) : 0;
                
                allTeamUsersData.push({
                    user: user.userName,      // user_name from DB (e.g., darwin_003)
                    name: user.personName,    // person_name from DB (e.g., José Fernández)
                    team: team,               // iam_group from DB
                    monthlyQueries: user.monthlyQueries,
                    percentage
                });
            });
        });
        
        // Sort by monthlyQueries descending (users with most queries first)
        allTeamUsersData.sort((a, b) => b.monthlyQueries - a.monthlyQueries);
        
        teamUsersTotalCount = allTeamUsersData.length;
        teamUsersCurrentPage = 1;
        renderTeamUsersPage();
        
    } catch (error) {
        console.error('Error loading team users table:', error);
        allTeamUsersData = [];
        teamUsersTotalCount = 0;
        renderTeamUsersPage();
    }
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

async function loadDailyTrendChart() {
    try {
        // Get real data from query logs for last 10 days
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Group by date and count queries
        const dateCounts = {};
        const today = new Date();
        
        queryLogs.forEach(log => {
            const date = new Date(log.request_timestamp);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!dateCounts[dateKey]) {
                dateCounts[dateKey] = 0;
            }
            
            dateCounts[dateKey]++;
        });
        
        // Build data for last 10 days
        const dailyTotals = [];
        for (let i = 9; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyTotals.push(dateCounts[dateKey] || 0);
        }
        
        window.charts.updateRequestsDetailsChart(dailyTotals);
    } catch (error) {
        console.error('Error loading daily trend chart:', error);
        // Fallback to empty data
        window.charts.updateRequestsDetailsChart(Array(10).fill(0));
    }
}

async function loadRequestsDetailsTableWithPagination() {
    allRequestsDetailsData = [];
    
    // Iterate over all users that have metrics (from userMetrics)
    // This ensures we include ALL users who made queries, not just those in allUsers
    const usersWithMetrics = Object.keys(userMetrics);
    
    usersWithMetrics.forEach(user => {
        const name = userNames[user] || user; // Use user as fallback if name not found
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

async function loadModelUsageTable() {
    const table = document.getElementById('model-usage-table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    
    tableBody.innerHTML = '';
    
    try {
        // Get real data from query logs
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Count usage by model and team
        const modelTeamUsage = {};
        const allModels = new Set();
        const allTeamsInData = new Set();
        
        queryLogs.forEach(log => {
            const model = log.model_id;
            const team = log.team || log.iam_group || 'Unknown';
            
            allModels.add(model);
            allTeamsInData.add(team);
            
            if (!modelTeamUsage[model]) {
                modelTeamUsage[model] = {};
            }
            
            if (!modelTeamUsage[model][team]) {
                modelTeamUsage[model][team] = 0;
            }
            
            modelTeamUsage[model][team]++;
        });
        
        // Use teams from actual data
        const teamsToDisplay = Array.from(allTeamsInData).sort();
        
        // Update table header dynamically
        let headerHtml = '<tr><th>MODEL</th>';
        teamsToDisplay.forEach(team => {
            headerHtml += `<th>${team.toUpperCase()}</th>`;
        });
        headerHtml += '<th>TOTAL</th></tr>';
        tableHead.innerHTML = headerHtml;
        
        // Convert to array and sort by total usage
        const modelsArray = Array.from(allModels).map(model => {
            const teamCounts = {};
            let total = 0;
            
            teamsToDisplay.forEach(team => {
                const count = modelTeamUsage[model]?.[team] || 0;
                teamCounts[team] = count;
                total += count;
            });
            
            return { model, teamCounts, total };
        }).sort((a, b) => b.total - a.total);
        
        // Calculate totals per team
        const teamTotals = {};
        let grandTotal = 0;
        
        teamsToDisplay.forEach(team => {
            teamTotals[team] = 0;
            modelsArray.forEach(modelData => {
                teamTotals[team] += modelData.teamCounts[team];
            });
            grandTotal += teamTotals[team];
        });
        
        // Render table rows
        modelsArray.forEach(modelData => {
            let rowHtml = `<tr><td>${modelData.model}</td>`;
            
            teamsToDisplay.forEach(team => {
                rowHtml += `<td>${modelData.teamCounts[team]}</td>`;
            });
            
            rowHtml += `<td><strong>${modelData.total}</strong></td></tr>`;
            tableBody.innerHTML += rowHtml;
        });
        
        // Add TOTAL row
        let totalRowHtml = '<tr style="font-weight: bold; background-color: #f0f0f0;"><td>TOTAL</td>';
        teamsToDisplay.forEach(team => {
            totalRowHtml += `<td>${teamTotals[team]}</td>`;
        });
        totalRowHtml += `<td><strong>${grandTotal}</strong></td></tr>`;
        tableBody.innerHTML += totalRowHtml;
        
    } catch (error) {
        console.error('Error loading model usage table:', error);
        tableBody.innerHTML = `<tr><td colspan="100%">Error loading data</td></tr>`;
    }
}

async function loadModelConsumptionEvolution() {
    try {
        // Get real data from query logs for last 10 days
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Group by model and date
        const modelDateCounts = {};
        const today = new Date();
        
        queryLogs.forEach(log => {
            const model = log.model_id;
            const date = new Date(log.request_timestamp);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!modelDateCounts[model]) {
                modelDateCounts[model] = {};
            }
            
            if (!modelDateCounts[model][dateKey]) {
                modelDateCounts[model][dateKey] = 0;
            }
            
            modelDateCounts[model][dateKey]++;
        });
        
        // Build data for last 10 days for top 3 models
        const modelTotals = {};
        Object.keys(modelDateCounts).forEach(model => {
            modelTotals[model] = Object.values(modelDateCounts[model]).reduce((a, b) => a + b, 0);
        });
        
        const topModels = Object.keys(modelTotals)
            .sort((a, b) => modelTotals[b] - modelTotals[a])
            .slice(0, 3);
        
        const modelData = {};
        topModels.forEach(model => {
            const dailyData = [];
            for (let i = 9; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateKey = date.toISOString().split('T')[0];
                dailyData.push(modelDateCounts[model]?.[dateKey] || 0);
            }
            modelData[model] = dailyData;
        });
        
        window.charts.updateModelConsumptionEvolutionChart(modelData);
    } catch (error) {
        console.error('Error loading model consumption evolution:', error);
    }
}

async function loadResponseTimeEvolution() {
    try {
        // Get real data from query logs for last 10 days
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        // Group by date and calculate average response time
        const dateTimes = {};
        const today = new Date();
        
        queryLogs.forEach(log => {
            const date = new Date(log.request_timestamp);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!dateTimes[dateKey]) {
                dateTimes[dateKey] = {
                    total: 0,
                    count: 0
                };
            }
            
            if (log.processing_time_ms) {
                dateTimes[dateKey].total += log.processing_time_ms;
                dateTimes[dateKey].count++;
            }
        });
        
        // Build data for last 10 days
        const responseTimeData = [];
        for (let i = 9; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            
            if (dateTimes[dateKey] && dateTimes[dateKey].count > 0) {
                const avgTime = dateTimes[dateKey].total / dateTimes[dateKey].count / 1000; // Convert to seconds
                responseTimeData.push(parseFloat(avgTime.toFixed(2)));
            } else {
                responseTimeData.push(0);
            }
        }
        
        window.charts.updateResponseTimeEvolutionChart(responseTimeData);
    } catch (error) {
        console.error('Error loading response time evolution:', error);
    }
}

// ========== REQUESTS HISTORY TAB ==========

async function loadRequestsHistoryTab() {
    console.log('📊 Loading Requests History tab...');
    
    // Fetch real query logs data from database
    await fetchQueryLogsData();
    
    // Populate filter dropdowns
    populateFilterDropdowns();
    
    // Load query logs table with pagination
    await loadQueryLogsTableWithPagination();
}

async function fetchQueryLogsData() {
    try {
        // Fetch query logs from database via Lambda (get more records to include all users)
        const queryLogs = await window.dataService.getQueryLogs({ limit: 10000 });
        
        allQueryLogsData = queryLogs.map(log => ({
            // Legacy fields for backward compatibility
            id: log.query_id || `QL-${Date.now()}-${Math.random()}`,
            timestamp: new Date(log.request_timestamp),
            user: log.iam_username || log.email,
            name: log.person || log.iam_username,
            team: log.iam_group || log.team || 'Unknown',
            model: log.model_id,
            knowledgeBase: log.knowledge_base_id,
            query: log.user_query,
            status: log.error_message ? 'ERROR' : 'COMPLETED',
            tokens: log.tokens_used,
            responseTime: (log.processing_time_ms / 1000).toFixed(2),
            errorMessage: log.error_message,
            expanded: false,
            
            // MySQL schema fields - ALL FIELDS FROM DDL
            query_id: log.query_id,
            user_id: log.user_id,
            session_token: log.session_token,
            query_text: log.query_text || log.user_query,
            conversation_id: log.conversation_id,
            created_at: log.created_at,
            response_time_ms: log.response_time_ms || log.processing_time_ms,
            status: log.status || (log.error_message ? 'ERROR' : 'completed'),
            confidence_score: log.confidence_score,
            streaming_status: log.streaming_status,
            llm_response: log.llm_response,
            app_name: log.app_name,
            llm_trust_category: log.llm_trust_category,
            tools_used: log.tools_used,
            tool_results: log.tool_results,
            retrieved_docs_count: log.retrieved_docs_count,
            response_timestamp: log.response_timestamp,
            tokens_input: log.tokens_input,
            tokens_output: log.tokens_output,
            tokens_total: log.tokens_total,
            conversation_id_bedrock: log.conversation_id_bedrock,
            user_name: log.user_name,
            person_name: log.person_name || log.person,
            iam_group: log.iam_group,
            
            // Legacy fields for backward compatibility
            iam_username: log.iam_username,
            iam_user_arn: log.iam_user_arn,
            person: log.person,
            user_query: log.user_query,
            query_word_count: log.query_word_count,
            query_char_count: log.query_char_count,
            response_word_count: log.response_word_count,
            response_char_count: log.response_char_count,
            tokens_used: log.tokens_used,
            model_id: log.model_id,
            knowledge_base_id: log.knowledge_base_id,
            request_timestamp: log.request_timestamp,
            processing_time_ms: log.processing_time_ms,
            vector_db_time_ms: log.vector_db_time_ms,
            llm_processing_time_ms: log.llm_processing_time_ms,
            error_message: log.error_message,
            lambda_request_id: log.lambda_request_id,
            api_gateway_request_id: log.api_gateway_request_id,
            source_ip: log.source_ip,
            retrieved_documents_count: log.retrieved_documents_count,
            retrieval_only: log.retrieval_only,
            
            // Trust fields
            tipology: log.tipology,
            llm_trust: log.llm_trust
        }));
        
        // Sort by timestamp descending (most recent first)
        allQueryLogsData.sort((a, b) => b.timestamp - a.timestamp);
        
        filteredQueryLogsData = [...allQueryLogsData];
        
        console.log(`✅ Loaded ${allQueryLogsData.length} query logs from database`);
    } catch (error) {
        console.error('❌ Error fetching query logs:', error);
        allQueryLogsData = [];
        filteredQueryLogsData = [];
    }
}

function generateQueryLogsData_OLD_REMOVED() {
    // This function has been removed - data now comes from database
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

async function populateFilterDropdowns() {
    try {
        // Get filter options from Lambda
        const filters = await window.dataService.getFilters();
        
        // Populate person dropdown
        const personSelect = document.getElementById('filter-person');
        personSelect.innerHTML = '<option value="">Todos</option>';
        filters.persons.forEach(person => {
            personSelect.innerHTML += `<option value="${person}">${person}</option>`;
        });
        
        // Populate team dropdown
        const teamSelect = document.getElementById('filter-team');
        teamSelect.innerHTML = '<option value="">Todos</option>';
        filters.teams.forEach(team => {
            teamSelect.innerHTML += `<option value="${team}">${team}</option>`;
        });
        
        // Populate model dropdown
        const modelSelect = document.getElementById('filter-model');
        modelSelect.innerHTML = '<option value="">Todos</option>';
        filters.models.forEach(model => {
            modelSelect.innerHTML += `<option value="${model}">${model}</option>`;
        });
    } catch (error) {
        console.error('Error populating filter dropdowns:', error);
    }
}

function applyFilters() {
    const searchText = document.getElementById('filter-search').value.toLowerCase();
    const person = document.getElementById('filter-person').value;
    const team = document.getElementById('filter-team').value;
    const model = document.getElementById('filter-model').value;
    const status = document.getElementById('filter-status').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    // Validate date range
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            alert('La fecha de inicio debe ser menor o igual a la fecha de fin');
            return;
        }
    }
    
    filteredQueryLogsData = allQueryLogsData.filter(log => {
        // Search filter - buscar en query y session_token
        if (searchText) {
            const queryMatch = log.query.toLowerCase().includes(searchText);
            const sessionTokenMatch = log.session_token && log.session_token.toLowerCase().includes(searchText);
            
            if (!queryMatch && !sessionTokenMatch) {
                return false;
            }
        }
        
        // Person filter
        if (person && log.name !== person) {
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
        const sessionToken = log.session_token || '-';
        
        let rowHtml = `
            <tr id="log-row-${log.id}" style="cursor: pointer;" onclick="openQueryDetailModal('${log.id}')">
                <td>${dateStr}</td>
                <td>${sessionToken}</td>
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

async function openQueryDetailModal(logId) {
    const log = allQueryLogsData.find(l => l.id === logId);
    if (!log) return;
    
    // Show modal immediately with basic data
    const modal = document.getElementById('query-detail-modal');
    modal.classList.add('show');
    
    // Basic Information Section
    document.getElementById('modal-id').textContent = log.id || log.query_id || '-';
    document.getElementById('modal-session-token').textContent = log.session_token || '-';
    document.getElementById('modal-conversation-id-bedrock').textContent = log.conversation_id_bedrock || '-';
    // Map app_name to team/iam_group
    document.getElementById('modal-app-name').textContent = log.app_name || log.team || log.iam_group || '-';
    
    const statusSpan = document.getElementById('modal-status');
    statusSpan.textContent = log.status || '-';
    statusSpan.className = log.status === 'COMPLETED' ? 'status-completed' : 'status-error';
    
    document.getElementById('modal-streaming-status').textContent = log.streaming_status || 'complete';
    document.getElementById('modal-created-at').textContent = 
        log.created_at ? moment(log.created_at).format('DD/MM/YYYY HH:mm:ss') : 
        (log.request_timestamp ? moment(log.request_timestamp).format('DD/MM/YYYY HH:mm:ss') : '-');
    
    // User Information Section
    document.getElementById('modal-user-id').textContent = log.user_id !== null && log.user_id !== undefined ? log.user_id : '-';
    document.getElementById('modal-user-name').textContent = log.user_name || '-';
    document.getElementById('modal-person-name').textContent = log.person_name || log.person || log.name || '-';
    document.getElementById('modal-iam-group').textContent = log.iam_group || '-';
    
    // Query and Response Section
    document.getElementById('modal-user-query').textContent = log.query_text || log.user_query || log.query || '-';
    document.getElementById('modal-llm-response').textContent = log.llm_response || 'No response available';
    
    // Tokens Section
    document.getElementById('modal-tokens-input').textContent = log.tokens_input !== null && log.tokens_input !== undefined ? log.tokens_input : '-';
    document.getElementById('modal-tokens-output').textContent = log.tokens_output !== null && log.tokens_output !== undefined ? log.tokens_output : '-';
    document.getElementById('modal-tokens-total').textContent = log.tokens_total !== null && log.tokens_total !== undefined ? log.tokens_total : '-';
    document.getElementById('modal-retrieved-docs-count').textContent = log.retrieved_docs_count !== null && log.retrieved_docs_count !== undefined ? log.retrieved_docs_count : '-';
    
    // Trust & Confidence Section
    document.getElementById('modal-confidence-score').textContent = 
        log.confidence_score !== null && log.confidence_score !== undefined ? 
        parseFloat(log.confidence_score).toFixed(2) + '%' : '-';
    document.getElementById('modal-llm-trust-category').textContent = log.llm_trust_category || '-';
    
    // Tool Results Section (JSONB object)
    const toolResultsSection = document.getElementById('modal-tool-results-section');
    const toolResultsContainer = document.getElementById('modal-tool-results-container');
    
    if (log.tool_results) {
        try {
            const results = typeof log.tool_results === 'string' ? JSON.parse(log.tool_results) : log.tool_results;
            
            if (results && Object.keys(results).length > 0) {
                toolResultsSection.style.display = 'block';
                
                let resultsHTML = '<div style="display: grid; gap: 1rem;">';
                
                Object.entries(results).forEach(([toolName, result]) => {
                    resultsHTML += `
                        <div style="padding: 1rem; background: #f7fafc; border-radius: 8px; border-left: 4px solid #4299e1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #2d3748; font-size: 0.9rem; font-weight: 600;">
                                ${toolName}
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.875rem;">
                                ${result.success !== undefined ? `
                                    <div>
                                        <span style="color: #718096;">Success:</span>
                                        <span style="color: ${result.success ? '#38a169' : '#e53e3e'}; font-weight: 600;">
                                            ${result.success ? '✓ Yes' : '✗ No'}
                                        </span>
                                    </div>
                                ` : ''}
                                ${result.data_size !== undefined ? `
                                    <div>
                                        <span style="color: #718096;">Data Size:</span>
                                        <span style="color: #2d3748; font-weight: 600;">${result.data_size} bytes</span>
                                    </div>
                                ` : ''}
                                ${result.execution_time_ms !== undefined ? `
                                    <div>
                                        <span style="color: #718096;">Execution Time:</span>
                                        <span style="color: #2d3748; font-weight: 600;">${result.execution_time_ms.toFixed(2)} ms</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                resultsHTML += '</div>';
                toolResultsContainer.innerHTML = resultsHTML;
            } else {
                toolResultsSection.style.display = 'none';
            }
        } catch (e) {
            console.error('Error parsing tool_results:', e);
            toolResultsSection.style.display = 'none';
        }
    } else {
        toolResultsSection.style.display = 'none';
    }
    
    // Performance Metrics Section
    document.getElementById('modal-response-time-ms').textContent = 
        log.response_time_ms ? `${log.response_time_ms} ms` : '-';
    document.getElementById('modal-response-timestamp').textContent = 
        log.response_timestamp ? moment(log.response_timestamp).format('DD/MM/YYYY HH:mm:ss') : '-';
    
    // Error Section
    const errorSection = document.getElementById('modal-error-section');
    if (log.error_message || log.errorMessage) {
        errorSection.style.display = 'block';
        document.getElementById('modal-error-message').textContent = log.error_message || log.errorMessage;
    } else {
        errorSection.style.display = 'none';
    }
    
    // Fetch complete details from API (including analysis and documents)
    try {
        const detailedLog = await window.dataService.getQueryLogDetails(log.query_id);
        
        if (detailedLog) {
            // Update TIPOLOGIA and CONFIANZA LLM in User Information Section
            if (detailedLog.analysis) {
                // Map strategy_type to readable name
                const strategyTypeNames = {
                    'hybrid_search': 'Hybrid Search',
                    'semantic_search': 'Semantic Search',
                    'keyword_search': 'Keyword Search',
                    'direct_answer': 'Direct Answer'
                };
                
                const strategyType = detailedLog.analysis.strategy_type || '-';
                const strategyTypeName = strategyTypeNames[strategyType] || strategyType;
                document.getElementById('modal-tipology').textContent = strategyTypeName;
                
                const strategyConfidence = detailedLog.analysis.strategy_confidence;
                document.getElementById('modal-llm-trust').textContent = 
                    strategyConfidence !== null && strategyConfidence !== undefined ? 
                    strategyConfidence + '%' : '-';
            }
            
            // Add llm_trust_explanation below LLM response if available
            if (detailedLog.analysis && detailedLog.analysis.llm_trust_explanation) {
                const llmResponseElement = document.getElementById('modal-llm-response');
                const explanationSection = document.createElement('div');
                explanationSection.id = 'modal-trust-explanation-section';
                explanationSection.style.marginTop = '1rem';
                explanationSection.style.padding = '1rem';
                explanationSection.style.backgroundColor = '#f7fafc';
                explanationSection.style.borderLeft = '4px solid #4299e1';
                explanationSection.style.borderRadius = '4px';
                
                explanationSection.innerHTML = `
                    <h4 style="margin: 0 0 0.5rem 0; color: #2d3748; font-size: 0.9rem; font-weight: 600;">
                        💡 Justificación de Confianza del Modelo
                    </h4>
                    <p style="margin: 0; color: #4a5568; font-size: 0.875rem; line-height: 1.5;">
                        ${detailedLog.analysis.llm_trust_explanation}
                    </p>
                `;
                
                llmResponseElement.parentNode.insertBefore(explanationSection, llmResponseElement.nextSibling);
            }
            
            // Update Strategy Analysis Section
            const strategySection = document.getElementById('modal-strategy-section');
            if (detailedLog.analysis && detailedLog.analysis.strategy_type) {
                strategySection.style.display = 'block';
                document.getElementById('modal-strategy-type').textContent = detailedLog.analysis.strategy_type || '-';
                
                const strategyConfidence = detailedLog.analysis.strategy_confidence || 0;
                const strategyBar = document.getElementById('modal-strategy-confidence-bar');
                strategyBar.style.width = strategyConfidence + '%';
                strategyBar.textContent = strategyConfidence + '%';
            } else {
                strategySection.style.display = 'none';
            }
            
            // Update LLM Trust Score Section
            const trustSection = document.getElementById('modal-trust-section');
            if (detailedLog.analysis && detailedLog.analysis.llm_trust !== null && detailedLog.analysis.llm_trust !== undefined) {
                trustSection.style.display = 'block';
                
                const trustScore = detailedLog.analysis.llm_trust;
                const trustCategory = detailedLog.analysis.llm_trust_category || 
                    (trustScore >= 70 ? 'ALTO' : trustScore >= 45 ? 'MEDIO' : 'BAJO');
                
                document.getElementById('modal-trust-score').textContent = trustScore + '%';
                
                const trustBadge = document.getElementById('modal-trust-badge');
                trustBadge.textContent = trustCategory;
                trustBadge.className = 'trust-score-badge ' + trustCategory.toLowerCase();
                
                const trustBar = document.getElementById('modal-trust-progress-bar');
                trustBar.style.width = trustScore + '%';
                
                const trustExplanation = document.getElementById('modal-trust-explanation');
                trustExplanation.textContent = detailedLog.analysis.llm_trust_explanation || 'No explanation available';
            } else {
                trustSection.style.display = 'none';
            }
            
            // Update Detected Intentions Section
            const intentionsSection = document.getElementById('modal-intentions-section');
            if (detailedLog.analysis && detailedLog.analysis.intentions) {
                try {
                    const intentions = typeof detailedLog.analysis.intentions === 'string' 
                        ? JSON.parse(detailedLog.analysis.intentions) 
                        : detailedLog.analysis.intentions;
                    
                    if (Array.isArray(intentions) && intentions.length > 0) {
                        intentionsSection.style.display = 'block';
                        const intentionsList = document.getElementById('modal-intentions-list');
                        intentionsList.innerHTML = '<ul>' + 
                            intentions.map(intent => `<li>${intent}</li>`).join('') + 
                            '</ul>';
                    } else {
                        intentionsSection.style.display = 'none';
                    }
                } catch (e) {
                    console.error('Error parsing intentions:', e);
                    intentionsSection.style.display = 'none';
                }
            } else {
                intentionsSection.style.display = 'none';
            }
            
            // Update Tools Used Section
            const toolsSection = document.getElementById('modal-tools-section');
            if (detailedLog.analysis && detailedLog.analysis.tools_used) {
                try {
                    const tools = typeof detailedLog.analysis.tools_used === 'string' 
                        ? JSON.parse(detailedLog.analysis.tools_used) 
                        : detailedLog.analysis.tools_used;
                    
                    if (Array.isArray(tools) && tools.length > 0) {
                        toolsSection.style.display = 'block';
                        const toolsList = document.getElementById('modal-tools-list');
                        toolsList.innerHTML = '<ul>' + 
                            tools.map(tool => `<li>${tool}</li>`).join('') + 
                            '</ul>';
                    } else {
                        toolsSection.style.display = 'none';
                    }
                } catch (e) {
                    console.error('Error parsing tools:', e);
                    toolsSection.style.display = 'none';
                }
            } else {
                toolsSection.style.display = 'none';
            }
            
            // Update Retrieved Documents Section
            const documentsSection = document.getElementById('modal-documents-section');
            if (detailedLog.retrieved_documents && detailedLog.retrieved_documents.length > 0) {
                documentsSection.style.display = 'block';
                const documentsTbody = document.getElementById('modal-documents-tbody');
                documentsTbody.innerHTML = detailedLog.retrieved_documents.map(doc => `
                    <tr>
                        <td>${doc.retrieval_rank || '-'}</td>
                        <td>${doc.source_type || '-'}</td>
                        <td>${doc.similarity_score !== null ? doc.similarity_score.toFixed(4) : '-'}</td>
                        <td>${doc.citation_confidence !== null ? doc.citation_confidence.toFixed(2) + '%' : '-'}</td>
                        <td class="doc-reference">${doc.document_reference || '-'}</td>
                    </tr>
                `).join('');
            } else {
                documentsSection.style.display = 'none';
            }
            
            // Add Analysis Metadata Section if analysis data exists
            if (detailedLog.analysis) {
                // Remove existing metadata section if present
                const existingMetadata = document.getElementById('modal-analysis-metadata-section');
                if (existingMetadata) {
                    existingMetadata.remove();
                }
                
                // Create new metadata section
                const metadataSection = document.createElement('div');
                metadataSection.id = 'modal-analysis-metadata-section';
                metadataSection.className = 'modal-section';
                
                let metadataHTML = `
                    <h3 class="modal-section-title">Analysis Metadata</h3>
                    <div class="modal-info-grid">
                `;
                
                // Add analysis timestamp if available
                if (detailedLog.analysis.analysis_timestamp) {
                    metadataHTML += `
                        <div class="modal-info-item">
                            <span class="modal-label">Analysis Timestamp:</span>
                            <span class="modal-value">${moment(detailedLog.analysis.analysis_timestamp).format('DD/MM/YYYY HH:mm:ss')}</span>
                        </div>
                    `;
                }
                
                // Add model version if available
                if (detailedLog.analysis.model_version) {
                    metadataHTML += `
                        <div class="modal-info-item">
                            <span class="modal-label">Analysis Model Version:</span>
                            <span class="modal-value">${detailedLog.analysis.model_version}</span>
                        </div>
                    `;
                }
                
                // Add processing metadata if available
                if (detailedLog.analysis.processing_metadata) {
                    try {
                        const metadata = typeof detailedLog.analysis.processing_metadata === 'string' 
                            ? JSON.parse(detailedLog.analysis.processing_metadata) 
                            : detailedLog.analysis.processing_metadata;
                        
                        metadataHTML += `
                            <div class="modal-info-item" style="grid-column: 1 / -1;">
                                <span class="modal-label">Processing Metadata:</span>
                                <span class="modal-value">
                                    <pre style="margin: 0.5rem 0 0 0; padding: 0.5rem; background: #f7fafc; border-radius: 4px; font-size: 0.75rem; overflow-x: auto;">${JSON.stringify(metadata, null, 2)}</pre>
                                </span>
                            </div>
                        `;
                    } catch (e) {
                        console.error('Error parsing processing_metadata:', e);
                    }
                }
                
                metadataHTML += `</div>`;
                metadataSection.innerHTML = metadataHTML;
                
                // Insert before error section or at the end
                const errorSection = document.getElementById('modal-error-section');
                if (errorSection) {
                    errorSection.parentNode.insertBefore(metadataSection, errorSection);
                } else {
                    document.querySelector('.modal-body').appendChild(metadataSection);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching query details:', error);
        // Hide all new sections on error
        document.getElementById('modal-strategy-section').style.display = 'none';
        document.getElementById('modal-trust-section').style.display = 'none';
        document.getElementById('modal-intentions-section').style.display = 'none';
        document.getElementById('modal-tools-section').style.display = 'none';
        document.getElementById('modal-documents-section').style.display = 'none';
    }
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
    if (confirm('Are you sure you want to logout?')) {
        window.authModule.logout('login.html');
    }
}

// ========== TRUST DETAILS TAB ==========

async function loadTrustDetailsTab() {
    console.log('📊 Loading Trust Details tab (initial load)...');
    await refreshTrustDetails();
}

async function refreshTrustDetails() {
    console.log('📊 Refreshing Trust Details tab...');
    
    try {
        // Check if Trust API is enabled
        if (!window.TRUST_API_CONFIG || !window.TRUST_API_CONFIG.enabled) {
            console.warn('⚠️ Trust API is not enabled');
            showTrustError('Trust API is not configured. Please check your configuration.');
            return;
        }
        
        // Fetch trust analytics data
        const trustData = await window.dataService.getTrustAnalytics(7);
        
        if (!trustData) {
            showTrustError('Failed to load trust data. Please try again later.');
            return;
        }
        
        // Update indicators
        updateTrustIndicators(trustData.indicators);
        
        // Update tables
        updateTrustByTeamTable(trustData.tables.trustByTeamDay);
        updateTrustByTypologyTable(trustData.tables.trustByTypology);
        
        // Update charts
        window.charts.updateTrustDistributionChart(trustData.charts.trustDistribution);
        window.charts.updateTrustEvolutionChart(trustData.charts.trustEvolutionByTeam);
        window.charts.updateTrustLevelsChart(trustData.charts.trustLevelsEvolution);
        
        console.log('✅ Trust Details loaded successfully');
        
    } catch (error) {
        console.error('Error loading Trust Details:', error);
        showTrustError('An error occurred while loading trust data: ' + error.message);
    }
}

function updateTrustIndicators(indicators) {
    // Update all 6 indicators
    // First 4 indicators: multiply by 100 (come as decimals 0-1)
    document.getElementById('trust-avg-today').textContent = (parseFloat(indicators.avgTrustToday) * 100).toFixed(2) + '%';
    document.getElementById('trust-avg-7days').textContent = (parseFloat(indicators.avgTrustPeriod) * 100).toFixed(2) + '%';
    document.getElementById('trust-p80-today').textContent = (parseFloat(indicators.percentile80Today) * 100).toFixed(2) + '%';
    document.getElementById('trust-p80-7days').textContent = (parseFloat(indicators.percentile80Period) * 100).toFixed(2) + '%';
    // Last 2 indicators: already in percentage format (0-100), just format
    document.getElementById('trust-high-rate-today').textContent = parseFloat(indicators.highConfidenceRateToday).toFixed(2) + '%';
    document.getElementById('trust-high-rate-7days').textContent = parseFloat(indicators.highConfidenceRatePeriod).toFixed(2) + '%';
}

function updateTrustByTeamTable(data) {
    if (!data || data.length === 0) {
        const tableBody = document.querySelector('#trust-by-team-table tbody');
        tableBody.innerHTML = '<tr><td colspan="8">No data available</td></tr>';
        allTrustByTeamData = [];
        trustByTeamTotalCount = 0;
        updateTrustByTeamPaginationInfo();
        return;
    }
    
    // Update date headers for last 7 days
    updateTrustByTeamHeaders();
    
    // Group data by team and date
    const teamDateData = {};
    
    data.forEach(row => {
        const team = row.team;
        const date = row.date;
        
        if (!teamDateData[team]) {
            teamDateData[team] = {};
        }
        
        // Multiply by 100 to convert from decimal (0-1) to percentage (0-100)
        teamDateData[team][date] = (parseFloat(row.avg_trust) * 100).toFixed(1);
    });
    
    // Get all unique teams
    const teams = Object.keys(teamDateData).sort();
    
    // Get last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    // Build table data
    allTrustByTeamData = teams.map(team => {
        const dailyTrust = last7Days.map(date => {
            return teamDateData[team][date] || '-';
        });
        
        return {
            team: team,
            dailyTrust: dailyTrust
        };
    });
    
    trustByTeamTotalCount = allTrustByTeamData.length;
    trustByTeamCurrentPage = 1;
    renderTrustByTeamPage();
}

function updateTrustByTeamHeaders() {
    // Update headers with dates in format "D MMM"
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const headerElement = document.getElementById(`trust-day-${i}`);
        
        if (headerElement) {
            if (i === 0) {
                headerElement.textContent = 'TODAY';
            } else {
                headerElement.textContent = moment(date).format('D MMM').toUpperCase();
            }
        }
    }
}

function renderTrustByTeamPage() {
    const tableBody = document.querySelector('#trust-by-team-table tbody');
    tableBody.innerHTML = '';
    
    const startIndex = (trustByTeamCurrentPage - 1) * trustByTeamPageSize;
    const endIndex = Math.min(startIndex + trustByTeamPageSize, trustByTeamTotalCount);
    const pageData = allTrustByTeamData.slice(startIndex, endIndex);
    
    pageData.forEach(row => {
        let rowHtml = `<tr><td>${row.team}</td>`;
        
        // Add daily trust values
        row.dailyTrust.forEach(trust => {
            rowHtml += `<td>${trust}${trust !== '-' ? '%' : ''}</td>`;
        });
        
        rowHtml += '</tr>';
        tableBody.innerHTML += rowHtml;
    });
    
    updateTrustByTeamPaginationInfo();
}

function updateTrustByTeamPaginationInfo() {
    const startIndex = (trustByTeamCurrentPage - 1) * trustByTeamPageSize;
    const endIndex = Math.min(startIndex + trustByTeamPageSize, trustByTeamTotalCount);
    const totalPages = Math.ceil(trustByTeamTotalCount / trustByTeamPageSize);
    
    document.getElementById('trust-by-team-info').textContent = 
        `Showing ${startIndex + 1}-${endIndex} of ${trustByTeamTotalCount} records`;
    document.getElementById('trust-by-team-page-info').textContent = 
        `Page ${trustByTeamCurrentPage} of ${totalPages}`;
    
    document.getElementById('prev-trust-by-team-btn').disabled = trustByTeamCurrentPage <= 1;
    document.getElementById('next-trust-by-team-btn').disabled = trustByTeamCurrentPage >= totalPages;
}

function loadPreviousTrustByTeamPage() {
    if (trustByTeamCurrentPage > 1) {
        trustByTeamCurrentPage--;
        renderTrustByTeamPage();
    }
}

function loadNextTrustByTeamPage() {
    const totalPages = Math.ceil(trustByTeamTotalCount / trustByTeamPageSize);
    if (trustByTeamCurrentPage < totalPages) {
        trustByTeamCurrentPage++;
        renderTrustByTeamPage();
    }
}

function exportTrustByTeamTable() {
    exportToCSV('trust-by-team-table', 'trust-by-team');
}

function updateTrustByTypologyTable(data) {
    const tableBody = document.querySelector('#trust-by-typology-table tbody');
    tableBody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No data available</td></tr>';
        return;
    }
    
    // Map strategy types to readable names
    const strategyTypeNames = {
        'hybrid_search': 'Hybrid Search',
        'semantic_search': 'Semantic Search',
        'keyword_search': 'Keyword Search',
        'direct_answer': 'Direct Answer'
    };
    
    data.forEach(row => {
        // Multiply by 100 to convert from decimal (0-1) to percentage (0-100)
        const avgTrust = (parseFloat(row.avg_trust) * 100).toFixed(2);
        const minTrust = (parseFloat(row.min_trust) * 100).toFixed(2);
        const maxTrust = (parseFloat(row.max_trust) * 100).toFixed(2);
        
        // Use strategy_type field and map to readable name
        const strategyType = row.strategy_type || row.tipology || 'Unknown';
        const typologyLabel = strategyTypeNames[strategyType] || strategyType;
        
        tableBody.innerHTML += `
            <tr>
                <td>${typologyLabel}</td>
                <td>${avgTrust}%</td>
                <td>${row.query_count}</td>
                <td>${minTrust}%</td>
                <td>${maxTrust}%</td>
            </tr>
        `;
    });
}

function showTrustError(message) {
    // Show error in all trust sections
    const indicators = ['trust-avg-today', 'trust-avg-7days', 'trust-p80-today', 
                       'trust-p80-7days', 'trust-high-rate-today', 'trust-high-rate-7days'];
    
    indicators.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = 'N/A';
        }
    });
    
    // Show error in tables
    const teamTableBody = document.querySelector('#trust-by-team-table tbody');
    if (teamTableBody) {
        teamTableBody.innerHTML = `<tr><td colspan="4" style="color: #ef4444;">${message}</td></tr>`;
    }
    
    const typologyTableBody = document.querySelector('#trust-by-typology-table tbody');
    if (typologyTableBody) {
        typologyTableBody.innerHTML = `<tr><td colspan="5" style="color: #ef4444;">${message}</td></tr>`;
    }
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
window.refreshTrustDetails = refreshTrustDetails;
window.loadPreviousTrustByTeamPage = loadPreviousTrustByTeamPage;
window.loadNextTrustByTeamPage = loadNextTrustByTeamPage;
window.exportTrustByTeamTable = exportTrustByTeamTable;
window.logout = logout;

console.log('✅ Dashboard initialized successfully');
