// RAG Query Monitoring Dashboard Configuration - NUEVA VERSIÓN
// Configuración actualizada para usar la nueva base de datos PostgreSQL

// AWS Configuration (mantener igual)
const AWS_CONFIG = {
    region: 'eu-west-1',
    account_id: 'iberdrola-aws',
    dashboard_role_arn: null,
    external_id: null,
    session_timeout: 60
};

// API Configuration - LAMBDA URL
const API_CONFIG = {
    base_url: 'https://y3uw77p5s2fm2uauqtz6375iui0bjkms.lambda-url.eu-west-1.on.aws'  // Lambda proxy URL
};

// Endpoints mapping - NUEVOS ENDPOINTS
const ENDPOINTS = {
    // Endpoints del dashboard (nuevos)
    health: '/api/dashboard/health',
    analytics: '/api/dashboard/analytics',
    filters: '/api/dashboard/filters',
    queryLogs: '/api/dashboard/query-logs',
    trustAnalytics: '/api/dashboard/trust-analytics',
    queryLogDetail: '/api/dashboard/query-logs',  // + /{id}
    
    // Endpoints RAG existentes (mantener para funcionalidad RAG)
    ragQuery: '/api/query/simple',
    ragStream: '/api/query/stream',
    ragHistory: '/api/history',
    ragAuth: '/api/auth/login',
    ragLogout: '/api/auth/logout',
    ragDocuments: '/api/documents/download'
};

// Trust API Configuration (actualizada)
const TRUST_API_CONFIG = {
    enabled: true,
    base_url: 'https://y3uw77p5s2fm2uauqtz6375iui0bjkms.lambda-url.eu-west-1.on.aws'  // Lambda proxy URL
};

// Trust Ranges Configuration (mantener igual)
const TRUST_RANGES = {
    low: { min: 0, max: 45, label: 'BAJO', color: '#ef4444' },
    medium: { min: 45, max: 70, label: 'MEDIO', color: '#f59e0b' },
    high: { min: 70, max: 100, label: 'ALTO', color: '#10b981' }
};

// Trust Chart Colors (mantener igual)
const TRUST_CHART_COLORS = {
    low: '#ef4444',
    medium: '#f59e0b',
    high: '#10b981',
    gradient: ['#ef4444', '#f59e0b', '#10b981']
};

// Chart color schemes (mantener igual)
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
// Se construirá dinámicamente desde la base de datos usando el campo app_name
const ALL_TEAMS = [];

// Sample query types (mantener igual)
const QUERY_TYPES = [
    'Document Search',
    'Question Answering',
    'Summarization',
    'Data Extraction',
    'Other'
];

// Default quota configuration (mantener igual)
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

// Database Information (NUEVA SECCIÓN)
const DATABASE_INFO = {
    type: 'PostgreSQL',
    host: 'rag-postgres.czuimyk2qu10.eu-west-1.rds.amazonaws.com',
    database: 'ragdb',
    version: 'V3 Multi-App',
    applications: ['Darwin', 'SAP'],
    migration_date: '2024-10-24'
};

// Migration Status (NUEVA SECCIÓN)
const MIGRATION_STATUS = {
    completed: false,
    testing_mode: true,
    fallback_available: true,
    original_lambda: 'https://g5i2qixdveuwhneop6z6f24piq0fivtp.lambda-url.eu-west-1.on.aws'
};

// Make configurations globally available
window.AWS_CONFIG = AWS_CONFIG;
window.API_CONFIG = API_CONFIG;
window.ENDPOINTS = ENDPOINTS;
window.TRUST_API_CONFIG = TRUST_API_CONFIG;
window.TRUST_RANGES = TRUST_RANGES;
window.TRUST_CHART_COLORS = TRUST_CHART_COLORS;
window.CHART_COLORS = CHART_COLORS;
window.ALL_TEAMS = ALL_TEAMS;
window.QUERY_TYPES = QUERY_TYPES;
window.DEFAULT_QUOTA_CONFIG = DEFAULT_QUOTA_CONFIG;
window.DATABASE_INFO = DATABASE_INFO;
window.MIGRATION_STATUS = MIGRATION_STATUS;

console.log('✅ Nueva configuración cargada:', {
    database: DATABASE_INFO.type,
    host: DATABASE_INFO.host,
    applications: DATABASE_INFO.applications,
    api_url: API_CONFIG.base_url,
    testing_mode: MIGRATION_STATUS.testing_mode
});
