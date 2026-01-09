// RAG Query Monitoring Dashboard - Data Service
// This file handles data fetching from the Lambda backend

// API Configuration - Use config from config.js
const API_BASE_URL = window.API_CONFIG?.base_url || 'https://g5i2qixdveuwhneop6z6f24piq0fivtp.lambda-url.eu-west-1.on.aws';

// Global data storage
let cachedData = {
    analytics: null,
    filters: null,
    lastUpdate: null
};

/**
 * Make authenticated API call to Lambda backend
 */
async function makeAPICall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Fetch analytics data from Lambda
 */
async function getAnalytics(startDate = null, endDate = null, forceRefresh = false) {
    console.log('📊 Fetching analytics from database...');
    
    if (!forceRefresh && cachedData.analytics) {
        return cachedData.analytics;
    }
    
    try {
        let endpoint = '/analytics';
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            endpoint += '?' + params.toString();
        }
        
        const data = await makeAPICall(endpoint);
        cachedData.analytics = data;
        cachedData.lastUpdate = new Date();
        
        return data;
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return null;
    }
}

/**
 * Fetch filter options from Lambda
 */
async function getFilters(forceRefresh = false) {
    console.log('📊 Fetching filters from database...');
    
    if (!forceRefresh && cachedData.filters) {
        return cachedData.filters;
    }
    
    try {
        const data = await makeAPICall('/filters');
        cachedData.filters = data;
        return data;
    } catch (error) {
        console.error('Error fetching filters:', error);
        return {
            persons: [],
            teams: [],
            models: [],
            knowledgeBases: [],
            statuses: []
        };
    }
}

/**
 * Fetch users and their team assignments from analytics data
 */
async function getUsers() {
    console.log('📊 Fetching users data from database...');
    
    try {
        const analytics = await getAnalytics();
        const filters = await getFilters();
        
        console.log('Analytics data:', analytics);
        console.log('Filters data:', filters);
        
        if (!analytics || !filters) {
            console.warn('⚠️ Analytics or filters is null');
            return {
                allUsers: [],
                usersByTeam: {},
                userNames: {}
            };
        }
        
        const allUsers = [];
        const usersByTeam = {};
        const userNames = {};
        
        // Build user list from personStats
        if (analytics.personStats && Array.isArray(analytics.personStats)) {
            analytics.personStats.forEach(stat => {
                const person = stat.person;
                if (person) {
                    allUsers.push(person);
                    userNames[person] = person; // Use person name as-is
                }
            });
        } else {
            console.warn('⚠️ personStats is not available or not an array');
        }
        
        // Organize users by team from teamStats
        analytics.teamStats.forEach(teamStat => {
            const team = teamStat.team;
            if (!usersByTeam[team]) {
                usersByTeam[team] = [];
            }
        });
        
        // We need to fetch query logs to map users to teams
        const queryLogs = await makeAPICall('/query-logs?limit=1000');
        const userTeamMap = {};
        
        queryLogs.data.forEach(log => {
            const person = log.person;
            const team = log.team || log.iam_group || 'Unknown';
            if (person && !userTeamMap[person]) {
                userTeamMap[person] = team;
            }
        });
        
        // Assign users to teams
        Object.keys(userTeamMap).forEach(person => {
            const team = userTeamMap[person];
            if (!usersByTeam[team]) {
                usersByTeam[team] = [];
            }
            if (!usersByTeam[team].includes(person)) {
                usersByTeam[team].push(person);
            }
        });
        
        return {
            allUsers,
            usersByTeam,
            userNames
        };
    } catch (error) {
        console.error('Error fetching users:', error);
        return {
            allUsers: [],
            usersByTeam: {},
            userNames: {}
        };
    }
}

/**
 * Fetch user metrics (queries, response times, etc.) from analytics
 * Uses pagination to fetch all data for the last 30 days
 */
async function getUserMetrics(forceRefresh = false) {
    console.log('📊 Fetching user metrics from database...');
    
    try {
        const analytics = await getAnalytics(null, null, forceRefresh);
        
        if (!analytics) {
            return {};
        }
        
        const metrics = {};
        
        // Calculate date range for last 30 days to ensure we get all recent data
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const startDate = thirtyDaysAgo.toISOString();
        const endDate = today.toISOString();
        
        // Fetch ALL query logs using pagination
        const allQueryLogs = await fetchAllQueryLogsWithPagination(startDate, endDate);
        
        console.log(`📊 Processing ${allQueryLogs.length} query logs for user metrics`);
        
        // Calculate metrics per user
        const userStats = {};
        
        allQueryLogs.forEach(log => {
            const person = log.person;
            if (!person) return;
            
            if (!userStats[person]) {
                userStats[person] = {
                    dailyCounts: {},
                    totalQueries: 0,
                    totalResponseTime: 0,
                    queryCount: 0
                };
            }
            
            // Count by date
            const date = new Date(log.request_timestamp);
            const dateKey = date.toISOString().split('T')[0];
            userStats[person].dailyCounts[dateKey] = (userStats[person].dailyCounts[dateKey] || 0) + 1;
            userStats[person].totalQueries++;
            
            // Sum response times
            if (log.processing_time_ms) {
                userStats[person].totalResponseTime += log.processing_time_ms;
                userStats[person].queryCount++;
            }
        });
        
        // Build metrics object with last 11 days (index 0-10, where 10 is today)
        Object.keys(userStats).forEach(person => {
            const daily = Array(11).fill(0);
            const today = new Date();
            
            // Fill last 11 days
            for (let i = 0; i < 11; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (10 - i));
                const dateKey = date.toISOString().split('T')[0];
                daily[i] = userStats[person].dailyCounts[dateKey] || 0;
            }
            
            const avgResponseTime = userStats[person].queryCount > 0 
                ? userStats[person].totalResponseTime / userStats[person].queryCount / 1000 
                : 0;
            
            metrics[person] = {
                daily: daily,
                monthly: userStats[person].totalQueries,
                avgResponseTime: avgResponseTime
            };
        });
        
        console.log(`✅ User metrics calculated for ${Object.keys(metrics).length} users`);
        
        return metrics;
    } catch (error) {
        console.error('Error fetching user metrics:', error);
        return {};
    }
}

/**
 * Fetch team metrics from analytics
 * Uses pagination to fetch all data for the last 30 days
 */
async function getTeamMetrics(forceRefresh = false) {
    console.log('📊 Fetching team metrics from database...');
    
    try {
        const analytics = await getAnalytics(null, null, forceRefresh);
        
        if (!analytics) {
            return {};
        }
        
        const teamMetrics = {};
        
        // Calculate date range for last 30 days to ensure we get all recent data
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const startDate = thirtyDaysAgo.toISOString();
        const endDate = today.toISOString();
        
        // Fetch ALL query logs using pagination
        const allQueryLogs = await fetchAllQueryLogsWithPagination(startDate, endDate);
        
        console.log(`📊 Processing ${allQueryLogs.length} query logs for team metrics`);
        
        // Calculate metrics per team
        const teamStats = {};
        
        allQueryLogs.forEach(log => {
            const team = log.team || log.iam_group || 'Unknown';
            
            if (!teamStats[team]) {
                teamStats[team] = {
                    dailyCounts: {},
                    totalQueries: 0,
                    totalResponseTime: 0,
                    queryCount: 0
                };
            }
            
            // Count by date
            const date = new Date(log.request_timestamp);
            const dateKey = date.toISOString().split('T')[0];
            teamStats[team].dailyCounts[dateKey] = (teamStats[team].dailyCounts[dateKey] || 0) + 1;
            teamStats[team].totalQueries++;
            
            // Sum response times
            if (log.processing_time_ms) {
                teamStats[team].totalResponseTime += log.processing_time_ms;
                teamStats[team].queryCount++;
            }
        });
        
        // Build metrics object with last 11 days
        Object.keys(teamStats).forEach(team => {
            const daily = Array(11).fill(0);
            const today = new Date();
            
            // Fill last 11 days
            for (let i = 0; i < 11; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (10 - i));
                const dateKey = date.toISOString().split('T')[0];
                daily[i] = teamStats[team].dailyCounts[dateKey] || 0;
            }
            
            const avgResponseTime = teamStats[team].queryCount > 0 
                ? teamStats[team].totalResponseTime / teamStats[team].queryCount / 1000 
                : 0;
            
            teamMetrics[team] = {
                daily: daily,
                monthly: teamStats[team].totalQueries,
                avgResponseTime: avgResponseTime
            };
        });
        
        console.log(`✅ Team metrics calculated for ${Object.keys(teamMetrics).length} teams`);
        
        return teamMetrics;
    } catch (error) {
        console.error('Error fetching team metrics:', error);
        return {};
    }
}

/**
 * Fetch hourly query distribution for today from query logs
 */
async function getHourlyMetrics() {
    console.log('📊 Fetching hourly metrics from database...');
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const startDate = today.toISOString();
        const endDate = tomorrow.toISOString();
        
        const queryLogs = await makeAPICall(`/query-logs?start_date=${startDate}&end_date=${endDate}&limit=1000`);
        
        // Initialize hourly array (24 hours)
        const hourlyData = Array(24).fill(0);
        
        // Count queries per hour for today only
        queryLogs.data.forEach(log => {
            const date = new Date(log.request_timestamp);
            const hour = date.getHours();
            hourlyData[hour]++;
        });
        
        return hourlyData;
    } catch (error) {
        console.error('Error fetching hourly metrics:', error);
        return Array(24).fill(0);
    }
}

/**
 * Fetch model usage distribution from analytics
 */
async function getModelUsage() {
    console.log('📊 Fetching model usage from database...');
    
    try {
        const analytics = await getAnalytics();
        
        if (!analytics || !analytics.modelStats) {
            return {};
        }
        
        const modelUsage = {};
        
        analytics.modelStats.forEach(stat => {
            modelUsage[stat.model_id] = stat.count;
        });
        
        return modelUsage;
    } catch (error) {
        console.error('Error fetching model usage:', error);
        return {};
    }
}

/**
 * Fetch query logs from database with filters
 */
async function getQueryLogs(filters = {}) {
    console.log('📊 Fetching query logs from database...');
    
    try {
        const params = new URLSearchParams();
        
        // Map frontend filter names to Lambda parameter names
        if (filters.person) params.append('person', filters.person);
        if (filters.team) params.append('team', filters.team);
        if (filters.model) params.append('model_id', filters.model);
        if (filters.kb) params.append('knowledge_base_id', filters.kb);
        if (filters.status) params.append('status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.search) params.append('search', filters.search);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);
        
        const endpoint = `/query-logs${params.toString() ? '?' + params.toString() : ''}`;
        const data = await makeAPICall(endpoint);
        
        return data.data || [];
    } catch (error) {
        console.error('Error fetching query logs:', error);
        return [];
    }
}

/**
 * Fetch a specific query log by ID
 */
async function getQueryLogById(queryId) {
    console.log(`📊 Fetching query log ${queryId} from database...`);
    
    try {
        const data = await makeAPICall(`/query-logs/${queryId}`);
        return data;
    } catch (error) {
        console.error('Error fetching query log:', error);
        return null;
    }
}

/**
 * Fetch complete query log details including analysis and retrieved documents
 */
async function getQueryLogDetails(queryId) {
    console.log(`📊 Fetching complete query log details for ${queryId}...`);
    
    if (!window.TRUST_API_CONFIG || !window.TRUST_API_CONFIG.enabled) {
        console.warn('⚠️ Trust API is not enabled, using basic query log');
        return await getQueryLogById(queryId);
    }
    
    try {
        const endpoint = `${window.TRUST_API_CONFIG.base_url}/query-logs/${queryId}`;
        console.log('Calling Trust API for query details:', endpoint);
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`Trust API call failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Query details received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching query log details:', error);
        // Fallback to basic query log
        return await getQueryLogById(queryId);
    }
}

/**
 * Fetch all query logs using pagination
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @param {number} pageSize - Number of records per page (default: 1000)
 * @returns {Promise<Array>} All query logs for the date range
 */
async function fetchAllQueryLogsWithPagination(startDate, endDate, pageSize = 1000) {
    console.log(`📊 Fetching all query logs with pagination (${startDate} to ${endDate})...`);
    
    const allLogs = [];
    let offset = 0;
    let hasMore = true;
    let pageCount = 0;
    
    try {
        while (hasMore) {
            pageCount++;
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                limit: pageSize.toString(),
                offset: offset.toString()
            });
            
            const endpoint = `/query-logs?${params.toString()}`;
            const response = await makeAPICall(endpoint);
            
            if (response.data && response.data.length > 0) {
                allLogs.push(...response.data);
                console.log(`  📄 Page ${pageCount}: Fetched ${response.data.length} records (total: ${allLogs.length})`);
                
                // Check if there are more records
                if (response.data.length < pageSize) {
                    hasMore = false;
                } else {
                    offset += pageSize;
                }
            } else {
                hasMore = false;
            }
            
            // Safety limit: stop after 50 pages (50,000 records)
            if (pageCount >= 50) {
                console.warn('⚠️ Reached maximum page limit (50 pages)');
                hasMore = false;
            }
        }
        
        console.log(`✅ Fetched total of ${allLogs.length} query logs in ${pageCount} pages`);
        return allLogs;
        
    } catch (error) {
        console.error('Error fetching query logs with pagination:', error);
        return allLogs; // Return what we have so far
    }
}

/**
 * Clear cached data
 */
function clearCache() {
    cachedData = {
        analytics: null,
        filters: null,
        lastUpdate: null
    };
    console.log('🗑️ Cache cleared');
}

/**
 * Fetch trust analytics data from Trust Lambda
 */
async function getTrustAnalytics(days = 7, forceRefresh = false) {
    console.log('📊 Fetching trust analytics from database...');
    
    if (!window.TRUST_API_CONFIG || !window.TRUST_API_CONFIG.enabled) {
        console.warn('⚠️ Trust API is not enabled');
        return null;
    }
    
    try {
        const endpoint = `${window.TRUST_API_CONFIG.base_url}/trust-analytics?days=${days}`;
        console.log('Calling Trust API:', endpoint);
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            throw new Error(`Trust API call failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Trust data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching trust analytics:', error);
        throw error;
    }
}

// Make functions globally available
window.dataService = {
    getAnalytics,
    getFilters,
    getUsers,
    getUserMetrics,
    getTeamMetrics,
    getHourlyMetrics,
    getModelUsage,
    getQueryLogs,
    getQueryLogById,
    getQueryLogDetails,
    getTrustAnalytics,
    clearCache,
    API_BASE_URL
};

console.log('✅ Data Service initialized with API:', API_BASE_URL);
