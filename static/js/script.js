/* ================================================================
   CAREGRID AI — Premium Healthcare Dashboard
   Interactive Engine v3.0
   ================================================================ */

let allHospitals = [];
let charts = {};
let autoRefreshInterval = null;
let predictionLibrary = [];

function getThemePalette() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
        text: isLight ? '#526574' : '#b5c2ca',
        muted: isLight ? '#70818e' : '#91a1ac',
        heading: isLight ? '#1c2b36' : '#e8eef2',
        primary: isLight ? '#087e8b' : '#55b9c4',
        critical: isLight ? '#b83b4b' : '#e1848e',
        high: isLight ? '#a96b12' : '#e0b66e',
        medium: isLight ? '#4f61a8' : '#98a7df',
        low: isLight ? '#18845b' : '#61c49a',
        borderStrong: isLight ? 'rgba(82,101,116,.18)' : 'rgba(181,194,202,.16)',
        surfaceStrong: isLight ? '#ffffff' : '#24343f'
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const darkMode = localStorage.getItem('darkMode');
    document.documentElement.setAttribute('data-theme', darkMode === 'true' ? 'dark' : 'light');
    updateModeButton();

    initParticleCanvas();
    initCursorGlow();
    initNavScroll();
    initSplashAnimation();
    initGlassReveal();

    // 3D & Audio Engines
    initSoundEngine();
    init3DTiltEngine();
    initThreeHeroGlobe();
    initThreeCapacityVisualizer();
    initThreeAiOrb();

    loadData();
    loadComparisonData();
    loadAlerts();
    loadPredictions();
    initRouteTypeSelector();

    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendChatMessage(); });

    const predInput = document.getElementById('predictionHospitalInput');
    if (predInput) predInput.addEventListener('keypress', e => { if (e.key === 'Enter') predictSelectedHospital(); });

    initFeedbackInteractions();
    startRealTimeUpdates();
});

// ============ PARTICLE CANVAS ============
function initParticleCanvas() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.5 + 0.1
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.speedX; p.y += p.speedY;
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
            ctx.fill();
        });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - dist / 120) * 0.12})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// ============ CURSOR GLOW ============
function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow) return;
    let mx = -500, my = -500, cx = -500, cy = -500;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function animate() {
        cx += (mx - cx) * 0.08; cy += (my - cy) * 0.08;
        glow.style.transform = `translate(${cx - 250}px, ${cy - 250}px)`;
        requestAnimationFrame(animate);
    }
    animate();
}

// ============ NAV SCROLL ============
function initNavScroll() {
    const nav = document.getElementById('topNav');
    if (!nav) return;
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50), { passive: true });
}

// ============ SPLASH ============
function initSplashAnimation() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;
    setTimeout(() => { const s = document.getElementById('step2'); if (s) s.classList.add('active'); }, 1800);
    setTimeout(() => { const s = document.getElementById('step3'); if (s) s.classList.add('active'); }, 3200);
    setTimeout(() => {
        splash.classList.add('hidden');
        document.body.style.overflow = '';
        revealGlassCards();
    }, 4200);
    splash.addEventListener('click', () => {
        splash.classList.add('hidden');
        document.body.style.overflow = '';
        revealGlassCards();
    });
}

// ============ GLASS CARD REVEAL ============
function initGlassReveal() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.glass-card').forEach(c => observer.observe(c));
}

function revealGlassCards() {
    document.querySelectorAll('.glass-card').forEach((c, i) => setTimeout(() => c.classList.add('revealed'), i * 70));
}

// ============ ROUTE TYPE SELECTOR (FIX) ============
function initRouteTypeSelector() {
    document.querySelectorAll('.route-opt').forEach(label => {
        label.addEventListener('click', function() {
            // Remove selected class from all
            document.querySelectorAll('.route-opt').forEach(l => l.classList.remove('selected'));
            // Add selected class to this
            this.classList.add('selected');
            // Check the radio inside
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            // Auto-search when route type is selected
            setTimeout(() => findEmergencyRoute(), 200);
        });
    });
}

// ============ REAL-TIME ============
function startRealTimeUpdates() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => loadData(), 12000);
}

// ============ LOAD DATA ============
function loadData() {
    fetch('/api/summary')
        .then(r => r.json())
        .then(data => {
            animateNumber('critical-count', data.critical_risk || 0);
            animateNumber('high-count', data.high_risk || 0);
            animateNumber('medium-count', data.medium_risk || 0);
            animateNumber('low-count', data.low_risk || 0);
            animateNumber('total-hospitals', data.total_hospitals || 0);

            const pdr = data.avg_patient_doctor_ratio || 0;
            const occ = data.avg_bed_occupancy || 0;

            const pdrEl = document.getElementById('avg-pdr');
            if (pdrEl) {
                pdrEl.textContent = pdr.toFixed(2);
                const bar = document.getElementById('pdr-bar');
                if (bar) bar.style.width = Math.min((pdr / 15) * 100, 100) + '%';
            }

            const occEl = document.getElementById('avg-occupancy');
            if (occEl) {
                occEl.textContent = occ.toFixed(2);
                const bar = document.getElementById('occ-bar');
                if (bar) bar.style.width = Math.min((occ / 3) * 100, 100) + '%';
            }

            // UPDATE 3D NEON SVG GAUGES
            update3DGauges(data);

            const heroTotal = document.getElementById('total-hospitals-hero');
            if (heroTotal) heroTotal.textContent = String(data.total_hospitals || 0);
        })
        .catch(err => console.error('Summary error:', err));

    fetch('/api/hospitals')
        .then(r => r.json())
        .then(data => {
            allHospitals = Array.isArray(data) ? data : [];
            if (typeof updateThreeCapacityBars === 'function') updateThreeCapacityBars(allHospitals);
        })
        .catch(err => console.error('Hospitals error:', err));

    fetch('/api/risk-data')
        .then(r => r.json())
        .then(data => displayRiskChart(data))
        .catch(err => console.error('Risk data error:', err));
}

function update3DGauges(data) {
    const total = data.total_hospitals || 1;
    const occPct = Math.min(100, Math.round((data.avg_bed_occupancy || 1.8) * 40));
    const healthIndex = Math.max(10, Math.min(99, Math.round(100 - ((data.critical_risk * 3 + data.high_risk * 1.5) / total) * 20)));
    const erReadiness = Math.min(98, Math.max(50, Math.round(85 + (data.low_risk / total) * 15)));
    const riskScore = Math.round(((data.critical_risk * 95 + data.high_risk * 70 + data.medium_risk * 40 + data.low_risk * 15) / total));

    setGaugeValue('gaugeBedOcc', 'gaugeBedOccVal', occPct, '%', 'Occupancy');
    setGaugeValue('gaugeHealth', 'gaugeHealthVal', healthIndex, '%', 'Health Index');
    setGaugeValue('gaugeReadiness', 'gaugeReadinessVal', erReadiness, '%', 'Readiness');
    setGaugeValue('gaugeRiskIndex', 'gaugeRiskVal', riskScore, '', 'Risk Score');
}

function setGaugeValue(circleId, textId, pct, unit, label) {
    const circle = document.getElementById(circleId);
    const textEl = document.getElementById(textId);
    const totalLength = 251.2;
    const offset = totalLength - (totalLength * (pct / 100));
    if (circle) circle.style.strokeDashoffset = offset;
    if (textEl) textEl.innerHTML = `${pct}${unit}<small>${label}</small>`;
}

// ============ ANIMATE NUMBER ============
function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = parseInt(el.textContent) || 0;
    if (cur === target) return;
    const dur = 500, start = performance.now();
    function upd(now) {
        const p = Math.min((now - start) / dur, 1);
        el.textContent = Math.round(cur + (target - cur) * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(upd);
        else {
            el.textContent = target;
            el.classList.remove('updated');
            void el.offsetWidth;
            el.classList.add('updated');
        }
    }
    requestAnimationFrame(upd);
}

// ============ RISK CHART ============
function displayRiskChart(data) {
    if (!data || !data.risk_levels) return;
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    data.risk_levels.forEach(l => { if (counts.hasOwnProperty(l)) counts[l] += 1; });
    if (charts.risk) charts.risk.destroy();
    const canvas = document.getElementById('riskChart');
    if (!canvas) return;

    const palette = getThemePalette();
    const labels = Object.keys(counts);
    const values = Object.values(counts);
    const riskColors = [palette.critical, palette.high, palette.medium, palette.low];

    charts.risk = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: riskColors,
                borderRadius: 5,
                maxBarThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: palette.muted },
                    grid: { color: palette.borderStrong }
                },
                y: {
                    ticks: { color: palette.text, font: { weight: '600' } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: palette.surfaceStrong,
                    titleColor: palette.heading,
                    bodyColor: palette.text,
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(ctx) {
                            const total = ctx.dataset.data.reduce((sum, value) => sum + value, 0);
                            const count = ctx.parsed.x;
                            const share = total ? ((count / total) * 100).toFixed(1) : '0.0';
                            return ` ${count} hospitals (${share}%)`;
                        }
                    }
                }
            },
            animation: { duration: 350 }
        }
    });
}

// ============ FEEDBACK INTERACTIONS ============
function initFeedbackInteractions() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    const buttons = form.querySelectorAll('.rating-pill');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => playSound('hover'));
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.toggle('active', b === btn));
            form.dataset.rating = btn.dataset.rating || '5';
            playSound('click');
        });
    });

    const subjectInput = document.getElementById('feedbackSubject');
    const messageInput = document.getElementById('feedbackMessage');
    [subjectInput, messageInput].forEach(input => {
        if (!input) return;
        input.addEventListener('focus', () => playSound('hover'));
    });

    form.addEventListener('submit', e => {
        e.preventDefault();
        submitFeedback();
    });
}

function submitFeedback() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;
    const rating = form.dataset.rating || '5';
    const subject = document.getElementById('feedbackSubject')?.value.trim() || 'General feedback';
    const message = document.getElementById('feedbackMessage')?.value.trim() || 'No additional comments provided.';

    if (typeof playSound === 'function') playSound('alert');
    showToast('Feedback submitted successfully. Thank you!');
    form.reset();
    form.dataset.rating = '5';
    form.querySelectorAll('.rating-pill').forEach((btn, idx) => btn.classList.toggle('active', idx === 0));
    console.log(`Feedback captured: rating ${rating}, subject: ${subject}, message: ${message}`);
}

// ============ NAVIGATION ============
function switchTab(tabName) { window.location.href = tabName === 'dashboard' ? '/' : `/page/${tabName}`; }

// ============ DARK MODE ============
function toggleDarkMode() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('darkMode', next === 'dark');
    updateModeButton();
    refreshThemeUI();
}

function updateModeButton() {
    const btn = document.getElementById('modeToggle');
    if (!btn) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = dark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    btn.title = dark ? 'Light mode' : 'Dark mode';
}

function refreshThemeUI() { loadData(); loadAlerts(); loadPredictions(); }

// ============ COMPARISON ============
function loadComparisonData() {
    fetch('/api/compare-hospitals').then(r => r.json()).then(populateComparisonSelects).catch(err => console.error(err));
}

function populateComparisonSelects(hospitals) {
    ['hospital1', 'hospital2', 'hospital3'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">Select Hospital</option>';
        hospitals.forEach(h => { const o = document.createElement('option'); o.value = h.name; o.textContent = h.name; sel.appendChild(o); });
    });
}

function updateComparison() {
    const h1 = document.getElementById('hospital1').value;
    const h2 = document.getElementById('hospital2').value;
    const h3 = document.getElementById('hospital3').value;
    fetch('/api/compare-hospitals').then(r => r.json()).then(data => {
        const selected = [h1, h2, h3].filter(Boolean);
        const tbody = document.getElementById('comparisonBody');
        if (!tbody) return;
        if (selected.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Select hospitals above to compare data.</td></tr>'; return; }
        document.getElementById('h1-name').textContent = h1 || 'Hospital 1';
        document.getElementById('h2-name').textContent = h2 || 'Hospital 2';
        document.getElementById('h3-name').textContent = h3 || 'Hospital 3';
        tbody.innerHTML = '';
        const hospitals = selected.map(n => data.find(h => h.name === n)).filter(Boolean);
        ['beds','doctors','patients','pdr','efficiency','risk_score','risk_level'].forEach(m => {
            const row = document.createElement('tr');
            row.innerHTML = `<td><strong>${m.toUpperCase().replace('_', ' - ')}</strong></td>`;
            [0,1,2].forEach(i => { const c = document.createElement('td'); c.textContent = hospitals[i] ? (typeof hospitals[i][m] === 'number' ? hospitals[i][m].toFixed(2) : hospitals[i][m]) : '-'; row.appendChild(c); });
            tbody.appendChild(row);
        });
    }).catch(err => console.error(err));
}

// ============ ALERTS ============
function loadAlerts() {
    fetch('/api/alerts').then(r => r.json()).then(displayAlerts).catch(err => console.error(err));
}

function displayAlerts(alerts) {
    const container = document.getElementById('alertsList');
    if (!container) return;
    const badge = document.getElementById('alertBadge');
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<div class="empty-alerts">No critical alerts. Hospitals are operating within safer limits.</div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    if (badge) { badge.style.display = 'flex'; badge.textContent = alerts.length; }
    container.innerHTML = '';
    alerts.forEach((a, i) => {
        const div = document.createElement('div');
        div.className = a.risk_score >= 75 ? 'alert-card' : 'alert-card high';
        div.style.animationDelay = `${i * 0.08}s`;
        div.innerHTML = `<div class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="alert-body"><div class="alert-hospital">${a.hospital||''}</div>
            <div class="alert-area">${a.area||''}</div>
            <div class="alert-issue">${a.issue||'Critical stress'}</div></div>
            <div class="alert-meta"><div class="alert-score-badge"><strong>${a.risk_score||0}</strong><span>Risk Score</span></div></div>`;
        container.appendChild(div);
    });
}

// ============ PREDICTIONS ============
function loadPredictions() {
    fetch('/api/predictions').then(r => r.json()).then(data => {
        predictionLibrary = Array.isArray(data) ? data : [];
        const list = document.getElementById('predictionHospitalList');
        if (list) {
            list.innerHTML = '';
            predictionLibrary.slice().sort((a,b) => a.hospital.localeCompare(b.hospital)).forEach(p => { const o = document.createElement('option'); o.value = p.hospital; list.appendChild(o); });
        }
        const input = document.getElementById('predictionHospitalInput');
        if (input && predictionLibrary.length > 0) {
            const def = predictionLibrary.slice().sort((a,b) => b.current - a.current)[0];
            input.value = def.hospital;
            renderPredictionFocus(def);
        } else renderPredictionFocus(null);
    }).catch(err => console.error(err));
}

function predictSelectedHospital() {
    const input = document.getElementById('predictionHospitalInput');
    if (!input) return;
    const v = input.value.trim().toLowerCase();
    if (!v) { showToast('Enter a hospital name.'); return; }
    const match = predictionLibrary.find(p => p.hospital.toLowerCase() === v) || predictionLibrary.find(p => p.hospital.toLowerCase().includes(v));
    if (!match) { showToast('Hospital not found.'); return; }
    input.value = match.hospital;
    renderPredictionFocus(match);
}

function renderPredictionFocus(p) {
    const container = document.getElementById('predictionsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!p) { container.innerHTML = '<div class="empty-alerts">No prediction data available.</div>'; displayPredictionsChart(null); return; }

    const cur = Math.round(p.current), opt = Math.round(p.optimistic), real = Math.round(p.realistic), pes = Math.round(p.pessimistic);
    const inc = Math.round(((p.realistic-p.current)/p.current)*100), peak = Math.round(((p.pessimistic-p.current)/p.current)*100);
    const trend = peak >= 15 ? 'Urgent planning' : peak >= 8 ? 'Watch closely' : 'Stable load';

    const c1 = document.createElement('div');
    c1.className = 'prediction-card prediction-card-hero';
    c1.innerHTML = `<div class="prediction-hero-header"><div><div class="pred-label"><i class="fa-solid fa-hospital"></i> Hospital</div>
        <div style="font-size:1.15rem;font-weight:800;">${p.hospital}</div>
        <div class="prediction-hospital-meta">${p.area||''} · Risk ${p.risk_level} · Efficiency ${(p.efficiency||0).toFixed(2)}</div></div>
        <div class="prediction-status-badge">${trend}</div></div>
        <div class="prediction-highlight-grid"><div class="prediction-highlight"><span>Current</span><strong>${cur}</strong></div>
        <div class="prediction-highlight"><span>Expected</span><strong>${real}</strong></div>
        <div class="prediction-highlight"><span>Peak</span><strong>${pes}</strong></div>
        <div class="prediction-highlight"><span>Increase</span><strong>+${inc}%</strong></div></div>
        <div class="hospital-recommendation prediction-recommendation">Beds: ${p.beds} · Doctors: ${p.doctors} · Risk: ${Math.round(p.risk_score)}/100. ${peak >= 15 ? 'Prepare overflow staffing.' : 'Monitor schedules.'}</div>`;
    container.appendChild(c1);

    const c2 = document.createElement('div');
    c2.className = 'prediction-card prediction-card-metrics';
    c2.innerHTML = `<div class="prediction-mini-grid"><div class="prediction-mini-item"><span>Best</span><strong>${opt}</strong><small>-5%</small></div>
        <div class="prediction-mini-item"><span>Expected</span><strong>${real}</strong><small>+5%</small></div>
        <div class="prediction-mini-item"><span>Worst</span><strong>${pes}</strong><small>+${peak}%</small></div></div>`;
    container.appendChild(c2);

    displayPredictionsChart(p);

    container.querySelectorAll('.prediction-card').forEach(c => {
        c.style.opacity = '0'; c.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => { c.style.transition = 'all 0.5s ease'; c.style.opacity = '1'; c.style.transform = 'translateY(0)'; });
    });
}

function displayPredictionsChart(p) {
    const canvas = document.getElementById('predictionsChart');
    if (!canvas) return;
    if (charts.predictions) charts.predictions.destroy();
    if (!p) return;

    charts.predictions = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: ['Current','Best','Expected','Worst'], datasets: [{ label: p.hospital, data: [Math.round(p.current), Math.round(p.optimistic), Math.round(p.realistic), Math.round(p.pessimistic)], backgroundColor: ['#00d4ff','#10b981','#6366f1','#f43f5e'], borderRadius: 6, barPercentage: 0.6 }] },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,23,42,.9)', padding: 12, cornerRadius: 8 } },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' } }
            },
            animation: { duration: 800 }
        }
    });
}

// ============ CHATBOT ============
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    addChatMessage(msg, 'user');
    input.value = '';
    showTypingIndicator();

    const ctx = { address: '', latitude: null, longitude: null };
    const addr = document.getElementById('emergencyAddress');
    const lat = document.getElementById('emergencyLat');
    const lon = document.getElementById('emergencyLon');
    if (addr) ctx.address = addr.value.trim();
    if (lat) ctx.latitude = parseFloat(lat.value) || null;
    if (lon) ctx.longitude = parseFloat(lon.value) || null;

    fetch('/api/chatbot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, address: ctx.address, latitude: ctx.latitude, longitude: ctx.longitude })
    }).then(r => r.json()).then(data => {
        removeTypingIndicator();
        addChatMessage(data.bot || 'No response.', 'bot');
        scrollChatToBottom();
    }).catch(() => { removeTypingIndicator(); addChatMessage('Error.', 'bot'); });
}

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function formatInlineText(t) { return escapeHtml(t).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>'); }

function formatBotResponse(text) {
    const norm = (text || '').replace(/\r\n/g, '\n').trim();
    if (!norm) return '<p class="bot-paragraph">No response.</p>';
    return norm.split(/\n\s*\n/).map(sec => {
        const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return '';
        const bullets = lines.filter(l => /^[-*•]\s+/.test(l));
        if (bullets.length === lines.length) return `<ul class="bot-list">${bullets.map(l => `<li>${formatInlineText(l.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
        return `<div class="bot-section">${lines.map((l, i) => {
            const m = l.match(/^([A-Za-z][A-Za-z\s/&()-]{2,40}):\s*(.*)/);
            if (m) { const c = m[2].trim(); return c ? `<div class="bot-section-row"><div class="bot-section-label">${formatInlineText(m[1].trim())}</div><div class="bot-section-body">${formatInlineText(c)}</div></div>` : `<div class="bot-subheading">${formatInlineText(m[1].trim())}</div>`; }
            if (i === 0 && lines.length > 1 && l.length <= 70) return `<div class="bot-subheading">${formatInlineText(l)}</div>`;
            return `<p class="bot-paragraph">${formatInlineText(l)}</p>`;
        }).join('')}</div>`;
    }).join('');
}

function speakBotMessage(text, btn) {
    if (!('speechSynthesis' in window)) { showToast('Speech synthesis not supported on this browser.'); return; }
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (btn) btn.classList.remove('speaking');
        return;
    }
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[\*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (btn) btn.classList.add('speaking');
    utterance.onend = () => { if (btn) btn.classList.remove('speaking'); };
    utterance.onerror = () => { if (btn) btn.classList.remove('speaking'); };
    window.speechSynthesis.speak(utterance);
}

function addChatMessage(text, sender, meta = {}) {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const row = document.createElement('div');
    row.className = `msg-row ${sender}`;
    const av = document.createElement('div');
    av.className = 'msg-avatar';
    av.innerHTML = sender === 'bot' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user"></i>';
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${sender === 'bot' ? 'bot-bubble' : 'user-bubble'}`;
    if (sender === 'bot') {
        bubble.innerHTML = formatBotResponse(text);
        const t = document.createElement('div');
        t.className = 'msg-time';
        t.innerHTML = 'Just now · Smart Medical Assistant <button class="voice-speak-btn" title="Listen Audio" onclick="speakBotMessage(this.parentElement.parentElement.innerText, this)"><i class="fa-solid fa-volume-high"></i></button>';
        bubble.appendChild(t);
    } else bubble.textContent = text;
    row.appendChild(av); row.appendChild(bubble);
    msgs.appendChild(row);
    scrollChatToBottom();
}

function showTypingIndicator() {
    const msgs = document.getElementById('chatMessages');
    if (!msgs) return;
    const row = document.createElement('div'); row.className = 'msg-row bot'; row.id = 'typingIndicator';
    row.innerHTML = `<div class="msg-avatar"><i class="fa-solid fa-robot"></i></div><div class="msg-bubble bot-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
    msgs.appendChild(row);
    scrollChatToBottom();
}

function removeTypingIndicator() { const el = document.getElementById('typingIndicator'); if (el) el.remove(); }
function scrollChatToBottom() { const msgs = document.getElementById('chatMessages'); if (msgs) msgs.scrollTop = msgs.scrollHeight; }
function askQuestion(q) { const input = document.getElementById('chatInput'); if (input) { input.value = q; sendChatMessage(); } }

// ============ EXPORT ============
function showExportMenu() {
    const modal = document.getElementById('exportModal');
    if (!modal) return;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    const sel = document.getElementById('hospitalSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Hospital...</option>';
    allHospitals.forEach(h => { const o = document.createElement('option'); o.value = h.Hospital||''; o.textContent = h.Hospital||''; sel.appendChild(o); });
}

function closeExportMenu() { const modal = document.getElementById('exportModal'); if (modal) { modal.classList.remove('show'); document.body.style.overflow = ''; } }
function exportSingleHospital() { const sel = document.getElementById('hospitalSelect'); if (!sel || !sel.value) { showToast('Select a hospital.'); return; } window.open(`/api/export/hospital/${encodeURIComponent(sel.value)}`, '_blank'); closeExportMenu(); }
function exportAllHospitals() { window.open('/api/export/all-hospitals', '_blank'); closeExportMenu(); }

function exportDataCSV() {
    let csv = 'Hospital,Area,Beds,Doctors,Patients_Per_Day,Patient_Doctor_Ratio,Risk_Level,Risk_Score\n';
    allHospitals.forEach(h => { csv += `"${h.Hospital}","${h.Area}",${h.Beds},${h.Doctors},${h.Patients_Per_Day},${(h.patient_doctor_ratio||0).toFixed(2)},"${h.risk_level}",${h.risk_score}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'hospitals_data.csv'; a.click();
    URL.revokeObjectURL(url);
    closeExportMenu(); showToast('CSV downloaded!');
}

window.addEventListener('click', e => { const modal = document.getElementById('exportModal'); if (e.target === modal) closeExportMenu(); });

// ============ EMERGENCY ROUTING - FIXED ============
// GPS Location
function useMyLocation() {
    if (!('geolocation' in navigator)) { showToast('GPS not available.'); return; }
    const loading = document.getElementById('emergencyLoading');
    if (loading) { loading.style.display = 'block'; const p = loading.querySelector('.em-loader p'); if (p) p.textContent = 'Getting your location...'; }
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude.toFixed(4);
            const lon = pos.coords.longitude.toFixed(4);
            document.getElementById('emergencyLat') && (document.getElementById('emergencyLat').value = lat);
            document.getElementById('emergencyLon') && (document.getElementById('emergencyLon').value = lon);
            document.getElementById('emergencyAddress') && (document.getElementById('emergencyAddress').value = `My Location (${lat}, ${lon})`);
            if (loading) loading.style.display = 'none';
            showToast('✅ GPS location detected! Click "Find Nearest Hospitals Now".');
        },
        () => {
            if (loading) loading.style.display = 'none';
            showToast('❌ GPS failed. Enter a location manually or click a quick place.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Quick location select
function selectLocation(name, lat, lon) {
    const a = document.getElementById('emergencyAddress');
    const la = document.getElementById('emergencyLat');
    const lo = document.getElementById('emergencyLon');
    if (a) a.value = name;
    if (la) la.value = lat.toFixed(4);
    if (lo) lo.value = lon.toFixed(4);
    // Automatically find nearest hospitals
    setTimeout(() => findEmergencyRoute(), 300);
}

// Toggle advanced panel
function toggleAdvanced() {
    const p = document.getElementById('advancedPanel');
    if (!p) return;
    const h = p.style.display === 'none' || !p.style.display;
    p.style.display = h ? 'block' : 'none';
    const c = document.querySelector('.adv-chevron');
    if (c) c.style.transform = h ? 'rotate(180deg)' : '';
}

// ===== FIXED: findEmergencyRoute - uses CSV hospital data directly =====
function findEmergencyRoute() {
    const addr = document.getElementById('emergencyAddress');
    const latI = document.getElementById('emergencyLat');
    const lonI = document.getElementById('emergencyLon');

    const address = addr ? addr.value.trim() : '';
    const latVal = latI ? parseFloat(latI.value) : NaN;
    const lonVal = lonI ? parseFloat(lonI.value) : NaN;

    if (!address && !Number.isFinite(latVal)) {
        showToast('⚠️ Please enter a location or use GPS first.');
        return;
    }

    const loading = document.getElementById('emergencyLoading');
    const results = document.getElementById('emergencyResults');
    const cards = document.getElementById('routeCardsContainer');

    if (loading) loading.style.display = 'block';
    if (results) results.style.display = 'none';

    // Get selected route type
    const checkedRadio = document.querySelector('input[name="routeType"]:checked');
    const routeType = checkedRadio ? checkedRadio.value : 'nearest';

    const payload = {
        address: address,
        latitude: Number.isFinite(latVal) ? latVal : null,
        longitude: Number.isFinite(lonVal) ? lonVal : null,
        type: routeType
    };

    // Use POST /api/emergency-route (uses local CSV data as fallback)
    fetch('/api/emergency-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
        if (loading) loading.style.display = 'none';
        if (results) results.style.display = 'block';
        if (!cards) return;

        cards.innerHTML = '';

        // Backend returns: { nearest_hospitals: [...] } or { hospitals: [...] } or just [...]
        let hospitals = data.nearest_hospitals || data.hospitals || (Array.isArray(data) ? data : null);
        if (!hospitals || hospitals.length === 0) {
            cards.innerHTML = '<div class="empty-alerts">❌ No hospitals found nearby. Try a different location.</div>';
            return;
        }

        hospitals.forEach((h, i) => {
            if (i >= 6) return;
            const name = h.name || h.Hospital || 'Unknown Hospital';
            const area = h.area || h.Area || h.address || '';
            const distInfo = h.distance_km ? `📍 ${h.distance_km} km` : (h.distance || '📍 Nearby');
            const phone = h.phone || '+';
            const mapsUrl = h.google_maps_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}+${encodeURIComponent(area)}`;

            const card = document.createElement('div');
            card.className = 'route-card';
            card.style.animationDelay = `${i * 0.07}s`;
            card.innerHTML = `
                <div class="rc-rank">${i + 1}</div>
                <div class="rc-body">
                    <div class="rc-name">${name}</div>
                    <div class="rc-area">${area}</div>
                    <div class="rc-dist">${distInfo}</div>
                </div>
                <div class="rc-actions">
                    <a href="tel:${phone}" class="rc-btn" title="Call"><i class="fa-solid fa-phone"></i></a>
                    <a href="${mapsUrl}" target="_blank" class="rc-btn map" title="Navigate"><i class="fa-solid fa-location-arrow"></i></a>
                </div>`;
            cards.appendChild(card);
        });
    })
    .catch(err => {
        console.error('Emergency POST error:', err);
        // Fallback: use local /api/hospitals data to compute nearest
        if (allHospitals.length > 0 && Number.isFinite(latVal)) {
            if (loading) loading.style.display = 'none';
            if (results) results.style.display = 'block';
            if (!cards) return;

            // Compute distances locally
            const userLat = latVal, userLon = lonVal;
            const withDist = allHospitals.map(h => {
                const dLat = h.Latitude - userLat;
                const dLon = h.Longitude - userLon;
                const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111.32; // rough km
                return { ...h, dist_km: dist.toFixed(2) };
            });
            withDist.sort((a, b) => a.dist_km - b.dist_km);
            const top5 = withDist.slice(0, 6);

            cards.innerHTML = '';
            top5.forEach((h, i) => {
                const name = h.Hospital || 'Hospital';
                const area = h.Area || '';
                const dist = `📍 ${h.dist_km} km`;
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}+${encodeURIComponent(area)}`;
                const card = document.createElement('div');
                card.className = 'route-card';
                card.style.animationDelay = `${i * 0.07}s`;
                card.innerHTML = `
                    <div class="rc-rank">${i + 1}</div>
                    <div class="rc-body">
                        <div class="rc-name">${name}</div>
                        <div class="rc-area">${area}</div>
                        <div class="rc-dist">${dist}</div>
                    </div>
                    <div class="rc-actions">
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(name)}+${encodeURIComponent(area)}" target="_blank" class="rc-btn map" title="Navigate"><i class="fa-solid fa-location-arrow"></i></a>
                    </div>`;
                cards.appendChild(card);
            });
        } else {
            if (loading) loading.style.display = 'none';
            if (results) results.style.display = 'block';
            if (cards) cards.innerHTML = '<div class="empty-alerts">❌ Service unavailable. Try clicking a "Quick place" button above.</div>';
        }
    });
}

// ============ TOAST ============
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

/* ================================================================
   3D UI & WEBGL GRAPHICS ENGINES
   ================================================================ */

// ============ SOUND ENGINE ============
let audioCtx = null;
let uiSoundEnabled = localStorage.getItem('uiSoundEnabled') !== 'false';

function initSoundEngine() {
    const btn = document.getElementById('soundToggle');
    if (btn) {
        btn.classList.toggle('active', uiSoundEnabled);
        btn.classList.toggle('muted', !uiSoundEnabled);
        btn.innerHTML = uiSoundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    }

    document.querySelectorAll('.navlink, .cta-primary, .cta-secondary, .qa-btn, .topic-chip, .three-pill-btn, .action-icon-btn').forEach(el => {
        el.addEventListener('mouseenter', () => playSound('hover'));
        el.addEventListener('click', () => playSound('click'));
    });
}

function toggleSound() {
    uiSoundEnabled = !uiSoundEnabled;
    localStorage.setItem('uiSoundEnabled', uiSoundEnabled);
    initSoundEngine();
    if (uiSoundEnabled) playSound('click');
}

function playSound(type) {
    if (!uiSoundEnabled) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.04);
            osc.start(now); osc.stop(now + 0.04);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.08);
            osc.start(now); osc.stop(now + 0.08);
        } else if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.setValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now); osc.stop(now + 0.2);
        }
    } catch (e) { }
}

// ============ 3D CARD TILT & SPECULAR SHINE ENGINE ============
function init3DTiltEngine() {
    const cards = document.querySelectorAll('.stat-card, .glass-card, .hero-card-float, .qa-btn, .export-opt-card');
    cards.forEach(card => {
        card.classList.add('tilt-3d');
        if (!card.querySelector('.card-shine')) {
            const shine = document.createElement('div');
            shine.className = 'card-shine';
            card.appendChild(shine);
        }

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = -((y - centerY) / centerY) * 8;
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            card.style.setProperty('--shine-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--shine-y', `${(y / rect.height) * 100}%`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
}

// ============ THREE.JS HERO 3D GLOBE ============
let heroScene, heroCamera, heroRenderer, heroGlobe, heroParticles, heroPinsGroup;

function initThreeHeroGlobe() {
    const container = document.getElementById('hero3DViewport');
    const canvas = document.getElementById('threeHeroCanvas');
    if (!container || !canvas || typeof THREE === 'undefined') return;

    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    heroCamera.position.z = 7;

    heroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    heroRenderer.setSize(container.clientWidth, container.clientHeight);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Outer Wireframe Sphere (Earth Hologram)
    const sphereGeo = new THREE.SphereGeometry(2.4, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    heroGlobe = new THREE.Mesh(sphereGeo, sphereMat);
    heroScene.add(heroGlobe);

    // Inner Glowing Core Sphere
    const coreGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.15
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    heroGlobe.add(coreMesh);

    // Particles Orbit Ring
    const partCount = 400;
    const partGeo = new THREE.BufferGeometry();
    const partPos = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 2.6 + Math.random() * 0.8;
        partPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        partPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        partPos[i * 3 + 2] = r * Math.cos(phi);
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
        size: 0.035,
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.6
    });
    heroParticles = new THREE.Points(partGeo, partMat);
    heroScene.add(heroParticles);

    // Add Pins for Key Healthcare Hubs
    heroPinsGroup = new THREE.Group();
    const pins = [
        { lat: 28.6139, lon: 77.2090, label: 'Delhi Central AI Hub' },
        { lat: 19.0760, lon: 72.8777, label: 'Mumbai Emergency Grid' },
        { lat: 12.9716, lon: 77.5946, label: 'Bangalore Specialist Center' },
        { lat: 22.5726, lon: 88.3639, label: 'Kolkata Regional Desk' },
        { lat: 28.4089, lon: 77.3178, label: 'Faridabad Super Specialty' }
    ];

    pins.forEach(p => {
        const phi = (90 - p.lat) * (Math.PI / 180);
        const theta = (p.lon + 180) * (Math.PI / 180);
        const r = 2.42;

        const x = -(r * Math.sin(phi) * Math.cos(theta));
        const z = r * Math.sin(phi) * Math.sin(theta);
        const y = r * Math.cos(phi);

        const pinGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(x, y, z);
        heroPinsGroup.add(pinMesh);

        // Pulse Ring
        const ringGeo = new THREE.RingGeometry(0.09, 0.14, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.set(x * 1.02, y * 1.02, z * 1.02);
        ringMesh.lookAt(0, 0, 0);
        heroPinsGroup.add(ringMesh);
    });

    heroGlobe.add(heroPinsGroup);

    // Mouse Interaction
    let mouseX = 0, mouseY = 0, targetRotationX = 0, targetRotationY = 0;
    let isDragging = false, previousMousePosition = { x: 0, y: 0 };

    container.addEventListener('mousedown', e => { isDragging = true; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    container.addEventListener('mousemove', e => {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        if (isDragging) {
            targetRotationY += deltaX * 0.005;
            targetRotationX += deltaY * 0.005;
        } else {
            mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        }
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    function animate() {
        requestAnimationFrame(animate);
        heroGlobe.rotation.y += 0.003;
        heroParticles.rotation.y -= 0.001;

        if (!isDragging) {
            heroGlobe.rotation.x += (mouseY * 0.2 - heroGlobe.rotation.x) * 0.05;
            heroGlobe.rotation.y += (mouseX * 0.2 - heroGlobe.rotation.y) * 0.05;
        } else {
            heroGlobe.rotation.y += (targetRotationY - heroGlobe.rotation.y) * 0.1;
            heroGlobe.rotation.x += (targetRotationX - heroGlobe.rotation.x) * 0.1;
        }

        heroRenderer.render(heroScene, heroCamera);
    }
    animate();

    window.addEventListener('resize', () => {
        if (!container || !heroRenderer || !heroCamera) return;
        heroCamera.aspect = container.clientWidth / container.clientHeight;
        heroCamera.updateProjectionMatrix();
        heroRenderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// ============ THREE.JS 3D HOSPITAL CAPACITY SPATIAL VISUALIZER ============
let capScene, capCamera, capRenderer, capControls, capPillarsGroup = [];
let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();

function initThreeCapacityVisualizer() {
    const container = document.getElementById('threeCapacityWrap');
    const canvas = document.getElementById('threeCapacityCanvas');
    if (!container || !canvas || typeof THREE === 'undefined') return;

    capScene = new THREE.Scene();
    capScene.fog = new THREE.FogExp2(0x030712, 0.025);

    capCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    capCamera.position.set(0, 18, 22);

    capRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    capRenderer.setSize(container.clientWidth, container.clientHeight);
    capRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (typeof THREE.OrbitControls !== 'undefined') {
        capControls = new THREE.OrbitControls(capCamera, capRenderer.domElement);
        capControls.enableDamping = true;
        capControls.dampingFactor = 0.05;
        capControls.maxPolarAngle = Math.PI / 2.1;
        capControls.minDistance = 8;
        capControls.maxDistance = 40;
    }

    // Grid Floor
    const gridHelper = new THREE.GridHelper(30, 20, 0x00d4ff, 0x162440);
    gridHelper.position.y = 0;
    capScene.add(gridHelper);

    // Ambient & Point Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    capScene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0x00d4ff, 1.2);
    dirLight.position.set(10, 20, 15);
    capScene.add(dirLight);

    const pointLight = new THREE.PointLight(0x7c3aed, 1.5, 30);
    pointLight.position.set(0, 8, 0);
    capScene.add(pointLight);

    // Interactivity Raycaster
    const tooltip = document.getElementById('threeTooltip');
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, capCamera);
        const intersects = raycaster.intersectObjects(capPillarsGroup);

        if (intersects.length > 0) {
            const pillar = intersects[0].object;
            const data = pillar.userData;

            if (data && tooltip) {
                tooltip.innerHTML = `
                    <h4>${data.Hospital || 'Hospital'}</h4>
                    <div class="three-tooltip-row"><span>Area:</span><strong>${data.Area || 'Central'}</strong></div>
                    <div class="three-tooltip-row"><span>Risk Status:</span><strong style="color:${getPillarHexColor(data.Risk_Level)}">${data.Risk_Level}</strong></div>
                    <div class="three-tooltip-row"><span>Bed Occupancy:</span><strong>${data.Bed_Occupancy || 'N/A'}%</strong></div>
                    <div class="three-tooltip-row"><span>Patient-Doctor Ratio:</span><strong>${data.Patient_Doctor_Ratio || 'N/A'}</strong></div>
                `;
                tooltip.style.left = `${e.clientX - rect.left}px`;
                tooltip.style.top = `${e.clientY - rect.top}px`;
                tooltip.classList.add('visible');
                playSound('hover');
            }
        } else if (tooltip) {
            tooltip.classList.remove('visible');
        }
    });

    function animate() {
        requestAnimationFrame(animate);
        if (capControls) capControls.update();

        capPillarsGroup.forEach(p => {
            if (p.children && p.children[0]) {
                p.children[0].rotation.y += 0.02;
            }
        });

        capRenderer.render(capScene, capCamera);
    }
    animate();

    window.addEventListener('resize', () => {
        if (!container || !capRenderer || !capCamera) return;
        capCamera.aspect = container.clientWidth / container.clientHeight;
        capCamera.updateProjectionMatrix();
        capRenderer.setSize(container.clientWidth, container.clientHeight);
    });
}

function getPillarHexColor(risk) {
    if (risk === 'Critical') return '#f43f5e';
    if (risk === 'High') return '#f59e0b';
    if (risk === 'Medium') return '#6366f1';
    return '#10b981';
}

function updateThreeCapacityBars(hospitals) {
    if (!capScene || typeof THREE === 'undefined') return;

    capPillarsGroup.forEach(p => capScene.remove(p));
    capPillarsGroup = [];

    const displayList = hospitals.slice(0, 16);
    const cols = 4;
    const spacing = 4.5;
    const startX = -((cols - 1) * spacing) / 2;
    const startZ = -((Math.ceil(displayList.length / cols) - 1) * spacing) / 2;

    displayList.forEach((h, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const x = startX + col * spacing;
        const z = startZ + row * spacing;

        const occ = parseFloat(h.Bed_Occupancy) || 50;
        const height = Math.max(1, (occ / 100) * 8);

        const colorHex = getPillarHexColor(h.Risk_Level);
        const geom = new THREE.CylinderGeometry(1.1, 1.1, height, 16);
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            roughness: 0.2,
            metalness: 0.7,
            transparent: true,
            opacity: 0.85
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, height / 2, z);
        mesh.userData = h;

        const capGeo = new THREE.TorusGeometry(1.15, 0.08, 12, 24);
        const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
        const capRing = new THREE.Mesh(capGeo, capMat);
        capRing.rotation.x = Math.PI / 2;
        capRing.position.y = height / 2;
        mesh.add(capRing);

        capScene.add(mesh);
        capPillarsGroup.push(mesh);
    });
}

function setThreeView(filter) {
    document.querySelectorAll('.three-pill-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(filter === 'critical' ? 'tv-critical' : 'tv-all');
    if (btn) btn.classList.add('active');

    capPillarsGroup.forEach(p => {
        const risk = p.userData.Risk_Level;
        if (filter === 'critical') {
            p.visible = (risk === 'Critical' || risk === 'High');
        } else {
            p.visible = true;
        }
    });
}

function resetThreeCamera() {
    if (capCamera && capControls) {
        if (typeof gsap !== 'undefined') {
            gsap.to(capCamera.position, { x: 0, y: 18, z: 22, duration: 1 });
        } else {
            capCamera.position.set(0, 18, 22);
        }
        capControls.reset();
    }
}

// ============ THREE.JS 3D AI ASSISTANT ORB ============
let orbScene, orbCamera, orbRenderer, orbMesh;

function initThreeAiOrb() {
    const container = document.getElementById('threeOrbAvatar');
    const canvas = document.getElementById('threeAiOrbCanvas');
    if (!container || !canvas || typeof THREE === 'undefined') return;

    orbScene = new THREE.Scene();
    orbCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    orbCamera.position.z = 3.2;

    orbRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    orbRenderer.setSize(48, 48);

    const geom = new THREE.IcosahedronGeometry(1.2, 1);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        wireframe: true
    });
    orbMesh = new THREE.Mesh(geom, mat);
    orbScene.add(orbMesh);

    function animate() {
        requestAnimationFrame(animate);
        orbMesh.rotation.x += 0.01;
        orbMesh.rotation.y += 0.015;
        orbRenderer.render(orbScene, orbCamera);
    }
    animate();
}

function pulseAiOrb() {
    if (orbMesh) {
        if (typeof gsap !== 'undefined') {
            gsap.to(orbMesh.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.2, yoyo: true, repeat: 1 });
        }
    }
}