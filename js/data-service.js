// RAG Query Monitoring Dashboard - Data Service
// This file handles data fetching and processing

// Global data storage
let cachedData = {
    users: null,
    teams: null,
    metrics: null,
    lastUpdate: null
};

/**
 * Fetch users and their team assignments
 * TODO: Implement connection to your data source (DynamoDB, RDS, API, etc.)
 */
async function getUsers() {
    console.log('📊 Fetching users data...');
    
    // Generate sample users for each team
    const sampleUsers = [
        { email: 'john.doe@company.com', name: 'John Doe', team: 'Engineering' },
        { email: 'jane.smith@company.com', name: 'Jane Smith', team: 'Engineering' },
        { email: 'bob.johnson@company.com', name: 'Bob Johnson', team: 'Data Science' },
        { email: 'alice.williams@company.com', name: 'Alice Williams', team: 'Data Science' },
        { email: 'charlie.brown@company.com', name: 'Charlie Brown', team: 'Product' },
        { email: 'diana.prince@company.com', name: 'Diana Prince', team: 'Product' },
        { email: 'edward.norton@company.com', name: 'Edward Norton', team: 'Research' },
        { email: 'fiona.apple@company.com', name: 'Fiona Apple', team: 'Research' },
        { email: 'george.martin@company.com', name: 'George Martin', team: 'Operations' },
        { email: 'helen.mirren@company.com', name: 'Helen Mirren', team: 'Operations' },
        { email: 'ian.mckellen@company.com', name: 'Ian McKellen', team: 'Engineering' },
        { email: 'julia.roberts@company.com', name: 'Julia Roberts', team: 'Data Science' },
        { email: 'kevin.spacey@company.com', name: 'Kevin Spacey', team: 'Product' },
        { email: 'laura.dern@company.com', name: 'Laura Dern', team: 'Research' },
        { email: 'michael.caine@company.com', name: 'Michael Caine', team: 'Operations' }
    ];
    
    const allUsers = sampleUsers.map(u => u.email);
    const usersByTeam = {};
    const userNames = {};
    
    // Organize by team
    sampleUsers.forEach(user => {
        if (!usersByTeam[user.team]) {
            usersByTeam[user.team] = [];
        }
        usersByTeam[user.team].push(user.email);
        userNames[user.email] = user.name;
    });
    
    return {
        allUsers,
        usersByTeam,
        userNames
    };
}

/**
 * Fetch user metrics (queries, response times, etc.)
 * TODO: Implement connection to your metrics storage
 */
async function getUserMetrics(forceRefresh = false) {
    console.log('📊 Fetching user metrics...');
    
    if (!forceRefresh && cachedData.metrics) {
        return cachedData.metrics;
    }
    
    // Generate realistic sample metrics for all users
    const userData = await getUsers();
    const metrics = {};
    
    userData.allUsers.forEach(email => {
        // Generate daily data for last 11 days (index 0 = day-10, index 10 = today)
        const daily = [0]; // day-10 always 0
        let monthlyTotal = 0;
        
        // Generate realistic daily patterns
        for (let i = 1; i <= 10; i++) {
            const baseQueries = Math.floor(Math.random() * 15) + 5; // 5-20 queries
            const dayOfWeek = new Date().getDay() - (10 - i);
            const isWeekend = (dayOfWeek % 7 === 0 || dayOfWeek % 7 === 6);
            const queries = isWeekend ? Math.floor(baseQueries * 0.3) : baseQueries;
            daily.push(queries);
            monthlyTotal += queries;
        }
        
        // Add some historical data to monthly total
        monthlyTotal += Math.floor(Math.random() * 200) + 100;
        
        // Generate response time (0.5 to 2.5 seconds)
        const avgResponseTime = Math.random() * 2 + 0.5;
        
        metrics[email] = {
            daily,
            monthly: monthlyTotal,
            avgResponseTime: parseFloat(avgResponseTime.toFixed(2))
        };
    });
    
    cachedData.metrics = metrics;
    cachedData.lastUpdate = new Date();
    
    return metrics;
}

/**
 * Fetch team metrics
 * TODO: Implement team-level metrics aggregation
 */
async function getTeamMetrics(forceRefresh = false) {
    console.log('📊 Fetching team metrics...');
    
    // Aggregate user metrics by team
    const userData = await getUsers();
    const userMetrics = await getUserMetrics(forceRefresh);
    const teamMetrics = {};
    
    // Initialize team metrics
    Object.keys(userData.usersByTeam).forEach(team => {
        teamMetrics[team] = {
            daily: Array(11).fill(0),
            monthly: 0,
            avgResponseTime: 0,
            userCount: 0
        };
    });
    
    // Aggregate user data by team
    Object.keys(userData.usersByTeam).forEach(team => {
        const teamUsers = userData.usersByTeam[team];
        let totalResponseTime = 0;
        
        teamUsers.forEach(user => {
            const metrics = userMetrics[user];
            if (metrics) {
                // Sum daily data
                metrics.daily.forEach((queries, index) => {
                    teamMetrics[team].daily[index] += queries;
                });
                
                // Sum monthly
                teamMetrics[team].monthly += metrics.monthly;
                
                // Sum response times for averaging
                totalResponseTime += metrics.avgResponseTime;
                teamMetrics[team].userCount++;
            }
        });
        
        // Calculate average response time
        if (teamMetrics[team].userCount > 0) {
            teamMetrics[team].avgResponseTime = 
                parseFloat((totalResponseTime / teamMetrics[team].userCount).toFixed(2));
        }
        
        delete teamMetrics[team].userCount; // Remove helper property
    });
    
    return teamMetrics;
}

/**
 * Fetch hourly query distribution for today
 * TODO: Implement hourly metrics fetching
 */
async function getHourlyMetrics() {
    console.log('📊 Fetching hourly metrics...');
    
    // Generate realistic hourly distribution
    const hourlyData = Array(24).fill(0);
    const currentHour = new Date().getHours();
    
    // Generate data for hours up to current hour
    for (let hour = 0; hour <= currentHour; hour++) {
        if (hour >= 8 && hour <= 18) {
            // Business hours: higher activity
            hourlyData[hour] = Math.floor(Math.random() * 30) + 15; // 15-45 queries
        } else if (hour >= 6 && hour <= 22) {
            // Extended hours: moderate activity
            hourlyData[hour] = Math.floor(Math.random() * 15) + 5; // 5-20 queries
        } else {
            // Night hours: low activity
            hourlyData[hour] = Math.floor(Math.random() * 5); // 0-5 queries
        }
    }
    
    return hourlyData;
}

/**
 * Fetch model usage distribution for today
 * TODO: Implement model usage tracking
 */
async function getModelUsage() {
    console.log('📊 Fetching model usage...');
    
    // TODO: Replace with actual model usage data
    return {
        'eu.anthropic.claude-sonnet-4-20250514-v1:0': 145,
        'eu.anthropic.claude-sonnet-4-5-20250929-v1:0': 98,
        'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': 67,
        'anthropic.claude-sonnet-4-20250514-v1:0': 43,
        'anthropic.claude-3-sonnet-20240229-v1:0': 21
    };
}

/**
 * Clear cached data
 */
function clearCache() {
    cachedData = {
        users: null,
        teams: null,
        metrics: null,
        lastUpdate: null
    };
    console.log('🗑️ Cache cleared');
}

// Make functions globally available
window.dataService = {
    getUsers,
    getUserMetrics,
    getTeamMetrics,
    getHourlyMetrics,
    getModelUsage,
    clearCache
};

console.log('✅ Data Service initialized');
