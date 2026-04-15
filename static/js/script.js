let allHospitals = [];
let charts = {};
let autoRefreshInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Load all data with real-time updates
    loadData();
    loadComparisonData();
    loadAlerts();
    loadPredictions();
    generateMap();

    // Start auto-refresh every 10 seconds for real-time updates
    startRealTimeUpdates();

    // Set up chatbot event listener
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
});

// ===== REAL-TIME DATA UPDATES =====
function startRealTimeUpdates() {
    // Update every 10 seconds
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
    // Load summary data with real-time API
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
            document.getElementById('lr-score').textContent = (data.model_scores.lr * 100).toFixed(1) + '%';
            document.getElementById('rf-score').textContent = (data.model_scores.rf * 100).toFixed(1) + '%';
            document.getElementById('mlp-score').textContent = (data.model_scores.mlp * 100).toFixed(1) + '%';
            
            // Update timestamp
            const timestamp = new Date(data.timestamp);
            const now = new Date();
            const diff = Math.floor((now - timestamp) / 1000);
            
            let timeStr = 'Just now';
            if (diff > 60) {
                timeStr = Math.floor(diff / 60) + ' min ago';
            } else if (diff > 0) {
                timeStr = diff + ' sec ago';
            }
            
            document.getElementById('last-update-time').textContent = timeStr;
            document.getElementById('last-update-time').title = data.timestamp + ' | Activity: ' + data.activity_level;
        })
        .catch(err => console.error('Error loading summary:', err));

    // Load real-time hospitals data
    fetch('/api/realtime-hospitals')
        .then(response => response.json())
        .then(data => {
            allHospitals = data.hospitals;
            displayHospitals(data.hospitals);
        })
        .catch(err => console.error('Error loading hospitals:', err));

    // Load risk data
    fetch('/api/risk-data')
        .then(response => response.json())
        .then(data => {
            displayRiskChart(data);
        })
        .catch(err => console.error('Error loading risk data:', err));

    // Load efficiency data
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

    hospitals.forEach((hospital, idx) => {
        const riskClass = getClothing(hospital.risk_level).replace(' ', '-').toLowerCase();
        const card = document.createElement('div');
        card.className = `hospital-card ${riskClass}-card`;
        card.onclick = () => showHospitalDetail(hospital);

        card.innerHTML = `
            <div class="hospital-name">${hospital.Hospital}</div>
            <div class="hospital-area">${hospital.Area}</div>
            <div class="hospital-info">
                <div class="info-item">
                    <span>Beds:</span>
                    <strong>${hospital.Beds}</strong>
                </div>
                <div class="info-item">
                    <span>Doctors:</span>
                    <strong>${hospital.Doctors}</strong>
                </div>
                <div class="info-item">
                    <span>Patients/Day:</span>
                    <strong>${hospital.Patients_Per_Day}</strong>
                </div>
                <div class="info-item">
                    <span>Ratio:</span>
                    <strong>${hospital.patient_doctor_ratio.toFixed(1)}</strong>
                </div>
            </div>
            <div class="hospital-risk risk-${riskClass}">${hospital.risk_level}</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                Risk Score: ${hospital.risk_score}/100
            </div>
        `;

        container.appendChild(card);
    });
}

function showHospitalDetail(hospital) {
    alert(`
${hospital.Hospital} (${hospital.Area})

📊 Resources:
• Beds: ${hospital.Beds}
• Doctors: ${hospital.Doctors}
• Patients/Day: ${hospital.Patients_Per_Day}

📈 Metrics:
• Patient-Doctor Ratio: ${hospital.patient_doctor_ratio.toFixed(2)}
• Bed Occupancy: ${hospital.bed_occupancy.toFixed(2)}
• Efficiency Score: ${hospital.efficiency_score.toFixed(3)}

🎯 Status:
• Risk Score: ${hospital.risk_score}/100
• Risk Level: ${hospital.risk_level}
• Cluster: ${hospital['Cluster'] + 1}

💡 Recommendation:
${hospital.AI_Recommendation}
    `);
}

function filterHospitals() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const riskFilter = document.getElementById('riskFilter').value;

    const filtered = allHospitals.filter(h => {
        const matchesSearch = h.Hospital.toLowerCase().includes(search) || 
                             h.Area.toLowerCase().includes(search);
        const matchesRisk = !riskFilter || h.risk_level === riskFilter;
        return matchesSearch && matchesRisk;
    });

    displayHospitals(filtered);
}

function displayRiskChart(data) {
    const riskCounts = {
        'Critical': 0,
        'High': 0,
        'Medium': 0,
        'Low': 0
    };

    data.risk_levels.forEach(level => {
        if (riskCounts.hasOwnProperty(level)) {
            riskCounts[level]++;
        }
    });

    const ctx = document.getElementById('riskChart').getContext('2d');
    charts.risk = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(riskCounts),
            datasets: [{
                data: Object.values(riskCounts),
                backgroundColor: ['#ff4444', '#ff9800', '#ffc107', '#4caf50'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function displayRiskScoresChart(data) {
    // Removed - no corresponding canvas element in HTML
    // Keep function stub for compatibility
}

function displayEfficiencyChart(data) {
    const ctx = document.getElementById('efficiencyChart').getContext('2d');
    charts.efficiency = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.hospitals,
            datasets: [{
                label: 'Efficiency Score',
                data: data.efficiency,
                backgroundColor: '#667eea',
                borderRadius: 8,
                borderColor: '#fff',
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
                y: {
                    beginAtZero: true,
                    ticks: { callback: function(value) { return value.toFixed(2); } }
                }
            }
        }
    });
}

function displayClusterChart(data) {
    // Removed - no corresponding canvas element in HTML
    // Keep function stub for compatibility
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Add active class to clicked button - find the button that was clicked
    if (event && event.target && event.target.classList.contains('nav-btn')) {
        event.target.classList.add('active');
    }
}

function getClothing(riskLevel) {
    const clothingMap = {
        'Critical': 'critical',
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
    };
    return clothingMap[riskLevel] || 'low';
}

// ===== NEW FEATURES: MAP GENERATION =====
function generateMap() {
    // This is called from backend during initialization
    fetch('/api/map')
        .then(response => response.json())
        .catch(err => console.log('Map already generated or will be generated on first access'));
}

// ===== NEW FEATURES: DARK MODE =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// ===== NEW FEATURES: HOSPITAL COMPARISON =====
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
        hospitals.forEach(h => {
            const option = document.createElement('option');
            option.value = h.name;
            option.textContent = h.name;
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
            const selected = [h1, h2, h3].filter(h => h);
            if (selected.length === 0) return;

            // Update header names
            document.getElementById('h1-name').textContent = h1 || 'Hospital 1';
            document.getElementById('h2-name').textContent = h2 || 'Hospital 2';
            document.getElementById('h3-name').textContent = h3 || 'Hospital 3';

            // Generate comparison table
            const tbody = document.getElementById('comparisonBody');
            tbody.innerHTML = '';

            const hospitals = data.filter(h => selected.includes(h.name));
            const metrics = ['beds', 'doctors', 'patients', 'pdr', 'efficiency', 'risk_score', 'risk_level'];

            metrics.forEach(metric => {
                const row = document.createElement('tr');
                const metricLabel = metric.toUpperCase().replace('_', ' - ');
                row.innerHTML = `<td><strong>${metricLabel}</strong></td>`;

                [0, 1, 2].forEach(idx => {
                    const cell = document.createElement('td');
                    if (hospitals[idx]) {
                        const value = hospitals[idx][metric];
                        if (typeof value === 'number') {
                            cell.textContent = value.toFixed(2);
                        } else {
                            cell.textContent = value;
                        }
                    }
                    row.appendChild(cell);
                });

                tbody.appendChild(row);
            });
        });
}

// ===== NEW FEATURES: ALERTS =====
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
        container.innerHTML = '<div class="empty-alerts">✓ No Critical Alerts - All hospitals are performing well!</div>';
        return;
    }

    container.innerHTML = '';
    alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-card ${alert.risk_score >= 75 ? '' : 'high'}`;
        alertDiv.innerHTML = `
            <div class="alert-hospital">${alert.hospital}</div>
            <div class="alert-area">📍 ${alert.area}</div>
            <div class="alert-issue">${alert.issue}</div>
            <div class="alert-score">Risk Score: ${alert.risk_score}/100 | P-D Ratio: ${alert.pdr.toFixed(2)}</div>
        `;
        container.appendChild(alertDiv);
    });
}

// ===== NEW FEATURES: PREDICTIONS =====
function loadPredictions() {
    fetch('/api/predictions')
        .then(response => response.json())
        .then(data => {
            displayPredictionsChart(data);
        })
        .catch(err => console.error('Error loading predictions:', err));
}

function displayPredictionsChart(predictions) {
    const canvasElement = document.getElementById('predictionsChart');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    
    const datasets = [
        {
            label: 'Current',
            data: predictions.map(p => p.current),
            backgroundColor: '#667eea',
            borderColor: '#667eea',
            borderWidth: 2
        },
        {
            label: 'Optimistic (-5%)',
            data: predictions.map(p => p.optimistic),
            backgroundColor: '#4caf50',
            borderColor: '#4caf50',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false
        },
        {
            label: 'Realistic (+5%)',
            data: predictions.map(p => p.realistic),
            backgroundColor: '#ffc107',
            borderColor: '#ffc107',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false
        },
        {
            label: 'Pessimistic (+15%)',
            data: predictions.map(p => p.pessimistic),
            backgroundColor: '#ff9800',
            borderColor: '#ff9800',
            borderDash: [5, 5],
            borderWidth: 2,
            fill: false
        }
    ];

    if (charts.predictions) {
        charts.predictions.destroy();
    }

    charts.predictions = new Chart(ctx, {
        type: 'line',
        data: {
            labels: predictions.map(p => p.hospital),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Patient Load' }
                }
            }
        }
    });
}

// ===== LOAD NEW FEATURES ON START =====
// Already loaded in main DOMContentLoaded at the top

// ===== ADVANCED MEDICAL AI CHATBOT =====
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to backend
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
        addChatMessage('❌ Sorry, I encountered an error. Please try again or rephrase your question.', 'bot');
        console.error('Chatbot error:', err);
    });
}

function addChatMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message message`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble ' + (sender === 'bot' ? 'bot-bubble' : 'user-bubble');
    
    if (sender === 'bot') {
        // Format bot messages with markdown-like support
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        bubble.innerHTML = formattedText;
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

// ===== NEW FEATURE: EXPORT MENU =====
function showExportMenu() {
    const modal = document.getElementById('exportModal');
    modal.classList.add('show');
    
    // Populate hospital select
    const select = document.getElementById('hospitalSelect');
    select.innerHTML = '<option value="">Select Hospital...</option>';
    allHospitals.forEach(h => {
        const option = document.createElement('option');
        option.value = h.Hospital;
        option.textContent = h.Hospital;
        select.appendChild(option);
    });
}

function closeExportMenu() {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('show');
}

function updateHospitalSelect() {
    // Just a placeholder for future functionality
}

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
    
    allHospitals.forEach(h => {
        csv += `"${h.Hospital}","${h.Area}",${h.Beds},${h.Doctors},${h.Patients_Per_Day},${h.patient_doctor_ratio.toFixed(2)},"${h.risk_level}",${h.risk_score}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hospitals_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    closeExportMenu();
}

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('exportModal');
    if (e.target == modal) {
        closeExportMenu();
    }
});

// ===== EMERGENCY ROUTING FEATURE =====

// Use browser GPS to get current location
function useMyLocation() {
    if ('geolocation' in navigator) {
        document.getElementById('emergencyLoading').style.display = 'block';
        document.getElementById('emergencyLoading').textContent = 'Getting your location...';
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                document.getElementById('emergencyLat').value = lat.toFixed(4);
                document.getElementById('emergencyLon').value = lon.toFixed(4);
                document.getElementById('emergencyAddress').value = `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                
                document.getElementById('emergencyLoading').style.display = 'none';
                alert('Location detected! Click "FIND NEAREST HOSPITALS" to proceed.');
            },
            function(error) {
                document.getElementById('emergencyLoading').style.display = 'none';
                alert('Unable to get location. Please enter address manually or use emergency at exit.');
                console.log('Geolocation error:', error);
            }
        );
    } else {
        alert('GPS not available on your device. Please enter address manually.');
    }
}

// Pre-select a quick location
function selectLocation(placeName, lat, lon) {
    document.getElementById('emergencyAddress').value = placeName;
    document.getElementById('emergencyLat').value = lat.toFixed(4);
    document.getElementById('emergencyLon').value = lon.toFixed(4);
    
    // Highlight the button
    event.target.style.background = '#27ae60';
    event.target.style.color = 'white';
    setTimeout(() => {
        event.target.style.background = '';
        event.target.style.color = '';
    }, 500);
}

// Toggle advanced options
function toggleAdvanced() {
    const panel = document.getElementById('advancedPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

function findEmergencyRoute() {
    // Get location from either address input or manual coordinates
    let latitude = null;
    let longitude = null;
    let location_name = document.getElementById('emergencyAddress').value;
    
    // Try to use manual coordinates if filled
    const manualLat = parseFloat(document.getElementById('emergencyLat').value);
    const manualLon = parseFloat(document.getElementById('emergencyLon').value);
    
    if (!isNaN(manualLat) && !isNaN(manualLon)) {
        latitude = manualLat;
        longitude = manualLon;
    } else if (location_name.trim() !== '') {
        // If only address is entered, try to parse coordinates from it
        const coordMatch = location_name.match(/\(([\d.]+)\s*,\s*([\d.]+)\)/);
        if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
        } else {
            alert('Please enter coordinates or use GPS/Quick Places');
            return;
        }
    } else {
        alert('Please enter location, use GPS, or select a quick place');
        return;
    }
    
    // Get route type from radio buttons
    const routeType = document.querySelector('input[name="routeType"]:checked').value;
    
    // Show loading
    document.getElementById('emergencyLoading').style.display = 'block';
    document.getElementById('emergencyLoading').textContent = 'Finding nearest hospitals...';
    document.getElementById('emergencyResults').style.display = 'none';

    // Call backend API
    fetch('/api/emergency-route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude: latitude,
            longitude: longitude,
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
                <div class="rank">🏥 #${index + 1}</div>
                <div class="hospital-name">${hospital.name}</div>
                <div class="distance-badge">${hospital.distance_km} km away</div>
            </div>
            <div class="route-card-content">
                <div class="card-row">
                    <span class="label">📍 Location:</span>
                    <span class="value">${hospital.area}</span>
                </div>
                <div class="card-row">
                    <span class="label">⏱️ ETA:</span>
                    <span class="value">${hospital.eta_minutes} minutes</span>
                </div>
                <div class="card-row">
                    <span class="label">🛏️ Available Beds:</span>
                    <span class="value">${hospital.beds}</span>
                </div>
                <div class="card-row">
                    <span class="label">👨‍⚕️ Doctors:</span>
                    <span class="value">${hospital.doctors}</span>
                </div>
                <div class="card-row">
                    <span class="label">👥 Daily Patients:</span>
                    <span class="value">${hospital.patients_per_day}</span>
                </div>
                <div class="card-row">
                    <span class="label">🛡️ Safety Score:</span>
                    <div class="safety-score-bar">
                        <div class="safety-score-fill" style="width: ${hospital.safety_score}%; background-color: ${getSafetyColor(hospital.safety_score)};"></div>
                        <span class="safety-score-text">${hospital.safety_score}%</span>
                    </div>
                </div>
                <div class="card-actions">
                    <a href="${hospital.google_maps_url}" target="_blank" class="btn-google-maps">🗺️ Get Directions</a>
                    <button onclick="callHospital('${hospital.phone}')" class="btn-call">📞 Call Hospital</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getSafetyColor(score) {
    if (score >= 80) return '#27ae60'; // Green
    if (score >= 60) return '#f39c12'; // Orange
    return '#e74c3c'; // Red
}

function callHospital(phone) {
    // In real app, this would integrate with phone API
    alert(`📞 Calling hospital at ${phone}\n\nIn production, this would dial emergency services.`);
}
