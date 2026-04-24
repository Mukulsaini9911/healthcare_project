let allHospitals = [];
let directoryHospitals = [];
let charts = {};
let autoRefreshInterval = null;
let hospitalSearchTimeout = null;

function getThemePalette() {
    const styles = getComputedStyle(document.body);
    return {
        text: styles.getPropertyValue('--text').trim() || '#18302c',
        muted: styles.getPropertyValue('--muted').trim() || '#59716b',
        heading: styles.getPropertyValue('--heading').trim() || '#102723',
        primary: styles.getPropertyValue('--primary').trim() || '#114f46',
        critical: styles.getPropertyValue('--critical').trim() || '#d25b4d',
        high: styles.getPropertyValue('--high').trim() || '#db8d37',
        medium: styles.getPropertyValue('--medium').trim() || '#ba9f2d',
        low: styles.getPropertyValue('--low').trim() || '#259466',
        borderStrong: styles.getPropertyValue('--border-strong').trim() || 'rgba(29, 58, 52, 0.18)',
        surfaceStrong: styles.getPropertyValue('--surface-strong').trim() || '#ffffff'
    };
}

document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    updateModeButton();

    loadData();
    loadLiveHospitalDirectory();
    loadComparisonData();
    loadAlerts();
    loadPredictions();
    generateMap();
    startRealTimeUpdates();

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

function startRealTimeUpdates() {
    autoRefreshInterval = setInterval(() => {
        loadData();
    }, 10000);
}

function stopRealTimeUpdates() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

function loadData() {
    fetch('/api/realtime-summary')
        .then(response => response.json())
        .then(data => {
            document.getElementById('critical-count').textContent = data.critical_risk;
            document.getElementById('high-count').textContent = data.high_risk;
            document.getElementById('medium-count').textContent = data.medium_risk;
            document.getElementById('low-count').textContent = data.low_risk;
            document.getElementById('total-hospitals').textContent = data.total_hospitals;
            document.getElementById('avg-pdr').textContent = data.avg_patient_doctor_ratio.toFixed(2);
            document.getElementById('avg-occupancy').textContent = data.avg_bed_occupancy.toFixed(2);

            const heroTotal = document.getElementById('total-hospitals-hero');
            if (heroTotal) {
                heroTotal.textContent = `${data.total_hospitals} hospitals`;
            }

            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diff = Math.floor((now - timestamp) / 1000);

            let timeStr = 'Just now';
            if (diff > 60) {
                timeStr = `${Math.floor(diff / 60)} min ago`;
            } else if (diff > 0) {
                timeStr = `${diff} sec ago`;
            }

            const lastUpdate = document.getElementById('last-update-time');
            lastUpdate.textContent = timeStr;
            lastUpdate.title = `${data.timestamp} | Activity: ${data.activity_level}`;
        })
        .catch(err => console.error('Error loading summary:', err));

    fetch('/api/realtime-hospitals')
        .then(response => response.json())
        .then(data => {
            allHospitals = data.hospitals;
        })
        .catch(err => console.error('Error loading hospitals:', err));

    fetch('/api/risk-data')
        .then(response => response.json())
        .then(data => {
            displayRiskChart(data);
        })
        .catch(err => console.error('Error loading risk data:', err));

    fetch('/api/efficiency-data')
        .then(response => response.json())
        .then(data => {
            displayEfficiencyChart(data);
        })
        .catch(err => console.error('Error loading efficiency:', err));
}

function displayHospitals(hospitals) {
    const container = document.getElementById('hospitalsContainer');
    container.innerHTML = '';

    if (!hospitals || hospitals.length === 0) {
        container.innerHTML = '<div class="empty-alerts">No hospitals found for this search. Try another city, landmark, or hospital name.</div>';
        return;
    }

    hospitals.forEach(hospital => {
        const riskClass = getClothing(hospital.risk_level).replace(' ', '-').toLowerCase();
        const card = document.createElement('div');
        card.className = `hospital-card ${riskClass}-card`;
        card.onclick = () => showHospitalDetail(hospital);

        card.innerHTML = `
            <div class="hospital-card-top">
                <div>
                    <div class="hospital-name">${hospital.Hospital}</div>
                    <div class="hospital-area">${hospital.Area}</div>
                </div>
                <div class="hospital-risk risk-${riskClass}">${hospital.risk_level}</div>
            </div>
            <div class="hospital-info">
                <div class="info-item">
                    <span>Beds</span>
                    <strong>${formatHospitalValue(hospital.Beds)}</strong>
                </div>
                <div class="info-item">
                    <span>Doctors</span>
                    <strong>${formatHospitalValue(hospital.Doctors)}</strong>
                </div>
                <div class="info-item">
                    <span>Patients per day</span>
                    <strong>${formatHospitalValue(hospital.Patients_Per_Day)}</strong>
                </div>
                <div class="info-item">
                    <span>P:D ratio</span>
                    <strong>${formatHospitalRatio(hospital.patient_doctor_ratio)}</strong>
                </div>
            </div>
            <div class="hospital-card-footer">
                <div class="risk-score">${buildHospitalFooterText(hospital)}</div>
                <div class="risk-score">View details</div>
            </div>
        `;

        container.appendChild(card);
    });
}

function formatHospitalValue(value) {
    if (value === null || value === undefined || value === '') {
        return 'Not listed';
    }
    return value;
}

function formatHospitalRatio(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toFixed(1);
    }
    return 'Not listed';
}

function buildHospitalFooterText(hospital) {
    if (typeof hospital.distance_km === 'number') {
        return `Distance: ${hospital.distance_km.toFixed(2)} km`;
    }
    if (typeof hospital.risk_score === 'number') {
        return `Risk score: ${hospital.risk_score}/100`;
    }
    return `Source: ${hospital.data_source || 'Hospital directory'}`;
}

function showHospitalDetail(hospital) {
    const modal = document.getElementById('hospitalDetailModal');
    const title = document.getElementById('hospitalDetailTitle');
    const body = document.getElementById('hospitalDetailBody');
    if (!modal || !title || !body) {
        return;
    }

    title.textContent = hospital.Hospital;
    body.innerHTML = `
        <p class="hospital-detail-meta">${hospital.Area} | Risk level: ${hospital.risk_level}</p>
        <div class="hospital-detail-grid">
            <div class="hospital-detail-item">
                <span>Beds</span>
                <strong>${formatHospitalValue(hospital.Beds)}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Doctors</span>
                <strong>${formatHospitalValue(hospital.Doctors)}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Patients per day</span>
                <strong>${formatHospitalValue(hospital.Patients_Per_Day)}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Patient-doctor ratio</span>
                <strong>${formatHospitalRatio(hospital.patient_doctor_ratio)}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Bed occupancy</span>
                <strong>${typeof hospital.bed_occupancy === 'number' ? hospital.bed_occupancy.toFixed(2) : 'Not listed'}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Efficiency score</span>
                <strong>${typeof hospital.efficiency_score === 'number' ? hospital.efficiency_score.toFixed(3) : 'Not listed'}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Risk score</span>
                <strong>${typeof hospital.risk_score === 'number' ? `${hospital.risk_score}/100` : 'Not listed'}</strong>
            </div>
            <div class="hospital-detail-item">
                <span>Contact / source</span>
                <strong>${hospital.phone || hospital.data_source || 'Not listed'}</strong>
            </div>
        </div>
        <div class="hospital-recommendation">${hospital.AI_Recommendation}</div>
    `;

    modal.classList.add('show');
}

function closeHospitalDetail() {
    const modal = document.getElementById('hospitalDetailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function filterHospitals() {
    clearTimeout(hospitalSearchTimeout);
    hospitalSearchTimeout = setTimeout(() => {
        loadLiveHospitalDirectory(document.getElementById('searchInput').value.trim());
    }, 350);
}

function applyHospitalRiskFilter() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const riskFilter = document.getElementById('riskFilter').value;

    const filtered = directoryHospitals.filter(hospital => {
        const matchesSearch =
            hospital.Hospital.toLowerCase().includes(search) ||
            hospital.Area.toLowerCase().includes(search);
        const matchesRisk = !riskFilter || hospital.risk_level === riskFilter;
        return matchesSearch && matchesRisk;
    });

    displayHospitals(filtered);
}

function updateHospitalDirectoryMeta(text) {
    const meta = document.getElementById('hospitalDirectoryMeta');
    if (meta) {
        meta.textContent = text || '';
    }
}

function loadLiveHospitalDirectory(query = '') {
    const params = new URLSearchParams();
    if (query) {
        params.set('q', query);
    }
    params.set('limit', query ? '24' : '60');

    updateHospitalDirectoryMeta(query ? 'Searching live hospitals across India...' : 'Loading live India-wide hospital directory...');

    fetch(`/api/live-hospitals?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            directoryHospitals = data.hospitals || [];
            updateHospitalDirectoryMeta(
                data.warning
                    ? `${data.data_source || 'Live directory'} | ${data.warning}`
                    : `${data.data_source || 'Live directory'} | ${directoryHospitals.length} hospitals loaded${data.query ? ` for "${data.query}"` : ''}`
            );
            applyHospitalRiskFilter();
        })
        .catch(err => {
            console.error('Error loading live hospitals:', err);
            updateHospitalDirectoryMeta('Live hospital directory is temporarily unavailable.');
            directoryHospitals = [];
            displayHospitals([]);
        });
}

function displayRiskChart(data) {
    const palette = getThemePalette();
    const riskCounts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
    };

    data.risk_levels.forEach(level => {
        if (riskCounts.hasOwnProperty(level)) {
            riskCounts[level] += 1;
        }
    });

    if (charts.risk) {
        charts.risk.destroy();
    }

    const ctx = document.getElementById('riskChart').getContext('2d');
    charts.risk = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(riskCounts),
            datasets: [{
                data: Object.values(riskCounts),
                backgroundColor: [palette.critical, palette.high, palette.medium, palette.low],
                borderColor: palette.surfaceStrong,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: palette.heading
                    }
                }
            }
        }
    });
}

function displayRiskScoresChart() {}

function displayEfficiencyChart(data) {
    const palette = getThemePalette();
    if (charts.efficiency) {
        charts.efficiency.destroy();
    }

    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    charts.efficiency = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.hospitals,
            datasets: [{
                label: 'Efficiency Score',
                data: data.efficiency,
                backgroundColor: palette.primary,
                borderRadius: 10,
                borderColor: palette.surfaceStrong,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: {
                        color: palette.muted
                    },
                    grid: {
                        color: palette.borderStrong
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: palette.muted,
                        callback: function (value) {
                            return value.toFixed(2);
                        }
                    },
                    grid: {
                        color: palette.borderStrong
                    }
                }
            }
        }
    });
}

function displayClusterChart() {}

function switchTab(tabName, clickedButton = null) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    if (clickedButton && clickedButton.classList.contains('nav-btn')) {
        clickedButton.classList.add('active');
    }
}

function getClothing(riskLevel) {
    const clothingMap = {
        Critical: 'critical',
        High: 'high',
        Medium: 'medium',
        Low: 'low'
    };
    return clothingMap[riskLevel] || 'low';
}

function generateMap() {
    fetch('/api/map')
        .then(response => response.json())
        .catch(() => console.log('Map already generated or will be generated on first access'));
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateModeButton();
    refreshThemeUI();
}

function updateModeButton() {
    const button = document.getElementById('modeToggle');
    if (!button) {
        return;
    }
    button.textContent = document.body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
    button.title = document.body.classList.contains('dark-mode')
        ? 'Mode: gradient night view'
        : 'Mode: light view';
}

function refreshThemeUI() {
    loadData();
    loadAlerts();
    loadPredictions();
}

function loadComparisonData() {
    fetch('/api/compare-hospitals')
        .then(response => response.json())
        .then(data => {
            populateComparisonSelects(data);
        })
        .catch(err => console.error('Error loading comparison data:', err));
}

function populateComparisonSelects(hospitals) {
    ['hospital1', 'hospital2', 'hospital3'].forEach(selectId => {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select Hospital</option>';
        hospitals.forEach(hospital => {
            const option = document.createElement('option');
            option.value = hospital.name;
            option.textContent = hospital.name;
            select.appendChild(option);
        });
    });
}

function updateComparison() {
    const h1 = document.getElementById('hospital1').value;
    const h2 = document.getElementById('hospital2').value;
    const h3 = document.getElementById('hospital3').value;

    fetch('/api/compare-hospitals')
        .then(response => response.json())
        .then(data => {
            const selected = [h1, h2, h3].filter(Boolean);
            if (selected.length === 0) {
                document.getElementById('comparisonBody').innerHTML = '';
                return;
            }

            document.getElementById('h1-name').textContent = h1 || 'Hospital 1';
            document.getElementById('h2-name').textContent = h2 || 'Hospital 2';
            document.getElementById('h3-name').textContent = h3 || 'Hospital 3';

            const tbody = document.getElementById('comparisonBody');
            tbody.innerHTML = '';

            const hospitals = data.filter(hospital => selected.includes(hospital.name));
            const metrics = ['beds', 'doctors', 'patients', 'pdr', 'efficiency', 'risk_score', 'risk_level'];

            metrics.forEach(metric => {
                const row = document.createElement('tr');
                row.innerHTML = `<td><strong>${metric.toUpperCase().replace('_', ' - ')}</strong></td>`;

                [0, 1, 2].forEach(idx => {
                    const cell = document.createElement('td');
                    if (hospitals[idx]) {
                        const value = hospitals[idx][metric];
                        cell.textContent = typeof value === 'number' ? value.toFixed(2) : value;
                    } else {
                        cell.textContent = '-';
                    }
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });
        });
}

function loadAlerts() {
    fetch('/api/alerts')
        .then(response => response.json())
        .then(data => {
            displayAlerts(data);
        })
        .catch(err => console.error('Error loading alerts:', err));
}

function displayAlerts(alerts) {
    const container = document.getElementById('alertsList');

    if (alerts.length === 0) {
        container.innerHTML = '<div class="empty-alerts">No critical alerts. Hospitals are currently operating within safer limits.</div>';
        return;
    }

    container.innerHTML = '';
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-card ${alert.risk_score >= 75 ? '' : 'high'}`;
        alertDiv.innerHTML = `
            <div class="alert-hospital">${alert.hospital}</div>
            <div class="alert-area">${alert.area}</div>
            <div class="alert-issue">${alert.issue}</div>
            <div class="alert-score">Risk Score: ${alert.risk_score}/100 | P-D Ratio: ${alert.pdr.toFixed(2)}</div>
        `;
        container.appendChild(alertDiv);
    });
}

function loadPredictions() {
    fetch('/api/predictions')
        .then(response => response.json())
        .then(data => {
            displayPredictionCards(data);
            displayPredictionsChart(data);
        })
        .catch(err => console.error('Error loading predictions:', err));
}

function displayPredictionCards(predictions) {
    const container = document.getElementById('predictionsContainer');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    const topHospitals = predictions.sort((a, b) => b.current - a.current).slice(0, 6);

    topHospitals.forEach(prediction => {
        const increase = Math.round(((prediction.pessimistic - prediction.current) / prediction.current) * 100);
        const currentPatients = Math.round(prediction.current);
        const maxPatients = Math.round(prediction.pessimistic);

        const card = document.createElement('div');
        card.className = 'prediction-card';

        let statusLabel = 'Stable';
        let topBorder = '#249a5d';
        if (increase > 10) {
            statusLabel = 'Urgent';
            topBorder = '#d94f45';
        } else if (increase > 5) {
            statusLabel = 'Watch';
            topBorder = '#e48b2f';
        }

        card.style.borderTop = `4px solid ${topBorder}`;
        card.innerHTML = `
            <div class="pred-label">${statusLabel} ${prediction.hospital}</div>
            <div class="pred-desc">
                <div><strong>Today:</strong> ${currentPatients} patients</div>
                <div><strong>Worst case:</strong> ${maxPatients} patients</div>
                <div><strong>Expected increase:</strong> +${increase}%</div>
            </div>
            <div class="hospital-recommendation" style="margin-top: 12px;">
                Action: plan additional staffing or redistribute workload early.
            </div>
        `;

        container.appendChild(card);
    });
}

function displayPredictionsChart(predictions) {
    const palette = getThemePalette();
    const canvasElement = document.getElementById('predictionsChart');
    if (!canvasElement) {
        return;
    }

    const ctx = canvasElement.getContext('2d');
    const topPredictions = predictions.sort((a, b) => b.current - a.current).slice(0, 10);

    if (charts.predictions) {
        charts.predictions.destroy();
    }

    charts.predictions = new Chart(ctx, {
        type: 'line',
        data: {
            labels: topPredictions.map(prediction => prediction.hospital),
            datasets: [
                {
                    label: 'Today (Current)',
                    data: topPredictions.map(prediction => Math.round(prediction.current)),
                    backgroundColor: palette.primary,
                    borderColor: palette.primary,
                    borderWidth: 2
                },
                {
                    label: 'Best Case (-5%)',
                    data: topPredictions.map(prediction => Math.round(prediction.optimistic)),
                    backgroundColor: palette.low,
                    borderColor: palette.low,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Worst Case (+15%)',
                    data: topPredictions.map(prediction => Math.round(prediction.pessimistic)),
                    backgroundColor: palette.critical,
                    borderColor: palette.critical,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: palette.heading
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: palette.muted
                    },
                    grid: {
                        color: palette.borderStrong
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Expected Patient Count',
                        color: palette.heading
                    },
                    ticks: {
                        color: palette.muted
                    },
                    grid: {
                        color: palette.borderStrong
                    }
                }
            }
        }
    });
}

function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message) {
        return;
    }

    addChatMessage(message, 'user');
    chatInput.value = '';
    showTypingIndicator();

    fetch('/api/chatbot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
    })
        .then(response => response.json())
        .then(data => {
            removeTypingIndicator();
            addChatMessage(data.bot, 'bot');
            scrollChatToBottom();
        })
        .catch(err => {
            removeTypingIndicator();
            addChatMessage('Sorry, I encountered an error. Please try again or rephrase your question.', 'bot');
            console.error('Chatbot error:', err);
        });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatInlineText(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function formatBotResponse(text) {
    const normalized = (text || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) {
        return '<p class="bot-paragraph">No response available.</p>';
    }

    const sections = normalized.split(/\n\s*\n/);
    const html = sections.map(section => {
        const lines = section
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        if (!lines.length) {
            return '';
        }

        const bulletLines = lines.filter(line => /^[-*•]\s+/.test(line));
        if (bulletLines.length === lines.length) {
            const items = bulletLines
                .map(line => `<li>${formatInlineText(line.replace(/^[-*•]\s+/, ''))}</li>`)
                .join('');
            return `<ul class="bot-list">${items}</ul>`;
        }

        const renderedLines = lines.map((line, index) => {
            const headingMatch = line.match(/^([A-Za-z][A-Za-z\s/&()-]{2,40}):\s*(.*)$/);
            if (headingMatch) {
                const title = formatInlineText(headingMatch[1].trim());
                const content = headingMatch[2].trim();
                if (content) {
                    return `
                        <div class="bot-section-row">
                            <div class="bot-section-label">${title}</div>
                            <div class="bot-section-body">${formatInlineText(content)}</div>
                        </div>
                    `;
                }

                return `<div class="bot-subheading">${title}</div>`;
            }

            if (index === 0 && lines.length > 1 && line.length <= 70) {
                return `<div class="bot-subheading">${formatInlineText(line)}</div>`;
            }

            return `<p class="bot-paragraph">${formatInlineText(line)}</p>`;
        }).join('');

        return `<div class="bot-section">${renderedLines}</div>`;
    }).join('');

    return `<div class="bot-response">${html}</div>`;
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message message`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender === 'bot' ? 'bot-bubble' : 'user-bubble'}`;

    if (sender === 'bot') {
        bubble.innerHTML = formatBotResponse(text);
    } else {
        bubble.textContent = text;
    }

    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);
    scrollChatToBottom();
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'bot-message message';
    messageDiv.id = 'typingIndicator';

    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    messageDiv.appendChild(typing);
    chatMessages.appendChild(messageDiv);
    scrollChatToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollChatToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function askQuestion(question) {
    document.getElementById('chatInput').value = question;
    sendChatMessage();
}

function showExportMenu() {
    const modal = document.getElementById('exportModal');
    modal.classList.add('show');

    const select = document.getElementById('hospitalSelect');
    select.innerHTML = '<option value="">Select Hospital...</option>';
    allHospitals.forEach(hospital => {
        const option = document.createElement('option');
        option.value = hospital.Hospital;
        option.textContent = hospital.Hospital;
        select.appendChild(option);
    });
}

function closeExportMenu() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('show');
}

function updateHospitalSelect() {}

function exportSingleHospital() {
    const select = document.getElementById('hospitalSelect');
    const hospital = select.value;

    if (!hospital) {
        alert('Please select a hospital first');
        return;
    }

    window.open(`/api/export/hospital/${hospital}`, '_blank');
    closeExportMenu();
}

function exportAllHospitals() {
    window.open('/api/export/all-hospitals', '_blank');
    closeExportMenu();
}

function exportDataCSV() {
    let csv = 'Hospital,Area,Beds,Doctors,Patients_Per_Day,Patient_Doctor_Ratio,Risk_Level,Risk_Score\n';

    allHospitals.forEach(hospital => {
        csv += `"${hospital.Hospital}","${hospital.Area}",${hospital.Beds},${hospital.Doctors},${hospital.Patients_Per_Day},${hospital.patient_doctor_ratio.toFixed(2)},"${hospital.risk_level}",${hospital.risk_score}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hospitals_data.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    closeExportMenu();
}

window.addEventListener('click', function (e) {
    const exportModal = document.getElementById('exportModal');
    if (e.target === exportModal) {
        closeExportMenu();
    }

    const hospitalModal = document.getElementById('hospitalDetailModal');
    if (e.target === hospitalModal) {
        closeHospitalDetail();
    }
});

function useMyLocation() {
    if ('geolocation' in navigator) {
        document.getElementById('emergencyLoading').style.display = 'block';
        document.getElementById('emergencyLoading').textContent = 'Getting your location...';

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                document.getElementById('emergencyLat').value = lat.toFixed(4);
                document.getElementById('emergencyLon').value = lon.toFixed(4);
                document.getElementById('emergencyAddress').value = `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

                document.getElementById('emergencyLoading').style.display = 'none';
                alert('Location detected. Click "Find nearest hospitals now" to continue.');
            },
            function (error) {
                document.getElementById('emergencyLoading').style.display = 'none';
                alert('Unable to get location. Please enter an address manually or use a quick place.');
                console.log('Geolocation error:', error);
            }
        );
    } else {
        alert('GPS is not available on this device. Please enter an address manually.');
    }
}

function selectLocation(placeName, lat, lon) {
    document.getElementById('emergencyAddress').value = placeName;
    document.getElementById('emergencyLat').value = lat.toFixed(4);
    document.getElementById('emergencyLon').value = lon.toFixed(4);
}

function toggleAdvanced() {
    const panel = document.getElementById('advancedPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function findEmergencyRoute() {
    let latitude = null;
    let longitude = null;
    const locationName = document.getElementById('emergencyAddress').value.trim();

    const manualLat = parseFloat(document.getElementById('emergencyLat').value);
    const manualLon = parseFloat(document.getElementById('emergencyLon').value);

    if (!isNaN(manualLat) && !isNaN(manualLon)) {
        latitude = manualLat;
        longitude = manualLon;
    } else if (locationName !== '') {
        const coordMatch = locationName.match(/\(([\d.]+)\s*,\s*([\d.]+)\)/);
        if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
        }
    }

    if (latitude === null && longitude === null && locationName === '') {
        alert('Please enter a location, use GPS, select a quick place, or add manual coordinates.');
        return;
    }

    const routeType = document.querySelector('input[name="routeType"]:checked').value;

    document.getElementById('emergencyLoading').style.display = 'block';
    document.getElementById('emergencyLoading').textContent = 'Finding nearest hospitals...';
    document.getElementById('emergencyResults').style.display = 'none';

    fetch('/api/emergency-route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
            address: locationName,
            type: routeType
        })
    })
        .then(response => response.json())
        .then(data => {
            displayEmergencyRoutes(data);
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Error finding hospitals. Please check your location and try again.');
            document.getElementById('emergencyLoading').style.display = 'none';
        });
}

function displayEmergencyRoutes(data) {
    document.getElementById('emergencyLoading').style.display = 'none';
    document.getElementById('emergencyResults').style.display = 'block';

    const container = document.getElementById('routeCardsContainer');
    container.innerHTML = '';

    data.nearest_hospitals.forEach((hospital, index) => {
        const card = document.createElement('div');
        card.className = 'route-card';
        card.innerHTML = `
            <div class="route-card-header">
                <div class="rank">Hospital #${index + 1}</div>
                <div class="hospital-name">${hospital.name}</div>
                <div class="distance-badge">${hospital.distance_km} km away</div>
            </div>
            <div class="route-card-content">
                <div class="card-row">
                    <span class="label">Location</span>
                    <span class="value">${hospital.area}</span>
                </div>
                <div class="card-row">
                    <span class="label">ETA</span>
                    <span class="value">${hospital.eta_minutes} minutes</span>
                </div>
                <div class="card-row">
                    <span class="label">Available beds</span>
                    <span class="value">${hospital.beds}</span>
                </div>
                <div class="card-row">
                    <span class="label">Doctors</span>
                    <span class="value">${hospital.doctors}</span>
                </div>
                <div class="card-row">
                    <span class="label">Daily patients</span>
                    <span class="value">${hospital.patients_per_day}</span>
                </div>
                <div class="card-row">
                    <span class="label">Safety score</span>
                    <div class="safety-score-bar">
                        <div class="safety-score-fill" style="width: ${hospital.safety_score}%; background-color: ${getSafetyColor(hospital.safety_score)};"></div>
                        <span class="safety-score-text">${hospital.safety_score}%</span>
                    </div>
                </div>
                <div class="card-actions">
                    <a href="${hospital.google_maps_url}" target="_blank" class="btn-google-maps">Get directions</a>
                    <button onclick="callHospital('${hospital.phone}')" class="btn-call">Call hospital</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getSafetyColor(score) {
    if (score >= 80) {
        return '#249a5d';
    }
    if (score >= 60) {
        return '#e48b2f';
    }
    return '#d94f45';
}

function callHospital(phone) {
    alert(`Calling hospital at ${phone}\n\nIn production, this would dial the hospital directly.`);
}
