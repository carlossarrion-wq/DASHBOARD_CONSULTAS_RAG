// RAG Query Monitoring Dashboard - Charts Module
// This file handles all Chart.js visualizations

// Chart instances
let userDailyChart = null;
let teamMonthlyChart = null;
let teamDailyChart = null;
let hourlyHistogramChart = null;
let userDistributionHistogram = null;
let modelUsageDistributionChart = null;
let requestsDetailsChart = null;
let modelConsumptionEvolutionChart = null;
let responseTimeEvolutionChart = null;
let trustDistributionChart = null;
let trustEvolutionChart = null;
let trustLevelsChart = null;

/**
 * Update User Daily Chart
 */
function updateUserDailyChart(chartData) {
    const ctx = document.getElementById('user-daily-chart');
    if (!ctx) return;

    if (userDailyChart) {
        userDailyChart.destroy();
    }

    userDailyChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Queries'
                    }
                }
            }
        }
    });
}

/**
 * Update Team Monthly Chart
 */
function updateTeamMonthlyChart(chartData) {
    const ctx = document.getElementById('team-monthly-chart');
    if (!ctx) return;

    if (teamMonthlyChart) {
        teamMonthlyChart.destroy();
    }

    teamMonthlyChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Monthly Queries'
                    }
                }
            }
        }
    });
}

/**
 * Update Team Daily Chart
 */
function updateTeamDailyChart(chartData) {
    const ctx = document.getElementById('team-daily-chart');
    if (!ctx) return;

    if (teamDailyChart) {
        teamDailyChart.destroy();
    }

    teamDailyChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Queries'
                    }
                }
            }
        }
    });
}

/**
 * Update Hourly Histogram Chart
 */
function updateHourlyHistogramChart(hourlyData) {
    const ctx = document.getElementById('hourly-histogram-chart');
    if (!ctx) return;

    if (hourlyHistogramChart) {
        hourlyHistogramChart.destroy();
    }

    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    
    hourlyHistogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Queries',
                data: hourlyData,
                backgroundColor: 'rgba(49, 151, 149, 0.6)',
                borderColor: 'rgba(49, 151, 149, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Queries'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day'
                    }
                }
            }
        }
    });
}

/**
 * Update User Distribution Histogram
 */
function updateUserDistributionHistogram(userDistributionData) {
    const ctx = document.getElementById('user-distribution-histogram');
    if (!ctx) return;

    if (userDistributionHistogram) {
        userDistributionHistogram.destroy();
    }

    const sortedUsers = Object.entries(userDistributionData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 users

    const labels = sortedUsers.map(([user]) => user.split('@')[0]);
    const data = sortedUsers.map(([, queries]) => queries);

    userDistributionHistogram = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Queries Today',
                data: data,
                backgroundColor: 'rgba(49, 151, 149, 0.6)',
                borderColor: 'rgba(49, 151, 149, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Queries'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'User'
                    }
                }
            }
        }
    });
}

/**
 * Update Model Usage Distribution Chart
 */
function updateModelUsageDistributionChart(modelUsageData) {
    const ctx = document.getElementById('model-usage-distribution-chart');
    if (!ctx) return;

    if (modelUsageDistributionChart) {
        modelUsageDistributionChart.destroy();
    }

    const labels = Object.keys(modelUsageData);
    const data = Object.values(modelUsageData);

    modelUsageDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#319795',
                    '#e67e22',
                    '#3498db',
                    '#9b59b6',
                    '#e74c3c'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 10
                        },
                        boxWidth: 15
                    }
                }
            }
        }
    });
}

/**
 * Update Requests Details Chart
 */
function updateRequestsDetailsChart(dailyTotals) {
    const ctx = document.getElementById('requests-details-chart');
    if (!ctx) return;

    if (requestsDetailsChart) {
        requestsDetailsChart.destroy();
    }

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

    requestsDetailsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Total Daily Queries',
                data: dailyTotals,
                backgroundColor: 'rgba(49, 151, 149, 0.6)',
                borderColor: 'rgba(49, 151, 149, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Queries'
                    }
                }
            }
        }
    });
}

/**
 * Update Model Consumption Evolution Chart
 */
function updateModelConsumptionEvolutionChart(modelData) {
    const ctx = document.getElementById('model-consumption-evolution-chart');
    if (!ctx) return;

    if (modelConsumptionEvolutionChart) {
        modelConsumptionEvolutionChart.destroy();
    }

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
    const models = Object.keys(modelData);
    const colors = ['#81c784', '#64b5f6', '#ffb74d'];
    
    models.forEach((model, index) => {
        datasets.push({
            label: model,
            data: modelData[model],
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 1,
            fill: true,
            tension: 0.4
        });
    });

    modelConsumptionEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Requests'
                    }
                }
            }
        }
    });
}

/**
 * Update Response Time Evolution Chart
 */
function updateResponseTimeEvolutionChart(responseTimeData) {
    const ctx = document.getElementById('response-time-evolution-chart');
    if (!ctx) return;

    if (responseTimeEvolutionChart) {
        responseTimeEvolutionChart.destroy();
    }

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

    responseTimeEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Avg Response Time (seconds)',
                data: responseTimeData,
                borderColor: '#319795',
                backgroundColor: 'rgba(49, 151, 149, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Response Time (seconds)'
                    }
                }
            }
        }
    });
}

/**
 * Update Trust Distribution Chart (Pie Chart)
 */
function updateTrustDistributionChart(distributionData) {
    const ctx = document.getElementById('trust-distribution-chart');
    if (!ctx) return;

    if (trustDistributionChart) {
        trustDistributionChart.destroy();
    }

    const labels = [];
    const data = [];
    const colors = [];

    // Handle object format: {high: 29, medium: 13, low: 4}
    const categoryMap = {
        'low': 'BAJO',
        'medium': 'MEDIO',
        'high': 'ALTO'
    };
    
    const colorMap = {
        'low': window.TRUST_CHART_COLORS.low,
        'medium': window.TRUST_CHART_COLORS.medium,
        'high': window.TRUST_CHART_COLORS.high
    };
    
    // Convert object to array and sort by priority (low, medium, high)
    const order = ['low', 'medium', 'high'];
    order.forEach(key => {
        if (distributionData[key]) {
            labels.push(categoryMap[key]);
            data.push(distributionData[key]);
            colors.push(colorMap[key]);
        }
    });

    trustDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        },
                        boxWidth: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Trust Evolution Chart (Stacked Area Chart by Team)
 */
function updateTrustEvolutionChart(evolutionData) {
    const ctx = document.getElementById('trust-evolution-chart');
    if (!ctx) return;

    if (trustEvolutionChart) {
        trustEvolutionChart.destroy();
    }

    // Group data by team
    const teamData = {};
    evolutionData.forEach(item => {
        if (!teamData[item.team]) {
            teamData[item.team] = {};
        }
        // Multiply by 100 to convert from decimal (0-1) to percentage (0-100)
        teamData[item.team][item.date] = parseFloat(item.avg_trust) * 100;
    });

    // Get unique dates and sort them
    const dates = [...new Set(evolutionData.map(item => item.date))].sort();
    const labels = dates.map(date => moment(date).format('D MMM'));

    // Create datasets for each team
    const datasets = [];
    const teams = Object.keys(teamData).sort();
    
    // Define specific colors for teams (matching stacked area style)
    const teamColorMap = {
        'null': '#90EE90',      // Light green
        'Darwin': '#4CAF50'     // Green
    };

    teams.forEach((team) => {
        const data = dates.map(date => teamData[team][date] || 0);
        const color = teamColorMap[team] || '#4CAF50';
        
        datasets.push({
            label: team,
            data: data,
            borderColor: color,
            backgroundColor: color + '80',  // Add transparency for area fill
            tension: 0.4,
            fill: true,  // Enable area fill
            borderWidth: 2
        });
    });

    trustEvolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,  // Set maximum to 100% for trust scores
                    title: {
                        display: true,
                        text: 'Confianza Media (%)'
                    }
                }
            }
        }
    });
}

/**
 * Update Trust Levels Chart (Stacked Area Chart)
 */
function updateTrustLevelsChart(levelsData) {
    const ctx = document.getElementById('trust-levels-chart');
    if (!ctx) return;

    if (trustLevelsChart) {
        trustLevelsChart.destroy();
    }

    // Sort by date
    const sortedData = levelsData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = sortedData.map(item => moment(item.date).format('D MMM'));
    const lowData = sortedData.map(item => item.low_count);
    const mediumData = sortedData.map(item => item.medium_count);
    const highData = sortedData.map(item => item.high_count);

    trustLevelsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'BAJO (0-45%)',
                    data: lowData,
                    backgroundColor: window.TRUST_CHART_COLORS.low + '80',
                    borderColor: window.TRUST_CHART_COLORS.low,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'MEDIO (45-70%)',
                    data: mediumData,
                    backgroundColor: window.TRUST_CHART_COLORS.medium + '80',
                    borderColor: window.TRUST_CHART_COLORS.medium,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'ALTO (70-100%)',
                    data: highData,
                    backgroundColor: window.TRUST_CHART_COLORS.high + '80',
                    borderColor: window.TRUST_CHART_COLORS.high,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Queries'
                    }
                }
            }
        }
    });
}

// Make functions globally available
window.charts = {
    updateUserDailyChart,
    updateTeamMonthlyChart,
    updateTeamDailyChart,
    updateHourlyHistogramChart,
    updateUserDistributionHistogram,
    updateModelUsageDistributionChart,
    updateRequestsDetailsChart,
    updateModelConsumptionEvolutionChart,
    updateResponseTimeEvolutionChart,
    updateTrustDistributionChart,
    updateTrustEvolutionChart,
    updateTrustLevelsChart
};

console.log('✅ Charts module initialized');
