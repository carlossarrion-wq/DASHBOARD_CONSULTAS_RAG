// RAG Query Monitoring Dashboard Configuration

// Chart color schemes
const CHART_COLORS = {
    primary: [
        '#319795', '#2c7a7b', '#38b2ac', '#4fd1c5', '#81e6d9',
        '#b2f5ea', '#e6fffa', '#2d3748', '#4a5568', '#718096'
    ],
    teams: [
        '#a8d5ba', '#8bc9a3', '#6ebd8c', '#51b175', '#34a55e',
        '#7ec99a', '#9dd6b0', '#bce3c6', '#d4edd9', '#e8f5ec'
    ]
};

// Sample teams configuration (replace with your actual teams)
const ALL_TEAMS = [
    'Engineering',
    'Data Science',
    'Product',
    'Research',
    'Operations'
];

// Sample query types
const QUERY_TYPES = [
    'Document Search',
    'Question Answering',
    'Summarization',
    'Data Extraction',
    'Other'
];

// Default quota configuration
const DEFAULT_QUOTA_CONFIG = {
    users: {
        default: {
            daily_limit: 100,
            monthly_limit: 3000,
            warning_threshold: 60,
            critical_threshold: 85
        }
    },
    teams: {
        default: {
            monthly_limit: 15000,
            warning_threshold: 60,
            critical_threshold: 85
        }
    }
};

// Make configurations globally available
window.CHART_COLORS = CHART_COLORS;
window.ALL_TEAMS = ALL_TEAMS;
window.QUERY_TYPES = QUERY_TYPES;
window.DEFAULT_QUOTA_CONFIG = DEFAULT_QUOTA_CONFIG;
