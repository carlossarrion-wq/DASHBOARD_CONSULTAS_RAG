// RAG Query Monitoring Dashboard Configuration

// AWS Configuration
const AWS_CONFIG = {
    region: 'eu-west-1',
    account_id: 'iberdrola-aws',
    // Optional: Role ARN if you need AssumeRole
    dashboard_role_arn: null,
    external_id: null,
    // Session timeout in minutes (default: 60 minutes)
    session_timeout: 60
};

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

// Teams configuration (from database)
const ALL_TEAMS = [
    'Darwin',
    'team_sdlc_group'
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
window.AWS_CONFIG = AWS_CONFIG;
window.CHART_COLORS = CHART_COLORS;
window.ALL_TEAMS = ALL_TEAMS;
window.QUERY_TYPES = QUERY_TYPES;
window.DEFAULT_QUOTA_CONFIG = DEFAULT_QUOTA_CONFIG;
