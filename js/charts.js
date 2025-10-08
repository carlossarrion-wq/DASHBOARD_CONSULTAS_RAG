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
    updateResponseTimeEvolutionChart
};

console.log('✅ Charts module initialized');
