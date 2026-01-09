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

// API Configuration - TODOS los apartados usan esta Lambda con base de datos Trust
const API_CONFIG = {
    base_url: 'https://y3uw77p5s2fm2uauqtz6375iui0bjkms.lambda-url.eu-west-1.on.aws'
};

// Trust API Configuration (misma Lambda, para compatibilidad)
const TRUST_API_CONFIG = {
    enabled: true,
    base_url: 'https://y3uw77p5s2fm2uauqtz6375iui0bjkms.lambda-url.eu-west-1.on.aws'
};

// Trust Ranges Configuration
const TRUST_RANGES = {
    low: { min: 0, max: 45, label: 'BAJO', color: '#ef4444' },
    medium: { min: 45, max: 70, label: 'MEDIO', color: '#f59e0b' },
    high: { min: 70, max: 100, label: 'ALTO', color: '#10b981' }
};

// Trust Chart Colors
const TRUST_CHART_COLORS = {
    low: '#ef4444',
    medium: '#f59e0b',
    high: '#10b981',
    gradient: ['#ef4444', '#f59e0b', '#10b981']
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
window.API_CONFIG = API_CONFIG;
window.TRUST_API_CONFIG = TRUST_API_CONFIG;
window.TRUST_RANGES = TRUST_RANGES;
window.TRUST_CHART_COLORS = TRUST_CHART_COLORS;
window.CHART_COLORS = CHART_COLORS;
window.ALL_TEAMS = ALL_TEAMS;
window.QUERY_TYPES = QUERY_TYPES;
window.DEFAULT_QUOTA_CONFIG = DEFAULT_QUOTA_CONFIG;
